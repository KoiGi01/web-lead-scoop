import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { Trophy, Loader2, Share2, Minus, Plus, Check } from "lucide-react";
import { useFeaturedMatch } from "@/hooks/useFeaturedMatch";
import type { FeaturedMatch, MyPrediction } from "@/hooks/useFeaturedMatch";
import { useWorldCupFixtures } from "@/hooks/useWorldCupFixtures";
import type { Fixture } from "@/hooks/useWorldCupFixtures";
import { formatScore, resolvePrize } from "@/lib/worldcupScoring";
import type { Bet, Outcome } from "@/lib/worldcupScoring";
import { renderPredictionCard, shareOrDownloadImage } from "@/lib/predictionCard";
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
  onRequireAuth?: () => void;
}

// Where a logged-out lock-in is stashed so it survives the sign-in (incl. an
// OAuth full-page redirect) and auto-submits once the user is authenticated.
const PENDING_KEY = "gl22:wc-pending";
const PENDING_TTL_MS = 30 * 60 * 1000;

type Market = "result" | "exact";

const WC_LOGO = "/world-cup-logo-2026.webp";

function predictionPick(p: MyPrediction, homeTeam: string, awayTeam: string): string {
  if (p.betType === "exact" && p.predHome !== null && p.predAway !== null) {
    return formatScore({ home: p.predHome, away: p.predAway });
  }
  if (p.predOutcome === "home") return `${homeTeam} to win`;
  if (p.predOutcome === "away") return `${awayTeam} to win`;
  return "Draw";
}

function outcomeLabel(outcome: Outcome, homeTeam: string, awayTeam: string): string {
  if (outcome === "home") return `${homeTeam} to win`;
  if (outcome === "away") return `${awayTeam} to win`;
  return "Draw";
}

// ── Demo-only helpers ──────────────────────────────────────────────────────
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
  const base = { id: "demo-match", homeTeam: "France", awayTeam: "Spain", homeFlag: DEMO_HOME_FLAG, awayFlag: DEMO_AWAY_FLAG };
  if (demoState === "locked") return { ...base, kickoffAt: oneDayAgo, status: "locked", homeScore: null, awayScore: null };
  if (demoState === "finished" || demoState === "discount") {
    return { ...base, kickoffAt: oneDayAgo, status: "finished", homeScore: DEMO_FINAL_SCORE.home, awayScore: DEMO_FINAL_SCORE.away };
  }
  return { ...base, kickoffAt: inThreeDays, status: "upcoming", homeScore: null, awayScore: null };
}

function betToPrediction(bet: Bet, prize: MyPrediction["prize"]): MyPrediction {
  return {
    betType: bet.type,
    predOutcome: bet.type === "result" ? bet.outcome : null,
    predHome: bet.type === "exact" ? bet.home : null,
    predAway: bet.type === "exact" ? bet.away : null,
    isWinner: prize === "free_month",
    prize,
  };
}

// ── Live countdown ──────────────────────────────────────────────────────────
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
const FLAG_DIMS = {
  sm: "h-7 w-10",
  lg: "h-16 w-24",
  xl: "h-[88px] w-[132px] sm:h-28 sm:w-44",
} as const;

const TeamFlag = ({ src, name, size = "lg" }: { src: string | null; name: string; size?: keyof typeof FLAG_DIMS }) => {
  const [errored, setErrored] = useState(false);
  const ring = "rounded-xl ring-1 ring-[rgba(233,238,247,0.16)] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]";
  if (src && !errored) {
    return (
      <img src={src} alt={name} loading="lazy" onError={() => setErrored(true)} className={`${FLAG_DIMS[size]} ${ring} object-cover`} />
    );
  }
  return (
    <div className={`${FLAG_DIMS[size]} ${ring} flex items-center justify-center bg-[#14171d] font-display text-base font-bold text-[#98a0af]`}>
      {name.slice(0, 3).toUpperCase()}
    </div>
  );
};

// Top-level router: demo mode keeps the single-match poster (offline preview);
// live mode shows the day's full fixtures list.
const WorldCupPredictions = ({ userId, demoMode, onRequireAuth }: Props) => {
  if (demoMode) return <SingleMatchPoster userId={userId} demoMode />;
  return <LiveFixtures userId={userId} onRequireAuth={onRequireAuth} />;
};

