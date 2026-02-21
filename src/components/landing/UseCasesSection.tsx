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

const UseCasesSection = () => {
  return (
    <section className="relative bg-[#030304] py-24 sm:py-32 overflow-hidden">
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-white opacity-[0.02] blur-[80px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Use Cases
            </span>
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Built for Every{" "}
            <span className="gradient-text">Growth Team</span>
          </h2>
          <p className="mt-5 text-lg text-[#94A3B8] leading-relaxed max-w-[55ch] mx-auto">
            Whether you're a solo operator or a full agency, GlobaLeads22 fits your workflow.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cases.map((c) => (
            <div
              key={c.title}
              className="group relative rounded-2xl bg-[#0F1115] p-6 card-lift"
            >
              {/* Icon housing */}
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#EA580C]/20 border border-[#EA580C]/40 transition-all duration-200 group-hover:shadow-[0_0_20px_rgba(234,88,12,0.3)]">
                <c.icon className="h-5 w-5 text-[#F7931A]" strokeWidth={1.5} />
              </div>

              <h3 className="text-base font-heading font-semibold text-white mb-1">
                {c.title}
              </h3>
              <p className="font-mono-data text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-5">
                {c.subtitle}
              </p>

              <ul className="space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-[#94A3B8]">
                    <span
                      className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#F7931A]"
                      style={{ boxShadow: "0 0 6px rgba(247,147,26,0.5)" }}
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
