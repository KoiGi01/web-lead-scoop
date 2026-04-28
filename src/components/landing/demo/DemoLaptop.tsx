import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCheck } from "lucide-react";
import LaptopChrome from "./LaptopChrome";
import MockSearchBar from "./MockSearchBar";
import MockResultsTable from "./MockResultsTable";
import MockIntelligencePanel from "./MockIntelligencePanel";
import { MOCK_QUERY, MOCK_LEADS, FEATURED_LEAD } from "./mockData";
import { cn } from "@/lib/utils";

export type DemoScene = 0 | 1 | 2 | 3;

export interface DemoLaptopProps {
  scene?: DemoScene;
  progress?: number;
  autoplay?: boolean;
  className?: string;
}

const SCENE_LABELS: Record<DemoScene, string> = {
  0: "Search",
  1: "Stream results",
  2: "AI intelligence",
  3: "Export",
};

const AUTOPLAY_DURATION_MS = 12_000;
const SCENE_DURATION = AUTOPLAY_DURATION_MS / 4;

const DemoLaptop = ({
  scene: sceneProp,
  progress: progressProp,
  autoplay = false,
  className,
}: DemoLaptopProps) => {
  const [autoScene, setAutoScene] = useState<DemoScene>(0);
  const [autoProgress, setAutoProgress] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoplay) return;

    const tick = (now: number) => {
      if (startedAtRef.current === null) startedAtRef.current = now;
      const elapsed = (now - startedAtRef.current) % AUTOPLAY_DURATION_MS;
      const sceneIdx = Math.floor(elapsed / SCENE_DURATION) as DemoScene;
      const within = (elapsed % SCENE_DURATION) / SCENE_DURATION;
      setAutoScene(sceneIdx);
      setAutoProgress(within);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      startedAtRef.current = null;
    };
  }, [autoplay]);

  const scene = sceneProp ?? autoScene;
  const progress = progressProp ?? autoProgress;

  const queryProgress = scene === 0 ? Math.min(1, progress * 1.4) : 1;
  const isSearching = scene === 0 && progress > 0.7;
  const visibleRowCount = scene >= 1 ? Math.ceil(progress * MOCK_LEADS.length) : 0;
  const fullRowCount = scene >= 2 ? MOCK_LEADS.length : visibleRowCount;
  const showScores = scene >= 2;
  const intelligenceOpen = scene === 2 && progress > 0.15;
  const intelligenceProgress = scene === 2 ? Math.min(1, (progress - 0.15) * 1.5) : 1;
  const exportPulse = scene === 3;

  return (
    <LaptopChrome className={className}>
      <div className="relative h-full w-full">
        <div className="absolute inset-0 flex flex-col">
          <div className="px-5 py-3 border-b border-cream-100/8 flex items-center justify-between bg-petrol-800/60">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-wine-500/50 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-wine-500" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-cream-100/40">
                LIVE — {SCENE_LABELS[scene as DemoScene]}
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-cream-100/30">
              30 credits
            </span>
          </div>

          <div className="flex-1 overflow-hidden p-5 flex flex-col gap-4 relative">
            <MockSearchBar
              query={MOCK_QUERY}
              progress={queryProgress}
              isSearching={isSearching}
            />

            <div className="flex-1 min-h-0 relative">
              {scene >= 1 ? (
                <MockResultsTable
                  leads={MOCK_LEADS}
                  visibleCount={scene === 1 ? visibleRowCount : fullRowCount}
                  highlightId={scene === 2 ? FEATURED_LEAD.id : null}
                  showScores={showScores}
                />
              ) : (
                <div className="h-full rounded-md border border-dashed border-cream-100/8 flex items-center justify-center">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-cream-100/30">
                    Results will appear here
                  </p>
                </div>
              )}

              <AnimatePresence>
                {intelligenceOpen && (
                  <motion.div
                    key="intelligence"
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 30, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-0 h-full w-[42%]"
                  >
                    <MockIntelligencePanel
                      open
                      progress={intelligenceProgress}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-cream-100/40">
                  {fullRowCount} results
                </span>
                {scene >= 2 && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-wine-500">
                    {MOCK_LEADS.filter((l) => l.score >= 75).length} hot
                  </span>
                )}
              </div>

              <button
                disabled
                aria-disabled
                className={cn(
                  "h-8 px-3 rounded-md flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-all",
                  exportPulse
                    ? "bg-cream-100 text-petrol-900 shadow-[0_0_24px_rgba(236,220,201,0.35)]"
                    : "bg-cream-100/5 border border-cream-100/12 text-cream-100/60",
                )}
              >
                {scene === 3 && progress > 0.6 ? (
                  <>
                    <CheckCheck className="h-3 w-3" /> EXPORTED
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3" /> EXPORT XLSX
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <FloatingBadges scene={scene} />
      </div>
    </LaptopChrome>
  );
};

const FloatingBadges = ({ scene }: { scene: DemoScene }) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <AnimatePresence>
        {scene === 0 && (
          <motion.div
            key="kw-badge"
            initial={{ opacity: 0, x: -20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute -left-4 top-12 z-10"
          >
            <div className="rounded-md bg-petrol-700 border border-wine-700/40 px-2.5 py-1.5 shadow-xl">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream-100">
                + keyword
              </span>
            </div>
          </motion.div>
        )}

        {scene === 1 && (
          <motion.div
            key="contact-badge"
            initial={{ opacity: 0, x: 20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
            className="absolute -right-4 top-1/3 z-10"
          >
            <div className="rounded-md bg-petrol-700 border border-cream-100/15 px-2.5 py-1.5 shadow-xl flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-wine-500 animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream-100">
                contact extracted
              </span>
            </div>
          </motion.div>
        )}

        {scene === 2 && (
          <motion.div
            key="ai-badge"
            initial={{ opacity: 0, x: -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute -left-4 bottom-1/4 z-10"
          >
            <div className="rounded-md bg-petrol-700 border border-wine-700/40 px-2.5 py-1.5 shadow-xl flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-wine-500" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream-100">
                AI scored
              </span>
            </div>
          </motion.div>
        )}

        {scene === 3 && (
          <motion.div
            key="export-badge"
            initial={{ opacity: 0, x: 20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
            className="absolute -right-4 bottom-12 z-10"
          >
            <div className="rounded-md bg-petrol-700 border border-cream-100/15 px-2.5 py-1.5 shadow-xl">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cream-100">
                12,847 exported / wk
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DemoLaptop;
