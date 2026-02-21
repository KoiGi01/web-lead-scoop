import {
  Search, Mail, Phone, FileSpreadsheet, Globe,
  Check, BarChart2, Eye, Cpu,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Google Maps Search",
    description: "Search any business type in any city worldwide. Powered by the Google Places API for accurate, up-to-date results.",
    badge: "Maps API",
    visual: (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F7931A]" style={{ boxShadow: "0 0 8px rgba(247,147,26,0.5)" }} />
        </div>
        <span className="font-mono-data text-[10px] font-bold text-[#F7931A] shrink-0">60 found</span>
      </div>
    ),
  },
  {
    icon: Mail,
    title: "Email Extraction",
    description: "Automatically visits each business website and scans for email addresses — including contact pages.",
    badge: "Smart Scraping",
    visual: (
      <div className="space-y-1">
        {["info@dental.com", "sales@clinic.io"].map((e) => (
          <div key={e} className="flex items-center gap-1.5 text-[10px] font-mono-data text-[#F7931A] rounded-lg px-2 py-1 w-fit border border-[#F7931A]/30 bg-[#F7931A]/10">
            <Mail className="h-2.5 w-2.5 flex-shrink-0" /> {e}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Phone,
    title: "Phone & WhatsApp",
    description: "Captures phone numbers from Google Maps listings and detects WhatsApp links on business websites.",
    badge: null,
    visual: (
      <div className="flex gap-2 flex-wrap">
        <span className="font-mono-data text-[10px] rounded-lg px-2 py-1 text-[#94A3B8] border border-white/10 bg-white/5">+1 (305) 555-0182</span>
        <span className="font-mono-data text-[10px] rounded-lg px-2 py-1 text-emerald-400 border border-emerald-400/30 bg-emerald-400/10">WhatsApp ✓</span>
      </div>
    ),
  },
  {
    icon: FileSpreadsheet,
    title: "Styled XLSX Export",
    description: "Download a professionally formatted Excel file with colored headers, alternating rows, and auto-sized columns.",
    badge: "1-click",
    visual: (
      <div className="rounded-lg overflow-hidden border border-white/10 text-[10px]">
        <div className="bg-gradient-to-r from-[#EA580C] to-[#F7931A] text-white flex divide-x divide-white/20">
          {["Name", "Email", "Phone"].map(h => <div key={h} className="px-2 py-1 font-mono-data font-bold">{h}</div>)}
        </div>
        <div className="bg-white/5 flex divide-x divide-white/10 text-[#94A3B8]">
          {["Dental Co", "info@…", "+1 305…"].map(c => <div key={c} className="px-2 py-1 font-mono-data">{c}</div>)}
        </div>
      </div>
    ),
  },
  {
    icon: Globe,
    title: "Any Location",
    description: "Works globally — target a neighborhood, city, or wider radius. Customizable search area from 1 to 50+ km.",
    badge: null,
    visual: (
      <div className="flex items-center gap-1.5 flex-wrap">
        {["Miami, FL", "London, UK", "Tokyo, JP"].map(l => (
          <span key={l} className="font-mono-data text-[10px] text-[#94A3B8] rounded-full px-2.5 py-1 border border-white/10 bg-white/5">{l}</span>
        ))}
      </div>
    ),
  },
  {
    icon: Cpu,
    title: "Multi-Source Search",
    description: "Combines Google Maps listings with web search results — directories, review sites, and 'best of' articles.",
    badge: "More Leads",
    visual: (
      <div className="flex items-center gap-1.5 text-xs font-mono-data font-semibold">
        <span className="rounded-lg px-2 py-1 text-[#94A3B8] border border-white/10 bg-white/5">Maps</span>
        <span className="text-white/30">+</span>
        <span className="rounded-lg px-2 py-1 text-[#94A3B8] border border-white/10 bg-white/5">Web</span>
        <span className="text-white/30">=</span>
        <span className="gradient-text font-bold">2× leads</span>
      </div>
    ),
  },
  {
    icon: BarChart2,
    title: "Lead Scoring",
    description: "Leads are ranked by data richness — email + phone + WhatsApp = top tier. Focus your outreach where it counts.",
    badge: "Smart",
    visual: (
      <div className="space-y-1.5">
        {[
          { pct: "100%" },
          { pct: "66%" },
          { pct: "33%" },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#EA580C] to-[#F7931A]"
                style={{ width: r.pct, opacity: 1 - i * 0.25 }}
              />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Eye,
    title: "Instant Preview",
    description: "Results appear in a live table as they're found — watch names, emails, and phones populate in real time.",
    badge: "Real-time",
    visual: (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="font-mono-data text-[10px] font-bold uppercase tracking-wider text-emerald-400">Live</span>
        <span className="font-mono-data text-[10px] text-[#94A3B8]">12/40 leads…</span>
      </div>
    ),
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="bg-[#030304] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <Check className="h-3 w-3 text-[#F7931A]" strokeWidth={2.5} />
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Full Specifications
            </span>
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Everything You Need to{" "}
            <span className="gradient-text">Build Your Lead List</span>
          </h2>
          <p className="mx-auto mt-5 text-lg text-[#94A3B8] leading-relaxed max-w-[55ch]">
            From search to download, the entire pipeline runs automatically — no spreadsheet gymnastics required.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl bg-[#0F1115] p-5 flex flex-col gap-4 card-lift"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#EA580C]/20 border border-[#EA580C]/40 transition-all duration-200 group-hover:shadow-[0_0_20px_rgba(234,88,12,0.3)]">
                  <f.icon className="h-5 w-5 text-[#F7931A]" strokeWidth={1.5} />
                </div>
                {f.badge && (
                  <span className="rounded-full px-2.5 py-0.5 font-mono-data text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] bg-white/5 border border-white/10">
                    {f.badge}
                  </span>
                )}
              </div>

              <div className="min-h-[36px]">{f.visual}</div>

              <div>
                <h3 className="mb-1.5 text-sm font-heading font-semibold text-white">
                  {f.title}
                </h3>
                <p className="text-xs leading-relaxed text-[#94A3B8]">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
