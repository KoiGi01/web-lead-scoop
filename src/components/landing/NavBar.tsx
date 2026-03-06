import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import GlobaLeadsLogo from "@/components/icons/GlobaLeadsLogo";

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
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-[0_2px_20px_-4px_rgba(15,23,42,0.08)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7931A]/15 border border-[#F7931A]/40 transition-all duration-200 group-hover:shadow-[0_0_16px_rgba(247,147,26,0.4)]">
            <GlobaLeadsLogo className="h-5 w-5 text-[#F7931A]" size={24} />
          </div>
          <span className="font-heading font-bold text-slate-900 text-[15px] tracking-tight">
            GlobaLeads<span className="text-[#F7931A]">22</span>
          </span>
        </a>

        {/* System status — desktop only */}
        <div className="hidden lg:flex items-center gap-2 ml-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="font-mono-data text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            System Online
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-auto mr-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 rounded-md text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors tracking-wider uppercase"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#EA580C] to-[#F7931A] text-white text-xs font-bold">
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-sm text-slate-500 max-w-[140px] truncate hidden lg:block font-mono-data">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#F7931A] transition-colors"
              >
                <LogOut className="h-3 w-3" /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-btc px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
            >
              Sign In / Sign Up
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 transition-colors border border-slate-200"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200/70 bg-white/95 backdrop-blur-xl px-4 pb-5 pt-3 animate-fade-in">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-3 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { onGetStarted(); setMenuOpen(false); }}
            className="btn-btc mt-3 w-full px-5 py-3 text-xs font-bold uppercase tracking-widest text-white"
          >
            Start Free Trial
          </button>
        </div>
      )}
    </header>
  );
};

export default NavBar;
