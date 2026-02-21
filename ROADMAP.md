# GlobaLeads22 — Implementation Roadmap

> Organized by difficulty. Complete each phase before moving to the next — later phases depend on earlier ones.

---

## PHASE 1 — Foundation (Easy, 1–2 days)
*These are quick wins, blockers for everything else, or security fixes. Do these first.*

### ~~1.1 Git + GitHub Setup~~ ✅ DONE
- [x] Git repo initialized, `.env.example` added, `.gitignore` fixed
- [x] All changes committed and pushed to `github.com/KoiGi01/web-lead-scoop`

### ~~1.2 Vercel Deployment + Domain~~ ✅ DONE
- [x] GitHub connected to Vercel, auto-deploy on push active
- [x] `globaleads22.com` live and pointing to Vercel
- [x] HTTPS working

### 1.3 Security Fixes
- [ ] Remove `devMode` bypass from `AppPage.tsx` (or gate it properly with `import.meta.env.DEV`)
- [ ] Audit edge functions for exposed secrets (confirm API keys are env vars only)
- [ ] Add `VITE_` prefix audit — no secret keys in frontend env vars

### 1.4 Quick UX Fixes
- [ ] Add a proper favicon (replace default Vite one)
- [ ] Update `index.html` canonical URL to `https://globaleads22.com`
- [ ] Add Open Graph image (og:image meta tag) for link previews on social/ads
- [ ] Fix any broken nav links (Footer "Changelog", "Documentation" etc. currently go nowhere)
- [ ] Add Google Analytics or Plausible snippet to `index.html` (track visitors from day 1)

---

## PHASE 2 — Database Schema (Medium, 1–2 days)
*Everything from billing to history depends on having a database. Do this before Phase 3.*

### 2.1 Supabase Tables
Create the following tables via Supabase SQL editor or migrations:

```sql
-- Users profile (extends Supabase auth.users)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text,
  plan text DEFAULT 'free',          -- 'free' | 'starter' | 'pro'
  credits_used int DEFAULT 0,
  credits_total int DEFAULT 1,       -- free = 1, starter = 40, pro = 150
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now()
)

-- Search history
searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  keyword text,
  location text,
  radius int,
  lead_count int DEFAULT 0,
  email_count int DEFAULT 0,
  whatsapp_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- Leads cache (optional, for re-downloading past searches)
leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid REFERENCES searches(id),
  business_name text,
  category text,
  address text,
  phone text,
  website text,
  emails text[],
  whatsapp text[],
  contact_page_found boolean
)
```

### 2.2 Row-Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] `profiles`: users can only read/update their own row
- [ ] `searches`: users can only read their own searches
- [ ] `leads`: users can only read leads belonging to their searches

### 2.3 Auto-create Profile on Signup
- [ ] Supabase trigger: `on auth.users insert → insert into profiles`
- [ ] Regenerate `src/integrations/supabase/types.ts` after schema is set

---

## PHASE 3 — Credits & Search History (Medium, 1–2 days)
*Wire the already-built AppSidebar and enforce usage limits.*

### 3.1 Credits Enforcement
- [ ] On app load: fetch user's `profiles` row (plan, credits_used, credits_total)
- [ ] Before search: check `credits_used < credits_total`, else show upgrade prompt
- [ ] After successful search: increment `credits_used` via Supabase update
- [ ] Display credits remaining in AppPage header or sidebar gauge

### 3.2 Search History Persistence
- [ ] After search completes: insert row into `searches` table
- [ ] Optionally insert rows into `leads` table (for re-download)
- [ ] Wire `AppSidebar` to real data: fetch user's `searches` ordered by `created_at DESC`
- [ ] "Load previous search" → restore results from `leads` table

### 3.3 Connect AppSidebar to AppPage
- [ ] Add sidebar toggle button in AppPage header
- [ ] Pass real history + credits data as props to AppSidebar
- [ ] Implement `onSelectEntry` to reload a past search's results
- [ ] Implement `onClearHistory` to delete user's searches

---

## PHASE 4 — Billing with Stripe (Hard, 2–4 days)
*The most complex phase. Depends on Phase 2 (profiles table with stripe fields).*

### 4.1 Stripe Setup
- [ ] Create Stripe account, get API keys
- [ ] Create 2 products in Stripe dashboard:
  - **Starter** — $19/month recurring
  - **Pro** — $49/month recurring
- [ ] Add Stripe keys to Vercel env vars:
  - `STRIPE_SECRET_KEY` (server-side only, in edge functions)
  - `VITE_STRIPE_PUBLISHABLE_KEY` (frontend)

### 4.2 Stripe Edge Functions (Supabase Deno)
Create new edge functions:

- [ ] **`create-checkout-session`**: Creates a Stripe Checkout session for a given plan. Returns a `checkout_url`. Redirect user to it.
- [ ] **`stripe-webhook`**: Handles Stripe events:
  - `checkout.session.completed` → update `profiles.plan`, `credits_total`, `stripe_customer_id`, `stripe_subscription_id`
  - `customer.subscription.updated` → handle plan changes/upgrades
  - `customer.subscription.deleted` → downgrade to free, reset credits
- [ ] **`create-portal-session`**: Creates a Stripe Customer Portal session so users can manage/cancel their subscription

### 4.3 Frontend Billing UI
- [ ] Pricing section "Get Started" buttons → call `create-checkout-session` → redirect to Stripe
- [ ] "Manage Subscription" button in AppPage (visible if on paid plan) → call `create-portal-session`
- [ ] Show current plan badge in AppPage header (Free / Starter / Pro)
- [ ] Show upgrade modal when user hits credit limit