const SingleMatchPoster = ({ userId, demoMode }: Props) => {
  const hookResult = useFeaturedMatch(userId);

  const demoState = useMemo(() => (demoMode ? readDemoState() : "upcoming"), [demoMode]);
  const demoMatch = useMemo(() => buildDemoMatch(demoState), [demoState]);
  const [demoPrediction, setDemoPrediction] = useState<MyPrediction | null>(null);
  const demoSubmit = useMemo(
    () => async (bet: Bet) => {
      const prize = demoState === "finished" || demoState === "discount" ? resolvePrize(bet, DEMO_FINAL_SCORE) : null;
      setDemoPrediction(betToPrediction(bet, prize));
      return { ok: true as const };
    },
    [demoState],
  );

  useEffect(() => {
    if (!demoMode) return;
    if (demoState === "finished") setDemoPrediction(betToPrediction({ type: "exact", home: 2, away: 1 }, "free_month"));
    else if (demoState === "discount") setDemoPrediction(betToPrediction({ type: "result", outcome: "home" }, "half_off"));
    else if (demoState === "locked") setDemoPrediction(betToPrediction({ type: "result", outcome: "home" }, null));
    else setDemoPrediction(null);
  }, [demoMode, demoState]);

  const match = demoMode ? demoMatch : hookResult.match;
  const myPrediction = demoMode ? demoPrediction : hookResult.myPrediction;
  const loading = demoMode ? false : hookResult.loading;
  const submit = demoMode ? demoSubmit : hookResult.submit;

  const [modalOpen, setModalOpen] = useState(false);
  const [initialMarket, setInitialMarket] = useState<Market | null>(null);
  const openModal = (m: Market | null = null) => {
    setInitialMarket(m);
    setModalOpen(true);
  };

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

  const handleSubmit = async (bet: Bet) => {
    const res = await submit(bet);
    if (res.ok && match) {
      track("worldcup_prediction_submitted", { matchId: match.id, betType: bet.type });
      confettiBurst({ count: 170, power: 1.2 });
      const label = bet.type === "exact" ? formatScore({ home: bet.home, away: bet.away }) : outcomeLabel(bet.outcome, match.homeTeam, match.awayTeam);
      toast({ title: "Prediction locked in", description: `Your pick: ${label}. Good luck.` });
      setModalOpen(false);
    } else if (!res.ok) {
      toast({ title: "Could not submit", description: res.error, variant: "destructive" });
    }
    return res;
  };

  const handleShare = async () => {
    if (!match || !myPrediction) return;
    const subtitle = myPrediction.betType === "exact" ? "Exact score — a free month if I nail it" : "Match result — 50% off if I call it";
    const blob = await renderPredictionCard({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      pick: predictionPick(myPrediction, match.homeTeam, match.awayTeam),
      subtitle,
    });
    const how = await shareOrDownloadImage(blob, "my-worldcup-prediction.png", "My World Cup prediction — predict & win a free month at globaleads22.com");
    track("worldcup_card_shared", { matchId: match.id, how });
    if (how === "downloaded") toast({ title: "Prediction image saved", description: "Post it to your story to challenge your friends." });
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
        <img src={WC_LOGO} alt="FIFA World Cup 2026" className="h-40 w-auto opacity-90" />
        <h2 className="wc-display mt-6 text-4xl tracking-wide text-[#f3f5f8]">No match to predict right now</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#98a0af]">The next featured match drops here as soon as kickoff is set. Check back shortly.</p>
      </div>
    );
  }

  const kickoffPassed = Date.parse(match.kickoffAt) <= Date.now();
  const open = match.status === "upcoming" && !kickoffPassed;
  const predicted = Boolean(myPrediction);

  return (
    <div className="relative min-h-full overflow-hidden">
      <style>{SCREEN_CSS}</style>

      <StadiumBackdrop />
      <BallPit className="absolute inset-0 h-full w-full opacity-[0.55]" />
      <img
        src="/sport-ball-football-free-png.webp"
        alt=""
        aria-hidden="true"
        className="wc-anim-kick pointer-events-none absolute left-0 top-28 z-20 h-14 w-14 object-cover"
        style={{ clipPath: "circle(46%)" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        {/* ── HERO POSTER ── */}
        <header className="wc-anim-rise relative text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-12%] h-[135%] w-[160%] -translate-x-1/2"
            style={{ background: "radial-gradient(closest-side, rgba(8,9,12,0.86), rgba(8,9,12,0) 75%)" }}
          />
          <div className="relative">
            <img
              src={WC_LOGO}
              alt="FIFA World Cup 2026"
              className="wc-float mx-auto h-44 w-auto drop-shadow-[0_14px_46px_rgba(232,251,82,0.22)] sm:h-56"
            />
            <h1 className="wc-display mt-5 text-[58px] leading-[0.82] tracking-[0.012em] text-[#f3f5f8] sm:text-[88px]">
              Call the game.
              <br />
              <span className="text-[#e8fb52]">Win a free month.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-6 text-[#c4cad4]">
              Predict the featured match before kickoff. Call the result for 50% off — nail the exact score for a month on us.
            </p>
          </div>
        </header>

        {/* ── TEAM FACE-OFF (no boxes) ── */}
        <section className="wc-anim-rise relative mt-12" style={{ animationDelay: "120ms" }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            <FaceTeam name={match.homeTeam} flag={match.homeFlag} />
            <span className="wc-display select-none text-4xl text-[#5b6472] sm:text-6xl">vs</span>
            <FaceTeam name={match.awayTeam} flag={match.awayFlag} />
          </div>
          <div className="mt-6 flex justify-center">
            <KickoffBar match={match} open={open} kickoffPassed={kickoffPassed} />
          </div>
        </section>

        {/* ── ACTION ── */}
        <section className="wc-anim-rise mt-10" style={{ animationDelay: "230ms" }}>
          {predicted && myPrediction ? (
            <PredictionSummary match={match} prediction={myPrediction} onShare={handleShare} />
          ) : open ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <MarketCTA title="Match result" prize="Win 50% off" onClick={() => openModal("result")} />
              <MarketCTA title="Exact score" prize="Win a free month" primary onClick={() => openModal("exact")} />
            </div>
          ) : (
            <p className="text-center text-sm text-[#98a0af]">
              Predictions are closed for this match. The next featured match opens here soon.
            </p>
          )}
        </section>

        <KeepyUppy />

        <PredictModal open={modalOpen} onOpenChange={setModalOpen} match={match} initialMarket={initialMarket} onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

const SCREEN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
@keyframes wc-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes wc-kick {
  0% { transform: translate(-15vw, 30px) rotate(0deg); opacity: 0; }
  12% { opacity: 1; }
  100% { transform: translate(115vw, -40px) rotate(1080deg); opacity: 0; }
}
@keyframes wc-glow { from { opacity: 0.55; } to { opacity: 1; } }
@keyframes wc-floaty { from { transform: translateY(0); } to { transform: translateY(-10px); } }
.wc-display { font-family: 'Bebas Neue', 'Space Grotesk', system-ui, sans-serif; font-weight: 400; }
.wc-anim-rise { animation: wc-rise .6s cubic-bezier(0.22,1,0.36,1) both; }
.wc-anim-kick { animation: wc-kick 1.15s cubic-bezier(0.4,0,0.2,1) both; }
.wc-floodlight { animation: wc-glow 5.5s ease-in-out infinite alternate; }
.wc-float { animation: wc-floaty 3.4s ease-in-out infinite alternate; }
@media (prefers-reduced-motion: reduce) {
  .wc-anim-rise { animation: none; opacity: 1; transform: none; }
  .wc-anim-kick { display: none; }
  .wc-floodlight, .wc-float { animation: none; }
}
`;

// ── Face-off team (big flag + condensed name, no box) ───────────────────────
const FaceTeam = ({ name, flag }: { name: string; flag: string | null }) => (
  <div className="flex flex-col items-center gap-3 text-center">
    <TeamFlag src={flag} name={name} size="xl" />
    <span className="wc-display text-2xl leading-none tracking-wide text-[#f3f5f8] sm:text-[32px]">{name}</span>
  </div>
);

// ── Kickoff status (countdown / underway / full time) ───────────────────────
const KickoffBar = ({ match, open, kickoffPassed }: { match: FeaturedMatch; open: boolean; kickoffPassed: boolean }) => {
  const c = useCountdown(match.kickoffAt);

  if (match.status === "finished") {
    return (
      <span className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#98a0af]">
        Full time
        <span className="wc-display text-2xl tracking-wide text-[#f3f5f8]">
          {formatScore({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 })}
        </span>
      </span>
    );
  }

  if (!open || kickoffPassed) {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#ff5c49]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff5c49] motion-safe:animate-pulse" />
        Underway — predictions closed
      </span>
    );
  }

  return (
    <span className="inline-flex items-baseline gap-2.5 rounded-full border border-[rgba(232,251,82,0.28)] bg-[rgba(232,251,82,0.06)] px-5 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8fb52]">Kickoff in</span>
      <span className="wc-display text-2xl tabular-nums tracking-wide text-[#f3f5f8]">
        {c.days > 0 ? `${c.days}d ` : ""}
        {pad(c.hours)}:{pad(c.mins)}:{pad(c.secs)}
      </span>
    </span>
  );
};

// ── Market CTA (bold, not an info card) ─────────────────────────────────────
const MarketCTA = ({ title, prize, primary, onClick }: { title: string; prize: string; primary?: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition-colors duration-150 ${
      primary
        ? "bg-[#e8fb52] text-[#08090c] shadow-[0_10px_34px_-14px_rgba(232,251,82,0.8)] hover:bg-white"
        : "border border-[rgba(232,251,82,0.4)] bg-[rgba(232,251,82,0.05)] text-[#f3f5f8] hover:bg-[rgba(232,251,82,0.12)]"
    }`}
  >
    <span>
      <span className="wc-display block text-[26px] leading-none tracking-wide">{title}</span>
      <span className={`mt-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] ${primary ? "text-[#08090c]/70" : "text-[#e8fb52]"}`}>
        {prize}
      </span>
    </span>
    <span className="wc-display text-2xl opacity-60 transition-transform duration-150 group-hover:translate-x-1">→</span>
  </button>
);

// ── Prediction summary (after submit) ───────────────────────────────────────
const PredictionSummary = ({ match, prediction, onShare }: { match: FeaturedMatch; prediction: MyPrediction; onShare: () => void }) => {
  const finished = match.status === "finished";
  const inProgress = !finished && Date.parse(match.kickoffAt) <= Date.now();
  const pick = predictionPick(prediction, match.homeTeam, match.awayTeam);
  const marketTag = prediction.betType === "exact" ? "Exact score · free month if right" : "Match result · 50% off if right";

  return (
    <div className="rounded-2xl border border-[rgba(232,251,82,0.28)] bg-[rgba(232,251,82,0.07)] px-6 py-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8fb52]">Your prediction is in</p>
      <p className="wc-display mt-2 text-5xl leading-none tracking-wide text-[#f3f5f8] sm:text-6xl">{pick}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b6472]">{marketTag}</p>

      {finished && (
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#f3f5f8]">
          {prediction.prize === "free_month" ? (
            <>🏆 You nailed the exact score — check your email for your free-month code.</>
          ) : prediction.prize === "half_off" ? (
            <>You called it! Final was {formatScore({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 })} — your 50%-off code is in your email.</>
          ) : (
            <>So close. Final was {formatScore({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 })} — the next match is your shot.</>
          )}
        </p>
      )}
      {inProgress && (
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#98a0af]">Match in progress — winners are announced right after full time.</p>
      )}

      <button
        type="button"
        onClick={onShare}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#e8fb52] px-5 py-2.5 font-display text-[13px] font-bold text-[#08090c] transition-colors duration-150 hover:bg-white"
      >
        <Share2 className="h-4 w-4" />
        Share my prediction
      </button>
    </div>
  );
};

// ── Prediction modal (pick a market → make the call) ────────────────────────
const PredictModal = ({
  open,
  onOpenChange,
  match,
  initialMarket,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: FeaturedMatch;
  initialMarket: Market | null;
  onSubmit: (bet: Bet) => Promise<{ ok: boolean; error?: string }>;
}) => {
  const [market, setMarket] = useState<Market>("result");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [home, setHome] = useState(1);
  const [away, setAway] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMarket(initialMarket ?? "result");
      setOutcome(null);
      setHome(1);
      setAway(0);
      setSubmitting(false);
    }
  }, [open, initialMarket]);

  const canSubmit = market === "exact" || outcome !== null;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const bet: Bet = market === "exact" ? { type: "exact", home, away } : { type: "result", outcome: outcome as Outcome };
    await onSubmit(bet);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[rgba(233,238,247,0.13)] bg-[#0b0d11] text-[#f3f5f8] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="wc-display text-3xl tracking-wide">Place your prediction</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#98a0af]">
            {match.homeTeam} vs {match.awayTeam}. Pick a market, then make your call.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <MarketTab selected={market === "result"} onClick={() => setMarket("result")} title="Match result" prize="Win 50% off" />
          <MarketTab selected={market === "exact"} onClick={() => setMarket("exact")} title="Exact score" prize="Win a free month" accent />
        </div>

        {market === "result" ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">Who wins?</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <OutcomeButton selected={outcome === "home"} onClick={() => setOutcome("home")}>
                <TeamFlag src={match.homeFlag} name={match.homeTeam} size="sm" />
                <span className="mt-1.5 line-clamp-1 max-w-full">{match.homeTeam}</span>
                <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b6472]">Win</span>
              </OutcomeButton>
              <OutcomeButton selected={outcome === "draw"} onClick={() => setOutcome("draw")}>
                <span className="wc-display flex h-7 items-center text-2xl">X</span>
                <span className="mt-1.5">Draw</span>
                <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b6472]">Tie</span>
              </OutcomeButton>
              <OutcomeButton selected={outcome === "away"} onClick={() => setOutcome("away")}>
                <TeamFlag src={match.awayFlag} name={match.awayTeam} size="sm" />
                <span className="mt-1.5 line-clamp-1 max-w-full">{match.awayTeam}</span>
                <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b6472]">Win</span>
              </OutcomeButton>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">Final score</p>
            <div className="mt-2.5 flex items-center justify-center gap-5">
              <Stepper label={match.homeTeam} flag={match.homeFlag} value={home} onChange={setHome} />
              <span className="wc-display pt-5 text-3xl text-[#5b6472]">:</span>
              <Stepper label={match.awayTeam} flag={match.awayFlag} value={away} onChange={setAway} />
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            disabled={!canSubmit || submitting}
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

