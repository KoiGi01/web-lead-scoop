# Admin search visibility + onboarding session replay — design

Date: 2026-06-21

## Goal

Two independent admin-visibility improvements:

1. **Per-user search visibility** — in the admin dashboard, see each individual
   search a user ran and drill into the actual leads that search produced.
2. **Onboarding session replay** — record what users do in the Onboarding flow
   (app.globaleads22.com) via PostHog, and reach those recordings from admin.

## Feature 1 — Per-user search visibility

### Current state

`src/components/app/AdminDashboard.tsx` already loads the last 500
`search_sessions` (30-day window) but only renders them **aggregated by mode**
in the "Search economics" table. There is no per-search, per-user view.

Each `search_sessions` row has: `keyword`, `location`, `depth`, `enrich_mode`,
`selected_service`, `opportunity_signals`, `usage_type`, `status`,
`lead_count`, `email_count`, `whatsapp_count`, `credits_used`,
`estimated_cost_usd`, `created_at`, `user_id`.

`saved_leads` rows carry `session_id`, so leads link back to a search. Caveat:
`saved_leads` only holds leads the user saved/imported, which may be fewer than
`lead_count`.

### Access control

- `search_sessions` — admins already have a "read all" RLS policy
  (`20260502001000_add_admin_usage_accounting.sql`). The per-user search list is
  fetched directly from the client.
- `saved_leads` — owner-only RLS, **no** admin policy. We do **not** broaden RLS
  on this (the product's core output table). Instead, drilling into a session's
  leads goes through a new admin-checked, service-role edge action.

### Implementation

1. **Edge action `get_session_leads`** in `supabase/functions/admin-users/index.ts`:
   - Input: `{ action: "get_session_leads", sessionId }`.
   - Requires `isAdmin` (existing gate).
   - Returns `saved_leads` rows for that `session_id` via service role, selecting
     a safe subset: `id, name, website, category, selected_service, emails,
     phone, contacts, crm_status, created_at`. Caps result count (e.g. 500).
   - Also returns the parent session row so the panel can show full metadata.

2. **UI** in the selected-user detail `aside`:
   - On user select, fetch that user's full `search_sessions` history
     (client-side; admin RLS allows) ordered newest first — not capped to the
     dashboard's 30-day aggregate window.
   - Render a "Searches" block: each row shows keyword + location, a depth/mode
     badge (e.g. `Deep · Enrich`), service, counts (`12 leads · 8 emails ·
     3 wa`), credits/cost, relative date, status.
   - Clicking a row expands inline and calls `get_session_leads`, listing the
     leads (name, website, category, email count, crm_status). Loading + empty
     states ("This search saved no leads").
   - Matches the existing mono/dark panel styling.

## Feature 2 — Onboarding session replay

### Current state

The React app already initializes PostHog via `<PostHogProvider>` in
`src/main.tsx` with `defaults: "2025-05-24"`; `src/lib/analytics.ts` exposes
`track`/`identifyUser`; `AppPage.tsx` identifies the user by `user.id`.
Onboarding lives in `src/components/onboarding/` and already emits
`onboarding_completed` and `onboarding_chat_fallback`.

### Decisions

- **Viewing:** deep-link from the admin user panel into PostHog's replay/person
  view (uses PostHog's real player; no in-app player).
- **Privacy:** keep the app's global masking default; **selectively unmask only
  the onboarding input** so admins can see exactly what users type during
  onboarding, while the rest of the app stays masked.

### Implementation

1. **Enable Session Replay** in PostHog project settings (web UI — no code).
   With `defaults: "2025-05-24"`, the SDK records once the project toggle is on.
2. **Instrument onboarding** via the existing `track()` helper:
   - `onboarding_started` (once, when the chat mounts).
   - `onboarding_step_completed` `{ step }` when slot progress increments.
   - Existing `onboarding_completed` / `onboarding_chat_fallback` kept.
   These let admins filter replays down to onboarding sessions in PostHog.
3. **Unmask onboarding input:** add PostHog's `ph-no-mask` class to the
   onboarding `<textarea>` (and message list) so typed answers are captured.
4. **Admin deep-link:** add a `posthogPersonUrl(distinctId)` helper using a new
   `VITE_POSTHOG_PROJECT_ID` (and optional `VITE_POSTHOG_APP_HOST`, default
   `https://us.posthog.com`). Render a "View session recordings ↗" link in the
   user detail panel (distinct_id = `user.id`). Hide the link when the project
   id env var is unset.

## Out of scope

- Storing full unsaved search results (rejected earlier — needs new storage).
- Embedding a replay player inside the admin app.
- Backfilling onboarding events for past sessions.

## Verification

- `npm.cmd run build` and `npm.cmd run lint` pass.
- Edge action returns leads only for admins; non-admins get 403.
- Onboarding events visible in PostHog; replay shows unmasked onboarding input.
