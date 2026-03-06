import { Search, Globe, Download, CheckCircle } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Search",
    description: "Enter a business type and location. Set your radius and max results.",
  },
  {
    number: "02",
    icon: Globe,
    title: "Extract",
    description: "We scan Google Maps and the web for matching businesses, then extract contact info.",
  },
  {
    number: "03",
    icon: Download,
    title: "Download",
    description: "Get a clean Excel file with names, emails, phones, and WhatsApp links.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 sm:py-32 bg-blue-50/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            How It Works
          </h2>
          <p className="text-lg text-slate-600">
            Get your leads in just three simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.number} className="relative">
              <div className="card-lift p-8 flex flex-col gap-4 h-full">
                {/* Step number */}
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-blue-600">{s.number}</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 border border-blue-200">
                    <s.icon className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>

              {/* Arrow connector */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                  <div className="text-2xl text-blue-300 font-light">→</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
