import { describe, it, expect } from "vitest";
import { resolveSelectedLeadId } from "@/lib/leadSelection";

describe("resolveSelectedLeadId", () => {
  it("returns null when there are no leads (both modes)", () => {
    expect(resolveSelectedLeadId(true, "a", [])).toBeNull();
    expect(resolveSelectedLeadId(false, "a", [])).toBeNull();
  });

  describe("modal mode (pipeline) — selection is closeable", () => {
    it("stays null when nothing is selected (does NOT auto-open)", () => {
      // This is the bug: previously this returned the first lead, reopening the modal.
      expect(resolveSelectedLeadId(true, null, ["a", "b", "c"])).toBeNull();
    });

    it("keeps a valid selection", () => {
      expect(resolveSelectedLeadId(true, "b", ["a", "b", "c"])).toBe("b");
    });

    it("closes (null) when the selected lead is no longer present", () => {
      expect(resolveSelectedLeadId(true, "z", ["a", "b", "c"])).toBeNull();
    });
  });

  describe("panel mode (inbox/follow-ups/saved) — selection is persistent", () => {
    it("defaults to the first lead when nothing is selected", () => {
      expect(resolveSelectedLeadId(false, null, ["a", "b", "c"])).toBe("a");
    });

    it("falls back to the first lead when the selection is stale", () => {
      expect(resolveSelectedLeadId(false, "z", ["a", "b", "c"])).toBe("a");
    });

    it("keeps a valid selection", () => {
      expect(resolveSelectedLeadId(false, "b", ["a", "b", "c"])).toBe("b");
    });
  });
});
