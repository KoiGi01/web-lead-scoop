import { useEffect, useRef, useState } from "react";
import { Search, Mail, Phone, FileSpreadsheet, Globe, Zap, BarChart3, Eye } from "lucide-react";

const features = [
  { icon: Search,          code: "01", title: "MAPS SEARCH",     desc: "Search any business type in any city. Google Places API delivers real-time, accurate results." },
  { icon: Mail,            code: "02", title: "EMAIL EXTRACT",   desc: "Scans each business website across all pages. Finds emails even on contact and about pages." },
  { icon: Phone,           code: "03", title: "PHONE + WA",      desc: "Captures phone numbers from Maps listings. Detects WhatsApp links on business websites." },
  { icon: FileSpreadsheet, code: "04", title: "XLSX EXPORT",     desc: "Professionally formatted Excel with colored headers, alternating rows, auto-sized columns." },
  { icon: Globe,           code: "05", title: "GLOBAL COVERAGE", desc: "47+ countries. Search any neighborhood or city. Customizable radius from 1 to 50+ km." },
  { icon: Zap,             code: "06", title: "DUAL SOURCE",     desc: "Google Maps + open web combined. Directories, review sites, articles — 2x lead density." },
  { icon: BarChart3,       code: "07", title: "LEAD SCORING",    desc: "Ranked by data richness. Email + phone + WhatsApp = tier 1. Filter and sort intelligently." },
  { icon: Eye,             code: "08", title: "LIVE PREVIEW",    desc: "Results stream in real-time as they are found. No waiting — watch the table populate live." },
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
    <section id="features" className="py-24 sm:py-32 relative bg-cream-50">
      <div className="absolute inset-0 border-t border-petrol-900/[0.06] pointer-events-none" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        <div className={`mb-16 flex items-end justify-between border-b border-petrol-900/[0.08] pb-8 ${visible ? "animate-section-in" : "opacity-0"}`}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25 mb-3">// SYSTEM CAPABILITIES</div>
            <h2
              className="text-4xl sm:text-5xl font-black text-petrol-900 tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BUILT FOR SERIOUS<br />LEAD GENERATION
            </h2>
          </div>
          <div className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-petrol-900/25 text-right">
            08 MODULES<br />ACTIVE
          </div>
        </div>

        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-4 border border-petrol-900/[0.08]">
          {features.map((f, idx) => (
            <div
              key={idx}
              className={`relative p-6 border-r border-b border-petrol-900/[0.08] group overflow-hidden
                bg-white transition-colors duration-200 hover:bg-cream-50
                ${visible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${idx * 55}ms` }}
            >
              <div
                className="absolute -top-1 -left-1 font-black text-petrol-900 leading-none select-none pointer-events-none transition-opacity duration-200 group-hover:opacity-[0.06]"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "76px", opacity: 0.04 }}
                aria-hidden="true"
              >
                {f.code}
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-8 w-8 items-center justify-center bg-wine-700/10 rounded-sm">
                    <f.icon className="h-4 w-4 text-wine-700" strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">{f.code}</span>
                </div>
                <h3 className="font-mono text-xs font-bold text-petrol-900 mb-3 tracking-wider">{f.title}</h3>
                <p className="font-body text-[13px] text-petrol-700/70 leading-relaxed group-hover:text-petrol-700/90 transition-colors duration-200">
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
