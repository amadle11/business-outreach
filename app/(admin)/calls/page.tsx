import Link from "next/link";
import { all } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fill, vars } from "@/lib/template";
import { fmtDate } from "@/lib/format";
import { parseJson, type Business } from "@/lib/types";
import CallCard from "./CallCard";

function todaysHours(hoursJson: string | null) {
  const day = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" });
  const line = parseJson<string[]>(hoursJson, []).find((h) => h.startsWith(day));
  return line ? line.replace(`${day}: `, "") : null;
}

function smsHref(phone: string, body: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  // "?&body=" works on both iPhone and Android.
  return `sms:${digits}?&body=${encodeURIComponent(body)}`;
}

export default async function CallsPage() {
  const s = await getSettings();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await all<Business>(
    `SELECT * FROM businesses WHERE status='to_call'
     ORDER BY (follow_up_at IS NOT NULL AND follow_up_at > ?), follow_up_at, rating IS NULL, review_count DESC`,
    [today],
  );
  const attempts = await all<{ business_id: number; n: number }>(
    "SELECT business_id, count(*) AS n FROM events WHERE type='call' GROUP BY business_id",
  );
  const tries = new Map(attempts.map((a) => [a.business_id, a.n]));
  const due = rows.filter((b) => !b.follow_up_at || b.follow_up_at <= today);
  const later = rows.filter((b) => b.follow_up_at && b.follow_up_at > today);

  const card = (b: Business) => {
    const v = vars(b, s, "sms");
    return (
      <CallCard
        key={b.id}
        lead={{
          id: b.id,
          name: b.name,
          phone: b.phone || "",
          category: b.category,
          town: b.city,
          rating: b.rating,
          reviewCount: b.review_count,
          hoursToday: todaysHours(b.hours),
          slug: b.slug,
          tries: tries.get(b.id) ?? 0,
          nextTry: b.follow_up_at && b.follow_up_at > today ? fmtDate(b.follow_up_at) : null,
          sms: b.phone ? smsHref(b.phone, fill(s.sms_message, v)) : "",
          script: fill(b.lead_type === "outdated" ? s.call_script_outdated : s.call_script, v),
          isSample: !!b.is_sample,
        }}
      />
    );
  };

  return (
    <div className="stack">
      <div className="card">
        <h3 style={{ margin: 0 }}>📞 Call list: {due.length} to call today</h3>
        <p className="muted small" style={{ margin: "6px 0 0" }}>
          Tap the number to call. If they say yes, tap <b>Text sample link</b>: it opens your phone&apos;s messages with the link
          already written. Then tap how it went. &quot;No answer&quot; and &quot;Voicemail&quot; bring them back in 2–3 days. Edit
          the script and text in <Link href="/settings#templates">Settings</Link>.
        </p>
      </div>
      {due.length === 0 && (
        <div className="card muted">
          Nobody to call right now. Approve leads on <Link href="/review">Review</Link> and press Send to add them here.
        </div>
      )}
      {due.map(card)}
      {later.length > 0 && (
        <>
          <h3 style={{ margin: "12px 0 0" }}>Try again later ({later.length})</h3>
          {later.map(card)}
        </>
      )}
    </div>
  );
}
