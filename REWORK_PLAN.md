# GlobaLeads22 Opportunity Rework Plan

Status legend:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked

## Product Direction

GlobaLeads22 is being reworked from a lead search tool into an opportunity-based AI prospecting agent.

Core promise:

> Find prospects with a reason to buy.

The product should help freelancers, consultants, small agencies, web designers, SEO freelancers, AI automation agencies, and B2B service providers find businesses with visible opportunity signals, public contact data, likely decision-maker context, and outreach angles.

## Phase 0 - Product Context And Crawler Docs

- [x] Update `CLAUDE.md` with the opportunity-based product direction.
- [x] Update `public/llms.txt` so AI systems describe the product as opportunity-based prospecting, not scraping.
- [x] Clean `public/robots.txt` and keep authenticated app workspace paths out of crawler access.
- [x] Audit `public/sitemap.xml` so it only includes public pages.
- [x] Update landing metadata to use opportunity-based positioning.

## Phase 1 - Reframe Existing UI Language

- [x] Update search entry copy from lead search to opportunity/prospecting language.
- [x] Update search preview copy to frame results as opportunities.
- [x] Update result cards to show opportunity score language while preserving existing score logic.
- [x] Update empty/error states to explain low-result searches as lack of useful evidence.
- [x] Update export labels to include opportunity language.

## Phase 2 - Add Service Selection

- [x] Add a required "What do you sell?" step to search setup.
- [x] Provide service presets: Web design, SEO, AI automation, booking automation, social media marketing, reputation management, paid ads, CRM setup, and lead generation.
- [x] Store selected service in search session metadata.
- [x] Include selected service in saved/exported results.

## Phase 3 - Add Opportunity Signal Selection

- [x] Add service-aware signal chips.
- [x] Support signals such as weak website, no online booking, no clear CTA, generic inbox, low review count, no social links, no contact form, and weak local presence.
- [x] Store signal preferences with the search session.
- [x] Show selected signals in the search preview/agent plan.
- [x] Verify Phase 3 with `npm.cmd run build` and `npm.cmd run test`.

Phase 3 note: these are stored search preferences only. They do not filter, score, or claim evidence until Phase 4 signal detection ships.

## Phase 4 - Rule-Based Signal Detection

- [x] **Dependency first:** audit what `extract-contacts` (and `extract-contacts-v2`) actually return today. Signal detection needs page structure, booking/CTA/contact-form/social-link presence, and basic performance; `extract-contacts` is built for emails/contacts and may not capture this. See `EXTRACTION_AUDIT.md`.
- [x] Detect simple visible signals from existing public website/contact data. Shipped: `extract-contacts` returns a structured `websiteSignals` object (from already-scraped HTML, zero new API calls), `search-places` returns free `rating`/`reviewCount`, and `src/lib/detectOpportunitySignals.ts` interprets these into the 8 signals (selected keys only, with confidence + evidence). Wired into the live search as in-memory `lead.detectedSignals`.
- [x] Add opportunity signal and evidence fields to saved results. Shipped: `src/lib/leadIntelligence.ts` (`buildLeadIntelligence`) writes detected signals into `saved_leads.intelligence` on save — `detectedIssues` (present-signal labels) feeds the existing saved-leads UI, and `intelligence.signals` (version, service, `detected[]`, curated `website` subset) stores the detector output for Phase 5. New saves only; no backfill of existing rows.
- [ ] Display top signals on generated and saved result cards. (Deferred to Phase 5.)
- [ ] Add diagnostics for rejected or low-signal businesses.

Phase 4 status (2026-06-06): detection shipped and verified via PR #3 on branch `feat/opportunity-signal-detection`. Spec `docs/superpowers/specs/2026-06-05-opportunity-signal-detection-design.md`, plan `docs/superpowers/plans/2026-06-05-opportunity-signal-detection.md`. `npm.cmd run build` + 33 tests pass; per-part Codex verification confirmed no new external calls and an unchanged Places SKU. Decision: `weak_local_presence` keys off low reviews **and** weak rating (< 4.0) rather than the literal "no website" rule, which is near-dead in the live flow (extraction only runs on websited businesses); the spec was updated to match. Edge functions `search-places` (v35) and `extract-contacts` (v44) deployed to project `uoaxxxoqasczxcxygscy` on 2026-06-06; the shared `_shared/websiteSignals.ts` module bundled cleanly.

