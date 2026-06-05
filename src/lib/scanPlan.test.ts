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
