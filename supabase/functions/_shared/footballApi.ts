// Pure, dependency-free parsers for football-data.org responses.
// Imported and unit-tested from src/ (no Deno globals at module top level).

export interface ParsedMatch {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  isFinished: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

export function parseMatch(raw: any): ParsedMatch {
  const full = raw?.score?.fullTime ?? {};
  return {
    externalId: String(raw.id),
    homeTeam: raw?.homeTeam?.name ?? "",
    awayTeam: raw?.awayTeam?.name ?? "",
    kickoffAt: raw.utcDate,
    isFinished: raw.status === "FINISHED",
    homeScore: typeof full.home === "number" ? full.home : null,
    awayScore: typeof full.away === "number" ? full.away : null,
  };
}

const DEAD_STATUSES = new Set(["FINISHED", "POSTPONED", "CANCELLED", "SUSPENDED"]);

export function pickNextUpcoming(matches: any[], nowIso: string): ParsedMatch | null {
  const now = Date.parse(nowIso);
  const upcoming = matches
    .filter((m) => !DEAD_STATUSES.has(m.status) && Date.parse(m.utcDate) > now)
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
  return upcoming.length ? parseMatch(upcoming[0]) : null;
}

// Thin fetch wrapper (used by the edge function; not unit-tested).
export async function fetchWorldCupMatches(apiKey: string): Promise<any[]> {
  const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": apiKey },
  });
  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.matches) ? data.matches : [];
}
