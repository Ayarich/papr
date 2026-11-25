# papr: Student Research Repository

An open library where students in Ghana publish their final-year projects, theses and papers.
Students submit, moderators check, and published papers get a permanent page, a DOI and Google Scholar tags.

Built with **Next.js 15** (React + TypeScript), **SQLite** (via libSQL) and **Three.js** for the animated home page. No separate database to install.

**Look and feel:** light and dark mode (moon/sun button in the navbar, remembered per device), a branded loading screen on the first visit, a progress bar between pages, and an animated wave of points behind the home page hero that ripples under your mouse (`src/components/HeroScene.tsx`).

---

## 1. Run it on Windows (PowerShell)

### What you need first
- **Node.js 20 or newer.** Download the LTS version from https://nodejs.org and install it with the default options.
  Check it worked by opening PowerShell and typing `node -v`. You should see something like `v22.x.x` or `v24.x.x`.

### Steps
1. Unzip `papr.zip` somewhere easy, e.g. `C:\Projects\papr`.
2. Open **PowerShell** and go into the folder:
   ```powershell
   cd C:\Projects\papr
   ```
3. Install the packages (takes 1–3 minutes, needs internet):
   ```powershell
   npm install
   ```
4. Create the database and load example papers:
   ```powershell
   npm run setup
   ```
5. Start the app:
   ```powershell
   npm run dev
   ```
6. Open **http://localhost:3000** in your browser.

To stop the app, click in PowerShell and press `Ctrl + C`. Next time you only need `npm run dev`.

### If PowerShell says "running scripts is disabled on this system"
Windows blocks npm's helper script by default. Run this once, then try again:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
(Or type `npm.cmd` instead of `npm`, e.g. `npm.cmd install`.)

---

## 2. Try it out

| Who | Log in with | What to try |
|---|---|---|
| Student | `ama.mensah@st.umat.edu.gh` | Tools, Topics, Opportunities, My profile, edit & resubmit a paper |
| Lecturer | `lecturer@umat.edu.gh` | **My collections** → the UMaT class collection, confirm students' work |
| Moderator | `moderator@papr.edu.gh` | Review queue, **Admin** (import, people, opportunities, campaigns, Paper of the Month, digest) |
| Recruiter / reader | `recruiter@example.com` (any non-.edu.gh email) | **Find talent**, contact a student |
| New student | any email ending in `.edu.gh` | Submit, earn badges |

No passwords: you get a 6-digit code, shown on screen while testing, in the PowerShell window and at **/dev/outbox**.
**/dev/outbox** shows every email the app "sent": codes, claim links, supervisor links, digests and contact messages.

The `samples` folder has files for testing:
- `import-example.csv` + `waste_tarkwa.pdf` + `lagoon_takoradi.pdf`: bulk import (Admin → Import & claims)
- `copied_paper_for_testing.pdf`: copies passages from two papers. Run it through **Tools → Pre-check** after importing to see the plagiarism checker catch it
- `sample-paper.pdf`: a well-structured project for Slides, Poster, References and Defence practice

Start over with fresh example data at any time: `npm run reset`

## Features

**Getting uploads**
- **Lecturer collections** (`/collections`): a lecturer creates a link for the class; students upload into it (supervisor details filled in automatically); the lecturer sees who submitted and confirms work in one click. Anyone can ask for lecturer access; moderators approve it under Admin → People.
- **Import & claim** (Admin → Import): upload a CSV + PDFs of past projects. They're published straight away and each author gets a "Claim it" email with a private link.
- **Drop Week campaigns** (Admin → Campaigns): a site-wide banner with a countdown; uploads during the campaign earn its badge.
- **Tools** (`/tools`): Slides, Pre-check (plagiarism + abstract polisher), Reference checker (missing citations + APA 7), A0 Poster maker (editable .pptx with QR code), Defence practice (questions from your own paper + 2-minute timer). Every tool ends with "Publish it on papr too?"

**Bringing people back**
- **Topic finder** (`/topics`): research ideas taken from papers' recommendations. Saving an idea notifies its author.
- **Opportunities** (`/opportunities`): internships, national service, scholarships, grad school, conferences, jobs and grants, filtered by type and field, with a "For you" feed and a "Fully funded" filter. Moderators post them under Admin → Opportunities.
- **Live Master's & PhD listings**: papr reads public RSS/Atom feeds from scholarship and research-job sites every 3 hours (the first visit waits for them; later visits refresh in the background). It keeps only postgraduate items and tags each one as Master's or PhD, fully funded or not, with its deadline, country, university and field. Students see the title, a short summary and a **View →** link to the original page. Matching new listings are added to the weekly digest email.
  - Starts with **Opportunities for Africans** and **Scholars4Dev**. Add more under **Admin → Opportunities → Live feeds** (any RSS/Atom address, e.g. a jobs.ac.uk or university PhD feed), switch sources off, **Refresh now**, or **Hide** a listing (it stays hidden after refreshes).
  - Only add feeds from sites that allow it, and keep the link back to the source. Some sites block automated readers; papr shows the error next to that source and carries on.
  - Code: `src/lib/live-opps.ts`.
