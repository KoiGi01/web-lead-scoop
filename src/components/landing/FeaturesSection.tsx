import { Search, Mail, Phone, FileSpreadsheet, Globe, Zap, BarChart3, Eye } from "lucide-react";

const features = [
  { icon: Search,        code: "01", title: "MAPS SEARCH",    desc: "Search any business type in any city. Google Places API delivers real-time, accurate results." },
  { icon: Mail,          code: "02", title: "EMAIL EXTRACT",  desc: "Scans each business website across all pages. Finds emails even on contact and about pages." },
  { icon: Phone,         code: "03", title: "PHONE + WA",     desc: "Captures phone numbers from Maps listings. Detects WhatsApp links on business websites." },
  { icon: FileSpreadsheet,code:"04", title: "XLSX EXPORT",    desc: "Professionally formatted Excel with colored headers, alternating rows, auto-sized columns." },
  { icon: Globe,         code: "05", title: "GLOBAL COVERAGE",desc: "47+ countries. Search any neighborhood or city. Customizable radius from 1 to 50+ km." },
  { icon: Zap,           code: "06", title: "DUAL SOURCE",    desc: "Google Maps + open web combined. Directories, review sites, articles — 2x lead density." },
  { icon: BarChart3,     code: "07", title: "LEAD SCORING",   desc: "Ranked by data richness. Email + phone + WhatsApp = tier 1. Filter and sort intelligently." },
  { icon: Eye,           code: "08", title: "LIVE PREVIEW",   desc: "Results stream in real-time as they are found. No waiting — watch the table populate live." },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 sm:py-32 relative">
    <div className="absolute inset-0 border-t border-white/[0.04] pointer-events-none" />
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-16 flex items-end justify-between border-b border-white/[0.06] pb-8">
        <div>
          <div className="label-mono mb-3 text-white/25">// SYSTEM CAPABILITIES</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
            BUILT FOR SERIOUS<br />LEAD GENERATION
          </h2>
        </div>
        <div className="hidden md:block label-mono text-white/20 text-right">
          08 MODULES<br />ACTIVE
        </div>
      </div>

      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 border border-white/[0.06]">
        {features.map((f, idx) => (
          <div
            key={idx}
            className="p-5 border-r border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors animate-fade-in-up group"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <f.icon className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors" strokeWidth={1.5} />
              <span className="label-mono text-white/20">{f.code}</span>
            </div>
            <h3 className="font-mono-data text-xs font-bold text-white/80 mb-2 tracking-wider">{f.title}</h3>
            <p className="font-mono-data text-[11px] text-white/35 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
