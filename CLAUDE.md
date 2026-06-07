# CLAUDE.md

This file gives coding agents the current operating context for GlobaLeads22.

## Project Overview

GlobaLeads22 is being reworked from a lead research SaaS into an opportunity-based AI prospecting agent. The target product helps users find prospects with visible reasons to buy.

Current product surface:

- Public marketing site at `https://www.globaleads22.com`.
- Authenticated app at `https://app.globaleads22.com`.
- Maps-first business discovery.
- Public website contact extraction.
- Optional decision-maker enrichment.
- Saved leads, pipeline, follow-ups, exports, and CRM-style organization.
- Credit-based billing.
- Admin usage and cost accounting.

Target opportunity workflow:

1. User selects the service they sell.
2. User selects a target market.
3. User selects a location.
4. The app discovers businesses.
5. The app analyzes available public business and website data.
6. The app detects visible opportunity signals.
7. The app scores each prospect by relevance to the user's service.
8. The app generates an evidence-based outreach angle.

The app should stay user-friendly. Product copy should avoid exposing provider/tooling names unless the context is technical documentation, legal policy, or internal admin/cost work.

---

## Common Commands

Run from `web-lead-scoop-main/`:

```sh
npm.cmd run dev
npm.cmd run build
npm.cmd run build:dev
npm.cmd run lint
npm.cmd run test
npm.cmd run test:watch
```

Supabase functions:

```sh
npx.cmd supabase functions deploy search-places
npx.cmd supabase functions deploy extract-contacts
npx.cmd supabase functions deploy stripe-webhook
npx.cmd supabase functions deploy create-checkout-session
```

Vercel deploys from `master`.

---

## Routing And Domains

`vercel.json` routes:

- `app.globaleads22.com/*` to the React app (`index.html`).
- `/app`, `/privacy`, `/terms` to the React app.
- `/` to `public/landing.html`.

If the React app handles `/`, `src/pages/Index.tsx` embeds `/landing.html` in an iframe so the user keeps the root URL instead of being redirected to `/landing.html`.

Do not break `app.globaleads22.com`; it must always render `AppPage`.

---

## Current Search Workflow

Main UI: `src/components/landing/LeadGeneratorSection.tsx`.

The current implementation is lead-oriented. It discovers businesses, extracts public contact data, ranks leads, and saves/export results. The planned rework is opportunity-oriented: service selection, opportunity signals, evidence, AI opportunity scoring, and outreach angles should be added in phases without breaking the current search, credits, save, export, and CRM flows.

User fields:

- Industry / niche, required.
- Country, required.
- Language, optional.
- Depth: Simple, Normal, Deep.
- Mode: Normal or Enrich.
- Filters: Has website, Public email preferred.

Depth config:

- Simple: 5 credits normal, 10 enrich.
- Normal: 10 credits normal, 20 enrich.
- Deep: 20 credits normal, 40 enrich.

Normal Search:

1. `search-places` discovers businesses.
2. `extract-contacts` scrapes accepted business websites.
3. Results are ranked and saved.

Search + Enrich:

1. Same as Normal Search.
2. `extract-contacts` also enriches contacts when a valid business domain exists.
3. Contacts are ranked as likely decision makers.

Important behavior:

- Do not use `web-search-leads` in the current broad search flow.
- `Public email preferred` ranks leads higher; it does not hide no-email leads.
- Use "likely decision maker", never guaranteed decision maker.
- Keep existing `emails` field for backward compatibility.
- Store enriched contacts in `saved_leads.contacts`.

---

## Target Rework Direction

New positioning:

> GlobaLeads22 helps users find prospects with visible reasons to buy.

The product should evolve toward an opportunity-based prospecting agent for freelancers, consultants, small agencies, web designers, SEO freelancers, AI automation agencies, and B2B service providers.

Planned user workflow:

1. Choose what service the user sells, such as web design, SEO, AI automation, appointment booking automation, social media marketing, reputation management, paid ads, CRM setup, or lead generation.
2. Choose the target market, such as dentists, med spas, real estate agencies, roofing companies, restaurants, clinics, law firms, gyms, or salons.
3. Choose the location.
4. Discover businesses.
5. Analyze public business data, websites, contact pages, team/about pages, social links, and visible conversion paths.
6. Detect opportunity signals, such as outdated website, no online booking, weak local visibility, low review count, no clear CTA, no contact form, no WhatsApp link, slow or broken site, no social links, weak branding, or missing business info.
7. Score prospects based on service relevance and evidence strength.
8. Generate a short explanation, outreach angle, and optional first-message idea.
9. Display results as opportunities, not just raw leads.

Implementation should be phased:

- Phase 1: Reframe UI language.
- Phase 2: Add service selection.
- Phase 3: Add opportunity signal selection.
- Phase 4: Add rule-based signal detection.
- Phase 5: Redesign result cards around opportunity signals.
- Phase 6: Add AI opportunity scoring and outreach angles.
- Phase 7: Update exports.
- Phase 8: Add cost controls and caching.
- Phase 9: Make the workflow feel like an agent.

