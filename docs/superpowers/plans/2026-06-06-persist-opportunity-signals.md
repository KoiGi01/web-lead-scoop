# Persist Opportunity Signals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist per-lead detected opportunity signals into the existing `saved_leads.intelligence` JSON on save, and surface them in the existing saved-leads UI via `detectedIssues`.

**Architecture:** A pure `src/lib/leadIntelligence.ts` helper maps the detector output (`lead.detectedSignals` + `lead.websiteSignals`) into a `LeadIntelligencePayload` (`detectedIssues` for display + namespaced `signals` for durability). The save path writes it into the insert payload; the saved-leads view already reads `intelligence`, so only its type needs extending. No migration, no edge-function changes, no Phase 5/6 work.

**Tech Stack:** TypeScript, Vite/Vitest, Supabase JS client.

**Spec:** `docs/superpowers/specs/2026-06-06-persist-opportunity-signals-design.md`

---

## File Structure

- **Create** `src/lib/leadIntelligence.ts` — `buildLeadIntelligence()` + `LeadIntelligencePayload`/`PersistedSignals`/`WebsiteSignalsSummary` types.
- **Create** `src/lib/leadIntelligence.test.ts` — Vitest tests for the helper.
- **Modify** `src/components/landing/LeadGeneratorSection.tsx` — write `intelligence` into the insert payload + extend the schema-cache fallback.
- **Modify** `src/components/landing/ViewAllLeads.tsx` — extend `LeadIntelligence` with optional `signals`.

---

## Task 1: `buildLeadIntelligence` helper (TDD)

**Files:**
- Create: `src/lib/leadIntelligence.ts`
- Test: `src/lib/leadIntelligence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/leadIntelligence.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildLeadIntelligence } from "@/lib/leadIntelligence";
import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";
import type { DetectedSignal } from "@/lib/detectOpportunitySignals";
import type { OpportunitySignalKey } from "@/lib/opportunitySignals";

const facts = (o: Partial<WebsiteSignals> = {}): WebsiteSignals => ({
  pagesScanned: ["https://acme.com"],
  title: "Acme",
  metaDescription: "desc",
  homepageTextLength: 4000,
  contactFormFound: true,
  contactPageFound: true,
  bookingLinks: [],
  ctaTexts: ["Book now", "Learn more"],
  socialLinks: ["https://instagram.com/acme"],
  hasGenericInboxOnly: false,
  techStack: ["wordpress"],
  ssl: { valid: true, httpsRedirect: true },
  evidence: [{ signal: "x", sourceUrl: "https://acme.com", snippet: "s" }],
  ...o,
});

const sig = (key: OpportunitySignalKey, present: boolean, confidence = 70): DetectedSignal => ({
  key,
  present,
  confidence,
  evidence: { sourceUrl: "https://acme.com", snippet: "x" },
});

describe("buildLeadIntelligence", () => {
  it("returns null when websiteSignals is missing", () => {
    expect(buildLeadIntelligence([sig("no_booking", true)], undefined, "Web design")).toBeNull();
  });

  it("returns null when detectedSignals is missing or empty", () => {
    expect(buildLeadIntelligence(undefined, facts(), "Web design")).toBeNull();
    expect(buildLeadIntelligence([], facts(), "Web design")).toBeNull();
  });

  it("detectedIssues contains labels for ONLY present signals", () => {
    const out = buildLeadIntelligence(
      [sig("no_booking", true), sig("no_social_links", false)],
      facts(),
      "Web design",
    )!;
    expect(out.detectedIssues).toContain("No booking flow");
    expect(out.detectedIssues).not.toContain("No social links");
  });

  it("curates the website subset (no ctaTexts, no evidence)", () => {
    const out = buildLeadIntelligence([sig("no_booking", true)], facts(), "Web design")!;
    expect(out.signals.website).not.toHaveProperty("ctaTexts");
    expect(out.signals.website).not.toHaveProperty("evidence");
    expect(out.signals.website).toHaveProperty("title", "Acme");
    expect(out.signals.website).toHaveProperty("techStack");
    expect(out.signals.website.ssl.valid).toBe(true);
  });

  it("round-trips detected, sets version 1, and trims service", () => {
    const detected = [sig("no_booking", true)];
    const out = buildLeadIntelligence(detected, facts(), "  Web design  ")!;
    expect(out.signals.detected).toEqual(detected);
    expect(out.signals.version).toBe(1);
    expect(out.signals.service).toBe("Web design");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd run test -- leadIntelligence --run`
