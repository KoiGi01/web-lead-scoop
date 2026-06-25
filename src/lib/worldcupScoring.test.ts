import { describe, it, expect } from "vitest";
import { isExactScoreWinner, formatScore, matchOutcome, getPrizeTier } from "./worldcupScoring";

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

describe("getPrizeTier", () => {
  it("awards free_month for the exact score", () => {
    expect(getPrizeTier({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe("free_month");
  });
  it("awards half_off for the right outcome but wrong score", () => {
    expect(getPrizeTier({ home: 3, away: 1 }, { home: 2, away: 1 })).toBe("half_off");
  });
  it("awards half_off for a correctly-called draw with the wrong score", () => {
    expect(getPrizeTier({ home: 2, away: 2 }, { home: 1, away: 1 })).toBe("half_off");
  });
  it("awards nothing for the wrong outcome", () => {
    expect(getPrizeTier({ home: 1, away: 2 }, { home: 2, away: 1 })).toBeNull();
  });
});
