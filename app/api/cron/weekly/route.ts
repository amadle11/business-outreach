import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { weeklyStep } from "@/lib/weekly";
import { notifySelf } from "@/lib/send";
import { appUrl } from "@/lib/settings";

export const maxDuration = 26;

/**
 * Weekly lead run, one short step per request (a Google search, or a few website checks), so each
 * request fits hosting time limits. The scheduler calls it with ?fresh=1 first, then again until
 * it answers { done: true }. When done, it emails you a link to review the new leads.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  try {
    const r = await weeklyStep(fresh);
    if (r.done) {
      await notifySelf(
        r.error ? "Weekly lead search hit a problem" : `${r.ready} new leads ready for review`,
        `This week's search found ${r.ready} local businesses to pitch.\n\nReview and approve them here: ${appUrl()}/review\n${r.error ? "\nError:\n" + r.error : ""}`,
      ).catch(() => {});
    }
    return NextResponse.json(r);
  } catch (e) {
    await notifySelf("Weekly lead search failed", String(e)).catch(() => {});
    return NextResponse.json({ done: true, error: String(e) }, { status: 500 });
  }
}
