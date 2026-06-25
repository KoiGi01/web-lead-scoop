import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: "upcoming" | "locked" | "finished";
  homeScore: number | null;
  awayScore: number | null;
}

export interface MyPrediction {
  predHome: number;
  predAway: number;
  isWinner: boolean;
}

export function useFeaturedMatch(userId?: string) {
  const [match, setMatch] = useState<FeaturedMatch | null>(null);
  const [myPrediction, setMyPrediction] = useState<MyPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: m } = await supabase
      .from("worldcup_matches")
      .select("id, home_team, away_team, kickoff_at, status, home_score, away_score")
      .eq("is_featured", true)
      .maybeSingle();

    const nextMatch: FeaturedMatch | null = m
      ? {
          id: m.id,
          homeTeam: m.home_team,
          awayTeam: m.away_team,
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
        .select("pred_home, pred_away, is_winner")
        .eq("user_id", userId)
        .eq("match_id", nextMatch.id)
        .maybeSingle();
      setMyPrediction(p ? { predHome: p.pred_home, predAway: p.pred_away, isWinner: p.is_winner } : null);
    } else {
      setMyPrediction(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (home: number, away: number) => {
      if (!match || !userId) return { ok: false, error: "Not ready" };
      const { error } = await supabase
        .from("worldcup_predictions")
        .insert({ user_id: userId, match_id: match.id, pred_home: home, pred_away: away });
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
