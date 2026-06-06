# Opportunity Signal Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live search produce evidence-backed opportunity signals for the user's selected signal keys, derived from already-scraped website HTML plus Google Places review data, with zero new external API calls.

**Architecture:** A pure, shared fact-builder (`supabase/functions/_shared/websiteSignals.ts`) turns already-scraped HTML/links into a structured `WebsiteSignals` object; `extract-contacts` calls it and returns it; `search-places` adds free `rating`/`reviewCount`; a pure, Vitest-tested `src/lib/detectOpportunitySignals.ts` interprets facts + review context into the 8 named signals, emitting only the user's selected keys; the client wires the detector into the in-memory lead. No persistence, cards, AI, or exports (deferred).

**Tech Stack:** TypeScript, Deno (Supabase Edge Functions), Vite/Vitest, Firecrawl + Google Places (existing).

**Spec:** `docs/superpowers/specs/2026-06-05-opportunity-signal-detection-design.md`

---

## File Structure

- **Create** `supabase/functions/_shared/websiteSignals.ts` — `WebsiteSignals` type + pure `buildWebsiteSignals()`. Imported by both the Deno edge function and the Vitest suite.
- **Create** `src/lib/websiteSignals.test.ts` — Vitest tests for `buildWebsiteSignals` (imports the shared module by relative path).
- **Modify** `supabase/functions/extract-contacts/index.ts` — call `buildWebsiteSignals`, add `websiteSignals` to the response. No new fetches.
- **Modify** `supabase/functions/search-places/index.ts` — add `rating`/`reviewCount` to field mask + business object.
- **Create** `src/lib/detectOpportunitySignals.ts` — `DetectedSignal`, `EnrichmentContext`, pure `detectOpportunitySignals()`.
- **Create** `src/lib/detectOpportunitySignals.test.ts` — Vitest tests for the detector.
- **Modify** `src/components/landing/LeadGeneratorSection.tsx` — `Business` += `rating`/`reviewCount`; `LeadResult` += `websiteSignals`/`detectedSignals`; map response; call detector with selected keys.

---

## Task 1: Shared `buildWebsiteSignals` fact-builder (TDD)

**Files:**
- Create: `supabase/functions/_shared/websiteSignals.ts`
- Test: `src/lib/websiteSignals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/websiteSignals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildWebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";

const homepage = (html: string, links: string[] = [], url = "https://acme.com") => ({ url, html, links });

describe("buildWebsiteSignals", () => {
  it("captures title, meta, and homepage text length from the homepage", () => {
    const html = `<html><head><title>Acme Dental</title><meta name="description" content="Best dental care"></head><body><p>${"word ".repeat(50)}</p></body></html>`;
    const signals = buildWebsiteSignals({ pages: [homepage(html)], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.title).toBe("Acme Dental");
    expect(signals.metaDescription).toBe("Best dental care");
    expect(signals.homepageTextLength).toBeGreaterThan(100);
    expect(signals.pagesScanned).toEqual(["https://acme.com"]);
  });

  it("detects booking links and CTA texts", () => {
    const html = `<a href="https://calendly.com/acme">Book now</a><a href="/services">Our services</a><button>Get a free quote</button>`;
    const signals = buildWebsiteSignals({ pages: [homepage(html, ["https://calendly.com/acme", "https://acme.com/services"])], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.bookingLinks.some(l => l.includes("calendly.com"))).toBe(true);
    expect(signals.ctaTexts.join(" ").toLowerCase()).toContain("quote");
  });

  it("detects a contact form", () => {
    const html = `<form action="/send"><input type="email" name="email"><textarea></textarea></form>`;
    const signals = buildWebsiteSignals({ pages: [homepage(html)], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.contactFormFound).toBe(true);
  });

  it("flags generic-inbox-only when all emails are generic", () => {
    const signals = buildWebsiteSignals({ pages: [homepage("<p>hi</p>")], emails: ["info@acme.com", "contact@acme.com"], socialLinks: [], contactPageFound: false });
    expect(signals.hasGenericInboxOnly).toBe(true);
  });

  it("does NOT flag generic-inbox-only when a person inbox exists", () => {
    const signals = buildWebsiteSignals({ pages: [homepage("<p>hi</p>")], emails: ["info@acme.com", "jane.doe@acme.com"], socialLinks: [], contactPageFound: false });
    expect(signals.hasGenericInboxOnly).toBe(false);
  });

  it("detects tech stack and ssl from the homepage", () => {
    const html = `<meta name="generator" content="WordPress 6.2"><link href="/wp-content/themes/x/style.css">`;
    const signals = buildWebsiteSignals({ pages: [homepage(html, [], "https://acme.com")], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.techStack).toContain("wordpress");
    expect(signals.ssl.valid).toBe(true);
  });

  it("marks ssl invalid for http urls", () => {
    const signals = buildWebsiteSignals({ pages: [homepage("<p>hi</p>", [], "http://acme.com")], emails: [], socialLinks: [], contactPageFound: false });
    expect(signals.ssl.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd run test -- websiteSignals`
