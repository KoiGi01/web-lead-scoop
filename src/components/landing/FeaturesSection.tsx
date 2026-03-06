import { Search, Mail, Phone, FileSpreadsheet, Globe, Zap, BarChart3, Eye } from "lucide-react";

const features = [
  {
    icon: Search,
    color: "blue",
    title: "Google Maps Search",
    description: "Search any business type in any city worldwide. Powered by Google Places API for accurate, real-time results.",
  },
  {
    icon: Mail,
    color: "violet",
    title: "Email Extraction",
    description: "Automatically visits each business website and scans for email addresses — including contact and about pages.",
  },
  {
    icon: Phone,
    color: "green",
    title: "Phone & WhatsApp",
    description: "Captures phone numbers from listings and detects WhatsApp links on business sites for instant messaging.",
  },
  {
    icon: FileSpreadsheet,
    color: "orange",
    title: "Styled XLSX Export",
    description: "Download a professionally formatted Excel file with colored headers, alternating rows, and auto-sized columns.",
  },
  {
    icon: Globe,
    color: "blue",
    title: "Global Coverage",
    description: "Works in 47+ countries. Search any neighborhood, city, or wider region. Customizable from 1 to 50+ km.",
  },
  {
    icon: Zap,
    color: "violet",
    title: "Multi-Source Search",
    description: "Combines Google Maps with web search results — directories, review sites, and 'best of' articles for 2× leads.",
  },
  {
    icon: BarChart3,
    color: "green",
    title: "Lead Scoring",
    description: "Ranked by data richness — email + phone + WhatsApp = top tier. Focus your outreach where it converts.",
  },
  {
    icon: Eye,
    color: "orange",
    title: "Real-Time Preview",
    description: "Watch leads populate in the live table as they're found. No waiting — results stream in as they arrive.",
  },
];

const colorMap: Record<string, { icon: string; bg: string; border: string }> = {
  blue:   { icon: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100" },
  violet: { icon: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  green:  { icon: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-100" },
  orange: { icon: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 sm:py-32" style={{ background: "#F5F5F7" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[rgba(0,0,0,0.08)] px-3.5 py-1.5 mb-5 text-xs font-semibold text-[#6e6e73] tracking-wide shadow-sm">
            Everything included
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1d1d1f] mb-4 leading-tight">
            Built for serious<br />lead generation
          </h2>
          <p className="text-lg text-[#6e6e73] leading-relaxed">
            From search to download, the entire pipeline runs automatically. No spreadsheet gymnastics.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, idx) => {
            const c = colorMap[f.color];
            return (
              <div
                key={idx}
                className="card-lift p-6 flex flex-col gap-5 animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.bg} border ${c.border}`}>
                  <f.icon className={`h-5 w-5 ${c.icon}`} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1d1d1f] mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#6e6e73]">
                    {f.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
