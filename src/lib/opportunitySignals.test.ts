import { describe, it, expect } from "vitest";
import { getServiceRecommendedSignalKeys, getServiceSignalKeys, opportunitySignalLabels } from "@/lib/opportunitySignals";

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

describe("getServiceSignalKeys (service-relevant set for the selector)", () => {
  it("returns ALL signals whose services include the exact service (uncapped, in option order)", () => {
    expect(getServiceSignalKeys("Web design")).toEqual([
      "weak_website",
      "no_booking",
      "no_clear_cta",
      "no_social_links",
      "no_contact_form",
    ]);
  });

  it("returns only the few signals relevant to a narrow service", () => {
    expect(getServiceSignalKeys("Social media marketing")).toEqual(["low_reviews", "no_social_links"]);
  });

  it("is case-insensitive", () => {
    expect(getServiceSignalKeys("web design")).toEqual(getServiceSignalKeys("Web design"));
  });

  it("falls back to keyword recommendations for a custom/unknown service", () => {
    // no exact services match -> regex fallback inside getServiceRecommendedSignalKeys
    expect(getServiceSignalKeys("Landing page redesign")).toEqual(
      getServiceRecommendedSignalKeys("Landing page redesign"),
    );
  });

  it("falls back to the generic default for an empty service", () => {
    expect(getServiceSignalKeys("")).toEqual(["weak_website", "no_clear_cta", "generic_inbox"]);
  });
});
