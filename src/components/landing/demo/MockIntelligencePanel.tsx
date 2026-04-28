import { Zap, X, Lightbulb } from "lucide-react";
import { MOCK_INTELLIGENCE } from "./mockData";

interface MockIntelligencePanelProps {
  open: boolean;
  progress: number;
}

const MockIntelligencePanel = ({ open, progress }: MockIntelligencePanelProps) => {
  if (!open) return null;

  const animatedScore = Math.round(MOCK_INTELLIGENCE.score * Math.max(0, Math.min(1, progress)));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - animatedScore / 100);

  return (
    <div
      className="absolute right-0 top-0 h-full w-[42%] bg-petrol-700/95 border-l border-wine-700/30 backdrop-blur-sm p-4 flex flex-col gap-3 animate-fade-in-up"
      style={{
        boxShadow: "-12px 0 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-widest text-cream-100/40">
          // INTELLIGENCE
        </span>
        <X className="h-3 w-3 text-cream-100/30" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 flex-shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="rgba(236,220,201,0.08)"
              strokeWidth="4"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="#7A3D63"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 100ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono font-bold text-cream-100 text-[15px] tabular-nums">
              {animatedScore}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-medium text-cream-100 truncate">
            {MOCK_INTELLIGENCE.leadName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Zap className="h-3 w-3 text-wine-500" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-wine-500">
              HOT LEAD
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-petrol-900/40 border border-cream-100/6 p-2">
          <p className="font-mono text-[8px] uppercase tracking-widest text-cream-100/35 mb-0.5">
            Maturity
          </p>
          <p className="text-[11px] text-cream-100">{MOCK_INTELLIGENCE.maturity}</p>
        </div>
        <div className="rounded bg-petrol-900/40 border border-cream-100/6 p-2">
          <p className="font-mono text-[8px] uppercase tracking-widest text-cream-100/35 mb-0.5">
            Position
          </p>
          <p className="text-[11px] text-cream-100">{MOCK_INTELLIGENCE.positioning}</p>
        </div>
      </div>

      <div className="rounded bg-wine-700/10 border border-wine-700/25 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <Lightbulb className="h-3 w-3 text-wine-500" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-wine-500">
            PITCH ANGLE
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-cream-100/85">
          {MOCK_INTELLIGENCE.pitch}
        </p>
      </div>
    </div>
  );
};

export default MockIntelligencePanel;
