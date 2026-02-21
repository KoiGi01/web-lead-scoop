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

const Screws = () => (
  <>
    <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 65% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
    <span className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 35% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
    <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full opacity-50 pointer-events-none" style={{ background: "radial-gradient(circle at 65% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
  </>
);

interface PricingSectionProps {
  onGetStarted: () => void;
}

const PricingSection = ({ onGetStarted }: PricingSectionProps) => {
  return (
    <section id="pricing" className="bg-[#e0e5ec] py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-16 text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{ boxShadow: "var(--shadow-recessed)" }}
          >
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a5568]">
              Pricing Tiers
            </span>
          </div>
          <h2
            className="text-4xl font-bold tracking-tight text-[#2d3436] sm:text-5xl"
            style={{ textShadow: "0 1px 0 #ffffff" }}
          >
            Start Free, Scale When{" "}
            <span className="text-[#ff4757]">You're Ready</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#4a5568]">
            No surprises. Cancel anytime. Every plan includes the full extraction pipeline.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col overflow-hidden rounded-2xl bg-[#e0e5ec] ${plan.highlight ? "-mt-2" : ""}`}
              style={{
                boxShadow: plan.highlight
                  ? "12px 12px 28px #babecc, -12px -12px 28px #ffffff, 0 0 0 2px #ff4757, inset 1px 1px 0 rgba(255,255,255,0.5)"
                  : "var(--shadow-card)",
              }}
            >
              {/* Most Popular badge */}
              {plan.badge && (
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div
                    className="rounded-b-xl px-5 py-1 font-mono-data text-[9px] font-bold uppercase tracking-widest text-white bg-[#ff4757]"
                    style={{ boxShadow: "0 2px 8px rgba(255,71,87,0.4)" }}
                  >
                    {plan.badge}
                  </div>
                </div>
              )}

              <Screws />

              {/* Hole punch for featured */}
              {plan.highlight && (
                <div className="absolute top-8 right-4">
                  <div
                    className="h-5 w-5 rounded-full"
                    style={{ boxShadow: "var(--shadow-recessed)", background: "#d1d9e6" }}
                  />
                </div>
              )}

              <div className={`p-6 ${plan.highlight ? "pt-8" : ""}`}>
                {/* Plan name + icon */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      boxShadow: plan.highlight ? "var(--shadow-floating)" : "var(--shadow-recessed)",
                      background: plan.highlight ? "rgba(255,71,87,0.1)" : undefined,
                    }}
                  >
                    <plan.icon
                      className={`h-5 w-5 ${plan.highlight ? "text-[#ff4757]" : "text-[#4a5568]"}`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="font-bold text-[#2d3436]">{plan.name}</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className="font-mono-data text-5xl font-bold text-[#2d3436]"
                    style={{ textShadow: "0 1px 0 #ffffff" }}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="font-mono-data text-sm text-[#4a5568]">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-[#4a5568] mb-6">{plan.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${plan.highlight ? "" : ""}`}
                        style={{ boxShadow: plan.highlight ? "var(--shadow-floating)" : "var(--shadow-recessed)" }}
                      >
                        <Check className="h-2.5 w-2.5 text-[#ff4757]" strokeWidth={2.5} />
                      </div>
                      <span className="text-sm text-[#4a5568]">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={onGetStarted}
                  className="btn-press w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-widest transition-all"
                  style={
                    plan.highlight
                      ? {
                          background: "#ff4757",
                          color: "#ffffff",
                          boxShadow: "4px 4px 10px rgba(166,50,60,0.4), -2px -2px 8px rgba(255,100,110,0.3)",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }
                      : {
                          color: "#4a5568",
                          boxShadow: "var(--shadow-card)",
                        }
                  }
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center font-mono-data text-[10px] text-[#4a5568] uppercase tracking-wider">
          All plans include email + WhatsApp extraction, XLSX export. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
