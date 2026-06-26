import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { drawBall } from "@/lib/footballSprite";
import { track } from "@/lib/analytics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BEST_KEY = "gl22:keepyuppy-best";

type Phase = "idle" | "playing" | "over";

// Page element: a single Play button (+ best score) that opens the game in a
// roomy modal so the ball has plenty of vertical space.
const KeepyUppy = () => {
  const [open, setOpen] = useState(false);
  const [best, setBest] = useState(0);

  const refreshBest = () => setBest(Number(window.localStorage.getItem(BEST_KEY) || 0));
  useEffect(() => {
    refreshBest();
  }, []);

  return (
    <div className="mt-12 flex flex-col items-center gap-3 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8fb52]">While you wait</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2.5 rounded-xl border border-[rgba(232,251,82,0.4)] bg-[rgba(232,251,82,0.06)] px-6 py-3 font-display text-sm font-bold text-[#f3f5f8] transition-colors duration-150 hover:bg-[rgba(232,251,82,0.12)]"
      >
        <Play className="h-4 w-4 text-[#e8fb52]" />
        Play keepy-uppy
      </button>
      {best > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">Best · {best}</p>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) refreshBest();
        }}
      >
        <DialogContent className="border-[rgba(233,238,247,0.13)] bg-[#0b0d11] p-0 text-[#f3f5f8] sm:max-w-lg">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="wc-display text-2xl tracking-wide">Keepy-uppy</DialogTitle>
          </DialogHeader>
          {open && <KeepyUppyGame />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// The actual game. Mounted only while the modal is open. Fills a tall play area.
const KeepyUppyGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const game = useRef({
    phase: "idle" as Phase,
    score: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 30,
    rot: 0,
    vr: 0,
    w: 0,
    h: 0,
  });

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(BEST_KEY) || 0);
    if (stored > 0) setBest(stored);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = game.current;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      g.w = canvas.clientWidth;
      g.h = canvas.clientHeight;
      canvas.width = Math.max(1, g.w * dpr);
      canvas.height = Math.max(1, g.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    g.x = g.w / 2;
    g.y = g.h * 0.35;

    const drawScene = () => {
      ctx.clearRect(0, 0, g.w, g.h);
      ctx.strokeStyle = "rgba(233,238,247,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, g.h - 1);
      ctx.lineTo(g.w, g.h - 1);
      ctx.stroke();
      drawBall(ctx, g.x, g.y, g.r, g.rot, false);
    };

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.667);
      last = now;
      if (g.phase === "playing") {
        g.vy += 0.28 * dt;
        g.vx *= Math.pow(0.995, dt);
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.rot += g.vr * dt;
        if (g.x < g.r) { g.x = g.r; g.vx = Math.abs(g.vx) * 0.88; g.vr = -g.vr; }
        else if (g.x > g.w - g.r) { g.x = g.w - g.r; g.vx = -Math.abs(g.vx) * 0.88; g.vr = -g.vr; }
        if (g.y < g.r) { g.y = g.r; g.vy = Math.abs(g.vy) * 0.7; }
        if (g.y - g.r > g.h) {
          g.phase = "over";
          setPhase("over");
          setBest((prev) => {
            const next = Math.max(prev, g.score);
            window.localStorage.setItem(BEST_KEY, String(next));
            return next;
          });
          track("worldcup_keepyuppy_over", { score: g.score });
        }
      }
      drawScene();
      raf = requestAnimationFrame(step);
    };

    const hit = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      if (g.phase !== "playing") return;
      const d2 = (g.x - mx) ** 2 + (g.y - my) ** 2;
      if (d2 <= (g.r + 28) ** 2) {
        const dx = g.x - mx;
        g.vx = (dx / (g.r + 28)) * 3.2 + (Math.random() - 0.5) * 1.2;
        g.vy = -10;
        g.vr = (Math.random() - 0.5) * 0.8;
        g.score += 1;
        setScore(g.score);
      }
    };

    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      hit(e.clientX, e.clientY);
    };

    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const start = () => {
    const g = game.current;
    g.score = 0;
    setScore(0);
    g.x = g.w / 2;
    g.y = g.h * 0.3;
    g.vx = (Math.random() - 0.5) * 3;
    g.vy = 0;
    g.vr = 0;
    g.rot = 0;
    g.phase = "playing";
    setPhase("playing");
    track("worldcup_keepyuppy_start", {});
  };

  return (
    <div className="px-5 pb-5">
      <div className="mb-3 flex items-center justify-end gap-5">
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b6472]">Score</p>
          <p className="wc-display text-2xl tabular-nums text-[#f3f5f8]">{score}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b6472]">Best</p>
          <p className="wc-display text-2xl tabular-nums text-[#e8fb52]">{best}</p>
        </div>
      </div>

      <div className="relative h-[60vh] max-h-[620px] min-h-[420px] overflow-hidden rounded-2xl border border-[rgba(233,238,247,0.07)] bg-[#08090c]">
        <canvas ref={canvasRef} className="block h-full w-full cursor-pointer touch-none" />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#08090c]/70 text-center backdrop-blur-[2px]">
            {phase === "over" && (
              <p className="wc-display text-3xl tracking-wide text-[#f3f5f8]">
                Dropped it at <span className="text-[#e8fb52]">{score}</span>
                {score > 0 && score >= best ? " — new best!" : ""}
              </p>
            )}
            <p className="max-w-xs text-sm leading-6 text-[#98a0af]">
              Tap the ball to keep it in the air. Don&apos;t let it hit the floor.
            </p>
            <button
              type="button"
              onClick={start}
              className="rounded-xl bg-[#e8fb52] px-6 py-2.5 font-display text-sm font-bold text-[#08090c] transition-colors duration-150 hover:bg-white"
            >
              {phase === "over" ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeepyUppy;
