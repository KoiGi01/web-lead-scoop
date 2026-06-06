# Opportunity Signal Detection — Design Spec

Date: 2026-06-05
Status: Approved for planning
Relates to: `REWORK_PLAN.md` Phase 4 (Rule-Based Signal Detection), and its stated dependency in `EXTRACTION_AUDIT.md`.

## Summary

This spec unblocks Phase 4 by making the live search produce real, evidence-backed
opportunity signals. The key enabler: `extract-contacts` already scrapes the full
homepage + contact-page HTML and `links` array via Firecrawl, then discards almost all
of it. We derive structured website facts from data already in hand (zero extra API
calls), pull review data from the Google Places call (free, already on the Enterprise
SKU), and interpret those facts into scored, evidenced signals in a pure, unit-tested
module.

## Goals

- Return a structured `websiteSignals` facts object from `extract-contacts`.
- Add `rating` + `reviewCount` to `search-places` output (free SKU-wise).
- Interpret facts into the 8 named opportunity signals with confidence + evidence,
  emitting **only the user's selected signal keys**.
- Keep detection deterministic, free, and fast (no external/slow APIs).
- Design the detector to be pluggable so future async enrichers (PageSpeed, etc.) slot
  in additively.

## Non-Goals (deferred to later specs)

- Persisting detected signals to `saved_leads.intelligence` or any DB column.
- Redesigned opportunity result cards (Phase 5).
- AI opportunity scoring / outreach angles (Phase 6).
- Opportunity exports (Phase 7).
- External/paid/slow enrichment APIs — PageSpeed Insights, SEMrush-class tools
  (Phase 6/8, where async + caching + budgets already have to exist).

Detected signals will live on the in-memory lead object only. Save/reload and UI
wiring are out of scope here.

## Decisions (from brainstorming)

1. **Scope:** raw structured facts **and** interpreted signals — but not persistence.
2. **Coverage:** all 8 signals, pulling Google Places rating/review data in.
3. **Architecture (split):** fact-gathering lives in the `extract-contacts` edge
   function (it has the HTML); interpretation lives in a pure `src/lib` module so it is
   Vitest-testable, matching the repo's existing pattern (`opportunitySignals.ts`,
   `scanPlan.ts`).
4. **Detect behavior:** the edge function parses all cheap raw facts, but the detector
   emits **only the user's selected signal keys**. Selected-only output, per product
   choice.
5. **Enrichment:** external APIs deferred. SEMrush/Ahrefs/Moz are not free and are not
   used. Free in-HTML checks (tech-stack detection, SSL/HTTPS) are gathered now as
   facts that feed existing signals (mainly `weak_website`), not as new signal keys.
   The detector is designed pluggable so PageSpeed and per-service enrichers can be
   added later without rework.

## Data Shapes

### `WebsiteSignals` — returned by `extract-contacts`

Added alongside the existing response fields (`emails`, `contacts`, `socialLinks`, etc.).

```ts
interface WebsiteSignals {
  pagesScanned: string[];          // urls actually fetched (homepage + contact pages)
  title?: string;                  // <title> of homepage
  metaDescription?: string;
  homepageTextLength: number;      // stripped body length (thin-site hint)
  contactFormFound: boolean;       // <form> with email/contact-like inputs
  bookingLinks: string[];          // calendly/acuity/booksy/"book"/"appointment" hrefs
  ctaTexts: string[];              // button/link texts matching action verbs
  socialLinks: string[];           // reuse existing extraction
  hasGenericInboxOnly: boolean;    // all emails are generic (info@/contact@), no person inbox
  techStack: string[];             // free, from HTML: ["wix"], ["wordpress","elementor"], ...
  ssl: { valid: boolean; httpsRedirect: boolean };
  evidence: Array<{ signal: string; sourceUrl: string; snippet: string }>;
}
```

### `DetectedSignal` and the detector — `src/lib/detectOpportunitySignals.ts`

```ts
import { OpportunitySignalKey } from "@/lib/opportunitySignals";

interface EnrichmentContext {
  rating?: number;
  reviewCount?: number;
  techStack?: string[];            // populated now (free, from HTML)
  ssl?: { valid: boolean; httpsRedirect: boolean }; // populated now (free)
  // future, async, populated by separate enrichers — undefined in this spec:
  pageSpeed?: { performance: number; lcpMs: number; mobileFriendly: boolean };
}

interface DetectedSignal {
  key: OpportunitySignalKey;       // only selected keys emitted
  present: boolean;                // is the gap detected
  confidence: number;              // 0–100
  evidence?: { sourceUrl: string; snippet: string };
}

function detectOpportunitySignals(
  facts: WebsiteSignals,
  context: EnrichmentContext,
  selectedKeys: OpportunitySignalKey[],
): DetectedSignal[];
```