- **Open to opportunities + Find talent** (`/profile`, `/talent`, `/u/name`): public student profiles with badges and stats. Employers search by skill; messages go through papr, so students' emails stay private.
- **Follow** fields, universities and authors (`/following`) + **weekly digest** email (Admin → Weekly digest).
- **Notifications** (the bell): downloads ("Someone at KNUST downloaded your paper"), view milestones, confirmations, saved ideas, new followers, contact requests, awards.
- **Paper of the Month** (Admin → Paper of the Month): ranked nominees, prize (e.g. a data bundle) and sponsor; the winner gets a home-page spotlight, a 🏆 badge and a notification.
- **Badges**: First Drop, Published Author, Supervisor Verified, 100 Reads, 100 Downloads, Slide Maker, Drop Week, Topic Inspirer, Paper of the Month.

**Plagiarism checking** works like Turnitin's own method: every paper's full text is fingerprinted, and new work is compared phrase by phrase against all of papr, with matching passages highlighted and quotes and reference lists left out. It checks against **papr's library only**. For web and journal coverage, connect a commercial service (Crossref Similarity Check / iThenticate, or Copyleaks) in `src/lib/plagiarism-providers.ts`.

Reader countries come from the `cf-ipcountry` / `x-vercel-ip-country` header, so they appear once the site runs behind Cloudflare or Vercel.

## 3. papr Slides: turn a paper into a presentation

Students open **Tools → Slides** (or **✨ Make slides** next to a paper in *My submissions*), upload a PDF, and get a draft deck in seconds:
title, outline, background, problem, objectives, methodology, key findings, a "big statement" slide, conclusion, recommendations and a thank-you slide.

- **Edit like PowerPoint:** click any text on the slide and type. Enter adds a bullet; Backspace on an empty bullet removes it.
- Reorder, duplicate and delete slides; 5 layouts; 5 themes; speaker notes; autosave.
- **Present** full-screen (arrow keys, Esc to exit).
- **Download .pptx:** a real PowerPoint file. Every title and bullet is a normal text box, so it stays editable in PowerPoint, Google Slides or Keynote.

**How the draft is written:** by default papr finds the usual section headings in the PDF and picks the most informative sentences (numbers, findings, recommendations). This is free and works offline.
For better wording, put a Claude API key in `.env` as `ANTHROPIC_API_KEY`, and Claude will write the outline instead (falls back to the built-in method if anything fails).
Code: `src/lib/deck.ts` (outline + themes), `src/lib/ai-outline.ts` (optional AI), `src/lib/pptx.ts` (PowerPoint export), `src/components/slides/` (editor).

Scanned PDFs (photos of pages) contain no text and can't be converted yet.

## 4. How the code is organised

```
papr/
├─ db/schema.sql            All database tables (users, submissions, versions, reviews, decks…)
├─ scripts/setup.mjs        Creates the database and the example data
├─ data/                    The database file (papr.db) lives here
├─ uploads/                 Uploaded PDFs are stored here
├─ .env                     Settings (database location, site address, DOI prefix)
└─ src/
   ├─ app/                  One folder per page (Next.js "App Router")
   │  ├─ page.tsx               Home
   │  ├─ library/               Search and filters
   │  ├─ papers/[ref]/          Public paper page (+ /pdf download route)
   │  ├─ login/                 Email-code login
   │  ├─ submit/                The 6-step submission form
   │  ├─ my/                    Student's submissions, edit & resubmit, withdraw
   │  ├─ moderate/              Review queue + publish / changes / decline
   │  ├─ confirm/[token]/       Supervisor confirmation (no account needed)
   │  ├─ slides/                Make, edit, present and download slide decks
   │  ├─ dev/outbox/            Emails sent while developing
   │  └─ api/                   Login and submission endpoints
   ├─ components/           Reusable pieces (Wizard form, header, paper card…)
   └─ lib/                  Helpers: database, login, email, file storage, similarity check, validation
```

**The life of a paper:** `pending` → (`changes` → resubmitted as a new version → `pending`) → `published` or `rejected`.
An author can later set a published paper to `withdrawn`: the page and DOI stay, the PDF goes.

