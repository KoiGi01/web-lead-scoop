import { ArrowRight, MapPin, Mail, Phone, Download, Sparkles, CheckCircle2 } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const mockLeads = [
  { name: "Bright Smiles Dental", email: "hello@brightsmiles.com", phone: "+1 305 555 0182", city: "Miami, FL" },
  { name: "Peak Performance Gym", email: "info@peakfit.io", phone: "+44 20 7946 0321", city: "London, UK" },
  { name: "Sakura Spa & Wellness", email: "bookings@sakuraspa.jp", phone: "+81 3 1234 5678", city: "Tokyo, JP" },
];

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-32">
      {/* Dot grid background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-100 pointer-events-none" />

      {/* Blue radial glow top center */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.10) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT — Copy */}
          <div>
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 mb-8 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              <span className="text-xs font-semibold text-blue-700 tracking-wide">AI Lead Intelligence — Now Live</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl font-bold text-[#1d1d1f] leading-[1.05] tracking-tight mb-6 animate-fade-in-up delay-100">
              Find qualified<br />
              <span className="gradient-text">leads anywhere</span><br />
              in minutes.
            </h1>

            {/* Sub */}
            <p className="text-lg text-[#6e6e73] leading-relaxed max-w-md mb-8 animate-fade-in-up delay-200">
              Search by keyword and location. We automatically extract emails, phones, and WhatsApp contacts from real business websites worldwide.
            </p>

            {/* Trust bullets */}
            <div className="flex flex-col gap-2 mb-10 animate-fade-in-up delay-300">
              {[
                "Google Maps + web search combined",
                "Exports to styled Excel in 1 click",
                "AI opportunity scoring included",
              ].map((point) => (
                <div key={point} className="flex items-center gap-2.5 text-sm text-[#3d3d3f]">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  {point}
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up delay-400">
              <button
                onClick={onGetStarted}
                className="btn-btc px-7 py-3.5 text-sm font-bold text-white tracking-wide inline-flex items-center justify-center gap-2 group"
              >
                Try Free — 30 Credits
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                className="px-7 py-3.5 text-sm font-semibold text-[#1d1d1f] bg-white border border-[rgba(0,0,0,0.10)] rounded-full hover:bg-[#F0F0F0] transition-colors"
              >
                See Pricing
              </button>
            </div>

            {/* Social proof */}
            <p className="mt-5 text-xs text-[#6e6e73] animate-fade-in-up delay-500">
              No credit card required &nbsp;·&nbsp; 34K+ leads generated &nbsp;·&nbsp; 47 countries
            </p>
          </div>

          {/* RIGHT — Product preview card */}
          <div className="relative animate-fade-in-up delay-300">
            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 z-20 flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-lg border border-[rgba(0,0,0,0.06)] animate-float">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-xs font-semibold text-[#1d1d1f]">AI Scored</span>
            </div>

            {/* Main card */}
            <div className="glass-card overflow-hidden">
              {/* Search bar header */}
              <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.06)] bg-[#FAFAFA]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-1.5 text-xs text-[#6e6e73]">
                    <MapPin className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span className="font-mono-data">"dental clinic" · Miami, FL · 10km</span>
                  </div>
                  <div className="btn-btc px-3 py-1.5 text-[10px] font-bold text-white tracking-wide cursor-default">
                    Search
                  </div>
                </div>
              </div>

              {/* Results table */}
              <div className="overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F5F5F7] border-b border-[rgba(0,0,0,0.06)]">
                      <th className="text-left px-4 py-2.5 font-semibold text-[#6e6e73] tracking-wide uppercase text-[10px]">Business</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#6e6e73] tracking-wide uppercase text-[10px]">Email</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#6e6e73] tracking-wide uppercase text-[10px] hidden sm:table-cell">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLeads.map((lead, i) => (
                      <tr
                        key={i}
                        className="border-b border-[rgba(0,0,0,0.04)] hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#1d1d1f] mb-0.5">{lead.name}</div>
                          <div className="text-[#6e6e73] text-[10px] flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />{lead.city}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="font-mono-data truncate max-w-[130px]">{lead.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-[#3d3d3f]">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="font-mono-data">{lead.phone}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer */}
                <div className="px-5 py-3 bg-[#FAFAFA] border-t border-[rgba(0,0,0,0.06)] flex items-center justify-between">
                  <span className="text-[10px] text-[#6e6e73] font-mono-data">60 leads found · 2 min</span>
                  <button className="flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full cursor-default">
                    <Download className="h-3 w-3" /> Export .xlsx
                  </button>
                </div>
              </div>
            </div>

            {/* Floating stat — bottom left */}
            <div className="absolute -bottom-4 -left-4 z-20 bg-white rounded-2xl px-4 py-3 shadow-lg border border-[rgba(0,0,0,0.06)]">
              <div className="text-xs text-[#6e6e73] mb-1">Emails found</div>
              <div className="text-2xl font-bold text-[#1d1d1f]">58<span className="text-blue-600">/60</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
