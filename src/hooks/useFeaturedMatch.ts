import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Bet } from "@/lib/worldcupScoring";

export interface FeaturedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: string;
  status: "upcoming" | "locked" | "finished";
  homeScore: number | null;
  awayScore: number | null;
}

export interface MyPrediction {
  betType: "result" | "exact";
  predOutcome: "home" | "draw" | "away" | null;
  predHome: number | null;
  predAway: number | null;
  isWinner: boolean;
  prize: "free_month" | "half_off" | null;
}

export function useFeaturedMatch(userId?: string) {
  const [match, setMatch] = useState<FeaturedMatch | null>(null);
  const [myPrediction, setMyPrediction] = useState<MyPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: m } = await supabase
      .from("worldcup_matches")
      .select("id, home_team, away_team, home_flag, away_flag, kickoff_at, status, home_score, away_score")
      .eq("is_featured", true)
      .maybeSingle();

    const nextMatch: FeaturedMatch | null = m
      ? {
          id: m.id,
          homeTeam: m.home_team,
          awayTeam: m.away_team,
          homeFlag: m.home_flag,
          awayFlag: m.away_flag,
          kickoffAt: m.kickoff_at,
          status: m.status,
          homeScore: m.home_score,
          awayScore: m.away_score,
        }
      : null;
    setMatch(nextMatch);

    if (nextMatch && userId) {
      const { data: p } = await supabase
        .from("worldcup_predictions")
        .select("bet_type, pred_outcome, pred_home, pred_away, is_winner, prize")
        .eq("user_id", userId)
        .eq("match_id", nextMatch.id)
        .maybeSingle();
      setMyPrediction(
        p
          ? {
              betType: (p.bet_type as "result" | "exact") ?? "exact",
              predOutcome: (p.pred_outcome as "home" | "draw" | "away" | null) ?? null,
              predHome: p.pred_home,
              predAway: p.pred_away,
              isWinner: p.is_winner,
              prize: p.prize ?? null,
            }
          : null,
      );
    } else {
      setMyPrediction(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (bet: Bet) => {
      if (!match || !userId) return { ok: false, error: "Not ready" };
      const row =
        bet.type === "exact"
          ? { user_id: userId, match_id: match.id, bet_type: "exact", pred_home: bet.home, pred_away: bet.away }
          : { user_id: userId, match_id: match.id, bet_type: "result", pred_outcome: bet.outcome };
      const { error } = await supabase.from("worldcup_predictions").insert(row);
      if (error) {
        const already = error.code === "23505";
        return { ok: false, error: already ? "You already predicted this match." : error.message };
      }
      await load();
      return { ok: true };
    },
    [match, userId, load],
  );

  return { match, myPrediction, loading, submit, refetch: load };
}
