import { useState, useEffect } from "react";
import { Target, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface NavBarProps {
  onGetStarted: () => void;
  onOpenAuth: () => void;
}

const NavBar = ({ onGetStarted, onOpenAuth }: NavBarProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Features",     href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing",      href: "#pricing" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#e0e5ec] border-b border-[#babecc] shadow-[0_2px_8px_#babecc,-0_-1px_0_#ffffff]"
          : "bg-[#e0e5ec]/95 border-b border-[#babecc]/60"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 group-hover:-translate-y-px"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Target className="h-4 w-4 text-[#ff4757]" strokeWidth={2} />
          </div>
          <span className="font-bold text-[#2d3436] text-[15px] tracking-tight text-debossed">
            GlobaLeads22
          </span>
        </a>

        {/* System status — desktop only */}
        <div className="hidden lg:flex items-center gap-1.5 ml-6">
          <div className="h-2 w-2 led-green" />
          <span className="font-mono-data text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            System Online
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-auto mr-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 rounded-md text-sm font-semibold text-[#4a5568] hover:text-[#2d3436] transition-colors tracking-wide uppercase text-[11px]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff4757] text-white text-xs font-bold"
                style={{ boxShadow: "var(--shadow-sharp)" }}
              >
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-sm text-[#4a5568] max-w-[140px] truncate hidden lg:block font-mono-data">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider text-[#4a5568] hover:text-[#ff4757] transition-colors"
              >
                <LogOut className="h-3 w-3" /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-press relative px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-white bg-[#ff4757] transition-all hover:brightness-110"
              style={{
                boxShadow: "4px 4px 8px rgba(166,50,60,0.35), -2px -2px 6px rgba(255,100,110,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              Sign In / Sign Up
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-[#4a5568] hover:text-[#2d3436] transition-colors btn-press"
          style={{ boxShadow: "var(--shadow-card)" }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#babecc] bg-[#e0e5ec] px-4 pb-5 pt-3 animate-fade-in">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-3 rounded-lg text-xs font-bold uppercase tracking-widest text-[#4a5568] hover:text-[#2d3436] transition-colors"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { onGetStarted(); setMenuOpen(false); }}
            className="btn-press mt-3 w-full px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-widest text-white bg-[#ff4757]"
            style={{ boxShadow: "4px 4px 8px rgba(166,50,60,0.35), -2px -2px 6px rgba(255,100,110,0.3)" }}
          >
            Start Free Trial
          </button>
        </div>
      )}
    </header>
  );
};

export default NavBar;
