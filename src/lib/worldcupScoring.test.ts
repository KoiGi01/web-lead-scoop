import { describe, it, expect } from "vitest";
import { isExactScoreWinner, formatScore } from "./worldcupScoring";

describe("isExactScoreWinner", () => {
  it("is true when both scores match exactly", () => {
    expect(isExactScoreWinner({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(true);
  });

  it("is false when only one side matches", () => {
    expect(isExactScoreWinner({ home: 2, away: 1 }, { home: 2, away: 0 })).toBe(false);
    expect(isExactScoreWinner({ home: 2, away: 1 }, { home: 1, away: 1 })).toBe(false);
  });

  it("is false when the scoreline is reversed", () => {
    expect(isExactScoreWinner({ home: 2, away: 1 }, { home: 1, away: 2 })).toBe(false);
  });

  it("handles a 0-0 draw", () => {
    expect(isExactScoreWinner({ home: 0, away: 0 }, { home: 0, away: 0 })).toBe(true);
  });
});

describe("formatScore", () => {
  it("formats with an en dash", () => {
    expect(formatScore({ home: 2, away: 1 })).toBe("2–1");
  });
});
