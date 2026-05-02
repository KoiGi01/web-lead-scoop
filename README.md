# GlobaLeads22

GlobaLeads22 is a lead research SaaS for finding businesses by niche and country, extracting public contact details, and optionally enriching likely decision makers.

## Current Product

- Normal Search: finds businesses and extracts public website contact details.
- Search + Enrich: adds likely decision-maker contacts when available.
- Depth controls: Simple, Normal, Deep.
- Saved leads, lead archive, XLSX export.
- Credit-based billing through Stripe.
- Admin usage dashboard for internal cost accounting.

## URLs

- Marketing site: `https://www.globaleads22.com`
- App workspace: `https://app.globaleads22.com`
- Privacy: `https://www.globaleads22.com/privacy`
- Terms: `https://www.globaleads22.com/terms`

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth, Postgres, and Edge Functions
- Stripe Checkout

## Local Development

```sh
npm install
npm.cmd run dev
```

Production build:

```sh
npm.cmd run build
```

## Supabase Functions

Deploy updated functions from the repo root:

```sh
npx.cmd supabase functions deploy search-places
npx.cmd supabase functions deploy extract-contacts
npx.cmd supabase functions deploy create-checkout-session
npx.cmd supabase functions deploy stripe-webhook
```

Required function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_PLACES_API_KEY`
- `FIRECRAWL_API_KEY`
- `HUNTER_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Stripe price IDs for Starter, Growth, and Pro bundles.

## Database

Important tables:

- `user_credits`
- `search_sessions`
- `saved_leads`
- `admin_users`
- `api_usage_events`
- `credit_transactions`
- `stripe_payments`

Current accounting migration:

```text
supabase/migrations/20260502001000_add_admin_usage_accounting.sql
```

## Admin Setup

To make a user an admin, add their Supabase Auth user ID:

```sql
insert into public.admin_users (user_id, role)
values ('USER_ID_HERE', 'admin')
on conflict (user_id) do update set role = 'admin';
```

Admin users can run searches without spending credits, but provider usage is still logged.

## Roadmap

See `ROADMAP.md`.

HubSpot export is intentionally saved for later. The recommended version is OAuth-based, exports selected leads only, upserts contacts/companies, and reports exported/skipped/failed counts.
