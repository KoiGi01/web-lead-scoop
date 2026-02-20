import { Search, Mail, Phone, FileSpreadsheet, Globe, Zap, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "Google Maps Search",
    description: "Search any business type in any city worldwide. Powered by the Google Places API for accurate, up-to-date results.",
    badge: "Powered by Google",
  },
  {
    icon: Mail,
    title: "Email Extraction",
    description: "Automatically visits each business website and scans for email addresses — including contact pages.",
    badge: "Smart Scraping",
  },
  {
    icon: Phone,
    title: "Phone & WhatsApp",
    description: "Captures phone numbers from Google Maps listings and detects WhatsApp links on business websites.",
    badge: null,
  },
  {
    icon: FileSpreadsheet,
    title: "Styled XLSX Export",
    description: "Download a professionally formatted Excel file with colored headers, alternating rows, and auto-sized columns.",
    badge: "1-click",
  },
  {
    icon: Globe,
    title: "Any Location",
    description: "Works globally — target a neighborhood, city, or wider radius. Customizable search area from 1 to 50+ km.",
    badge: null,
  },
  {
    icon: Zap,
    title: "Multi-Source Search",
    description: "Combines Google Maps listings with web search results — directories, review sites, and 'best of' articles — for a more complete lead list.",
    badge: "More Leads",
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

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className="group relative overflow-hidden border border-border bg-card p-6 card-hover cursor-default"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]"
                style={{ background: "radial-gradient(circle at top left, hsl(252 87% 62% / 0.06), transparent 60%)" }}
              />

              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/30">
                    <f.icon className="h-5 w-5" />
                  </div>
                  {f.badge && (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
