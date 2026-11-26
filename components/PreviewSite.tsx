import { getProfile } from "@/lib/profiles";
import { parseJson, type Business, type Review } from "@/lib/types";
import type { Settings } from "@/lib/settings";

function photo(name: string, w = 1400) {
  return `/api/photo?name=${encodeURIComponent(name)}&w=${w}`;
}

function stars(n: number) {
  const r = Math.round(n);
  return "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));
}

/** The one-page sample site each business gets. Self-contained styles so it looks like a real site. */
export default function PreviewSite({ b, s, banner = true }: { b: Business; s: Settings; banner?: boolean }) {
  const p = getProfile(b.profile);
  const town = b.city || "your area";
  const photos = parseJson<{ name: string; attribution?: string }[]>(b.photos, []);
  const reviews = parseJson<Review[]>(b.reviews, []).filter((r) => r.text && r.rating >= 4).slice(0, 3);
  const hours = parseJson<string[]>(b.hours, []);
  const tel = b.phone ? `tel:${b.phone.replace(/[^\d+]/g, "")}` : undefined;
  const mapQ = encodeURIComponent(b.address || `${b.name} ${town}`);
  const heroBg = photos[0]
    ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.6)), url('${photo(photos[0].name)}') center/cover`
    : `linear-gradient(135deg, ${p.accent} 0%, ${p.dark} 100%)`;

  return (
    <div className="ps">
      <style>{`
