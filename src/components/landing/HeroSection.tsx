import { Target, ArrowRight, Zap, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--gradient-hero-from))] to-[hsl(var(--gradient-hero-to))] text-white">
      {/* Abstract shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:py-36">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <Zap className="h-4 w-4" />
              Lead Generation on Autopilot
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Extract Local <span className="text-yellow-200">Business Leads</span> in Seconds
            </h1>
            <p className="max-w-lg text-lg text-white/80">
              Search any keyword + location and instantly get business names, phone numbers, emails, and WhatsApp — exported to a styled Excel file.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-white text-[hsl(var(--gradient-hero-from))] hover:bg-white/90 font-semibold text-base px-8 shadow-lg shadow-black/20"
              >
                Start Extracting
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" /> Google Maps Data</span>
              <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> Email Scraping</span>
              <span className="flex items-center gap-1.5"><Target className="h-4 w-4" /> Precision Targeting</span>
            </div>
          </div>

          {/* Right — stats card */}
          <div className="hidden lg:block">
            <div className="relative rounded-2xl bg-white/10 p-8 backdrop-blur-lg border border-white/20 shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-300/20">
                    <Target className="h-5 w-5 text-yellow-200" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Sample search</p>
                    <p className="font-semibold">"Dentist" — Miami, FL</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Businesses", value: "60" },
                    { label: "Emails Found", value: "34" },
                    { label: "WhatsApp", value: "12" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/10 p-4 text-center">
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-white/60">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {["Smile Dental Clinic", "Miami Family Dentistry", "Bright Teeth Center"].map((n, i) => (
                    <div key={n} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5 text-sm">
                      <span>{n}</span>
                      <span className="text-xs text-green-300">{i < 2 ? "✓ Email found" : "✓ Phone"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
