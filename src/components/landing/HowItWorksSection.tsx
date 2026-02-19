const steps = [
  {
    number: "01",
    title: "Enter Your Search",
    description: "Type a business keyword like \"plumber\" or \"dentist\" and a location such as \"Miami, FL\". Set your radius and max results.",
  },
  {
    number: "02",
    title: "We Scan the Web",
    description: "The tool searches Google Maps for matching businesses, then visits each website to find email addresses and WhatsApp links.",
  },
  {
    number: "03",
    title: "Download Your Leads",
    description: "Get a clean, styled Excel file with business name, category, address, phone, email, and WhatsApp — ready for outreach.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="bg-secondary/50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">How It Works</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three Steps to Qualified Leads
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.number} className="relative text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-primary/40 to-primary/10 md:block" />
              )}
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <span className="text-2xl font-bold">{s.number}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
