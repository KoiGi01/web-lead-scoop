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

// Loads the current day's World Cup fixtures (local-midnight to local-midnight)
// plus the signed-in user's prediction for each, and submits a bet against a
// specific match.
export interface Entries {
  allowed: number;
  used: number;
  remaining: number;
}

const REF_KEY = "gl22:wc-ref";

export function useWorldCupFixtures(userId?: string, windowDays = 1) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [predictions, setPredictions] = useState<Record<string, MyPrediction>>({});
  const [entries, setEntries] = useState<Entries>({ allowed: 1, used: 0, remaining: 1 });
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

    // Entry allowance: 1 base + 1 per referred person who has predicted; used =
    // the user's total predictions across all matches.
    if (userId) {
      const [{ count: refCount }, { count: usedCount }] = await Promise.all([
        supabase.from("worldcup_entrants").select("user_id", { count: "exact", head: true }).eq("referred_by", userId),
        supabase.from("worldcup_predictions").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      const allowed = 1 + (refCount ?? 0);
      const used = usedCount ?? 0;
      setEntries({ allowed, used, remaining: Math.max(0, allowed - used) });
    } else {
      setEntries({ allowed: 1, used: 0, remaining: 1 });
    }
    setLoading(false);
  }, [userId, windowDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (matchId: string, bet: Bet) => {
      if (!userId) return { ok: false, error: "Please sign in to predict." };
      let ref: string | null = null;
      try {
        ref = window.localStorage.getItem(REF_KEY);
      } catch {
        ref = null;
      }
      // Server-side gated insert (enforces the one-entry allowance + referrals).
      const { data, error } = await supabase.functions.invoke("submit-prediction", {
        body: { matchId, bet, ref: ref || undefined },
      });
      if (error || (data && data.error)) {
        // Edge function returns a JSON error body even on non-2xx.
        let msg = data?.error;
        if (!msg && error) {
          try {
            const ctx = await (error as { context?: Response }).context?.json?.();
            msg = ctx?.error;
          } catch {
            msg = undefined;
          }
        }
        return { ok: false, error: msg || "Could not submit your prediction." };
      }
      try {
        window.localStorage.removeItem(REF_KEY);
      } catch {
        /* ignore */
      }
      await load();
      return { ok: true };
    },
    [userId, load],
  );

  return { fixtures, predictions, entries, loading, submit, refetch: load };
}