The raw `WebsiteSignals` always contains all facts; `detectOpportunitySignals` only
emits entries for `selectedKeys`. Each rule reads what's present in `context` and
degrades gracefully when a field is absent, so adding an enricher later is purely
additive.

## Detection Rules (deterministic, v1)

Thresholds are named constants in the module so they are tunable.

| Signal | Rule (present/high-confidence when…) |
|---|---|
| `weak_website` | `homepageTextLength` below threshold, or missing `title`/`metaDescription`, or `techStack` indicates a default/builder template, or `ssl.valid` is false. |
| `no_booking` | `bookingLinks` empty **and** no booking-verb CTA in `ctaTexts`. |
| `no_clear_cta` | `ctaTexts` has no action verb (book / quote / call / contact / get started). |
| `generic_inbox` | `hasGenericInboxOnly` is true. |
| `no_contact_form` | `contactFormFound` false **and** `contactPageFound` false. |
| `no_social_links` | `socialLinks` empty. |
| `low_reviews` | `reviewCount` below threshold (default < 15). |
| `weak_local_presence` | low `reviewCount` **and** (no website or no rating). |

Each emitted signal carries an evidence snippet: the page URL plus the matched text, or
a deterministic absence message (e.g. "no booking link found across N pages scanned").
The two Places-based signals degrade to low confidence when rating data is absent.

## Architecture & Data Flow

1. **`search-places`** (`supabase/functions/search-places/index.ts`): add
   `places.rating,places.userRatingCount` to the field mask (lines ~107 and ~133); add
   `rating` and `reviewCount` to the mapped business object (line ~176). Free — the
   request is already billed at the Enterprise SKU (`nationalPhoneNumber`, `websiteUri`
   already in the mask; confirmed by `GOOGLE_TEXT_SEARCH_ENTERPRISE_COST_USD`).

2. **`extract-contacts`** (`supabase/functions/extract-contacts/index.ts`): after the
   existing scrape loop, build `WebsiteSignals` from the `html` / `links` / `pageTexts`
   it already has, plus a free tech-stack regex pass and an SSL/HTTPS check on the
   scrape URL. Add `websiteSignals` to the JSON response. **No new Firecrawl calls.**
   Extract a pure helper (HTML string + links → partial facts) so fact-gathering can be
   unit-tested without Deno.

3. **Client** (`src/components/landing/LeadGeneratorSection.tsx`, around line 1570):
   map `websiteSignals` onto the lead object, then call
   `detectOpportunitySignals(websiteSignals, { rating, reviewCount, techStack, ssl }, selectedSignalKeys)`
   and attach the result to the in-memory lead. Save/UI wiring deferred.

## Testing

- `src/lib/detectOpportunitySignals.test.ts` — table-driven Vitest tests: fixture
  `WebsiteSignals` + context → expected `DetectedSignal[]`, covering each of the 8
  rules, the "only selected keys emitted" behavior, and graceful degradation when
  rating / techStack / ssl are absent.
- Unit test the extracted fact-builder helper (pure: HTML string → partial facts).
- **Acceptance criterion:** the detector flags a hand-labeled set of ~6 fixture sites
  at an agreed precision, satisfying the Phase 4 acceptance-criteria requirement.
- Per CLAUDE.md, run `npm.cmd run build` and `npm.cmd run test` before marking done.

## Implementation Parts

The work breaks into four independently-verifiable parts:

- **Part A — Places data:** `search-places` returns `rating` + `reviewCount`.
- **Part B — Fact gathering:** `extract-contacts` returns `websiteSignals` (incl.
  tech-stack + SSL), with a pure fact-builder helper.
- **Part C — Detector module:** `src/lib/detectOpportunitySignals.ts` + tests.
- **Part D — Client wiring:** map `websiteSignals` and call the detector in
  `LeadGeneratorSection`, attaching results to the in-memory lead.

## Codex Verification Prompts

Run these after each part is implemented. Each is self-contained; paste into Codex with
the repo open. They verify behavior and guardrails, not just compilation.

### Part A — `search-places` rating/reviews

