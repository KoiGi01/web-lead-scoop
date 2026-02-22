import { Check, Zap, Building2, Crown, Loader2 } from "lucide-react";
import { useState } from "react";

const bundles = [
  {
    name: "Free Trial",
    bundleKey: null,
    price: "$0",
    credits: 50,
    description: "Try it risk-free. No card needed.",
    icon: Zap,
    features: [
      "50 credits (≈5 searches)",
      "Email & WhatsApp extraction",
      "XLSX export",
      "Google Maps data",
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Starter Pack",
    bundleKey: "starter",
    price: "$9",
    credits: 100,
    description: "Quick top-up for light users.",
    icon: Building2,
    features: [
      "100 credits (≈10 searches)",
      "Email & WhatsApp extraction",
      "XLSX export",
      "One-time purchase",
      "Credits never expire",
    ],
    cta: "Buy 100 Credits",
    highlight: false,
  },
  {
    name: "Growth Pack",
    bundleKey: "growth",
    price: "$19",
    credits: 300,
    description: "Best value for growing outreach.",
    icon: Building2,
    features: [
      "300 credits (≈30 searches)",
      "Email & WhatsApp extraction",
      "Styled XLSX export",
      "One-time purchase",
      "Credits never expire",
    ],
    cta: "Buy 300 Credits",
    highlight: true,
    badge: "Best Value",
  },
  {
    name: "Pro Pack",
    bundleKey: "pro",
    price: "$39",
    credits: 700,
    description: "Power users & agencies.",
    icon: Crown,
    features: [
      "700 credits (≈70 searches)",
      "Email & WhatsApp extraction",
      "Styled XLSX export",
      "One-time purchase",
      "Credits never expire",
    ],
    cta: "Buy 700 Credits",
    highlight: false,
  },
];

interface PricingSectionProps {
  onGetStarted: (bundleKey: string | null) => void;
}

const PricingSection = ({ onGetStarted }: PricingSectionProps) => {
  const [loadingBundle, setLoadingBundle] = useState<string | null>(null);
  return (
    <section id="pricing" className="bg-[#030304] py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Credit Bundles
            </span>
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Buy Credits, Use{" "}
            <span className="gradient-text">Forever</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#94A3B8]">
            One-time purchase. No subscriptions. No expiration. Scale at your own pace.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 items-stretch">
          {bundles.map((bundle) => (
            <div
              key={bundle.name}
              className={`relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 ${
                bundle.highlight
                  ? "scale-105 border border-[#F7931A] shadow-[0_0_40px_-10px_rgba(247,147,26,0.2)] bg-[#0F1115] z-10"
                  : "border border-white/10 bg-[#0F1115] opacity-90 hover:opacity-100"
              }`}
            >
              {/* Badge */}
              {bundle.badge && (
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="rounded-b-xl px-5 py-1 font-mono-data text-[9px] font-bold uppercase tracking-widest text-white bg-gradient-to-r from-[#EA580C] to-[#F7931A]">
                    {bundle.badge}
                  </div>
                </div>
              )}

              <div className={`p-6 flex flex-col h-full ${bundle.highlight ? "pt-8" : ""}`}>
                {/* Bundle name + icon */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bundle.highlight ? "bg-[#EA580C]/20 border border-[#EA580C]/40" : "bg-white/5 border border-white/10"}`}>
                    <bundle.icon className={`h-5 w-5 ${bundle.highlight ? "text-[#F7931A]" : "text-[#94A3B8]"}`} strokeWidth={1.5} />
                  </div>
                  <span className="font-heading font-semibold text-white">{bundle.name}</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-mono-data text-5xl font-bold text-white">
                    {bundle.price}
                  </span>
                </div>

                {/* Credits amount */}
                <div className="mb-4">
                  <span className="font-mono-data text-sm font-bold text-[#F7931A]">{bundle.credits} Credits</span>
                  <span className="font-mono-data text-xs text-[#94A3B8] ml-2">≈ {Math.round(bundle.credits / 10)} searches</span>
                </div>

                <p className="text-sm text-[#94A3B8] mb-6">{bundle.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-auto">
                  {bundle.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${bundle.highlight ? "bg-[#F7931A]/20 border border-[#F7931A]/40" : "bg-white/5 border border-white/10"}`}>
                        <Check className={`h-2.5 w-2.5 ${bundle.highlight ? "text-[#F7931A]" : "text-[#94A3B8]"}`} strokeWidth={2.5} />
                      </div>
                      <span className="text-sm text-[#94A3B8]">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    setLoadingBundle(bundle.bundleKey);
                    onGetStarted(bundle.bundleKey);
                  }}
                  disabled={loadingBundle === bundle.bundleKey}
                  className={`mt-8 w-full py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 ${
                    bundle.highlight
                      ? "btn-btc disabled:opacity-70"
                      : "rounded-full border-2 border-white/20 hover:border-[#F7931A]/50 hover:bg-[#F7931A]/5 disabled:opacity-70"
                  }`}
                >
                  {loadingBundle === bundle.bundleKey ? (
                    <>
                      <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    bundle.cta
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center font-mono-data text-[10px] text-[#94A3B8] uppercase tracking-wider">
          One-time purchase. No subscriptions. Credits never expire. Full extraction pipeline included.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
