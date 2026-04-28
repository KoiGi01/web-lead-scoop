# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GlobaLeads22 is a B2B lead-generation SaaS deployed at https://globaleads22.com. Users search Google Maps + the web for businesses, extract emails / WhatsApp / LinkedIn from their websites, and unlock AI "Intelligence" scores that suggest outreach pitch angles. The marketing site (`/`) and the authenticated tool (`/app`) live in the same SPA; a host check (`app.` subdomain) in `src/App.tsx` swaps between marketing and app routes.

The repo was originally bootstrapped from Lovable (the README is the unmodified Lovable template — ignore its "Use Lovable to edit" framing).

## Common commands

Run from `web-lead-scoop-main/` (the project root that contains `package.json`):

```sh
npm run dev         # Vite dev server on http://localhost:8080
npm run build       # production build (outputs to dist/)
npm run build:dev   # dev-mode build (keeps lovable-tagger, source maps friendly)
npm run lint        # ESLint flat config (eslint.config.js)
npm run preview     # serve the built dist/ locally
npm run test        # vitest run (jsdom + @testing-library/react)
npm run test:watch  # vitest in watch mode
npx vitest run path/to/file.test.ts   # single test file
npx vitest -t "test name substring"   # filter by test name
```

Supabase Edge Functions (Deno) — deployed via the Supabase CLI from this repo:

```sh
npx supabase functions deploy <function-name>   # e.g. search-places
npx supabase functions serve                    # local invoke for testing
```

`start.bat` exists for Windows one-click dev. Vercel auto-deploys from `main` (see `vercel.json` — SPA rewrites everything to `index.html`).

## High-level architecture

### Two-host SPA

`src/App.tsx` inspects `window.location.hostname`. If it starts with `app.` (the production app subdomain), only `AppPage` is mounted; otherwise the marketing landing + `/app` + legal pages are routed. All page components are `React.lazy`-loaded and wrapped in a single `ErrorBoundary` + `Suspense`. A custom `<QueryClientProvider>`, two toasters (shadcn `Toaster` + `sonner`), and a `TooltipProvider` wrap everything.

### Frontend stack

- **Vite + React 18 + TypeScript**, SWC plugin (`@vitejs/plugin-react-swc`).
- **Path alias `@/` → `src/`** (configured in both `vite.config.ts` and `tsconfig.json`). Always import via `@/...`, not relative paths.
- **shadcn/ui** components in `src/components/ui/` (generated from `components.json`). Treat these as vendored — extend with wrappers rather than editing in place. Radix primitives are pre-bundled into a `vendor-radix` chunk in `vite.config.ts`.
- **TanStack Query** for server state, **react-hook-form + Zod** for form validation, **sonner + shadcn toaster** for notifications, **lucide-react** for icons.
- **Mapbox GL** + **@googlemaps/js-api-loader** for the map panels (`MapboxPanel`, `LocationAutocomplete`).
- **xlsx-js-style** for the lead export.

### Backend: Supabase only

There is no custom Node backend. All server logic runs in Supabase:

- **Auth** — `@supabase/supabase-js` client in `src/integrations/supabase/client.ts` reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Database** — Postgres tables: `user_profiles`, `user_credits`, `search_sessions`, `saved_leads`, `domain_intelligence`. All have RLS policies scoped to `auth.uid()` (see `SECURITY_AUDIT.md`). `src/integrations/supabase/types.ts` is **generated** — regenerate via `npx supabase gen types typescript --project-id <ref>` rather than hand-editing.
- **Edge functions** (Deno, in `supabase/functions/`):
  - `search-places` — Google Places Text Search (paginated up to 60 results).
  - `web-search-leads` — fallback web search for businesses without a Maps presence.
  - `extract-contacts` — Firecrawl-driven scrape for emails / WhatsApp / LinkedIn.
  - `analyze-lead` — Anthropic Claude Haiku 4.5 call that scores opportunity + writes a row to `domain_intelligence`. Uses the **service role key**, so it bypasses RLS — keep server-only secrets out of any `VITE_`-prefixed var.
  - `create-checkout-session` + `stripe-webhook` — Stripe billing (Phase 5, partially wired).
  - `verify_jwt = false` is set in `supabase/config.toml` for `search-places`, `web-search-leads`, `extract-contacts`, `analyze-lead` — they validate auth manually if at all, which is intentional for the freemium demo flow.

