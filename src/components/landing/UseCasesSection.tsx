import { Briefcase, Building2, TrendingUp } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

const cases = [
  {
    icon: Briefcase,
    color: "blue",
    title: "Freelancers & Consultants",
    description: "Build pipelines in minutes, not days",
    bullets: [
      "Generate targeted cold email lists for any niche",
      "Research prospects for new client proposals",
      "Find local businesses that need your services",
      "Export contacts directly into your outreach tool",
    ],
  },
  {
    icon: Building2,
    color: "violet",
    title: "Marketing Agencies",
    description: "Scale prospecting across multiple clients",
    bullets: [
      "Run bulk searches per city, category, or radius",
      "Deliver fresh lead lists as part of your retainer",
      "Find email contacts for local ad campaigns",
      "Automate what used to take your team hours",
    ],
  },
  {
    icon: TrendingUp,
    color: "green",
    title: "Sales Teams",
    description: "Fill your CRM without manual research",
    bullets: [
      "Find verified contacts for outbound sequences",
      "Target by business type, city, and proximity",
      "Get phone, email, and WhatsApp in one file",
      "Cut research costs and increase rep productivity",
    ],
  },
];

const colorMap: Record<string, { icon: string; bg: string; border: string; check: string }> = {
  blue:   { icon: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",   check: "text-blue-600" },
  violet: { icon: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", check: "text-violet-600" },
  green:  { icon: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-100",check: "text-emerald-600" },
};

const UseCasesSection = () => {
  return (
    <section className="py-24 sm:py-32" style={{ background: "#F5F5F7" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[rgba(0,0,0,0.08)] px-3.5 py-1.5 mb-5 text-xs font-semibold text-[#6e6e73] tracking-wide shadow-sm">
            Use cases
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1d1d1f] mb-4 leading-tight">
            Built for every<br />growth team
          </h2>
          <p className="text-lg text-[#6e6e73] leading-relaxed">
            Whether you're a solo operator or a full agency, GlobaLeads fits your workflow.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cases.map((c, idx) => {
            const col = colorMap[c.color];
            return (
              <div
                key={idx}
                className="card-lift p-7 flex flex-col gap-5 animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${col.bg} border ${col.border}`}>
                  <c.icon className={`h-6 w-6 ${col.icon}`} strokeWidth={1.8} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#1d1d1f] mb-1">{c.title}</h3>
                  <p className="text-xs font-medium text-[#6e6e73] tracking-wide">{c.description}</p>
                </div>

                <ul className="space-y-2.5 border-t border-[rgba(0,0,0,0.05)] pt-4">
                  {c.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#3d3d3f]">
                      <CheckCircle2 className={`h-4 w-4 ${col.check} flex-shrink-0 mt-0.5`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
