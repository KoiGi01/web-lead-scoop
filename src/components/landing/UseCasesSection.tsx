import { Briefcase, Building2, TrendingUp } from "lucide-react";

const cases = [
  {
    icon: Briefcase,
    title: "Freelancers & Consultants",
    subtitle: "Build pipelines in minutes, not days",
    bullets: [
      "Generate targeted cold email lists for any niche",
      "Research prospects for new client proposals",
      "Find local businesses that need your services",
      "Export contacts directly into your outreach tool",
    ],
  },
  {
    icon: Building2,
    title: "Marketing Agencies",
    subtitle: "Scale prospecting across multiple clients",
    bullets: [
      "Run bulk searches per city, category, or radius",
      "Deliver fresh lead lists as part of your retainer",
      "Find email contacts for local ad campaigns",
      "Automate what used to take your team hours",
    ],
  },
  {
    icon: TrendingUp,
    title: "Sales Teams",
    subtitle: "Fill your CRM without manual research",
    bullets: [
      "Find verified contacts for outbound sequences",
      "Target by business type, city, and proximity",
      "Get phone, email, and WhatsApp in one file",
      "Cut research costs and increase rep productivity",
    ],
  },
];

const Screws = () => (
  <>
    <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 65% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
    <span className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
    <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 65% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
  </>
);

const UseCasesSection = () => {
  return (
    <section className="relative bg-[#e0e5ec] py-24 sm:py-32 overflow-hidden">
      {/* Radial lighting hotspot */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{ boxShadow: "var(--shadow-recessed)" }}
          >
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a5568]">
              Use Cases
            </span>
          </div>
          <h2
            className="text-4xl font-bold tracking-tight text-[#2d3436] sm:text-5xl"
            style={{ textShadow: "0 1px 0 #ffffff" }}
          >
            Built for Every{" "}
            <span className="text-[#ff4757]">Growth Team</span>
          </h2>
          <p className="mt-5 text-lg text-[#4a5568] leading-relaxed max-w-[55ch] mx-auto">
            Whether you're a solo operator or a full agency, GlobaLeads22 fits your workflow.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cases.map((c) => (
            <div
              key={c.title}
              className="group relative rounded-2xl bg-[#e0e5ec] p-6 card-lift"
            >
              <Screws />

              {/* Icon housing */}
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
                style={{ boxShadow: "var(--shadow-floating)" }}
              >
                <c.icon className="h-5 w-5 text-[#ff4757]" strokeWidth={1.5} />
              </div>

              <h3 className="text-base font-bold text-[#2d3436] mb-1" style={{ textShadow: "0 1px 0 #ffffff" }}>
                {c.title}
              </h3>
              <p className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-[#4a5568] mb-5">
                {c.subtitle}
              </p>

              <ul className="space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-[#4a5568]">
                    <span
                      className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ff4757]"
                      style={{ boxShadow: "0 0 4px rgba(255,71,87,0.5)" }}
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
