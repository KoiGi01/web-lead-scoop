# Service-Aware Scan Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AI-assisted scan planner service-aware and explainable — it tailors discovery queries to what the user sells, names the opportunity signals + pages it will target, writes a short strategy, and the Scan plan card shows all of it. Execution/extraction is unchanged this round.

**Architecture:** Extract the pure planner logic out of the Deno edge function into a `planner-core.ts` (no Deno globals) that both the edge `index.ts` and vitest can import. Add service-aware fields to the planner output schema + heuristic fallback. On the frontend, extract the opportunity-signal helpers into a shared lib, add a `scanPlan` synthesis fallback (so demo/offline stays populated), carry the new fields through `planToSearchConfig`, and render Strategy · Search queries · Looking-for chips in the AI-assisted plan card. Persist the authored plan in a new nullable `agent_plan jsonb` column.

**Tech Stack:** Deno edge functions (Gemini 2.5 Flash), React + TypeScript, vitest (jsdom), Supabase/Postgres.

**Reference spec:** `docs/superpowers/specs/2026-06-04-service-aware-scan-planner-design.md`

---

## File Structure

- `src/lib/opportunitySignals.ts` — **new.** Moved from `LeadGeneratorSection.tsx`: `OpportunitySignalKey` type, `opportunitySignalOptions`, `opportunitySignalLabels`, `getServiceRecommendedSignalKeys`, `inferOpportunitySignalsFromText`. Single frontend source of truth for service→signal knowledge.
- `src/lib/scanPlan.ts` — **new.** `ScanTarget` type, `ScanPlanIntelligence` type, `SCAN_TARGETS_BY_SERVICE`, `synthesizeScanPlanIntelligence()`. Frontend fallback/synthesis, used when the planner omits the new fields and in demo.
- `src/lib/scanPlan.test.ts` — **new.** vitest unit tests for `synthesizeScanPlanIntelligence`.
- `supabase/functions/plan-lead-search/planner-core.ts` — **new.** Deno-free pure logic moved out of `index.ts` (types, allow-lists, infer*, `heuristicPlan`, `validatePlan`, `parseGeminiJson`) **plus** the new service-aware fields, a `SERVICE_SIGNALS` map, and `serviceDefaults()`.
- `src/test/planner-core.test.ts` — **new.** vitest tests that cross-import `planner-core.ts`.
- `supabase/functions/plan-lead-search/index.ts` — **modify.** Import from `planner-core.ts`; new analyst system prompt; extended response schema; accept `service` in the request.
- `src/components/landing/LeadGeneratorSection.tsx` — **modify.** Import signal helpers from the new lib; extend `FreeSearchPlan`; send `service` to the planner; carry new fields in `planToSearchConfig` with `synthesizeScanPlanIntelligence` fallback; render the three new plan-card sections; include `agent_plan` in `createSearchSession`.
- `supabase/migrations/20260604XXXXXX_add_agent_plan_to_search_sessions.sql` — **new.** Nullable `agent_plan jsonb`.

---

## Task 1: Extract frontend opportunity-signal helpers into a shared lib

**Files:**
- Create: `src/lib/opportunitySignals.ts`
- Create: `src/lib/opportunitySignals.test.ts`
- Modify: `src/components/landing/LeadGeneratorSection.tsx` (remove the moved definitions, import them instead)

- [ ] **Step 1: Write the failing test**

Create `src/lib/opportunitySignals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getServiceRecommendedSignalKeys, opportunitySignalLabels } from "@/lib/opportunitySignals";

describe("opportunitySignals", () => {
  it("recommends web-design signals for web design", () => {
    const keys = getServiceRecommendedSignalKeys("Web design");
    expect(keys).toContain("weak_website");
    expect(keys.length).toBeGreaterThan(0);
  });
  it("has a human label for every recommended key", () => {
    for (const key of getServiceRecommendedSignalKeys("SEO")) {
      expect(opportunitySignalLabels[key]).toBeTruthy();
    }
  });
  it("falls back to generic signals for empty service", () => {
    expect(getServiceRecommendedSignalKeys("")).toEqual(["weak_website", "no_clear_cta", "generic_inbox"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/lib/opportunitySignals.test.ts`
Expected: FAIL — cannot resolve `@/lib/opportunitySignals`.

- [ ] **Step 3: Create the lib by moving the definitions verbatim**

