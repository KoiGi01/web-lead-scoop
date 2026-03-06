import { Search, Mail, Phone, FileText, Globe, Zap, TrendingUp, Rocket } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Instant Search",
    description: "Search Google Maps and the web by keyword + location. Get accurate business listings in seconds.",
  },
  {
    icon: Mail,
    title: "Email Extraction",
    description: "Automatically scan business websites and extract email addresses from contact pages.",
  },
  {
    icon: Phone,
    title: "Phone & WhatsApp",
    description: "Capture phone numbers from Google Maps and detect WhatsApp links for instant messaging.",
  },
  {
    icon: FileText,
    title: "Clean Exports",
    description: "Download leads as a professionally formatted Excel file with auto-sized columns and headers.",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Works in 47+ countries. Search any city, customize radius from 1 to 50+ km.",
  },
  {
    icon: TrendingUp,
    title: "Smart Sorting",
    description: "Sort by name, email count, or AI opportunity score. Focus on the most qualified leads.",
  },
  {
    icon: Zap,
    title: "Real-Time Results",
    description: "Watch leads populate in real-time as our system searches and extracts data.",
  },
  {
    icon: Rocket,
    title: "AI Scoring",
    description: "Leverage AI to score businesses by opportunity and market maturity. Unlock with credits.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-20 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Powerful Features for Lead Generation
          </h2>
          <p className="text-lg text-slate-600">
            Everything you need to find, extract, and organize qualified leads in one place.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="group card-lift p-6 flex flex-col gap-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 group-hover:border-blue-300 transition-colors">
                <f.icon className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
