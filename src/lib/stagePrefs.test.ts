import { describe, it, expect } from "vitest";
import { parseStagePrefs, NON_NEW_STAGES } from "@/lib/stagePrefs";

describe("parseStagePrefs", () => {
  it("returns defaults for null / non-object input", () => {
    expect(parseStagePrefs(null)).toEqual({ order: NON_NEW_STAGES, labels: {} });
    expect(parseStagePrefs("nope")).toEqual({ order: NON_NEW_STAGES, labels: {} });
  });

  it("keeps a valid custom order", () => {
    const order = ["lost", "won", "proposal", "qualified", "contacted"];
    expect(parseStagePrefs({ order }).order).toEqual(order);
  });

  it("drops unknown stages and appends missing ones (never includes 'new')", () => {
    const result = parseStagePrefs({ order: ["won", "bogus", "new", "contacted"] });
    expect(result.order).toEqual(["won", "contacted", "qualified", "proposal", "lost"]);
    expect(result.order).not.toContain("new");
  });

  it("keeps only string labels for non-new stages", () => {
    const result = parseStagePrefs({
      labels: { contacted: "Reached out", won: 5, new: "Fresh", bogus: "x" },
    });
    expect(result.labels).toEqual({ contacted: "Reached out" });
  });

  it("dedupes repeated stages in custom order", () => {
    const result = parseStagePrefs({ order: ["won", "won", "lost"] });
    expect(result.order).toEqual(["won", "lost", "contacted", "qualified", "proposal"]);
  });

  it("drops empty / whitespace-only labels", () => {
    const result = parseStagePrefs({ labels: { contacted: "  ", qualified: "Vetted" } });
    expect(result.labels).toEqual({ qualified: "Vetted" });
  });
});
