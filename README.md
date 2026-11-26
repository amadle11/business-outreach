# Outreach

A small, mostly hands-off tool for finding local NJ businesses with no website, building each one a free sample site, and pitching them by email or postcard.

**What it does every week, on its own**

1. **Monday 8 AM (Eastern):** searches Google Places for businesses in your towns and categories, keeps only the ones with no real website (a Facebook, Instagram, Yelp or ordering-app page doesn't count), and builds a one-page sample site for each. You get an email: "N new leads ready for review".
2. **You** open **Review**, look over everything we know about each business (type, rating, reviews, photos, hours, address, phone, email, socials, Maps link, the sample site itself), approve or remove in bulk, and press **Send**.
3. Leads with an email get your email from your Gmail. Leads without one go on your **Calls** list (default): tap to call, follow the script, then tap **Text sample link** to send them their site from your phone, and tap how it went. Or switch Settings to mail a 6×9 Lob postcard instead (picture of their site, a unique QR code, your phone and email, no return address).
4. **Every day 9 AM (Eastern):** checks your Gmail for replies and flags the ones that need an answer, notices when you've answered, catches bounces, and sends one polite follow-up email to people who haven't replied after 5 days (you can turn this off).
5. **Tracker** shows every business contacted, what was sent, site views, QR scans, replies, follow-ups due, calls you've logged, and won or lost.

## Pages

| Page | What it's for |
| --- | --- |
| Dashboard | Replies waiting on you, follow-ups and call reminders due, who looked at their site, recent activity, setup checklist |
| Review | This week's leads with all their info, bulk approve/remove, one Send button |
| Calls | Who to call today, with tap-to-call, your script, a one-tap text with their sample link, and outcome buttons |
| Tracker | Everyone you've contacted, filterable by status |
| Lead page | Edit details, change the site design, log a call, see the email or postcard they got, full timeline |
| Settings | Your info, the email/follow-up/postcard wording (with live preview), towns and categories, test vs live mode |
| `/p/<slug>` | The public sample site for a business |

## Safety rails

- **Test mode is on by default.** Nothing reaches a real business until you turn on *Live sending* in Settings. In test mode, each email is sent to *you* instead so you can see exactly what they'd get.
- **CAN-SPAM:** every email gets your name, a PO box or virtual mailbox address (never your home) and an unsubscribe link added at the bottom, plus Gmail's one-click unsubscribe header. Unsubscribes and "no thanks" replies are tracked, and opted-out businesses are never contacted again (their sample site is taken down too).
- A Lob key starting with `test_` never mails anything.
- Sample leads (the "Add sample leads" button) are fake and sends to them are only simulated.

## Setup (about 45 minutes)

You need five accounts. All have free tiers except Lob postcards (pay per card).

### 1. Database (Turso, free)
1. Sign up at turso.tech and create a database (any name, nearest region to the US East coast).
2. Copy its URL (`libsql://...`) and create an auth token. Keep both for step 5.

### 2. Google Places API key (lead search)
1. console.cloud.google.com → create a project → **APIs & Services → Library** → enable **Places API (New)**.
2. **Credentials → Create credentials → API key**. Edit the key and restrict it to *Places API (New)*.
3. Billing must be turned on for the project. At 20–50 leads a week this is a few dozen searches a month, which should stay inside Google's free monthly allowance. Set a small budget alert anyway.

### 3. Gmail app password (sending + reply tracking)
1. Your Google account needs 2-Step Verification turned on.
2. Go to myaccount.google.com/apppasswords, create one called "Outreach", and copy the 16-character password.

### 4. Lob (postcards, optional; skip if you're calling instead)
1. Sign up at lob.com. Use the **test** API key (`test_...`) first: cards are created and you can see proofs in Lob's dashboard, but nothing is mailed.
2. When you're ready, add a payment method and swap in the **live** key (`live_...`). A 6×9 postcard is roughly $1 including postage.

### 5. Host it on Netlify
1. app.netlify.com → **Add new site → Import an existing project → GitHub** → pick `business-outreach`. Netlify detects Next.js; leave the build settings as they are.
2. Before (or right after) the first deploy, go to **Site configuration → Environment variables** and add:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the password you'll log in with |
| `CRON_SECRET` | any long random string (used by the scheduled jobs in step 6) |
| `DATABASE_URL` | Turso URL from step 1 |
| `DATABASE_AUTH_TOKEN` | Turso token from step 1 |
| `GOOGLE_PLACES_API_KEY` | from step 2 |
| `GMAIL_ADDRESS` | your Gmail address |
| `GMAIL_APP_PASSWORD` | from step 3 |
| `LOB_API_KEY` | from step 4 |
| `APP_URL` | optional: only if you add a custom domain. Otherwise Netlify's own URL is used. |

3. **Deploys → Trigger deploy** so the variables take effect. Note your site URL, e.g. `https://outreach-anthony.netlify.app`.

### 6. Turn on the weekly and daily schedule (GitHub Actions)
Netlify doesn't run scheduled jobs long enough for this, so GitHub runs them and calls your site in small steps.
1. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**. Add two:
   - `APP_URL` = your Netlify URL (no trailing slash)
   - `CRON_SECRET` = the same value you gave Netlify
2. **Actions** tab → enable workflows if asked. To test right away: **Scheduled jobs → Run workflow**, pick `weekly`.

Note: GitHub pauses scheduled workflows in a *public* repo after 60 days with no commits. Keeping the repo private avoids that.

### 7. In the app
1. Log in, go to **Settings**, and fill in your phone. Postcards work right away: they carry no return address, only your name, phone, email and the QR code.
2. Email sending stays paused until you add a PO box or virtual mailbox address in Settings. The law requires a postal address in the footer of cold emails, and that footer is the only place it appears.
3. Tweak the email wording if you want.
4. Dashboard → **Find leads now** to run the first search without waiting for Monday.
5. Approve a few, press **Send** in test mode, and check your inbox.
6. When it looks right, turn on **Live sending** in Settings.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in at least ADMIN_PASSWORD
npm run dev                  # http://localhost:3000
```

Locally the database is a file (`local.db`). Postcards need a public `APP_URL` because Lob downloads the QR code and photos from it.

## How it's built

Next.js 15 (App Router, server actions), SQLite via libSQL/Turso, Nodemailer + ImapFlow for Gmail, Lob's REST API for postcards, GitHub Actions for the weekly and daily jobs (`.github/workflows/schedule.yml`), hosted on Netlify. Code map:

- `lib/places.ts`: weekly lead search
- `components/PreviewSite.tsx`, `lib/profiles.ts`: the sample site and its per-industry designs
- `lib/send.ts`, `lib/outreach.ts`, `lib/postcard.ts`: sending, templates, postcard HTML
- `lib/inbox.ts`: Gmail reply/bounce detection
- `app/(admin)/*`: dashboard, review, tracker, lead and settings pages
- `app/api/cron/*`: the scheduled jobs
