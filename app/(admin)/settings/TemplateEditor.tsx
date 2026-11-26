"use client";

import { useState } from "react";

type T = {
  email_subject: string;
  email_body: string;
  followup_subject: string;
  followup_body: string;
  postcard_message: string;
  call_script: string;
  sms_message: string;
  email_subject_outdated: string;
  email_body_outdated: string;
  call_script_outdated: string;
};

const SAMPLE = {
  business_name: "Bay Avenue Barbers",
  town: "Somers Point",
  category: "barber shop",
  preview_url: "https://your-site.netlify.app/p/bay-avenue-barbers-x1y2z",
  current_site: "bayavenuebarbers.com",
  site_issues: "- Not built for phones: on a phone the page shows up tiny and zoomed out\n- Footer still says © 2016, so it looks abandoned\n- No secure connection (https): Chrome shows \"Not secure\" next to the address",
};

function fill(t: string, v: Record<string, string>) {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (k in v ? v[k] : `{{${k}}}`));
}

export default function TemplateEditor({
  initial,
  settings,
  followupEnabled,
  followupDays,
}: {
  initial: T;
  settings: Record<string, string>;
  followupEnabled: boolean;
  followupDays: string;
}) {
  const [t, setT] = useState<T>(initial);
  const [tab, setTab] = useState<"email" | "outdated" | "followup" | "call" | "callOutdated" | "sms" | "postcard">("outdated");
  const v = { ...SAMPLE, ...settings };
  const set = (k: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setT({ ...t, [k]: e.target.value });

  return (
    <div className="stack">
      <div className="row gap tabs">
        <button type="button" className={tab === "outdated" ? "tab on" : "tab"} onClick={() => setTab("outdated")}>Email: outdated site</button>
        <button type="button" className={tab === "email" ? "tab on" : "tab"} onClick={() => setTab("email")}>Email: no website</button>
        <button type="button" className={tab === "followup" ? "tab on" : "tab"} onClick={() => setTab("followup")}>Follow-up email</button>
        <button type="button" className={tab === "callOutdated" ? "tab on" : "tab"} onClick={() => setTab("callOutdated")}>Call: outdated site</button>
        <button type="button" className={tab === "call" ? "tab on" : "tab"} onClick={() => setTab("call")}>Call: no website</button>
        <button type="button" className={tab === "sms" ? "tab on" : "tab"} onClick={() => setTab("sms")}>Text message</button>
        <button type="button" className={tab === "postcard" ? "tab on" : "tab"} onClick={() => setTab("postcard")}>Postcard back</button>
      </div>
      <div className="grid2">
        <div className="stack">
          {/* All fields stay mounted so every template is saved together. */}
          <div style={{ display: tab === "outdated" ? "block" : "none" }} className="stack">
            <label>Subject <input name="email_subject_outdated" value={t.email_subject_outdated} onChange={set("email_subject_outdated")} /></label>
            <label>Body <textarea name="email_body_outdated" rows={18} value={t.email_body_outdated} onChange={set("email_body_outdated")} /></label>
          </div>
          <div style={{ display: tab === "callOutdated" ? "block" : "none" }} className="stack">
            <label>What to say on the phone (only you see this) <textarea name="call_script_outdated" rows={14} value={t.call_script_outdated} onChange={set("call_script_outdated")} /></label>
          </div>
          <div style={{ display: tab === "email" ? "block" : "none" }} className="stack">
            <label>Subject <input name="email_subject" value={t.email_subject} onChange={set("email_subject")} /></label>
            <label>Body <textarea name="email_body" rows={18} value={t.email_body} onChange={set("email_body")} /></label>
          </div>
          <div style={{ display: tab === "followup" ? "block" : "none" }} className="stack">
            <label className="row gap check">
              <input type="checkbox" name="followup_enabled" defaultChecked={followupEnabled} />
              Automatically send one follow-up if they haven&apos;t replied after
              <input name="followup_days" defaultValue={followupDays} style={{ width: 50 }} /> days
            </label>
            <label>Subject <input name="followup_subject" value={t.followup_subject} onChange={set("followup_subject")} /></label>
            <label>Body <textarea name="followup_body" rows={12} value={t.followup_body} onChange={set("followup_body")} /></label>
          </div>
          <div style={{ display: tab === "call" ? "block" : "none" }} className="stack">
            <label>What to say on the phone (only you see this) <textarea name="call_script" rows={14} value={t.call_script} onChange={set("call_script")} /></label>
          </div>
          <div style={{ display: tab === "sms" ? "block" : "none" }} className="stack">
            <label>Text you send with their sample link <textarea name="sms_message" rows={8} value={t.sms_message} onChange={set("sms_message")} /></label>
          </div>
          <div style={{ display: tab === "postcard" ? "block" : "none" }} className="stack">
            <label>
              Message (keep it short, it has to fit on half a 6×9 card)
              <textarea name="postcard_message" rows={12} value={t.postcard_message} onChange={set("postcard_message")} />
            </label>
            <span className={`small ${t.postcard_message.length > 650 ? "err" : "muted"}`}>{t.postcard_message.length} / ~650 characters</span>
          </div>
        </div>
        <div className="preview-mail">
          <div className="muted small">Preview for a sample business</div>
          {(tab === "email" || tab === "outdated" || tab === "followup") && (
            <p><b>Subject:</b> {fill({ email: t.email_subject, outdated: t.email_subject_outdated, followup: t.followup_subject }[tab], v)}</p>
          )}
          <pre className="emailpre">
            {fill({ email: t.email_body, outdated: t.email_body_outdated, followup: t.followup_body, call: t.call_script, callOutdated: t.call_script_outdated, sms: t.sms_message, postcard: t.postcard_message }[tab], v)}
            {(tab === "email" || tab === "outdated" || tab === "followup") && `\n\n--\n${settings.my_name} · [your PO box / virtual mailbox]\nNot interested? Reply "no thanks" or unsubscribe here and I won't email again: [link]`}
          </pre>
        </div>
      </div>
    </div>
  );
}
