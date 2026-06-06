# Persist Opportunity Signals — Design Spec

Date: 2026-06-06
Status: Approved for planning
Relates to: `REWORK_PLAN.md` Phase 4 ("Add opportunity signal and evidence fields to saved results") and sets up Phase 5 cards.
Builds on: `docs/superpowers/specs/2026-06-05-opportunity-signal-detection-design.md` (detection shipped; signals are currently in-memory only).

## Summary

Detected opportunity signals are produced per lead in memory (`lead.detectedSignals` +
`lead.websiteSignals`) but are discarded on save. This slice persists them into the
existing `saved_leads.intelligence` JSON column so they survive save/reload, and lights
up the existing saved-leads UI by populating `detectedIssues` — with no migration, no
edge-function change, and no Phase 5 card work.

## Goals

- Write detected signals into `saved_leads.intelligence` on insert.
- Populate the existing `intelligence.detectedIssues` field so `ViewAllLeads` and
  `OpportunitiesDashboard` immediately show signal chips (they already render it).
- Keep the persisted detector output lossless-enough for Phase 5 cards to consume later.
- Leave Phase 6 AI-scoring fields (`opportunityScore`, `positioning`, pitch/outreach)
  untouched to avoid semantic collision.

## Non-Goals (deferred)

- Database migration (none needed — `saved_leads.intelligence: Json | null` already exists).
- Edge-function changes (detection already ships `websiteSignals`).
- Phase 5 redesigned opportunity cards / dedicated signal rendering.
- Phase 6 AI opportunity scoring (`opportunityScore`, outreach copy).
- Rehydrating `lead.detectedSignals` from persisted data on the search screen (the
  saved-leads view reads `intelligence` directly; full rehydration is Phase 5).

## Context (verified)

- `saved_leads.intelligence` exists (`src/integrations/supabase/types.ts:514`).
- The insert payload (`src/components/landing/LeadGeneratorSection.tsx:1360-1375`) does
  NOT currently write `intelligence`.
- `ViewAllLeads` defines `LeadIntelligence` (`src/components/landing/ViewAllLeads.tsx:41`)
  with `opportunityScore`, `positioning`, `businessMaturity`, `detectedIssues`,
  `opportunitySummary`, `suggestedPitchAngle`, `outreachHook`. It reads
  `intelligence.detectedIssues` for display and `intelligence.opportunityScore` for
  filter/sort. Today only demo data fills it.
- `OpportunitiesDashboard` (`src/components/app/OpportunitiesDashboard.tsx:52`) reads a
  subset (`opportunityScore`, `detectedIssues`, `outreachHook`).
- `DetectedSignal` and `WebsiteSignals` come from the detection slice
  (`src/lib/detectOpportunitySignals.ts`, `supabase/functions/_shared/websiteSignals.ts`).

## Decisions (from brainstorming)

1. **Persist shape:** namespaced raw under `intelligence.signals`, PLUS populate the
   existing top-level `detectedIssues` for immediate display. Phase 6 AI fields untouched.
2. **Website facts:** store a curated subset of `WebsiteSignals` (drop bulky/intermediate
   `ctaTexts` and the top-level `evidence`, since per-signal evidence already lives inside
   `detected[]`). The JSON shape is hard to change for already-saved rows, so trim noise
   up front.

## Data Shape

New pure helper `src/lib/leadIntelligence.ts`:

```ts
import type { DetectedSignal } from "@/lib/detectOpportunitySignals";
import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";

export interface WebsiteSignalsSummary {
  pagesScanned: string[];
  title?: string;
  metaDescription?: string;
  homepageTextLength: number;
  contactFormFound: boolean;
  contactPageFound: boolean;
  bookingLinks: string[];
  socialLinks: string[];
  hasGenericInboxOnly: boolean;
  techStack: string[];
  ssl: { valid: boolean; httpsRedirect: boolean };
}

export interface PersistedSignals {
  version: 1;
  service: string;
  detected: DetectedSignal[];          // selected keys only, as produced by the detector
  website: WebsiteSignalsSummary;      // curated subset of WebsiteSignals
}

export interface LeadIntelligencePayload {
  detectedIssues: string[];            // human labels of PRESENT signals (feeds existing UI)
  signals: PersistedSignals;
}

export function buildLeadIntelligence(
  detectedSignals: DetectedSignal[] | undefined,
  websiteSignals: WebsiteSignals | undefined,
  service: string,
): LeadIntelligencePayload | null;     // null when nothing to persist -> omit from insert
```

### Behavior of `buildLeadIntelligence`

- Returns `null` if `websiteSignals` is undefined OR `detectedSignals` is undefined/empty
  (nothing useful to persist — e.g. scrape failed, or opportunity mode off with no
  selected signals).
- `detectedIssues` = labels (`opportunitySignalLabels[key]`) of signals where
  `present === true`. Empty array if none are present.
- `signals.detected` = the `detectedSignals` array as-is.
- `signals.website` = curated subset (the fields listed in `WebsiteSignalsSummary`),
  dropping `ctaTexts` and `evidence`.
- `signals.version` = 1; `signals.service` = the passed service string (trimmed).

## Write & Read Paths

**Write** — `src/components/landing/LeadGeneratorSection.tsx`, insert payload (line ~1360):

