import { one } from "./db";
import { checkPendingSites } from "./checksites";
import { findLeadsChunk } from "./places";
import { getSettings } from "./settings";

export type StepResult = { done: boolean; phase: string; ready: number; error?: string };

/**
 * One short step of the weekly lead run: search a few places, or check a few websites.
 * Call with fresh=true first, then repeatedly until done.
 */
export async function weeklyStep(fresh: boolean): Promise<StepResult> {
  const s = await getSettings();
  const ready = async () =>
    (await one<{ n: number }>("SELECT count(*) AS n FROM businesses WHERE status='new' AND batch_id=?", [
      Number((await getSettings()).last_batch) || 0,
    ]))?.n ?? 0;

  const pending = (await one<{ n: number }>("SELECT count(*) AS n FROM businesses WHERE status='checking'"))?.n ?? 0;
  if (!fresh && pending > 0) {
    await checkPendingSites(3);
    return { done: false, phase: "checking websites", ready: await ready() };
  }
  if (fresh || s.run_batch) {
    const r = await findLeadsChunk({ fresh, maxSearches: s.lead_types === "no_site" ? 3 : 1 });
    if (r.errors.length) return { done: true, phase: "search", ready: await ready(), error: r.errors[0] };
    return { done: false, phase: "searching", ready: await ready() };
  }
  return { done: true, phase: "done", ready: await ready() };
}