const MarketTab = ({ selected, onClick, title, prize, accent }: { selected: boolean; onClick: () => void; title: string; prize: string; accent?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150 ${
      selected ? "border-[#e8fb52] bg-[rgba(232,251,82,0.1)]" : "border-[rgba(233,238,247,0.13)] bg-[#0f1115] hover:border-[rgba(233,238,247,0.2)]"
    }`}
  >
    <span className={`wc-display text-xl leading-none tracking-wide ${accent ? "text-[#e8fb52]" : "text-[#f3f5f8]"}`}>{title}</span>
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#98a0af]">{prize}</span>
  </button>
);

const OutcomeButton = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) => (
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

const Stepper = ({ label, flag, value, onChange }: { label: string; flag: string | null; value: number; onChange: (n: number) => void }) => {
  const clamp = (n: number) => Math.max(0, Math.min(20, n));
  return (
    <div className="flex flex-col items-center gap-2">
      <TeamFlag src={flag} name={label} size="sm" />
      <div className="flex items-center gap-2">
        <StepBtn onClick={() => onChange(clamp(value - 1))} aria-label={`One fewer goal for ${label}`}>
          <Minus className="h-4 w-4" />
        </StepBtn>
        <span className="wc-display w-10 text-center text-4xl tabular-nums text-[#f3f5f8]">{value}</span>
        <StepBtn onClick={() => onChange(clamp(value + 1))} aria-label={`One more goal for ${label}`}>
          <Plus className="h-4 w-4" />
        </StepBtn>
      </div>
    </div>
  );
};

const StepBtn = ({ onClick, children, ...rest }: { onClick: () => void; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(233,238,247,0.13)] bg-[#0f1115] text-[#98a0af] transition-colors duration-150 hover:border-[#e8fb52]/50 hover:text-[#e8fb52]"
    {...rest}
  >
    {children}
  </button>
);

// ── Live fixtures: the day's full slate, each match predictable ─────────────
const LiveFixtures = ({ userId, onRequireAuth }: { userId?: string; onRequireAuth?: () => void }) => {
  const { fixtures, predictions, loading, submit } = useWorldCupFixtures(userId);
  const [modalMatch, setModalMatch] = useState<Fixture | null>(null);
  const [initialMarket, setInitialMarket] = useState<Market | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openPredict = (m: Fixture) => {
    setModalMatch(m);
    setInitialMarket(null);
    setModalOpen(true);
  };

  // After sign-in, finish a prediction the user locked in while logged out.
  const pendingHandled = useRef(false);
  useEffect(() => {
    if (!userId || pendingHandled.current) return;
    let pending: { matchId: string; bet: Bet; ts: number } | null = null;
    try {
      const raw = window.localStorage.getItem(PENDING_KEY);
      if (raw) pending = JSON.parse(raw);
    } catch {
      pending = null;
    }
    window.localStorage.removeItem(PENDING_KEY);
    if (!pending || Date.now() - pending.ts > PENDING_TTL_MS) return;
    pendingHandled.current = true;
    void (async () => {
      const res = await submit(pending.matchId, pending.bet);
      if (res.ok) {
        confettiBurst({ count: 200, power: 1.35 });
        toast({ title: "You're in! 🎉", description: "Your prediction is locked in. Good luck!" });
      } else {
        toast({ title: "Couldn't lock in your pick", description: res.error, variant: "destructive" });
      }
    })();
  }, [userId, submit]);

  const handleSubmit = async (bet: Bet) => {
    if (!modalMatch) return { ok: false, error: "No match selected" };
    if (!userId) {
      // Stash the pick and send them through sign-in; it auto-submits after.
      try {
        window.localStorage.setItem(PENDING_KEY, JSON.stringify({ matchId: modalMatch.id, bet, ts: Date.now() }));
      } catch {
        /* ignore storage failures */
      }
      setModalOpen(false);
      onRequireAuth?.();
      return { ok: true };
    }
    const res = await submit(modalMatch.id, bet);
    if (res.ok) {
      track("worldcup_prediction_submitted", { matchId: modalMatch.id, betType: bet.type });
      confettiBurst({ count: 170, power: 1.2 });
      const label = bet.type === "exact" ? formatScore({ home: bet.home, away: bet.away }) : outcomeLabel(bet.outcome, modalMatch.homeTeam, modalMatch.awayTeam);
      toast({ title: "Prediction locked in", description: `Your pick: ${label}. Good luck.` });
      setModalOpen(false);
    } else {
      toast({ title: "Could not submit", description: res.error, variant: "destructive" });
    }
    return res;
  };

  const handleShare = async (m: Fixture, p: MyPrediction) => {
    const subtitle = p.betType === "exact" ? "Exact score — a free month if I nail it" : "Match result — 50% off if I call it";
    const blob = await renderPredictionCard({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      pick: predictionPick(p, m.homeTeam, m.awayTeam),
      subtitle,
    });
    const how = await shareOrDownloadImage(blob, "my-worldcup-prediction.png", "My World Cup prediction — predict & win a free month at globaleads22.com");
    track("worldcup_card_shared", { matchId: m.id, how });
    if (how === "downloaded") toast({ title: "Prediction image saved", description: "Post it to your story to challenge your friends." });
  };

  return (
    <div className="relative min-h-full overflow-hidden">
      <style>{SCREEN_CSS}</style>
      <StadiumBackdrop />
      <BallPit className="absolute inset-0 h-full w-full opacity-50" />
      <img
        src="/sport-ball-football-free-png.webp"
        alt=""
        aria-hidden="true"
        className="wc-anim-kick pointer-events-none absolute left-0 top-28 z-20 h-14 w-14 object-cover"
        style={{ clipPath: "circle(46%)" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <header className="wc-anim-rise relative text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-12%] h-[135%] w-[160%] -translate-x-1/2"
            style={{ background: "radial-gradient(closest-side, rgba(8,9,12,0.86), rgba(8,9,12,0) 75%)" }}
          />
          <div className="relative">
            <img src={WC_LOGO} alt="FIFA World Cup 2026" className="wc-float mx-auto h-40 w-auto drop-shadow-[0_14px_46px_rgba(232,251,82,0.22)] sm:h-52" />
            <h1 className="wc-display mt-4 text-[52px] leading-[0.84] tracking-[0.012em] text-[#f3f5f8] sm:text-[80px]">
              Predict <span className="text-[#e8fb52]">&amp;</span> win
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-[#c4cad4]">
              Call any match below before kickoff. Right result wins 50% off — nail the exact score for a free month.
            </p>
          </div>
        </header>

        <section className="wc-anim-rise mt-10" style={{ animationDelay: "120ms" }}>
          <h2 className="wc-display mb-4 text-2xl tracking-wide text-[#f3f5f8]">Today&apos;s matches</h2>
          {loading ? (
            <div className="flex justify-center py-10 text-[#98a0af]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : fixtures.length === 0 ? (
            <p className="rounded-2xl border border-[rgba(233,238,247,0.07)] bg-[#0f1115]/85 px-5 py-6 text-center text-sm text-[#98a0af]">
              No World Cup matches today — check back on the next matchday.
            </p>
          ) : (
            <div className="space-y-3">
              {fixtures.map((f) => (
                <FixtureRow
                  key={f.id}
                  fixture={f}
                  prediction={predictions[f.id]}
                  onPredict={() => openPredict(f)}
                  onShare={() => predictions[f.id] && handleShare(f, predictions[f.id])}
                />
              ))}
            </div>
          )}
        </section>

        <KeepyUppy />

        {modalMatch && (
          <PredictModal open={modalOpen} onOpenChange={setModalOpen} match={modalMatch} initialMarket={initialMarket} onSubmit={handleSubmit} />
        )}
      </div>
    </div>
  );
};

const FixtureRow = ({
  fixture,
  prediction,
  onPredict,
  onShare,
}: {
  fixture: Fixture;
  prediction?: MyPrediction;
  onPredict: () => void;
  onShare: () => void;
}) => {
  const open = fixture.status === "upcoming" && Date.parse(fixture.kickoffAt) > Date.now();
  const finished = fixture.status === "finished";
  const when = new Date(fixture.kickoffAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="rounded-2xl border border-[rgba(233,238,247,0.07)] bg-[#0f1115]/85 px-4 py-3.5">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamFlag src={fixture.homeFlag} name={fixture.homeTeam} size="sm" />
          <span className="wc-display truncate text-lg leading-none tracking-wide text-[#f3f5f8]">{fixture.homeTeam}</span>
        </div>
        <span className="wc-display shrink-0 text-sm text-[#5b6472]">vs</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <span className="wc-display truncate text-lg leading-none tracking-wide text-[#f3f5f8]">{fixture.awayTeam}</span>
          <TeamFlag src={fixture.awayFlag} name={fixture.awayTeam} size="sm" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(233,238,247,0.07)] pt-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b6472]">
          {finished
            ? `FT ${formatScore({ home: fixture.homeScore ?? 0, away: fixture.awayScore ?? 0 })}`
            : !open
              ? "Underway"
              : when}
        </span>
        {prediction ? (
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e8fb52]">
              {prediction.prize === "free_month"
                ? "Won · free month"
                : prediction.prize === "half_off"
                  ? "Won · 50% off"
                  : `Pick: ${predictionPick(prediction, fixture.homeTeam, fixture.awayTeam)}`}
            </span>
            <button
              type="button"
              onClick={onShare}
              aria-label="Share prediction"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(233,238,247,0.13)] text-[#98a0af] transition-colors duration-150 hover:border-[#e8fb52]/50 hover:text-[#e8fb52]"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : open ? (
          <button
            type="button"
            onClick={onPredict}
            className="rounded-lg bg-[#e8fb52] px-4 py-1.5 font-display text-[12px] font-bold text-[#08090c] transition-colors duration-150 hover:bg-white"
          >
            Predict →
          </button>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b6472]">Closed</span>
        )}
      </div>
    </div>
  );
};

export default WorldCupPredictions;
