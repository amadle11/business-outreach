import { all, run } from "./db";

export const DEFAULT_EMAIL_SUBJECT = "I made a free website preview for {{business_name}}";

export const DEFAULT_EMAIL_BODY = `Hi {{business_name}} team,

My name is {{my_name}}. I'm a young software engineer from {{my_area}}. I work a full-time job and take on side projects to pay down my student loans, so I'll be honest: I'm hungry for work.

I was looking up local businesses in {{town}} and noticed {{business_name}} doesn't have a website. So I went ahead and built a simple sample for you, no strings attached:

{{preview_url}}

If you like it, I can make it yours, put it on your own domain, and keep it running for you. A site like this usually runs about \${{site_price}} one-time, plus \${{hosting_price}}/month for hosting and updates. No pressure and no hidden fees.

Beyond websites, I also build custom tools for businesses: online booking, order forms, customer lists, or automating the paperwork and manual tasks that eat up your day.

Happy to sort it all out over email, or call or text me at {{my_phone}}.

Thanks for your time,
{{my_name}}
{{my_phone}}`;

export const DEFAULT_FOLLOWUP_SUBJECT = "Re: I made a free website preview for {{business_name}}";

export const DEFAULT_FOLLOWUP_BODY = `Hi {{business_name}} team,

Just following up in case my last email got buried. Here's the sample site I put together for you:

{{preview_url}}

If it's not something you need right now, no worries at all. If you'd like to talk, just reply here or call or text me at {{my_phone}}.

Thanks,
{{my_name}}`;

export const DEFAULT_POSTCARD_MESSAGE = `Hi {{business_name}}!

I'm {{my_name}}, a local software engineer working full time and paying off student loans, so I'm hungry for work.

I noticed you don't have a website, so I built you a free sample. Scan the code to see it. No strings attached.

If you like it, I'll make it yours. I also build custom tools that automate the manual stuff in your business.

Call or text me: {{my_phone}}
Email: {{my_email}}`;

export const DEFAULT_CATEGORIES = [
  "restaurant",
  "pizza",
  "deli",
  "bakery",
  "cafe",
  "barber shop",
  "hair salon",
  "nail salon",
  "auto repair",
  "auto body shop",
  "plumber",
  "electrician",
  "HVAC contractor",
  "roofing contractor",
  "landscaping",
  "house cleaning service",
  "painter",
  "general contractor",
  "pet grooming",
  "tailor",
  "florist",
  "laundromat",
  "tattoo shop",
  "boat repair",
];

export const DEFAULTS: Record<string, string> = {
  my_name: "Anthony",
  my_phone: "",
  my_area: "New Jersey",
  my_email: "",
  mailing_address_line1: "",
  mailing_address_line2: "",
  mailing_city: "",
  mailing_state: "NJ",
  mailing_zip: "",
  site_price: "600",
  hosting_price: "25",
  towns: "Somers Point, NJ\nWildwood, NJ\nNutley, NJ",
  categories: DEFAULT_CATEGORIES.join("\n"),
  weekly_lead_cap: "30",
  live_sending: "0",
  postcards_enabled: "1",
  email_subject: DEFAULT_EMAIL_SUBJECT,
  email_body: DEFAULT_EMAIL_BODY,
  followup_enabled: "1",
  followup_days: "5",
  followup_subject: DEFAULT_FOLLOWUP_SUBJECT,
  followup_body: DEFAULT_FOLLOWUP_BODY,
  postcard_message: DEFAULT_POSTCARD_MESSAGE,
  search_cursor: "0",
  last_inbox_check: "",
  min_reviews: "0",
};

export type Settings = typeof DEFAULTS;

export async function getSettings(): Promise<Settings> {
  const rows = await all<{ key: string; value: string }>("SELECT key, value FROM settings");
  const s: Settings = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.value;
  return s;
}

export async function setSetting(key: string, value: string) {
  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export function lines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function mailingAddressText(s: Settings): string {
  return [
    s.mailing_address_line1,
    s.mailing_address_line2,
    [s.mailing_city, s.mailing_state].filter(Boolean).join(", ") + " " + s.mailing_zip,
  ]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

/** What is still missing before live sending can work. */
export function setupProblems(s: Settings): { email: string[]; postcard: string[]; leads: string[] } {
  const email: string[] = [];
  const postcard: string[] = [];
  const leads: string[] = [];
  if (!process.env.GMAIL_ADDRESS || !process.env.GMAIL_APP_PASSWORD)
    email.push("Gmail address and app password are not set (GMAIL_ADDRESS, GMAIL_APP_PASSWORD)");
  if (!s.mailing_address_line1 || !s.mailing_city || !s.mailing_zip)
    email.push("Add a PO box or virtual mailbox address in Settings. The law (CAN-SPAM) requires one in the footer of cold emails, so email sending is paused until it's set");
  if (!s.my_phone) email.push("Your phone number is not set (Settings)");
  if (!process.env.LOB_API_KEY) postcard.push("Lob API key is not set (LOB_API_KEY)");
  if (!s.my_phone) postcard.push("Your phone number is not set (Settings)");
  if (!process.env.GOOGLE_PLACES_API_KEY)
    leads.push("Google Places API key is not set (GOOGLE_PLACES_API_KEY)");
  return { email, postcard, leads };
}
