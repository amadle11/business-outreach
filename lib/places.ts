import { all, logEvent, run } from "./db";
import { insertBusiness } from "./businesses";
import { profileFor } from "./profiles";
import { getSettings, lines, setSetting } from "./settings";
import type { Review } from "./types";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.regularOpeningHours",
  "places.rating",
  "places.userRatingCount",
  "places.reviews",
  "places.photos",
  "places.googleMapsUri",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.businessStatus",
  "places.location",
].join(",");

/** Listing "websites" that are really just social/listing pages. These count as having no site. */
const NOT_A_WEBSITE =
  /(facebook\.com|fb\.me|instagram\.com|yelp\.com|linktr\.ee|business\.site|tiktok\.com|twitter\.com|x\.com|nextdoor\.com|google\.com|g\.page|square\.site|toasttab\.com|doordash\.com|grubhub\.com|ubereats\.com|seamless\.com|booksy\.com|vagaro\.com|styleseat\.com|schedulicity\.com)/i;

type PlaceApi = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  rating?: number;
  userRatingCount?: number;
  reviews?: {
    rating?: number;
    text?: { text: string };
    originalText?: { text: string };
    authorAttribution?: { displayName?: string };
    relativePublishTimeDescription?: string;
  }[];
  photos?: { name: string; authorAttributions?: { displayName?: string }[] }[];
  googleMapsUri?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  types?: string[];
  businessStatus?: string;
  location?: { latitude: number; longitude: number };
};

async function searchText(query: string, key: string): Promise<PlaceApi[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, pageSize: 20, regionCode: "US" }),
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { places?: PlaceApi[] };
  return json.places ?? [];
}

function comp(p: PlaceApi, type: string, short = false) {
  const c = p.addressComponents?.find((a) => a.types.includes(type));
  return c ? (short ? c.shortText : c.longText) : null;
}

export type FindResult = { batchId: number; added: number; searched: string[]; skipped: number; errors: string[] };

export async function findLeads(opts: { cap?: number } = {}): Promise<FindResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  const s = await getSettings();
  const towns = lines(s.towns);
  const cats = lines(s.categories);
  const cap = opts.cap ?? (Number(s.weekly_lead_cap) || 30);
  const minReviews = Number(s.min_reviews) || 0;
  const pairs = towns.flatMap((t) => cats.map((c) => `${c} in ${t}`));
  if (!pairs.length) throw new Error("Add at least one town and one category in Settings");

  const known = new Set(
    (await all<{ place_id: string }>("SELECT place_id FROM businesses WHERE place_id IS NOT NULL")).map(
      (r) => r.place_id,
    ),
  );
  const suppressed = new Set((await all<{ value: string }>("SELECT value FROM suppression")).map((r) => r.value));

  const b = await run("INSERT INTO batches (source) VALUES ('google_places')");
  const batchId = Number(b.lastInsertRowid);

  let cursor = Number(s.search_cursor) || 0;
  let added = 0;
  let skipped = 0;
  const searched: string[] = [];
  const errors: string[] = [];

  // Walk through town×category pairs, continuing from where last week stopped.
  for (let i = 0; i < pairs.length && added < cap; i++) {
    const query = pairs[cursor % pairs.length];
    cursor++;
    searched.push(query);
    let places: PlaceApi[] = [];
    try {
      places = await searchText(query, key);
    } catch (e) {
      errors.push(String(e));
      if (errors.length >= 3) break;
      continue;
    }
    for (const p of places) {
      if (added >= cap) break;
      if (known.has(p.id) || suppressed.has(p.id)) continue;
      known.add(p.id);
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
      const state = comp(p, "administrative_area_level_1", true);
      if (state && state !== "NJ") continue;
      const site = p.websiteUri;
      if (site && !NOT_A_WEBSITE.test(site)) {
        skipped++;
        continue;
      }
      if ((p.userRatingCount ?? 0) < minReviews) continue;
      if (!p.nationalPhoneNumber && !p.formattedAddress) continue;

      const types = p.types ?? [];
      const num = comp(p, "street_number");
      const route = comp(p, "route");
      const sub = comp(p, "subpremise");
      const reviews: Review[] = (p.reviews ?? []).map((r) => ({
        author: r.authorAttribution?.displayName ?? "Google user",
        rating: r.rating ?? 0,
        text: r.text?.text ?? r.originalText?.text ?? "",
        when: r.relativePublishTimeDescription ?? "",
      }));
      await insertBusiness({
        place_id: p.id,
        batch_id: batchId,
        name: p.displayName?.text ?? "Unknown business",
        category: p.primaryTypeDisplayName?.text ?? query.split(" in ")[0],
        primary_type: p.primaryType ?? null,
        types,
        profile: profileFor(types, query).key,
        address: p.formattedAddress ?? null,
        street: num && route ? `${num} ${route}${sub ? ` #${sub}` : ""}` : null,
        city: comp(p, "locality") ?? comp(p, "sublocality") ?? comp(p, "administrative_area_level_3"),
        state,
        zip: comp(p, "postal_code"),
        phone: p.nationalPhoneNumber ?? null,
        socials: site ? [site] : [],
        listed_website: site ?? null,
        hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
        rating: p.rating ?? null,
        review_count: p.userRatingCount ?? null,
        reviews,
        photos: (p.photos ?? []).slice(0, 6).map((ph) => ({
          name: ph.name,
          attribution: ph.authorAttributions?.[0]?.displayName,
        })),
        maps_url: p.googleMapsUri ?? null,
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
        business_status: p.businessStatus ?? null,
        search_query: query,
      });
      added++;
    }
  }

  await setSetting("search_cursor", String(cursor % pairs.length));
  const summary = `${added} new leads from ${searched.length} searches (${skipped} skipped because they already have a website)`;
  await run("UPDATE batches SET found = ?, summary = ? WHERE id = ?", [added, summary, batchId]);
  await logEvent(null, "lead_search", summary, { searched, errors });
  return { batchId, added, searched, skipped, errors };
}
