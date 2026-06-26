import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Bet } from "@/lib/worldcupScoring";
import type { MyPrediction } from "@/hooks/useFeaturedMatch";

export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: string;
  status: "upcoming" | "locked" | "finished";
  homeScore: number | null;
  awayScore: number | null;
  isFeatured: boolean;
}

// Loads the day's World Cup fixtures (a rolling window starting at local
// midnight) plus the signed-in user's prediction for each, and submits a bet
// against a specific match.
export function useWorldCupFixtures(userId?: string, windowDays = 3) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [predictions, setPredictions] = useState<Record<string, MyPrediction>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + windowDays);

    const { data: ms } = await supabase
      .from("worldcup_matches")
      .select("id, home_team, away_team, home_flag, away_flag, kickoff_at, status, home_score, away_score, is_featured")
      .gte("kickoff_at", start.toISOString())
      .lt("kickoff_at", end.toISOString())
      .order("kickoff_at", { ascending: true });

    const fx: Fixture[] = (ms ?? []).map((m) => ({
      id: m.id,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeFlag: m.home_flag,
      awayFlag: m.away_flag,
      kickoffAt: m.kickoff_at,
      status: m.status,
      homeScore: m.home_score,
      awayScore: m.away_score,
      isFeatured: m.is_featured,
    }));
    setFixtures(fx);

    if (userId && fx.length) {
      const { data: ps } = await supabase
        .from("worldcup_predictions")
        .select("match_id, bet_type, pred_outcome, pred_home, pred_away, is_winner, prize")
        .eq("user_id", userId)
        .in("match_id", fx.map((f) => f.id));
      const map: Record<string, MyPrediction> = {};
      for (const p of ps ?? []) {
        map[p.match_id] = {
          betType: (p.bet_type as "result" | "exact") ?? "exact",
          predOutcome: (p.pred_outcome as "home" | "draw" | "away" | null) ?? null,
          predHome: p.pred_home,
          predAway: p.pred_away,
          isWinner: p.is_winner,
          prize: p.prize ?? null,
        };
      }
      setPredictions(map);
    } else {
      setPredictions({});
    }
    setLoading(false);
  }, [userId, windowDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (matchId: string, bet: Bet) => {
      if (!userId) return { ok: false, error: "Please sign in to predict." };
      const row =
        bet.type === "exact"
          ? { user_id: userId, match_id: matchId, bet_type: "exact", pred_home: bet.home, pred_away: bet.away }
          : { user_id: userId, match_id: matchId, bet_type: "result", pred_outcome: bet.outcome };
      const { error } = await supabase.from("worldcup_predictions").insert(row);
      if (error) {
        return { ok: false, error: error.code === "23505" ? "You already predicted this match." : error.message };
      }
      await load();
      return { ok: true };
    },
    [userId, load],
  );

  return { fixtures, predictions, loading, submit, refetch: load };
}
