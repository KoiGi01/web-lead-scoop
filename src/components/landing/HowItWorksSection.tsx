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

/* Pipe connector between steps */
const Pipe = () => (
  <div className="hidden md:flex items-center flex-1 px-3">
    <div
      className="h-3 w-full rounded-full relative overflow-hidden"
      style={{
        background: "#d1d9e6",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15), inset 0 -1px 0 rgba(255,255,255,0.5)",
      }}
    >
      {/* Pipe highlight */}
      <div className="absolute top-0.5 left-2 right-2 h-1 rounded-full bg-white/40" />
      {/* Flowing indicator */}
      <div className="absolute inset-y-1 left-0 w-8 rounded-full bg-[#ff4757]/30 animate-pulse" />
    </div>
  </div>
);

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative bg-[#e0e5ec] py-24 sm:py-32 overflow-hidden">
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#a3b1c6 1px, transparent 1px), linear-gradient(90deg, #a3b1c6 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.08,
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{ boxShadow: "var(--shadow-recessed)" }}
          >
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a5568]">
              Operation Manual
            </span>
          </div>
          <h2
            className="text-4xl font-bold tracking-tight text-[#2d3436] sm:text-5xl"
            style={{ textShadow: "0 1px 0 #ffffff" }}
          >
            Three Steps to{" "}
            <span className="text-[#ff4757]">Qualified Leads</span>
          </h2>
        </div>

        {/* Steps — desktop: horizontal with pipe connectors */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {steps.map((s, i) => (
            <>
              {/* Card */}
              <div key={s.number} className="group relative flex-1 rounded-2xl bg-[#e0e5ec] p-6 card-lift">
                {/* Corner screws */}
                <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 65% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
                <span className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
                <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 65% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />

                {/* Step header */}
                <div className="flex items-center gap-3 mb-5">
                  {/* Step number badge */}
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full font-mono-data text-base font-bold text-[#ff4757]"
                    style={{ boxShadow: "var(--shadow-floating)", border: "2px solid rgba(255,71,87,0.25)" }}
                  >
                    {s.number}
                  </div>
                  {/* Icon housing */}
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
                    style={{ boxShadow: "var(--shadow-recessed)" }}
                  >
                    <s.icon className="h-4.5 w-4.5 text-[#4a5568]" strokeWidth={1.5} />
                  </div>
                </div>

                <h3 className="mb-2 text-base font-bold text-[#2d3436]" style={{ textShadow: "0 1px 0 #ffffff" }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#4a5568] mb-4">{s.description}</p>

                <span
                  className="inline-block rounded-full px-3 py-1 font-mono-data text-[9px] font-bold uppercase tracking-widest text-[#4a5568]"
                  style={{ boxShadow: "var(--shadow-recessed)" }}
                >
                  {s.detail}
                </span>
              </div>

              {/* Pipe connector */}
              {i < steps.length - 1 && <Pipe key={`pipe-${i}`} />}
            </>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
