import { ArrowRight } from "lucide-react";
import DotGlobe from "./DotGrid";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center pt-14 overflow-hidden bg-cream-50">
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute w-full border-t border-petrol-900/[0.03]" style={{ top: `${12.5 * (i + 1)}%` }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 w-full py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          <div>
            <div className="flex items-center gap-2 mb-10 animate-fade-in-up">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wine-700 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-wine-700" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">v2.4.1</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/[0.15] mx-1">—</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">AI LEAD INTELLIGENCE ACTIVE</span>
            </div>

            <div className="mb-8 animate-fade-in-up delay-100">
              <div
                className="font-black leading-[0.9] text-petrol-900 tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(64px, 8.5vw, 96px)" }}
              >
                FIND
              </div>
              <div className="my-2">
                <span
                  className="inline-block bg-petrol-900 text-cream-50 font-black leading-none tracking-tight px-3 py-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(36px, 5.2vw, 66px)", borderRadius: "3px" }}
                >
                  QUALIFIED
                </span>
              </div>
              <div
                className="font-black leading-[0.9] text-petrol-900/70 tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(64px, 8.5vw, 96px)" }}
              >
                LEADS.
              </div>
            </div>

            <p className="font-body text-petrol-700/70 text-[15px] leading-relaxed max-w-sm mb-10 animate-fade-in-up delay-200">
              Search by keyword + location. Extract emails, phones, WhatsApp.
              Download as Excel. Ship your outreach today.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12 animate-fade-in-up delay-300">
              <Button variant="primary" size="lg" onClick={onGetStarted} className="inline-flex items-center gap-2 group">
                START FREE — 30 CREDITS
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="text-petrol-900/60 border border-petrol-900/[0.14] hover:border-petrol-900/30 hover:text-petrol-900 hover:bg-transparent"
              >
                SEE PRICING
              </Button>
            </div>

            <div className="flex items-center gap-8 animate-fade-in-up delay-400 border-t border-petrol-900/[0.08] pt-8">
              {[
                { val: "34K+",  label: "LEADS GEN" },
                { val: "47",    label: "COUNTRIES" },
                { val: "~2MIN", label: "AVG SEARCH" },
              ].map((m) => (
                <div key={m.label}>
                  <div
                    className="text-2xl font-black text-petrol-900 mb-0.5 tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {m.val}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/50">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-in-up delay-200 flex items-center justify-center">
            <div className="relative w-full" style={{ aspectRatio: "1 / 1", maxWidth: "520px" }}>
              <DotGlobe className="absolute inset-0 w-full h-full" />
              <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center gap-6">
                <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">47 COUNTRIES</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/[0.15]">·</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">GLOBAL COVERAGE</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/[0.15]">·</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">REAL-TIME</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
