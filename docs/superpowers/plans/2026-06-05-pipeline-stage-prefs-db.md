# Pipeline Stage Prefs → Per-User DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Pipeline stage labels/order per authenticated user in Supabase (currently localStorage-only) so they follow the user across devices, keeping localStorage as the demo/offline fallback.

**Architecture:** Extract the stage-prefs parse/validate logic into a pure, unit-tested lib (`src/lib/stagePrefs.ts`). Add a `pipeline_stage_prefs jsonb` column to `user_profiles`. In `ViewAllLeads.tsx`, load prefs from the already-present `useUserProfile` hook for real users and from localStorage for demo/no-user; on rename/reorder, write to the DB (debounced) for real users, localStorage otherwise.

**Tech Stack:** React + TypeScript, Supabase (Postgres + JS client), vitest. Windows/PowerShell → use `npm.cmd` / `npx.cmd`.

---

## File Structure

- **Create** `src/lib/stagePrefs.ts` — single responsibility: the `CrmStatus` type, `NON_NEW_STAGES`, `StagePrefs` interface, and the pure `parseStagePrefs(raw)` validator. Importable by the component and tests; no React/Supabase deps.
- **Create** `src/lib/stagePrefs.test.ts` — vitest unit tests for `parseStagePrefs`.
- **Create** `supabase/migrations/20260605120000_add_pipeline_stage_prefs.sql` — adds the column.
- **Modify** `src/integrations/supabase/types.ts` — add `pipeline_stage_prefs` to `user_profiles` Row/Insert/Update.
- **Modify** `src/components/landing/ViewAllLeads.tsx` — import from the new lib (remove the local `CrmStatus` + `NON_NEW_STAGES` duplicates), replace the load effect and `persistStages`.

---

## Task 1: Pure stage-prefs lib (TDD)

**Files:**
- Create: `src/lib/stagePrefs.ts`
- Test: `src/lib/stagePrefs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/stagePrefs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseStagePrefs, NON_NEW_STAGES } from "@/lib/stagePrefs";

describe("parseStagePrefs", () => {
  it("returns defaults for null / non-object input", () => {
    expect(parseStagePrefs(null)).toEqual({ order: NON_NEW_STAGES, labels: {} });
    expect(parseStagePrefs("nope")).toEqual({ order: NON_NEW_STAGES, labels: {} });
  });

  it("keeps a valid custom order", () => {
    const order = ["lost", "won", "proposal", "qualified", "contacted"];
    expect(parseStagePrefs({ order }).order).toEqual(order);
  });

  it("drops unknown stages and appends missing ones (never includes 'new')", () => {
    const result = parseStagePrefs({ order: ["won", "bogus", "new", "contacted"] });
    expect(result.order).toEqual(["won", "contacted", "qualified", "proposal", "lost"]);
    expect(result.order).not.toContain("new");
  });

  it("keeps only string labels for non-new stages", () => {
    const result = parseStagePrefs({
      labels: { contacted: "Reached out", won: 5, new: "Fresh", bogus: "x" },
    });
    expect(result.labels).toEqual({ contacted: "Reached out" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- stagePrefs`
Expected: FAIL — cannot resolve `@/lib/stagePrefs` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/stagePrefs.ts`:

```ts
export type CrmStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

// Editable/reorderable stages. "new" is intentionally excluded: it is locked and
// always rendered first (scans drop prospects there), and is never persisted.
export const NON_NEW_STAGES: CrmStatus[] = ["contacted", "qualified", "proposal", "won", "lost"];

export interface StagePrefs {
  order: CrmStatus[];
  labels: Partial<Record<CrmStatus, string>>;
}

const isNonNewStage = (value: unknown): value is CrmStatus =>
  typeof value === "string" && (NON_NEW_STAGES as string[]).includes(value);

/**
 * Validate raw persisted stage prefs (from DB jsonb or localStorage) into a
 * complete, safe shape: `order` is always every NON_NEW_STAGES exactly once
 * (custom order honored, unknowns dropped, missing appended); `labels` keeps
 * only string labels for editable stages.
 */