Persistence shipped (2026-06-06) via PR #4 (branch `feat/persist-opportunity-signals`, frontend-only — no edge redeploy). Spec `docs/superpowers/specs/2026-06-06-persist-opportunity-signals-design.md`, plan `docs/superpowers/plans/2026-06-06-persist-opportunity-signals.md`. `npm.cmd run build` + 38 tests pass; Codex Part A/B verified the scope guard held. Decision: Phase 6 AI fields (`opportunityScore`, `positioning`, pitch/outreach) are intentionally left unwritten so rule-based detection does not collide with future AI scoring.

Remaining before Phase 4 fully closes: low-signal diagnostics, and a live opportunity-mode smoke test (search → save → reload, confirm chips persist).

## Phase 5 - Opportunity Result Cards

- [ ] Redesign cards around opportunity score, buying signals, person/company, why this prospect, outreach angle, and contact availability.
- [ ] Move secondary contact details into a detail panel.
- [ ] Keep cards compact enough for the pipeline and inbox.

## Phase 6 - AI Opportunity Scoring

> Cost guardrails ship **with** this phase, not in Phase 8. Phase 6 is the first uncapped per-prospect AI spend on a credit-billed product; introducing it before any budget/caching exists risks cost blowout across Phases 6–7.

- [ ] Refactor or reuse `analyze-lead` for evidence-based opportunity scoring.
- [ ] Generate why-this-prospect, outreach angle, and optional first-message copy.
- [ ] Require evidence references for AI claims.
- [ ] Add fallback copy when AI scoring fails.
- [ ] Run AI only after rule-based prequalification (moved up from Phase 8).
- [ ] Add a basic per-search AI budget cap (moved up from Phase 8).
- [ ] Cache domain analysis by domain + service + analysis version (moved up from Phase 8).

## Phase 7 - Opportunity Exports

- [ ] Add opportunity score, top signals, evidence URL/snippet, outreach angle, and suggested message to exports.
- [ ] Keep existing company, contact, phone, email, website, and CRM fields.

## Phase 8 - Cost Controls And Caching

> Basic budget, prequalification gating, and domain caching move to Phase 6. Phase 8 hardens and generalizes them.

- [ ] Add per-search provider budgets (extend beyond the Phase 6 AI cap to all providers).
- [ ] Generalize/tune domain-analysis caching across services and versions.
- [ ] Return partial results instead of stalling when budget/time runs out.
- [ ] Add admin cost visibility for opportunity-scoring spend.

## Phase 9 - Agent Workflow

- [ ] Replace advanced knobs with an agent-style search brief.
- [ ] Show an agent plan before credits are spent.
- [ ] Add refinement actions like stronger website gaps, public emails, booking gaps, and nearby-city expansion.

## Cross-Cutting Requirements

These apply to every phase that touches the live search flow.

- [x] **Feature flag.** Gate opportunity-mode behind a flag so the current search/credits/save/export/CRM flow (the live revenue path) stays default until each phase is proven. The current gate supports `VITE_ENABLE_OPPORTUNITY_MODE=true`, `?opportunity=1`, `?opportunityMode=1`, and the `globaleads-opportunity-mode` localStorage key.
- [ ] **Acceptance criteria per phase.** Each phase defines what "done" means before it starts (e.g. Phase 4: signal detectors flag a known test set of domains with an agreed precision; Phase 6: AI output always carries an evidence reference or falls back).
- [ ] **Verification per phase.** Run `npm.cmd run build` and `npm.cmd run test` before marking any phase done (per CLAUDE.md). Add/adjust tests for new detection and scoring logic.
- [ ] **Status hygiene.** Keep this file's checkboxes in sync with shipped code — re-baseline against the codebase at the start of each phase rather than trusting prior status.

## Notes

- The public landing page is user-owned for the next pass. Continue the app/backend rework without coupling product phases to landing-page edits.
- Do not expose provider/tooling names in normal customer UI.
- Use "public contact data", "likely decision maker", "opportunity signals", "ranked prospects", and "outreach angle".
- Avoid "scraper", "scraping", "harvesting", "guaranteed emails", and "guaranteed decision makers" in public copy.
- Keep existing search, billing, saved leads, exports, and CRM behavior stable during the rework.
