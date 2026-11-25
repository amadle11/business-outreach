import { NextResponse, type NextRequest } from "next/server";

// Resolves a Google Places photo to a short-lived image URL without exposing the API key.
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") || "";
  const w = Math.min(Number(req.nextUrl.searchParams.get("w")) || 1200, 1600);
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return new NextResponse("Not found", { status: 404 });
  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&skipHttpRedirect=true&key=${key}`,
  );
  if (!res.ok) return new NextResponse("Not found", { status: 404 });
  const { photoUri } = (await res.json()) as { photoUri?: string };
  if (!photoUri) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(photoUri, { status: 302, headers: { "Cache-Control": "public, max-age=3600" } });
}
