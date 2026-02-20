import { Target, ArrowRight, Zap, Globe, Mail, Star, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden hero-gradient text-white pt-16">
      {/* Decorative mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/10 blur-2xl animate-float" style={{ animationDelay: "1s" }} />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32 lg:py-40">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          {/* Left */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium">
              <Zap className="h-3.5 w-3.5 text-yellow-300" />
              <span>Lead Generation on Autopilot</span>
              <span className="ml-1 rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs font-semibold text-yellow-200">New</span>
            </div>

            {/* Headline */}
            <div className="animate-fade-in-up delay-100">
              <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
                Extract Local{" "}
                <span className="relative inline-block">
                  <span className="text-yellow-200">Business Leads</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-yellow-300/50 rounded-full" />
                </span>{" "}
                in Seconds
              </h1>
            </div>

            <p className="animate-fade-in-up delay-200 max-w-lg text-lg leading-relaxed text-white/75">
              Search any keyword + location and instantly get business names, phone numbers, emails, and WhatsApp — exported to a professionally styled Excel file.
            </p>

            {/* Actions */}
            <div className="animate-fade-in-up delay-300 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-white text-primary hover:bg-white/90 font-semibold text-base px-8 shadow-2xl shadow-black/30 transition-all hover:scale-105 active:scale-95"
              >
                Start for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <span className="text-sm text-white/50">No credit card required</span>
            </div>

            {/* Trust bar */}
            <div className="animate-fade-in-up delay-400 flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-sm text-white/65">
                <Globe className="h-4 w-4" /> Google Maps Data
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/65">
                <Mail className="h-4 w-4" /> Email Scraping
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/65">
                <Users className="h-4 w-4" /> 2,400+ leads/mo
              </div>
            </div>

            {/* Social proof */}
            <div className="animate-fade-in-up delay-500 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"].map((color, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: color }}
                  >
                    {["A", "M", "S", "J", "K"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
                  ))}
                </div>
                <p className="text-xs text-white/60 mt-0.5">Loved by 1,200+ outreach teams</p>
              </div>
            </div>
          </div>

          {/* Right — Live preview card */}
          <div className="hidden lg:block animate-fade-in-up delay-300">
            <div className="relative rounded-2xl glass p-6 shadow-2xl shadow-black/30">
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-300/20">
                    <Target className="h-4.5 w-4.5 text-yellow-200" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50">Sample search</p>
                    <p className="font-semibold text-sm">"Dentist" — Miami, FL</p>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Businesses", value: "60", icon: Users, color: "blue" },
                  { label: "Emails", value: "38", icon: Mail, color: "violet" },
                  { label: "WhatsApp", value: "14", icon: TrendingUp, color: "emerald" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-white/50 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Business list */}
              <div className="space-y-2">
                {[
                  { name: "Smile Dental Clinic", tag: "✓ Email + Phone", color: "text-emerald-300" },
                  { name: "Miami Family Dentistry", tag: "✓ Email found", color: "text-emerald-300" },
                  { name: "Bright Teeth Center", tag: "✓ WhatsApp", color: "text-blue-300" },
                  { name: "Downtown Dental Studio", tag: "✓ Email found", color: "text-emerald-300" },
                ].map(({ name, tag, color }, i) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg bg-white/5 border border-white/8 px-4 py-2.5 text-sm animate-slide-in-right"
                    style={{ animationDelay: `${400 + i * 80}ms` }}
                  >
                    <span className="text-white/85">{name}</span>
                    <span className={`text-xs font-medium ${color}`}>{tag}</span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/40 mb-1.5">
                  <span>Scanning websites…</span>
                  <span>73%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[73%] rounded-full bg-gradient-to-r from-primary to-blue-400 animate-shimmer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ height: 48 }}>
          <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="hsl(225 25% 97%)" className="dark:fill-[hsl(228_35%_6%)]" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
