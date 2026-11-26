import { all, logEvent, one, run } from "./db";
import { randomToken, slugify } from "./ids";
import type { Business, Review } from "./types";

export type NewBusiness = {
  place_id?: string | null;
  batch_id?: number | null;
  is_sample?: boolean;
  name: string;
  category?: string | null;
  primary_type?: string | null;
  types?: string[];
  profile: string;
  address?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  socials?: string[];
  listed_website?: string | null;
  hours?: string[];
  rating?: number | null;
  review_count?: number | null;
  reviews?: Review[];
  photos?: { name: string; attribution?: string }[];
  maps_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  business_status?: string | null;
  search_query?: string | null;
  lead_type?: "no_site" | "outdated";
  status?: string;
};

export async function insertBusiness(b: NewBusiness): Promise<number> {
  const slug = `${slugify(b.name) || "business"}-${randomToken(5)}`;
  const token = randomToken(10);
  const r = await run(
    `INSERT INTO businesses (place_id, batch_id, is_sample, name, category, primary_type, types, profile,
      address, street, city, state, zip, phone, email, socials, listed_website, hours, rating, review_count,
      reviews, photos, maps_url, lat, lng, business_status, search_query, slug, token, lead_type, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      b.place_id ?? null,
      b.batch_id ?? null,
      b.is_sample ? 1 : 0,
      b.name,
      b.category ?? null,
      b.primary_type ?? null,
      JSON.stringify(b.types ?? []),
      b.profile,
      b.address ?? null,
      b.street ?? null,
      b.city ?? null,
      b.state ?? null,
      b.zip ?? null,
      b.phone ?? null,
      b.email ?? null,
      JSON.stringify(b.socials ?? []),
      b.listed_website ?? null,
      JSON.stringify(b.hours ?? []),
      b.rating ?? null,
      b.review_count ?? null,
      JSON.stringify(b.reviews ?? []),
      JSON.stringify(b.photos ?? []),
      b.maps_url ?? null,
      b.lat ?? null,
      b.lng ?? null,
      b.business_status ?? null,
      b.search_query ?? null,
      slug,
      token,
      b.lead_type ?? "no_site",
      b.status ?? "new",
    ],
  );
  const id = Number(r.lastInsertRowid);
  if (b.status !== "checking") await logEvent(id, "found", b.search_query ? `Found via "${b.search_query}"` : "Added");
  return id;
}

export async function getBusiness(id: number) {
  return one<Business>("SELECT * FROM businesses WHERE id = ?", [id]);
}

export async function getBySlug(slug: string) {
  return one<Business>("SELECT * FROM businesses WHERE slug = ?", [slug]);
}

export async function getByToken(token: string) {
  return one<Business>("SELECT * FROM businesses WHERE token = ?", [token]);
}

export async function setStatus(id: number, status: string, detail?: string) {
  const prev = await one<{ status: string }>("SELECT status FROM businesses WHERE id = ?", [id]);
  if (!prev || prev.status === status) return;
  await run("UPDATE businesses SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
  await logEvent(id, "status", detail ?? `${prev.status} → ${status}`);
}

export async function isSuppressed(b: Pick<Business, "email" | "place_id">) {
  const vals = [b.email?.toLowerCase(), b.place_id].filter(Boolean) as string[];
  if (!vals.length) return false;
  const rows = await all(
    `SELECT value FROM suppression WHERE value IN (${vals.map(() => "?").join(",")})`,
    vals,
  );
  return rows.length > 0;
}

export async function suppress(b: Pick<Business, "email" | "place_id">) {
  for (const v of [b.email?.toLowerCase(), b.place_id]) {
    if (v) await run("INSERT OR IGNORE INTO suppression (value) VALUES (?)", [v]);
  }
}

export type Channel = "email" | "postcard" | "call" | "none";

/**
 * How a lead gets reached, based on Settings → outreach mode:
 *  "call"      email if we have one, otherwise your call list
 *  "postcard"  email if we have one, otherwise a postcard (or the call list if there's no full address)
 *  "call_all"  everyone goes on your call list
 */
export function channelFor(b: Business, mode: string): Channel {
  const hasEmail = !!b.email && /.+@.+\..+/.test(b.email);
  const mailable = !!(b.street && b.city && b.state && b.zip);
  if (mode !== "call_all" && hasEmail) return "email";
  if (mode === "postcard" && mailable) return "postcard";
  if (b.phone) return "call";
  if (mailable) return "postcard";
  return "none";
}
