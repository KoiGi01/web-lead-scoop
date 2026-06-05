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
