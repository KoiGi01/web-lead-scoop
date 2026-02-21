import { Target, Twitter, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const FooterSection = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden border-t border-black/20"
      style={{ background: "#2d3436" }}
    >
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
        }}
      />
      {/* Top highlight edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "rgba(255,71,87,0.15)", border: "1px solid rgba(255,71,87,0.3)", boxShadow: "0 0 12px rgba(255,71,87,0.3)" }}
              >
                <Target className="h-4 w-4 text-[#ff4757]" />
              </div>
              <span className="font-bold text-white tracking-tight text-embossed">GlobaLeads22</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs mb-5">
              The fastest way to build B2B lead lists from Google Maps. Search, extract, export.
            </p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mb-5">
              <div className="h-2 w-2 led-green flex-shrink-0" />
              <span className="font-mono-data text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-400">
                System Operational
              </span>
            </div>

            {/* Social icons */}
            <div className="flex gap-2.5">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:text-[#ff4757] transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="mb-5 font-mono-data text-[10px] font-bold uppercase tracking-widest text-white/40">
              Product
            </p>
            <ul className="space-y-3">
              {["Features", "Pricing", "How It Works", "Changelog"].map((l) => (
                <li key={l}>
                  <a
                    href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="mb-5 font-mono-data text-[10px] font-bold uppercase tracking-widest text-white/40">
              Support
            </p>
            <ul className="space-y-3">
              {["Documentation", "FAQ", "Contact Us", "Status"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-white/50 hover:text-white transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-5 font-mono-data text-[10px] font-bold uppercase tracking-widest text-white/40">
              Legal
            </p>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="text-sm text-white/50 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-white/50 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><a href="#" className="text-sm text-white/50 hover:text-white transition-colors">Refund Policy</a></li>
              <li><a href="#" className="text-sm text-white/50 hover:text-white transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="font-mono-data text-[10px] text-white/30 uppercase tracking-wider">
            © {currentYear} GlobaLeads22. All rights reserved.
          </p>
          <p className="font-mono-data text-[10px] text-white/30 uppercase tracking-wider">
            Built for outreach teams worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
