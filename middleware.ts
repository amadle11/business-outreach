import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, sessionValue } from "./lib/auth";

// Public: sample sites, QR redirects, unsubscribe, images, cron (secret-checked in the route), login.
const PUBLIC = [/^\/p\//, /^\/q\//, /^\/u\//, /^\/api\/photo/, /^\/api\/qr\//, /^\/api\/cron\//, /^\/api\/unsubscribe\//, /^\/login/];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((re) => re.test(path))) return NextResponse.next();
  if (!process.env.ADMIN_PASSWORD) {
    return new NextResponse("Set ADMIN_PASSWORD to use the dashboard.", { status: 500 });
  }
  if (req.cookies.get(COOKIE)?.value === (await sessionValue())) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
