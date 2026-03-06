import { Search, Globe, Download } from "lucide-react";

const steps = [
  { num: "01", icon: Search,   title: "ENTER SEARCH",    desc: "Type a business keyword and location. Set radius and max results. Hit execute." },
  { num: "02", icon: Globe,    title: "SYSTEM EXTRACTS", desc: "We scan Google Maps + the open web. Each site gets visited. Contacts are pulled automatically." },
  { num: "03", icon: Download, title: "DOWNLOAD OUTPUT", desc: "Get a clean Excel file with every field populated. Import into your CRM. Start outreach." },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-24 sm:py-32 border-t border-white/[0.04]">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-16 border-b border-white/[0.06] pb-8">
        <div className="label-mono mb-3 text-white/25">// OPERATION SEQUENCE</div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
          THREE STEPS<br />TO YOUR LEAD LIST
        </h2>
      </div>

      <div className="grid gap-0 md:grid-cols-3 border border-white/[0.06]">
        {steps.map((s, i) => (
          <div key={i} className={`p-8 flex flex-col gap-6 hover:bg-white/[0.02] transition-colors animate-fade-in-up ${i < steps.length - 1 ? "border-b md:border-b-0 md:border-r border-white/[0.06]" : ""}`} style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center justify-between">
              <span className="text-5xl font-black text-white/8 leading-none" style={{ fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.06)" }}>
                {s.num}
              </span>
              <div className="flex h-10 w-10 items-center justify-center border border-white/10">
                <s.icon className="h-4 w-4 text-white/40" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h3 className="font-mono-data text-xs font-bold text-white/80 tracking-widest mb-3">{s.title}</h3>
              <p className="font-mono-data text-[11px] text-white/35 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
