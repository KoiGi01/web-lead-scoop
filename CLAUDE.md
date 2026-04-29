# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GlobaLeads22 is a B2B lead-generation SaaS at `globaleads22.com`. Users search Google Maps + the web for businesses, extract emails / WhatsApp / LinkedIn from their websites, and unlock AI "Intelligence" scores. The marketing site and the authenticated tool are in the same repo but served from different domains.

---

## Common Commands

Run from `web-lead-scoop-main/` (the directory containing `package.json`):

```sh
npm run dev          # Vite dev server on http://localhost:8080
npm run build        # Production build → dist/
npm run build:dev    # Dev-mode build (keeps lovable-tagger, friendlier source maps)
npm run lint         # ESLint flat config
npm run test         # vitest run (jsdom + @testing-library/react)
npm run test:watch   # vitest watch
npx vitest -t "test name substring"   # run a single test by name
```

Supabase Edge Functions (Deno) — run from the repo root:

```sh
npx supabase functions deploy <function-name>
npx supabase functions serve   # local invocation for testing
```

`start.bat` exists for Windows one-click dev. Vercel auto-deploys from `master`.

---

## Two-Domain Architecture

This is the most important thing to understand before touching routing, auth, or Vercel config.

| Domain | What serves it | What the user sees |
|---|---|---|
| `globaleads22.com` | `public/landing.html` (static) | Marketing landing page |
| `globaleads22.com/app` | React SPA (`index.html`) | App page (React) |
| `app.globaleads22.com` | React SPA (`index.html`) | App page (React) — post-login home |

**`vercel.json`** uses `rewrites` with a `has: host` condition to route `app.globaleads22.com/*` to `index.html` before the filesystem is checked (which would otherwise serve `landing.html` for `/`). Do not revert this to the old `routes` format — that caused `app.globaleads22.com/` to serve the static landing page.

**`src/App.tsx`** inspects `window.location.hostname` at module load time (`isAppSubdomain`). On the app subdomain, only `AppPage` is ever rendered. On the apex domain, the full React Router tree is active (`/` → `Index` which redirects to `/landing.html`, `/app` → `AppPage`, etc.).

**`src/pages/Index.tsx`** does `window.location.replace('/landing.html')` — it is a redirect shim, not a React page.

**Local dev note:** `localhost:8080` is treated as the apex domain (no `app.` prefix), so the React Router tree with all routes is active.

---

## Auth Flow

`src/hooks/useAuth.ts` wraps Supabase Auth. Key facts:

- `isDemoAccountPreview()` is **permanently disabled** — it always returns `false`. The demo URL mode (`?demo=account`) no longer works and must not be re-enabled without a product decision.
- `useAuth` sets `loading: true` on mount, calls `supabase.auth.getSession()` to hydrate, then subscribes to `onAuthStateChange`. Components should wait for `loading === false` before rendering auth-dependent UI.
- After email/password sign-in on a non-app subdomain, `AuthModal` redirects to `https://app.globaleads22.com`. On the app subdomain it stays in place.
- On `app.globaleads22.com`, `AppPage` auto-opens the `AuthModal` when `!loading && !user`.
- Google OAuth `redirectTo` is `window.location.origin` (app subdomain) or `${origin}/app` (apex).

---

## Search Pipeline

A search goes through these steps in order:

1. **`plan-lead-search`** (Supabase Edge Function) — takes a natural-language `brief` and returns a `SearchPlan` JSON: `targetBusiness`, `location`, `queryVariants[]`, `maxResults`, `businessModel`, `companySize`, `intentSignals[]`, `requiredChannels[]`. Uses Claude Haiku 4.5 if `ANTHROPIC_API_KEY` is set; falls back to a pure-heuristic parser that runs entirely in Deno.

2. **`search-places`** — takes `queryVariants[]` and runs up to 5 Google Places Text Search queries (paginated up to 60 total results), deduplicating by `placeId`.

