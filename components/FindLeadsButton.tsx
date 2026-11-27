"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { findLeadsStep } from "@/app/(admin)/actions";

/** Runs the lead search a few searches at a time so no single request runs long. */
export default function FindLeadsButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  async function go() {
    setBusy(true);
    setMsg("Searching…");
    let fresh = true;
    for (let i = 0; i < 200; i++) {
      const r = await findLeadsStep(fresh);
      fresh = false;
      setMsg(`${r.phase[0].toUpperCase() + r.phase.slice(1)}… ${r.total} leads ready so far`);
      if (r.done) {
        setMsg(r.error ? `Search stopped: ${r.error}` : `Found ${r.total} new leads. They're on the Review page.`);
        break;
      }
    }
    setBusy(false);
    router.refresh();
  }
  return (
    <span className="action">
      <button className="btn primary" disabled={busy} onClick={go}>{busy ? "Searching…" : "Find leads now"}</button>
      {msg && <span className="muted small"> {msg}</span>}
    </span>
  );
}
