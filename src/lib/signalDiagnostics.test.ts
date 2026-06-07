import { describe, it, expect } from "vitest";
import { computeSignalDiagnostics } from "@/lib/signalDiagnostics";
import type { DetectedSignal } from "@/lib/detectOpportunitySignals";
import type { OpportunitySignalKey } from "@/lib/opportunitySignals";

const sig = (key: OpportunitySignalKey, present: boolean): DetectedSignal => ({
  key,
  present,
  confidence: present ? 80 : 20,
});

const selected: OpportunitySignalKey[] = ["weak_website", "low_reviews", "no_social_links"];

describe("computeSignalDiagnostics", () => {
  it("returns zeros for no leads, with a zero entry per selected key", () => {
    const result = computeSignalDiagnostics([], selected);
    expect(result.sitesScanned).toBe(0);
    expect(result.sitesUnreadable).toBe(0);
    expect(result.sitesWithSignals).toBe(0);
    expect(result.perSignal).toEqual([
      { key: "weak_website", present: 0 },
      { key: "low_reviews", present: 0 },
      { key: "no_social_links", present: 0 },
    ]);
  });

  it("counts scanned candidates, unreadable scrapes, and sites with >=1 present signal", () => {
    const leads = [
      // A: readable, has a present signal
      { website: "https://a.com", websiteSignals: {}, detectedSignals: [sig("weak_website", true), sig("low_reviews", false)] },
      // B: website but scrape failed (no websiteSignals) -> unreadable
      { website: "https://b.com", websiteSignals: undefined, detectedSignals: undefined },
      // C: readable, all selected signals absent -> no signals
      { website: "https://c.com", websiteSignals: {}, detectedSignals: [sig("weak_website", false), sig("low_reviews", false)] },
      // D: no website -> not a detection candidate, excluded
      { website: undefined, websiteSignals: undefined, detectedSignals: undefined },
    ];

    const result = computeSignalDiagnostics(leads, selected);

    expect(result.sitesScanned).toBe(3); // A, B, C
    expect(result.sitesUnreadable).toBe(1); // B
    expect(result.sitesWithSignals).toBe(1); // A
    expect(result.perSignal).toEqual([
      { key: "weak_website", present: 1 }, // A
      { key: "low_reviews", present: 0 },
      { key: "no_social_links", present: 0 },
    ]);
  });

  it("per-signal counts only present===true and only selected keys", () => {
    const leads = [
      {
        website: "https://x.com",
        websiteSignals: {},
        detectedSignals: [
          sig("low_reviews", true),
          sig("no_booking", true), // present but NOT selected -> must be ignored
        ],
      },
    ];

    const result = computeSignalDiagnostics(leads, selected);

    expect(result.sitesWithSignals).toBe(1);
    expect(result.perSignal).toEqual([
      { key: "weak_website", present: 0 },
      { key: "low_reviews", present: 1 },
      { key: "no_social_links", present: 0 },
    ]);
  });
});