export function parseStagePrefs(raw: unknown): StagePrefs {
  const result: StagePrefs = { order: [...NON_NEW_STAGES], labels: {} };
  if (!raw || typeof raw !== "object") return result;

  const obj = raw as { order?: unknown; labels?: unknown };

  if (Array.isArray(obj.order)) {
    const valid = obj.order.filter(isNonNewStage);
    result.order = [...valid, ...NON_NEW_STAGES.filter(stage => !valid.includes(stage))];
  }

  if (obj.labels && typeof obj.labels === "object") {
    const labels: Partial<Record<CrmStatus, string>> = {};
    for (const [key, value] of Object.entries(obj.labels as Record<string, unknown>)) {
      if (isNonNewStage(key) && typeof value === "string") labels[key] = value;
    }
    result.labels = labels;
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- stagePrefs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stagePrefs.ts src/lib/stagePrefs.test.ts
git commit -m "feat: pure parseStagePrefs lib for pipeline stage prefs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: DB column + generated types

**Files:**
- Create: `supabase/migrations/20260605120000_add_pipeline_stage_prefs.sql`
- Modify: `src/integrations/supabase/types.ts:17-62` (the `user_profiles` block)

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260605120000_add_pipeline_stage_prefs.sql`:

```sql
alter table public.user_profiles
  add column if not exists pipeline_stage_prefs jsonb;
```

- [ ] **Step 2: Add the field to the manual types**

In `src/integrations/supabase/types.ts`, inside `user_profiles`, add the field to all three shapes.

In `Row` (after the `phone: string | null` line, before `created_at: string`):

```ts
          pipeline_stage_prefs: Json | null
```

In `Insert` (after `phone?: string | null`, before `created_at?: string`):

```ts
          pipeline_stage_prefs?: Json | null
```

In `Update` (after `phone?: string | null`, before `created_at?: string`):

```ts
          pipeline_stage_prefs?: Json | null
```

(`Json` is already defined and used elsewhere in this file — e.g. `domain_intelligence.detected_issues: Json | null` — so no new import is needed.)

- [ ] **Step 3: Push the migration**

Run: `npx.cmd supabase db push`
Expected: applies `20260605120000_add_pipeline_stage_prefs`; no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260605120000_add_pipeline_stage_prefs.sql src/integrations/supabase/types.ts
git commit -m "feat: add pipeline_stage_prefs column to user_profiles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Wire ViewAllLeads to the lib + DB

**Files:**
- Modify: `src/components/landing/ViewAllLeads.tsx`

Context for the implementer: this component currently defines `type CrmStatus` (line ~34) and `const NON_NEW_STAGES` (line ~144) locally, loads prefs from localStorage in an effect (lines ~386-399), and writes them in `persistStages` (lines ~401-403). `useUserProfile(user?.id)` is already called (line ~226) exposing `userProfile`, which (after Task 2) carries `pipeline_stage_prefs`. `userId`, `demoMode`, `toast`, and `supabase` are all already in scope. Grep for each anchor string below before editing — line numbers in this file drift.

- [ ] **Step 1: Add `useRef` to the React import**

Find (line ~1):

```ts
import { ComponentType, useEffect, useMemo, useState } from "react";
```

Replace with:

```ts
import { ComponentType, useEffect, useMemo, useRef, useState } from "react";
```

- [ ] **Step 2: Import the lib and remove the local `CrmStatus` duplicate**

Find:

```ts
type CrmStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
```

Replace with:

```ts
import { type CrmStatus, NON_NEW_STAGES, parseStagePrefs } from "@/lib/stagePrefs";
```

(Imports may sit mid-file here; that is valid TypeScript and keeps the diff local. If lint complains about import ordering, move this line up next to the other `@/` imports near the top and delete the `type CrmStatus` line in place.)

- [ ] **Step 3: Remove the now-duplicated `NON_NEW_STAGES`**

Find:

```ts
const NON_NEW_STAGES: CrmStatus[] = ["contacted", "qualified", "proposal", "won", "lost"];
```

Replace with (delete it — keep the `STAGE_PREFS_KEY` line that follows):

```ts
```

(i.e. remove that single line. `NON_NEW_STAGES` now comes from the import in Step 2.)

- [ ] **Step 4: Add a debounce ref next to the other state**

Find:

```ts
  const [editingStages, setEditingStages] = useState(false);
```

Replace with:

```ts
  const [editingStages, setEditingStages] = useState(false);
  const stagePrefsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 5: Replace the localStorage-only load effect with a DB/localStorage loader**

Find:

```ts
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STAGE_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { order?: CrmStatus[]; labels?: Partial<Record<CrmStatus, string>> };
      if (parsed.labels) setStageLabels(parsed.labels);
      if (Array.isArray(parsed.order)) {
        const valid = parsed.order.filter(stage => NON_NEW_STAGES.includes(stage));
        setStageOrder([...valid, ...NON_NEW_STAGES.filter(stage => !valid.includes(stage))]);
      }
    } catch {
      /* ignore malformed prefs */
    }
  }, []);
```

Replace with:

```ts
  // Load stage prefs: from the user's profile row for real users, from
  // localStorage for demo/offline. parseStagePrefs guarantees a complete order.
  useEffect(() => {
    if (demoMode || !userId) {
      try {
        const raw = localStorage.getItem(STAGE_PREFS_KEY);
        const prefs = parseStagePrefs(raw ? JSON.parse(raw) : null);
        setStageOrder(prefs.order);
        setStageLabels(prefs.labels);
      } catch {
        /* ignore malformed prefs */
      }
      return;
    }
    // userProfile may be null until useUserProfile resolves; this effect re-runs
    // when it loads. parseStagePrefs(undefined/null) safely yields defaults.
    const prefs = parseStagePrefs(userProfile?.pipeline_stage_prefs);
    setStageOrder(prefs.order);
    setStageLabels(prefs.labels);
  }, [demoMode, userId, userProfile]);
```

- [ ] **Step 6: Replace `persistStages` to branch DB vs localStorage (debounced DB write)**

Find:

```ts
  const persistStages = (order: CrmStatus[], labels: Partial<Record<CrmStatus, string>>) => {
    try { localStorage.setItem(STAGE_PREFS_KEY, JSON.stringify({ order, labels })); } catch { /* ignore */ }
  };
```

Replace with:

```ts
  const persistStages = (order: CrmStatus[], labels: Partial<Record<CrmStatus, string>>) => {
    if (demoMode || !userId) {
      try { localStorage.setItem(STAGE_PREFS_KEY, JSON.stringify({ order, labels })); } catch { /* ignore */ }
      return;
    }
    // Debounce so rapid renames/reorders coalesce into a single DB write.
    if (stagePrefsTimer.current) clearTimeout(stagePrefsTimer.current);
    stagePrefsTimer.current = setTimeout(async () => {
      // .update (not .upsert): the profile row already exists post-onboarding, and
      // update avoids violating user_profiles NOT NULL columns on a phantom insert.
      const { error } = await supabase
        .from("user_profiles")
        .update({ pipeline_stage_prefs: { order, labels } })
        .eq("id", userId);
      if (error) {
        console.error("Error saving pipeline stage prefs:", error);
        toast({ title: "Couldn't save stages", description: "Your stage changes may not sync across devices.", variant: "destructive" });
      }
    }, 600);
  };
```

- [ ] **Step 7: Verify the build typechecks**

Run: `npm.cmd run build`
Expected: build succeeds with no TypeScript errors. (If `NON_NEW_STAGES.includes(stage)` warns about a `CrmStatus`-vs-`string` comparison anywhere remaining, it is gone — the only remaining `NON_NEW_STAGES` uses are `setStageOrder(NON_NEW_STAGES)` defaults and the board column mapping, which are fine.)

- [ ] **Step 8: Commit**

```bash
git add src/components/landing/ViewAllLeads.tsx
git commit -m "feat: persist pipeline stage prefs per-user in Supabase

Real users load/save stage labels+order via user_profiles; demo and
signed-out keep the localStorage fallback. DB writes are debounced.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm.cmd run test`
Expected: all suites pass (the prior 11 lib tests + the 4 new `parseStagePrefs` tests).

- [ ] **Step 2: Run the production build**

Run: `npm.cmd run build`
Expected: success, no type errors.

- [ ] **Step 3: Manual — demo persistence (localStorage)**

Run: `npm.cmd run dev`, open `localhost:8080/app?demo=1`, go to Pipeline → Edit stages → rename a stage and move one. Reload. Expected: the rename/order persist (sourced from localStorage).

- [ ] **Step 4: Manual — real account persistence (DB)**

As an admin or paid account on the dev/live app (NOT a free account — free is gated out of the workspace per `canUseSearchQuality`), Pipeline → Edit stages → rename + reorder. Reload the page. Expected: prefs persist from the DB. Bonus: open the same account in a second browser/profile → the customized labels/order load there too.

---

## Self-Review Notes

- **Spec coverage:** storage column (Task 2), demo/offline localStorage fallback on load+save (Task 3 Steps 5-6), DB load via existing `useUserProfile` (Step 5), debounced DB write (Step 6), order validation reused from one place (Task 1 `parseStagePrefs`, used by both load paths), types update (Task 2 Step 2), `new` never stored / enum unchanged (Task 1 lib + tests). All covered.
- **Deviation from spec:** spec said "upsert"; plan uses `.update()` to avoid `user_profiles` NOT NULL violations on a non-existent row (the row reliably exists after onboarding). Behavior for the supported case is identical; this is strictly safer.
- **Type consistency:** `CrmStatus`, `NON_NEW_STAGES`, `StagePrefs`, `parseStagePrefs` are defined once in `src/lib/stagePrefs.ts` and imported by the component and tests — no divergent re-declarations remain (the local ones are deleted in Task 3 Steps 2-3).
