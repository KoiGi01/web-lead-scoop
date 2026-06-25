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

export function isExactScoreWinner(prediction: ExactScore, result: ExactScore): boolean {
  return prediction.home === result.home && prediction.away === result.away;
}

export function matchOutcome(score: ExactScore): Outcome {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}

export function getPrizeTier(prediction: ExactScore, result: ExactScore): PrizeTier {
  if (isExactScoreWinner(prediction, result)) return "free_month";
  if (matchOutcome(prediction) === matchOutcome(result)) return "half_off";
  return null;
}

export function formatScore(score: ExactScore): string {
  return `${score.home}–${score.away}`;
}
