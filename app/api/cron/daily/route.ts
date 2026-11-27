import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { checkInbox } from "@/lib/inbox";
import { notifySelf, sendDueFollowups } from "@/lib/send";
import { one } from "@/lib/db";
import { appUrl } from "@/lib/settings";
import { gmailConfigured } from "@/lib/mail";

export const maxDuration = 26;

/**
 * Daily jobs, split so each request stays short:
 *   ?part=inbox      check Gmail for replies, answers and bounces
 *   ?part=followups  send up to 5 due follow-ups; call again while { more: true }
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const part = new URL(req.url).searchParams.get("part") || "inbox";
  try {
    if (part === "inbox") {
      if (!gmailConfigured()) return NextResponse.json({ skipped: "Gmail not configured" });
      const result = await checkInbox();
      await dailyDigest().catch(() => {});
      return NextResponse.json(result);
    }
    return NextResponse.json(await sendDueFollowups(5));
  } catch (e) {
    return NextResponse.json({ error: String(e), more: false }, { status: 500 });
  }
}

/** One short email to you, only on days something needs you. */
async function dailyDigest() {
  const c = await one<{ replies: number; calls: number; due: number }>(
    `SELECT (SELECT count(*) FROM businesses WHERE needs_response=1) AS replies,
      (SELECT count(*) FROM businesses WHERE status='to_call' AND (follow_up_at IS NULL OR follow_up_at <= date('now'))) AS calls,
      (SELECT count(*) FROM businesses WHERE follow_up_at IS NOT NULL AND follow_up_at <= date('now') AND status IN ('replied','talking')) AS due`,
  );
  if (!c || c.replies + c.calls + c.due === 0) return;
  const parts = [
    c.replies && `${c.replies} ${c.replies === 1 ? "reply" : "replies"} to answer`,
    c.calls && `${c.calls} to call`,
    c.due && `${c.due} follow-up${c.due === 1 ? "" : "s"} due`,
  ].filter(Boolean);
  await notifySelf(`Today: ${parts.join(", ")}`, `${parts.join("\n")}\n\nOpen your dashboard: ${appUrl()}/`);
}
