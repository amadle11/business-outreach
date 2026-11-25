import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusiness, channelFor } from "@/lib/businesses";
import { all } from "@/lib/db";
import { EVENT_ICON, fmtDate } from "@/lib/format";
import { PROFILES } from "@/lib/profiles";
import { getSettings } from "@/lib/settings";
import { composeEmail, postcardBackMessage } from "@/lib/outreach";
import { previewUrl } from "@/lib/template";
import { parseJson, STATUSES, STATUS_LABEL, type EventRow, type Review } from "@/lib/types";
import { logCall, markHandled, saveLead } from "../../actions";
import ActionButton from "@/components/ActionButton";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const b = await getBusiness(Number((await params).id));
  if (!b) notFound();
  const s = await getSettings();
  const events = await all<EventRow>("SELECT * FROM events WHERE business_id=? ORDER BY id DESC", [b.id]);
  const reviews = parseJson<Review[]>(b.reviews, []);
  const hours = parseJson<string[]>(b.hours, []);
  const socials = parseJson<string[]>(b.socials, []);
  const ch = channelFor(b, s.postcards_enabled === "1");
  const email = composeEmail(b, s);

  return (
    <div className="stack">
      <div className="row gap wrap">
        <h2 style={{ margin: 0 }}>{b.name}</h2>
        <span className={`pill st-${b.status}`}>{STATUS_LABEL[b.status]}</span>
        {b.needs_response ? <span className="pill red">needs your reply</span> : null}
        {b.is_sample ? <span className="pill">sample</span> : null}
        <span style={{ flex: 1 }} />
        <a className="btn" href={previewUrl(b)} target="_blank" rel="noreferrer">Open sample site ↗</a>
        <Link className="btn" href={`/leads/${b.id}/postcard`}>See postcard</Link>
        {b.needs_response ? <ActionButton action={markHandled.bind(null, b.id)} label="Mark responded" /> : null}
      </div>

      <div className="grid2">
        <div className="stack">
          <form action={saveLead} className="card form">
            <h3>Details</h3>
            <input type="hidden" name="id" value={b.id} />
            <label>Status
              <select name="status" defaultValue={b.status}>
                {STATUSES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}
              </select>
            </label>
            <label>Email <input name="email" defaultValue={b.email ?? ""} placeholder="none found" /></label>
            <label>Phone <input name="phone" defaultValue={b.phone ?? ""} /></label>
            <div className="row gap">
              <label style={{ flex: 2 }}>Street <input name="street" defaultValue={b.street ?? ""} /></label>
              <label style={{ flex: 1 }}>Town <input name="city" defaultValue={b.city ?? ""} /></label>
              <label style={{ width: 70 }}>State <input name="state" defaultValue={b.state ?? ""} /></label>
              <label style={{ width: 90 }}>ZIP <input name="zip" defaultValue={b.zip ?? ""} /></label>
            </div>
            <div className="row gap">
              <label style={{ flex: 1 }}>Sample site design
                <select name="profile" defaultValue={b.profile ?? "default"}>
                  {PROFILES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </label>
              <label style={{ flex: 1 }}>Follow up on <input type="date" name="follow_up_at" defaultValue={b.follow_up_at ?? ""} /></label>
              <label style={{ flex: 1 }}>Deal value ($) <input type="number" name="deal_value" defaultValue={b.deal_value ?? ""} /></label>
            </div>
            <label>Notes <textarea name="notes" rows={3} defaultValue={b.notes ?? ""} /></label>
            <button className="btn primary">Save</button>
            <p className="muted small">Will be contacted by: <b>{ch}</b> {ch === "none" && "(add an email or a full street address)"}</p>
          </form>

          <form action={logCall} className="card form">
            <h3>Log a call or text</h3>
            <input type="hidden" name="id" value={b.id} />
            <div className="row gap">
              <label style={{ flex: 1 }}>Outcome
                <select name="outcome">
                  <option>Talked, interested</option>
                  <option>Left voicemail</option>
                  <option>No answer</option>
                  <option>They called me</option>
                  <option>Not interested</option>
                  <option>Sold</option>
                </select>
              </label>
              <label style={{ flex: 1 }}>Next follow-up <input type="date" name="follow_up_at" /></label>
            </div>
            <label>Note <textarea name="note" rows={2} placeholder="What did they say?" /></label>
            <button className="btn">Log it</button>
          </form>

          <div className="card">
            <h3>Timeline</h3>
            <ul className="timeline">
              {events.map((e) => (
                <li key={e.id}>
                  <span className="ico">{EVENT_ICON[e.type] ?? "•"}</span>
                  <span className="muted small when">{fmtDate(e.created_at, true)}</span> {e.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Everything we know</h3>
            <div className="facts">
              <div><b>Type</b><span>{b.category}</span></div>
              <div><b>Rating</b><span>{b.rating ? `★ ${b.rating.toFixed(1)} (${b.review_count} reviews)` : "None"}</span></div>
              <div><b>Address</b><span>{b.address}</span></div>
              <div><b>Socials</b><span>{socials.length ? socials.map((x) => <a key={x} href={x} target="_blank" rel="noreferrer" className="trunc">{x}</a>) : "None found"}</span></div>
              <div><b>Google</b><span>{b.maps_url ? <a href={b.maps_url} target="_blank" rel="noreferrer">Maps listing</a> : "n/a"}</span></div>
              <div><b>Engagement</b><span>{b.views} site views · {b.scans} QR scans</span></div>
              <div><b>Found</b><span>{fmtDate(b.created_at)} via &quot;{b.search_query}&quot;</span></div>
            </div>
            {hours.length > 0 && <ul className="small plain">{hours.map((h) => <li key={h}>{h}</li>)}</ul>}
            {reviews.map((r, i) => (
              <p key={i} className="small review-q"><b>{"★".repeat(Math.round(r.rating))}</b> {r.text} <span className="muted">· {r.author}, {r.when}</span></p>
            ))}
          </div>
          {b.last_reply_snippet && (
            <div className="card">
              <h3>Their last reply</h3>
              <p className="snippet">{b.last_reply_snippet}</p>
            </div>
          )}
          {(b.channel ?? ch) === "postcard" ? (
            <div className="card">
              <h3>{b.contacted_at ? "Postcard they got" : "Postcard they'll get"}</h3>
              <pre className="emailpre">{postcardBackMessage(b, s)}</pre>
              <Link href={`/leads/${b.id}/postcard`} className="small">See the full postcard, front and back</Link>
            </div>
          ) : (
            <div className="card">
              <h3>{b.contacted_at ? "Email they got" : "Email they'll get"}</h3>
              <p className="small"><b>Subject:</b> {email.subject}</p>
              <pre className="emailpre">{email.text}</pre>
            </div>
          )}
          <div className="thumb big">
            <iframe src={`/p/${b.slug}`} title="preview" />
          </div>
        </div>
      </div>
    </div>
  );
}
