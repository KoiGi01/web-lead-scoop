import { Search, Globe, Download } from "lucide-react";

const steps = [
  { num: "01", icon: Search,   title: "ENTER SEARCH",    desc: "Type a business keyword and location. Set radius and max results. Hit execute." },
  { num: "02", icon: Globe,    title: "SYSTEM EXTRACTS", desc: "We scan Google Maps + the open web. Each site gets visited. Contacts are pulled automatically." },
  { num: "03", icon: Download, title: "DOWNLOAD OUTPUT", desc: "Get a clean Excel file with every field populated. Import into your CRM. Start outreach." },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-24 sm:py-32 border-t border-petrol-900/[0.06] bg-cream-50">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-16 border-b border-petrol-900/[0.08] pb-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25 mb-3">// OPERATION SEQUENCE</div>
        <h2
          className="text-3xl sm:text-4xl font-black text-petrol-900 tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          THREE STEPS<br />TO YOUR LEAD LIST
        </h2>
      </div>

      <div className="grid gap-0 md:grid-cols-3 border border-petrol-900/[0.08]">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`p-8 bg-white flex flex-col gap-6 hover:bg-cream-50 transition-colors animate-fade-in-up ${i < steps.length - 1 ? "border-b md:border-b-0 md:border-r border-petrol-900/[0.08]" : ""}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-5xl font-black leading-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: "rgba(0,39,43,0.05)" }}
              >
                {s.num}
              </span>
              <div className="flex h-10 w-10 items-center justify-center border border-petrol-900/[0.10] bg-wine-700/10">
                <s.icon className="h-4 w-4 text-wine-700" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h3 className="font-mono text-xs font-bold text-petrol-900 tracking-widest mb-3">{s.title}</h3>
              <p className="font-mono text-[11px] text-petrol-700/70 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