**Database upgrades** happen automatically: `db/migrations.sql` adds new tables and columns the first time the app starts, so existing data is kept.

**Main tables** (see `db/schema.sql` and `db/migrations.sql`): `users`, `sessions`, `login_codes`, `submissions`, `versions`
(one row per resubmission, nothing is overwritten), `authors`, `reviews` (every moderator decision),
`events` (history shown to students), `emails` (dev outbox).

---

## 5. What's real and what's still a placeholder

| Part | Status |
|---|---|
| Login with email code, sessions, rate limits | ✅ Works |
| Submission form, validation, PDF checks (real PDF, ≤ 20 MB) | ✅ Works |
| Versions, resubmission, withdrawal, history | ✅ Works |
| Moderation with checklist and audit trail | ✅ Works |
| Plagiarism check | ✅ Full-text against papr's library. ⚠️ Web/journal coverage needs a commercial provider (see above). |
| Emails | ✅ Sent through Resend when `RESEND_API_KEY` and `EMAIL_FROM` are set. Without them, saved to the dev outbox only. |
| DOIs | ⚠️ Demo prefix `10.99999`. After joining Crossref, put your prefix in `.env` and fill in `registerDoi()` in `src/app/moderate/actions.ts`. |
| File storage | ✅ Local `uploads` folder on your computer; private Vercel Blob store when deployed (`BLOB_READ_WRITE_TOKEN`). |
| Admin screens (add moderators, institutions) | ❌ Not built yet. For now, add a moderator with `npm run make-moderator -- name@example.com "Their Name"`. |

---

## 6. Put papr online (Vercel)

papr is ready for Vercel. On Vercel it uses:

- **Turso** for the database (cloud SQLite). The app creates all its tables itself on the first visit.
- **Vercel Blob (private)** for PDFs. Browsers upload PDFs straight to Blob, so 20 MB reports work even though Vercel limits requests to 4.5 MB.
- **Resend** to send real emails (login codes, supervisor confirmations, claim links, digests).
- **Vercel Cron** (see `vercel.json`): live Master's/PhD feeds refresh daily at 06:00 UTC, and the weekly digest goes out on Mondays at 07:00 UTC.

### Step 1: Deploy from PowerShell

```powershell
cd $HOME\papr
npm install -g vercel
vercel login
vercel link          # answer Y, pick your account, create a new project called "papr"
```

### Step 2: Add the database and file storage (in the browser)

Open your project on vercel.com, then go to the **Storage** tab:

1. **Create Database → Turso Cloud** → connect it to the papr project. This adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
2. **Create → Blob** → set access to **Private** → tick **"Add a read-write token env var"** → connect it to papr. This adds `BLOB_READ_WRITE_TOKEN`.

### Step 3: Settings → Environment Variables (Production)

| Name | Value |
|---|---|
| `SHOW_DEV_CODES` | `false` (**must** be false: otherwise anyone can log in as anyone) |
| `ADMIN_EMAILS` | your email; it becomes an admin the first time you log in |
| `CRON_SECRET` | any long random text (protects the daily/weekly jobs) |
| `RESEND_API_KEY` | from [resend.com](https://resend.com) → API Keys |
| `EMAIL_FROM` | e.g. `papr <hello@yourdomain.com>`, on a domain you verified in Resend |
| `DOI_PREFIX` | `10.99999` until you join Crossref |
| `ANTHROPIC_API_KEY` | optional, for better slide outlines |

`APP_URL` is optional: by default papr uses your Vercel production address.

### Step 4: Go live

```powershell
vercel --prod
```

Open the address it prints, log in with your `ADMIN_EMAILS` address, and you are the admin. Promote moderators and lecturers from **Admin → People**.

**About email:** until you verify a domain in Resend, Resend only lets you send to your own Resend account email (from `onboarding@resend.dev`). That's enough for you to log in and test, but students won't get codes until a domain is verified. A cheap `.com` or `.com.gh` domain works.

**Updating later:** change the code, then run `vercel --prod` again. Or push the folder to GitHub and import the repo in Vercel; every push then deploys by itself.

### Before you announce it

- Register with Ghana's **Data Protection Commission** (Data Protection Act, 2012, Act 843), since you store students' personal data. Publish a privacy policy.
- `npm run setup` and `npm run reset` only work on a local database, so they can never wipe the live one.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app for development at http://localhost:3000 |
| `npm run setup` | Create the database tables and load example data |
| `npm run reset` | Delete everything and start fresh with example data |
| `npm run make-moderator -- email "Name"` | Give an account moderator rights |
| `npm run build` | Check and build for production |
| `npm run start` | Run the production build |
