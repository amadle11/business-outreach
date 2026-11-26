import { getSettings, setupProblems } from "@/lib/settings";
import { PLACEHOLDERS } from "@/lib/template";
import { lobMode } from "@/lib/postcard";
import { gmailConfigured } from "@/lib/mail";
import { saveSettings } from "../actions";
import TemplateEditor from "./TemplateEditor";

function Saved({ on }: { on: boolean }) {
  return on ? <span className="pill green">Saved</span> : null;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const s = await getSettings();
  const { saved } = await searchParams;
  const probs = setupProblems(s);
  const env = [
    ["Google Places (lead search)", !!process.env.GOOGLE_PLACES_API_KEY],
    ["Gmail (send + reply tracking)", gmailConfigured()],
    [`Lob (postcards, ${lobMode()} key)`, lobMode() !== "none"],
    ["Cron secret (weekly/daily automation)", !!process.env.CRON_SECRET],
    ["Public app URL", !!process.env.APP_URL && process.env.APP_URL.startsWith("https://")],
  ] as const;

  return (
    <div className="stack narrow">
      <div className="card">
        <h3>Connections</h3>
        <ul className="plain">
          {env.map(([label, ok]) => (
            <li key={label}>{ok ? "✅" : "⬜️"} {label}</li>
          ))}
        </ul>
        <p className="muted small">These are set as environment variables where the app is hosted (see README).</p>
      </div>

      <form action={saveSettings} className="card form" id="you">
        <input type="hidden" name="_section" value="you" />
        <h3>About you <Saved on={saved === "you"} /></h3>
        <div className="row gap">
          <label style={{ flex: 1 }}>Your name <input name="my_name" defaultValue={s.my_name} /></label>
          <label style={{ flex: 1 }}>Your phone <input name="my_phone" defaultValue={s.my_phone} placeholder="(609) 555-1234" /></label>
          <label style={{ flex: 1 }}>Where you&apos;re from <input name="my_area" defaultValue={s.my_area} /></label>
        </div>
        <label>Email shown on postcards (leave blank to use your Gmail) <input name="my_email" defaultValue={s.my_email} /></label>
        <p className="muted small" style={{ margin: 0 }}>
          <b>Email footer address.</b> Cold emails legally need a postal address in the footer (CAN-SPAM). Use a PO box or a
          virtual mailbox, never your home. It appears only at the bottom of emails, never on postcards or sample sites.
          Email sending stays paused until this is filled in. Postcards don&apos;t need it.
        </p>
        <label>PO box or mailbox address <input name="mailing_address_line1" defaultValue={s.mailing_address_line1} placeholder="PO Box 123" /></label>
        <label>Address line 2 <input name="mailing_address_line2" defaultValue={s.mailing_address_line2} /></label>
        <div className="row gap">
          <label style={{ flex: 2 }}>City <input name="mailing_city" defaultValue={s.mailing_city} /></label>
          <label style={{ width: 80 }}>State <input name="mailing_state" defaultValue={s.mailing_state} /></label>
          <label style={{ width: 110 }}>ZIP <input name="mailing_zip" defaultValue={s.mailing_zip} /></label>
        </div>
        <div className="row gap">
          <label style={{ flex: 1 }}>Site price ($) <input name="site_price" defaultValue={s.site_price} /></label>
          <label style={{ flex: 1 }}>Hosting per month ($) <input name="hosting_price" defaultValue={s.hosting_price} /></label>
        </div>
        <button className="btn primary">Save</button>
      </form>

      <form action={saveSettings} className="card form" id="templates">
        <input type="hidden" name="_section" value="templates" />
        <input type="hidden" name="_checkboxes" value="followup_enabled" />
        <h3>Email &amp; postcard wording <Saved on={saved === "templates"} /></h3>
        <p className="muted small">
          Use these placeholders and they&apos;ll be filled in for each business:{" "}
          {PLACEHOLDERS.map(([k, d]) => (
            <code key={k} title={d}>{`{{${k}}}`} </code>
          ))}
          . Your name, PO box and an unsubscribe link are added under every email automatically.
        </p>
        <TemplateEditor
          initial={{
            email_subject: s.email_subject,
            email_body: s.email_body,
            followup_subject: s.followup_subject,
            followup_body: s.followup_body,
            postcard_message: s.postcard_message,
          }}
          settings={{ my_name: s.my_name, my_phone: s.my_phone, my_area: s.my_area, site_price: s.site_price, hosting_price: s.hosting_price }}
          followupEnabled={s.followup_enabled === "1"}
          followupDays={s.followup_days}
        />
        <button className="btn primary">Save wording</button>
      </form>

      <form action={saveSettings} className="card form" id="search">
        <input type="hidden" name="_section" value="search" />
        <h3>Lead search <Saved on={saved === "search"} /></h3>
        <div className="row gap">
          <label style={{ flex: 1 }}>Towns (one per line)
            <textarea name="towns" rows={8} defaultValue={s.towns} />
          </label>
          <label style={{ flex: 1 }}>Business types (one per line)
            <textarea name="categories" rows={8} defaultValue={s.categories} />
          </label>
        </div>
        <div className="row gap">
          <label style={{ flex: 1 }}>Max new leads per week <input type="number" name="weekly_lead_cap" defaultValue={s.weekly_lead_cap} /></label>
          <label style={{ flex: 1 }}>Skip businesses with fewer than N reviews <input type="number" name="min_reviews" defaultValue={s.min_reviews} /></label>
        </div>
        <p className="muted small">
          Each week the search picks up where it left off, working through every town × type combination, and stops once it has enough
          new businesses with no website. Facebook, Instagram, Yelp and ordering-app pages don&apos;t count as a website.
        </p>
        <button className="btn primary">Save</button>
      </form>

      <form action={saveSettings} className="card form" id="sending">
        <input type="hidden" name="_section" value="sending" />
        <input type="hidden" name="_checkboxes" value="live_sending,postcards_enabled" />
        <h3>Sending <Saved on={saved === "sending"} /></h3>
        <label className="row gap check">
          <input type="checkbox" name="postcards_enabled" defaultChecked={s.postcards_enabled === "1"} />
          Send a postcard when no email is found
        </label>
        <label className="row gap check">
          <input type="checkbox" name="live_sending" defaultChecked={s.live_sending === "1"} />
          <span>
            <b>Live sending.</b> When off (test mode), no business is contacted: emails are sent to you instead and postcards are skipped.
          </span>
        </label>
        {s.live_sending !== "1" && (probs.email.length > 0 || probs.postcard.length > 0) && (
          <p className="small err">Before going live: {[...probs.email, ...probs.postcard].join("; ")}.</p>
        )}
        <button className="btn primary">Save</button>
      </form>
    </div>
  );
}
