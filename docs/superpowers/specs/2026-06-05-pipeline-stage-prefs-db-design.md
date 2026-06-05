# Pipeline stage prefs → per-user DB

**Date:** 2026-06-05
**Status:** Approved (design)

## Problem

Pipeline stage names and order (the "Edit stages" feature in the Pipeline board)
are persisted only to `localStorage` (`STAGE_PREFS_KEY = "gl22-pipeline-stages"`)
in `src/components/landing/ViewAllLeads.tsx`. They therefore do not follow a user
across devices or browsers. Make them per-account.

## Scope

In scope:
- Persist `{ order, labels }` per authenticated user in Supabase.
- Load from the DB on mount for real users; keep `localStorage` for demo/offline.
- Upsert (debounced) on rename/reorder for real users.

Out of scope (v1):
- Adding/deleting custom stages. `CrmStatus` enum is unchanged
  (`new / contacted / qualified / proposal / won / lost`).
- Only stage **labels** and **order** are customizable. `new` is always
  fixed and first; it is never stored in `order`.

## Storage

New `jsonb` column on `user_profiles` (keyed by `id = userId`, one row per user,
established RLS and `upsert` pattern already used by `EditProfileModal` /
`useUserProfile`).

- Migration: `supabase/migrations/20260605HHMMSS_add_pipeline_stage_prefs.sql`
  ```sql
  alter table public.user_profiles
    add column if not exists pipeline_stage_prefs jsonb;
  ```
  Applied with `npx.cmd supabase db push`.
- Stored shape (identical to current localStorage shape, so no reshaping):
  ```json
  { "order": ["contacted","qualified","proposal","won","lost"],
    "labels": { "contacted": "Reached out" } }
  ```
- Types: add `pipeline_stage_prefs: Json | null` to the `user_profiles` Row/Insert/Update
  in the manually-maintained `src/integrations/supabase/types.ts`.

## Behavior

### Load (mount effect in `ViewAllLeads.tsx`)
- `demoMode || !userId` → read `localStorage` (current behavior preserved).
- Else → `select pipeline_stage_prefs from user_profiles where id = userId`.
- Validation (same as today's localStorage loader): take `parsed.order`, filter to
  members of `NON_NEW_STAGES`, then append any `NON_NEW_STAGES` not present, so the
  result is always a complete, valid ordering. Apply `parsed.labels` if an object.
- Missing row / null / malformed / fetch error → defaults (`NON_NEW_STAGES`, `{}`),
  silently. No toast on load.

### Save (`renameStage` / `moveStage`)
- State updates optimistically (unchanged).
- `demoMode || !userId` → `localStorage` (current behavior preserved).
- Real user → **debounced** (~600ms) `upsert` to
  `user_profiles { id: userId, pipeline_stage_prefs: { order, labels } }`.
  Debounce coalesces rapid keystroke renames and successive reorders into one write.
- On error: `console.error` + a non-blocking toast. No state rollback (low-stakes pref).

## Components / boundaries

All changes are local to `ViewAllLeads.tsx` plus the migration and `types.ts`:
- Replace the unconditional localStorage load effect with a branching loader that
  depends on `[userId, demoMode]`.
- Add a `persistStages(order, labels)` that branches DB vs localStorage; keep its
  call sites (`renameStage`, `moveStage`) unchanged.
- Add a debounce ref/timer for DB writes.

No change to `CrmStatus`, the board rendering, drag/drop, or any scan/credits/save/export flow.

## Testing / verification
- `npm.cmd run build` passes.
- `?demo=1`: edit a stage name/order, reload → persists locally (localStorage).
- Real account (admin or paid): edit stage name/order, reload → persists from DB;
  open in a second browser/device → same prefs load.
