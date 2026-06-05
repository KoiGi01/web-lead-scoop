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
