import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { checkInbox } from "@/lib/inbox";
import { sendDueFollowups } from "@/lib/send";
import { gmailConfigured } from "@/lib/mail";

export const maxDuration = 26;

/**
 * Daily jobs, split so each request stays short:
 *   ?part=inbox      check Gmail for replies, answers and bounces
 *   ?part=followups  send up to 5 due follow-ups; call again while { more: true }
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const part = new URL(req.url).searchParams.get("part") || "inbox";
  try {
    if (part === "inbox") {
      if (!gmailConfigured()) return NextResponse.json({ skipped: "Gmail not configured" });
      return NextResponse.json(await checkInbox());
    }
    return NextResponse.json(await sendDueFollowups(5));
  } catch (e) {
    return NextResponse.json({ error: String(e), more: false }, { status: 500 });
  }
}
