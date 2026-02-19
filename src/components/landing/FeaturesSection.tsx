import { Search, Mail, Phone, FileSpreadsheet, Globe, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "Google Maps Search",
    description: "Search any business type in any city worldwide. Powered by the Google Places API for accurate, up-to-date results.",
  },
  {
    icon: Mail,
    title: "Email Extraction",
    description: "Automatically visits each business website and scans for email addresses — including contact pages.",
  },
  {
    icon: Phone,
    title: "Phone & WhatsApp",
    description: "Captures phone numbers from Google Maps listings and detects WhatsApp links on websites.",
  },
  {
    icon: FileSpreadsheet,
    title: "Styled XLSX Export",
    description: "Download a professionally formatted Excel file with colored headers, alternating rows, and auto-sized columns.",
  },
  {
    icon: Globe,
    title: "Any Location",
    description: "Works globally — target a neighborhood, city, or wider radius. Customizable search area from 1 to 50+ km.",
  },
  {
    icon: Zap,
    title: "Fast & Automated",
    description: "No manual data entry. Click once and watch as the tool collects and organizes leads in real time.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Features</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything You Need to Build Your Lead List
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            From search to download, the entire pipeline runs automatically — no spreadsheet gymnastics required.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group relative overflow-hidden border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-card-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
