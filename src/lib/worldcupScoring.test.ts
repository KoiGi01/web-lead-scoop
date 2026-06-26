import { describe, it, expect } from "vitest";
import { isExactScoreWinner, formatScore, matchOutcome, resolvePrize } from "./worldcupScoring";

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

describe("matchOutcome", () => {
  it("returns home when home scores more", () => {
    expect(matchOutcome({ home: 2, away: 1 })).toBe("home");
  });
  it("returns away when away scores more", () => {
    expect(matchOutcome({ home: 0, away: 3 })).toBe("away");
  });
  it("returns draw on equal scores", () => {
    expect(matchOutcome({ home: 1, away: 1 })).toBe("draw");
    expect(matchOutcome({ home: 0, away: 0 })).toBe("draw");
  });
});

describe("resolvePrize — exact-score bet", () => {
  it("wins free_month only on the precise scoreline", () => {
    expect(resolvePrize({ type: "exact", home: 2, away: 1 }, { home: 2, away: 1 })).toBe("free_month");
  });
  it("wins nothing if the score is off, even with the right result", () => {
    expect(resolvePrize({ type: "exact", home: 3, away: 1 }, { home: 2, away: 1 })).toBeNull();
  });
});

describe("resolvePrize — result bet", () => {
  it("wins half_off when the called result is correct", () => {
    expect(resolvePrize({ type: "result", outcome: "home" }, { home: 2, away: 1 })).toBe("half_off");
  });
  it("wins half_off on a correctly-called draw", () => {
    expect(resolvePrize({ type: "result", outcome: "draw" }, { home: 1, away: 1 })).toBe("half_off");
  });
  it("wins nothing on the wrong result", () => {
    expect(resolvePrize({ type: "result", outcome: "away" }, { home: 2, away: 1 })).toBeNull();
  });
});
