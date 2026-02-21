import { Target, ArrowRight, Zap, Globe, Mail, Users, TrendingUp, Wifi } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

/* Reusable screw head element */
const Screw = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => {
  const positions: Record<string, string> = {
    tl: "top-2 left-2",
    tr: "top-2 right-2",
    bl: "bottom-2 left-2",
    br: "bottom-2 right-2",
  };
  const gradients: Record<string, string> = {
    tl: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.8) 1px, rgba(0,0,0,0.18) 2.5px, rgba(0,0,0,0.04) 5px, transparent 6px)",
    tr: "radial-gradient(circle at 65% 35%, rgba(255,255,255,0.8) 1px, rgba(0,0,0,0.18) 2.5px, rgba(0,0,0,0.04) 5px, transparent 6px)",
    bl: "radial-gradient(circle at 35% 65%, rgba(255,255,255,0.8) 1px, rgba(0,0,0,0.18) 2.5px, rgba(0,0,0,0.04) 5px, transparent 6px)",
    br: "radial-gradient(circle at 65% 65%, rgba(255,255,255,0.8) 1px, rgba(0,0,0,0.18) 2.5px, rgba(0,0,0,0.04) 5px, transparent 6px)",
  };
  return (
    <span
      className={`absolute ${positions[pos]} h-3 w-3 rounded-full opacity-60 pointer-events-none`}
      style={{ background: gradients[pos] }}
    />
  );
};

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden bg-[#e0e5ec] pt-16">
      {/* Blueprint grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#a3b1c6 1px, transparent 1px), linear-gradient(90deg, #a3b1c6 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.07,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-24 lg:py-36">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">

          {/* ── Left column ── */}
          <div className="space-y-8 max-w-xl">

            {/* Status badge */}
            <div
              className="animate-fade-in inline-flex items-center gap-2.5 rounded-full px-4 py-2"
              style={{ boxShadow: "var(--shadow-recessed)" }}
            >
              <div className="h-2 w-2 led-green flex-shrink-0" />
              <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a5568]">
                System Operational
              </span>
              <span
                className="rounded-full px-2 py-0.5 font-mono-data text-[9px] font-bold uppercase tracking-wider text-white bg-[#ff4757]"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                v2.0
              </span>
            </div>

            {/* Headline */}
            <div className="animate-fade-in-up delay-100">
              <h1
                className="text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] text-[#2d3436] sm:text-6xl lg:text-7xl"
                style={{ textShadow: "0 1px 0 #ffffff, 0 2px 4px rgba(0,0,0,0.08)" }}
              >
                Extract Local{" "}
                <span className="relative inline-block text-[#ff4757]" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.3)" }}>
                  Business Leads
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-[#ff4757]/30" />
                </span>{" "}
                in Seconds
              </h1>
            </div>

            <p className="animate-fade-in-up delay-200 text-lg leading-relaxed text-[#4a5568]">
              Search any keyword&nbsp;+&nbsp;location and instantly get business names, phone numbers, emails,
              and WhatsApp — exported to a professionally styled Excel file.
            </p>

            {/* Actions */}
            <div className="animate-fade-in-up delay-300 flex flex-wrap items-center gap-4">
              <button
                onClick={onGetStarted}
                className="btn-press group flex items-center gap-2.5 rounded-xl px-7 py-4 text-sm font-bold uppercase tracking-widest text-white bg-[#ff4757]"
                style={{
                  boxShadow: "4px 4px 10px rgba(166,50,60,0.4), -2px -2px 8px rgba(255,100,110,0.3)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                Start for Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={onGetStarted}
                className="btn-press flex items-center gap-2 rounded-xl px-6 py-4 text-sm font-bold uppercase tracking-widest text-[#4a5568] hover:text-[#2d3436] transition-colors"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                See Demo
              </button>
            </div>

            {/* Trust bar */}
            <div className="animate-fade-in-up delay-400 flex flex-wrap items-center gap-5 pt-1">
              {[
                { icon: Globe, label: "Google Maps Data" },
                { icon: Mail,  label: "Email Scraping" },
                { icon: Users, label: "2,400+ leads/mo" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-[#ff4757]" strokeWidth={2} />
                  <span className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-[#4a5568]">
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
                    className="h-8 w-8 rounded-full border-2 border-[#e0e5ec] flex items-center justify-center text-[11px] font-bold text-white"
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
                <p className="font-mono-data text-[10px] text-[#4a5568] mt-0.5">Loved by 1,200+ outreach teams</p>
              </div>
            </div>
          </div>

          {/* ── Right column — CSS Device Mockup ── */}
          <div className="hidden lg:block animate-fade-in-up delay-300 flex-shrink-0">
            <div
              className="relative w-[380px] rounded-2xl bg-[#2d3436]"
              style={{
                boxShadow: "16px 16px 40px rgba(0,0,0,0.35), -4px -4px 12px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
                border: "3px solid #1a2025",
              }}
            >
              {/* Carbon fiber texture */}
              <div
                className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-20"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
                  backgroundSize: "4px 4px",
                }}
              />

              {/* Device header bar */}
              <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff4757] shadow-[0_0_6px_rgba(255,71,87,0.8)]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi className="h-3 w-3 text-emerald-400" />
                  <span className="font-mono-data text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
                    CONNECTED
                  </span>
                </div>
              </div>

              {/* Screen */}
              <div
                className="relative m-3 rounded-xl overflow-hidden"
                style={{
                  background: "#0d1117",
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {/* CRT scanlines */}
                <div
                  className="absolute inset-0 pointer-events-none z-10 opacity-[0.06]"
                  style={{
                    background: "repeating-linear-gradient(0deg, rgba(0,0,0,1) 0px, rgba(0,0,0,1) 1px, transparent 1px, transparent 3px)",
                  }}
                />

                <div className="relative z-20 p-4 space-y-4">
                  {/* Search header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: "rgba(255,71,87,0.15)", border: "1px solid rgba(255,71,87,0.3)" }}
                      >
                        <Target className="h-4 w-4 text-[#ff4757]" />
                      </div>
                      <div>
                        <p className="font-mono-data text-[9px] text-white/40 uppercase tracking-widest">Query</p>
                        <p className="font-mono-data text-xs font-semibold text-white">"Dentist" — Miami, FL</p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                      style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono-data text-[9px] font-bold text-emerald-400 uppercase tracking-widest">LIVE</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "BIZNS",    value: "60", color: "#60a5fa" },
                      { label: "EMAILS",   value: "38", color: "#a78bfa" },
                      { label: "WHATSAPP", value: "14", color: "#34d399" },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="rounded-lg p-2.5 text-center"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <p className="font-mono-data text-xl font-bold" style={{ color }}>{value}</p>
                        <p className="font-mono-data text-[8px] font-bold uppercase tracking-widest text-white/40 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Business list */}
                  <div className="space-y-1.5">
                    {[
                      { name: "Smile Dental Clinic",      tag: "EMAIL + PHONE", color: "text-emerald-400", bg: "rgba(52,211,153,0.1)" },
                      { name: "Miami Family Dentistry",   tag: "EMAIL FOUND",   color: "text-blue-400",    bg: "rgba(96,165,250,0.1)" },
                      { name: "Bright Teeth Center",      tag: "WHATSAPP",      color: "text-violet-400",  bg: "rgba(167,139,250,0.1)" },
                      { name: "Downtown Dental Studio",   tag: "EMAIL FOUND",   color: "text-emerald-400", bg: "rgba(52,211,153,0.1)" },
                    ].map(({ name, tag, color, bg }) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <span className="font-mono-data text-[11px] text-white/75 truncate max-w-[160px]">{name}</span>
                        <span
                          className={`font-mono-data text-[8px] font-bold px-1.5 py-0.5 rounded ${color}`}
                          style={{ background: bg }}
                        >
                          {tag}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between font-mono-data text-[9px] text-white/30 mb-1.5 uppercase tracking-wider">
                      <span>Scanning websites…</span>
                      <span className="text-[#ff4757]">73%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#ff4757]"
                        style={{
                          width: "73%",
                          boxShadow: "0 0 8px rgba(255,71,87,0.6)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Device footer — hardware buttons */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {["PWR", "SIG", "DAT"].map((label, i) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]" : i === 1 ? "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.6)]" : "bg-blue-400 animate-pulse"}`}
                      />
                      <span className="font-mono-data text-[7px] text-white/30 uppercase">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-[#ff4757]" />
                  <span className="font-mono-data text-[9px] text-white/40">GlobaLeads22</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom edge divider */}
      <div className="h-px w-full bg-[#babecc]/60" />
    </section>
  );
};

export default HeroSection;
