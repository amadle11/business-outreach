import { all, logEvent, run } from "./db";
import { channelFor, isSuppressed, setStatus } from "./businesses";
import { composeEmail, unsubscribeUrl } from "./outreach";
import { gmailConfigured, sendMail } from "./mail";
import { lobMode, sendPostcard } from "./postcard";
import { appUrl, getSettings, setupProblems, type Settings } from "./settings";
import type { Business } from "./types";

export type SendSummary = {
  emailed: number;
  postcards: number;
  tests: number;
  skipped: { name: string; reason: string }[];
  errors: { name: string; error: string }[];
};

function addDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

/** Send to every approved lead. In test mode, real businesses are never contacted. */
export async function sendApproved(ids?: number[]): Promise<SendSummary> {
  const s = await getSettings();
  const live = s.live_sending === "1";
  const problems = setupProblems(s);
  let rows = await all<Business>("SELECT * FROM businesses WHERE status = 'approved' ORDER BY id");
  if (ids) rows = rows.filter((r) => ids.includes(r.id));
  const out: SendSummary = { emailed: 0, postcards: 0, tests: 0, skipped: [], errors: [] };

  for (const b of rows) {
    if (await isSuppressed(b)) {
      await setStatus(b.id, "opted_out", "On the do-not-contact list");
      out.skipped.push({ name: b.name, reason: "opted out earlier" });
      continue;
    }
    const ch = channelFor(b, s.postcards_enabled === "1");
    if (ch === "none") {
      out.skipped.push({ name: b.name, reason: "no email and no full mailing address" });
      continue;
    }
    try {
      if (b.is_sample) {
        await markContacted(b, ch, s, `Sample lead: ${ch} simulated, nothing was sent`, null);
        ch === "email" ? out.emailed++ : out.postcards++;
        continue;
      }
      if (ch === "email") {
        if (live && problems.email.length) {
          out.skipped.push({ name: b.name, reason: `email paused: ${problems.email[0]}` });
          continue;
        }
        const m = composeEmail(b, s);
        if (!live) {
          // Test mode: send the exact email to yourself instead of the business.
          if (gmailConfigured()) {
            await sendMail({
              to: process.env.GMAIL_ADDRESS!,
              subject: `[TEST, would go to ${b.email}] ${m.subject}`,
              text: m.text,
              html: m.html,
              fromName: s.my_name,
            });
          }
          await logEvent(b.id, "test_send", `Test mode: email preview sent to you instead of ${b.email}`);
          out.tests++;
          continue;
        }
        const r = await sendMail({
          to: b.email!,
          subject: m.subject,
          text: m.text,
          html: m.html,
          fromName: s.my_name,
          unsubscribeUrl: unsubscribeUrl(b),
        });
        await markContacted(b, "email", s, `Emailed ${b.email}: "${m.subject}"`, r.messageId);
        out.emailed++;
      } else {
        if (problems.postcard.length) throw new Error(problems.postcard.join("; "));
        const mode = lobMode();
        if (!live || mode === "test") {
          if (mode === "test" && appUrl().startsWith("https://")) {
            const r = await sendPostcard(b, s);
            await logEvent(b.id, "test_send", `Test mode: Lob test postcard created (not mailed)`, r);
          } else {
            await logEvent(b.id, "test_send", "Test mode: postcard not sent");
          }
          out.tests++;
          continue;
        }
        const r = await sendPostcard(b, s);
        await markContacted(
          b,
          "postcard",
          s,
          `Postcard mailed to ${b.street}, ${b.city}${r.expected ? ` (expected ${r.expected})` : ""}`,
          null,
          r,
        );
        out.postcards++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logEvent(b.id, "error", `Send failed: ${msg}`);
      out.errors.push({ name: b.name, error: msg });
    }
  }
  await logEvent(
    null,
    "send_run",
    `${live ? "Live" : "Test"} send: ${out.emailed} emails, ${out.postcards} postcards, ${out.tests} test sends, ${out.skipped.length} skipped, ${out.errors.length} errors`,
    out,
  );
  return out;
}

async function markContacted(
  b: Business,
  ch: "email" | "postcard",
  s: Settings,
  detail: string,
  messageId: string | null,
  meta?: unknown,
) {
  // Email: auto follow-up date. Postcard: reminder for you to call them.
  const days = ch === "email" ? Number(s.followup_days) || 5 : 10;
  await run(
    `UPDATE businesses SET status='contacted', channel=?, contacted_at=datetime('now'), email_message_id=?,
      follow_up_at=?, updated_at=datetime('now') WHERE id=?`,
    [ch, messageId, addDays(days), b.id],
  );
  await logEvent(b.id, ch === "email" ? "email_sent" : "postcard_sent", detail, meta);
}

/** Daily: send the one automatic follow-up email to contacted leads who never replied. */
export async function sendDueFollowups(limit = 5): Promise<{ sent: number; more: boolean }> {
  const s = await getSettings();
  if (s.followup_enabled !== "1" || s.live_sending !== "1" || setupProblems(s).email.length > 0) return { sent: 0, more: false };
  const today = new Date().toISOString().slice(0, 10);
  const due = await all<Business>(
    `SELECT * FROM businesses WHERE status='contacted' AND channel='email' AND followups_sent=0
       AND follow_up_at IS NOT NULL AND follow_up_at <= ? AND last_reply_at IS NULL LIMIT ?`,
    [today, limit + 1],
  );
  const more = due.length > limit;
  due.splice(limit);
  let n = 0;
  for (const b of due) {
    if (await isSuppressed(b)) continue;
    try {
      if (!b.is_sample) {
        const m = composeEmail(b, s, "followup");
        await sendMail({
          to: b.email!,
          subject: m.subject,
          text: m.text,
          html: m.html,
          fromName: s.my_name,
          inReplyTo: b.email_message_id,
          unsubscribeUrl: unsubscribeUrl(b),
        });
      }
      await run(
        "UPDATE businesses SET followups_sent=1, follow_up_at=?, updated_at=datetime('now') WHERE id=?",
        [addDays(7), b.id],
      );
      await logEvent(b.id, "followup_sent", b.is_sample ? "Follow-up simulated (sample lead)" : `Follow-up email sent to ${b.email}`);
      n++;
    } catch (e) {
      await logEvent(b.id, "error", `Follow-up failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { sent: n, more };
}

/** Tell yourself new leads are ready (sent to your own Gmail). */
export async function notifySelf(subject: string, text: string) {
  if (!gmailConfigured()) return;
  const s = await getSettings();
  await sendMail({ to: process.env.GMAIL_ADDRESS!, subject, text, fromName: `${s.my_name} (Outreach bot)` });
}
