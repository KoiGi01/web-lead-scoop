import { describe, it, expect } from "vitest";
import { summarizeOpportunityCard } from "@/lib/opportunityCard";
import type { DetectedSignal } from "@/lib/detectOpportunitySignals";

const sig = (key: DetectedSignal["key"], present: boolean, confidence: number, evidence?: DetectedSignal["evidence"]): DetectedSignal => ({
  key,
  present,
  confidence,
  evidence,
});

describe("summarizeOpportunityCard", () => {
  it("returns no signals and empty whyText when detectedSignals is undefined", () => {
    const result = summarizeOpportunityCard(undefined, "Web design");
    expect(result.hasSignals).toBe(false);
    expect(result.presentSignals).toEqual([]);
    expect(result.whyText).toBe("");
  });

  it("keeps only present signals, sorted by confidence desc, with labels + evidence", () => {
    const evidence = { sourceUrl: "https://x.com", snippet: "thin homepage" };
    const result = summarizeOpportunityCard(
      [
        sig("no_booking", true, 78),
        sig("weak_website", true, 86, evidence),
        sig("low_reviews", false, 20),
      ],
      "Web design",
    );
    expect(result.hasSignals).toBe(true);
    expect(result.presentSignals).toEqual([
      { key: "weak_website", label: "Weak website", confidence: 86, evidence },
      { key: "no_booking", label: "No booking flow", confidence: 78, evidence: undefined },
    ]);
  });

  it("folds the service into whyText, using present signal labels in confidence order", () => {
    const result = summarizeOpportunityCard(
      [sig("weak_website", true, 86), sig("no_booking", true, 78)],
      "Web design",
    );
    expect(result.whyText).toBe("Web design opportunity — weak website, no booking flow.");
  });

  it("omits the service prefix when no service is given", () => {
    const result = summarizeOpportunityCard(
      [sig("low_reviews", true, 60), sig("no_social_links", true, 50)],
      "",
    );
    expect(result.whyText).toBe("Opportunity signals — low reviews, no social links.");
  });

  it("returns empty whyText (no fabricated reason) when no signals are present", () => {
    const result = summarizeOpportunityCard([sig("weak_website", false, 10)], "SEO");
    expect(result.hasSignals).toBe(false);
    expect(result.presentSignals).toEqual([]);
    expect(result.whyText).toBe("");
  });
});
