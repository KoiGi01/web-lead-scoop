import { ArrowRight, MapPin, Mail, Phone, Download } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const mockLeads = [
  { name: "Bright Smiles Dental", email: "hello@brightsmiles.com", phone: "+1 305 555 0182", city: "Miami, FL" },
  { name: "Peak Performance Gym", email: "info@peakfit.io",        phone: "+44 20 7946 0321", city: "London, UK" },
  { name: "Sakura Spa & Wellness", email: "book@sakuraspa.jp",     phone: "+81 3 1234 5678", city: "Tokyo, JP" },
];

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center pt-14 overflow-hidden">
      {/* Horizontal rule lines */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute w-full border-t border-white/[0.025]" style={{ top: `${12.5 * (i + 1)}%` }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 w-full py-24">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* LEFT */}
          <div>
            <div className="flex items-center gap-2 mb-10 animate-fade-in-up">
              <span className="label-mono text-white/30">// v2.4.1</span>
              <span className="label-mono text-white/20 mx-1">—</span>
              <span className="label-mono text-white/30">AI LEAD INTELLIGENCE ACTIVE</span>
            </div>

            <div className="mb-8 animate-fade-in-up delay-100">
              <div className="text-[clamp(56px,9vw,108px)] font-black leading-none text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
                FIND
              </div>
              <div className="my-1">
                <div className="inline-block bg-white text-[#080808] text-[clamp(32px,5.5vw,72px)] font-black leading-none tracking-tight px-3" style={{ fontFamily: "'Space Mono', monospace", borderRadius: "2px" }}>
                  QUALIFIED
                </div>
              </div>
              <div className="text-[clamp(56px,9vw,108px)] font-black leading-none text-white/90 tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
                LEADS.
              </div>
            </div>

            <p className="text-white/40 text-sm leading-relaxed max-w-sm mb-10 animate-fade-in-up delay-200" style={{ fontFamily: "'Space Mono', monospace" }}>
              Search by keyword + location. Extract emails, phones, WhatsApp.<br />
              Download as Excel. Ship your outreach today.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12 animate-fade-in-up delay-300">
              <button onClick={onGetStarted} className="btn-btc px-8 py-3.5 text-[11px] inline-flex items-center justify-center gap-2 group">
                START FREE — 30 CREDITS
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="px-8 py-3.5 text-[11px] font-bold tracking-widest text-white/40 border border-white/10 hover:border-white/25 hover:text-white/70 transition-all"
                style={{ fontFamily: "'Space Mono', monospace", borderRadius: "3px" }}
              >
                SEE PRICING
              </button>
            </div>

            <div className="flex items-center gap-8 animate-fade-in-up delay-400 border-t border-white/[0.06] pt-8">
              {[
                { val: "34K+", label: "LEADS GEN" },
                { val: "47",   label: "COUNTRIES" },
                { val: "~2MIN",label: "AVG SEARCH" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="text-xl font-black text-white mb-0.5 tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>{m.val}</div>
                  <div className="label-mono">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Terminal window */}
          <div className="animate-fade-in-up delay-300">
            <div className="border border-white/10 overflow-hidden" style={{ borderRadius: "4px", background: "rgba(255,255,255,0.02)" }}>
              {/* Title bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  </div>
                  <span className="label-mono ml-2">GLOBALEADS_22 — SEARCH OUTPUT</span>
                </div>
                <span className="label-mono text-white/20">v2.4.1</span>
              </div>

              {/* Command line */}
              <div className="px-4 py-3 border-b border-white/[0.04] font-mono-data text-xs">
                <span className="text-white/25">$ </span>
                <span className="text-white/50">search</span>
                <span className="text-white/25"> --keyword </span>
                <span className="text-white/70">"dental clinic"</span>
                <span className="text-white/25"> --location </span>
                <span className="text-white/70">"Miami, FL"</span>
                <span className="text-white/20 animate-blink ml-0.5">█</span>
              </div>

              {/* Status */}
              <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <span className="label-mono">60 LEADS FOUND · 58 EMAILS · 2m 14s</span>
              </div>

              {/* Table */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {["BUSINESS", "EMAIL", "PHONE"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 label-mono">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockLeads.map((lead, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono-data text-xs text-white/80 mb-0.5">{lead.name}</div>
                        <div className="flex items-center gap-1 label-mono text-white/25"><MapPin className="h-2.5 w-2.5" />{lead.city}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-white/30 flex-shrink-0" />
                          <span className="font-mono-data text-xs text-white/60 truncate max-w-[130px]">{lead.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-white/30 flex-shrink-0" />
                          <span className="font-mono-data text-xs text-white/50">{lead.phone}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <span className="label-mono text-white/25">SHOWING 3 OF 60</span>
                <button className="flex items-center gap-1.5 btn-btc px-3 py-1.5 text-[10px] cursor-default">
                  <Download className="h-3 w-3" /> EXPORT .XLSX
                </button>
              </div>
            </div>

            {/* AI score bar */}
            <div className="mt-3 border border-white/[0.08] px-4 py-3 flex items-center justify-between" style={{ borderRadius: "4px", background: "rgba(255,255,255,0.02)" }}>
              <span className="label-mono text-white/30">AI OPPORTUNITY SCORE</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`h-1.5 w-5 ${i < 4 ? "bg-white/70" : "bg-white/15"}`} style={{ borderRadius: "1px" }} />
                  ))}
                </div>
                <span className="font-mono-data text-xs text-white/60">82/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
