import { Mail, Linkedin, Twitter } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="border-t border-[#EBEBF0] py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              GlobaLeads
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Find qualified leads in minutes. Extract emails, phones, and WhatsApp contacts automatically.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
                { label: "FAQ", href: "#faq" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
              Contact
            </h4>
            <div className="flex items-center gap-3">
              <a
                href="mailto:hello@globaleads.io"
                className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com"
                className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-[#EBEBF0] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <p>&copy; 2024 GlobaLeads. All rights reserved.</p>
          <p>Built with care for lead generation</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
