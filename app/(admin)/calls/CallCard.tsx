"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { callOutcome } from "../actions";

export type CallLead = {
  id: number;
  name: string;
  phone: string;
  category: string | null;
  town: string | null;
  rating: number | null;
  reviewCount: number | null;
  hoursToday: string | null;
  slug: string;
  tries: number;
  nextTry: string | null;
  sms: string;
  script: string;
  isSample: boolean;
};

type Outcome = Parameters<typeof callOutcome>[1];

const OUTCOMES: [Outcome, string, string][] = [
  ["no_answer", "No answer", "btn small"],
  ["voicemail", "Voicemail", "btn small"],
  ["texted", "Texted link ✓", "btn small primary"],
  ["interested", "Interested! 🔥", "btn small primary"],
  ["not_interested", "Not interested", "btn small danger"],
  ["bad_number", "Wrong # / closed", "btn small ghost"],
];

export default function CallCard({ lead: l }: { lead: CallLead }) {
  const [showScript, setShowScript] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="card callcard">
      <div className="lead-head">
        <h3 style={{ margin: 0 }}>
          <Link href={`/leads/${l.id}`}>{l.name}</Link>
        </h3>
        {l.isSample && <span className="pill">sample</span>}
        {l.tries > 0 && <span className="pill">{l.tries} call{l.tries > 1 ? "s" : ""} so far</span>}
        {l.nextTry && <span className="pill">try again {l.nextTry}</span>}
      </div>
      <div className="callrow">
        <a className="phone" href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>📞 {l.phone}</a>
        <div className="small">
          {l.category} · {l.town}
          {l.rating ? ` · ★ ${l.rating.toFixed(1)} (${l.reviewCount})` : ""}
          <br />
          <span className={l.hoursToday === "Closed" ? "err" : "muted"}>Today: {l.hoursToday ?? "hours unknown"}</span>
        </div>
        <div className="row gap wrap">
          <a className="btn" href={`/p/${l.slug}`} target="_blank" rel="noreferrer">Their sample site ↗</a>
          {l.sms && <a className="btn primary" href={l.sms}>💬 Text sample link</a>}
          <button className="btn ghost" onClick={() => setShowScript(!showScript)}>{showScript ? "Hide" : "Show"} script</button>
        </div>
      </div>
      {showScript && <pre className="emailpre script">{l.script}</pre>}
      <div className="row gap wrap" style={{ marginTop: 10 }}>
        <span className="small muted">How did it go?</span>
        {OUTCOMES.map(([o, label, cls]) => (
          <button key={o} className={cls} disabled={pending} onClick={() => start(() => callOutcome(l.id, o))}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
