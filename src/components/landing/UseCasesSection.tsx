import { Briefcase, Building2, TrendingUp } from "lucide-react";

const cases = [
  {
    icon: Briefcase, code: "TYPE_A",
    title: "FREELANCERS",
    sub: "Build pipelines fast",
    bullets: ["Targeted cold email lists for any niche", "Prospect research for proposals", "Find locals who need your services", "Export directly to outreach tools"],
  },
  {
    icon: Building2, code: "TYPE_B",
    title: "AGENCIES",
    sub: "Scale across clients",
    bullets: ["Bulk searches per city or category", "Lead lists as retainer deliverables", "Email contacts for local ad campaigns", "Automate hours of manual research"],
  },
  {
    icon: TrendingUp, code: "TYPE_C",
    title: "SALES TEAMS",
    sub: "Fill your CRM",
    bullets: ["Verified contacts for outbound sequences", "Target by type, city, proximity", "Phone + email + WhatsApp in one file", "Cut research time, increase rep output"],
  },
];

const UseCasesSection = () => (
  <section className="py-24 sm:py-32 border-t border-petrol-900/[0.06] bg-white">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-16 flex items-end justify-between border-b border-petrol-900/[0.08] pb-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25 mb-3">// TARGET PROFILES</div>
          <h2
            className="text-3xl sm:text-4xl font-black text-petrol-900 tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            BUILT FOR EVERY<br />GROWTH OPERATOR
          </h2>
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-3 border border-petrol-900/[0.08]">
        {cases.map((c, i) => (
          <div
            key={i}
            className={`p-7 bg-white flex flex-col gap-5 hover:bg-cream-50 transition-colors animate-fade-in-up ${i < cases.length - 1 ? "border-b md:border-b-0 md:border-r border-petrol-900/[0.08]" : ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center border border-petrol-900/[0.10] bg-wine-700/10">
                <c.icon className="h-4 w-4 text-wine-700" strokeWidth={1.5} />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">{c.code}</span>
            </div>
            <div>
              <h3 className="font-mono text-xs font-bold text-petrol-900 tracking-widest mb-1">{c.title}</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-cream-700">{c.sub}</p>
            </div>
            <ul className="space-y-2 border-t border-petrol-900/[0.06] pt-4">
              {c.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2 font-mono text-[11px] text-petrol-700/70">
                  <span className="text-wine-700/50 mt-0.5 flex-shrink-0">—</span>
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

export default UseCasesSection;