Expected: FAIL with module-not-found / `buildWebsiteSignals is not a function`.

- [ ] **Step 3: Implement the shared module**

Create `supabase/functions/_shared/websiteSignals.ts`:

```ts
// Pure, dependency-free website-signal fact gathering.
// Imported by supabase/functions/extract-contacts (Deno) and by Vitest in src/.
// MUST NOT import Deno globals or any runtime-specific module.

export interface ScrapedPage {
  url: string;
  html: string;
  links: string[];
}

export interface BuildWebsiteSignalsInput {
  pages: ScrapedPage[];        // homepage first, then any contact/about pages
  emails: string[];            // already-extracted emails
  socialLinks: string[];       // already-extracted social links
  contactPageFound: boolean;
}

export interface WebsiteSignals {
  pagesScanned: string[];
  title?: string;
  metaDescription?: string;
  homepageTextLength: number;
  contactFormFound: boolean;
  bookingLinks: string[];
  ctaTexts: string[];
  socialLinks: string[];
  hasGenericInboxOnly: boolean;
  techStack: string[];
  ssl: { valid: boolean; httpsRedirect: boolean };
  evidence: Array<{ signal: string; sourceUrl: string; snippet: string }>;
}

const GENERIC_LOCAL_PARTS = new Set([
  "admin", "contact", "contacto", "hello", "hola", "info", "mail",
  "office", "recepcion", "reception", "sales", "soporte", "support", "ventas",
]);

const BOOKING_HOST_RE = /(calendly\.com|acuityscheduling\.com|booksy\.com|squareup\.com\/appointments|setmore\.com|simplybook\.me|youcanbook\.me|cal\.com|appointlet\.com|vagaro\.com)/i;
const BOOKING_PATH_RE = /(\/book|\/booking|\/appointment|\/appointments|\/schedule|\/reserva|\/agendar)/i;
const ACTION_CTA_RE = /\b(book|quote|call|contact|get started|sign up|schedule|request|buy|order|subscribe|consult|free estimate|get a quote)\b/i;

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() || undefined : undefined;
}

function extractMetaDescription(html: string): string | undefined {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return m ? m[1].replace(/\s+/g, " ").trim() || undefined : undefined;
}

function extractCtaTexts(html: string): string[] {
  const texts = new Set<string>();
  const tagRe = /<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi;
  for (const m of html.matchAll(tagRe)) {
    const text = stripHtmlToText(m[1]);
    if (text && text.length <= 60) texts.add(text);
  }
  return [...texts].slice(0, 40);
}

function detectContactForm(html: string): boolean {
  if (!/<form\b/i.test(html)) return false;
  return /<input[^>]+type=["'](?:email|text|tel)["']/i.test(html) || /<textarea\b/i.test(html);
}

function detectBookingLinks(links: string[]): string[] {
  const found = new Set<string>();
  for (const link of links) {
    if (BOOKING_HOST_RE.test(link) || BOOKING_PATH_RE.test(link)) found.add(link);
  }
  return [...found].slice(0, 8);
}

function detectTechStack(html: string): string[] {
  const stack = new Set<string>();
  const checks: Array<[RegExp, string]> = [
    [/wp-content|wp-includes|name=["']generator["'][^>]*wordpress/i, "wordpress"],
    [/elementor/i, "elementor"],
    [/(static\.wixstatic\.com|name=["']generator["'][^>]*wix)/i, "wix"],
    [/squarespace/i, "squarespace"],
    [/cdn\.shopify\.com|shopify/i, "shopify"],
    [/webflow/i, "webflow"],
    [/godaddy|websitebuilder/i, "godaddy"],
    [/weebly/i, "weebly"],
    [/jquery[.-]1\.[0-9]/i, "legacy-jquery"],
  ];
  for (const [re, name] of checks) if (re.test(html)) stack.add(name);
  return [...stack];
}

export function buildWebsiteSignals(input: BuildWebsiteSignalsInput): WebsiteSignals {
  const pages = input.pages.filter(p => p && typeof p.html === "string");
  const homepage = pages[0] || { url: "", html: "", links: [] };
  const allLinks = pages.flatMap(p => p.links || []);
  const allHtml = pages.map(p => p.html).join(" ");

  const ctaTexts = extractCtaTexts(allHtml);
  const bookingLinks = detectBookingLinks(allLinks);
  const contactFormFound = pages.some(p => detectContactForm(p.html));

  const localParts = input.emails
    .map(e => (e.split("@")[0] || "").toLowerCase())
    .filter(Boolean);
  const hasGenericInboxOnly =
    localParts.length > 0 && localParts.every(part => GENERIC_LOCAL_PARTS.has(part));

  const evidence: WebsiteSignals["evidence"] = [];
  if (bookingLinks.length) evidence.push({ signal: "booking_link", sourceUrl: homepage.url, snippet: bookingLinks[0] });
  if (contactFormFound) evidence.push({ signal: "contact_form", sourceUrl: homepage.url, snippet: "contact form present" });
  if (input.socialLinks.length) evidence.push({ signal: "social_link", sourceUrl: homepage.url, snippet: input.socialLinks[0] });

  return {
    pagesScanned: pages.map(p => p.url).filter(Boolean),
    title: extractTitle(homepage.html),
    metaDescription: extractMetaDescription(homepage.html),
    homepageTextLength: stripHtmlToText(homepage.html).length,
    contactFormFound,
    bookingLinks,
    ctaTexts,
    socialLinks: input.socialLinks,
    hasGenericInboxOnly,
    techStack: detectTechStack(allHtml),
    ssl: { valid: homepage.url.startsWith("https://"), httpsRedirect: homepage.url.startsWith("https://") },
    evidence,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- websiteSignals`