3. **`extract-contacts`** — Firecrawl scrape for emails / WhatsApp / LinkedIn. **Capped to top 10 websites per search** — do not raise this without checking cost impact.

4. **`analyze-lead`** — Claude Haiku 4.5 scores one lead for opportunity and writes a row to `domain_intelligence`. Uses the **service role key** (bypasses RLS) — keep this edge function server-only.

5. **`web-search-leads`** — fallback path for businesses with no Maps presence (direct web search).

All edge functions have `verify_jwt = false` in `supabase/config.toml`. Auth is validated manually inside the functions where needed — this is intentional for the freemium flow.

---

## Credits & Core Domain Logic

Touch carefully — credits are the billing unit.

- `useCredits(userId)` reads `user_credits`. On `PGRST116` (row missing) it provisions a free row (`balance: 30, plan: "free"`), handling `23505` race conditions.
- **Credit costs:** 10 per search, 1 per single Intelligence unlock.
- `PLAN_CREDITS` in `src/pages/AppPage.tsx` maps plan name → credit ceiling. Keep in sync if plans change.
- DB writes (search history, saved leads) are **fire-and-forget** — failures log to console only, UI is not blocked.
- Sidebar ↔ search form communication uses a `CustomEvent('loadSearch', { detail: { keyword, location } })` dispatched from `AppPage`, listened to inside `LeadGeneratorSection`. If refactoring either side, maintain this event contract.

---

## Supabase Schema

Tables (all RLS-enforced, scoped to `auth.uid()`):
- `user_profiles` — onboarding data (service_type, pricing_tier, location)
- `user_credits` — `balance`, `plan`, `stripe_customer_id`
- `search_sessions` — search history
- `saved_leads` — persisted lead rows
- `domain_intelligence` — AI scores, written by `analyze-lead` via service role

`src/integrations/supabase/types.ts` is **generated** — regenerate via `npx supabase gen types typescript --project-id uoaxxxoqasczxcxygscy`, never hand-edit.

---

## Frontend Stack & Design System

- **Vite + React 18 + TypeScript**, SWC plugin. Path alias `@/` → `src/`.
- **shadcn/ui** components in `src/components/ui/` are vendored — extend with wrappers, don't edit in place.
- Manual chunks in `vite.config.ts`: `vendor-react`, `vendor-supabase`, `vendor-xlsx`, `vendor-radix`.
- HMR overlay disabled (`hmr.overlay: false`) — errors surface in the console or `ErrorBoundary`.

**Design tokens** — industrial skeuomorphism + Bitcoin-DeFi palette. Defined as CSS HSL variables (shadcn theme) AND raw hex in `tailwind.config.ts`:
- `void: #030304`, `btc: #F7931A`, named `petrol-*`, `cream-*`, `wine-*` scales.
- The dot-matrix / scanline overlays in `AppPage.tsx` are part of the identity — preserve them.
- Fonts: `Space Grotesk` (headings), `Inter` (body), `JetBrains Mono` / `Space Mono` (mono labels).

---

## Environment Variables

**Frontend** (`VITE_*` — browser-safe):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — public anon keys only
- `VITE_STRIPE_PUBLISHABLE_KEY`

**Edge functions only** (Supabase dashboard secrets, never `VITE_` prefix):
- `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`, `FIRECRAWL_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## Billing (Stripe — Phase 5, mostly done)

- One-time credit packs: Starter $9/100cr, Growth $19/300cr, Pro $39/700cr.
- `create-checkout-session` edge function → Stripe Checkout → `?checkout=success` redirect → `stripe-webhook` adds credits.
- Bundle purchase can be pre-selected via `?bundle=starter|growth|pro` on `app.globaleads22.com`.

---

## Conventions

- **TypeScript only** in `src/` — no `.js`/`.jsx`.
- Always import via `@/...`, not relative paths.
- `lovable-tagger` Vite plugin is dev-only; `build:dev` exists to keep it in non-prod builds.
