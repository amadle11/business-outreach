import { appUrl, type Settings } from "./settings";
import { escapeHtml } from "./template";
import { getProfile } from "./profiles";
import { postcardBackMessage } from "./outreach";
import { parseJson, type Business } from "./types";

export function photoUrl(name: string, w = 1200) {
  return `${appUrl()}/api/photo?name=${encodeURIComponent(name)}&w=${w}`;
}

/** Front of a 6x9 postcard: a "browser window" showing the top of their sample site. */
export function postcardFrontHtml(b: Business): string {
  const p = getProfile(b.profile);
  const photos = parseJson<{ name: string }[]>(b.photos, []);
  const bg = photos[0]
    ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.55)),url('${photoUrl(photos[0].name)}') center/cover`
    : `linear-gradient(135deg, ${p.accent}, ${p.dark})`;
  const host = `${appUrl().replace(/^https?:\/\//, "")}/p/${b.slug}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:9.25in;height:6.25in;font-family:Helvetica,Arial,sans-serif;background:#f1f3f5;}
.wrap{position:absolute;inset:0.35in;}
.title{font-size:26px;font-weight:800;color:#212529;margin-bottom:12px;}
.title span{color:${p.accent}}
.win{border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.25);background:#fff;height:4.85in}
.bar{height:30px;background:#e9ecef;display:flex;align-items:center;padding:0 12px;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;background:#adb5bd}
.url{margin-left:12px;background:#fff;border-radius:6px;padding:3px 12px;font-size:12px;color:#495057;flex:1}
.hero{height:calc(4.85in - 30px);background:${bg};color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 48px}
.hero h1{font-size:46px;line-height:1.05;margin-bottom:12px;text-shadow:0 2px 8px rgba(0,0,0,.4)}
.hero p{font-size:20px;opacity:.95;margin-bottom:22px;max-width:6in}
.btn{display:inline-block;background:${p.accent};color:#fff;padding:12px 22px;border-radius:8px;font-weight:700;font-size:17px;width:max-content}
</style></head><body><div class="wrap">
<div class="title">I built <span>${escapeHtml(b.name)}</span> a free website. Take a look!</div>
<div class="win"><div class="bar"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="url">${escapeHtml(host)}</div></div>
<div class="hero"><h1>${escapeHtml(b.name)}</h1><p>${escapeHtml(p.tagline(b.city || "your town"))}</p><div class="btn">${escapeHtml(p.cta)}</div></div></div>
</div></body></html>`;
}

/** Back of a 6x9 postcard. Lob prints the address block in the bottom-right 4" x 2.375", so content stays left. */
export function postcardBackHtml(b: Business, s: Settings, preview = false): string {
  const msg = postcardBackMessage(b, s);
  const qr = `${appUrl()}/api/qr/${b.token}`;
  const myEmail = s.my_email || process.env.GMAIL_ADDRESS || "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:9.25in;height:6.25in;font-family:Helvetica,Arial,sans-serif;color:#212529;background:#fff}
.left{position:absolute;left:0.4in;top:0.4in;width:4.4in;bottom:0.4in;display:flex;flex-direction:column}
.msg{font-size:13.5px;line-height:1.45;white-space:pre-line;flex:1}
.qr{display:flex;align-items:center;gap:14px;margin-top:10px}
.qr img{width:1.3in;height:1.3in}
.qr div{font-size:13px;line-height:1.4}
.qr b{font-size:16px}
.top{position:absolute;right:0.4in;top:0.4in;width:3.9in;font-size:13px;line-height:1.5;color:#495057}
.top b{color:#212529;font-size:17px}
</style></head><body>
<div class="left"><div class="msg">${escapeHtml(msg)}</div>
<div class="qr"><img src="${qr}"><div><b>Scan to see your site</b><br>or call/text ${escapeHtml(s.my_phone)}</div></div></div>
${preview ? `<div style="position:absolute;right:0.15in;bottom:0.15in;width:4in;height:2.375in;border:2px dashed #adb5bd;color:#868e96;display:flex;align-items:center;justify-content:center;font-size:13px">Lob prints the business's address + postage here (no return address)</div>` : ""}
<div class="top"><b>${escapeHtml(s.my_name)}</b><br>Websites &amp; custom business tools<br>${escapeHtml(s.my_phone)}${myEmail ? `<br>${escapeHtml(myEmail)}` : ""}</div>
</body></html>`;
}

export function lobMode(): "test" | "live" | "none" {
  const k = process.env.LOB_API_KEY || "";
  if (!k) return "none";
  return k.startsWith("live_") ? "live" : "test";
}

export async function sendPostcard(b: Business, s: Settings): Promise<{ id: string; url?: string; expected?: string }> {
  const key = process.env.LOB_API_KEY;
  if (!key) throw new Error("LOB_API_KEY is not set");
  const body = {
    description: `Outreach: ${b.name}`,
    to: {
      name: b.name.slice(0, 40),
      address_line1: b.street,
      address_city: b.city,
      address_state: b.state,
      address_zip: b.zip,
      address_country: "US",
    },
    // No "from": Lob allows US postcards without a return address, so your home address is never printed.
    size: "6x9",
    use_type: "marketing",
    front: postcardFrontHtml(b),
    back: postcardBackHtml(b, s),
    metadata: { business_id: String(b.id) },
  };
  const res = await fetch("https://api.lob.com/v1/postcards", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(key + ":").toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { id?: string; url?: string; expected_delivery_date?: string; error?: { message?: string } };
  if (!res.ok || !json.id) throw new Error(`Lob: ${json.error?.message ?? res.status}`);
  return { id: json.id, url: json.url, expected: json.expected_delivery_date };
}
