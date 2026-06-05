# Service-Aware Scan Planner — Design Spec

Date: 2026-06-04
Status: Approved (design); spec pending user review.
Scope: First slice of "the agent controls the search" — **plan intelligence only**. Execution (Firecrawl/extraction) is unchanged this round.

## Goal

Make the AI-assisted scan planner **service-aware** and **explainable**. Today the planner is framed as a generic "B2B lead search" and is never told what the user sells, so its queries and summary are not tailored. After this change, the agent reasons like a prospecting analyst for service sellers: it identifies what the user sells, designs discovery queries likely to surface businesses with the weaknesses that service fixes, names the opportunity signals it will look for, and explains why — and the Scan plan card surfaces that reasoning.

This is the visible, low-risk first step toward "the agent establishes the conditions of the search." The authored conditions are stored for a later project to feed into Firecrawl; **no search/credits/extraction behavior changes here.**

## Non-Goals (explicitly deferred)

- Wiring authored conditions into `extract-contacts` / Firecrawl (per-business signal detection). That is the next project.
- Per-prospect AI scoring / outreach-angle generation (REWORK Phase 6).
- Bringing this into manual mode (manual already has explicit service + signal selection).
- Changing the planner's model/provider (stays Gemini 2.5 Flash; a future swap to 2.5 Pro is a one-line env-gated change, out of scope).

## Approach

Upgrade the existing `plan-lead-search` edge function in place: stronger role-specific system prompt, a richer JSON output schema, and pass it the seller's service + profile context. Extend the heuristic fallback and the frontend so the populated plan also looks right offline and at `?demo=1`. Surface the new fields in the AI-assisted Scan plan card.

## Data Shape

New first-class fields on the plan (added to the edge `SearchPlan`, the frontend `FreeSearchPlan`, and carried through `planToSearchConfig`). All additive; existing fields unchanged.

```
service: string            // what the user sells (e.g. "Web design"). First-class, not guessed downstream.
strategy: string           // 1–2 sentence rationale tying the queries/signals to the service.
opportunitySignals: OpportunitySignalKey[]  // signals the agent will look for, tied to the service.
scanTargets: string[]      // pages the agent intends to read: e.g. ["homepage","contact","booking","team","about"].
queryVariants: string[]    // EXISTING — now genuinely service-tailored and surfaced in the UI.
summary: string            // EXISTING — kept.
```

`OpportunitySignalKey` is the existing union in `LeadGeneratorSection.tsx` (`weak_website`, `no_booking`, `no_clear_cta`, `generic_inbox`, `low_reviews`, `no_social_links`, `no_contact_form`, `weak_local_presence`). The edge function validates/clamps to this set; unknown values are dropped.

`scanTargets` is constrained to a small allowed set: `homepage`, `contact`, `about`, `team`, `booking`, `services`, `pricing`, `social`. Clamped and de-duplicated.

## Component Changes

### 1. Planner edge function — `supabase/functions/plan-lead-search/index.ts`

