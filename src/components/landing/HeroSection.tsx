import { ArrowRight, Sparkles } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative pt-32 pb-24 sm:pt-48 sm:pb-32 overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-20 w-72 h-72 bg-blue-100/20 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">New: AI-Powered Lead Scoring</span>
          </div>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
          Find Your Next{" "}
          <span className="gradient-text">1,000 Leads</span> in Minutes
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mb-8 leading-relaxed">
          Search by keyword and location. We extract emails, phones, and WhatsApp contacts automatically. Download as a clean Excel file ready for outreach.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <button
            onClick={onGetStarted}
            className="btn-btc px-8 py-4 text-base font-bold uppercase tracking-widest text-white rounded-full inline-flex items-center justify-center gap-2 group"
          >
            Start Free Demo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-4 text-base font-bold uppercase tracking-widest text-slate-700 bg-white border border-[#EBEBF0] rounded-full hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            Learn More
          </button>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-8 pt-8 border-t border-[#EBEBF0]">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">34K+</p>
            <p className="text-sm text-slate-600">Leads Generated</p>
          </div>
          <div className="w-px h-12 bg-[#EBEBF0]" />
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">47</p>
            <p className="text-sm text-slate-600">Countries</p>
          </div>
          <div className="w-px h-12 bg-[#EBEBF0]" />
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">2 min</p>
            <p className="text-sm text-slate-600">Avg Search</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
