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