---

## Decision-Maker Contacts

Contact shape:

- `email`
- `firstName`
- `lastName`
- `fullName`
- `title`
- `department`
- `seniority`
- `linkedinUrl`
- `confidence`
- `source`
- `decisionMakerScore`
- `decisionMakerReason`

Ranking rules are deterministic and industry-aware. Default highest priority is CEO/owner/founder, then industry-specific roles.

Decision-maker data is only one part of the target opportunity score. A strong opportunity should combine company identity, person/contact evidence when available, public contact data, visible opportunity signals, service relevance, and evidence-backed reasoning.

---

## Credits, Admin, And Cost Accounting

Customer-facing billing uses one currency: credits.

Admin support:

- Admin users are listed in `admin_users`.
- `useAdmin` checks whether the current user is admin.
- Admin searches display `Find opportunities - admin`.
- Admin searches do not deduct customer credits.
- Admin searches still create usage/cost rows.

Accounting tables:

- `api_usage_events`
- `credit_transactions`
- `stripe_payments`
- extra columns on `search_sessions`

Admin dashboard:

- `src/components/app/AdminDashboard.tsx`
- Shows searches, credits sold/spent/refunded, estimated vendor COGS, provider usage, and search economics.

Migration:

- `supabase/migrations/20260502001000_add_admin_usage_accounting.sql`

Keep provider-cost estimates configurable by env var where possible.

---

## Supabase Schema Notes

Important tables:

- `user_profiles`
- `user_credits`
- `admin_users`
- `search_sessions`
- `saved_leads`
- `api_usage_events`
- `credit_transactions`
- `stripe_payments`
- `domain_intelligence`

`src/integrations/supabase/types.ts` is generated in principle, but this repo has manual updates. If regenerating types, verify custom accounting/contact types remain present.

`saved_leads.intelligence` (JSON) holds opportunity data. Rule-based detection writes `{ detectedIssues: string[], signals: { version, service, detected[], website } }` via `buildLeadIntelligence` on save (new saves only — no backfill). The Phase 6 AI-scoring fields (`opportunityScore`, `positioning`, `suggestedPitchAngle`, `outreachHook`) share this column but are intentionally left unwritten by rule-based detection to avoid collision.

---

## Opportunity Signal Detection

Phase 4 rule-based detection is shipped (in-memory + persisted; not yet rendered on cards — that is Phase 5). Key files:

- `supabase/functions/_shared/websiteSignals.ts`: gathers website facts from scraped HTML.
- `src/lib/opportunitySignals.ts`: the 8 signal keys, labels, and service-aware recommendations.
- `src/lib/detectOpportunitySignals.ts`: pure detector. Interprets `websiteSignals` + Places `rating`/`reviewCount` into the 8 signals, **emitting only the user's selected keys**, each with confidence + evidence. Thresholds are named constants (`LOW_REVIEW_COUNT = 18`, etc.). `EnrichmentContext` has an unused `pageSpeed` slot reserved for future async enrichers.
- `src/lib/leadIntelligence.ts`: maps detector output into the `saved_leads.intelligence` shape for persistence.

Detection is deterministic and free (derived from data already fetched). External/paid enrichment (PageSpeed, etc.) is deferred to Phase 6/8. SEMrush-class APIs are not free and are not used.

**Known gap (2026-06-07): the opportunity-signal selector is NOT wired into the UI.** `toggleOpportunitySignal` and `opportunitySignalOptions` exist in `LeadGeneratorSection.tsx` but are never rendered. Signals are only ever auto-derived from the chosen service (`selectService` → `getServiceRecommendedSignalKeys(service).slice(0,3)`), and only when opportunity mode is ON (`src/lib/opportunityMode.ts`: `VITE_ENABLE_OPPORTUNITY_MODE=true`, `?opportunity=1`, or `localStorage['globaleads-opportunity-mode']='true'`). With the flag OFF, the service picker still renders in manual mode but no signals are attached → the detector receives an empty key list → emits nothing → `saved_leads.intelligence` saves as `null`. This is really an unfinished Phase 3 item, and it means the live detection→persist chain is **still UNVERIFIED end-to-end in production** (see `REWORK_PLAN.md` Phase 4 findings). The only on-screen signal view today is the read-only "The agent will look for…" plan preview.

---

## Edge Functions

Current active functions:

- `search-places`: business discovery and Google usage logging. Returns `rating` and `reviewCount` per business (free; the field mask is already Enterprise-tier).
- `extract-contacts`: website contact extraction, enrichment, and provider usage logging. Also returns a structured `websiteSignals` object built from the already-scraped homepage + contact-page HTML (no extra API calls), via the shared `supabase/functions/_shared/websiteSignals.ts` builder. **Cost-accounting gap (2026-06-07): in Enrich mode it also calls `discoverPublicProfiles` (5 Firecrawl `/v1/search` queries per business), which does NOT call `logUsage` — so those Firecrawl credits never reach `api_usage_events`. Admin COGS therefore UNDERSTATES Firecrawl spend in Enrich mode (a real Simple+Enrich search logs ~30 scrape credits but burns ~50–70 real Firecrawl credits). Fix: add `logUsage` to `discoverPublicProfiles`.**
- `create-checkout-session`: Stripe Checkout session creation.
- `stripe-webhook`: credit fulfillment, Stripe payment logging, purchase transaction logging.