.ps{--a:${p.accent};--d:${p.dark};font-family:"Segoe UI",system-ui,-apple-system,Helvetica,Arial,sans-serif;color:#1f2328;background:#fff;line-height:1.6}
.ps *{box-sizing:border-box}
.ps a{color:inherit}
.ps .banner{background:#fff8db;border-bottom:1px solid #f0d878;color:#5c4400;font-size:14px;text-align:center;padding:9px 16px}
.ps .banner a{font-weight:700}
.ps nav{display:flex;justify-content:space-between;align-items:center;padding:16px 6vw;background:#fff;position:sticky;top:0;z-index:5;box-shadow:0 1px 0 #eee}
.ps nav .logo{font-weight:800;font-size:20px;color:var(--d)}
.ps nav .links{display:flex;gap:22px;font-size:15px;align-items:center}
.ps nav .links a{text-decoration:none}
.ps .cta{background:var(--a);color:#fff!important;padding:10px 18px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block}
.ps .hero{background:${heroBg};color:#fff;padding:120px 6vw 110px;min-height:62vh;display:flex;flex-direction:column;justify-content:center}
.ps .hero h1{font-size:clamp(36px,6vw,64px);line-height:1.05;margin:0 0 14px;max-width:900px}
.ps .hero p{font-size:clamp(17px,2vw,22px);max-width:640px;margin:0 0 28px;opacity:.95}
.ps .hero .row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.ps .hero .rating{background:rgba(255,255,255,.15);padding:9px 14px;border-radius:8px;font-size:15px}
.ps section{padding:72px 6vw}
.ps h2{font-size:32px;margin:0 0 18px;color:var(--d)}
.ps .about{display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:start}
.ps .svc{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ps .svc div{background:#f6f7f9;border-left:4px solid var(--a);padding:14px 16px;border-radius:6px;font-weight:600}
.ps .gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.ps .gallery img{width:100%;height:220px;object-fit:cover;border-radius:10px}
.ps .alt{background:#f6f7f9}
.ps .reviews{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.ps .review{background:#fff;border-radius:12px;padding:22px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.ps .review .st{color:#f59f00;letter-spacing:2px}
.ps .review p{margin:10px 0;font-size:15px}
.ps .review small{color:#666}
.ps .visit{display:grid;grid-template-columns:1fr 1.3fr;gap:40px}
.ps .hours{list-style:none;padding:0;margin:0}
.ps .hours li{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;font-size:15px}
.ps iframe{width:100%;height:340px;border:0;border-radius:12px}
.ps .contact{background:var(--d);color:#fff;text-align:center}
.ps .contact h2{color:#fff}
.ps footer{padding:28px 6vw;font-size:13px;color:#777;text-align:center}
@media (max-width:760px){.ps nav .logo{font-size:17px;line-height:1.2;margin-right:10px}.ps nav .cta{white-space:nowrap;padding:8px 12px;font-size:14px}.ps .about,.ps .visit{grid-template-columns:1fr}.ps nav .links a:not(.cta){display:none}.ps .svc{grid-template-columns:1fr}}
`}</style>
      {banner && (
        <div className="banner">
          This is a free {b.lead_type === "outdated" ? "redesign sample" : "sample website"} {s.my_name} made for {b.name}. Like it?{" "}
          {s.my_phone ? (
            <>
              Call or text <a href={`tel:${s.my_phone.replace(/[^\d+]/g, "")}`}>{s.my_phone}</a>
            </>
          ) : (
            "Reply to my message"
          )}{" "}
          and it's yours.
        </div>
      )}
      <nav>
        <div className="logo">{b.name}</div>
        <div className="links">
          <a href="#about">About</a>
          {reviews.length > 0 && <a href="#reviews">Reviews</a>}
          <a href="#visit">Visit</a>
          {tel && (
            <a className="cta" href={tel}>
              {b.phone}
            </a>
          )}
        </div>
      </nav>
      <div className="hero">
        <h1>{b.name}</h1>
        <p>{p.tagline(town)}</p>
        <div className="row">
          {tel && (
            <a className="cta" href={tel}>
              {p.cta}
            </a>
          )}
          {b.rating ? (
            <span className="rating">
              ★ {b.rating.toFixed(1)} from {b.review_count} Google reviews
            </span>
          ) : null}
        </div>
      </div>
      <section id="about">
        <div className="about">
          <div>
            <h2>About {b.name}</h2>
            <p>{p.about(b.name, town)}</p>
            {b.category && <p style={{ color: "#666" }}>{b.category} · {town}, {b.state || "NJ"}</p>}
          </div>
          <div className="svc">
            {p.services.map((x) => (
              <div key={x}>{x}</div>
            ))}
          </div>
        </div>
      </section>
      {photos.length > 1 && (
        <section style={{ paddingTop: 0 }}>
          <div className="gallery">
            {photos.slice(1, 7).map((ph) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={ph.name} src={photo(ph.name, 600)} alt={`${b.name} photo`} loading="lazy" />
            ))}
          </div>
        </section>
      )}
      {reviews.length > 0 && (
        <section className="alt" id="reviews">
          <h2>What customers say</h2>
          <div className="reviews">
            {reviews.map((r, i) => (
              <div className="review" key={i}>
                <div className="st">{stars(r.rating)}</div>
                <p>“{r.text.length > 260 ? r.text.slice(0, 257) + "…" : r.text}”</p>
                <small>{r.author} · Google review</small>
              </div>
            ))}
          </div>
        </section>
      )}
      <section id="visit">
        <div className="visit">
          <div>
            <h2>Visit us</h2>
            {b.address && <p style={{ fontSize: 17 }}>{b.address.replace(/, USA$/, "")}</p>}
            {b.phone && (
              <p>
                <a href={tel}>{b.phone}</a>
              </p>
            )}
            {hours.length > 0 && (
              <ul className="hours">
                {hours.map((h) => {
                  const [d, ...rest] = h.split(": ");
                  return (
                    <li key={h}>
                      <span>{d}</span>
                      <span>{rest.join(": ")}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <iframe title="Map" loading="lazy" src={`https://www.google.com/maps?q=${mapQ}&output=embed`} />
        </div>
      </section>
      <section className="contact">
        <h2>Ready when you are</h2>
        <p style={{ marginBottom: 24 }}>Serving {town} and the surrounding area.</p>
        {tel && (
          <a className="cta" href={tel} style={{ fontSize: 18 }}>
            Call {b.phone}
          </a>
        )}
      </section>
      <footer>
        © {new Date().getFullYear()} {b.name}
        {banner && <> · Sample site by {s.my_name}{photos.length ? " · Photos via Google" : ""}</>}
      </footer>
    </div>
  );
}