```
In supabase/functions/search-places/index.ts, verify the Google Places integration now
returns review data without changing the billing tier:
1. Confirm the field mask (both the X-Goog-FieldMask header and the field_mask body
   param) includes places.rating and places.userRatingCount.
2. Confirm the mapped business object includes `rating` (number|undefined) and
   `reviewCount` (number|undefined) sourced from place.rating and
   place.userRatingCount.
3. Confirm NO new fields outside the Enterprise SKU were added (the mask should still
   only contain Pro/Enterprise-tier fields — no reviews, no Atmosphere fields), so cost
   per request is unchanged.
4. List any place where a missing rating/userRatingCount could throw instead of
   degrading to undefined.
Report pass/fail per item with the exact lines.
```

### Part B — `extract-contacts` websiteSignals

```
In supabase/functions/extract-contacts/index.ts, verify the new websiteSignals output:
1. Confirm the response JSON now includes a `websiteSignals` object matching the
   WebsiteSignals shape in docs/superpowers/specs/2026-06-05-opportunity-signal-
   detection-design.md (pagesScanned, title, metaDescription, homepageTextLength,
   contactFormFound, bookingLinks, ctaTexts, socialLinks, hasGenericInboxOnly,
   techStack, ssl, evidence).
2. CRITICAL: confirm NO additional fetch()/Firecrawl calls were added for signal
   detection — websiteSignals must be derived only from HTML/links already scraped in
   the existing homepage + contact-page loop. Grep for fetch( and count calls; they
   should match the pre-change count.
3. Confirm fact-gathering is a pure, exported helper that takes HTML + links (no
   network, no Deno globals) so it is unit-testable.
4. Confirm the function still returns all pre-existing fields (emails, whatsapp,
   contactPageFound, linkedinUrl, socialLinks, contacts, emailSource) unchanged —
   backward compatibility.
5. Confirm evidence entries each have signal, sourceUrl, and snippet.
Report pass/fail per item with exact lines.
```

### Part C — `detectOpportunitySignals` module

```
Review src/lib/detectOpportunitySignals.ts and its test file. Then run:
  npm.cmd run test -- detectOpportunitySignals
Verify:
1. detectOpportunitySignals(facts, context, selectedKeys) emits entries ONLY for keys
   in selectedKeys — never an unselected signal. Add/confirm a test proving this.
2. Each of the 8 rules matches the table in the design spec. Confirm thresholds are
   named constants, not inline magic numbers.
3. low_reviews and weak_local_presence degrade to low confidence (and do not throw)
   when context.rating/reviewCount are undefined. Confirm a test covers this.
4. weak_website confidence is boosted by techStack/ssl facts when present, but still
   works when they are absent (graceful degradation). Confirm a test covers this.
5. Every emitted present:true signal has an evidence object with sourceUrl + snippet.
6. All tests pass. Paste the test run summary.
Report pass/fail per item.
```

### Part D — Client wiring

```
In src/components/landing/LeadGeneratorSection.tsx, verify the detector is wired into
the live search flow:
1. The extract-contacts response's websiteSignals is mapped onto the lead object
   (around line 1570) alongside the existing emails/contacts/socialLinks mapping.
2. detectOpportunitySignals is called with the user's SELECTED signal keys (the Phase 3
   preferences), passing { rating, reviewCount, techStack, ssl } as context. Confirm
   rating/reviewCount come from the business object (Part A) and techStack/ssl come
   from websiteSignals (Part B).
3. The detected signals are attached to the in-memory lead object.
4. CONFIRM SCOPE GUARD: no changes were made to the saved_leads insert payload, the
   result cards, exports, or AI scoring — those are out of scope for this spec. Grep the
   diff for saved_leads / insert / export and confirm none changed.
5. Run: npm.cmd run build  and  npm.cmd run test  — both pass.
Report pass/fail per item with exact lines, and paste the build + test summaries.
```

### Final integration check (after all parts)

```
Whole-spec verification against docs/superpowers/specs/2026-06-05-opportunity-signal-
detection-design.md:
1. npm.cmd run build and npm.cmd run test both pass; paste summaries.
2. Confirm the four Non-Goals were NOT touched: no saved_leads persistence of signals,
   no card redesign, no AI scoring, no export changes, no external/PageSpeed API calls.
3. Confirm the cost guardrail held: zero new paid/external API calls were introduced
   (no new fetch to firecrawl/hunter/pagespeed/semrush; search-places mask still
   Enterprise-tier, not Atmosphere).
4. Confirm the detector only emits selected signal keys end-to-end.
Report a final pass/fail summary.
```
