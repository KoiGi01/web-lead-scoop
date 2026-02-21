import {
  Search, Mail, Phone, FileSpreadsheet, Globe,
  Check, Star, BarChart2, Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "Google Maps Search",
    description: "Search any business type in any city worldwide. Powered by the Google Places API for accurate, up-to-date results.",
    badge: "Powered by Google",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    visual: (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex-1 h-2 rounded-full bg-blue-500/20 overflow-hidden">
          <div className="h-full w-3/4 rounded-full bg-blue-500/60 animate-pulse" />
        </div>
        <span className="text-blue-400 font-medium shrink-0">60 found</span>
      </div>
    ),
  },
  {
    icon: Mail,
    title: "Email Extraction",
    description: "Automatically visits each business website and scans for email addresses — including contact pages.",
    badge: "Smart Scraping",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    visual: (
      <div className="space-y-1">
        {["info@dental.com", "sales@co.io"].map((e) => (
          <div key={e} className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 rounded px-2 py-0.5 w-fit">
            <Mail className="h-2.5 w-2.5" /> {e}
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
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    visual: (
      <div className="flex gap-2">
        <span className="text-xs bg-emerald-500/10 text-emerald-400 rounded px-2 py-0.5">+1 (305) 555-0182</span>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 rounded px-2 py-0.5">WhatsApp ✓</span>
      </div>
    ),
  },
  {
    icon: FileSpreadsheet,
    title: "Styled XLSX Export",
    description: "Download a professionally formatted Excel file with colored headers, alternating rows, and auto-sized columns.",
    badge: "1-click",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    visual: (
      <div className="rounded overflow-hidden border border-amber-500/20 text-[10px]">
        <div className="bg-amber-500/20 text-amber-300 flex divide-x divide-amber-500/20">
          {["Name", "Email", "Phone"].map(h => <div key={h} className="px-2 py-0.5 font-semibold">{h}</div>)}
        </div>
        <div className="bg-card flex divide-x divide-border text-muted-foreground">
          {["Dental Co", "info@…", "+1 305…"].map(c => <div key={c} className="px-2 py-0.5">{c}</div>)}
        </div>
      </div>
    ),
  },
  {
    icon: Globe,
    title: "Any Location",
    description: "Works globally — target a neighborhood, city, or wider radius. Customizable search area from 1 to 50+ km.",
    badge: null,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    visual: (
      <div className="flex items-center gap-2 flex-wrap">
        {["Miami, FL", "London, UK", "Tokyo, JP"].map(l => (
          <span key={l} className="text-xs bg-cyan-500/10 text-cyan-400 rounded-full px-2 py-0.5">{l}</span>
        ))}
      </div>
    ),
  },
  {
    icon: Globe,
    title: "Multi-Source Search",
    description: "Combines Google Maps listings with web search results — directories, review sites, and 'best of' articles — for a more complete lead list.",
    badge: "More Leads",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    visual: (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="bg-indigo-500/10 text-indigo-400 rounded px-1.5 py-0.5">Maps</span>
        <span className="text-muted-foreground/40">+</span>
        <span className="bg-indigo-500/10 text-indigo-400 rounded px-1.5 py-0.5">Web</span>
        <span className="text-muted-foreground/40">=</span>
        <span className="text-indigo-400 font-semibold">2× leads</span>
      </div>
    ),
  },
  {
    icon: BarChart2,
    title: "Lead Scoring",
    description: "Leads are ranked by data richness — email + phone + WhatsApp = top tier. Focus your outreach where it counts.",
    badge: "Smart",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    visual: (
      <div className="space-y-1">
        {[
          { label: "Email + Phone + WA", pct: "w-full", color: "bg-rose-500" },
          { label: "Email + Phone", pct: "w-2/3", color: "bg-rose-400/60" },
          { label: "Phone only", pct: "w-1/3", color: "bg-rose-300/40" },
        ].map(r => (
          <div key={r.label} className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className={`h-1.5 rounded-full ${r.color} ${r.pct}`} />
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
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    visual: (
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-teal-400">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          Live
        </span>
        <span className="text-muted-foreground">12/40 leads found…</span>
      </div>
    ),
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
            <Check className="h-3.5 w-3.5" /> Everything Included
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Everything You Need to{" "}
            <span className="gradient-text">Build Your Lead List</span>
          </h2>
          <p className="mx-auto mt-5 text-lg text-muted-foreground leading-relaxed">
            From search to download, the entire pipeline runs automatically — no spreadsheet gymnastics required.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className="group relative overflow-hidden border border-border bg-card p-5 card-hover cursor-default flex flex-col gap-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"
                style={{ background: "radial-gradient(circle at top left, hsl(252 87% 62% / 0.05), transparent 60%)" }}
              />
              {/* Top color stripe */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${f.bg.replace('/10', '/50')} opacity-0 group-hover:opacity-100 transition-opacity`} />

              <div className="relative flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} ${f.color} transition-all duration-300 group-hover:scale-110`}>
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                {f.badge && (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {f.badge}
                  </span>
                )}
              </div>

              {/* Mini visual demo */}
              <div className="relative min-h-[36px]">{f.visual}</div>

              <div className="relative">
                <h3 className="mb-1.5 text-sm font-semibold text-card-foreground">{f.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