- **Request:** the frontend now sends `service` (the seller's service string) and continues to send `messages`, `currentKeyword`, `currentLocation`, `userProfile`. The prompt uses `service` as primary context.
- **System prompt:** rewritten from "planning a B2B lead search" to a prospecting-analyst role: given what the user sells + target market + location, (a) design discovery queries that surface businesses in that niche/location plausibly having the weaknesses the service addresses, (b) choose the opportunity signals to look for, (c) name the pages to read, (d) write a one- to two-sentence strategy rationale. Keep the existing guardrails: no provider names, ask concise clarifications when a key field (now including `service`) is missing, do not start the search.
- **Schema (`responseJsonSchema`):** extend the `plan` object with `service`, `strategy`, `opportunitySignals` (array, enum = signal keys), `scanTargets` (array, enum = allowed pages). Keep `queryVariants`, `summary`, and the routing fields.
- **`validatePlan`:** validate/clamp the new fields with the existing helpers (`uniqueStrings`, `clampEnum`-style allow-lists). Fall back to a service-derived default when the model omits them.
- **Heuristic fallback (`heuristicPlan`) + clarification:** add a small `service → {signals, scanTargets, strategy}` map so the no-key/offline path still returns a coherent service-aware plan. Service is inferred from the brief when not provided (mirror the frontend's `inferBriefService`). If `service` cannot be determined and no signals can be derived, fall through to the existing query flow (do not block on service).

### 2. Frontend types + mapping — `src/components/landing/LeadGeneratorSection.tsx`

- `FreeSearchPlan` and the edge `SearchPlan` gain `service`, `strategy`, `opportunitySignals`, `scanTargets`.
- `submitFreeSearchText` sends `service` in the planner request body. AI-assisted mode has no service chip, so it derives `service` as: `selectedService` if set, else `inferBriefService(brief)` (existing helper). Empty string is allowed — the planner then infers the service itself or asks for it.
- `planToSearchConfig` carries the new fields onto `SearchConfig` where they already have homes (`selectedService`, `opportunitySignals`) and keeps `strategy`/`scanTargets`/`queryVariants` on the plan object for display + persistence.
- **Resilience:** when the planner response omits the new fields (older deploy, heuristic), synthesize them on the frontend from the service using the existing `getServiceRecommendedSignalKeys` + a short strategy template, so the card is never empty. Demo (`?demo=1`) uses the local fallback path and shows a fully populated plan.

### 3. Scan plan card UI — AI-assisted (`free`) block in `LeadGeneratorSection.tsx`

Add three elements below the existing service/market/location/size rows, inside the scrollable plan body:
- **Strategy** — the `strategy` sentence, in muted body text under a mono "Strategy" label.
- **Search queries** — the `queryVariants` rendered as a compact list (mono, one per line, truncated), under a "Search queries" label. This is the centerpiece: the concrete queries the agent will run.
- **Looking for** — chips for `opportunitySignals` (human labels via existing `opportunitySignalLabels`) and `scanTargets` (page names). Worded as the agent's plan, not as completed detection.

Copy must not imply detection the extractor doesn't do yet (e.g. label the section "The agent will look for", not "Detected").

### 4. Persistence — `search_sessions`

Add a nullable `agent_plan jsonb` column (new migration) storing the authored plan (`service`, `strategy`, `queryVariants`, `opportunitySignals`, `scanTargets`) so the next (execution) project can consume it. `createSearchSession` includes it when present; its existing try/catch fallback already strips unknown columns for older schemas, so this is non-breaking. `opportunity_signals` continues to be written as today.

## Data Flow

1. User describes the prospects in the AI-assisted chat.
2. `submitFreeSearchText` → `plan-lead-search` with `{ brief, messages, service, currentKeyword, currentLocation, userProfile }`.
3. Planner returns `state: ready` with the enriched `plan` (or `needs_clarification`, possibly asking for the service).
4. `planToSearchConfig` maps it; `setFreePlan` stores plan + config.
5. Scan plan card renders Strategy · Search queries · Looking-for chips.
6. On Start, `startFreeSearch` runs the existing search (unchanged) and `createSearchSession` persists `agent_plan`.

## Error Handling

- No `GEMINI_API_KEY` / Gemini error / non-OK: existing fallback to `heuristicPlan` (now service-aware) or `clarificationResponse`. Unchanged control flow.
- Model returns malformed/empty new fields: `validatePlan` clamps or synthesizes service-derived defaults; never throws on the new fields.
- Frontend missing new fields: synthesized from service so the card is always populated.
- `agent_plan` column absent (older DB): insert falls back via the existing column-stripping catch.

## Testing

- **Edge unit-ish (Deno):** `validatePlan` clamps bad `opportunitySignals`/`scanTargets`, fills service-derived defaults when omitted, preserves valid values; `heuristicPlan` returns service-aware signals/strategy for representative services (web design, SEO, booking) and degrades gracefully when service is unknown.
- **Frontend:** `planToSearchConfig` carries the new fields; the synthesis fallback produces non-empty signals/strategy when the plan omits them.
- **Manual check (`?demo=1`):** AI-assisted → describe "web design for dentists in Austin" → plan card shows a service-tailored strategy, concrete queries, and looking-for chips; Start still runs the existing demo flow.
- `npm.cmd run build` green.

## Rollout / Reversibility

Frontend and edge changes are additive and independently deployable (frontend tolerates old planner responses; planner tolerates requests without `service`). The migration is additive and nullable. Revert = drop the card additions; the extra plan fields are harmless if unused.
