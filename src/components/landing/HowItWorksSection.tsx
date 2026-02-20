const steps = [
  {
    number: "01",
    title: "Enter Your Search",
    description: 'Type a business keyword like "plumber" or "dentist" and a target location. Set your radius and max results.',
    detail: "Uses Google Places API under the hood",
  },
  {
    number: "02",
    title: "We Scan the Web",
    description: "The tool searches Google Maps for matching businesses, then visits each website to find email addresses and WhatsApp links.",
    detail: "Powered by Firecrawl — handles JS-rendered pages",
  },
  {
    number: "03",
    title: "Download Your Leads",
    description: "Get a clean, styled Excel file with business name, category, address, phone, email, and WhatsApp — ready for outreach.",
    detail: "Styled .xlsx with colored headers & auto-sized columns",
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

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.number} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent md:block" />
              )}

              <div className="text-center">
                {/* Step number circle */}
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-300 group-hover:shadow-primary/50 group-hover:scale-105">
                  <span className="text-2xl font-bold">{s.number}</span>
                  {/* Glow ring */}
                  <div className="absolute inset-0 rounded-2xl bg-primary opacity-0 group-hover:opacity-20 blur transition-opacity duration-300" />
                </div>

                <h3 className="mb-2 text-xl font-bold text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mb-3">{s.description}</p>
                <span className="inline-block rounded-full bg-accent/80 px-3 py-1 text-xs text-accent-foreground">
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