### Credits & search flow

This is the core domain model — touch carefully:

1. `useCredits(userId)` (`src/hooks/useCredits.ts`) reads `user_credits`. On `PGRST116` (row missing) it auto-provisions a free row (`balance: 30, plan: "free"`) and handles the `23505` race when two requests insert concurrently. **Plan → credits ceiling** lives in `PLAN_CREDITS` at the top of `src/pages/AppPage.tsx` — keep these in sync if plans change.
2. A search costs **10 credits**; unlocking Intelligence on a single lead costs **1 credit**; "Unlock All Intelligence" batches with 300ms delays (see `LeadGeneratorSection.tsx`). Firecrawl is capped to top 10 websites per search for cost reasons — don't lift this without checking the cost note in `ROADMAP.md`.
3. Search history is persisted via `useSearchHistory` to `search_sessions`; saved leads via `saved_leads`. DB writes are fire-and-forget so the UI stays snappy — failures are logged to console, not surfaced.
4. The sidebar's "load past search" path uses a `CustomEvent('loadSearch')` dispatched from `AppPage` and listened to inside `LeadGeneratorSection`. If you refactor either side, keep the event contract (`{ keyword, location }`) intact.

### Design system

- **Industrial skeuomorphism + Bitcoin-DeFi palette.** Colors are defined both as CSS HSL variables (shadcn theme) and as raw hex tokens in `tailwind.config.ts` (`void: #030304`, `btc: #F7931A`, etc.). Prefer the named tokens; only use raw hex (e.g. `#080808`) inline when matching the existing landing-page background pattern.
- The dot-matrix overlay + scanline overlay used throughout (`AppPage.tsx`) is part of the visual identity — don't strip it during refactors.
- Fonts: `Space Grotesk` (heading), `Inter` (body), `JetBrains Mono` / `Space Mono` (mono labels and the `GLOBALEADS22` wordmark).

### Routing quirks

- Production has `app.globaleads22.com` → app-only routes; the apex domain serves marketing + `/app`. When testing routing locally, Vite's port 8080 is treated as the apex (no `app.` prefix).
- `vercel.json` rewrites everything to `index.html`, so React Router owns 404s via the `*` route → `NotFound`.

## Environment variables

Frontend (`VITE_*` — exposed to the browser, must not contain secrets):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — public anon keys only.
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable (Phase 5).

Edge-function-only (set via Supabase dashboard, **never** prefix with `VITE_`):
- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`, `FIRECRAWL_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

`SECURITY_AUDIT.md` documents the full env-var separation rationale.

## Roadmap context

`ROADMAP.md` is the source of truth for what's built vs. pending. As of last update: Phases 1–4.2 are done, Phase 4.3 (error-handling polish: error boundaries already partly added, skeleton states, Zod form validation, mobile responsive audit) is the active work, then Phase 5 (Stripe) and Phase 6 (SEO/legal/email). Don't start net-new feature work in later phases without confirming.

## Conventions worth knowing

- **TypeScript is the only source language.** No `.js`/`.jsx` in `src/` except generated config.
- **Don't edit `src/integrations/supabase/types.ts` by hand** — it's regenerated from the live DB schema.
- The `lovable-tagger` Vite plugin is loaded in dev mode only; leaving it in is harmless but it's the reason `build:dev` exists as a separate script.
- HMR overlay is disabled (`hmr.overlay: false` in `vite.config.ts`) — errors surface in the console / ErrorBoundary, not as a fullscreen Vite panel.
