import {
  Search, Mail, Phone, FileSpreadsheet, Globe,
  Check, BarChart2, Eye, Cpu,
} from "lucide-react";

/* Corner screws — reused across cards */
const Screws = () => (
  <>
    <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, rgba(0,0,0,0.05) 5px, transparent 6px)" }} />
    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 65% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, rgba(0,0,0,0.05) 5px, transparent 6px)" }} />
    <span className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, rgba(0,0,0,0.05) 5px, transparent 6px)" }} />
    <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 65% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, rgba(0,0,0,0.05) 5px, transparent 6px)" }} />
  </>
);

/* Vent slots */
const Vents = () => (
  <div className="flex gap-1">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-5 w-[3px] rounded-full" style={{ background: "#d1d9e6", boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.12)" }} />
    ))}
  </div>
);

const features = [
  {
    icon: Search,
    title: "Google Maps Search",
    description: "Search any business type in any city worldwide. Powered by the Google Places API for accurate, up-to-date results.",
    badge: "Maps API",
    visual: (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ boxShadow: "var(--shadow-recessed)" }}>
          <div className="h-full w-3/4 rounded-full bg-[#ff4757] transition-all" style={{ boxShadow: "0 0 6px rgba(255,71,87,0.5)" }} />
        </div>
        <span className="font-mono-data text-[10px] font-bold text-[#ff4757] shrink-0">60 found</span>
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
          <div key={e} className="flex items-center gap-1.5 text-[10px] font-mono-data text-[#ff4757] rounded px-2 py-0.5 w-fit" style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.15)" }}>
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
        <span className="font-mono-data text-[10px] rounded px-2 py-0.5 text-[#4a5568]" style={{ boxShadow: "var(--shadow-recessed)" }}>+1 (305) 555-0182</span>
        <span className="font-mono-data text-[10px] rounded px-2 py-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200">WhatsApp ✓</span>
      </div>
    ),
  },
  {
    icon: FileSpreadsheet,
    title: "Styled XLSX Export",
    description: "Download a professionally formatted Excel file with colored headers, alternating rows, and auto-sized columns.",
    badge: "1-click",
    visual: (
      <div className="rounded-md overflow-hidden border border-[#babecc] text-[10px]" style={{ boxShadow: "var(--shadow-recessed)" }}>
        <div className="bg-[#ff4757] text-white flex divide-x divide-white/20">
          {["Name", "Email", "Phone"].map(h => <div key={h} className="px-2 py-0.5 font-mono-data font-bold">{h}</div>)}
        </div>
        <div className="bg-[#f0f2f5] flex divide-x divide-[#babecc] text-[#4a5568]">
          {["Dental Co", "info@…", "+1 305…"].map(c => <div key={c} className="px-2 py-0.5 font-mono-data">{c}</div>)}
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
          <span key={l} className="font-mono-data text-[10px] text-[#4a5568] rounded-full px-2 py-0.5" style={{ boxShadow: "var(--shadow-recessed)" }}>{l}</span>
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
        <span className="rounded px-1.5 py-0.5 text-[#4a5568]" style={{ boxShadow: "var(--shadow-recessed)" }}>Maps</span>
        <span className="text-[#babecc]">+</span>
        <span className="rounded px-1.5 py-0.5 text-[#4a5568]" style={{ boxShadow: "var(--shadow-recessed)" }}>Web</span>
        <span className="text-[#babecc]">=</span>
        <span className="text-[#ff4757]">2× leads</span>
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
          { pct: "100%", label: "Email + Phone + WA" },
          { pct: "66%",  label: "Email + Phone" },
          { pct: "33%",  label: "Phone only" },
        ].map((r, i) => (
          <div key={r.label} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ boxShadow: "var(--shadow-recessed)" }}>
              <div
                className="h-full rounded-full bg-[#ff4757] transition-all"
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
        <div className="h-2 w-2 led-green flex-shrink-0" />
        <span className="font-mono-data text-[10px] font-bold uppercase tracking-wider text-emerald-700">Live</span>
        <span className="font-mono-data text-[10px] text-[#4a5568]">12/40 leads…</span>
      </div>
    ),
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="bg-[#e0e5ec] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{ boxShadow: "var(--shadow-recessed)" }}
          >
            <Check className="h-3 w-3 text-[#ff4757]" strokeWidth={2.5} />
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a5568]">
              Full Specifications
            </span>
          </div>
          <h2
            className="text-4xl font-bold tracking-tight text-[#2d3436] sm:text-5xl"
            style={{ textShadow: "0 1px 0 #ffffff" }}
          >
            Everything You Need to{" "}
            <span className="text-[#ff4757]">Build Your Lead List</span>
          </h2>
          <p className="mx-auto mt-5 text-lg text-[#4a5568] leading-relaxed max-w-[55ch]">
            From search to download, the entire pipeline runs automatically — no spreadsheet gymnastics required.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl bg-[#e0e5ec] p-5 cursor-default card-lift flex flex-col gap-4"
            >
              <Screws />

              {/* Top-right vents */}
              <div className="absolute top-3 right-7">
                <Vents />
              </div>

              {/* Icon + badge row */}
              <div className="flex items-center justify-between">
                {/* Icon housing */}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-105"
                  style={{ boxShadow: "var(--shadow-floating)" }}
                >
                  <f.icon className="h-5 w-5 text-[#ff4757]" strokeWidth={1.5} />
                </div>
                {f.badge && (
                  <span
                    className="rounded-full px-2.5 py-0.5 font-mono-data text-[9px] font-bold uppercase tracking-wider text-[#4a5568]"
                    style={{ boxShadow: "var(--shadow-recessed)" }}
                  >
                    {f.badge}
                  </span>
                )}
              </div>

              {/* Mini visual */}
              <div className="min-h-[36px]">{f.visual}</div>

              {/* Text */}
              <div>
                <h3 className="mb-1.5 text-sm font-bold text-[#2d3436]" style={{ textShadow: "0 1px 0 #ffffff" }}>
                  {f.title}
                </h3>
                <p className="text-xs leading-relaxed text-[#4a5568]">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
