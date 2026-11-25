import { unsubscribeToken } from "@/lib/unsubscribe";

// One-click unsubscribe (RFC 8058) used by Gmail/Yahoo's built-in "Unsubscribe" button.
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await unsubscribeToken(token);
  return new Response("Unsubscribed", { status: 200 });
}
