import { Search, Globe, FileDown } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Enter Your Search",
    description: 'Type a business keyword like "plumber" or "dentist" and a target location. Set your radius and max results.',
    detail: "Uses Google Places API under the hood",
  },
  {
    number: "02",
    icon: Globe,
    title: "We Scan the Web",
    description: "The tool searches Google Maps and the open web for matching businesses, then visits each website to find email addresses and WhatsApp links.",
    detail: "Powered by Firecrawl — handles JS-rendered pages",
  },
  {
    number: "03",
    icon: FileDown,
    title: "Download Your Leads",
    description: "Get a clean, styled Excel file with business name, category, address, phone, email, and WhatsApp — ready for outreach.",
    detail: "Styled .xlsx with colored headers & auto-sized columns",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative bg-[#0F1115] py-24 sm:py-32 overflow-hidden">

      {/* Ambient background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-[#F7931A] opacity-[0.04] blur-[80px] pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Operation Manual
            </span>
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Three Steps to{" "}
            <span className="gradient-text">Qualified Leads</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
          {steps.map((s, i) => (
            <div key={s.number} className="group relative flex-1 rounded-2xl bg-[#030304] p-6 card-lift overflow-hidden">
              {/* Corner border accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#F7931A]/40 rounded-tl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#F7931A]/40 rounded-br-2xl" />

              {/* Step number */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#F7931A]/40 bg-[#F7931A]/10 font-mono-data text-base font-bold text-[#F7931A]">
                  {s.number}
                </div>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10 transition-all duration-200 group-hover:border-[#F7931A]/30 group-hover:bg-[#F7931A]/10">
                  <s.icon className="h-4 w-4 text-[#94A3B8] group-hover:text-[#F7931A] transition-colors" strokeWidth={1.5} />
                </div>
              </div>

              <h3 className="mb-2 text-base font-heading font-semibold text-white">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#94A3B8] mb-4">{s.description}</p>

              <span className="inline-block rounded-full px-3 py-1 font-mono-data text-[9px] font-bold uppercase tracking-widest text-[#94A3B8] border border-white/10 bg-white/5">
                {s.detail}
              </span>

              {/* Step connector arrow (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[#F7931A]/40 text-lg font-bold">
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
