"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, logEvent, run } from "@/lib/db";
import { setStatus } from "@/lib/businesses";
import { findLeadsChunk } from "@/lib/places";
import { loadSamples } from "@/lib/sample";
import { sendApproved, type SendSummary } from "@/lib/send";
import { checkInbox } from "@/lib/inbox";
import { DEFAULTS, setSetting } from "@/lib/settings";
import { STATUSES } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
}

export async function approveLeads(ids: number[]) {
  for (const id of ids) await setStatus(id, "approved", "Approved");
  refresh();
}

export async function removeLeads(ids: number[]) {
  for (const id of ids) await setStatus(id, "removed", "Removed from review");
  refresh();
}

export async function unreviewLeads(ids: number[]) {
  for (const id of ids) await setStatus(id, "new", "Moved back to review");
  refresh();
}

/** Sends a few leads per call so each request stays short; the Review page calls it in a loop. */
export async function sendNow(ids: number[]): Promise<SendSummary> {
  const r = await sendApproved(ids);
  refresh();
  return r;
}

export async function updateEmail(id: number, email: string) {
  const v = email.trim() || null;
  await run("UPDATE businesses SET email=?, updated_at=datetime('now') WHERE id=?", [v, id]);
  await logEvent(id, "edit", v ? `Email set to ${v}` : "Email cleared");
  refresh();
}

/** One step of the lead search. The dashboard button calls it repeatedly until done. */
export async function findLeadsStep(fresh: boolean): Promise<{ done: boolean; total: number; error?: string }> {
  try {
    const r = await findLeadsChunk({ fresh });
    if (r.done) refresh();
    return { done: r.done, total: r.totalAdded, error: r.errors[0] };
  } catch (e) {
    return { done: true, total: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function approvedIds(): Promise<number[]> {
  return (await all<{ id: number }>("SELECT id FROM businesses WHERE status='approved' ORDER BY id")).map((r) => r.id);
}

export async function checkInboxNow(): Promise<string> {
  try {
    const r = await checkInbox();
    refresh();
    return `Gmail checked: ${r.replies} new replies, ${r.answered} you've answered, ${r.bounces} bounces.`;
  } catch (e) {
    return `Gmail check failed: ${e instanceof Error ? e.message : e}`;
  }
}

export async function loadSampleLeads(): Promise<string> {
  const n = await loadSamples();
  refresh();
  return `Added ${n} sample leads to the review screen. Sends to sample leads are simulated.`;
}

export async function clearSamples() {
  await run("DELETE FROM events WHERE business_id IN (SELECT id FROM businesses WHERE is_sample=1)");
  await run("DELETE FROM businesses WHERE is_sample=1");
  refresh();
}

export async function saveLead(formData: FormData) {
  const id = Number(formData.get("id"));
  const fields = ["email", "phone", "street", "city", "state", "zip", "notes", "follow_up_at", "profile", "deal_value"] as const;
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const f of fields) {
    if (!formData.has(f)) continue;
    const v = String(formData.get(f) ?? "").trim();
    sets.push(`${f}=?`);
    args.push(f === "deal_value" ? (v ? Number(v) : null) : v || null);
  }
  if (sets.length) {
    await run(`UPDATE businesses SET ${sets.join(",")}, updated_at=datetime('now') WHERE id=?`, [...args, id]);
    await logEvent(id, "edit", "Details updated");
  }
  const status = String(formData.get("status") || "");
  if ((STATUSES as readonly string[]).includes(status)) await setStatus(id, status);
  refresh();
}

export async function logCall(formData: FormData) {
  const id = Number(formData.get("id"));
  const outcome = String(formData.get("outcome") || "Call");
  const note = String(formData.get("note") || "").trim();
  const followUp = String(formData.get("follow_up_at") || "").trim();
  await logEvent(id, "call", `${outcome}${note ? `: ${note}` : ""}`);
  if (followUp) await run("UPDATE businesses SET follow_up_at=? WHERE id=?", [followUp, id]);
  if (outcome === "Talked, interested") await setStatus(id, "talking");
  if (outcome === "Not interested") await setStatus(id, "lost");
  if (outcome === "Sold") await setStatus(id, "won");
  await run("UPDATE businesses SET needs_response=0, updated_at=datetime('now') WHERE id=?", [id]);
  refresh();
}

export async function markHandled(id: number) {
  await run("UPDATE businesses SET needs_response=0 WHERE id=?", [id]);
  await logEvent(id, "handled", "Marked as responded");
  refresh();
}

export async function clearFollowUp(id: number) {
  await run("UPDATE businesses SET follow_up_at=NULL WHERE id=?", [id]);
  await logEvent(id, "handled", "Follow-up reminder cleared");
  refresh();
}

export async function saveSettings(formData: FormData) {
  for (const key of Object.keys(DEFAULTS)) {
    if (formData.has(key)) await setSetting(key, String(formData.get(key) ?? ""));
  }
  // Checkboxes: present only when checked. A hidden "_checkboxes" lists the ones on this form.
  for (const key of String(formData.get("_checkboxes") || "").split(",").filter(Boolean)) {
    await setSetting(key, formData.get(key) ? "1" : "0");
  }
  refresh();
  redirect(`/settings?saved=${formData.get("_section") || 1}`);
}

export async function resetTemplate(keys: string[]) {
  for (const k of keys) if (k in DEFAULTS) await setSetting(k, DEFAULTS[k]);
  refresh();
}

export async function leadIdsByStatus(status: string) {
  return (await all<{ id: number }>("SELECT id FROM businesses WHERE status=?", [status])).map((r) => r.id);
}
