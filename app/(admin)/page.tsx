import Link from "next/link";
import { all, one } from "@/lib/db";
import { getSettings, setupProblems } from "@/lib/settings";
import { EVENT_ICON, fmtDate } from "@/lib/format";
import ActionButton from "@/components/ActionButton";
import { checkInboxNow, clearFollowUp, loadSampleLeads, markHandled } from "./actions";
import FindLeadsButton from "@/components/FindLeadsButton";
import type { Business, EventRow } from "@/lib/types";
import { lobMode } from "@/lib/postcard";

type Ev = EventRow & { name: string | null };

export default async function Dashboard() {
  const s = await getSettings();
  const probs = setupProblems(s);
  const today = new Date().toISOString().slice(0, 10);
  const st = (await one<Record<string, number>>(`SELECT
      coalesce(sum(status='new'),0) AS review, coalesce(sum(status='approved'),0) AS approved,
      coalesce(sum(contacted_at IS NOT NULL),0) AS contacted, coalesce(sum(last_reply_at IS NOT NULL),0) AS replied,
      coalesce(sum(status='won'),0) AS won, coalesce(sum(scans),0) AS scans, coalesce(sum(views),0) AS views,
      coalesce(sum(CASE WHEN status='won' THEN deal_value END),0) AS revenue
      FROM businesses`))!;
  const needs = await all<Business>("SELECT * FROM businesses WHERE needs_response=1 ORDER BY last_reply_at DESC");
  // Emails waiting on their one automatic follow-up are handled by the bot, so they aren't listed here.
  const due = await all<Business>(
    `SELECT * FROM businesses WHERE follow_up_at IS NOT NULL AND follow_up_at <= ? AND status IN ('contacted','replied','talking')
       AND NOT (channel='email' AND followups_sent=0 AND ?='1' AND status='contacted') ORDER BY follow_up_at`,
    [today, s.followup_enabled],
  );
  const hot = await all<Business>(
    "SELECT * FROM businesses WHERE status='contacted' AND (scans>0 OR views>0) ORDER BY updated_at DESC LIMIT 10",
  );
  const events = await all<Ev>(
    "SELECT e.*, b.name FROM events e LEFT JOIN businesses b ON b.id=e.business_id WHERE e.type NOT IN ('found','edit') ORDER BY e.id DESC LIMIT 25",
  );
  const lob = lobMode();
  const pc = s.outreach_mode === "postcard";

  return (
    <div className="stack">
      <div className="stats">
        <Link href="/review" className="stat"><b>{st.review}</b><span>to review</span></Link>
        <Link href="/review" className="stat"><b>{st.approved}</b><span>approved, unsent</span></Link>
        <Link href="/tracker" className="stat"><b>{st.contacted}</b><span>contacted</span></Link>
        <div className="stat"><b>{st.views + st.scans}</b><span>site views + QR scans</span></div>
        <Link href="/tracker?status=replied" className="stat"><b>{st.replied}</b><span>replied</span></Link>
        <Link href="/tracker?status=won" className="stat"><b>{st.won}</b><span>won{st.revenue ? ` · $${st.revenue}` : ""}</span></Link>
      </div>

      {(probs.email.length > 0 || (pc && probs.postcard.length > 0) || probs.leads.length > 0 || s.live_sending !== "1" || (pc && lob === "test")) && (
        <div className="card warn">
          <h3>Setup checklist</h3>
          <ul>
            {probs.leads.map((p) => <li key={p}>Lead search: {p}</li>)}
            {probs.email.map((p) => <li key={p}>Email: {p}</li>)}
            {pc && probs.postcard.map((p) => <li key={p}>Postcards: {p}</li>)}
            {pc && lob === "test" && <li>Postcards: your Lob key is a test key, so cards are created but never mailed.</li>}
            {s.live_sending !== "1" && (
              <li>
                Practice mode is on: every email goes to you, not the business, so you can see exactly what they&apos;d get. Turn on Live in{" "}
                <Link href="/settings#sending">Settings</Link> when you&apos;re ready.
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="row gap wrap">
        <FindLeadsButton />
        <ActionButton action={checkInboxNow} label="Check Gmail for replies" busyLabel="Checking…" />
        <ActionButton action={loadSampleLeads} label="Add sample leads" />
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Needs your response ({needs.length})</h3>
          {needs.length === 0 && <p className="muted">No replies waiting. Replies in Gmail show up here automatically.</p>}
          {needs.map((b) => (
            <div key={b.id} className="item">
              <div>
                <Link href={`/leads/${b.id}`}><b>{b.name}</b></Link>{" "}
                <span className="muted small">{fmtDate(b.last_reply_at, true)}</span>
                <p className="snippet">{b.last_reply_snippet}</p>
              </div>
              <div className="row gap">
                <a className="btn small" target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent("from:" + (b.email || ""))}`}>Open in Gmail</a>
                <ActionButton className="btn small ghost" action={markHandled.bind(null, b.id)} label="Done" />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Follow-ups due ({due.length})</h3>
          {due.length === 0 && <p className="muted">Nothing due. Postcard leads get a &quot;give them a call&quot; reminder 10 days after mailing.</p>}
          {due.map((b) => (
            <div key={b.id} className="item">
              <div>
                <Link href={`/leads/${b.id}`}><b>{b.name}</b></Link>{" "}
                <span className="muted small">due {fmtDate(b.follow_up_at)} · {b.channel}</span>
                <div className="small">
                  {b.phone && <a href={`tel:${b.phone}`}>{b.phone}</a>}{" "}
                  {b.scans > 0 && <span className="pill green">scanned {b.scans}×</span>}
                  {b.views > 0 && <span className="pill green">viewed {b.views}×</span>}
                </div>
              </div>
              <ActionButton className="btn small ghost" action={clearFollowUp.bind(null, b.id)} label="Clear" />
            </div>
          ))}
        </div>
      </div>

      {hot.length > 0 && (
        <div className="card">
          <h3>Looked at their site but haven&apos;t replied</h3>
          {hot.map((b) => (
            <div key={b.id} className="item">
              <Link href={`/leads/${b.id}`}><b>{b.name}</b></Link>
              <span className="small">
                {b.scans > 0 && `${b.scans} scan${b.scans > 1 ? "s" : ""} `}
                {b.views > 0 && `${b.views} view${b.views > 1 ? "s" : ""} `}
                {b.phone && <a href={`tel:${b.phone}`}>· {b.phone}</a>}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Recent activity</h3>
        {events.length === 0 && <p className="muted">Nothing yet.</p>}
        <ul className="timeline">
          {events.map((e) => (
            <li key={e.id}>
              <span className="ico">{EVENT_ICON[e.type] ?? "•"}</span>
              <span className="muted small when">{fmtDate(e.created_at, true)}</span>
              {e.business_id && e.name ? <Link href={`/leads/${e.business_id}`}><b>{e.name}</b></Link> : null} {e.detail}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
