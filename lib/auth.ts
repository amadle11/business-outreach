export const COOKIE = "outreach_session";

export async function sessionValue(): Promise<string> {
  const pw = process.env.ADMIN_PASSWORD || "";
  const data = new TextEncoder().encode(`outreach:${pw}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