Expected: PASS (all cases in `src/lib/websiteSignals.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/websiteSignals.ts src/lib/websiteSignals.test.ts
git commit -m "feat: add pure buildWebsiteSignals fact-builder with tests"
```

---

## Task 2: Wire `buildWebsiteSignals` into `extract-contacts`

**Files:**
- Modify: `supabase/functions/extract-contacts/index.ts`

This task has no Deno test harness in this repo; verify via build + the Part B Codex prompt. The change must add NO new `fetch` calls.

- [ ] **Step 1: Import the shared builder**

At the top of `supabase/functions/extract-contacts/index.ts`, below the existing `createClient` import (line 1), add:

```ts
import { buildWebsiteSignals, type ScrapedPage } from "../_shared/websiteSignals.ts";
```

- [ ] **Step 2: Collect scraped pages as the loop runs**

In `Deno.serve`, immediately after `const pageTexts = [stripHtml(html)];` (currently line 559), add a parallel collector seeded with the homepage:

```ts
    const scrapedPages: ScrapedPage[] = [{ url: formattedUrl, html, links }];
```

Then inside the contact-page `for` loop, immediately after the existing `pageTexts.push(stripHtml(contactHtml));` (currently line 615), add:

```ts
        scrapedPages.push({ url: contactUrl, html: contactHtml, links: contactPageLinks });
```

- [ ] **Step 3: Build websiteSignals before the success response**

Immediately before the final `return new Response(` that serializes the success payload (currently line 729), add:

```ts
    const websiteSignals = buildWebsiteSignals({
      pages: scrapedPages,
      emails: allEmails,
      socialLinks,
      contactPageFound,
    });
```

- [ ] **Step 4: Add `websiteSignals` to the success response body**

In that final success `return`, add `websiteSignals` to the JSON object (alongside `emailSource`):

```ts
    return new Response(
      JSON.stringify({
        success: true,
        emails: allEmails,
        whatsapp: allWhatsApp,
        contactPageFound,
        linkedinUrl,
        socialLinks,
        contacts: mergeContacts(contacts),
        emailSource,
        websiteSignals,
        ...(usageType !== "customer" ? { debugProfileLinks: discoveredDebugLinks } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
```

- [ ] **Step 5: Verify no new fetch calls and that the function still type-checks**

Run: `npm.cmd run build`
Expected: build succeeds (the frontend build is unaffected; this confirms no syntax breakage in the repo). Then manually confirm: the only `fetch`/`fetchWithTimeout` calls in the file are the pre-existing Firecrawl/Hunter calls — none added in this task.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/extract-contacts/index.ts
git commit -m "feat: return websiteSignals from extract-contacts (no new fetches)"
```

---

## Task 3: Add `rating`/`reviewCount` to `search-places`

**Files:**
- Modify: `supabase/functions/search-places/index.ts`

No Deno test harness; verify via build + the Part A Codex prompt. Free SKU-wise (already Enterprise tier).

- [ ] **Step 1: Add review fields to the request field mask**

In `supabase/functions/search-places/index.ts`, update the `X-Goog-FieldMask` header (currently line 107) to append `places.rating,places.userRatingCount`:

```ts
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.location,places.rating,places.userRatingCount,nextPageToken',
```

- [ ] **Step 2: Keep the logged field_mask metadata in sync**

Update the `field_mask` string inside the `logUsage` metadata (currently line 133) to match exactly:

```ts
            field_mask: "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.location,places.rating,places.userRatingCount,nextPageToken",
```

- [ ] **Step 3: Map review fields onto the business object**

Update the `allPlaces.map` business object (currently lines 176-185) to include `rating` and `reviewCount`:

```ts
    const businesses = allPlaces.map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      phone: place.nationalPhoneNumber || '',
      website: place.websiteUri || '',
      category: place.primaryType || place.types?.[0] || '',
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      rating: typeof place.rating === 'number' ? place.rating : undefined,
      reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
    }));
