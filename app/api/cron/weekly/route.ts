import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { findLeadsChunk } from "@/lib/places";
import { notifySelf } from "@/lib/send";
import { appUrl } from "@/lib/settings";

export const maxDuration = 26;

/**
 * Weekly lead search, one small step per request (a few Google searches) so it fits hosting time limits.
 * The scheduler calls it with ?fresh=1 first, then again until it answers { done: true }.
 * When done, it emails you a link to review the new leads.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  try {
    const r = await findLeadsChunk({ fresh });
    if (r.done) {
      await notifySelf(
        r.errors.length ? "Weekly lead search hit a problem" : `${r.totalAdded} new leads ready for review`,
        `This week's search found ${r.totalAdded} local businesses with no website.\n\nReview and approve them here: ${appUrl()}/review\n${r.errors.length ? "\nError:\n" + r.errors.join("\n") : ""}`,
      ).catch(() => {});
    }
    return NextResponse.json(r);
  } catch (e) {
    await notifySelf("Weekly lead search failed", String(e)).catch(() => {});
    return NextResponse.json({ done: true, error: String(e) }, { status: 500 });
  }
}
