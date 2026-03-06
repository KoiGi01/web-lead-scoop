import { Search, Globe, Download } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Enter your search",
    description: 'Type a business keyword like "dentist" or "plumber", pick a location, and set your radius. Hit search.',
    detail: "Powered by Google Places API",
  },
  {
    number: "02",
    icon: Globe,
    title: "We extract the data",
    description: "Our system scans Google Maps and the open web, then visits each business website to find emails, phones, and WhatsApp links.",
    detail: "Firecrawl handles JS-rendered pages",
  },
  {
    number: "03",
    icon: Download,
    title: "Download and outreach",
    description: "Get a clean, styled Excel file with every contact detail — ready to import into your CRM or outreach tool.",
    detail: "Styled .xlsx with auto-sized columns",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F7] border border-[rgba(0,0,0,0.08)] px-3.5 py-1.5 mb-5 text-xs font-semibold text-[#6e6e73] tracking-wide">
            Simple process
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1d1d1f] mb-4 leading-tight">
            Three steps to<br />your lead list
          </h2>
        </div>

        {/* Steps */}
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.number} className="relative">
              <div className="card-lift p-7 h-full flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                {/* Step indicator */}
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-blue-100 leading-none">{s.number}</span>
                  <div className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-100">
                    <s.icon className="h-5 w-5 text-blue-600" strokeWidth={1.8} />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#1d1d1f] mb-2">{s.title}</h3>
                  <p className="text-sm text-[#6e6e73] leading-relaxed mb-4">{s.description}</p>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F7] border border-[rgba(0,0,0,0.06)] px-3 py-1">
                    <span className="text-[10px] font-medium text-[#6e6e73] tracking-wide">{s.detail}</span>
                  </div>
                </div>
              </div>

              {/* Connector arrow */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-10 text-[#C7C7CC] text-xl font-thin">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