```

- [ ] **Step 4: Verify the build**

Run: `npm.cmd run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/search-places/index.ts
git commit -m "feat: return rating and reviewCount from search-places (free, Enterprise SKU)"
```

---

## Task 4: `detectOpportunitySignals` module (TDD)

**Files:**
- Create: `src/lib/detectOpportunitySignals.ts`
- Test: `src/lib/detectOpportunitySignals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/detectOpportunitySignals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectOpportunitySignals } from "@/lib/detectOpportunitySignals";
import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";

const baseFacts = (overrides: Partial<WebsiteSignals> = {}): WebsiteSignals => ({
  pagesScanned: ["https://acme.com"],
  title: "Acme",
  metaDescription: "We do things",
  homepageTextLength: 5000,
  contactFormFound: true,
  bookingLinks: ["https://calendly.com/acme"],
  ctaTexts: ["Book now", "Get a quote"],
  socialLinks: ["https://instagram.com/acme"],
  hasGenericInboxOnly: false,
  techStack: [],
  ssl: { valid: true, httpsRedirect: true },
  evidence: [],
  ...overrides,
});

describe("detectOpportunitySignals", () => {
  it("emits ONLY the selected signal keys", () => {
    const out = detectOpportunitySignals(baseFacts({ socialLinks: [] }), {}, ["no_social_links"]);
    expect(out.map(s => s.key)).toEqual(["no_social_links"]);
  });

  it("does not emit an unselected signal even when present", () => {
    const out = detectOpportunitySignals(baseFacts({ bookingLinks: [], ctaTexts: [] }), {}, ["no_social_links"]);
    expect(out.some(s => s.key === "no_booking")).toBe(false);
  });

  it("flags no_booking when no booking link or booking CTA exists", () => {
    const out = detectOpportunitySignals(baseFacts({ bookingLinks: [], ctaTexts: ["Learn more"] }), {}, ["no_booking"]);
    const sig = out.find(s => s.key === "no_booking")!;
    expect(sig.present).toBe(true);
    expect(sig.evidence?.snippet).toBeTruthy();
  });

  it("flags weak_website and boosts confidence from techStack/ssl when present", () => {
    const thin = detectOpportunitySignals(baseFacts({ homepageTextLength: 200, title: undefined }), {}, ["weak_website"]);
    const boosted = detectOpportunitySignals(
      baseFacts({ homepageTextLength: 200, title: undefined }),
      { techStack: ["wix"], ssl: { valid: false, httpsRedirect: false } },
      ["weak_website"],
    );
    expect(thin.find(s => s.key === "weak_website")!.present).toBe(true);
    expect(boosted.find(s => s.key === "weak_website")!.confidence)
      .toBeGreaterThan(thin.find(s => s.key === "weak_website")!.confidence);
  });

  it("flags low_reviews when reviewCount is below threshold", () => {
    const out = detectOpportunitySignals(baseFacts(), { reviewCount: 4 }, ["low_reviews"]);
    expect(out.find(s => s.key === "low_reviews")!.present).toBe(true);
  });

  it("degrades low_reviews to low confidence and does not throw when reviewCount is absent", () => {
    const out = detectOpportunitySignals(baseFacts(), {}, ["low_reviews"]);
    const sig = out.find(s => s.key === "low_reviews")!;
    expect(sig.present).toBe(false);
    expect(sig.confidence).toBeLessThan(30);
  });

  it("every present signal carries evidence with sourceUrl and snippet", () => {
    const out = detectOpportunitySignals(
      baseFacts({ bookingLinks: [], ctaTexts: [], socialLinks: [] }),
      {},
      ["no_booking", "no_social_links"],
    );
    for (const sig of out.filter(s => s.present)) {
      expect(sig.evidence?.sourceUrl).toBeDefined();
      expect(sig.evidence?.snippet).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd run test -- detectOpportunitySignals`
Expected: FAIL with module-not-found / `detectOpportunitySignals is not a function`.

- [ ] **Step 3: Implement the detector**

Create `src/lib/detectOpportunitySignals.ts`:

```ts
import type { OpportunitySignalKey } from "@/lib/opportunitySignals";
import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";

// Tunable thresholds (see design spec).
export const THIN_SITE_TEXT_LENGTH = 1200;
export const LOW_REVIEW_COUNT = 18;
export const WEAK_RATING = 4.0;

const BOOKING_CTA_RE = /\b(book|appointment|schedule|reserve|booking|agendar|reserva)\b/i;
const ACTION_CTA_RE = /\b(book|quote|call|contact|get started|sign up|schedule|request|buy|order|subscribe|consult|estimate)\b/i;

export interface EnrichmentContext {
  rating?: number;
  reviewCount?: number;
  hasWebsite?: boolean;
  techStack?: string[];
  ssl?: { valid: boolean; httpsRedirect: boolean };
  // Reserved for future async enrichers; undefined in this spec.
  pageSpeed?: { performance: number; lcpMs: number; mobileFriendly: boolean };
}

export interface DetectedSignal {
  key: OpportunitySignalKey;
  present: boolean;
  confidence: number;
  evidence?: { sourceUrl: string; snippet: string };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

type Detector = (facts: WebsiteSignals, ctx: EnrichmentContext) => DetectedSignal;

const sourceUrlOf = (facts: WebsiteSignals) => facts.pagesScanned[0] || "";
const pageCount = (facts: WebsiteSignals) => facts.pagesScanned.length;

const DETECTORS: Record<OpportunitySignalKey, Detector> = {
  weak_website: (facts, ctx) => {
    const reasons: string[] = [];
    if (facts.homepageTextLength < THIN_SITE_TEXT_LENGTH) reasons.push("thin homepage content");
    if (!facts.title) reasons.push("missing page title");
    if (!facts.metaDescription) reasons.push("missing meta description");
    const ssl = ctx.ssl ?? facts.ssl;
    if (ssl && ssl.valid === false) reasons.push("no valid HTTPS");
    const techStack = ctx.techStack ?? facts.techStack;
    if (techStack && techStack.some(t => ["wix", "godaddy", "weebly", "legacy-jquery"].includes(t))) {
      reasons.push(`built on ${techStack[0]}`);
    }
    return {
      key: "weak_website",
      present: reasons.length > 0,
      confidence: clamp(reasons.length ? 40 + reasons.length * 15 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: reasons.join("; ") || "website looks healthy" },
    };
  },

  no_booking: (facts) => {
    const hasBookingCta = facts.ctaTexts.some(t => BOOKING_CTA_RE.test(t));
    const present = facts.bookingLinks.length === 0 && !hasBookingCta;
    return {
      key: "no_booking",
      present,
      confidence: clamp(present ? 70 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: present ? `no booking link found across ${pageCount(facts)} page(s) scanned` : facts.bookingLinks[0] || "booking CTA present" },
    };
  },

  no_clear_cta: (facts) => {
    const hasAction = facts.ctaTexts.some(t => ACTION_CTA_RE.test(t));
    return {
      key: "no_clear_cta",
      present: !hasAction,
      confidence: clamp(!hasAction ? 65 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: !hasAction ? "no clear action CTA (book/quote/contact) found" : facts.ctaTexts.find(t => ACTION_CTA_RE.test(t)) || "" },
    };
  },

  generic_inbox: (facts) => ({
    key: "generic_inbox",
    present: facts.hasGenericInboxOnly,
    confidence: clamp(facts.hasGenericInboxOnly ? 75 : 10),
    evidence: { sourceUrl: sourceUrlOf(facts), snippet: facts.hasGenericInboxOnly ? "only generic inbox emails (info@/contact@) found" : "person-style inbox present" },
  }),

  no_contact_form: (facts) => {
    const present = !facts.contactFormFound;
    return {
      key: "no_contact_form",
      present,
      confidence: clamp(present ? 70 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: present ? "no contact form found on scanned pages" : "contact form present" },
    };
  },

  no_social_links: (facts) => {
    const present = facts.socialLinks.length === 0;
    return {
      key: "no_social_links",
      present,
      confidence: clamp(present ? 80 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: present ? "no social links found" : facts.socialLinks[0] },
    };
  },

  low_reviews: (facts, ctx) => {
    if (typeof ctx.reviewCount !== "number") {
      return { key: "low_reviews", present: false, confidence: 15, evidence: { sourceUrl: sourceUrlOf(facts), snippet: "review data unavailable" } };
    }
    const present = ctx.reviewCount < LOW_REVIEW_COUNT;
    return {
      key: "low_reviews",
      present,
      confidence: clamp(present ? 75 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: `${ctx.reviewCount} public review(s)` },
    };
  },

  weak_local_presence: (facts, ctx) => {
    if (typeof ctx.reviewCount !== "number" && typeof ctx.rating !== "number") {
      return { key: "weak_local_presence", present: false, confidence: 15, evidence: { sourceUrl: sourceUrlOf(facts), snippet: "local presence data unavailable" } };
    }
    const lowReviews = (ctx.reviewCount ?? Number.POSITIVE_INFINITY) < LOW_REVIEW_COUNT;
    const weakRating = (ctx.rating ?? 5) < WEAK_RATING;
    const present = lowReviews && weakRating;
    return {
      key: "weak_local_presence",
      present,
      confidence: clamp(present ? 60 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: `rating ${ctx.rating ?? "n/a"}, ${ctx.reviewCount ?? "n/a"} review(s)` },
    };
  },
};

export function detectOpportunitySignals(
  facts: WebsiteSignals,
  context: EnrichmentContext,
  selectedKeys: OpportunitySignalKey[],
): DetectedSignal[] {
  const unique = [...new Set(selectedKeys)];
  return unique
    .filter((key): key is OpportunitySignalKey => key in DETECTORS)
    .map(key => DETECTORS[key](facts, context));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd run test -- detectOpportunitySignals`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/detectOpportunitySignals.ts src/lib/detectOpportunitySignals.test.ts
git commit -m "feat: add detectOpportunitySignals with selected-key-only emission and tests"
```

---

## Task 5: Wire the detector into the live search flow

**Files:**
- Modify: `src/components/landing/LeadGeneratorSection.tsx`

Scope guard: do NOT change the `saved_leads` insert payload, result cards, exports, or AI scoring.

- [ ] **Step 1: Import the detector and types**

In the imports block of `src/components/landing/LeadGeneratorSection.tsx` (near the existing `from "@/lib/opportunitySignals"` import, line ~39), add:

```ts
import { detectOpportunitySignals, type DetectedSignal } from "@/lib/detectOpportunitySignals";
import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";
```

- [ ] **Step 2: Extend the `Business` interface with review fields**

Update the `Business` interface (currently lines 42-51) to add the two optional fields returned by `search-places`:

```ts
interface Business {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
}
```

- [ ] **Step 3: Extend the `LeadResult` interface with signal fields**

Update the `LeadResult` interface (currently lines 68-80) to carry the new in-memory fields:

```ts
interface LeadResult extends Business {
  emails: string[];
  whatsapp: string[];
  linkedinUrl?: string;
  socialLinks?: string[];
  contactPageFound: boolean;
  emailSource?: "firecrawl" | "hunter" | "both" | "none";
  contacts: DecisionMakerContact[];
  leadQualityScore?: number;
  leadQualityLabel?: "Strong lead" | "Good lead" | "Needs work";
  leadQualityReason?: string;
  dbId?: string;
  websiteSignals?: WebsiteSignals;
  detectedSignals?: DetectedSignal[];
}
```

- [ ] **Step 4: Map `websiteSignals` and run the detector on the successful lead**

In the contact-enrichment loop, replace the `const lead = { ... }` success-mapping block (currently lines 1570-1579) with one that maps `websiteSignals` and computes `detectedSignals`:

```ts
          const websiteSignals: WebsiteSignals | undefined = contactResponse.data?.websiteSignals;
          const detectedSignals = websiteSignals
            ? detectOpportunitySignals(
                websiteSignals,
                {
                  rating: business.rating,
                  reviewCount: business.reviewCount,
                  hasWebsite: Boolean(business.website),
                  techStack: websiteSignals.techStack,
                  ssl: websiteSignals.ssl,
                },
                config.opportunitySignals || [],
              )
            : undefined;
          const lead = {
            ...business,
            emails: contactResponse.data?.emails || [],
            whatsapp: contactResponse.data?.whatsapp || [],
            linkedinUrl: contactResponse.data?.linkedinUrl,
            socialLinks: contactResponse.data?.socialLinks || [],
            contactPageFound: contactResponse.data?.contactPageFound || false,
            emailSource: contactResponse.data?.emailSource || "none",
            contacts: contactResponse.data?.contacts || [],
            websiteSignals,
            detectedSignals,
          };
          leads.push(lead);
```

(Leave the surrounding `setSearchStepStatus(...)` line and the `catch` block unchanged.)

- [ ] **Step 5: Verify the full build and test suite**

Run: `npm.cmd run build`
Expected: build succeeds (TypeScript accepts the new fields and imports).

Run: `npm.cmd run test`
Expected: all tests pass, including `websiteSignals` and `detectOpportunitySignals` suites.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/LeadGeneratorSection.tsx
git commit -m "feat: detect opportunity signals on scanned leads (in-memory, selected keys)"
```

---

## Codex Verification Prompts

Run the matching prompt after each task. (Full text in the spec: `docs/superpowers/specs/2026-06-05-opportunity-signal-detection-design.md`, "Codex Verification Prompts".)

- After Task 3 → **Part A** prompt (search-places rating/reviews, no SKU change).
- After Task 2 → **Part B** prompt (websiteSignals shape, zero new fetches, backward-compatible response).
- After Tasks 1 & 4 → **Part C** prompt (detector: selected-keys-only, graceful degradation, evidence on every present signal).
- After Task 5 → **Part D** prompt (wiring, scope guard: no saved_leads/card/export changes).
- After all tasks → **Final integration check** prompt.

---

## Self-Review Notes

- **Spec coverage:** Part A → Task 3; Part B → Tasks 1+2; Part C (detector) → Task 4; Part D → Task 5. All 8 detection rules implemented in Task 4. `low_reviews` threshold = 18 (matches spec). Pluggable `EnrichmentContext.pageSpeed` slot present but unused (Task 4). Non-goals (persistence, cards, AI, exports, external APIs) untouched — enforced by the Task 5 scope guard and Codex Part D/Final prompts.
- **Type consistency:** `WebsiteSignals` defined once in Task 1 and imported everywhere; `buildWebsiteSignals` input/output names match across Tasks 1, 2, 5; `detectOpportunitySignals(facts, context, selectedKeys)` signature identical in Tasks 4 and 5; `DetectedSignal`/`EnrichmentContext` names consistent.
- **Note on `hasWebsite`:** populated in Task 5 for completeness; in the live flow only websited businesses reach extraction, so `weak_local_presence` keys primarily off review/rating thresholds (documented behavior, not a bug).
