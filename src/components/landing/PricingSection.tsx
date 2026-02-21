import { Check, Zap, Building2, Crown } from "lucide-react";

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
  },
  {
    name: "Starter",
    price: "$19",
    period: "/mo",
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
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
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
    <section id="pricing" className="bg-[#030304] py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Pricing Tiers
            </span>
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Start Free, Scale When{" "}
            <span className="gradient-text">You're Ready</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#94A3B8]">
            No surprises. Cancel anytime. Every plan includes the full extraction pipeline.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-center">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 ${
                plan.highlight
                  ? "scale-105 border border-[#F7931A] shadow-[0_0_40px_-10px_rgba(247,147,26,0.2)] bg-[#0F1115] z-10"
                  : "border border-white/10 bg-[#0F1115] opacity-90 hover:opacity-100"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="rounded-b-xl px-5 py-1 font-mono-data text-[9px] font-bold uppercase tracking-widest text-white bg-gradient-to-r from-[#EA580C] to-[#F7931A]">
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className={`p-6 ${plan.highlight ? "pt-8" : ""}`}>
                {/* Plan name + icon */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${plan.highlight ? "bg-[#EA580C]/20 border border-[#EA580C]/40" : "bg-white/5 border border-white/10"}`}>
                    <plan.icon className={`h-5 w-5 ${plan.highlight ? "text-[#F7931A]" : "text-[#94A3B8]"}`} strokeWidth={1.5} />
                  </div>
                  <span className="font-heading font-semibold text-white">{plan.name}</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-mono-data text-5xl font-bold text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="font-mono-data text-sm text-[#94A3B8]">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-[#94A3B8] mb-6">{plan.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${plan.highlight ? "bg-[#F7931A]/20 border border-[#F7931A]/40" : "bg-white/5 border border-white/10"}`}>
                        <Check className={`h-2.5 w-2.5 ${plan.highlight ? "text-[#F7931A]" : "text-[#94A3B8]"}`} strokeWidth={2.5} />
                      </div>
                      <span className="text-sm text-[#94A3B8]">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.highlight ? (
                  <button
                    onClick={onGetStarted}
                    className="btn-btc w-full py-3.5 text-xs font-bold uppercase tracking-widest text-white"
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <button
                    onClick={onGetStarted}
                    className="w-full rounded-full border-2 border-white/20 py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:border-[#F7931A]/50 hover:bg-[#F7931A]/5 transition-all duration-300"
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center font-mono-data text-[10px] text-[#94A3B8] uppercase tracking-wider">
          All plans include email + WhatsApp extraction, XLSX export. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
