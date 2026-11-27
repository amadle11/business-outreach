import { escapeHtml, fill, vars } from "./template";
import { appUrl, mailingAddressText, type Settings } from "./settings";
import type { Business } from "./types";

export function unsubscribeUrl(b: Business) {
  return `${appUrl()}/u/${b.token}`;
}

/** Footer appended to every email: intentionally empty. */
export function complianceFooter(b: Business, s: Settings) {
  // Per Anthony: no address or unsubscribe text in the email body. Opt-outs come from the
  // "reply and I'll stop" line (lib/inbox.ts) and Gmail's invisible List-Unsubscribe header.
  const addr = "";
  return {
    text: addr,
    html: addr,
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
      .map((p) => {
        // A paragraph that is just the sample link shows as a plain text link instead of a raw URL.
        if (p.trim() === v.preview_url)
          return `<p style="margin:0 0 18px"><a href="${v.preview_url}" style="font-weight:bold;color:#1a56db">See your new website &rarr;</a></p>`;
        return `<p style="margin:0 0 14px">${linkify(escapeHtml(p)).replace(/\n/g, "<br>")}</p>`;
      })
      .join("") +
    footer.html +
    `</div>`;
  return { subject, text: body + footer.text, html };
}

export function postcardBackMessage(b: Business, s: Settings) {
  return fill(s.postcard_message, vars(b, s, "qr"));
}