Create `src/lib/opportunitySignals.ts`. Move these from `LeadGeneratorSection.tsx` **unchanged** and add `export` to each: the `OpportunitySignalKey` type (currently the union near line 92), `opportunitySignalOptions` (≈ lines 499–553), `opportunitySignalLabels` (≈ 555–557), `getServiceRecommendedSignalKeys` (≈ 559–572), and `inferOpportunitySignalsFromText` (≈ 574–587). The file has no React imports. Header:

```ts
export type OpportunitySignalKey =
  | "weak_website"
  | "no_booking"
  | "no_clear_cta"
  | "generic_inbox"
  | "low_reviews"
  | "no_social_links"
  | "no_contact_form"
  | "weak_local_presence";

// ...paste opportunitySignalOptions, opportunitySignalLabels,
// getServiceRecommendedSignalKeys, inferOpportunitySignalsFromText here,
// each prefixed with `export`.
```

- [ ] **Step 4: Update `LeadGeneratorSection.tsx` to import instead of define**

Delete the moved definitions from `LeadGeneratorSection.tsx`. Add near the other imports:

```ts
import {
  OpportunitySignalKey,
  opportunitySignalOptions,
  opportunitySignalLabels,
  getServiceRecommendedSignalKeys,
  inferOpportunitySignalsFromText,
} from "@/lib/opportunitySignals";
```

Keep the `OpportunitySignalKey` references in the component's interfaces working via this import (remove the local `type OpportunitySignalKey = …`).

- [ ] **Step 5: Run test + build**

Run: `npm.cmd run test -- src/lib/opportunitySignals.test.ts`
Expected: PASS.
Run: `npm.cmd run build`
Expected: built, no TS errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/opportunitySignals.ts src/lib/opportunitySignals.test.ts src/components/landing/LeadGeneratorSection.tsx
git commit -m "refactor: extract opportunity-signal helpers into shared lib"
```

---

## Task 2: Frontend scan-plan synthesis lib

**Files:**
- Create: `src/lib/scanPlan.ts`
- Create: `src/lib/scanPlan.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/scanPlan.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { synthesizeScanPlanIntelligence } from "@/lib/scanPlan";

