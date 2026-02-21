import { Star, Quote } from "lucide-react";
import { Card } from "@/components/ui/card";

const marqueeItems = [
    "B2B Freelancer", "Cold Email Pro", "Marketing Agency", "Sales Team",
    "Local SEO Expert", "Lead Gen Specialist", "Outreach Consultant", "Growth Hacker",
    "B2B Freelancer", "Cold Email Pro", "Marketing Agency", "Sales Team",
    "Local SEO Expert", "Lead Gen Specialist", "Outreach Consultant", "Growth Hacker",
];

const testimonials = [
    {
        quote: "I was manually building lead lists for hours. GlobaLeads22 cut that to 10 minutes. It paid for itself on the first client.",
        name: "Alex M.",
        role: "B2B Sales Freelancer",
        initials: "AM",
        color: "#6366f1",
        stars: 5,
    },
    {
        quote: "The email extraction is surprisingly accurate. We run campaigns for local restaurants and GlobaLeads22 saves us days of research every week.",
        name: "Sarah K.",
        role: "Marketing Agency Owner",
        initials: "SK",
        color: "#ec4899",
        stars: 5,
    },
    {
        quote: "Finally a tool that just works. Search, wait 2 minutes, download your Excel. The WhatsApp feature alone is worth the subscription.",
        name: "James T.",
        role: "Cold Email Consultant",
        initials: "JT",
        color: "#f59e0b",
        stars: 5,
    },
];

const TestimonialsSection = () => {
    return (
        <section className="bg-background py-24 sm:py-32 overflow-hidden">
            <div className="mx-auto max-w-5xl px-4">
                <div className="mb-12 text-center">
                    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
                        <Star className="h-3.5 w-3.5 fill-current" /> Wall of Love
                    </p>
                    <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        What Our Users Say
                    </h2>
                </div>

                {/* Scrolling marquee */}
                <div className="relative mb-12 overflow-hidden">
                    {/* Left fade */}
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-background to-transparent" />
                    {/* Right fade */}
                    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-background to-transparent" />

                    <div className="flex gap-3 animate-marquee whitespace-nowrap">
                        {marqueeItems.map((item, i) => (
                            <span
                                key={i}
                                className="inline-flex shrink-0 items-center rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground"
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {testimonials.map((t, i) => (
                        <Card
                            key={t.name}
                            className="relative flex flex-col justify-between border border-border bg-card p-6 card-hover"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <Quote className="absolute top-5 right-5 h-8 w-8 text-primary/10" />

                            <div className="space-y-4">
                                <div className="flex gap-0.5">
                                    {[...Array(t.stars)].map((_, i) => (
                                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-sm leading-relaxed text-muted-foreground relative z-10">
                                    "{t.quote}"
                                </p>
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                <div
                                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
                                    style={{ background: t.color }}
                                >
                                    {t.initials}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                                    <p className="text-xs text-muted-foreground">{t.role}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
