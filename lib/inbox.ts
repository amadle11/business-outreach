import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { all, logEvent, run } from "./db";
import { getSettings, setSetting } from "./settings";
import { gmailConfigured } from "./mail";
import type { Business } from "./types";

export type InboxResult = { replies: number; answered: number; bounces: number };

function cleanSnippet(text: string) {
  // Drop the quoted original ("On ... wrote:") and keep the top of the reply.
  const cut = text.split(/\n\s*On .{5,200}wrote:\s*\n|\n-{2,}\s*Original Message/i)[0];
  return cut.replace(/\n>.*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 400);
}

/**
 * Checks Gmail for replies from contacted businesses (flags them as needing a response),
 * notices when you've answered (clears the flag), and catches bounced emails.
 */
export async function checkInbox(): Promise<InboxResult> {
  if (!gmailConfigured()) throw new Error("Gmail is not configured");
  const s = await getSettings();
  const leads = await all<Business>(
    "SELECT * FROM businesses WHERE channel='email' AND email IS NOT NULL AND status IN ('contacted','replied','talking','won','lost')",
  );
  const byEmail = new Map(leads.map((b) => [b.email!.toLowerCase(), b]));
  const byMsgId = new Map(leads.filter((b) => b.email_message_id).map((b) => [b.email_message_id!, b]));
  const since = s.last_inbox_check
    ? new Date(new Date(s.last_inbox_check).getTime() - 2 * 86400000)
    : new Date(Date.now() - 30 * 86400000);
  const me = process.env.GMAIL_ADDRESS!.toLowerCase();
  const result: InboxResult = { replies: 0, answered: 0, bounces: 0 };

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: process.env.GMAIL_ADDRESS!, pass: process.env.GMAIL_APP_PASSWORD! },
    logger: false,
  });
  await client.connect();
  try {
    // 1) Incoming mail
    let lock = await client.getMailboxLock("INBOX");
    try {
      const uids = (await client.search({ since }, { uid: true })) || [];
      for await (const msg of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
        const from = msg.envelope?.from?.[0]?.address?.toLowerCase() ?? "";
        const date = msg.envelope?.date ? new Date(msg.envelope.date) : new Date();
        const inReplyTo = msg.envelope?.inReplyTo ?? "";
        if (!msg.source) continue;
        const raw = msg.source.toString("utf8");
        const isBounce = /mailer-daemon|postmaster/.test(from);
        let lead: Business | undefined = byEmail.get(from) ?? (inReplyTo ? byMsgId.get(inReplyTo) : undefined);
        if (!lead && isBounce) {
          for (const [id, b] of byMsgId) if (raw.includes(id)) lead = b;
        }
        if (!lead || from === me) continue;
        const when = date.toISOString().slice(0, 19).replace("T", " ");
        if (lead.last_reply_at && when <= lead.last_reply_at) continue;
        if (lead.contacted_at && when < lead.contacted_at) continue;

        if (isBounce) {
          await run(
            "UPDATE businesses SET status='approved', notes=trim(coalesce(notes,'') || ?), email=NULL, channel=NULL, last_reply_at=?, updated_at=datetime('now') WHERE id=?",
            [`\nBounced email: ${lead.email}`, when, lead.id],
          );
          await logEvent(lead.id, "bounce", `Email to ${lead.email} bounced. Moved back to approved so it can go by postcard.`);
          result.bounces++;
          continue;
        }
        const parsed = await simpleParser(msg.source);
        const snippet = cleanSnippet(parsed.text || "");
        const optOut = /\b(unsubscribe|stop|remove me|not interested|no thanks|no thank you|not for us|no interest|please don.t (email|contact))\b/i.test(snippet.slice(0, 120));
        await run(
          `UPDATE businesses SET needs_response=1, last_reply_at=?, last_reply_snippet=?,
             status=CASE WHEN status='contacted' THEN 'replied' ELSE status END, updated_at=datetime('now') WHERE id=?`,
          [when, snippet, lead.id],
        );
        await logEvent(
          lead.id,
          "reply",
          `Reply from ${from}: "${snippet.slice(0, 200)}"${optOut ? " (looks like a no / opt-out)" : ""}`,
          { subject: parsed.subject },
        );
        lead.last_reply_at = when;
        result.replies++;
      }
    } finally {
      lock.release();
    }

    // 2) Your sent mail: if you answered after their last reply, clear the "needs response" flag.
    const flagged = await all<Business>("SELECT * FROM businesses WHERE needs_response=1 AND email IS NOT NULL");
    if (flagged.length) {
      lock = await client.getMailboxLock("[Gmail]/Sent Mail");
      try {
        for (const b of flagged) {
          const uids = (await client.search({ to: b.email!, since }, { uid: true })) || [];
          for await (const msg of client.fetch(uids, { envelope: true }, { uid: true })) {
            const when = (msg.envelope?.date ? new Date(msg.envelope.date) : new Date(0))
              .toISOString()
              .slice(0, 19)
              .replace("T", " ");
            if (b.last_reply_at && when > b.last_reply_at) {
              await run("UPDATE businesses SET needs_response=0, status=CASE WHEN status='replied' THEN 'talking' ELSE status END WHERE id=?", [b.id]);
              await logEvent(b.id, "you_replied", "You answered them in Gmail");
              result.answered++;
              break;
            }
          }
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => {});
  }
  await setSetting("last_inbox_check", new Date().toISOString());
  await logEvent(null, "inbox_check", `${result.replies} new replies, ${result.answered} answered, ${result.bounces} bounces`);
  return result;
}
