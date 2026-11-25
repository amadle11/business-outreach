import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { findLeads } from "@/lib/places";
import { notifySelf } from "@/lib/send";
import { appUrl } from "@/lib/settings";

export const maxDuration = 300;

// Weekly: find new leads, then email you a link to review them.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const r = await findLeads();
    await notifySelf(
      `${r.added} new leads ready for review`,
      `This week's search found ${r.added} local businesses with no website.\n\nReview and approve them here: ${appUrl()}/review\n${r.errors.length ? "\nErrors:\n" + r.errors.join("\n") : ""}`,
    ).catch(() => {});
    return NextResponse.json(r);
  } catch (e) {
    await notifySelf("Weekly lead search failed", String(e)).catch(() => {});
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
