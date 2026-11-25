import { all } from "@/lib/db";
import { channelFor } from "@/lib/businesses";
import { getSettings, setupProblems } from "@/lib/settings";
import { parseJson, type Business, type Review } from "@/lib/types";
import { getProfile } from "@/lib/profiles";
import { lobMode } from "@/lib/postcard";
import ReviewBoard, { type ReviewLead } from "./ReviewBoard";

export default async function ReviewPage() {
  const s = await getSettings();
  const rows = await all<Business>(
    "SELECT * FROM businesses WHERE status IN ('new','approved') ORDER BY status DESC, rating IS NULL, review_count DESC, id",
  );
  const postcards = s.postcards_enabled === "1";
  const leads: ReviewLead[] = rows.map((b) => ({
    id: b.id,
    name: b.name,
    status: b.status,
    isSample: !!b.is_sample,
    category: b.category,
    design: getProfile(b.profile).label,
    address: b.address,
    mailable: !!(b.street && b.city && b.zip),
    phone: b.phone,
    email: b.email,
    socials: parseJson<string[]>(b.socials, []),
    hours: parseJson<string[]>(b.hours, []),
    rating: b.rating,
    reviewCount: b.review_count,
    reviews: parseJson<Review[]>(b.reviews, []),
    photos: parseJson<{ name: string }[]>(b.photos, []).map((p) => p.name),
    mapsUrl: b.maps_url,
    query: b.search_query,
    slug: b.slug,
    channel: channelFor(b, postcards),
    found: b.created_at,
  }));
  const probs = setupProblems(s);
  return (
    <ReviewBoard
      leads={leads}
      live={s.live_sending === "1"}
      lob={lobMode()}
      blockers={{ email: probs.email, postcard: probs.postcard }}
    />
  );
}