- Add `intelligence: buildLeadIntelligence(lead.detectedSignals, lead.websiteSignals, config.selectedService) ?? null` to each payload row.
- Extend the existing schema-cache fallback (line ~1378) so `intelligence` is also
  stripped if a schema-cache error references it (defensive; the column exists).

**Read** — no functional change required. `ViewAllLeads` already loads `intelligence`
and renders `detectedIssues`. Extend its `LeadIntelligence` interface with an optional
`signals?: PersistedSignals` field so the persisted data is typed for Phase 5 to consume.

## Error Handling

- If `buildLeadIntelligence` returns `null`, the row's `intelligence` is `null` (current
  behavior preserved; save still succeeds).
- The insert already runs inside a `try/catch` that logs and does not block the search
  flow; persistence failure must never fail the user's search. The schema-cache fallback
  ensures a stray column issue degrades to saving without `intelligence` rather than
  losing the whole save.

## Testing

- `src/lib/leadIntelligence.test.ts` (Vitest, pure):
  - returns `null` when `websiteSignals` or `detectedSignals` is missing/empty;
  - `detectedIssues` contains labels for ONLY `present === true` signals, using
    `opportunitySignalLabels`;
  - `signals.website` is the curated subset and excludes `ctaTexts`;
  - `signals.detected` round-trips the input array; `version === 1`; `service` trimmed.
- `npm.cmd run build` + `npm.cmd run test` per CLAUDE.md.
- Acceptance: for a lead with detected signals, the saved row's
  `intelligence.signals.detected` equals the detector output and
  `intelligence.detectedIssues` lists the present-signal labels.

## Implementation Parts

- **Part A — Helper:** `src/lib/leadIntelligence.ts` + tests (TDD).
- **Part B — Wiring:** write `intelligence` in the insert payload + fallback; extend the
  `ViewAllLeads` `LeadIntelligence` type with optional `signals`.

## Codex Verification Prompts

### Part A — buildLeadIntelligence

```
Review src/lib/leadIntelligence.ts and src/lib/leadIntelligence.test.ts on the current
branch, then run: npm.cmd run test -- leadIntelligence
CHECK FOR:
1. Returns null when websiteSignals is undefined OR detectedSignals is undefined/empty.
2. detectedIssues contains labels for ONLY present===true signals, sourced from
   opportunitySignalLabels (not raw keys).
3. signals.website is the curated subset — confirm ctaTexts and evidence are NOT included,
   and the listed summary fields ARE included.
4. signals.detected equals the input detectedSignals; version===1; service is trimmed.
5. Pure module: only type imports + opportunitySignalLabels; no network/Deno/side effects.
6. Tests pass — paste the count.
RESPOND:
PART A VERIFICATION
- Item 1 (null guard): PASS/FAIL — <one line>
- Item 2 (detectedIssues = present labels): PASS/FAIL — <one line>
- Item 3 (curated website subset, no ctaTexts/evidence): PASS/FAIL — <one line>
- Item 4 (detected round-trip, version, service): PASS/FAIL — <one line>
- Item 5 (purity): PASS/FAIL — <one line>
- Item 6 (tests): PASS/FAIL — <count>
OVERALL: PASS/FAIL
BLOCKING ISSUES: <numbered list or "none">
```

### Part B — Persistence wiring

```
Verify the saved_leads persistence wiring on the current branch.
FILES: src/components/landing/LeadGeneratorSection.tsx, src/components/landing/ViewAllLeads.tsx
CHECK FOR:
1. The saved_leads insert payload (around line 1360) includes
   intelligence: buildLeadIntelligence(lead.detectedSignals, lead.websiteSignals,
   config.selectedService) ?? null.
2. The existing schema-cache fallback (around line 1378) also strips intelligence if a
   schema-cache error references it, so a column issue degrades gracefully instead of
   failing the save.
3. ViewAllLeads LeadIntelligence interface gained an optional signals?: PersistedSignals
   field; no other read-path behavior changed.
4. SCOPE GUARD: no migration added; no edge-function changes; no Phase 5 card rendering
   changes; Phase 6 fields (opportunityScore/positioning/pitch/outreach) are NOT written
   by buildLeadIntelligence. Confirm via the diff.
5. Run npm.cmd run build and npm.cmd run test -- --run; both pass.
RESPOND:
PART B VERIFICATION
- Item 1 (intelligence in payload): PASS/FAIL — <file:line>
- Item 2 (fallback strips intelligence): PASS/FAIL — <one line>
- Item 3 (LeadIntelligence.signals typed): PASS/FAIL — <one line>
- Item 4 (scope guard): PASS/FAIL — <list any violations>
- Item 5 (build+tests): PASS/FAIL — <count>
OVERALL: PASS/FAIL
BLOCKING ISSUES: <numbered list or "none">
```

## Self-Review Notes

- Spec coverage: Part A implements the helper + tests; Part B implements write/read wiring
  and type extension. Both decisions (namespaced raw + detectedIssues display; curated
  website subset) are captured in Data Shape and Decisions.
- Type consistency: `LeadIntelligencePayload`, `PersistedSignals`, `WebsiteSignalsSummary`,
  and `buildLeadIntelligence(...)` are named identically in Data Shape, Write path, and
  Testing. `DetectedSignal`/`WebsiteSignals` reuse the detection slice's exports.
- Scope: single slice, no migration, no edge/Phase-5/Phase-6 work; matches the approved
  design.
