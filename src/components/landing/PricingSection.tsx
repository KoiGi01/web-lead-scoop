import { Check, Zap, Building2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const plans = [
    {
        name: "Free Trial",
        price: "$0",
        period: "",
        description: "Try it risk-free. No card needed.",
        icon: Zap,
        features: [
            "1 search (up to 20 leads)",
            "Email & WhatsApp extraction",
            "XLSX export",
            "Google Maps data",
        ],
        cta: "Get Started Free",
        highlight: false,
        badge: null,
    },
    {
        name: "Starter",
        price: "$19",
        period: "/month",
        description: "Perfect for freelancers and small outreach teams.",
        icon: Building2,
        features: [
            "40 searches per month",
            "Up to 2,400 leads/mo",
            "Email & WhatsApp extraction",
            "Styled XLSX export",
            "Email support",
        ],
        cta: "Start Starter Plan",
        highlight: false,
        badge: null,
    },
    {
        name: "Pro",
        price: "$49",
        period: "/month",
        description: "For growing agencies and power users.",
        icon: Crown,
        features: [
            "150 searches per month",
            "Up to 9,000 leads/mo",
            "Email & WhatsApp extraction",
            "Styled XLSX export",
            "Priority support",
            "Bulk export",
        ],
        cta: "Start Pro Plan",
        highlight: true,
        badge: "Most Popular",
    },
];

interface PricingSectionProps {
    onGetStarted: () => void;
}

const PricingSection = ({ onGetStarted }: PricingSectionProps) => {
    return (
        <section id="pricing" className="bg-background py-24 sm:py-32">
            <div className="mx-auto max-w-5xl px-4">
                <div className="mb-16 text-center">
                    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
                        Simple Pricing
                    </p>
                    <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        Start Free, Scale When{" "}
                        <span className="gradient-text">You're Ready</span>
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                        No surprises. Cancel anytime. Every plan includes the full extraction pipeline.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`relative flex flex-col overflow-hidden border transition-all duration-300 ${plan.highlight
                                    ? "border-primary shadow-2xl shadow-primary/20 scale-[1.02] gradient-border"
                                    : "border-border hover:border-primary/30 hover:shadow-lg"
                                }`}
                        >
                            {plan.badge && (
                                <div className="absolute top-0 right-0 rounded-bl-xl rounded-tr-[inherit] bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
                                    {plan.badge}
                                </div>
                            )}

                            <div className={`p-6 pb-5 ${plan.highlight ? "bg-gradient-to-br from-primary/5 to-transparent" : ""}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.highlight ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-accent text-primary"}`}>
                                        <plan.icon className="h-5 w-5" />
                                    </div>
                                    <span className="font-bold text-foreground">{plan.name}</span>
                                </div>

                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-4xl font-bold tracking-tight text-foreground">{plan.price}</span>
                                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                            </div>

                            <div className="flex-1 px-6 pb-6 pt-4 space-y-3">
                                {plan.features.map((f) => (
                                    <div key={f} className="flex items-start gap-2.5">
                                        <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${plan.highlight ? "bg-primary/15" : "bg-accent"}`}>
                                            <Check className={`h-2.5 w-2.5 ${plan.highlight ? "text-primary" : "text-accent-foreground"}`} />
                                        </div>
                                        <span className="text-sm text-muted-foreground">{f}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="px-6 pb-6">
                                <Button
                                    onClick={onGetStarted}
                                    className={`w-full font-semibold transition-all ${plan.highlight
                                            ? "shadow-lg shadow-primary/30 hover:shadow-primary/40"
                                            : ""
                                        }`}
                                    variant={plan.highlight ? "default" : "outline"}
                                    size="lg"
                                >
                                    {plan.cta}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    All plans include email + WhatsApp extraction, XLSX export. Cancel anytime.
                </p>
            </div>
        </section>
    );
};

export default PricingSection;
