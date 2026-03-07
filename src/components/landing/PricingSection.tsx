import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    key: "demo",
    code: "PACK_00",
    name: "DEMO",
    price: "FREE",
    period: null,
    description: "Try before you buy.",
    badge: null,
    features: [
      "30 credits included",
      "1 search",
      "Up to 60 leads",
      "Email + phone extraction",
      "Excel export",
    ],
    cta: "START FREE — 30 CREDITS",
    primary: false,
  },
  {
    key: "starter",
    code: "PACK_01",
    name: "STARTER PACK",
    price: "$9",
    period: "ONE-TIME",
    description: "100 credits — ~10 searches.",
    badge: null,
    features: [
      "100 credits",
      "~10 searches",
      "Up to 600 leads",
      "Email + phone + WhatsApp",
      "Excel export",
      "Credits never expire",
    ],
    cta: "GET STARTER — $9",
    primary: false,
  },
  {
    key: "growth",
    code: "PACK_02",
    name: "GROWTH PACK",
    price: "$19",
    period: "ONE-TIME",
    description: "300 credits — ~30 searches.",
    badge: "BEST VALUE",
    features: [
      "300 credits",
      "~30 searches",
      "Up to 1,800 leads",
      "Everything in Starter",
      "AI lead scoring",
      "Opportunity insights",
      "Credits never expire",
    ],
    cta: "GET GROWTH — $19",
    primary: true,
  },
  {
    key: "pro",
    code: "PACK_03",
    name: "PRO PACK",
    price: "$39",
    period: "ONE-TIME",
    description: "700 credits — ~70 searches.",
    badge: null,
    features: [
      "700 credits",
      "~70 searches",
      "Up to 4,200 leads",
      "Everything in Growth",
      "Priority support",
      "Credits never expire",
    ],
    cta: "GET PRO — $39",
    primary: false,
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
            04 PACKS<br />AVAILABLE
          </div>
        </div>

        <div ref={ref} className="grid gap-0 md:grid-cols-4">
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

        <p className="label-mono text-white/18 text-center mt-8">ONE-TIME PURCHASE · CREDITS NEVER EXPIRE · NO SUBSCRIPTIONS</p>
      </div>
    </section>
  );
};

export default PricingSection;
