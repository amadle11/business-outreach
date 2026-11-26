/**
 * Website check for "outdated site" leads. Fetches the homepage (and a contact page if one is linked),
 * looks for signs the site is old, broken or hijacked, and pulls any email addresses it can find.
 *
 * Score: 0 = looks modern, 100 = very outdated / broken. Each issue is written in plain English so it
 * can be shown on the review screen and quoted in the pitch.
 */

export type Audit = {
  url: string;
  finalUrl: string | null;
  reachable: boolean;
  https: boolean;
  mobileFriendly: boolean | null;
  copyrightYear: number | null;
  tech: string[];
  emails: string[];
  issues: string[];
  score: number;
};

const UA = "Mozilla/5.0 (compatible; LocalSiteCheck/1.0)";
const YEAR = new Date().getFullYear();

async function get(url: string, timeoutMs = 5000): Promise<{ ok: boolean; status: number; url: string; html: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    const type = res.headers.get("content-type") || "";
    const html = type.includes("html") || type === "" ? (await res.text()).slice(0, 600_000) : "";
    return { ok: res.ok, status: res.status, url: res.url, html };
  } catch {
    return null;
  }
}

/** Cloudflare "email protection" hides addresses as hex; this reverses it. */
function decodeCfEmail(hex: string): string | null {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out.includes("@") ? out : null;
  } catch {
    return null;
  }
}

const IGNORE_EMAIL = /(example\.|sentry|wixpress|godaddy|squarespace|domain\.com|yourdomain|email\.com$|\.png$|\.jpg$|\.gif$|\.webp$|@2x|u003e)/i;

export function extractEmails(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) found.add(decodeURIComponent(m[1]).trim());
  for (const m of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) {
    const e = decodeCfEmail(m[1]);
    if (e) found.add(e);
  }
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  for (const m of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,10}/gi)) found.add(m[0]);
  return [...found]
    .map((e) => e.toLowerCase().replace(/^mailto:/, ""))
    .filter((e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,10}$/.test(e) && !IGNORE_EMAIL.test(e));
}

function findContactLink(html: string, base: string): string | null {
  const m = html.match(/href=["']([^"'#]*contact[^"'#]*)["']/i);
  if (!m) return null;
  try {
    return new URL(m[1], base).toString();
  } catch {
    return null;
  }
}

function visibleText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

export async function auditSite(rawUrl: string): Promise<Audit> {
  const url = /^https?:\/\//.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
  const host = new URL(url).host;
  const a: Audit = {
    url,
    finalUrl: null,
    reachable: false,
    https: false,
    mobileFriendly: null,
    copyrightYear: null,
    tech: [],
    emails: [],
    issues: [],
    score: 0,
  };
  let score = 0;
  const add = (points: number, issue: string) => {
    score += points;
    a.issues.push(issue);
  };

  const [secure, plain] = await Promise.all([get(`https://${host}/`), get(`http://${host}/`)]);
  const page = secure && secure.status < 500 ? secure : plain;
  a.https = !!secure && secure.status < 500 && secure.url.startsWith("https://");
  if (!page || page.status >= 400 || !page.html) {
    a.issues.push(page ? `Website returns an error (${page.status})` : "Website doesn't load at all");
    a.score = 100;
    return a;
  }
  a.reachable = true;
  a.finalUrl = page.url;
  const html = page.html;
  const lower = html.toLowerCase();
  const text = visibleText(html);

  if (!a.https) add(25, 'No secure connection (https): Chrome shows "Not secure" next to the address');

  a.mobileFriendly = /<meta[^>]+name=["']viewport["']/i.test(html);
  if (!a.mobileFriendly) add(30, "Not built for phones: on a phone the page shows up tiny and zoomed out");

  const years = [...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => Number(m[1]));
  const valid = years.filter((y) => y >= 1995 && y <= YEAR);
  if (valid.length) {
    a.copyrightYear = Math.max(...valid);
    const age = YEAR - a.copyrightYear;
    if (age >= 5) add(20, `Footer still says © ${a.copyrightYear}, so it looks abandoned`);
    else if (age >= 2) add(10, `Footer says © ${a.copyrightYear}`);
  }

  const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1];
  if (gen) a.tech.push(gen);
  if (/frontpage/i.test(gen || "") || /_vti_/i.test(html)) add(25, "Built with Microsoft FrontPage (early-2000s software)");
  if (/swfobject|\.swf["']/i.test(html)) add(20, "Uses Flash, which no browser supports anymore");
  if (/best viewed (in|with)/i.test(text)) add(15, 'Still says "best viewed in" an old browser');
  if (/hit counter|site ?meter|visitor(s)? since|you are visitor/i.test(lower)) add(15, "Has an old-school visitor counter");
  if ((html.match(/<table/gi) || []).length >= 6 && !/<(header|nav|section|main)\b/i.test(html))
    add(15, "Old table-based page layout from the 2000s");
  if (/<frameset|<frame\s/i.test(html)) add(20, "Uses frames, a 1990s web technique");
  if (/<marquee|<blink/i.test(html)) add(15, "Has scrolling/blinking text effects from the 90s");
  const jq = html.match(/jquery[.-]?(1\.\d+(\.\d+)?)/i)?.[1];
  if (jq) {
    a.tech.push(`jQuery ${jq}`);
    add(5, `Runs very old code (jQuery ${jq})`);
  }
  if (/wix\.com website builder|wixstatic/i.test(html)) a.tech.push("Wix");
  if (/squarespace/i.test(html)) a.tech.push("Squarespace");
  if (/wp-content/i.test(html)) a.tech.push("WordPress");
  if (/godaddy|starfield technologies/i.test(html)) a.tech.push("GoDaddy builder");

  if (/default index\.html|it works!|welcome to nginx|apache2 ubuntu default|this domain is parked|domain (is )?for sale|account suspended/i.test(text))
    add(60, "Shows a placeholder, parked or suspended page instead of the business's website");
  if (/lorem ipsum|\{\{\s*\w+\s*\}\}|\bslide 1\b|mysite|your (business|company) name here|sample page/i.test(text))
    add(15, "Has leftover template or placeholder text visible to customers");
  if (/(casino|kasyno|slot gacor|judi|togel|viagra|cialis|payday loan|betting)/i.test(text))
    add(60, "Looks hacked or taken over: the site shows gambling/spam content");
  if (!/href=["']tel:/i.test(html)) add(10, "No tap-to-call phone link");
  if (text.trim().length < 300) add(15, "Almost no content on the homepage");

  a.emails = extractEmails(html);
  if (!a.emails.length) {
    const contact = findContactLink(html, page.url);
    if (contact && new URL(contact).host.replace(/^www\./, "") === new URL(page.url).host.replace(/^www\./, "")) {
      const c = await get(contact, 4000);
      if (c?.html) a.emails = extractEmails(c.html);
    }
  }
  a.emails = [...new Set(a.emails)].slice(0, 3);
  a.score = Math.min(100, score);
  return a;
}