Expected: FAIL with `Failed to resolve import "@/lib/leadIntelligence"` / `buildLeadIntelligence is not a function`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/leadIntelligence.ts`:

```ts
import { opportunitySignalLabels } from "@/lib/opportunitySignals";
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
  detected: DetectedSignal[];
  website: WebsiteSignalsSummary;
}

export interface LeadIntelligencePayload {
  detectedIssues: string[];
  signals: PersistedSignals;
}

export function buildLeadIntelligence(
  detectedSignals: DetectedSignal[] | undefined,
  websiteSignals: WebsiteSignals | undefined,
  service: string,
): LeadIntelligencePayload | null {
  if (!websiteSignals || !detectedSignals || detectedSignals.length === 0) return null;

  const detectedIssues = detectedSignals
    .filter(signal => signal.present)
    .map(signal => opportunitySignalLabels[signal.key] || signal.key);

  const website: WebsiteSignalsSummary = {
    pagesScanned: websiteSignals.pagesScanned,
    title: websiteSignals.title,
    metaDescription: websiteSignals.metaDescription,
    homepageTextLength: websiteSignals.homepageTextLength,
    contactFormFound: websiteSignals.contactFormFound,
    contactPageFound: websiteSignals.contactPageFound,
    bookingLinks: websiteSignals.bookingLinks,
    socialLinks: websiteSignals.socialLinks,
    hasGenericInboxOnly: websiteSignals.hasGenericInboxOnly,
    techStack: websiteSignals.techStack,
    ssl: websiteSignals.ssl,
  };

  return {
    detectedIssues,
    signals: {
      version: 1,
      service: service.trim(),
      detected: detectedSignals,
      website,
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- leadIntelligence --run`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/leadIntelligence.ts src/lib/leadIntelligence.test.ts
git commit -m "feat: add buildLeadIntelligence helper to persist detected signals"
```

---

## Task 2: Wire persistence into save + read type

**Files:**
- Modify: `src/components/landing/LeadGeneratorSection.tsx`
- Modify: `src/components/landing/ViewAllLeads.tsx`

No new test harness here; verify via build + full suite + the Part B Codex prompt.

- [ ] **Step 1: Import the helper**

In `src/components/landing/LeadGeneratorSection.tsx`, directly below the existing
`import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";`
line (added in the detection slice), add:

```ts
import { buildLeadIntelligence } from "@/lib/leadIntelligence";
```

- [ ] **Step 2: Write `intelligence` into the insert payload**

In the same file, update the `payload` map (currently lines 1360-1375) to add the
`intelligence` field as the last property of each row:

```ts
      const payload = leads.map(lead => ({
        user_id: user.id,
        session_id: sessionId,
        selected_service: config.selectedService || null,
        name: lead.name,
        address: lead.address,
        phone: lead.phone,
        website: lead.website,
        category: lead.category,
        emails: lead.emails,
        whatsapp: lead.whatsapp,
        contact_page_found: lead.contactPageFound,
        contacts: lead.contacts,
        linkedin_url: lead.linkedinUrl || null,
        social_links: lead.socialLinks || [],
        intelligence: buildLeadIntelligence(lead.detectedSignals, lead.websiteSignals, config.selectedService) ?? null,
      }));
```

- [ ] **Step 3: Extend the schema-cache fallback to strip `intelligence`**

Update the fallback block (currently lines 1378-1382) so an `intelligence`-related
schema-cache error also degrades gracefully:

```ts
      let { data: saved, error: saveError } = await supabase.from("saved_leads").insert(payload).select();
      if (saveError && /selected_service|linkedin_url|social_links|intelligence|schema cache/i.test(saveError.message)) {
        const fallbackPayload = payload.map(({ selected_service: _selectedService, linkedin_url: _linkedinUrl, social_links: _socialLinks, intelligence: _intelligence, ...lead }) => lead);
        const fallback = await supabase.from("saved_leads").insert(fallbackPayload).select();
        saved = fallback.data;
        saveError = fallback.error;
      }
```

- [ ] **Step 4: Extend the `ViewAllLeads` `LeadIntelligence` type**

In `src/components/landing/ViewAllLeads.tsx`, add an import near the other `@/lib`
imports at the top of the file:

```ts
import type { PersistedSignals } from "@/lib/leadIntelligence";
```

Then update the `LeadIntelligence` interface (currently lines 41-49) to add the optional
`signals` field:

```ts
interface LeadIntelligence {
  opportunityScore?: number;
  positioning?: string;
  businessMaturity?: string;
  detectedIssues?: string[];
  opportunitySummary?: string;
  suggestedPitchAngle?: string;
  outreachHook?: string;
  signals?: PersistedSignals;
}
```

- [ ] **Step 5: Verify build and full test suite**

Run: `npm.cmd run build`
Expected: build succeeds.

Run: `npm.cmd run test -- --run`
Expected: all tests pass (including the new `leadIntelligence` suite).

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/LeadGeneratorSection.tsx src/components/landing/ViewAllLeads.tsx
git commit -m "feat: persist detected signals to saved_leads.intelligence and type the read path"
```

---

## Codex Verification Prompts

Run the matching prompt after each task. (Full text also in the spec:
`docs/superpowers/specs/2026-06-06-persist-opportunity-signals-design.md`.)

### After Task 1 — Part A

```
Review src/lib/leadIntelligence.ts and src/lib/leadIntelligence.test.ts on the current
branch, then run: npm.cmd run test -- leadIntelligence --run
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

### After Task 2 — Part B

```
Verify the saved_leads persistence wiring on the current branch.
FILES: src/components/landing/LeadGeneratorSection.tsx, src/components/landing/ViewAllLeads.tsx
CHECK FOR:
1. The saved_leads insert payload (around line 1360) includes
   intelligence: buildLeadIntelligence(lead.detectedSignals, lead.websiteSignals,
   config.selectedService) ?? null.
2. The existing schema-cache fallback (around line 1378) regex includes "intelligence"
   AND the fallback destructure strips intelligence, so a column issue degrades gracefully
   instead of failing the save.
3. ViewAllLeads LeadIntelligence interface gained an optional signals?: PersistedSignals
   field (imported from @/lib/leadIntelligence); no other read-path behavior changed.
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

---

## Self-Review Notes

- **Spec coverage:** Data Shape → Task 1 (helper + types). Write path → Task 2 steps 2-3.
  Read path/type extension → Task 2 step 4. Testing → Task 1 tests + Task 2 step 5. Both
  decisions (namespaced raw + detectedIssues display; curated website subset excluding
  ctaTexts/evidence) are implemented and tested.
- **Placeholder scan:** none — every step has concrete code/commands.
- **Type consistency:** `buildLeadIntelligence(detectedSignals, websiteSignals, service)`
  signature is identical in Task 1 (definition) and Task 2 step 2 (call).
  `LeadIntelligencePayload`/`PersistedSignals`/`WebsiteSignalsSummary` names match across
  the helper, the `?? null` insert usage, and the `ViewAllLeads` type import. `DetectedSignal`
  and `WebsiteSignals` reuse the detection slice's exports.
- **Scope:** single slice; no migration, no edge/Phase-5/Phase-6 changes.
