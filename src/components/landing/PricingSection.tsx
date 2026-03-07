import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight } from "lucide-react";

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
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const handleClick = (key: string) => {
    setLoading(key);
    setTimeout(() => setLoading(null), 1200);
    onGetStarted(key);
  };

  return (
    <section id="pricing" className="py-24 sm:py-32 border-t border-white/[0.04]" style={{ background: "#050505" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        <div className={`mb-16 flex items-end justify-between border-b border-white/[0.06] pb-8 ${visible ? "animate-section-in" : "opacity-0"}`}>
          <div>
            <div className="label-mono mb-3 text-white/25">// PRICING MATRIX</div>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight"
              style={{ fontFamily: "'Space Mono', monospace" }}>
              START FREE.<br />SCALE WHEN READY.
            </h2>
          </div>
          <div className="hidden md:block label-mono text-white/20 text-right">
            03 TIERS<br />AVAILABLE
          </div>
        </div>

        <div ref={ref} className="grid gap-0 md:grid-cols-3">
          {plans.map((plan, idx) => (
            <div
              key={plan.key}
              className={`relative flex flex-col p-7 transition-all duration-200
                ${visible ? "animate-fade-in-up" : "opacity-0"}
                ${plan.primary
                  ? "border border-white/50 bg-white/[0.03]"
                  : "border border-white/[0.08] bg-transparent hover:bg-white/[0.02]"
                }
                ${idx === 1 ? "-mx-px" : ""}
              `}
              style={{
                animationDelay: `${idx * 90}ms`,
                borderRadius: "4px",
                ...(plan.primary ? { boxShadow: "0 0 40px rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.12)" } : {}),
              }}
            >
              {/* MOST POPULAR badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="font-mono-data text-[9px] font-bold tracking-widest bg-white text-[#080808] px-3 py-1"
                    style={{ borderRadius: "2px" }}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="label-mono text-white/20">{plan.code}</span>
                </div>
                <h3 className="font-mono-data text-xs font-bold text-white/80 tracking-widest mb-1">{plan.name}</h3>
                <p className="font-body text-[13px] text-white/30 mb-5">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-white tracking-tight"
                    style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(36px, 4vw, 48px)" }}>
                    {plan.price}
                  </span>
                  {plan.period && <span className="label-mono text-white/35 ml-1">{plan.period}</span>}
                </div>
              </div>

              <button
                onClick={() => handleClick(plan.key)}
                disabled={loading === plan.key}
                className={`w-full py-3.5 mb-6 font-mono-data text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 transition-all duration-150 group
                  ${plan.primary
                    ? "bg-white text-[#080808] hover:bg-white/90"
                    : "border border-white/15 text-white/50 hover:border-white/35 hover:text-white/80"
                  }`}
                style={{ borderRadius: "3px" }}
              >
                {loading === plan.key ? "PROCESSING..." : plan.cta}
                {loading !== plan.key && (
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>

              <ul className="space-y-3 border-t border-white/[0.06] pt-5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 font-body text-[13px] text-white/35">
                    <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-white/40" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="label-mono text-white/18 text-center mt-8">NO HIDDEN FEES · 7-DAY MONEY-BACK ON PAID PLANS</p>
      </div>
    </section>
  );
};

export default PricingSection;