describe("synthesizeScanPlanIntelligence", () => {
  it("returns service-specific signals, targets, and strategy for web design", () => {
    const result = synthesizeScanPlanIntelligence("Web design");
    expect(result.opportunitySignals.length).toBeGreaterThan(0);
    expect(result.scanTargets).toContain("homepage");
    expect(result.strategy.toLowerCase()).toContain("web design");
  });

  it("falls back to default targets and non-empty signals for unknown service", () => {
    const result = synthesizeScanPlanIntelligence("");
    expect(result.scanTargets).toEqual(["homepage", "contact", "about"]);
    expect(result.opportunitySignals.length).toBeGreaterThan(0);
  });

  it("prefers caller-provided signals and queries when given", () => {
    const result = synthesizeScanPlanIntelligence("SEO", {
      signals: ["low_reviews"],
      queryVariants: ["dentists austin"],
    });
    expect(result.opportunitySignals).toEqual(["low_reviews"]);
    expect(result.queryVariants).toEqual(["dentists austin"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/lib/scanPlan.test.ts`
Expected: FAIL — cannot resolve `@/lib/scanPlan`.

- [ ] **Step 3: Implement `src/lib/scanPlan.ts`**

```ts
import {
  OpportunitySignalKey,
  opportunitySignalLabels,
  getServiceRecommendedSignalKeys,
} from "@/lib/opportunitySignals";

export type ScanTarget =
  | "homepage"
  | "contact"
  | "about"
  | "team"
  | "booking"
  | "services"
  | "pricing"
  | "social";

export interface ScanPlanIntelligence {
  service: string;
  strategy: string;
  opportunitySignals: OpportunitySignalKey[];
  scanTargets: ScanTarget[];
  queryVariants: string[];
}

const SCAN_TARGETS_BY_SERVICE: Record<string, ScanTarget[]> = {
  "web design": ["homepage", "services", "contact", "booking"],
  "seo": ["homepage", "services", "pricing", "contact"],
  "ai automation": ["homepage", "booking", "contact"],
  "booking automation": ["homepage", "booking", "contact"],
  "social media marketing": ["homepage", "social", "contact"],
  "reputation management": ["homepage", "contact", "social"],
  "paid ads": ["homepage", "services", "contact"],
  "crm setup": ["homepage", "contact", "team"],
  "lead generation": ["homepage", "contact", "services"],
};

const DEFAULT_SCAN_TARGETS: ScanTarget[] = ["homepage", "contact", "about"];

const buildStrategy = (service: string, signalLabels: string[]): string => {
  const svc = service.trim() || "your service";
  const focus = signalLabels.length
    ? signalLabels.slice(0, 3).join(", ").toLowerCase()
    : "weak public conversion paths";
  return `Prospects that need ${svc} usually show it on their public site. I'm prioritizing businesses with ${focus}, then pulling a likely decision-maker so you get an evidence-based opening.`;
};

export const synthesizeScanPlanIntelligence = (
  service: string,
  opts: { signals?: OpportunitySignalKey[]; queryVariants?: string[] } = {},
): ScanPlanIntelligence => {
  const signals = (opts.signals?.length ? opts.signals : getServiceRecommendedSignalKeys(service)).slice(0, 4);
  const labels = signals.map(signal => opportunitySignalLabels[signal] || signal);
  const key = service.trim().toLowerCase();
  const scanTargets = SCAN_TARGETS_BY_SERVICE[key] || DEFAULT_SCAN_TARGETS;
  return {
    service: service.trim(),
    strategy: buildStrategy(service, labels),
    opportunitySignals: signals,
    scanTargets,
    queryVariants: opts.queryVariants || [],
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/lib/scanPlan.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scanPlan.ts src/lib/scanPlan.test.ts
git commit -m "feat: add scan-plan intelligence synthesis helper"
```

---

## Task 3: Extract + extend the edge planner core

**Files:**
- Create: `supabase/functions/plan-lead-search/planner-core.ts`
- Create: `src/test/planner-core.test.ts`
- Modify: `supabase/functions/plan-lead-search/index.ts` (import from core)

- [ ] **Step 1: Write the failing test**

Create `src/test/planner-core.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validatePlan, heuristicPlan } from "../../supabase/functions/plan-lead-search/planner-core.ts";

describe("planner-core validatePlan", () => {
  it("clamps unknown opportunitySignals and scanTargets", () => {
    const plan = validatePlan(
      {
        targetBusiness: "dentists",
        location: "Austin",
        opportunitySignals: ["weak_website", "made_up_signal"],
        scanTargets: ["homepage", "not_a_page"],
      },
      null,
    );
    expect(plan).not.toBeNull();
    expect(plan!.opportunitySignals).toEqual(["weak_website"]);
    expect(plan!.scanTargets).toEqual(["homepage"]);
  });

  it("fills service-derived defaults when fields are omitted", () => {
    const plan = validatePlan(
      { targetBusiness: "dentists", location: "Austin", service: "Web design" },
      null,
    );
    expect(plan!.service).toBe("Web design");
    expect(plan!.opportunitySignals.length).toBeGreaterThan(0);
    expect(plan!.scanTargets.length).toBeGreaterThan(0);
    expect(plan!.strategy.length).toBeGreaterThan(0);
  });
});

describe("planner-core heuristicPlan", () => {
  it("produces a service-aware plan from a brief", () => {
    const plan = heuristicPlan({ brief: "web design for dentists in Austin", service: "Web design" });
    expect(plan).not.toBeNull();
    expect(plan!.queryVariants.length).toBeGreaterThan(0);
    expect(plan!.opportunitySignals.length).toBeGreaterThan(0);
  });

  it("returns null when target or location cannot be determined", () => {
    expect(heuristicPlan({ brief: "hello there", service: "" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/test/planner-core.test.ts`
Expected: FAIL — cannot resolve `planner-core.ts`.

- [ ] **Step 3: Create `planner-core.ts` by moving the pure logic + adding service-aware fields**

Create `supabase/functions/plan-lead-search/planner-core.ts`. Move **verbatim** from `index.ts` (≈ lines 6–224) and `export` them: the type aliases (`LocationMode`, `Depth`, `Strictness`, `RequiredChannel`, `ChatMessage`, `PlanRequest`, `KnownFields`), the allow-list consts, `uniqueStrings`, `clampEnum`, `normalizeChannel`, `inferLocation`, `inferTarget`, `inferRequiredChannels`, `makeQuestion`, `clarificationResponse`, `parseGeminiJson`. Then apply these **edits** while moving:

a) Add new types + allow-lists:

```ts
export type OpportunitySignal =
  | "weak_website" | "no_booking" | "no_clear_cta" | "generic_inbox"
  | "low_reviews" | "no_social_links" | "no_contact_form" | "weak_local_presence";
export type ScanTarget =
  | "homepage" | "contact" | "about" | "team" | "booking" | "services" | "pricing" | "social";

const allowedSignals: OpportunitySignal[] = ["weak_website","no_booking","no_clear_cta","generic_inbox","low_reviews","no_social_links","no_contact_form","weak_local_presence"];
const allowedScanTargets: ScanTarget[] = ["homepage","contact","about","team","booking","services","pricing","social"];
```

b) Extend `SearchPlan` and `PlanRequest`:

```ts
export interface PlanRequest {
  brief: string;
  messages?: ChatMessage[];
  service?: string;
  currentKeyword?: string;
  currentLocation?: string;
  userProfile?: { service_type?: string; pricing_tier?: string } | null;
}

export interface SearchPlan {
  targetBusiness: string;
  location: string;
  locationMode: LocationMode;
  depth: Depth;
  enrichMode: boolean;
  strictness: Strictness;
  requiredChannels: RequiredChannel[];
  queryVariants: string[];
  maxResults: 20 | 40 | 60;
  summary: string;
  service: string;
  strategy: string;
  opportunitySignals: OpportunitySignal[];
  scanTargets: ScanTarget[];
}
```

c) Add the service→signal knowledge + defaults:

```ts
const SERVICE_SIGNALS: Record<string, OpportunitySignal[]> = {
  "web design": ["weak_website", "no_clear_cta", "no_booking", "no_contact_form"],
  "seo": ["weak_local_presence", "low_reviews", "weak_website", "no_social_links"],
  "ai automation": ["no_booking", "no_contact_form", "generic_inbox"],
  "booking automation": ["no_booking", "no_clear_cta", "no_contact_form"],
  "social media marketing": ["no_social_links", "low_reviews", "weak_website"],
  "reputation management": ["low_reviews", "weak_local_presence", "no_social_links"],
  "paid ads": ["no_clear_cta", "weak_website", "weak_local_presence"],
  "crm setup": ["no_contact_form", "generic_inbox", "no_booking"],
  "lead generation": ["no_clear_cta", "generic_inbox", "no_contact_form"],
};
const SCAN_TARGETS_BY_SERVICE: Record<string, ScanTarget[]> = {
  "web design": ["homepage","services","contact","booking"],
  "seo": ["homepage","services","pricing","contact"],
  "ai automation": ["homepage","booking","contact"],
  "booking automation": ["homepage","booking","contact"],
  "social media marketing": ["homepage","social","contact"],
  "reputation management": ["homepage","contact","social"],
  "paid ads": ["homepage","services","contact"],
  "crm setup": ["homepage","contact","team"],
  "lead generation": ["homepage","contact","services"],
};

function inferService(brief: string, fallback = ""): string {
  const lower = brief.toLowerCase();
  if (/web\s*design|website|site redesign|landing page/.test(lower)) return "Web design";
  if (/\bseo\b|rank|local visibility|google business/.test(lower)) return "SEO";
  if (/ai automation|automation|workflow|zapier|make\.com/.test(lower)) return "AI automation";
  if (/booking|appointment|schedule/.test(lower)) return "Booking automation";
  if (/social media|instagram|tiktok|facebook|content/.test(lower)) return "Social media marketing";
  if (/reputation|reviews|ratings/.test(lower)) return "Reputation management";
  if (/paid ads|google ads|meta ads|ppc/.test(lower)) return "Paid ads";
  if (/\bcrm\b|pipeline|hubspot|salesforce/.test(lower)) return "CRM setup";
  if (/lead gen|lead generation|prospecting|outreach/.test(lower)) return "Lead generation";
  return fallback;
}

export function serviceDefaults(service: string): { signals: OpportunitySignal[]; scanTargets: ScanTarget[]; strategy: string } {
  const key = service.trim().toLowerCase();
  const signals = SERVICE_SIGNALS[key] || ["weak_website", "no_clear_cta", "generic_inbox"];
  const scanTargets = SCAN_TARGETS_BY_SERVICE[key] || ["homepage", "contact", "about"];
  const svc = service.trim() || "your service";
  const strategy = `Prospects that need ${svc} usually show it on their public site. I'm prioritizing businesses with visible gaps (${signals.slice(0, 3).join(", ").replace(/_/g, " ")}), then pulling a likely decision-maker so you get an evidence-based opening.`;
  return { signals, scanTargets, strategy };
}

function clampList<T extends string>(values: unknown, allowed: T[], limit: number): T[] {
  return uniqueStrings(Array.isArray(values) ? values : [], limit).filter(v => allowed.includes(v as T)) as T[];
}
```

d) Replace `heuristicPlan` and `validatePlan` with service-aware versions:

```ts
export function heuristicPlan(req: PlanRequest): SearchPlan | null {
  const brief = req.brief || "";
  const location = inferLocation(brief, req.currentLocation || "");
  const targetBusiness = inferTarget(brief, location, req.currentKeyword || "");
  if (!targetBusiness || !location) return null;

  const service = (req.service || inferService(brief)).trim();
  const requiredChannels = inferRequiredChannels(brief);
  const wantsPerson = requiredChannels.includes("person");
  const wantsStrict = /\bonly|required|must have|must-have\b/i.test(brief) || requiredChannels.length >= 2;
  const wantsDeep = /\bdeep|more|many|large list|thorough\b/i.test(brief);
  const wantsSimple = /\bquick|small list|simple|few\b/i.test(brief);
  const depth: Depth = wantsDeep ? "deep" : wantsSimple ? "simple" : "normal";
  const locationMode: LocationMode = /\b(country|nationwide|all over|across)\b/i.test(brief) ? "country" : "city";
  const maxResults: 20 | 40 | 60 = depth === "deep" ? 60 : depth === "simple" ? 20 : 40;
  const defaults = serviceDefaults(service);

  const queryVariants = uniqueStrings([
    `${targetBusiness} ${location}`,
    `${targetBusiness} ${location} contact`,
    `${targetBusiness} ${location} official website`,
    `${targetBusiness} ${location} reviews`,
    wantsPerson ? `${targetBusiness} ${location} owner manager` : "",
  ], 6);

  return {
    targetBusiness, location, locationMode, depth,
    enrichMode: wantsPerson || requiredChannels.includes("linkedin"),
    strictness: wantsStrict ? "strict" : "balanced",
    requiredChannels, queryVariants, maxResults,
    summary: `Search for ${targetBusiness} in ${location}, prioritizing contact-ready prospects${requiredChannels.length ? ` with ${requiredChannels.join(", ")}` : ""}.`,
    service,
    strategy: defaults.strategy,
    opportunitySignals: defaults.signals,
    scanTargets: defaults.scanTargets,
  };
}

export function validatePlan(raw: Record<string, unknown>, fallback: SearchPlan | null): SearchPlan | null {
  const targetBusiness = String(raw.targetBusiness || fallback?.targetBusiness || "").trim();
  const location = String(raw.location || fallback?.location || "").trim();
  if (!targetBusiness || !location) return null;

  const depth = clampEnum(raw.depth, allowedDepths, fallback?.depth || "normal");
  const maxResults: 20 | 40 | 60 = depth === "deep" ? 60 : depth === "simple" ? 20 : 40;
  const requiredChannels = uniqueStrings((raw.requiredChannels as unknown[]) || fallback?.requiredChannels || [], 5)
    .map(normalizeChannel).filter(Boolean) as RequiredChannel[];
  const queryVariants = uniqueStrings((raw.queryVariants as unknown[]) || fallback?.queryVariants || [], 6);
  const service = String(raw.service || fallback?.service || "").trim();
  const defaults = serviceDefaults(service);
  const opportunitySignals = clampList(raw.opportunitySignals, allowedSignals, 5);
  const scanTargets = clampList(raw.scanTargets, allowedScanTargets, 6);

  return {
    targetBusiness, location,
    locationMode: clampEnum(raw.locationMode, allowedLocationModes, fallback?.locationMode || "city"),
    depth,
    enrichMode: typeof raw.enrichMode === "boolean" ? raw.enrichMode : Boolean(fallback?.enrichMode || requiredChannels.includes("person") || requiredChannels.includes("linkedin")),
    strictness: clampEnum(raw.strictness, allowedStrictness, fallback?.strictness || "balanced"),
    requiredChannels,
    queryVariants: queryVariants.length ? queryVariants : uniqueStrings([
      `${targetBusiness} ${location}`,
      `${targetBusiness} ${location} contact`,
      `${targetBusiness} ${location} official website`,
    ], 6),
    maxResults,
    summary: String(raw.summary || fallback?.summary || `Search for ${targetBusiness} in ${location}, prioritizing contact-ready prospects.`),
    service,
    strategy: String(raw.strategy || fallback?.strategy || defaults.strategy),
    opportunitySignals: opportunitySignals.length ? opportunitySignals : defaults.signals,
    scanTargets: scanTargets.length ? scanTargets : defaults.scanTargets,
  };
}
```

(`clarificationResponse` and `makeQuestion` move unchanged; export both.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/test/planner-core.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Rewire `index.ts` to import the moved members**

In `supabase/functions/plan-lead-search/index.ts`, delete the moved definitions and add at the top (Deno requires the `.ts` extension):

```ts
import {
  PlanRequest, SearchPlan,
  uniqueStrings, heuristicPlan, validatePlan, clarificationResponse,
  makeQuestion, parseGeminiJson,
} from "./planner-core.ts";
```

Leave `corsHeaders` and the `Deno.serve` handler in `index.ts` (the Gemini fetch + prompt + schema are edited in Task 4). Confirm no duplicate declarations remain.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/plan-lead-search/planner-core.ts supabase/functions/plan-lead-search/index.ts src/test/planner-core.test.ts
git commit -m "refactor: extract service-aware planner core for plan-lead-search"
```

---

## Task 4: Service-aware prompt + schema in the edge handler

**Files:**
- Modify: `supabase/functions/plan-lead-search/index.ts` (prompt text + `responseJsonSchema` + pass `service` into prompt)

- [ ] **Step 1: Replace the prompt body**

In the `fetch(...generateContent...)` call, replace the prompt `text` with the analyst version. Keep the variable wiring (`brief`, `conversation`, `body.currentKeyword`, etc.) and add `service`:

```ts
const service = String(body.service || "").trim();
```

Prompt text:

```
You are a prospecting analyst for a service provider. The user SELLS a service and wants local businesses worth pitching. Return only JSON that follows the schema.

What the user sells: ${service || "(infer it from the brief)"}

Your job:
- Identify the user's service, the target market/niche, and the location.
- Design search queries likely to surface businesses in that niche + location that plausibly have the weaknesses this service fixes. Always include the location in each query.
- Choose the opportunity signals to look for, tied to the service (e.g. web design -> weak_website, no_booking, no_clear_cta).
- Choose which pages to read (scanTargets) for evidence.
- Write a 1-2 sentence strategy explaining why these prospects are good for this service.
- Ask a concise clarification (state=needs_clarification) only when target business, location, or service is missing. Put every missing field in missingFields.
- Do not start the search. Do not mention provider/tool names.

Allowed values:
- state: needs_clarification | ready
- locationMode: country | city
- depth: simple | normal | deep
- strictness: broad | balanced | strict
- requiredChannels: phone | website | email | linkedin | person
- opportunitySignals: weak_website | no_booking | no_clear_cta | generic_inbox | low_reviews | no_social_links | no_contact_form | weak_local_presence
- scanTargets: homepage | contact | about | team | booking | services | pricing | social

Guidance:
- Use normal depth by default, simple for quick/small, deep for thorough/large.
- enrichMode is always effectively on; set it true.

Accumulated brief:
${brief}

Conversation:
${conversation}

Current keyword: ${body.currentKeyword || ""}
Current location: ${body.currentLocation || ""}
User price tier: ${body.userProfile?.pricing_tier || ""}
```

- [ ] **Step 2: Extend the `responseJsonSchema` `plan` object**

Add these properties inside `plan.properties` (alongside the existing ones):

```ts
service: { type: "string" },
strategy: { type: "string" },
opportunitySignals: { type: "array", items: { type: "string", enum: ["weak_website","no_booking","no_clear_cta","generic_inbox","low_reviews","no_social_links","no_contact_form","weak_local_presence"] } },
scanTargets: { type: "array", items: { type: "string", enum: ["homepage","contact","about","team","booking","services","pricing","social"] } },
```

- [ ] **Step 3: Verify it type-checks via the frontend build (the edge file is bundled by Supabase, but TS still parses)**

Run: `npm.cmd run build`
Expected: built (the edge file isn't part of the Vite build, so this only confirms the frontend; the edge file is validated by deploy in Step 4).

- [ ] **Step 4: Deploy + smoke-test the function**

Run: `npx.cmd supabase functions deploy plan-lead-search`
Expected: deploy succeeds. (If no Supabase login in this environment, skip and note it for the user.)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/plan-lead-search/index.ts
git commit -m "feat: service-aware analyst prompt and schema for scan planner"
```

---

## Task 5: Carry the new fields through the frontend planner flow

**Files:**
- Modify: `src/components/landing/LeadGeneratorSection.tsx` (`FreeSearchPlan` interface, `FreeSearchPlannerResponse`, `submitFreeSearchText`, `planToSearchConfig`)

- [ ] **Step 1: Extend the `FreeSearchPlan` interface**

Add the import at top:

```ts
import { ScanTarget, synthesizeScanPlanIntelligence } from "@/lib/scanPlan";
```

Add to the `FreeSearchPlan` interface (≈ line 135), using the imported `ScanTarget`:

```ts
  service?: string;
  strategy?: string;
  scanTargets?: ScanTarget[];
```

(`opportunitySignals` and `queryVariants` already exist on the interface.)

- [ ] **Step 2: Send `service` to the planner**

In `submitFreeSearchText`, before the `invoke("plan-lead-search", ...)` call, compute the service and add it to the body:

```ts
const inferredService = (selectedServiceValue || inferBriefService(nextBrief)).trim();
```

Add `service: inferredService,` to the `body` object passed to `supabase.functions.invoke("plan-lead-search", { body: { … } })`.

- [ ] **Step 3: Carry + synthesize the fields in `planToSearchConfig` and plan storage**

In `planToSearchConfig` (≈ line 759), after `selectedService` is computed, build the intelligence with a fallback so it's never empty:

```ts
const intelligence = synthesizeScanPlanIntelligence(plan.service || selectedService, {
  signals: plan.opportunitySignals,
  queryVariants: plan.queryVariants,
});
```

Set `opportunitySignals: plan.opportunitySignals?.length ? plan.opportunitySignals : intelligence.opportunitySignals,` in the returned config (replacing the current `inferOpportunitySignalsFromText` line). Keep the rest of the returned config unchanged.

Where `setFreePlan({ plan, config, brief })` is called in `submitFreeSearchText` (the success branch), normalize the plan's new fields first so the card always has them:

```ts
const enriched = synthesizeScanPlanIntelligence(plan.service || config.selectedService, {
  signals: plan.opportunitySignals,
  queryVariants: plan.queryVariants,
});
const normalizedPlan = {
  ...plan,
  service: plan.service || config.selectedService,
  strategy: plan.strategy || enriched.strategy,
  scanTargets: plan.scanTargets?.length ? plan.scanTargets : enriched.scanTargets,
  opportunitySignals: plan.opportunitySignals?.length ? plan.opportunitySignals : enriched.opportunitySignals,
};
setFreePlan({ plan: normalizedPlan, config, brief: nextBrief });
```

Apply the same normalization in the fallback-plan branch of the `catch` (where `fallbackPlan` is set).

- [ ] **Step 4: Build to verify wiring**

Run: `npm.cmd run build`
Expected: built, no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/LeadGeneratorSection.tsx
git commit -m "feat: carry service-aware plan fields through the AI-assisted flow"
```

---

## Task 6: Render Strategy · Search queries · Looking-for in the plan card

**Files:**
- Modify: `src/components/landing/LeadGeneratorSection.tsx` (the `searchMode === "free"` plan-card body, after the size row + "Decision-maker contacts included" badge)

- [ ] **Step 1: Add the three sections**

Inside the `freePlan ?` branch of the plan body, immediately after the "Decision-maker contacts included" badge `</div>`, insert:

```tsx
{freePlan.strategy && (
  <div className="mt-4 border-t border-[#f3f5f8]/[0.07] pt-3.5">
    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5d6675]">Strategy</div>
    <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[#9aa3b2]">{freePlan.strategy}</p>
  </div>
)}

{!!freePlan.queryVariants?.length && (
  <div className="mt-4 border-t border-[#f3f5f8]/[0.07] pt-3.5">
    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5d6675]">Search queries</div>
    <ul className="mt-2 space-y-1">
      {freePlan.queryVariants.slice(0, 6).map((q, i) => (
        <li key={`${q}-${i}`} className="truncate font-mono text-[11px] text-[#f3f5f8]/90">
          <span className="text-[#5d6675]">{String(i + 1).padStart(2, "0")}</span> {q}
        </li>
      ))}
    </ul>
  </div>
)}

{(!!freePlan.opportunitySignals?.length || !!freePlan.scanTargets?.length) && (
  <div className="mt-4 border-t border-[#f3f5f8]/[0.07] pt-3.5">
    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5d6675]">The agent will look for</div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {(freePlan.opportunitySignals || []).map(sig => (
        <span key={sig} className="rounded-[7px] border border-[#e8fb52]/30 bg-[#e8fb52]/[0.08] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#e8fb52]">
          {opportunitySignalLabels[sig] || sig}
        </span>
      ))}
      {(freePlan.scanTargets || []).map(target => (
        <span key={target} className="rounded-[7px] border border-[#f3f5f8]/[0.13] bg-black px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#98a0af]">
          {target}
        </span>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Build**

Run: `npm.cmd run build`
Expected: built, no TS errors.

- [ ] **Step 3: Manual verification at `?demo=1`**

Run: `npm.cmd run dev` (if not already running). Open `http://localhost:8080/app?demo=1`, click **AI assisted**, type `web design for dentists in Austin`, send.
Expected: the plan card shows the service/market/location/size rows, then a **Strategy** sentence mentioning web design, a numbered **Search queries** list, and **The agent will look for** chips (signal labels + page names). Start button still reads `Start scan · N credits`.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/LeadGeneratorSection.tsx
git commit -m "feat: show strategy, queries, and targets in the AI scan plan card"
```

---

## Task 7: Persist the authored plan on `search_sessions`

**Files:**
- Create: `supabase/migrations/20260604120000_add_agent_plan_to_search_sessions.sql` (mirrors the existing `20260603171624_…` naming)
- Modify: `src/components/landing/LeadGeneratorSection.tsx` (`createSearchSession` payload)

- [ ] **Step 1: Write the migration**

```sql
alter table public.search_sessions
  add column if not exists agent_plan jsonb;
```

- [ ] **Step 2: Include `agent_plan` in `createSearchSession`**

In `createSearchSession`, extend `sessionPayload` with the authored plan when the search came from the AI flow. Add to the payload object:

```ts
agent_plan: freePlan
  ? {
      service: freePlan.plan.service || null,
      strategy: freePlan.plan.strategy || null,
      queryVariants: freePlan.plan.queryVariants || [],
      opportunitySignals: freePlan.plan.opportunitySignals || [],
      scanTargets: freePlan.plan.scanTargets || [],
    }
  : null,
```

Extend the existing schema-mismatch fallback so an older DB (no `agent_plan` column) still inserts: in the `if (error && /selected_service|opportunity_signals|schema cache/i.test(error.message))` branch, also strip `agent_plan` — change the regex to `/selected_service|opportunity_signals|agent_plan|schema cache/i` and add `agent_plan: _agentPlan` to the destructured-and-dropped fields.

- [ ] **Step 3: Build**

Run: `npm.cmd run build`
Expected: built, no TS errors.

- [ ] **Step 4: Apply the migration (or note for the user)**

Run: `npx.cmd supabase db push` (or apply via the Supabase dashboard).
Expected: column added. If no Supabase access in this environment, note it: "migration committed, needs `supabase db push` on deploy."

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ src/components/landing/LeadGeneratorSection.tsx
git commit -m "feat: persist authored agent_plan on search_sessions"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full test + build**

Run: `npm.cmd run test`
Expected: all tests pass (example + opportunitySignals + scanPlan + planner-core).
Run: `npm.cmd run build`
Expected: built, no errors.

- [ ] **Step 2: Full manual walkthrough at `?demo=1`**

Open `http://localhost:8080/app?demo=1`. Verify:
- Manual mode unchanged (scan-size cost on Start button still correct).
- AI-assisted: a brief produces a populated plan card with Strategy + Search queries + Looking-for chips.
- Switching Quick/Standard/Deep in the plan updates cost; Start runs the demo search.

- [ ] **Step 3: Regenerate Supabase types (optional, if `agent_plan` is needed in TS)**

Note for the user: if `search_sessions.agent_plan` needs to appear in `src/integrations/supabase/types.ts`, regenerate types and re-verify the manual accounting/contact types per CLAUDE.md.

---

## Notes for the implementer

- **Always-enrich:** the planner sets `enrichMode` true; the frontend already forces enrich in both modes. Do not reintroduce a Normal/Enrich choice.
- **Honesty:** the "The agent will look for" section is the agent's *plan*, not detected results — do not relabel it "Detected." Detection is the next project.
- **No execution changes:** `search-places` / `extract-contacts` are untouched. `scanTargets`/`opportunitySignals` are stored only.
- **Provider names:** keep them out of user-facing copy (CLAUDE.md).
