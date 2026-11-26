"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { approveLeads, approvedIds, removeLeads, sendNow, unreviewLeads, updateEmail } from "../actions";
import type { Review } from "@/lib/types";
import type { SendSummary } from "@/lib/send";

export type ReviewLead = {
  id: number;
  name: string;
  status: string;
  isSample: boolean;
  category: string | null;
  design: string;
  address: string | null;
  mailable: boolean;
  phone: string | null;
  email: string | null;
  socials: string[];
  hours: string[];
  rating: number | null;
  reviewCount: number | null;
  reviews: Review[];
  photos: string[];
  mapsUrl: string | null;
  query: string | null;
  slug: string;
  channel: "email" | "postcard" | "none";
  found: string;
};

const CH_LABEL = { email: "✉️ Email", postcard: "📮 Postcard", none: "⛔ Can't send" };

export default function ReviewBoard({
  leads,
  live,
  lob,
  blockers,
}: {
  leads: ReviewLead[];
  live: boolean;
  lob: "test" | "live" | "none";
  blockers: { email: string[]; postcard: string[] };
}) {
  const [tab, setTab] = useState<"new" | "approved">(leads.some((l) => l.status === "new") ? "new" : "approved");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<SendSummary | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const shown = leads.filter((l) => l.status === tab);
  const approved = leads.filter((l) => l.status === "approved");
  const counts = useMemo(
    () => ({
      email: approved.filter((l) => l.channel === "email").length,
      postcard: approved.filter((l) => l.channel === "postcard").length,
      none: approved.filter((l) => l.channel === "none").length,
    }),
    [approved],
  );

  const toggle = (id: number) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = shown.length > 0 && shown.every((l) => sel.has(l.id));
  const ids = shown.filter((l) => sel.has(l.id)).map((l) => l.id);
  const bulk = (fn: (ids: number[]) => Promise<void>, list = ids) =>
    start(async () => {
      await fn(list);
      setSel(new Set());
    });

  const sendCount = counts.email + counts.postcard;

  return (
    <div className="stack">
      <div className="card sendbar">
        <div>
          <h3 style={{ margin: 0 }}>
            {approved.length} approved: {counts.email} by email, {counts.postcard} by postcard
            {counts.none > 0 && `, ${counts.none} can't be reached (add an email or address)`}
          </h3>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            {live
              ? `Live mode: this sends real emails${lob === "live" ? " and mails real postcards (about $1 each)" : ""}.`
              : "Test mode: no business is contacted. Each email is sent to you instead so you can see it."}
            {blockers.email.length > 0 && counts.email > 0 && ` Email isn't set up yet: ${blockers.email[0]}.`}
            {blockers.postcard.length > 0 && counts.postcard > 0 && ` Postcards aren't set up yet: ${blockers.postcard[0]}.`}
          </p>
        </div>
        {!confirming ? (
          <button className="btn primary big" disabled={!sendCount || pending} onClick={() => setConfirming(true)}>
            Send to {sendCount} approved
          </button>
        ) : (
          <div className="row gap">
            <button
              className="btn primary big"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  // Send 3 at a time so each request stays short.
                  const ids = await approvedIds();
                  const total: SendSummary = { emailed: 0, postcards: 0, tests: 0, skipped: [], errors: [] };
                  for (let i = 0; i < ids.length; i += 3) {
                    setProgress(`Sending ${Math.min(i + 3, ids.length)} of ${ids.length}…`);
                    const r = await sendNow(ids.slice(i, i + 3));
                    total.emailed += r.emailed;
                    total.postcards += r.postcards;
                    total.tests += r.tests;
                    total.skipped.push(...r.skipped);
                    total.errors.push(...r.errors);
                  }
                  setProgress(null);
                  setResult(total);
                  setConfirming(false);
                })
              }
            >
              {pending ? progress || "Sending…" : `Yes, send ${sendCount}${live ? " for real" : " (test)"}`}
            </button>
            <button className="btn ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="card ok">
          <b>
            Done: {result.emailed} emailed, {result.postcards} postcards, {result.tests} test sends.
          </b>
          {result.skipped.map((x) => (
            <div key={x.name} className="small">Skipped {x.name}: {x.reason}</div>
          ))}
          {result.errors.map((x) => (
            <div key={x.name} className="small err">Failed {x.name}: {x.error}</div>
          ))}
          <div className="small">
            Sent leads are now on the <Link href="/tracker">Tracker</Link>.
          </div>
        </div>
      )}

      <div className="row gap wrap tabs">
        <button className={tab === "new" ? "tab on" : "tab"} onClick={() => { setTab("new"); setSel(new Set()); }}>
          Needs review ({leads.filter((l) => l.status === "new").length})
        </button>
        <button className={tab === "approved" ? "tab on" : "tab"} onClick={() => { setTab("approved"); setSel(new Set()); }}>
          Approved ({approved.length})
        </button>
        <span style={{ flex: 1 }} />
        <label className="row gap small">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSel(allSelected ? new Set() : new Set(shown.map((l) => l.id)))}
          />
          Select all
        </label>
        {tab === "new" ? (
          <>
            <button className="btn" disabled={!ids.length || pending} onClick={() => bulk(approveLeads)}>
              ✓ Approve {ids.length || ""}
            </button>
            <button className="btn danger" disabled={!ids.length || pending} onClick={() => bulk(removeLeads)}>
              ✕ Remove {ids.length || ""}
            </button>
          </>
        ) : (
          <>
            <button className="btn" disabled={!ids.length || pending} onClick={() => bulk(unreviewLeads)}>
              Move back to review
            </button>
            <button className="btn danger" disabled={!ids.length || pending} onClick={() => bulk(removeLeads)}>
              ✕ Remove {ids.length || ""}
            </button>
          </>
        )}
      </div>

      {shown.length === 0 && (
        <div className="card muted">
          {tab === "new"
            ? "No leads waiting for review. New ones arrive every Monday morning, or press \"Find leads now\" on the dashboard."
            : "Nothing approved yet."}
        </div>
      )}

      {shown.map((l) => (
        <LeadCard key={l.id} l={l} selected={sel.has(l.id)} onToggle={() => toggle(l.id)} busy={pending} start={start} />
      ))}
    </div>
  );
}