Shared edge code:

- `supabase/functions/_shared/websiteSignals.ts`: pure, dependency-free fact builder (`buildWebsiteSignals`). No Deno globals, so it is also imported and unit-tested from `src/`.

Legacy or currently inactive in main flow:

- `web-search-leads`: keep in repo, but do not call from Normal/Search + Enrich.
- `plan-lead-search`: keep in repo, but keep advanced planning out of default UI.
- `analyze-lead`: currently not part of the simplified default search UX, but it is a candidate for reuse/refactor into opportunity scoring because it already contains intelligence, opportunity-score, and domain-caching concepts.

---

## Environment Variables

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Supabase function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_PLACES_API_KEY`
- `FIRECRAWL_API_KEY`
- `HUNTER_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SUBSCRIPTION_PRICE_STARTER`
- `STRIPE_SUBSCRIPTION_PRICE_GROWTH`
- `STRIPE_SUBSCRIPTION_PRICE_PRO`
- `STRIPE_TOPUP_PRICE_STARTER`
- `STRIPE_TOPUP_PRICE_GROWTH`
- `STRIPE_TOPUP_PRICE_PRO`
- `STRIPE_FOUNDER_COUPON_ID`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_GROWTH`
- `STRIPE_PRICE_PRO`

Optional cost estimate env vars:

- `GOOGLE_TEXT_SEARCH_ENTERPRISE_COST_USD`
- `FIRECRAWL_CREDIT_COST_USD`
- `HUNTER_CREDIT_COST_USD`

Verified vendor pricing vs the code defaults (2026-06-07):

- `FIRECRAWL_CREDIT_COST_USD` default `0.00083` — **accurate** (Firecrawl Standard, $83 / 100k pages = 1 credit/page; cheaper at higher tiers). Firecrawl credits reset monthly and do not roll over.
- `GOOGLE_TEXT_SEARCH_ENTERPRISE_COST_USD` default `0.035` — **accurate** (Text Search Enterprise ~$35/1k; first 1,000 calls/month free). Billed per `search-places` call, not per lead; a search makes several (pagination/shards).
- `HUNTER_CREDIT_COST_USD` default `0.034` — **OVERSTATES reality.** Hunter list is ~$0.0149–0.0245/credit, and Hunter only bills when an email is found (a real search billed 6 of 10 domain lookups). Real Hunter COGS is lower than the admin dashboard shows.

AI providers (both legacy, not in the main flow, and NOT cost-logged): `analyze-lead` uses Claude Haiku 4.5 ($1/1M input, $5/1M output); `plan-lead-search` uses Gemini 2.5 Flash. Neither writes `api_usage_events`. **Phase 6 must add an AI cost constant + usage logging before AI scoring ships**, or AI spend will be invisible in admin COGS.

Measured per-lead vendor COGS (2026-06-07): Normal search ~$0.005–0.01/lead; Enriched ~$0.03–0.05/lead (Hunter-dominated). Opportunity signal detection adds $0 (derived from already-fetched data). Rough capacity: 6,500 Firecrawl credits ≈ ~90–100 Simple+Enrich searches or ~215 Simple+Normal searches per month. Enrich roughly doubles Firecrawl burn and accounts for all Hunter burn.

---

## Public Assets And SEO

- `public/landing.html`: static landing page.
- `public/llms.txt`: LLM-facing product context.
- `public/robots.txt`
- `public/sitemap.xml`
- `public/og-image.jpg`: current optimized social preview image.
- `public/og-image.png`: older PNG preview kept for compatibility.

Root and landing metadata should use friendly product wording, not provider/tool names.

Public copy should avoid:

- scraper
- scraping
- harvesting
- guaranteed emails
- guaranteed decision makers
- private data
- hidden data extraction
- spam tool

Preferred public wording:

- opportunity signals
- public contact data
- ranked prospects
- likely decision maker
- outreach angle
- prospecting workspace
- visible reasons to buy
- evidence-based lead research

---

## Future HubSpot Export

Native HubSpot export is planned but not implemented.

Recommended v1:

- Add "Connect HubSpot" OAuth flow.
- Store tokens securely in Supabase.
- Export selected leads only.
- Upsert contacts by email.
- Upsert companies by domain.
- Associate contacts with companies.
- Show exported/skipped/failed counts.

Do not implement raw user-entered API keys for production.

---

## Coding Conventions

- TypeScript in `src/`.
- Prefer existing component and styling patterns.
- Keep UI copy compact and non-technical.
- Do not expose provider internals in normal user UI.
- Preserve app/landing domain split.
- Verify with `npm.cmd run build` before committing.
