import { describe, it, expect } from "vitest";
import { parseMatch, pickNextUpcoming } from "../../supabase/functions/_shared/footballApi";

const finished = {
  id: 537001,
  utcDate: "2026-06-20T19:00:00Z",
  status: "FINISHED",
  homeTeam: { name: "Brazil" },
  awayTeam: { name: "Argentina" },
  score: { fullTime: { home: 2, away: 1 } },
};

const upcoming = {
  id: 537002,
  utcDate: "2026-06-28T19:00:00Z",
  status: "TIMED",
  homeTeam: { name: "France" },
  awayTeam: { name: "Spain" },
  score: { fullTime: { home: null, away: null } },
};

describe("parseMatch", () => {
  it("maps a finished match with scores", () => {
    const m = parseMatch(finished);
    expect(m).toEqual({
      externalId: "537001",
      homeTeam: "Brazil",
      awayTeam: "Argentina",
      kickoffAt: "2026-06-20T19:00:00Z",
      isFinished: true,
      homeScore: 2,
      awayScore: 1,
    });
  });

  it("maps an upcoming match with null scores", () => {
    const m = parseMatch(upcoming);
    expect(m.isFinished).toBe(false);
    expect(m.homeScore).toBeNull();
    expect(m.externalId).toBe("537002");
  });
});

describe("pickNextUpcoming", () => {
  it("returns the earliest future, non-finished match", () => {
    const later = { ...upcoming, id: 537003, utcDate: "2026-07-02T19:00:00Z" };
    const picked = pickNextUpcoming([finished, later, upcoming], "2026-06-25T00:00:00Z");
    expect(picked?.externalId).toBe("537002");
  });

  it("returns null when nothing is upcoming", () => {
    expect(pickNextUpcoming([finished], "2026-06-25T00:00:00Z")).toBeNull();
  });
});
