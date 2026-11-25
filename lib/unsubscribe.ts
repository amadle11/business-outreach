import { getByToken, suppress } from "./businesses";
import { logEvent, run } from "./db";

export async function unsubscribeToken(token: string) {
  const b = await getByToken(token);
  if (!b) return null;
  await suppress(b);
  if (b.status !== "opted_out") {
    await run(
      "UPDATE businesses SET status='opted_out', follow_up_at=NULL, needs_response=0, updated_at=datetime('now') WHERE id=?",
      [b.id],
    );
    await logEvent(b.id, "unsubscribe", "Opted out via unsubscribe link");
  }
  return b;
}
