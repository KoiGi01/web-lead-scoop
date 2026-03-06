import { Check, Zap } from "lucide-react";
import { useState } from "react";

const plans = [
  {
    key: "demo",
    name: "Demo",
    price: "Free",
    description: "Try it risk-free. No card needed.",
    badge: null,
    features: [
      "30 demo credits",
      "1 search included",
      "Up to 60 leads",
      "Email + phone extraction",
      "Excel export",
    ],
    cta: "Start Free Demo",
    primary: false,
  },
  {
    key: "starter",
    name: "Starter",
    price: "$19",
    period: "/mo",
    description: "For freelancers and solo operators.",
    badge: null,
    features: [
      "500 credits / month",
      "40 searches / month",
      "Up to 2,400 leads",
      "Email + phone + WhatsApp",
      "Excel export",
      "Smart sorting",
    ],
    cta: "Get Started",
    primary: false,
  },
  {
    key: "pro",
    name: "Professional",
    price: "$49",
    period: "/mo",
    description: "For agencies and teams at scale.",
    badge: "Most Popular",
    features: [
      "1,500 credits / month",
      "150 searches / month",
      "Up to 9,000 leads",
      "Everything in Starter",
      "AI lead scoring",
      "Opportunity insights",
      "Priority support",
    ],
    cta: "Get Professional",
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
    <section id="pricing" className="py-24 sm:py-32" style={{ background: "#F5F5F7" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[rgba(0,0,0,0.08)] px-3.5 py-1.5 mb-5 text-xs font-semibold text-[#6e6e73] tracking-wide shadow-sm">
            Simple pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1d1d1f] mb-4 leading-tight">
            Start free.<br />Scale when ready.
          </h2>
          <p className="text-lg text-[#6e6e73]">
            No hidden fees. 7-day money-back on paid plans.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {plans.map((plan, idx) => (
            <div
              key={plan.key}
              className={`relative flex flex-col animate-fade-in-up ${
                plan.primary
                  ? "rounded-[20px] ring-2 ring-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,0.15),0_8px_40px_rgba(37,99,235,0.15)]"
                  : "card-lift"
              } bg-white p-7`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    <Zap className="h-3 w-3" />
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-base font-bold text-[#1d1d1f] mb-1">{plan.name}</h3>
                <p className="text-xs text-[#6e6e73] mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#1d1d1f]">{plan.price}</span>
                  {plan.period && <span className="text-sm text-[#6e6e73]">{plan.period}</span>}
                </div>
              </div>

              <button
                onClick={() => handleClick(plan.key)}
                disabled={loading === plan.key}
                className={`w-full py-3 rounded-full text-sm font-bold tracking-wide transition-all mb-6 ${
                  plan.primary
                    ? "btn-btc text-white"
                    : "bg-[#F5F5F7] text-[#1d1d1f] border border-[rgba(0,0,0,0.08)] hover:bg-[#EBEBED] hover:border-[rgba(0,0,0,0.12)]"
                }`}
              >
                {loading === plan.key ? "Processing..." : plan.cta}
              </button>

              <ul className="space-y-3 border-t border-[rgba(0,0,0,0.05)] pt-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-[#3d3d3f]">
                    <Check className={`h-4 w-4 flex-shrink-0 ${plan.primary ? "text-blue-600" : "text-[#86868b]"}`} />
                    {f}
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

export default PricingSection;
