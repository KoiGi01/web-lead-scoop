# GlobaLeads22 Roadmap

Last updated: 2026-05-02

GlobaLeads22 is currently a Maps-first lead research app with two search modes:

- Normal Search: business discovery plus public website contact extraction.
- Search + Enrich: Normal Search plus likely decision-maker enrichment.

The current launch focus is tester readiness, cost observability, and clean lead export.

---

## Current State

### Completed

- Custom logo, favicon, and social sharing preview image.
- Root domain landing page available at `https://www.globaleads22.com`.
- Authenticated app available at `https://app.globaleads22.com`.
- Simplified search UI with one primary workflow.
- Depth-based search pricing:
  - Normal Search: Simple 5, Normal 10, Deep 20 credits.
  - Search + Enrich: Simple 10, Normal 20, Deep 40 credits.
- Results shown as cleaner lead cards with website, email, phone, and likely decision-maker badges.
- Lead archive and XLSX export include likely decision-maker fields.
- `saved_leads.contacts` JSON storage for enriched contacts.
- Admin role support through `admin_users`.
- Admin searches do not spend customer credits.
- Provider usage, credit transactions, Stripe payments, and estimated COGS are logged for internal accounting.
- Admin Usage dashboard for search economics and provider usage.
- `llms.txt`, `robots.txt`, `sitemap.xml`, Open Graph, and Twitter preview metadata.
- Stripe one-time credit packs and webhook credit fulfillment.

### Current Search Workflow

1. User enters industry/niche, country, optional language, filters, depth, and mode.
2. App discovers businesses from trusted local business listings.
3. App scrapes accepted business websites for public contact details.
4. If Enrich is enabled, app looks for named contacts on valid company domains.
5. Leads are ranked with likely decision makers first, then public emails, then website-only leads.
6. Results can be saved, archived, copied, or exported to XLSX.

---

## Pre-Tester Launch Checklist

### Required

- [ ] Deploy latest `master` frontend.
- [ ] Redeploy Supabase functions:
  - `search-places`
  - `extract-contacts`
  - `stripe-webhook`
- [ ] Confirm Supabase secrets exist:
  - `GOOGLE_PLACES_API_KEY`
  - `FIRECRAWL_API_KEY`
  - `HUNTER_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - Stripe price IDs
- [ ] Confirm admin user exists in `admin_users`.
- [ ] Run one Normal Simple search as a customer.
- [ ] Run one Enrich Simple search as a customer.
- [ ] Run one admin search and confirm no credit deduction.
- [ ] Confirm rows appear in `api_usage_events`, `credit_transactions`, and `search_sessions`.
- [ ] Confirm Admin Usage dashboard totals populate.
- [ ] Test one Stripe checkout in live or test mode and confirm credits are added.

### Recommended

- [ ] Set provider budget alerts in Google Cloud, Firecrawl, Hunter, Supabase, and Stripe.
- [ ] Add a short tester script with two example searches.
- [ ] Ask testers to report bad leads, wrong geography, missing emails, slow searches, and confusing UI moments.
- [ ] Re-scrape link previews after deploy using social preview/debugger tools.

---

## Near-Term Roadmap

### 1. Tester Launch Hardening

- [ ] Add friendlier failure messages for API limits, empty results, and timeouts.
- [ ] Improve empty states with one clear next action.
- [ ] Add a visible warning when Enrich finds no named contacts.
- [ ] Add better mobile QA for result cards and export controls.
- [ ] Add event tracking for:
  - search started
  - search completed
  - search failed
  - XLSX exported
  - credits purchased
  - admin search run

### 2. Cost And Quality Monitoring

- [ ] Add dashboard filters by date, user, mode, depth, and provider.
- [ ] Add high-cost job warnings.
- [ ] Add per-search COGS and gross-margin estimates.
- [ ] Add p50/p90/p99 cost reporting by mode and depth.
- [ ] Reprice credits after 200-500 real tester searches.
- [ ] Add quality feedback on each lead: good, bad, duplicate, wrong country, no contact.

### 3. Lead Management

- [ ] Add lead status: new, contacted, qualified, rejected, follow-up.
- [ ] Add notes to saved leads.
- [ ] Add filters in Lead Archive.
- [ ] Add bulk actions in Lead Archive.
- [ ] Add duplicate detection across saved leads.

### 4. Export And Integrations

- [x] XLSX export.
- [ ] CSV export.
- [ ] Google Sheets export.
- [ ] Webhook export for Zapier/Make.
- [ ] HubSpot export, saved for later:
  - OAuth connection.
  - Export selected leads only.
  - Upsert company by domain.
  - Upsert contact by email.
  - Associate contact with company.
  - Show exported/skipped/failed counts.
- [ ] Pipedrive export after HubSpot is stable.

### 5. Landing Page And Conversion

- [ ] Update landing page copy to fully match the simplified product.
- [ ] Remove old AI-scoring language from marketing sections if no longer active.
- [ ] Add a short product demo GIF/video.
- [ ] Add tester testimonials after beta feedback.
- [ ] Verify Terms and Privacy match actual providers and data flow.

---

## Later Roadmap

- Team accounts and shared lead archives.
- API access for higher-tier users.
- Saved search templates.
- Scheduled recurring searches.
- Outreach template builder.
- Referral or affiliate program.
- Advanced CRM integrations.

---

## Current Product Principles

- Keep the UI simple: one primary search flow, few controls, no technical clutter.
- Do not promise guaranteed emails or guaranteed decision makers.
- Use "likely decision maker" language.
- Keep provider costs invisible to users but highly visible internally.
- Admin/internal searches should be free to the admin user but never invisible in cost accounting.
