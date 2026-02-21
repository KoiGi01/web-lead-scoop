import { Search, Globe, FileDown } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Enter Your Search",
    description: 'Type a business keyword like "plumber" or "dentist" and a target location. Set your radius and max results.',
    detail: "Uses Google Places API under the hood",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    number: "02",
    icon: Globe,
    title: "We Scan the Web",
    description: "The tool searches Google Maps and the open web for matching businesses, then visits each website to find email addresses and WhatsApp links.",
    detail: "Powered by Firecrawl — handles JS-rendered pages",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    number: "03",
    icon: FileDown,
    title: "Download Your Leads",
    description: "Get a clean, styled Excel file with business name, category, address, phone, email, and WhatsApp — ready for outreach.",
    detail: "Styled .xlsx with colored headers & auto-sized columns",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative bg-secondary/40 py-24 sm:py-32 overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4">
        <div className="mb-16 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
            Simple Process
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Three Steps to{" "}
            <span className="gradient-text">Qualified Leads</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.number} className="relative group">
              {/* Animated dashed connector */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-px w-1/2 translate-x-full md:block overflow-hidden">
                  <div
                    className="h-full w-full border-t-2 border-dashed border-primary/30 animate-pulse"
                    style={{ animationDelay: `${i * 300}ms` }}
                  />
                </div>
              )}

              <div className={`rounded-2xl border ${s.border} bg-card p-6 h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary/10`}>
                {/* Step header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg} ${s.color} transition-transform duration-300 group-hover:scale-105`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-3xl font-black ${s.color} opacity-30`}>{s.number}</span>
                </div>

                <h3 className="mb-2 text-lg font-bold text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mb-4">{s.description}</p>
                <span className={`inline-block rounded-full ${s.bg} px-3 py-1 text-xs font-medium ${s.color}`}>
                  {s.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
