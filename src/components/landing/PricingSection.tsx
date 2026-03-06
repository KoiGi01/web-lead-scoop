import { Check, ArrowRight } from "lucide-react";
import { useState } from "react";

const plans = [
  {
    key: "demo",
    code: "TIER_00",
    name: "DEMO",
    price: "FREE",
    description: "No card needed.",
    badge: null,
    features: [
      "30 demo credits",
      "1 search included",
      "Up to 60 leads",
      "Email + phone extraction",
      "Excel export",
    ],
    cta: "START FREE — 30 CREDITS",
    primary: false,
  },
  {
    key: "starter",
    code: "TIER_01",
    name: "STARTER",
    price: "$19",
    period: "/MO",
    description: "For solo operators.",
    badge: null,
    features: [
      "500 credits / month",
      "40 searches / month",
      "Up to 2,400 leads",
      "Email + phone + WhatsApp",
      "Excel export",
      "Smart sorting",
    ],
    cta: "GET STARTED",
    primary: false,
  },
  {
    key: "pro",
    code: "TIER_02",
    name: "PROFESSIONAL",
    price: "$49",
    period: "/MO",
    description: "For agencies at scale.",
    badge: "MOST POPULAR",
    features: [
      "1,500 credits / month",
      "150 searches / month",
      "Up to 9,000 leads",
      "Everything in Starter",
      "AI lead scoring",
      "Opportunity insights",
      "Priority support",
    ],
    cta: "GET PROFESSIONAL",
    primary: true,
  },
];

interface PricingSectionProps {
  onGetStarted: (bundleKey: string) => void;
}

const PricingSection = ({ onGetStarted }: PricingSectionProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleClick = (key: string) => {
    setLoading(key);
    setTimeout(() => setLoading(null), 1200);
    onGetStarted(key);
  };

  return (
    <section id="pricing" className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 flex items-end justify-between border-b border-white/[0.06] pb-8">
          <div>
            <div className="label-mono mb-3 text-white/25">// PRICING MATRIX</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
              START FREE.<br />SCALE WHEN READY.
            </h2>
          </div>
          <div className="hidden md:block label-mono text-white/20 text-right">
            03 TIERS<br />AVAILABLE
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-3 border border-white/[0.06]">
          {plans.map((plan, idx) => (
            <div
              key={plan.key}
              className={`relative flex flex-col p-7 animate-fade-in-up hover:bg-white/[0.015] transition-colors ${
                plan.primary ? "bg-white/[0.02]" : ""
              } ${idx < plans.length - 1 ? "border-b md:border-b-0 md:border-r border-white/[0.06]" : ""}`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4">
                  <span className="label-mono text-white/90 bg-white/10 px-2 py-0.5 border border-white/20">{plan.badge}</span>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="label-mono text-white/20">{plan.code}</span>
                </div>
                <h3 className="font-mono-data text-xs font-bold text-white/80 tracking-widest mb-1">{plan.name}</h3>
                <p className="label-mono text-white/30 mb-5">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>{plan.price}</span>
                  {plan.period && <span className="label-mono text-white/35 ml-1">{plan.period}</span>}
                </div>
              </div>

              <button
                onClick={() => handleClick(plan.key)}
                disabled={loading === plan.key}
                className={`w-full py-3 mb-6 font-mono-data text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 transition-all group ${
                  plan.primary
                    ? "btn-btc"
                    : "border border-white/15 text-white/50 hover:border-white/35 hover:text-white/80"
                }`}
                style={{ borderRadius: "3px" }}
              >
                {loading === plan.key ? "PROCESSING..." : plan.cta}
                {loading !== plan.key && <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />}
              </button>

              <ul className="space-y-2.5 border-t border-white/[0.05] pt-5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 font-mono-data text-[11px] text-white/35">
                    <Check className="h-3 w-3 flex-shrink-0 text-white/30" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="label-mono text-white/20 text-center mt-6">NO HIDDEN FEES · 7-DAY MONEY-BACK ON PAID PLANS</p>
      </div>
    </section>
  );
};

export default PricingSection;
