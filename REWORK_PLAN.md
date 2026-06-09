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

**Phase 3 gap (found 2026-06-07):** the interactive signal **selector was never wired into the UI**. `toggleOpportunitySignal` and `opportunitySignalOptions` are defined/imported in `LeadGeneratorSection.tsx` but never rendered. Signals are only auto-derived from the chosen service (top 3, via `selectService`) and only when opportunity mode is ON; the only on-screen signal view is the read-only "The agent will look for…" plan preview. A user cannot pick or confirm signals.

**Resolved 2026-06-07** (branch `feat/phase4-signal-diagnostics`): the selector is now wired. In manual + opportunity mode, an "Opportunity signals" card under "What do you sell?" renders **only the service-relevant** signals (new tested helper `getServiceSignalKeys` — never all 8; e.g. Social media marketing shows just Low reviews + No social links) as toggle chips bound to `toggleOpportunitySignal`. The service still seeds sensible defaults; search now requires ≥1 signal when opportunity mode is on. Frontend-only; `opportunitySignals` already flows to the detector. 46/46 tests + build pass.

## Phase 4 - Rule-Based Signal Detection

- [x] **Dependency first:** audit what `extract-contacts` (and `extract-contacts-v2`) actually return today. Signal detection needs page structure, booking/CTA/contact-form/social-link presence, and basic performance; `extract-contacts` is built for emails/contacts and may not capture this. See `EXTRACTION_AUDIT.md`.
- [x] Detect simple visible signals from existing public website/contact data. Shipped: `extract-contacts` returns a structured `websiteSignals` object (from already-scraped HTML, zero new API calls), `search-places` returns free `rating`/`reviewCount`, and `src/lib/detectOpportunitySignals.ts` interprets these into the 8 signals (selected keys only, with confidence + evidence). Wired into the live search as in-memory `lead.detectedSignals`.
- [x] Add opportunity signal and evidence fields to saved results. Shipped: `src/lib/leadIntelligence.ts` (`buildLeadIntelligence`) writes detected signals into `saved_leads.intelligence` on save — `detectedIssues` (present-signal labels) feeds the existing saved-leads UI, and `intelligence.signals` (version, service, `detected[]`, curated `website` subset) stores the detector output for Phase 5. New saves only; no backfill of existing rows.
- [ ] Display top signals on generated and saved result cards. (Deferred to Phase 5.)
- [x] Add diagnostics for rejected or low-signal businesses. **Shipped 2026-06-07** (branch `feat/phase4-signal-diagnostics`): internal/admin-only, NOT customer-facing (per decision "we don't have to show the customer where the app failed"). Pure helper `src/lib/signalDiagnostics.ts` (`computeSignalDiagnostics`, unit-tested) computes per search: sites scanned (website candidates) / unreadable (scrape failed → no `websiteSignals`) / surfaced ≥1 signal, plus per-selected-signal present counts. Rendered as an `isAdmin`-gated block in the existing post-search panel (`LeadGeneratorSection.tsx`, `SearchDiagnostics.signals`). Aggregate only (no per-card — that's Phase 5); no new API calls; no persistence (ephemeral per-search readout). `npm.cmd run test` 41/41 + `npm.cmd run build` pass.

Phase 4 status (2026-06-06): detection shipped and verified via PR #3 on branch `feat/opportunity-signal-detection`. Spec `docs/superpowers/specs/2026-06-05-opportunity-signal-detection-design.md`, plan `docs/superpowers/plans/2026-06-05-opportunity-signal-detection.md`. `npm.cmd run build` + 33 tests pass; per-part Codex verification confirmed no new external calls and an unchanged Places SKU. Decision: `weak_local_presence` keys off low reviews **and** weak rating (< 4.0) rather than the literal "no website" rule, which is near-dead in the live flow (extraction only runs on websited businesses); the spec was updated to match. Edge functions `search-places` (v35) and `extract-contacts` (v44) deployed to project `uoaxxxoqasczxcxygscy` on 2026-06-06; the shared `_shared/websiteSignals.ts` module bundled cleanly.

Persistence shipped (2026-06-06) via PR #4 (branch `feat/persist-opportunity-signals`, frontend-only — no edge redeploy). Spec `docs/superpowers/specs/2026-06-06-persist-opportunity-signals-design.md`, plan `docs/superpowers/plans/2026-06-06-persist-opportunity-signals.md`. `npm.cmd run build` + 38 tests pass; Codex Part A/B verified the scope guard held. Decision: Phase 6 AI fields (`opportunityScore`, `positioning`, pitch/outreach) are intentionally left unwritten so rule-based detection does not collide with future AI scoring.

Remaining before Phase 4 fully closes: only the live opportunity-mode smoke test (search → save → reload, confirm chips persist). Low-signal diagnostics shipped 2026-06-07 (see above).

### Findings & open items (2026-06-07)

- **Live chain still UNVERIFIED in production.** An attempted prod smoke test (SEO → "Roofing Companies" → Tulsa, OK, Simple+Enrich, admin, 8 leads, session `ce006a98-c9ad-4ec9-9741-1608f538e032`) ran with **opportunity mode OFF**, so `opportunity_signals` was empty → the detector emitted nothing → all 8 saved leads have `intelligence: null`. The detection + persistence **logic** is unit-verified (`npm.cmd run test` = 38/38 pass), but the deployed `extract-contacts`/`search-places` → detector → persist → reload chain has NOT been exercised live. **To run the smoke test:** enable the flag (`localStorage.setItem('globaleads-opportunity-mode','true')`, reload), pick a service (e.g. SEO → auto-selects `weak_website, low_reviews, no_social_links`), confirm the chips appear in the plan preview, search, save a couple leads, reload, then verify `saved_leads.intelligence.signals.detected[]` is populated.
- **Signal selector not wired** (see Phase 3 gap above). With the flag on, service auto-derivation makes the smoke test possible, but real user-driven selection still doesn't exist.
- **Production runs the `master` lineage** (the deployed app's nav labels — New scan / Prospects / Saved scans — exist only on `master`). `origin/main` is a STALE, disjoint history (no shared ancestor; none of the Phase 4 files). Do not treat `origin/main` as live.
- **Cost-accounting bug:** `extract-contacts` Enrich-mode `discoverPublicProfiles` (5 Firecrawl `/v1/search` per business) does not `logUsage`, so admin COGS understates Firecrawl spend in Enrich mode. The roofing session logged Firecrawl 30 / Hunter 6-of-10-billed / Google 7 = $0.4739, but real Firecrawl was ~50–70 credits. Fix is separate from Phase 4 but worth doing for honest COGS. **(FIXED 2026-06-08 — discovery now logs + is Hunter-gated; see "Firecrawl cost fix" below.)**
- **Verified vendor costs:** `FIRECRAWL_CREDIT_COST_USD=0.00083` and `GOOGLE_TEXT_SEARCH_ENTERPRISE_COST_USD=0.035` match reality; `HUNTER_CREDIT_COST_USD=0.034` overstates real Hunter (~$0.0149–0.0245/credit, billed only on hits). AI (Phase 6): `analyze-lead`=Claude Haiku 4.5, `plan-lead-search`=Gemini 2.5 Flash — neither cost-logged; add an AI cost constant + `api_usage_events` logging when AI scoring ships. Measured per-lead COGS: Normal ~$0.005–0.01, Enriched ~$0.03–0.05; detection adds $0. (Details in `CLAUDE.md` → Environment Variables.)

### Firecrawl cost fix & Enrich rework (2026-06-08, branch `feat/phase4-signal-diagnostics`)

Triggered by a real ~250-credit Firecrawl search. **Root cause:** in Enrich mode, `discoverPublicProfiles` ran 5 `/v1/search` calls per business (~10 credits; Firecrawl bills 2 per result-bearing query) for **every** business — the dominant search cost, and **largely redundant with Hunter**, which already returns name+title+email+LinkedIn (discovery only yields bare profile URLs). It was also unlogged, so admin COGS understated Firecrawl. Firecrawl billing confirmed: **per page, flat 1 credit** (not per-word/per-domain); `/v1/search` = 2 credits per 10 results.

Shipped — edge fn `extract-contacts` **deployed to prod** (`uoaxxxoqasczxcxygscy`); frontend **committed on branch but NOT yet Vercel-deployed**:

- **Discovery is now a Hunter-gated fallback** — runs only when Hunter returns 0 named contacts (or the homepage scrape fails, where Hunter can't run). ~60% Hunter hit-rate ⇒ skips most discovery ⇒ an enriched search drops ~250 → ~140–190 Firecrawl credits with no quality loss. Reordered flow: scrape → contact pages → Hunter → conditional discovery → signals.
- **Discovery spend now logged** to `api_usage_events` as `firecrawl`/`search` (2 cr per result-bearing query). Resolves the 2026-06-07 cost-accounting bug.
- **Enrich is now opt-in** (frontend) — removed the effect that force-enabled it in manual mode; added a toggle in the Advanced panel (default OFF); fixed cost/quality displays that hard-coded `enrich=true`. Default-off ⇒ most searches skip discovery + Hunter entirely.
- New doc `OPPORTUNITY_SIGNALS.md`: how each of the 8 signals is derived (Places + already-scraped HTML, $0 extra) + the verified Firecrawl billing model.
- **Decided AGAINST** blindly trimming the 5 discovery queries (would cut the fallback uniformly and hurt quality on Hunter-empty local businesses); gating gets the savings without that downside.

### App shell: top bar removed (2026-06-08, branch `feat/phase4-signal-diagnostics`, frontend-only, NOT deployed)

- Removed the global signed-in top header (breadcrumb / New scan / profile) to reclaim vertical space for the main section. Minimal logo + Sign in bar kept for signed-out/demo only.
- Account menu (Edit profile / Upgrade / Account settings / Sign out) moved into the **sidebar initials chip** (now a dropdown; collapsed-state supported, so no access is lost). New **Report a bug** sidebar button with a **"+100 credits when fixed"** incentive — ⚠ **UI promise only; no backend grant flow exists yet.**
- Fixed "Who & where" input alignment (equal-height label rows) + Chrome autofill painting a light bg over dark inputs (scoped `.dark-autofill` rule in `index.css`).
- Commits: `0557838` (edge gating + enrich + docs), `b613630` (app shell + input fixes). Build + 58 tests pass.

### Outstanding (next session)

- [ ] **Deploy the frontend.** All 2026-06-08 frontend work sits on `feat/phase4-signal-diagnostics`, undeployed. Vercel builds from the **`master` lineage** (per 2026-06-07 finding; `origin/main` is stale/disjoint — do NOT use). Merge branch → master and push. (Edge fn is already live.)
- [ ] **Verify gating live.** Run one Simple + Enrich search; query `api_usage_events` for the session — confirm `firecrawl/search` rows appear **only** where Hunter came up empty, and total Firecrawl credits dropped from ~250.
- [ ] **"+100 credits when fixed" needs a backend** — a real grant flow (even manual: label + credit-grant step) or soften the copy until it exists.
- [ ] **Mobile regression** — sidebar is `hidden md:flex`; with the header gone, phone-width has no nav/account menu. Add a mobile bar/hamburger if mobile matters (app is currently desktop-first).
- [ ] **Hunter COGS still overstated** (`HUNTER_CREDIT_COST_USD=0.034` vs real ~$0.0149–0.0245, billed only on hits) — quick default/env tweak for honest margins.
- [ ] Live opportunity-mode smoke test still pending (carried over from Phase 4 — flag on, search → save → reload, confirm `saved_leads.intelligence.signals.detected[]` populates).

## Phase 5 - Opportunity Result Cards

- [x] Redesign cards around opportunity score, buying signals, person/company, why this prospect, outreach angle, and contact availability. **Live search result cards shipped 2026-06-07** (`feat/phase4-signal-diagnostics`): compact card = company + rule-based opportunity score (`leadQualityScore`; AI `opportunityScore` stays Phase 6) + buying-signal chips (present `detectedSignals`, label + confidence, opportunity-mode only) + service-aware "Why this prospect" (pure `summarizeOpportunityCard` helper, TDD) + contact-availability badges.
- [x] Move secondary contact details into a detail panel. Collapsible "Details" panel (grid-rows animation, `inert` when collapsed, reduced-motion safe) holds per-signal evidence, the contact paths, the likely-decision-maker block, and a Phase-6 outreach-angle placeholder.
- [x] Keep cards compact enough for the pipeline and inbox. Compact-by-default; detail expands on demand. Matches the Refined Electric system; built with the `impeccable` skill.
- [ ] Mirror the redesign on the saved-leads surfaces (`ViewAllLeads` / `OpportunitiesDashboard`), which still render the older basic `detectedIssues` chips. (Follow-up; the persisted `intelligence.signals.detected[]` already has the data.)

Phase 5 note (2026-06-07): the live result card consumes in-memory `lead.detectedSignals`. Visual confirmation in the running app is pending the deferred live smoke test (build + 51 tests pass; not yet screenshotted with real data).

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
