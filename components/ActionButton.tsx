"use client";

import { useState, useTransition } from "react";

/** Button that runs a server action and shows its returned message. */
export default function ActionButton({
  action,
  label,
  busyLabel,
  className = "btn",
}: {
  action: () => Promise<string | void>;
  label: string;
  busyLabel?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="action">
      <button
        className={className}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            setMsg(r || null);
          })
        }
      >
        {pending ? busyLabel || "Working…" : label}
      </button>
      {msg && <span className="muted small"> {msg}</span>}
    </span>
  );
}
