import { Check } from "lucide-react";
import { useState } from "react";

const bundles = [
  {
    key: "demo",
    name: "Try Demo",
    price: "Free",
    description: "Get started risk-free",
    credits: 30,
    searches: "1 search",
    features: [
      "30 demo credits",
      "Up to 60 leads",
      "Email extraction",
      "Basic sorting",
    ],
    cta: "Start Free Demo",
    highlighted: false,
  },
  {
    key: "starter",
    name: "Starter",
    price: "$19",
    period: "/month",
    description: "Perfect for freelancers",
    credits: 500,
    searches: "40 searches",
    features: [
      "500 credits/month",
      "Up to 2,400 leads/month",
      "Email extraction",
      "Phone & WhatsApp",
      "Smart sorting",
      "CSV + Excel export",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    key: "pro",
    name: "Professional",
    price: "$49",
    period: "/month",
    description: "For agencies & teams",
    credits: 1500,
    searches: "150 searches",
    features: [
      "1,500 credits/month",
      "Up to 9,000 leads/month",
      "Everything in Starter",
      "AI lead scoring",
      "Opportunity insights",
      "Team collaboration",
      "Priority support",
    ],
    cta: "Get Started",
    highlighted: true,
  },
];

interface PricingSectionProps {
  onPricingClick: (bundleKey: string) => void;
}

const PricingSection = ({ onPricingClick }: PricingSectionProps) => {
  const [loadingBundle, setLoadingBundle] = useState<string | null>(null);

  const handleClick = (key: string) => {
    setLoadingBundle(key);
    setTimeout(() => setLoadingBundle(null), 1000);
    onPricingClick(key);
  };

  return (
    <section id="pricing" className="py-20 sm:py-32 bg-blue-50/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-slate-600">
            Choose the plan that fits your needs. All plans include email support.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {bundles.map((bundle) => (
            <div
              key={bundle.key}
              className={`card-lift p-8 flex flex-col gap-6 transition-all relative ${
                bundle.highlighted ? "md:scale-105 shadow-lg" : ""
              }`}
            >
              {bundle.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-block bg-blue-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {bundle.name}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {bundle.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">
                    {bundle.price}
                  </span>
                  {bundle.period && (
                    <span className="text-slate-600">{bundle.period}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {bundle.credits} • {bundle.searches}
                </p>
              </div>

              <button
                onClick={() => handleClick(bundle.key)}
                disabled={loadingBundle === bundle.key}
                className={`py-3 px-6 rounded-full font-bold uppercase tracking-widest text-sm transition-all ${
                  bundle.highlighted
                    ? "btn-btc text-white"
                    : "border border-[#EBEBF0] text-slate-700 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {loadingBundle === bundle.key ? "Processing..." : bundle.cta}
              </button>

              <div className="border-t border-[#EBEBF0] pt-6 space-y-3">
                {bundle.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Row */}
        <div className="mt-16 pt-8 border-t border-[#EBEBF0] text-center">
          <p className="text-slate-600">
            All plans include a 7-day money-back guarantee.{" "}
            <a href="#faq" className="text-blue-600 font-medium hover:underline">
              See FAQ →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
