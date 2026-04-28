import { Mail, Twitter, Linkedin, ArrowRight } from "lucide-react";
import GlobaLeadsLogo from "@/components/brand/GlobaLeadsLogo";
import { Button } from "@/components/ui/button";

const marqueeItems = [
  "TRUSTED BY SALES TEAMS IN 47 COUNTRIES",
  "34,000+ LEADS GENERATED",
  "NO CREDIT CARD REQUIRED",
  "EXTRACT EMAILS · PHONES · WHATSAPP",
  "EXPORT TO EXCEL IN ONE CLICK",
  "GLOBAL COVERAGE · 47 COUNTRIES",
];

const FooterSection = () => (
  <footer className="border-t border-petrol-900/[0.10] bg-petrol-900">

    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-8">
      <div
        className="border border-cream-100/[0.08] px-8 sm:px-16 py-14 text-center relative overflow-hidden"
        style={{ borderRadius: "4px" }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(236,220,201,0.3) 0%, transparent 65%)" }}
        />
        <div className="relative">
          <div className="font-mono text-[10px] uppercase tracking-widest text-cream-100/25 mb-4">// EXECUTE ORDER</div>
          <h2
            className="font-black text-cream-100 mb-3 tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 4.5vw, 52px)" }}
          >
            READY TO FIND YOUR<br />NEXT 1,000 LEADS?
          </h2>
          <p className="font-body text-cream-100/40 text-[15px] mb-8">
            Start with 30 free credits. No credit card required.
          </p>

          <div className="mb-8 overflow-hidden border-y border-cream-100/[0.08] py-2.5">
            <div className="flex gap-0 animate-marquee whitespace-nowrap">
              {[...marqueeItems, ...marqueeItems].map((item, i) => (
                <span key={i} className="font-mono text-[10px] uppercase tracking-widest text-cream-100/25 px-6">
                  · {item}
                </span>
              ))}
            </div>
          </div>

          <Button
            variant="accent"
            size="lg"
            className="inline-flex items-center gap-2 group"
            onClick={() => { window.location.href = "/app?demo=true"; }}
          >
            START FREE — 30 CREDITS
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-6 border-t border-cream-100/[0.06] mt-8">
      <div className="grid gap-10 md:grid-cols-4 py-12">
        <div>
          <div className="mb-4">
            <GlobaLeadsLogo size="sm" theme="dark" />
          </div>
          <p className="font-body text-[13px] text-cream-100/30 leading-relaxed">
            Find, extract, and organize qualified leads worldwide in minutes.
          </p>
        </div>

        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-cream-100/30 mb-4">PRODUCT</h4>
          <ul className="space-y-2.5">
            {["Features", "How It Works", "Pricing", "FAQ"].map((item) => (
              <li key={item}>
                <a
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="font-body text-[13px] text-cream-100/30 hover:text-wine-700 transition-colors duration-150"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-cream-100/30 mb-4">LEGAL</h4>
          <ul className="space-y-2.5">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
            ].map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="font-body text-[13px] text-cream-100/30 hover:text-wine-700 transition-colors duration-150"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-cream-100/30 mb-4">CONNECT</h4>
          <div className="flex items-center gap-2">
            {[
              { icon: Mail,     href: "mailto:hello@globaleads.io", label: "Email" },
              { icon: Twitter,  href: "#",                          label: "Twitter" },
              { icon: Linkedin, href: "#",                          label: "LinkedIn" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                className="flex h-8 w-8 items-center justify-center border border-cream-100/[0.12] text-cream-100/30 hover:text-wine-700 hover:border-wine-700/50 transition-all duration-150"
                style={{ borderRadius: "2px" }}
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-cream-100/[0.06] pt-4 pb-2 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap" style={{ animationDuration: "35s" }}>
          {[...Array(4)].map((_, i) => (
            <span key={i} className="font-mono text-[10px] uppercase tracking-widest text-cream-100/[0.15] px-6">
              GLOBALEADS22 · V2.4.1 · AI LEAD INTELLIGENCE ACTIVE · SYSTEM ONLINE · EXTRACT · ORGANIZE · OUTREACH ·
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-cream-100/[0.06] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-cream-100/[0.18]">© 2024 GLOBALEADS22. ALL RIGHTS RESERVED.</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-cream-100/[0.18]">TRUSTED BY SALES TEAMS IN 47 COUNTRIES.</p>
      </div>
    </div>
  </footer>
);

export default FooterSection;
