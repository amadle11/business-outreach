# Outreach

A small, mostly hands-off tool for finding local NJ businesses with no website, building each one a free sample site, and pitching them by email or postcard.

**What it does every week, on its own**

1. **Monday 8 AM (ET):** searches Google Places for businesses in your towns and categories, keeps only the ones with no real website (a Facebook, Instagram, Yelp or ordering-app page doesn't count), and builds a one-page sample site for each. You get an email: "N new leads ready for review".
2. **You** open **Review**, look over everything we know about each business (type, rating, reviews, photos, hours, address, phone, email, socials, Maps link, the sample site itself), approve or remove in bulk, and press **Send**.
3. Leads with an email get your email from your Gmail. Leads without one get a 6×9 postcard through Lob with a picture of their site, a QR code that's unique to them, and your phone number.
4. **Every day 9 AM (ET):** checks your Gmail for replies and flags the ones that need an answer, notices when you've answered, catches bounces, and sends one polite follow-up email to people who haven't replied after 5 days (you can turn this off).
5. **Tracker** shows every business contacted, what was sent, site views, QR scans, replies, follow-ups due, calls you've logged, and won or lost.

## Pages

| Page | What it's for |
| --- | --- |
| Dashboard | Replies waiting on you, follow-ups and call reminders due, who looked at their site, recent activity, setup checklist |
| Review | This week's leads with all their info, bulk approve/remove, one Send button |
| Tracker | Everyone you've contacted, filterable by status |
| Lead page | Edit details, change the site design, log a call, see the email or postcard they got, full timeline |
| Settings | Your info, the email/follow-up/postcard wording (with live preview), towns and categories, test vs live mode |
| `/p/<slug>` | The public sample site for a business |

## Safety rails

- **Test mode is on by default.** Nothing reaches a real business until you turn on *Live sending* in Settings. In test mode, each email is sent to *you* instead so you can see exactly what they'd get.
- **CAN-SPAM:** every email gets your name, your physical mailing address and an unsubscribe link added at the bottom, plus Gmail's one-click unsubscribe header. Unsubscribes and "no thanks" replies are tracked, and opted-out businesses are never contacted again (their sample site is taken down too).
- A Lob key starting with `test_` never mails anything.
- Sample leads (the "Add sample leads" button) are fake and sends to them are only simulated.

## Setup (about 45 minutes)

You need five accounts. All have free tiers except Lob postcards (pay per card).

### 1. Code on GitHub, hosted on Vercel
1. Put this folder in a private GitHub repo.
2. Go to vercel.com, sign in with GitHub, **Add New → Project**, pick the repo, and deploy. (Vercel's free Hobby plan is fine to start. Their terms call Hobby non-commercial, so move to Pro, $20/mo, once this is bringing in money.)
3. Note your app URL, e.g. `https://outreach-anthony.vercel.app`.

### 2. Database (Turso, free)
1. Sign up at turso.tech, create a database.
2. Copy its URL (`libsql://...`) and create an auth token.

### 3. Google Places API key (lead search)
1. console.cloud.google.com → create a project → **APIs & Services → Library** → enable **Places API (New)**.
2. **Credentials → Create credentials → API key**. Restrict it to *Places API (New)*.
3. Billing must be enabled on the project. At 20–50 leads a week this is a few dozen searches a month, which should stay inside Google's free monthly allowance, but set a budget alert to be safe.

### 4. Gmail app password (sending + reply tracking)
1. Your Google account needs 2-Step Verification turned on.
2. Go to myaccount.google.com/apppasswords, create one called "Outreach", copy the 16-character password.

### 5. Lob (postcards)
1. Sign up at lob.com. Start with the **test** API key (`test_...`): cards are created and you can see the proofs in Lob's dashboard, but nothing is mailed.
2. When ready, add a payment method and swap in the **live** key (`live_...`). A 6×9 postcard costs roughly $1 each including postage.

### 6. Environment variables in Vercel
Project → Settings → Environment Variables:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the password you'll log in with |
| `APP_URL` | your Vercel URL, no trailing slash |
| `CRON_SECRET` | any long random string (Vercel uses it to call the weekly/daily jobs) |
| `DATABASE_URL` | Turso URL |
| `DATABASE_AUTH_TOKEN` | Turso token |
| `GOOGLE_PLACES_API_KEY` | from step 3 |
| `GMAIL_ADDRESS` | your Gmail address |
| `GMAIL_APP_PASSWORD` | from step 4 |
| `LOB_API_KEY` | from step 5 |

Redeploy after adding them.

### 7. In the app
1. Log in, go to **Settings**, fill in your phone and mailing address (a PO box is fine; it's legally required in cold emails and is the postcard return address).
2. Tweak the email wording if you want.
3. Dashboard → **Find leads now** to run the first search without waiting for Monday.
4. Approve a few, press Send in test mode, and check your inbox.
5. When it looks right, turn on **Live sending**.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in at least ADMIN_PASSWORD
npm run dev                  # http://localhost:3000
```

Locally the database is a file (`local.db`). Postcards need a public `APP_URL` because Lob downloads the QR code and photos from it.

## How it's built

Next.js 15 (App Router, server actions), SQLite via libSQL/Turso, Nodemailer + ImapFlow for Gmail, Lob's REST API for postcards, Vercel Cron for the weekly and daily jobs. Code map:

- `lib/places.ts`: weekly lead search
- `components/PreviewSite.tsx`, `lib/profiles.ts`: the sample site and its per-industry designs
- `lib/send.ts`, `lib/outreach.ts`, `lib/postcard.ts`: sending, templates, postcard HTML
- `lib/inbox.ts`: Gmail reply/bounce detection
- `app/(admin)/*`: dashboard, review, tracker, lead and settings pages
- `app/api/cron/*`: the scheduled jobs
