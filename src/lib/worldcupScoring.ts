export interface ExactScore {
  home: number;
  away: number;
}

export type Outcome = "home" | "draw" | "away";

// Two-tier promo prize:
//   free_month — predicted the exact scoreline (100% off, one month)
//   half_off   — predicted the right result but not the exact score (50% off)
//   null       — wrong result, no prize
export type PrizeTier = "free_month" | "half_off" | null;

// A user places ONE bet on ONE market:
//   result — predict only Home/Draw/Away  → 50% off if right
//   exact  — predict the precise scoreline → free month if right
export type Bet =
  | { type: "result"; outcome: Outcome }
  | { type: "exact"; home: number; away: number };

export function isExactScoreWinner(prediction: ExactScore, result: ExactScore): boolean {
  return prediction.home === result.home && prediction.away === result.away;
}

export function matchOutcome(score: ExactScore): Outcome {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}

export function resolvePrize(bet: Bet, result: ExactScore): PrizeTier {
  if (bet.type === "exact") {
    return bet.home === result.home && bet.away === result.away ? "free_month" : null;
  }
  return bet.outcome === matchOutcome(result) ? "half_off" : null;
}

export function formatScore(score: ExactScore): string {
  return `${score.home}–${score.away}`;
}
