import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { Trophy, Loader2, Share2, Minus, Plus, Check, Percent } from "lucide-react";
import { useFeaturedMatch } from "@/hooks/useFeaturedMatch";
import type { FeaturedMatch, MyPrediction } from "@/hooks/useFeaturedMatch";
import { formatScore, getPrizeTier } from "@/lib/worldcupScoring";
import { renderPredictionCard, downloadBlob } from "@/lib/predictionCard";
import { confettiBurst } from "@/lib/confettiBurst";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import BallPit from "@/components/app/worldcup/BallPit";
import KeepyUppy from "@/components/app/worldcup/KeepyUppy";
import StadiumBackdrop from "@/components/app/worldcup/StadiumBackdrop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  userId?: string;
  demoMode?: boolean;
}

type Outcome = "home" | "draw" | "away";

// ── Demo-only helpers ──────────────────────────────────────────────────────
// Builds a self-contained sample match/prediction so the view is fully
// previewable without a `worldcup_matches` row, driven by `?demo_state=`.
type DemoState = "upcoming" | "locked" | "finished" | "discount";

const DEMO_FINAL_SCORE = { home: 2, away: 1 };
const DEMO_HOME_FLAG = "https://flagcdn.com/fr.svg";
const DEMO_AWAY_FLAG = "https://flagcdn.com/es.svg";

function readDemoState(): DemoState {
  if (typeof window === "undefined") return "upcoming";
  const raw = new URLSearchParams(window.location.search).get("demo_state");
  return raw === "locked" || raw === "finished" || raw === "discount" ? raw : "upcoming";
}

function buildDemoMatch(demoState: DemoState): FeaturedMatch {
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 3600 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const base = {
    id: "demo-match",
    homeTeam: "France",
    awayTeam: "Spain",
    homeFlag: DEMO_HOME_FLAG,
    awayFlag: DEMO_AWAY_FLAG,
  };
  if (demoState === "locked") {
    return { ...base, kickoffAt: oneDayAgo, status: "locked", homeScore: null, awayScore: null };
  }
  if (demoState === "finished" || demoState === "discount") {
    return { ...base, kickoffAt: oneDayAgo, status: "finished", homeScore: DEMO_FINAL_SCORE.home, awayScore: DEMO_FINAL_SCORE.away };
  }
  return { ...base, kickoffAt: inThreeDays, status: "upcoming", homeScore: null, awayScore: null };
}

// ── Live countdown to kickoff ───────────────────────────────────────────────
function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = Math.max(0, Date.parse(targetIso) - now);
  return {
    diff,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
    secs: Math.floor((diff % 60_000) / 1_000),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

// ── Team flag (crest URL → image, else initials badge) ──────────────────────
const TeamFlag = ({ src, name, size = "lg" }: { src: string | null; name: string; size?: "lg" | "sm" }) => {
  const [errored, setErrored] = useState(false);
  const dim = size === "lg" ? "h-16 w-24 sm:h-[72px] sm:w-[108px]" : "h-7 w-10";
  const ring = "rounded-lg ring-1 ring-[rgba(233,238,247,0.13)]";
  if (src && !errored) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setErrored(true)}
        className={`${dim} ${ring} object-cover`}
      />
    );
  }
  return (
    <div className={`${dim} ${ring} flex items-center justify-center bg-[#14171d] font-display text-base font-bold text-[#98a0af]`}>
      {name.slice(0, 3).toUpperCase()}
    </div>
  );
};

