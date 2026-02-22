import { Twitter, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import GlobaLeadsLogo from "@/components/icons/GlobaLeadsLogo";

const FooterSection = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#030304]">
      {/* Ambient orange glow at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#F7931A] opacity-[0.04] blur-[60px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7931A]/15 border border-[#F7931A]/40 shadow-[0_0_12px_rgba(247,147,26,0.2)]">
                <GlobaLeadsLogo className="h-5 w-5 text-[#F7931A]" size={20} />
              </div>
              <span className="font-heading font-bold text-white tracking-tight">
                GlobaLeads<span className="text-[#F7931A]">22</span>
              </span>
            </div>
            <p className="text-sm text-[#94A3B8] leading-relaxed max-w-xs mb-5">
              The fastest way to build B2B lead lists from Google Maps. Search, extract, export.
            </p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="font-mono-data text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-400">
                System Operational
              </span>
            </div>

            {/* Social icons */}
            <div className="flex gap-2.5">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8] hover:text-[#F7931A] transition-all duration-300 border border-white/10 bg-white/5 hover:border-[#F7931A]/50 hover:bg-[#F7931A]/10"
                title="Twitter"
              >
                <Twitter className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://github.com/KoiGi01/web-lead-scoop"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8] hover:text-[#F7931A] transition-all duration-300 border border-white/10 bg-white/5 hover:border-[#F7931A]/50 hover:bg-[#F7931A]/10"
                title="GitHub"
              >
                <Github className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8] hover:text-[#F7931A] transition-all duration-300 border border-white/10 bg-white/5 hover:border-[#F7931A]/50 hover:bg-[#F7931A]/10"
                title="LinkedIn"
              >
                <Linkedin className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="mb-5 font-mono-data text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]/60">
              Product
            </p>
            <ul className="space-y-3">
              <li><a href="#features" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="text-sm text-[#94A3B8] hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="mb-5 font-mono-data text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]/60">
              Support
            </p>
            <ul className="space-y-3">
              <li><a href="https://github.com/KoiGi01/web-lead-scoop/wiki" target="_blank" rel="noopener noreferrer" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#faq" className="text-sm text-[#94A3B8] hover:text-white transition-colors">FAQ</a></li>
              <li><a href="mailto:support@globaleads22.com" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="https://status.globaleads22.com" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Status</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-5 font-mono-data text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]/60">
              Legal
            </p>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/terms" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Refund Policy</Link></li>
              <li><a href="mailto:privacy@globaleads22.com" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="font-mono-data text-[10px] text-[#94A3B8]/50 uppercase tracking-wider">
            © {currentYear} GlobaLeads22. All rights reserved.
          </p>
          <p className="font-mono-data text-[10px] text-[#94A3B8]/50 uppercase tracking-wider">
            Built for outreach teams worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
