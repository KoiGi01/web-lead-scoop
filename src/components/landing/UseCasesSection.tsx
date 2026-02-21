import { Briefcase, Building2, TrendingUp } from "lucide-react";

const cases = [
    {
        icon: Briefcase,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
        border: "border-violet-500/20",
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
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
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
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
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
        <section className="relative bg-background py-24 sm:py-32 overflow-hidden">
            {/* Background blob */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

            <div className="relative mx-auto max-w-6xl px-4">
                <div className="mb-16 text-center max-w-2xl mx-auto">
                    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
                        Who It's For
                    </p>
                    <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        Built for Every{" "}
                        <span className="gradient-text">Growth Team</span>
                    </h2>
                    <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
                        Whether you're a solo operator or a full agency, GlobaLeads22 fits your workflow.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {cases.map((c) => (
                        <div
                            key={c.title}
                            className={`group relative rounded-2xl border ${c.border} bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10`}
                        >
                            {/* Top accent line */}
                            <div className={`absolute top-0 left-6 right-6 h-0.5 rounded-full ${c.bg.replace('/10', '/40')} opacity-0 group-hover:opacity-100 transition-opacity`} />

                            <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${c.bg} ${c.color}`}>
                                <c.icon className="h-5 w-5" />
                            </div>

                            <h3 className="text-lg font-bold text-foreground mb-1">{c.title}</h3>
                            <p className="text-sm text-muted-foreground mb-5">{c.subtitle}</p>

                            <ul className="space-y-2.5">
                                {c.bullets.map((b) => (
                                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${c.color.replace('text-', 'bg-')}`} />
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
