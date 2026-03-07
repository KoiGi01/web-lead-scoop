import { ArrowRight } from "lucide-react";
import DotGlobe from "./DotGrid";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center pt-14 overflow-hidden">
      {/* Subtle rule lines */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute w-full border-t border-white/[0.018]" style={{ top: `${12.5 * (i + 1)}%` }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 w-full py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT — Copy */}
          <div>
            <div className="flex items-center gap-2 mb-10 animate-fade-in-up">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="label-mono text-white/40">v2.4.1</span>
              <span className="label-mono text-white/20 mx-1">—</span>
              <span className="label-mono text-white/40">AI LEAD INTELLIGENCE ACTIVE</span>
            </div>

            <div className="mb-8 animate-fade-in-up delay-100">
              <div className="font-black leading-[0.9] text-white tracking-tight"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(64px, 8.5vw, 96px)" }}>
                FIND
              </div>
              <div className="my-2">
                <span className="inline-block bg-white text-[#080808] font-black leading-none tracking-tight px-3 py-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(36px, 5.2vw, 66px)", borderRadius: "3px" }}>
                  QUALIFIED
                </span>
              </div>
              <div className="font-black leading-[0.9] text-white/85 tracking-tight"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(64px, 8.5vw, 96px)" }}>
                LEADS.
              </div>
            </div>

            <p className="font-body text-white/40 text-[15px] leading-relaxed max-w-sm mb-10 animate-fade-in-up delay-200">
              Search by keyword + location. Extract emails, phones, WhatsApp.
              Download as Excel. Ship your outreach today.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12 animate-fade-in-up delay-300">
              <button onClick={onGetStarted}
                className="btn-btc btn-btc-pulse px-8 py-4 text-[11px] inline-flex items-center justify-center gap-2 group">
                START FREE — 30 CREDITS
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="px-8 py-4 text-[11px] font-bold tracking-widest text-white/45 border border-white/[0.12] hover:border-white/30 hover:text-white/75 transition-all"
                style={{ fontFamily: "'Space Mono', monospace", borderRadius: "3px" }}>
                SEE PRICING
              </button>
            </div>

            <div className="flex items-center gap-8 animate-fade-in-up delay-400 border-t border-white/[0.06] pt-8">
              {[
                { val: "34K+",  label: "LEADS GEN" },
                { val: "47",    label: "COUNTRIES" },
                { val: "~2MIN", label: "AVG SEARCH" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="text-2xl font-black text-white mb-0.5 tracking-tight"
                    style={{ fontFamily: "'Space Mono', monospace" }}>{m.val}</div>
                  <div className="label-mono">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Dot matrix globe */}
          <div className="relative animate-fade-in-up delay-200 flex items-center justify-center">
            <div className="relative w-full" style={{ aspectRatio: "1 / 1", maxWidth: "520px" }}>
              <DotGlobe className="absolute inset-0 w-full h-full" />
              {/* Label underneath globe */}
              <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center gap-6">
                <span className="label-mono text-white/25">47 COUNTRIES</span>
                <span className="label-mono text-white/15">·</span>
                <span className="label-mono text-white/25">GLOBAL COVERAGE</span>
                <span className="label-mono text-white/15">·</span>
                <span className="label-mono text-white/25">REAL-TIME</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
