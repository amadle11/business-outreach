import { parseJson, type Business } from "./types";
import { appUrl, type Settings } from "./settings";

export function previewUrl(b: Pick<Business, "slug">, source?: string) {
  return `${appUrl()}/p/${b.slug}${source ? `?src=${source}` : ""}`;
}

export function vars(b: Business, s: Settings, source = "email"): Record<string, string> {
  return {
    business_name: b.name,
    town: b.city || "your area",
    category: (b.category || "business").toLowerCase(),
    preview_url: previewUrl(b, source),
    my_name: s.my_name,
    my_phone: s.my_phone,
    my_area: s.my_area,
    my_email: s.my_email || process.env.GMAIL_ADDRESS || "",
    site_price: s.site_price,
    hosting_price: s.hosting_price,
    current_site: (b.listed_website || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
    site_issues: parseJson<string[]>(b.site_issues, [])
      .slice(0, 3)
      .map((i) => `- ${i}`)
      .join("\n"),
  };
}

export function fill(template: string, v: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (k in v ? v[k] : `{{${k}}}`));
}

export const PLACEHOLDERS = [
  ["business_name", "The business's name"],
  ["town", "Town the business is in"],
  ["category", "Business type, e.g. barber shop"],
  ["preview_url", "Link to their sample site"],
  ["my_name", "Your name (Settings)"],
  ["my_phone", "Your phone (Settings)"],
  ["my_email", "Your email (Settings, or your Gmail)"],
  ["my_area", "Where you're from (Settings)"],
  ["site_price", "Site price (Settings)"],
  ["hosting_price", "Monthly hosting price (Settings)"],
  ["current_site", "Their current website (outdated-site leads)"],
  ["site_issues", "Top 3 problems found on their site (outdated-site leads)"],
] as const;

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
