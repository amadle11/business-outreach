export type Review = {
  author: string;
  rating: number;
  text: string;
  when: string;
};

export type Hours = string[]; // e.g. ["Monday: 9:00 AM – 5:00 PM", ...]

export type Business = {
  id: number;
  place_id: string | null;
  batch_id: number | null;
  is_sample: number;
  name: string;
  category: string | null;
  primary_type: string | null;
  types: string | null;
  profile: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  socials: string | null;
  listed_website: string | null;
  hours: string | null;
  rating: number | null;
  review_count: number | null;
  reviews: string | null;
  photos: string | null;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  business_status: string | null;
  search_query: string | null;
  slug: string;
  token: string;
  status: string;
  channel: string | null;
  notes: string | null;
  deal_value: number | null;
  follow_up_at: string | null;
  followups_sent: number;
  contacted_at: string | null;
  email_message_id: string | null;
  needs_response: number;
  last_reply_at: string | null;
  last_reply_snippet: string | null;
  scans: number;
  views: number;
  lead_type: string;
  site_score: number | null;
  site_issues: string | null;
  site_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
  id: number;
  business_id: number | null;
  type: string;
  detail: string | null;
  meta: string | null;
  created_at: string;
};

export const STATUSES = [
  "new",
  "approved",
  "removed",
  "to_call",
  "contacted",
  "replied",
  "talking",
  "won",
  "lost",
  "opted_out",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  new: "Needs review",
  approved: "Approved, ready to send",
  to_call: "To call",
  removed: "Removed",
  contacted: "Contacted",
  replied: "Replied",
  talking: "In conversation",
  won: "Won",
  lost: "Lost",
  opted_out: "Opted out",
};

export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
