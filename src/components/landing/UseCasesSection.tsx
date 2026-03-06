import { Briefcase, Building2, Users } from "lucide-react";
import { CheckCircle } from "lucide-react";

const cases = [
  {
    icon: Briefcase,
    title: "Freelancers",
    description: "Build cold email lists for new client prospects",
    benefits: [
      "Target niche markets instantly",
      "Export verified contact info",
      "Scale outreach campaigns",
    ],
  },
  {
    icon: Building2,
    title: "Agencies",
    description: "Generate fresh leads for your clients",
    benefits: [
      "Run bulk searches by category",
      "Deliver leads as retainer value",
      "Automate prospect research",
    ],
  },
  {
    icon: Users,
    title: "Sales Teams",
    description: "Fill your CRM with qualified prospects",
    benefits: [
      "Cut research time in half",
      "Get complete contact info",
      "Increase outreach velocity",
    ],
  },
];

const UseCasesSection = () => {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Built for Every Business
          </h2>
          <p className="text-lg text-slate-600">
            Whether you're a solo operator or a full team, GlobaLeads fits your workflow.
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {cases.map((c, idx) => (
            <div key={idx} className="card-lift p-8 flex flex-col gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 border border-blue-200">
                <c.icon className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {c.title}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {c.description}
                </p>
              </div>

              <ul className="space-y-3">
                {c.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
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
