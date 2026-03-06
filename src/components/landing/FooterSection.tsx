import { Mail, Twitter, Linkedin, ArrowRight } from "lucide-react";

const FooterSection = () => {
  return (
    <footer style={{ background: "#F5F5F7" }} className="border-t border-[rgba(0,0,0,0.06)]">

      {/* CTA Banner */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="rounded-[24px] bg-[#1d1d1f] px-8 sm:px-16 py-12 text-center relative overflow-hidden">
          {/* Subtle blue glow inside */}
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.5) 0%, transparent 60%)" }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
              Ready to find your next 1,000 leads?
            </h2>
            <p className="text-[#86868b] mb-8 text-lg">
              Start with 30 free credits. No credit card required.
            </p>
            <a
              href="/app?demo=true"
              className="inline-flex items-center gap-2 bg-white text-[#1d1d1f] font-bold text-sm px-7 py-3.5 rounded-full hover:bg-[#F5F5F7] transition-colors group"
            >
              Try Free Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer links */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-12">
        <div className="grid gap-10 md:grid-cols-4 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <span className="font-bold text-[#1d1d1f] text-sm">GlobaLeads</span>
            </div>
            <p className="text-sm text-[#6e6e73] leading-relaxed">
              Find, extract, and organize qualified leads worldwide in minutes.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-widest mb-4">Product</h4>
            <ul className="space-y-2.5">
              {["Features", "How It Works", "Pricing", "FAQ"].map((item) => (
                <li key={item}>
                  <a href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-widest mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-widest mb-4">Connect</h4>
            <div className="flex items-center gap-2">
              {[
                { icon: Mail, href: "mailto:hello@globaleads.io", label: "Email" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Linkedin, href: "#", label: "LinkedIn" },
              ].map(({ icon: Icon, href, label }) => (
                <a key={label} href={href}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[rgba(0,0,0,0.08)] text-[#6e6e73] hover:text-[#1d1d1f] hover:border-[rgba(0,0,0,0.15)] transition-colors shadow-sm"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[rgba(0,0,0,0.06)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#6e6e73]">© 2024 GlobaLeads. All rights reserved.</p>
          <p className="text-xs text-[#6e6e73]">Trusted by sales teams in 47 countries.</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
