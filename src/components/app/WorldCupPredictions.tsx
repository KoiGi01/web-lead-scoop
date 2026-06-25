import { useMemo, useState } from "react";
import { Trophy, Loader2, Share2 } from "lucide-react";
import { useFeaturedMatch } from "@/hooks/useFeaturedMatch";
import type { FeaturedMatch, MyPrediction } from "@/hooks/useFeaturedMatch";
import { formatScore, isExactScoreWinner } from "@/lib/worldcupScoring";
import { renderPredictionCard, downloadBlob } from "@/lib/predictionCard";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

interface Props {
  userId?: string;
  demoMode?: boolean;
}

// ── Demo-only helpers ──────────────────────────────────────────────────────
// Builds a self-contained sample match/prediction so the view is fully
// previewable without a `worldcup_matches` row, driven by `?demo_state=`.
type DemoState = "upcoming" | "locked" | "finished";

const DEMO_FINAL_SCORE = { home: 2, away: 1 };

function readDemoState(): DemoState {
  if (typeof window === "undefined") return "upcoming";
  const raw = new URLSearchParams(window.location.search).get("demo_state");
  return raw === "locked" || raw === "finished" ? raw : "upcoming";
}

function buildDemoMatch(demoState: DemoState): FeaturedMatch {
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (demoState === "locked") {
    return {
      id: "demo-match",
      homeTeam: "France",
      awayTeam: "Spain",
      kickoffAt: oneDayAgo,
      status: "locked",
      homeScore: null,
      awayScore: null,
    };
  }

  if (demoState === "finished") {
    return {
      id: "demo-match",
      homeTeam: "France",
      awayTeam: "Spain",
      kickoffAt: oneDayAgo,
      status: "finished",
      homeScore: DEMO_FINAL_SCORE.home,
      awayScore: DEMO_FINAL_SCORE.away,
    };
  }

  return {
    id: "demo-match",
    homeTeam: "France",
    awayTeam: "Spain",
    kickoffAt: threeDaysFromNow,
    status: "upcoming",
    homeScore: null,
    awayScore: null,
  };
}

const WorldCupPredictions = ({ userId, demoMode }: Props) => {
  // Hooks must always run unconditionally (React rules of hooks). In demo
  // mode we simply ignore the hook's (Supabase-backed) result below and use
  // a local mock instead.
  const hookResult = useFeaturedMatch(userId);

  const demoState = useMemo(() => (demoMode ? readDemoState() : "upcoming"), [demoMode]);
  const demoMatch = useMemo(() => buildDemoMatch(demoState), [demoState]);
  // Demo-only local prediction state — never touches Supabase.
  const [demoPrediction, setDemoPrediction] = useState<MyPrediction | null>(null);
  const demoSubmit = useMemo(
    () => async (predHome: number, predAway: number) => {
      const isWinner =
        demoState === "finished" && isExactScoreWinner({ home: predHome, away: predAway }, DEMO_FINAL_SCORE);
      setDemoPrediction({ predHome, predAway, isWinner });
      return { ok: true as const };
    },
    [demoState],
  );

  const match = demoMode ? demoMatch : hookResult.match;
  const myPrediction = demoMode ? demoPrediction : hookResult.myPrediction;
  const loading = demoMode ? false : hookResult.loading;
  const submit = demoMode ? demoSubmit : hookResult.submit;
  // ────────────────────────────────────────────────────────────────────────

  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const kickoffPassed = match ? Date.parse(match.kickoffAt) <= Date.now() : false;
  const locked = !match || match.status !== "upcoming" || kickoffPassed;

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await submit(home, away);
    setSubmitting(false);
    if (res.ok) {
      track("worldcup_prediction_submitted", { matchId: match?.id, home, away });
      toast({ title: "Prediction locked in!", description: `You predicted ${formatScore({ home, away })}.` });
    } else {
      toast({ title: "Could not submit", description: res.error, variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!match || !myPrediction) return;
    const blob = await renderPredictionCard({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      predHome: myPrediction.predHome,
      predAway: myPrediction.predAway,
    });
    downloadBlob(blob, "my-worldcup-prediction.png");
    track("worldcup_card_shared", { matchId: match.id });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[#9aa3b2]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Trophy className="mx-auto h-10 w-10 text-[#e8fb52]" />
        <h2 className="mt-4 font-display text-2xl font-black text-[#f3f5f8]">No match to predict right now</h2>
        <p className="mt-2 text-sm text-[#9aa3b2]">Check back soon — the next featured match drops shortly.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52]">
        <Trophy className="h-4 w-4" /> World Cup prediction — win a free month
      </div>
      <h1 className="mt-3 font-display text-3xl font-black text-[#f3f5f8]">
        {match.homeTeam} vs {match.awayTeam}
      </h1>
      <p className="mt-1 text-sm text-[#9aa3b2]">
        Kickoff {new Date(match.kickoffAt).toLocaleString()}. Predict the exact final score before kickoff.
      </p>

      {myPrediction ? (
        <div className="mt-8 border border-[#e8fb52]/30 bg-[#e8fb52]/10 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#e8fb52]">Your prediction</p>
          <p className="mt-2 font-display text-5xl font-black text-[#f3f5f8]">
            {formatScore({ home: myPrediction.predHome, away: myPrediction.predAway })}
          </p>
          {match.status === "finished" && (
            <p className="mt-3 text-sm text-[#9aa3b2]">
              Final: {formatScore({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 })}.{" "}
              {myPrediction.isWinner ? "You won — check your email for your code! \u{1f3c6}" : "So close — next match awaits."}
            </p>
          )}
          {match.status !== "finished" && locked && (
            <p className="mt-3 text-sm text-[#9aa3b2]">
              Match in progress — results and winners announced after full time.
            </p>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="mt-5 inline-flex items-center gap-2 border border-[#e8fb52] bg-[#e8fb52] px-4 py-2 font-display text-sm font-bold text-black hover:bg-[#f3ff8a]"
          >
            <Share2 className="h-4 w-4" /> Share my prediction
          </button>
        </div>
      ) : locked ? (
        <div className="mt-8 border border-[#f3f5f8]/10 bg-[#111319] p-6 text-sm text-[#9aa3b2]">
          Predictions are closed for this match. The next one opens soon.
        </div>
      ) : (
        <div className="mt-8 border border-[#f3f5f8]/10 bg-[#111319] p-6">
          <div className="flex items-center justify-center gap-6">
            <ScoreInput label={match.homeTeam} value={home} onChange={setHome} />
            <span className="font-display text-3xl font-black text-[#5d6675]">:</span>
            <ScoreInput label={match.awayTeam} value={away} onChange={setAway} />
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="mt-6 w-full border border-[#e8fb52] bg-[#e8fb52] px-4 py-3 font-display text-sm font-bold text-black hover:bg-[#f3ff8a] disabled:opacity-60"
          >
            {submitting ? "Locking in…" : "Lock in my prediction"}
          </button>
        </div>
      )}
    </div>
  );
};

const ScoreInput = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
  <div className="text-center">
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
      className="h-20 w-24 border border-[#f3f5f8]/15 bg-[#08090c] text-center font-display text-4xl font-black text-[#f3f5f8] focus:border-[#e8fb52] focus:outline-none"
    />
    <p className="mt-2 max-w-24 truncate font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2]">{label}</p>
  </div>
);

export default WorldCupPredictions;
