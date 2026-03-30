# Ripa Elevate

Adaptive assessment platform for middle school students, including those with IEPs and different learning needs.

---

## Quick Start

### 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `ripa-elevate`
3. Save the database password somewhere safe
4. Once created → **Settings → API**
5. Copy your **Project URL** and **anon public key**

### 2. Set your credentials

Open `js/supabase.js` and replace:

```js
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY_HERE';
```

### 3. Run the database schema

1. In your Supabase project → **SQL Editor**
2. Open `sql/schema.sql`
3. Paste the entire contents and click **Run**
4. All tables, security policies, and triggers are created

### 4. Set up Stripe (payments)

1. Go to [stripe.com](https://stripe.com) → Create account
2. **Developers → API Keys** → copy your **Publishable key** (`pk_test_...`)
3. Open `js/payments.js` and replace:

```js
const STRIPE_KEY = 'pk_test_YOUR_KEY_HERE';
```

### 5. Deploy

Drag the entire `ripa-elevate/` folder into [Netlify](https://netlify.com) or [Vercel](https://vercel.com).

Both are free for this scale. No build step needed — this is static HTML.

---

## Make yourself admin

1. Sign up at `/app/signup.html` using your real email
2. Go back to Supabase → **SQL Editor**
3. Scroll to the bottom of `sql/schema.sql`
4. Uncomment the `UPDATE profiles` block
5. Replace the email addresses with yours
6. Run that block

Both founders can be admins. Admin pages live at `/admin/`.

---

## File structure

```
ripa-elevate/
├── index.html               Homepage
├── how-it-works.html        Platform overview
├── for-parents.html         Parent landing + pricing
├── questions.html           Public question bank browser
├── word-bank.html           Word bank search
├── dashboard.html           Dashboard preview (marketing)
├── about.html               Founders story
├── contact.html             Contact + demo request
│
├── app/
│   ├── login.html           Parent login
│   ├── signup.html          Parent signup
│   ├── parent-dashboard.html  Parent home
│   ├── child-select.html    Pick which child
│   ├── exam-start.html      Category + level selection
│   ├── exam.html            Live exam
│   ├── exam-complete.html   Completion screen
│   ├── report.html          Full results report
│   └── account.html         Account settings
│
├── admin/
│   ├── index.html           Admin login
│   ├── dashboard.html       Real-time overview
│   ├── students.html        All students
│   ├── student-detail.html  Individual student
│   ├── leads.html           Contact submissions
│   ├── revenue.html         Stripe payments
│   └── questions-mgr.html   Add/edit questions
│
├── css/
│   ├── base.css             Variables, reset, typography
│   ├── nav.css              Navigation
│   ├── components.css       Shared components
│   ├── home.css             Homepage
│   ├── parents.css          For-parents page
│   ├── exam.css             Exam interface
│   ├── dashboard.css        Dashboard pages
│   ├── report.css           Report pages
│   └── admin.css            Admin pages
│
├── js/
│   ├── supabase.js          DB client ← PUT YOUR KEYS HERE
│   ├── auth.js              Login/signup/session
│   ├── nav.js               Navigation behavior
│   ├── exam-engine.js       Adaptive exam logic
│   ├── results.js           Results calculation
│   ├── report-render.js     Report rendering
│   ├── pdf-export.js        PDF generation
│   ├── payments.js          Stripe checkout
│   ├── parent-dashboard.js  Parent dashboard logic
│   ├── admin.js             Admin dashboard logic
│   ├── speech.js            Text-to-speech
│   ├── wordbank.js          Word bank search
│   └── questions-browser.js Question bank browser
│
├── data/
│   ├── questions.json       Full question bank (200+ questions)
│   └── wordbank.json        Word bank (300+ terms)
│
└── sql/
    └── schema.sql           Paste into Supabase SQL editor
```

---

## Credentials checklist

| Item | File | What to replace |
|------|------|-----------------|
| Supabase URL | `js/supabase.js` | `YOUR_PROJECT_ID` |
| Supabase anon key | `js/supabase.js` | `YOUR_ANON_PUBLIC_KEY_HERE` |
| Stripe publishable key | `js/payments.js` | `pk_test_YOUR_KEY_HERE` |
| Admin emails | `sql/schema.sql` | Uncomment + add your emails |

---

## 30-day retake policy

Enforced automatically. When a parent tries to start an assessment for a category their child already completed, the platform checks `assessments.completed_at`. If fewer than 30 days have passed, the Start button is disabled and shows how many days are left.

No manual action needed — it's built into `js/exam-engine.js` and the parent dashboard.

---

## Adding new questions

Two ways:

**Option A — Admin dashboard** (no code)
Go to `/admin/questions-mgr.html`, fill in the form, click Add. The question is saved to `questions.json` via the admin interface.

**Option B — Edit the file directly**
Open `data/questions.json`. Each question follows this structure:

```json
{
  "id": "m1_11",
  "q": "Your question text here. Use <mark>bold</mark> for key terms.",
  "opts": ["Option A", "Option B", "Option C", "Option D"],
  "ans": 1,
  "hint": "A short hint shown when the student clicks the hint button."
}
```

`ans` is the index of the correct option (0 = A, 1 = B, 2 = C, 3 = D).

Add the question object to the correct category and level array.

---

## Tech stack

| Layer | Tool |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS |
| Database | Supabase (Postgres + Auth + RLS) |
| Payments | Stripe Checkout |
| PDF export | jsPDF (CDN) |
| Speech | Web Speech API (built into browsers, free) |
| Hosting | Netlify or Vercel (free tier) |
| Fonts | Google Fonts — Instrument Serif + Geist |

No build tools. No npm. No framework. Drop the folder into Netlify and it works.

---

## Questions

Contact: see `/contact.html` on the live site.
