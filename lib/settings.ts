import { all, run } from "./db";

export const DEFAULT_EMAIL_SUBJECT = "{{business_name}}: I built you a website (for free, don't panic)";

export const DEFAULT_EMAIL_BODY = `Hi {{business_name}} team,

I'm {{my_name}}: software engineer by day, website guy by night, and full-time student loan payer in between. So yes, I'm hungry for work. Starving, actually.

I couldn't find a website for {{business_name}}, so I built you one. Free, no strings:

{{preview_url}}

Like it? I'll make it yours on your own domain for \${{site_price}} one-time, plus \${{hosting_price}}/month for hosting and updates. Don't like it? No hard feelings. I'll just cry quietly into my ramen.

I also build custom stuff like online booking, order forms, and tools that kill the boring paperwork.

Reply here or call/text me at {{my_phone}}.

{{my_name}}`;

export const DEFAULT_FOLLOWUP_SUBJECT = "Re: {{business_name}}: I built you a website (for free, don't panic)";

export const DEFAULT_FOLLOWUP_BODY = `Hi again!

Bumping this in case it got buried under invoices. Your free sample is still up:

{{preview_url}}

If now's not the time, totally fine. If it is, reply here or text me at {{my_phone}}. My student loans and I would be thrilled.

{{my_name}}`;

export const DEFAULT_POSTCARD_MESSAGE = `Hi {{business_name}}!

I'm {{my_name}}: software engineer by day, website guy by night, student loan payer always. So I'm hungry for work.

I built you a free sample website. Scan the code to see it. No strings.

Like it? I'll make it yours. Don't? I'll survive. Probably.

Call or text: {{my_phone}}
Email: {{my_email}}`;

export const DEFAULT_OUTDATED_SUBJECT = "{{business_name}}: I redid your website (for free, don't panic)";

export const DEFAULT_OUTDATED_BODY = `Hi {{business_name}} team,

I'm {{my_name}}: software engineer by day, website guy by night, and full-time student loan payer in between. So yes, I'm hungry for work. Starving, actually.

I checked out {{current_site}} and spotted a few things that might be costing you customers:
{{site_issues}}

So I built you a free, phone-friendly redesign:

{{preview_url}}

Like it? I'll put it on your domain for \${{site_price}} one-time, plus \${{hosting_price}}/month for hosting and updates. Don't like it? No hard feelings. I'll just cry quietly into my ramen.

I also build custom stuff like online booking, order forms, and tools that kill the boring paperwork.

Reply here or call/text me at {{my_phone}}.

{{my_name}}`;

export const DEFAULT_OUTDATED_CALL_SCRIPT = `Hi, is this the owner? I'm {{my_name}}, a local software engineer. Quick 30 seconds, I promise.

I was on {{business_name}}'s website and noticed a couple things that might be losing you customers:
{{site_issues}}

So I built you a free redesign. Can I text you the link?

(If yes, send the text, then:) If you like it, I'll swap it in on your current web address, usually around \${{site_price}}. Honestly I'm paying off student loans, so I'm hungry for work. Text or call me back anytime at this number.`;

export const DEFAULT_CALL_SCRIPT = `Hi, is this the owner? I'm {{my_name}}, a local software engineer. Quick 30 seconds, I promise.

I couldn't find a website for {{business_name}}, so I built you one for free. Can I text you the link?

(If yes, send the text, then:) If you like it, I'll make it yours, usually around \${{site_price}}. Honestly I'm paying off student loans, so I'm hungry for work. Text or call me back anytime at this number.`;

export const DEFAULT_SMS = `Hey, it's {{my_name}}, the web guy who just called (the one drowning in student loans). Here's the free site I made for {{business_name}}: {{preview_url}}

Text me anytime if you want it!`;

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
  // What to do for leads with no email: "call" (your call list) or "postcard". "call_all" skips email entirely.
  outreach_mode: "call",
  call_script: DEFAULT_CALL_SCRIPT,
  sms_message: DEFAULT_SMS,
  email_subject: DEFAULT_EMAIL_SUBJECT,
  email_body: DEFAULT_EMAIL_BODY,
  followup_enabled: "1",
  followup_days: "5",
  followup_subject: DEFAULT_FOLLOWUP_SUBJECT,
  followup_body: DEFAULT_FOLLOWUP_BODY,
  postcard_message: DEFAULT_POSTCARD_MESSAGE,
  search_cursor: "0",
  run_batch: "",
  last_batch: "",
  // Which businesses to look for: "outdated" (have a website that looks old/broken), "no_site", or "both".
  lead_types: "outdated",
  min_outdated_score: "35",
  email_subject_outdated: DEFAULT_OUTDATED_SUBJECT,
  email_body_outdated: DEFAULT_OUTDATED_BODY,
  call_script_outdated: DEFAULT_OUTDATED_CALL_SCRIPT,
  run_added: "0",
  run_searches: "0",
  last_inbox_check: "",
  min_reviews: "0",
};

export type Settings = typeof DEFAULTS;

/** Bump when the default message wording changes: saved copies are replaced once. */
const TEMPLATES_VERSION = "2";
const TEMPLATE_KEYS = [
  "email_subject", "email_body", "followup_subject", "followup_body", "postcard_message",
  "email_subject_outdated", "email_body_outdated", "call_script", "call_script_outdated", "sms_message",
];

export async function getSettings(): Promise<Settings> {
  let rows = await all<{ key: string; value: string }>("SELECT key, value FROM settings");
  if ((rows.find((r) => r.key === "templates_version")?.value || "1") !== TEMPLATES_VERSION) {
    for (const k of TEMPLATE_KEYS) await run("DELETE FROM settings WHERE key = ?", [k]);
    await setSetting("templates_version", TEMPLATES_VERSION);
    rows = await all<{ key: string; value: string }>("SELECT key, value FROM settings");
  }
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
  return (process.env.APP_URL || process.env.URL || "http://localhost:3000").replace(/\/$/, "");
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
