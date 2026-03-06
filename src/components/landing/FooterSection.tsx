import { Mail, Twitter, Linkedin, ArrowRight } from "lucide-react";

const FooterSection = () => (
  <footer className="border-t border-white/[0.06]" style={{ background: "#080808" }}>

    {/* CTA Banner */}
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
      <div className="border border-white/[0.08] px-8 sm:px-16 py-12 text-center relative overflow-hidden" style={{ borderRadius: "4px" }}>
        {/* Subtle glow */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)" }}
        />
        <div className="relative">
          <div className="label-mono text-white/25 mb-4">// EXECUTE ORDER</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
            READY TO FIND YOUR<br />NEXT 1,000 LEADS?
          </h2>
          <p className="label-mono text-white/30 mb-8">
            START WITH 30 FREE CREDITS. NO CREDIT CARD REQUIRED.
          </p>
          <a
            href="/app?demo=true"
            className="inline-flex items-center gap-2 btn-btc px-8 py-3.5 text-[11px] group"
          >
            START FREE — 30 CREDITS
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </div>

    {/* Footer links */}
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-12 border-t border-white/[0.04]">
      <div className="grid gap-10 md:grid-cols-4 py-12">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="font-black text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px" }}>
              GLOBALEADS<span className="inline-flex items-center justify-center bg-white text-[#080808] ml-1 px-1" style={{ borderRadius: "2px", fontSize: "11px" }}>22</span>
            </span>
          </div>
          <p className="font-mono-data text-[11px] text-white/25 leading-relaxed">
            Find, extract, and organize qualified leads worldwide in minutes.
          </p>
        </div>

        <div>
          <h4 className="label-mono text-white/30 mb-4">PRODUCT</h4>
          <ul className="space-y-2.5">
            {["Features", "How It Works", "Pricing", "FAQ"].map((item) => (
              <li key={item}>
                <a href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="font-mono-data text-[11px] text-white/25 hover:text-white/60 transition-colors">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="label-mono text-white/30 mb-4">LEGAL</h4>
          <ul className="space-y-2.5">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
            ].map((link) => (
              <li key={link.label}>
                <a href={link.href} className="font-mono-data text-[11px] text-white/25 hover:text-white/60 transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="label-mono text-white/30 mb-4">CONNECT</h4>
          <div className="flex items-center gap-2">
            {[
              { icon: Mail, href: "mailto:hello@globaleads.io", label: "Email" },
              { icon: Twitter, href: "#", label: "Twitter" },
              { icon: Linkedin, href: "#", label: "LinkedIn" },
            ].map(({ icon: Icon, href, label }) => (
              <a key={label} href={href}
                className="flex h-8 w-8 items-center justify-center border border-white/10 text-white/30 hover:text-white/70 hover:border-white/30 transition-colors"
                style={{ borderRadius: "2px" }}
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="label-mono text-white/20">© 2024 GLOBALEADS22. ALL RIGHTS RESERVED.</p>
        <p className="label-mono text-white/20">TRUSTED BY SALES TEAMS IN 47 COUNTRIES.</p>
      </div>
    </div>
  </footer>
);

export default FooterSection;