### 4.4 Stripe Webhook Registration
- [ ] Register webhook endpoint URL in Stripe dashboard: `https://[supabase-project].supabase.co/functions/v1/stripe-webhook`
- [ ] Add `STRIPE_WEBHOOK_SECRET` env var in Supabase edge function settings

---

## PHASE 5 — Polish & Pre-Launch (Medium, 2–3 days)
*Make the app feel finished and professional before ads.*

### 5.1 Error Handling & UX
- [ ] Add React Error Boundary component wrapping the app
- [ ] Show friendly error messages when edge functions fail (API limits, timeouts)
- [ ] Add skeleton loading states for results table
- [ ] Add empty state illustration when no results found
- [ ] Form validation with Zod (keyword/location required, min length)
- [ ] Disable "Generate" button if already processing
- [ ] Rate-limit feedback: "You've used X of Y searches this month"

### 5.2 Mobile Responsiveness Audit
- [ ] Test `/app` page on mobile (currently desktop-focused)
- [ ] Make results table scrollable horizontally on small screens
- [ ] Ensure AuthModal works on mobile
- [ ] Test AppSidebar collapsed state on mobile

### 5.3 SEO & Metadata
- [ ] Write a proper `sitemap.xml` and `robots.txt` in `/public`
- [ ] Add structured data (JSON-LD: SoftwareApplication schema)
- [ ] Ensure all landing page sections have semantic HTML headings (h1→h2→h3)
- [ ] Submit sitemap to Google Search Console

### 5.4 Legal & Compliance
- [ ] Add a cookie consent banner (GDPR) — simple accept/decline
- [ ] Verify Privacy Policy mentions Stripe as a third-party service
- [ ] Add unsubscribe/data deletion email to Privacy Policy (`support@globaleads22.com`)
- [ ] Ensure Terms of Service covers subscription billing terms

### 5.5 Email Notifications (via Supabase or Resend)
- [ ] Welcome email on signup (use Supabase auth email templates or Resend API)
- [ ] Customize Supabase confirmation email template (brand it)
- [ ] Optional: "low credits" email when user has 2 searches remaining
- [ ] Optional: monthly usage summary email

---

## PHASE 6 — Marketing & Ads Ready (Easy-Medium, 1–2 days)
*Prep the app specifically for running paid ads and organic traffic.*

### 6.1 Landing Page Conversion Optimization
- [ ] Add a **demo video** or animated GIF to HeroSection (show the tool working)
- [ ] Add a real "Try It Free" interactive demo (no auth required, 1 pre-loaded search result)
- [ ] A/B test hero headline copy (current: "Extract Local Business Leads in Seconds")
- [ ] Add a sticky bottom CTA bar on landing page (mobile)
- [ ] Add exit-intent popup ("Wait — get 1 free search before you go")

### 6.2 Analytics & Tracking
- [ ] Set up **Google Analytics 4** with conversion events:
  - `sign_up` (on auth success)
  - `search_completed` (on results loaded)
  - `download_xlsx` (on export)
  - `upgrade_clicked` (on pricing CTA)
- [ ] Set up **Google Tag Manager** for easy ad pixel management
- [ ] Add **Facebook Pixel** + **TikTok Pixel** for retargeting ads
- [ ] Set up **Google Search Console** for globaleads22.com

### 6.3 Ad Landing Page Variants
- [ ] Create `/lp/google` — stripped landing page (no nav, focused CTA) for Google Ads
- [ ] Create `/lp/facebook` — same for Facebook/Instagram Ads
- [ ] Each LP should have a strong headline, the mockup device, 1 CTA, and social proof

### 6.4 Social Proof & Trust
- [ ] Replace placeholder testimonials with real ones (even from beta users)
- [ ] Add a "As seen on" or "Trusted by" logos bar (once you have any press/partners)
- [ ] Add a real counter (from DB) for "X leads generated" on StatsBar

---

## PHASE 7 — Growth Features (Hard, ongoing)
*Post-launch improvements to increase retention and revenue.*

### 7.1 Referral/Affiliate System
- [ ] "Refer a friend, get 5 free searches" program
- [ ] Unique referral link per user
- [ ] Track referral conversions in `profiles` table

### 7.2 API Access (Pro tier feature)
- [ ] Generate API keys for Pro users
- [ ] Document REST API endpoint (search-places + extract-contacts)
- [ ] Rate limit by API key

### 7.3 CRM Integrations
- [ ] Export to Google Sheets (one-click)
- [ ] Zapier/Make.com webhook integration
- [ ] HubSpot / Pipedrive CSV import format

### 7.4 Advanced Lead Scoring
- [ ] Score leads by: has email, has WhatsApp, has contact page, has phone
- [ ] Add "Quality" column to results table (High / Medium / Low)
- [ ] Filter/sort results by score

### 7.5 Team / Agency Plan
- [ ] Multi-seat accounts
- [ ] Shared search history within a team
- [ ] Team billing (single subscription, multiple users)

---

## Summary — Recommended Order

| # | Phase | Effort | Blocker For |
|---|-------|--------|-------------|
| 1 | Git + Vercel + Domain + Security | ~1 day | Everything |
| 2 | Database Schema (Supabase) | ~1 day | Phase 3, 4 |
| 3 | Credits + Search History | ~2 days | Phase 4, 6 |
| 4 | Stripe Billing | ~3 days | Revenue |
| 5 | Polish + Error Handling + SEO | ~2 days | Ads |
| 6 | Analytics + Ad Tracking | ~1 day | Ads |
| 7 | Growth Features | Ongoing | — |

**Total to launch-ready**: ~10–12 focused days of work.

---

*Last updated: 2026-02-21*
