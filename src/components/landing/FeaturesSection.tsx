import { useEffect, useRef, useState } from "react";
import { Search, Mail, Phone, FileSpreadsheet, Globe, Zap, BarChart3, Eye } from "lucide-react";

const features = [
  { icon: Search,         code: "01", title: "MAPS SEARCH",    desc: "Search any business type in any city. Google Places API delivers real-time, accurate results." },
  { icon: Mail,           code: "02", title: "EMAIL EXTRACT",  desc: "Scans each business website across all pages. Finds emails even on contact and about pages." },
  { icon: Phone,          code: "03", title: "PHONE + WA",     desc: "Captures phone numbers from Maps listings. Detects WhatsApp links on business websites." },
  { icon: FileSpreadsheet,code: "04", title: "XLSX EXPORT",    desc: "Professionally formatted Excel with colored headers, alternating rows, auto-sized columns." },
  { icon: Globe,          code: "05", title: "GLOBAL COVERAGE",desc: "47+ countries. Search any neighborhood or city. Customizable radius from 1 to 50+ km." },
  { icon: Zap,            code: "06", title: "DUAL SOURCE",    desc: "Google Maps + open web combined. Directories, review sites, articles — 2x lead density." },
  { icon: BarChart3,      code: "07", title: "LEAD SCORING",   desc: "Ranked by data richness. Email + phone + WhatsApp = tier 1. Filter and sort intelligently." },
  { icon: Eye,            code: "08", title: "LIVE PREVIEW",   desc: "Results stream in real-time as they are found. No waiting — watch the table populate live." },
];

const FeaturesSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="features" className="py-24 sm:py-32 relative" style={{ background: "#080808" }}>
      <div className="absolute inset-0 border-t border-white/[0.04] pointer-events-none" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        <div className={`mb-16 flex items-end justify-between border-b border-white/[0.06] pb-8 ${visible ? "animate-section-in" : "opacity-0"}`}>
          <div>
            <div className="label-mono mb-3 text-white/25">// SYSTEM CAPABILITIES</div>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight"
              style={{ fontFamily: "'Space Mono', monospace" }}>
              BUILT FOR SERIOUS<br />LEAD GENERATION
            </h2>
          </div>
          <div className="hidden md:block label-mono text-white/20 text-right">
            08 MODULES<br />ACTIVE
          </div>
        </div>

        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-4 border border-white/[0.06]">
          {features.map((f, idx) => (
            <div
              key={idx}
              className={`relative p-6 border-r border-b border-white/[0.06] group overflow-hidden
                transition-colors duration-200 hover:bg-[#111]
                ${visible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${idx * 55}ms` }}
            >
              {/* Ghost module number — decorative */}
              <div
                className="absolute -top-1 -left-1 font-black text-white leading-none select-none pointer-events-none transition-opacity duration-200 group-hover:opacity-[0.09]"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "76px", opacity: 0.055 }}
                aria-hidden="true"
              >
                {f.code}
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <f.icon className="h-4 w-4 text-white/35 group-hover:text-white/70 transition-colors duration-200" strokeWidth={1.5} />
                  <span className="label-mono text-white/20">{f.code}</span>
                </div>
                <h3 className="font-mono-data text-xs font-bold text-white/80 mb-3 tracking-wider">{f.title}</h3>
                <p className="font-body text-[13px] text-white/35 leading-relaxed group-hover:text-white/55 transition-colors duration-200">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;