const WorldCupPredictions = ({ userId, demoMode }: Props) => {
  // Hooks must always run unconditionally (React rules of hooks). In demo mode
  // we ignore the hook's (Supabase-backed) result and use a local mock instead.
  const hookResult = useFeaturedMatch(userId);

  const demoState = useMemo(() => (demoMode ? readDemoState() : "upcoming"), [demoMode]);
  const demoMatch = useMemo(() => buildDemoMatch(demoState), [demoState]);
  const [demoPrediction, setDemoPrediction] = useState<MyPrediction | null>(null);
  const demoSubmit = useMemo(
    () => async (predHome: number, predAway: number) => {
      const prize =
        demoState === "finished" || demoState === "discount"
          ? getPrizeTier({ home: predHome, away: predAway }, DEMO_FINAL_SCORE)
          : null;
      setDemoPrediction({ predHome, predAway, isWinner: prize === "free_month", prize });
      return { ok: true as const };
    },
    [demoState],
  );

  // Demo-only: seed a sample prediction so the locked/finished states have
  // something to render (real users only ever have their own real prediction).
  useEffect(() => {
    if (!demoMode) return;
    if (demoState === "finished") setDemoPrediction({ predHome: 2, predAway: 1, isWinner: true, prize: "free_month" });
    else if (demoState === "discount") setDemoPrediction({ predHome: 3, predAway: 1, isWinner: false, prize: "half_off" });
    else if (demoState === "locked") setDemoPrediction({ predHome: 1, predAway: 2, isWinner: false, prize: null });
    else setDemoPrediction(null);
  }, [demoMode, demoState]);

  const match = demoMode ? demoMatch : hookResult.match;
  const myPrediction = demoMode ? demoPrediction : hookResult.myPrediction;
  const loading = demoMode ? false : hookResult.loading;
  const submit = demoMode ? demoSubmit : hookResult.submit;
  // ────────────────────────────────────────────────────────────────────────

  const [modalOpen, setModalOpen] = useState(false);

  // Fire a big multi-cannon celebration the first time a winning result shows.
  const wonBurstFired = useRef(false);
  useEffect(() => {
    if (match?.status === "finished" && myPrediction?.prize && !wonBurstFired.current) {
      wonBurstFired.current = true;
      const big = myPrediction.prize === "free_month";
      confettiBurst({ count: big ? 240 : 170, power: 1.45 });
      confettiBurst({ count: big ? 140 : 90, originX: window.innerWidth * 0.14, originY: window.innerHeight * 0.6, power: 1.2 });
      confettiBurst({ count: big ? 140 : 90, originX: window.innerWidth * 0.86, originY: window.innerHeight * 0.6, power: 1.2 });
      if (big) window.setTimeout(() => confettiBurst({ count: 180, power: 1.35 }), 380);
    }
  }, [match?.status, myPrediction?.prize]);

  const handleSubmit = async (home: number, away: number) => {
    const res = await submit(home, away);
    if (res.ok) {
      track("worldcup_prediction_submitted", { matchId: match?.id, home, away });
      confettiBurst({ count: 170, power: 1.2 });
      toast({ title: "Prediction locked in", description: `You called it ${formatScore({ home, away })}. Good luck.` });
      setModalOpen(false);
    } else {
      toast({ title: "Could not submit", description: res.error, variant: "destructive" });
    }
    return res;
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
      <div className="flex h-full items-center justify-center text-[#98a0af]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#14171d] ring-1 ring-[rgba(233,238,247,0.13)]">
          <Trophy className="h-6 w-6 text-[#e8fb52]" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-[#f3f5f8]">No match to predict right now</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#98a0af]">
          The next featured match drops here as soon as kickoff is set. Check back shortly.
        </p>
      </div>
    );
  }

  const kickoffPassed = Date.parse(match.kickoffAt) <= Date.now();
  const open = match.status === "upcoming" && !kickoffPassed;
  const predicted = Boolean(myPrediction);

  return (
    <div className="relative min-h-full overflow-hidden">
      <style>{ENTRANCE_CSS}</style>

      {/* stadium atmosphere: pitch lines, floodlights, pitch-green */}
      <StadiumBackdrop />
      {/* ambient, clickable footballs above the backdrop */}
      <BallPit className="absolute inset-0 h-full w-full opacity-70" />
      {/* one-shot kicked ball on entrance */}
      <img
        src="/sport-ball-football-free-png.webp"
        alt=""
        aria-hidden="true"
        className="wc-anim-kick pointer-events-none absolute left-0 top-28 z-20 h-14 w-14 object-cover"
        style={{ clipPath: "circle(46%)" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 py-10 sm:py-14">
        {/* hero text on a soft dark plate so it stays readable over the balls */}
        <div className="wc-anim-rise rounded-2xl bg-[#08090c]/75 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8fb52]">
            <Trophy className="h-3.5 w-3.5" />
            World Cup · predict &amp; win
          </div>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-tight text-[#f3f5f8] sm:text-3xl">
            Predict the match. Win a month on us.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#98a0af]">
            One featured match, two ways to win. Lock in your call before kickoff — we email your reward after full time.
          </p>
        </div>

        <div className="wc-anim-rise" style={{ animationDelay: "90ms" }}>
          <PrizeLadder className="mt-5" />
        </div>

        {/* match panel */}
        <div className="wc-anim-rise mt-7 overflow-hidden rounded-2xl border border-[rgba(233,238,247,0.07)] bg-[#0f1115]" style={{ animationDelay: "160ms" }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-7 sm:px-8">
            <TeamColumn name={match.homeTeam} flag={match.homeFlag} />
            <div className="px-1 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[#5b6472]">vs</div>
            <TeamColumn name={match.awayTeam} flag={match.awayFlag} />
          </div>

          <div className="border-t border-[rgba(233,238,247,0.07)] px-5 py-5 sm:px-8">
            <MatchStatusBlock match={match} open={open} kickoffPassed={kickoffPassed} />
          </div>
        </div>

        {/* action area */}
        <div className="wc-anim-rise" style={{ animationDelay: "230ms" }}>
          {predicted && myPrediction ? (
            <PredictionSummary match={match} prediction={myPrediction} onShare={handleShare} />
          ) : open ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-5 w-full rounded-xl bg-[#e8fb52] px-5 py-3.5 font-display text-[15px] font-bold text-[#08090c] shadow-[0_0_0_1px_rgba(232,251,82,0.4),0_8px_28px_-12px_rgba(232,251,82,0.55)] transition-colors duration-150 hover:bg-white"
            >
              Make your prediction
            </button>
          ) : (
            <div className="mt-5 rounded-xl border border-[rgba(233,238,247,0.07)] bg-[#0b0d11] px-5 py-4 text-sm text-[#98a0af]">
              Predictions are closed for this match. The next featured match opens here soon.
            </div>
          )}
        </div>

        <KeepyUppy />

        <PredictModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          match={match}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

const ENTRANCE_CSS = `
@keyframes wc-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes wc-kick {
  0% { transform: translate(-15vw, 30px) rotate(0deg); opacity: 0; }
  12% { opacity: 1; }
  100% { transform: translate(115vw, -40px) rotate(1080deg); opacity: 0; }
}
@keyframes wc-glow { from { opacity: 0.55; } to { opacity: 1; } }
.wc-anim-rise { animation: wc-rise .6s cubic-bezier(0.22,1,0.36,1) both; }
.wc-anim-kick { animation: wc-kick 1.15s cubic-bezier(0.4,0,0.2,1) both; }
.wc-floodlight { animation: wc-glow 5.5s ease-in-out infinite alternate; }
@media (prefers-reduced-motion: reduce) {
  .wc-anim-rise { animation: none; opacity: 1; transform: none; }
  .wc-anim-kick { display: none; }
  .wc-floodlight { animation: none; }
}
`;

// ── Prize ladder (two ways to win) ──────────────────────────────────────────
const PrizeLadder = ({ className = "" }: { className?: string }) => (
  <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${className}`}>
    <div className="flex items-center gap-3 rounded-xl border border-[rgba(233,238,247,0.07)] bg-[#0f1115] px-4 py-3">
      <Percent className="h-4 w-4 shrink-0 text-[#98a0af]" />
      <div className="leading-tight">
        <p className="font-display text-[13px] font-semibold text-[#f3f5f8]">Right result</p>
        <p className="text-[12px] text-[#98a0af]">50% off your first month</p>
      </div>
    </div>
    <div className="flex items-center gap-3 rounded-xl border border-[rgba(232,251,82,0.28)] bg-[rgba(232,251,82,0.06)] px-4 py-3">
      <Trophy className="h-4 w-4 shrink-0 text-[#e8fb52]" />
      <div className="leading-tight">
        <p className="font-display text-[13px] font-semibold text-[#f3f5f8]">Exact score</p>
        <p className="text-[12px] text-[#98a0af]">A full month, free</p>
      </div>
    </div>
  </div>
);

// ── Team column (flag + name) ───────────────────────────────────────────────
const TeamColumn = ({ name, flag }: { name: string; flag: string | null }) => (
  <div className="flex flex-col items-center gap-3 text-center">
    <TeamFlag src={flag} name={name} />
    <span className="font-display text-[15px] font-semibold leading-tight tracking-tight text-[#f3f5f8] sm:text-base">
      {name}
    </span>
  </div>
);

// ── Status block: countdown / kicked-off / full-time final score ────────────
const MatchStatusBlock = ({ match, open, kickoffPassed }: { match: FeaturedMatch; open: boolean; kickoffPassed: boolean }) => {
  const c = useCountdown(match.kickoffAt);
  const kickoffLabel = new Date(match.kickoffAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (match.status === "finished") {
    return (
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">Full time</span>
        <span className="font-display text-2xl font-bold tabular-nums tracking-tight text-[#f3f5f8]">
          {formatScore({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 })}
        </span>
      </div>
    );
  }

  if (!open || kickoffPassed) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff5c49] motion-safe:animate-pulse" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#98a0af]">
          Underway — predictions closed
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">Kickoff in</p>
        <div className="mt-1.5 flex items-baseline gap-1.5 font-display text-2xl font-bold tabular-nums tracking-tight text-[#f3f5f8]">
          {c.days > 0 && <CountUnit value={c.days} label="d" />}
          <CountUnit value={c.hours} label="h" pad />
          <CountUnit value={c.mins} label="m" pad />
          <CountUnit value={c.secs} label="s" pad />
        </div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5b6472]">{kickoffLabel}</p>
    </div>
  );
};

const CountUnit = ({ value, label, pad: doPad }: { value: number; label: string; pad?: boolean }) => (
  <span className="flex items-baseline">
    {doPad ? pad(value) : value}
    <span className="ml-0.5 font-mono text-[11px] font-medium text-[#5b6472]">{label}</span>
  </span>
);

// ── Prediction summary (after submit) ───────────────────────────────────────
const PredictionSummary = ({
  match,
  prediction,
  onShare,
}: {
  match: FeaturedMatch;
  prediction: MyPrediction;
  onShare: () => void;
}) => {
  const finished = match.status === "finished";
  const inProgress = !finished && Date.parse(match.kickoffAt) <= Date.now();

  return (
    <div className="mt-5 rounded-xl border border-[rgba(232,251,82,0.28)] bg-[rgba(232,251,82,0.06)] px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e8fb52]">Your prediction</p>
          <div className="mt-2 flex items-center gap-3">
            <TeamFlag src={match.homeFlag} name={match.homeTeam} size="sm" />
            <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-[#f3f5f8]">
              {formatScore({ home: prediction.predHome, away: prediction.predAway })}
            </span>
            <TeamFlag src={match.awayFlag} name={match.awayTeam} size="sm" />
          </div>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[rgba(233,238,247,0.13)] bg-transparent px-3.5 py-2.5 font-display text-[13px] font-semibold text-[#f3f5f8] transition-colors duration-150 hover:border-[rgba(233,238,247,0.2)] hover:bg-[#14171d]"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {finished && (
        <p className="mt-4 border-t border-[rgba(232,251,82,0.2)] pt-3 text-sm leading-6 text-[#f3f5f8]">
          {prediction.prize === "free_month" ? (
            <>🏆 You nailed the exact score — check your email for your free-month code.</>
          ) : prediction.prize === "half_off" ? (
            <>You called the result right! Final was {formatScore({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 })} — your 50%-off code is in your email.</>
          ) : (
            <>So close. Final was {formatScore({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 })} — the next match is your shot.</>
          )}
        </p>
      )}
      {inProgress && (
        <p className="mt-4 border-t border-[rgba(232,251,82,0.2)] pt-3 text-sm leading-6 text-[#98a0af]">
          Match in progress — results and winners are announced right after full time.
        </p>
      )}
    </div>
  );
};

// ── Prediction modal (who wins → exact goals) ───────────────────────────────
const PredictModal = ({
  open,
  onOpenChange,
  match,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: FeaturedMatch;
  onSubmit: (home: number, away: number) => Promise<{ ok: boolean; error?: string }>;
}) => {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [home, setHome] = useState(1);
  const [away, setAway] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Reset each time the modal opens.
  useEffect(() => {
    if (open) {
      setOutcome(null);
      setHome(1);
      setAway(0);
      setSubmitting(false);
    }
  }, [open]);

  const chooseOutcome = (o: Outcome) => {
    setOutcome(o);
    // Seed a sensible default scoreline matching the pick; user adjusts from here.
    if (o === "home") { setHome(1); setAway(0); }
    else if (o === "away") { setHome(0); setAway(1); }
    else { setHome(1); setAway(1); }
  };

  const consistent =
    outcome === "home" ? home > away :
    outcome === "away" ? away > home :
    outcome === "draw" ? home === away :
    false;

  const hint =
    outcome === "home" ? `A ${match.homeTeam} win means ${match.homeTeam} scores more.` :
    outcome === "away" ? `A ${match.awayTeam} win means ${match.awayTeam} scores more.` :
    outcome === "draw" ? "A draw means both teams score the same." :
    "";

  const submit = async () => {
    setSubmitting(true);
    await onSubmit(home, away);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[rgba(233,238,247,0.13)] bg-[#0b0d11] text-[#f3f5f8] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold tracking-tight">Predict the final score</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#98a0af]">
            {match.homeTeam} vs {match.awayTeam}. Call the result for 50% off, or nail the exact score for a free month.
          </DialogDescription>
        </DialogHeader>

        <PrizeLadder />

        {/* Step 1 — who wins */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">1 · Who wins?</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <OutcomeButton selected={outcome === "home"} onClick={() => chooseOutcome("home")}>
              <TeamFlag src={match.homeFlag} name={match.homeTeam} size="sm" />
              <span className="mt-1.5 line-clamp-1 max-w-full">{match.homeTeam}</span>
            </OutcomeButton>
            <OutcomeButton selected={outcome === "draw"} onClick={() => chooseOutcome("draw")}>
              <span className="flex h-7 items-center font-display text-base font-bold text-current">Draw</span>
              <span className="mt-1.5 text-[#5b6472]">Tie</span>
            </OutcomeButton>
            <OutcomeButton selected={outcome === "away"} onClick={() => chooseOutcome("away")}>
              <TeamFlag src={match.awayFlag} name={match.awayTeam} size="sm" />
              <span className="mt-1.5 line-clamp-1 max-w-full">{match.awayTeam}</span>
            </OutcomeButton>
          </div>
        </div>

        {/* Step 2 — exact goals */}
        <div className={outcome ? "" : "pointer-events-none opacity-40"}>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">2 · Exact goals</p>
          <div className="mt-2.5 flex items-center justify-center gap-5">
            <Stepper label={match.homeTeam} flag={match.homeFlag} value={home} onChange={setHome} />
            <span className="pt-5 font-display text-2xl font-bold text-[#5b6472]">:</span>
            <Stepper label={match.awayTeam} flag={match.awayFlag} value={away} onChange={setAway} />
          </div>
          {outcome && !consistent && (
            <p className="mt-3 text-center text-[12px] leading-5 text-[#ffb23e]">{hint}</p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            disabled={!outcome || !consistent || submitting}
            onClick={submit}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e8fb52] px-4 font-display text-[15px] font-bold text-[#08090c] transition-colors duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? "Locking in…" : "Lock in my prediction"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const OutcomeButton = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center rounded-xl border px-2 py-3 font-display text-[13px] font-semibold transition-colors duration-150 ${
      selected
        ? "border-[#e8fb52] bg-[rgba(232,251,82,0.1)] text-[#e8fb52]"
        : "border-[rgba(233,238,247,0.13)] bg-[#0f1115] text-[#f3f5f8] hover:border-[rgba(233,238,247,0.2)] hover:bg-[#14171d]"
    }`}
  >
    {children}
  </button>
);

const Stepper = ({
  label,
  flag,
  value,
  onChange,
}: {
  label: string;
  flag: string | null;
  value: number;
  onChange: (n: number) => void;
}) => {
  const clamp = (n: number) => Math.max(0, Math.min(20, n));
  return (
    <div className="flex flex-col items-center gap-2">
      <TeamFlag src={flag} name={label} size="sm" />
      <div className="flex items-center gap-2">
        <StepBtn onClick={() => onChange(clamp(value - 1))} aria-label={`One fewer goal for ${label}`}>
          <Minus className="h-4 w-4" />
        </StepBtn>
        <span className="w-10 text-center font-display text-3xl font-bold tabular-nums text-[#f3f5f8]">{value}</span>
        <StepBtn onClick={() => onChange(clamp(value + 1))} aria-label={`One more goal for ${label}`}>
          <Plus className="h-4 w-4" />
        </StepBtn>
      </div>
    </div>
  );
};

const StepBtn = ({
  onClick,
  children,
  ...rest
}: { onClick: () => void; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(233,238,247,0.13)] bg-[#0f1115] text-[#98a0af] transition-colors duration-150 hover:border-[#e8fb52]/50 hover:text-[#e8fb52]"
    {...rest}
  >
    {children}
  </button>
);

export default WorldCupPredictions;
