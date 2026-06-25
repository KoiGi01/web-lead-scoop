export interface ExactScore {
  home: number;
  away: number;
}

export function isExactScoreWinner(prediction: ExactScore, result: ExactScore): boolean {
  return prediction.home === result.home && prediction.away === result.away;
}

export function formatScore(score: ExactScore): string {
  return `${score.home}–${score.away}`;
}
