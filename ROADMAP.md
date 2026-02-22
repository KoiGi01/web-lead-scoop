# GlobaLeads22 — Implementation Roadmap

> Organized by difficulty. Complete each phase before moving to the next — later phases depend on earlier ones.

---

## ✅ COMPLETED PHASES

### ~~Phase 1: Foundation~~ ✅ DONE
- [x] Git + GitHub setup (public repo at github.com/KoiGi01/web-lead-scoop)
- [x] Vercel deployment + auto-deploy on push
- [x] `globaleads22.com` live with HTTPS
- [x] Industrial skeuomorphism design system fully applied
- [x] Bitcoin DeFi color palette (#030304, #F7931A, etc.) across all pages

### ~~Phase 2: Database Schema~~ ✅ DONE
- [x] Supabase tables created: `user_credits`, `search_sessions`, `saved_leads`
- [x] Row-level security (RLS) enabled on all tables
- [x] Auto-create credits (50 free) on signup via trigger
- [x] TypeScript types regenerated for Supabase integration

### ~~Phase 3: Credits & Search History~~ ✅ DONE
- [x] Credits enforcement: 10 credits per search, 1 per Intelligence unlock
- [x] Search history persistence with sidebar integration
- [x] AppSidebar fully wired with collapsible navigation, tabs, stats
- [x] Sidebar history clickable — loads previous searches into form
- [x] Credits display with progress bar in sidebar
- [x] Fire-and-forget async database saves (non-blocking)
- [x] Intelligence scoring system with Claude Haiku 4.5 analysis
- [x] Lead persistence across sessions

### ~~Phase 3.5: Lead Generation Enhancements~~ ✅ DONE
- [x] LinkedIn profile extraction from websites
- [x] LinkedIn column in results table with clickable links
- [x] Filter & sort controls (by Name, Emails, Score)
- [x] Email-only filter toggle
- [x] Unlock All Intelligence button with cost confirmation
- [x] Batch intelligence unlock with 300ms delays
- [x] Firecrawl cost optimization: limited to top 10 websites per search (80% savings)

---

## PHASE 4 — Pre-Launch Polish (Medium, 2–3 days)
*Security, UX, and polish to prepare for ads and launch.*

### ✅ 4.1 Security Fixes
- [x] Remove `devMode` bypass from `AppPage.tsx` (gate with `import.meta.env.DEV`)
- [x] Audit edge functions for exposed secrets (confirm all API keys are env vars only)
- [x] Add `VITE_` prefix audit — no secret keys in frontend env vars
- [x] Ensure Supabase RLS policies block unauthorized access
- [x] Test auth redirects work correctly on production domain
- [x] Created comprehensive SECURITY_AUDIT.md documenting all findings

### ✅ 4.2 Quick UX Fixes
- [x] Add a proper favicon (already configured with manifest)
- [x] Update `index.html` canonical URL to `https://globaleads22.com`
- [x] Add Open Graph image (og:image meta tag) for link previews
- [x] Fix any broken nav links in footer
- [x] Add Google Analytics 4 snippet to `index.html`

### 4.3 Error Handling & UX
- [ ] Add React Error Boundary component wrapping app
- [ ] Friendly error messages when edge functions fail (API limits, timeouts)
- [ ] Skeleton loading states for results table
- [ ] Empty state illustration when no results found
- [ ] Form validation with Zod (keyword/location required, min length)
- [ ] Disable "Generate" button while processing

### 4.4 Mobile Responsiveness Audit
- [ ] Test `/app` page on mobile devices
- [ ] Make results table responsive (card layout on small screens)
- [ ] Ensure AuthModal works on mobile
- [ ] Test AppSidebar collapsed state on mobile
- [ ] Fix any horizontal scrolling issues

---

## PHASE 5 — Billing with Stripe (Hard, 3–4 days)
*Payment processing to unlock revenue. Depends on working credits system (Phase 3).*

### 5.1 Stripe Setup
- [ ] Create Stripe account, get API keys
- [ ] Create 2 products in Stripe dashboard:
  - **Starter** — $19/month (100 credits/month = 10 searches)
  - **Pro** — $49/month (300 credits/month = 30 searches)
- [ ] Add Stripe keys to Vercel/Supabase env vars:
  - `STRIPE_SECRET_KEY` (server-side only, in edge functions)
  - `VITE_STRIPE_PUBLISHABLE_KEY` (frontend)

### 5.2 Stripe Edge Functions (Supabase Deno)
Create new edge functions:

- [ ] **`create-checkout-session`**: Stripe Checkout session for a given plan. Returns `checkout_url`.
- [ ] **`stripe-webhook`**: Handles Stripe events:
  - `checkout.session.completed` → update `user_credits.plan`, `balance`, store customer/subscription IDs
  - `customer.subscription.updated` → handle plan changes
  - `customer.subscription.deleted` → downgrade to free, reset to 50 credits
- [ ] **`create-portal-session`**: Stripe Customer Portal for subscription management

### 5.3 Frontend Billing UI
- [ ] Pricing section buttons → call `create-checkout-session` → redirect to Stripe
- [ ] "Manage Subscription" button in AppPage header (visible if on paid plan)
- [ ] Show current plan badge (Free / Starter / Pro) in header
- [ ] Show upgrade modal when user hits credit limit
- [ ] Display subscription status in AppPage

### 5.4 Stripe Webhook Registration
- [ ] Register webhook in Stripe dashboard: `https://[supabase-project].supabase.co/functions/v1/stripe-webhook`
- [ ] Add `STRIPE_WEBHOOK_SECRET` env var in Supabase

---

## PHASE 6 — SEO, Legal & Compliance (Easy-Medium, 2 days)
*Make the site search-engine and legally ready.*

### 6.1 SEO & Metadata
- [ ] Write proper `sitemap.xml` and `robots.txt` in `/public`
- [ ] Add structured data (JSON-LD: SoftwareApplication schema)
- [ ] Ensure all landing page sections have semantic HTML headings (h1→h2→h3)
- [ ] Submit sitemap to Google Search Console
- [ ] Check Core Web Vitals via PageSpeed Insights
- [ ] Optimize image sizes/formats (WebP)

### 6.2 Legal & Compliance
- [ ] Add cookie consent banner (GDPR) — accept/decline/preferences
- [ ] Verify Privacy Policy mentions Stripe as payment processor
- [ ] Add data deletion email to Privacy Policy (`support@globaleads22.com`)
- [ ] Ensure Terms of Service covers:
  - Subscription auto-renewal and cancellation
  - Data scraping terms (respect robots.txt, usage limits)
  - User's responsibility for compliance with local laws
  - Limitation of liability

### 6.3 Email Notifications (via Resend or Supabase)
- [ ] Welcome email on signup (branded, not default)
- [ ] Email confirmation template (brand it)
- [ ] Optional: "low credits" email (5 searches remaining)
- [ ] Optional: monthly usage summary email

---

## PHASE 7 — Ads & Conversion Optimization (Easy-Medium, 2 days)
*Prepare for paid traffic and optimize for conversions.*

### 7.1 Analytics & Tracking
- [ ] Set up **Google Analytics 4** with conversion events:
  - `sign_up` → on auth success
  - `search_completed` → on results loaded
  - `download_xlsx` → on export
  - `upgrade_clicked` → on pricing CTA
  - `intelligence_unlocked` → on Intelligence purchase
- [ ] Set up **Google Tag Manager** for pixel management
- [ ] Add **Facebook Pixel** for retargeting + custom audiences
- [ ] Add **TikTok Pixel** for retargeting
- [ ] Set up **Google Search Console** + verify domain ownership

### 7.2 Landing Page Optimization
- [ ] Add demo video or GIF showing tool in action
- [ ] Add interactive demo (no auth required, pre-loaded results)
- [ ] A/B test hero headline copy
- [ ] Add sticky bottom CTA bar (mobile)
- [ ] Add exit-intent popup ("Get 50 free credits before you go")
- [ ] Replace placeholder testimonials with real beta user feedback
- [ ] Add live counter for "X leads extracted by GlobaLeads22 users"

### 7.3 Ad Landing Page Variants
- [ ] Create `/lp/google` — minimal design, focused on lead magnet (1 search free)
- [ ] Create `/lp/facebook` — social proof focused, testimonials
- [ ] Create `/lp/linkedin` — B2B/professional positioning
- [ ] Each should have strong headline, mockup, 1 CTA, social proof

### 7.4 Social Proof & Trust
- [ ] Collect real testimonials from beta/early users
- [ ] Add "Trusted by" logos (even small indie companies count)
- [ ] Add social links (Twitter, LinkedIn) to footer
- [ ] Display real-time stats: "X leads extracted this week"

---

## PHASE 8 — Lead Management (Medium, 2–3 days)
*Enable users to track and manage leads after discovery.*

### 8.1 Lead Status Tracking
- [ ] Add lead status fields: `status` (contacted, qualified, rejected, follow-up) to `saved_leads` table
- [ ] Add `last_contacted` timestamp and `notes` field to `saved_leads`
- [ ] Add status badge to results table (colored: green/yellow/red)
- [ ] Add status filter to results (show only "follow-up needed", etc.)
- [ ] Add "Mark as contacted" button on each lead row

### 8.2 Lead Notes & Comments
- [ ] Modal to add/edit notes on individual leads
- [ ] Display notes in collapsed section under lead
- [ ] Search/filter leads by note keywords
- [ ] Timestamp notes (who wrote it, when)

### 8.3 Lead Templates & Outreach
- [ ] Create email template builder (simple text with placeholders: {name}, {company}, etc.)
- [ ] Save/reuse templates across searches
- [ ] One-click copy template with substitutions filled in
- [ ] Track which leads were sent which templates (for follow-up)

---

## PHASE 9 — Growth & Monetization Features (Hard, ongoing)
*Post-launch improvements to increase retention and revenue.*

### 9.1 Lead Export & Integrations
- [ ] Export to Google Sheets (one-click, uses Sheets API)
- [ ] Export to CSV with all fields (emails, LinkedIn, notes, status)
- [ ] Zapier/Make.com webhook (trigger on search complete)
- [ ] HubSpot/Pipedrive sync via CSV template
- [ ] (Future) Native Slack integration for team notifications

### 9.2 Referral/Affiliate System
- [ ] "Refer a friend, get 10 free searches" program
- [ ] Unique referral link per user (stored in `user_credits` table)
- [ ] Track referral clicks and conversions
- [ ] Show referral stats in AppPage

### 9.3 API Access (Pro tier feature)
- [ ] Generate API keys for Pro/Enterprise users
- [ ] REST API endpoint for `search-places` + `extract-contacts`
- [ ] Rate limit by API key (e.g., 100 requests/day)
- [ ] API documentation (SwaggerUI or Postman)
- [ ] Webhook support for async search results

### 9.4 Team / Agency Plan
- [ ] Multi-seat accounts (e.g., 3 users, 1 subscription)
- [ ] Shared search history within team
- [ ] Team billing (single invoice, multiple users)
- [ ] Role-based access (admin, member, viewer)
- [ ] Audit log for team activities

### 9.5 Advanced Features
- [ ] Domain reputation API integration (Majestic, Semrush, etc.)
- [ ] Competitor lead discovery (find leads using competitor's products)
- [ ] Bulk lead enrichment via Hunter.io or Apollo API (Pro tier add-on)
- [ ] Lead quality scoring refinement (based on user feedback)

---

## Summary — Recommended Order

| # | Phase | Status | Effort | Blocker For |
|---|-------|--------|--------|-------------|
| ✅ | 1–3 | **DONE** | — | Everything else |
| ✅ | **4.1–4.2** | **DONE** | **~1 day** | Phase 4.3–4.4 |
| **NEXT** | **4.3–4.4** | **In Progress** | **~1 day** | Phase 5 |
| 5 | Stripe Billing | Pending | ~3 days | Revenue |
| 6 | SEO, Legal, Email | Pending | ~2 days | Launch |
| 7 | Ads & Conversion Optimization | Pending | ~2 days | Paid traffic |
| 8 | Lead Management | Pending | ~2–3 days | Retention |
| 9 | Growth Features | Pending | Ongoing | Revenue growth |

**Total to MVP launch-ready**: ~3–4 focused days (Phases 4.3–4.4, then 5–6).
**Total to revenue-ready**: ~7–8 focused days (Phases 4–7).
**Total to full feature parity**: ~12–14 days + ongoing.

---

## What's Launching First?

**MVP (Phases 1–4)** — Discovery, Intelligence, Export
- Search Google Maps + web for leads
- Extract emails, WhatsApp, LinkedIn profiles
- Score leads with Intelligence (AI analysis)
- Filter, sort, bulk unlock intelligence
- Export to XLSX
- Free tier: 50 credits (5 searches)
- Coming soon: Stripe billing

**Post-MVP (Phases 5–9)** — Management, Monetization, Growth
- Lead status tracking, notes, templates
- CRM integrations (Zapier, HubSpot, Pipedrive)
- Team accounts and API access
- Referral program
- Advanced enrichment (Hunter.io, Apollo integration)

---

*Last updated: 2026-02-21*
*Next milestone: Phase 4 (Security + UX Polish) → then Stripe billing*