function LeadCard({
  l,
  selected,
  onToggle,
  busy,
  start,
}: {
  l: ReviewLead;
  selected: boolean;
  onToggle: () => void;
  busy: boolean;
  start: (fn: () => Promise<void>) => void;
}) {
  const [email, setEmail] = useState(l.email || "");
  const dirty = email !== (l.email || "");
  const searchEmail = `https://www.google.com/search?q=${encodeURIComponent(`"${l.name}" ${l.address?.split(",")[1] ?? ""} email`)}`;
  const searchFb = `https://www.google.com/search?q=${encodeURIComponent(`${l.name} ${l.address?.split(",")[1] ?? ""} facebook OR instagram`)}`;
  return (
    <div className={`card lead ${selected ? "sel" : ""}`}>
      <div className="lead-head">
        <label className="row gap">
          <input type="checkbox" checked={selected} onChange={onToggle} />
          <h3 style={{ margin: 0 }}>
            <Link href={`/leads/${l.id}`}>{l.name}</Link>
          </h3>
        </label>
        {l.isSample && <span className="pill">sample</span>}
        <span className={`pill ch-${l.channel}`}>{CH_LABEL[l.channel]}</span>
        <span style={{ flex: 1 }} />
        {l.status === "new" ? (
          <>
            <button className="btn small" disabled={busy} onClick={() => start(() => approveLeads([l.id]))}>✓ Approve</button>
            <button className="btn small danger" disabled={busy} onClick={() => start(() => removeLeads([l.id]))}>✕ Remove</button>
          </>
        ) : (
          <button className="btn small ghost" disabled={busy} onClick={() => start(() => unreviewLeads([l.id]))}>Undo approve</button>
        )}
      </div>
      <div className="lead-body">
        <a className="thumb" href={`/p/${l.slug}`} target="_blank" rel="noreferrer" title="Open sample site">
          <iframe src={`/p/${l.slug}`} loading="lazy" tabIndex={-1} title={`${l.name} preview`} />
          <span>Open sample site ↗</span>
        </a>
        <div className="facts">
          <div><b>Type</b><span>{l.category || "Unknown"} · design: {l.design}</span></div>
          <div>
            <b>Rating</b>
            <span>{l.rating ? `★ ${l.rating.toFixed(1)} (${l.reviewCount} reviews)` : "No ratings yet"}</span>
          </div>
          <div><b>Address</b><span>{l.address || "None listed"}{!l.mailable && l.address ? " (not a full street address, can't mail)" : ""}</span></div>
          <div><b>Phone</b><span>{l.phone ? <a href={`tel:${l.phone}`}>{l.phone}</a> : "None listed"}</span></div>
          <div>
            <b>Email</b>
            <span className="row gap">
              <input
                className="inline"
                value={email}
                placeholder="not found, paste one to email instead of mailing"
                onChange={(e) => setEmail(e.target.value)}
              />
              {dirty && (
                <button className="btn small" onClick={() => start(() => updateEmail(l.id, email))}>Save</button>
              )}
              <a className="small" href={searchEmail} target="_blank" rel="noreferrer">search</a>
            </span>
          </div>
          <div>
            <b>Socials</b>
            <span>
              {l.socials.length
                ? l.socials.map((s) => (
                    <a key={s} href={s} target="_blank" rel="noreferrer" className="trunc">{s.replace(/^https?:\/\/(www\.)?/, "")}</a>
                  ))
                : <>None on Google · <a href={searchFb} target="_blank" rel="noreferrer">search</a></>}
            </span>
          </div>
          <div>
            <b>Links</b>
            <span>
              {l.mapsUrl && <a href={l.mapsUrl} target="_blank" rel="noreferrer">Google Maps listing</a>}
              {l.query && <span className="muted"> · found by &quot;{l.query}&quot;</span>}
            </span>
          </div>
          {l.hours.length > 0 && (
            <details>
              <summary><b>Hours</b></summary>
              <ul className="small plain">{l.hours.map((h) => <li key={h}>{h}</li>)}</ul>
            </details>
          )}
          {l.reviews.length > 0 && (
            <details>
              <summary><b>Reviews ({l.reviews.length} shown of {l.reviewCount})</b></summary>
              {l.reviews.map((r, i) => (
                <p key={i} className="small review-q">
                  <b>{"★".repeat(Math.round(r.rating))}</b> {r.text} <span className="muted">· {r.author}, {r.when}</span>
                </p>
              ))}
            </details>
          )}
          {l.photos.length > 0 && (
            <div className="photos">
              {l.photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={`/api/photo?name=${encodeURIComponent(p)}&w=300`} alt="" loading="lazy" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
