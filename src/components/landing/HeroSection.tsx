import { ArrowRight, Globe, Mail, Users } from "lucide-react";
import GlobaLeadsLogo from "@/components/icons/GlobaLeadsLogo";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen bg-[#030304] flex items-center overflow-hidden pt-16">

      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />

      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F7931A] opacity-[0.06] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-[#FFD600] opacity-[0.04] blur-[100px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* ── Left column — text ── */}
          <div className="flex-1 max-w-xl">
            {/* Status badge */}
            <div className="animate-fade-in mb-7 inline-flex items-center gap-2.5 rounded-full border border-[#F7931A]/30 bg-[#F7931A]/10 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7931A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F7931A]" />
              </span>
              <span className="font-mono-data text-[11px] font-bold uppercase tracking-widest text-[#F7931A]">
                System Operational
              </span>
              <span className="rounded-full bg-[#F7931A] px-2 py-0.5 font-mono-data text-[9px] font-bold text-white">
                v2.0
              </span>
            </div>

            {/* Headline */}
            <div className="animate-fade-in-up mb-6">
              <h1 className="font-heading text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
                Extract Local{" "}
                <span className="font-heading font-bold leading-tight">Business</span>
                <br />
                <span className="gradient-text">Leads in Seconds</span>
              </h1>
            </div>

            <p className="animate-fade-in-up delay-200 mb-8 text-lg leading-relaxed text-[#94A3B8]">
              Search any keyword&nbsp;+&nbsp;location and instantly get business names, phone numbers,
              emails, and WhatsApp — exported to a professionally styled Excel file.
            </p>

            {/* Actions */}
            <div className="animate-fade-in-up delay-300 flex flex-wrap items-center gap-4 mb-8">
              <button
                onClick={onGetStarted}
                className="btn-btc group flex items-center gap-2.5 px-7 py-4 text-sm font-bold uppercase tracking-widest text-white"
              >
                Start for Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2 rounded-full border-2 border-white/20 px-6 py-4 text-sm font-bold uppercase tracking-widest text-white hover:border-white hover:bg-white/10 transition-all duration-300"
              >
                See Demo
              </button>
            </div>

            {/* Trust bar */}
            <div className="animate-fade-in-up delay-400 flex flex-wrap items-center gap-5 mb-8">
              {[
                { icon: Globe, label: "Google Maps Data" },
                { icon: Mail,  label: "Email Scraping" },
                { icon: Users, label: "2,400+ leads/mo" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-[#F7931A]" strokeWidth={2} />
                  <span className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="animate-fade-in-up delay-500 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981"].map((color, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-[#030304] flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: color }}
                  >
                    {["A","M","S","J","K"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="font-mono-data text-[10px] text-[#94A3B8] mt-0.5">Loved by 1,200+ outreach teams</p>
              </div>
            </div>
          </div>

          {/* ── Right column — Orbital Hero Graphic ── */}
          <div className="hidden lg:flex items-center justify-center flex-shrink-0 relative w-[420px] h-[420px]">

            {/* Outer spinning ring */}
            <div
              className="absolute inset-0 rounded-full border border-[#F7931A]/20"
              style={{ animation: "spin 10s linear infinite" }}
            />
            {/* Inner spinning ring (reverse) */}
            <div
              className="absolute inset-8 rounded-full border border-[#FFD600]/20"
              style={{ animation: "spin 15s linear infinite reverse" }}
            />
            {/* Static middle ring */}
            <div className="absolute inset-16 rounded-full border border-white/10" />

            {/* Central orb */}
            <div className="relative animate-float z-10">
              <div
                className="w-36 h-36 rounded-full bg-gradient-to-br from-[#EA580C] to-[#F7931A] flex items-center justify-center"
                style={{ boxShadow: "0 0 60px rgba(247,147,26,0.5), 0 0 120px rgba(247,147,26,0.2)" }}
              >
                <GlobaLeadsLogo className="h-16 w-16 text-white" size={80} />
              </div>
            </div>

            {/* Floating stat cards */}
            <div
              className="absolute top-4 right-8 glass-card rounded-xl px-4 py-2.5 z-20"
              style={{ animation: "bounce 3s ease-in-out infinite" }}
            >
              <p className="font-mono-data text-xl font-bold text-[#F7931A]">60</p>
              <p className="font-mono-data text-[9px] text-[#94A3B8] uppercase tracking-widest">Leads</p>
            </div>

            <div
              className="absolute bottom-8 right-4 glass-card rounded-xl px-4 py-2.5 z-20"
              style={{ animation: "bounce 4s ease-in-out infinite", animationDelay: "1s" }}
            >
              <p className="font-mono-data text-xl font-bold text-[#FFD600]">38</p>
              <p className="font-mono-data text-[9px] text-[#94A3B8] uppercase tracking-widest">Emails</p>
            </div>

            <div
              className="absolute bottom-12 left-2 glass-card rounded-xl px-4 py-2.5 z-20"
              style={{ animation: "bounce 3.5s ease-in-out infinite", animationDelay: "0.5s" }}
            >
              <p className="font-mono-data text-xl font-bold text-emerald-400">14</p>
              <p className="font-mono-data text-[9px] text-[#94A3B8] uppercase tracking-widest">WhatsApp</p>
            </div>

            {/* Live badge */}
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 z-20 flex items-center gap-1.5 glass-card rounded-full px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="font-mono-data text-[9px] text-emerald-400 uppercase tracking-widest">LIVE</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
