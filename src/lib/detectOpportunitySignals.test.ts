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
