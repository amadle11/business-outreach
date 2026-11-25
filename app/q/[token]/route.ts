import { NextResponse } from "next/server";
import { getByToken } from "@/lib/businesses";
import { logEvent, run } from "@/lib/db";
import { appUrl } from "@/lib/settings";

// Every postcard QR code points here, so each scan is counted before showing the sample site.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await getByToken(token);
  if (!b) return NextResponse.redirect(appUrl());
  await run("UPDATE businesses SET scans = scans + 1, updated_at = datetime('now') WHERE id = ?", [b.id]);
  await logEvent(b.id, "scan", "Postcard QR code scanned");
  return NextResponse.redirect(`${appUrl()}/p/${b.slug}?src=qr`);
}
