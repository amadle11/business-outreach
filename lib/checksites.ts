import { all, logEvent, one, run } from "./db";
import { auditSite } from "./audit";
import { getSettings } from "./settings";
import type { Business } from "./types";

/**
 * Checks a few businesses' websites (status "checking"). Outdated ones move to the review screen;
 * ones that look fine are set aside as "modern_site". Call repeatedly while it returns more: true.
 */
export async function checkPendingSites(limit = 4): Promise<{ checked: number; outdated: number; more: boolean }> {
  const s = await getSettings();
  const min = Number(s.min_outdated_score) || 35;
  const rows = await all<Business>("SELECT * FROM businesses WHERE status='checking' ORDER BY id LIMIT ?", [limit]);
  const audits = await Promise.all(
    rows.map((b) => auditSite(b.listed_website!).catch(() => null)),
  );
  let outdated = 0;
  for (const [i, b] of rows.entries()) {
    const a = audits[i];
    const score = a ? a.score : 0;
    const keep = !!a && score >= min;
    await run(
      `UPDATE businesses SET status=?, site_score=?, site_issues=?, site_checked_at=datetime('now'),
         email=coalesce(email, ?), updated_at=datetime('now') WHERE id=?`,
      [keep ? "new" : "modern_site", score, JSON.stringify(a?.issues ?? []), a?.emails[0] ?? null, b.id],
    );
    if (keep) {
      outdated++;
      await logEvent(
        b.id,
        "found",
        `Outdated website (score ${score}/100) found via "${b.search_query}"${a!.emails.length ? `. Email found: ${a!.emails[0]}` : ""}`,
        a,
      );
    }
  }
  const left = await one<{ n: number }>("SELECT count(*) AS n FROM businesses WHERE status='checking'");
  return { checked: rows.length, outdated, more: (left?.n ?? 0) > 0 };
}
