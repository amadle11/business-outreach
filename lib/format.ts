export function fmtDate(s: string | null | undefined, withTime = false) {
  if (!s) return "";
  const iso = s.length <= 10 ? s + "T12:00:00Z" : s.includes("T") ? s : s.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "America/New_York",
  });
}

export const EVENT_ICON: Record<string, string> = {
  found: "🔎",
  status: "🏷️",
  email_sent: "✉️",
  postcard_sent: "📮",
  followup_sent: "↩️",
  test_send: "🧪",
  scan: "📱",
  view: "👀",
  reply: "💬",
  you_replied: "✅",
  call: "📞",
  edit: "✏️",
  bounce: "⚠️",
  error: "❌",
  unsubscribe: "🚫",
  handled: "✅",
  lead_search: "🔎",
  send_run: "🚀",
  inbox_check: "📥",
};
