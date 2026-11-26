import { escapeHtml, fill, vars } from "./template";
import { appUrl, mailingAddressText, type Settings } from "./settings";
import type { Business } from "./types";

export function unsubscribeUrl(b: Business) {
  return `${appUrl()}/u/${b.token}`;
}

/** CAN-SPAM footer: who you are, a physical address, and an opt-out. Always appended. */
export function complianceFooter(b: Business, s: Settings) {
  const addr = mailingAddressText(s) || "[PO box address — set it in Settings]";
  return {
    text: `\n\n--\n${s.my_name} · ${addr}\nNot interested? Reply "no thanks" or unsubscribe here and I won't email again: ${unsubscribeUrl(b)}`,
    html: `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px"><p style="font-size:12px;color:#777;line-height:1.5">${escapeHtml(s.my_name)} · ${escapeHtml(addr)}<br>Not interested? Reply "no thanks" or <a href="${unsubscribeUrl(b)}" style="color:#777">unsubscribe here</a> and I won't email again.</p>`,
  };
}

function linkify(htmlEscaped: string) {
  return htmlEscaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
}

export function composeEmail(b: Business, s: Settings, kind: "first" | "followup" = "first") {
  const v = vars(b, s, kind === "first" ? "email" : "followup");
  const outdated = b.lead_type === "outdated";
  const subject = fill(kind === "first" ? (outdated ? s.email_subject_outdated : s.email_subject) : s.followup_subject, v);
  const body = fill(kind === "first" ? (outdated ? s.email_body_outdated : s.email_body) : s.followup_body, v);
  const footer = complianceFooter(b, s);
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:600px">` +
    body
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 14px">${linkify(escapeHtml(p)).replace(/\n/g, "<br>")}</p>`)
      .join("") +
    footer.html +
    `</div>`;
  return { subject, text: body + footer.text, html };
}

export function postcardBackMessage(b: Business, s: Settings) {
  return fill(s.postcard_message, vars(b, s, "qr"));
}
