import QRCode from "qrcode";
import { appUrl } from "@/lib/settings";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-z0-9]{6,20}$/.test(token)) return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(`${appUrl()}/q/${token}`, { width: 600, margin: 1 });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000" },
  });
}
