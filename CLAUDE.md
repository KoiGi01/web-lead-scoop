# CLAUDE.md

This file gives coding agents the current operating context for GlobaLeads22.

## Project Overview

GlobaLeads22 is a lead research SaaS with:

- Public marketing site at `https://www.globaleads22.com`.
- Authenticated app at `https://app.globaleads22.com`.
- Maps-first lead discovery.
- Public website contact extraction.
- Optional decision-maker enrichment.
- Credit-based billing.
- Admin usage and cost accounting.

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

---

## Credits, Admin, And Cost Accounting

Customer-facing billing uses one currency: credits.

Admin support:

- Admin users are listed in `admin_users`.
- `useAdmin` checks whether the current user is admin.
- Admin searches display `Find leads - admin`.
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

---

## Edge Functions

Current active functions:

- `search-places`: business discovery and Google usage logging.
- `extract-contacts`: website contact extraction, enrichment, and provider usage logging.
- `create-checkout-session`: Stripe Checkout session creation.
- `stripe-webhook`: credit fulfillment, Stripe payment logging, purchase transaction logging.

Legacy or currently inactive in main flow:

- `web-search-leads`: keep in repo, but do not call from Normal/Search + Enrich.
- `plan-lead-search`: keep in repo, but keep advanced planning out of default UI.
- `analyze-lead`: legacy intelligence flow; do not assume it is part of the current simplified search UX.

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
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_GROWTH`
- `STRIPE_PRICE_PRO`

Optional cost estimate env vars:

- `GOOGLE_TEXT_SEARCH_ENTERPRISE_COST_USD`
- `FIRECRAWL_CREDIT_COST_USD`
- `HUNTER_CREDIT_COST_USD`

---

## Public Assets And SEO

- `public/landing.html`: static landing page.
- `public/llms.txt`: LLM-facing product context.
- `public/robots.txt`
- `public/sitemap.xml`
- `public/og-image.jpg`: current optimized social preview image.
- `public/og-image.png`: older PNG preview kept for compatibility.

Root and landing metadata should use friendly product wording, not provider/tool names.

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
