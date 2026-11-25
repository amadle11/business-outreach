import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { checkInbox } from "@/lib/inbox";
import { sendDueFollowups } from "@/lib/send";
import { gmailConfigured } from "@/lib/mail";

export const maxDuration = 300;

// Daily: check Gmail for replies, then send any follow-ups that are due.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const out: Record<string, unknown> = {};
  if (gmailConfigured()) {
    try {
      out.inbox = await checkInbox();
    } catch (e) {
      out.inboxError = String(e);
    }
  }
  try {
    out.followups = await sendDueFollowups();
  } catch (e) {
    out.followupError = String(e);
  }
  return NextResponse.json(out);
}
