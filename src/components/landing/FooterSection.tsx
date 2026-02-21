import { Target, Twitter, Github, Linkedin } from "lucide-react";

const FooterSection = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30">
                <Target className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">GlobaLeads22</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The fastest way to build B2B lead lists from Google Maps. Search, extract, export.
            </p>
            <div className="flex gap-3 mt-5">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-sm font-semibold text-foreground">Product</p>
            <ul className="space-y-2.5">
              {["Features", "Pricing", "How It Works", "Changelog"].map((l) => (
                <li key={l}>
                  <a href={`#${l.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="mb-4 text-sm font-semibold text-foreground">Support</p>
            <ul className="space-y-2.5">
              {["Documentation", "FAQ", "Contact Us", "Status"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-sm font-semibold text-foreground">Legal</p>
            <ul className="space-y-2.5">
              {["Privacy Policy", "Terms of Service", "Refund Policy", "Cookie Policy"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {currentYear} GlobaLeads22. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for outreach teams worldwide 🌍
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
