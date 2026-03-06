import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
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
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-[rgba(0,0,0,0.08)] shadow-[0_1px_12px_rgba(0,0,0,0.06)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.35)]">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <span className="font-bold text-[#1d1d1f] text-[15px] tracking-tight">GlobaLeads</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 ml-auto mr-6">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <span className="text-sm text-[#6e6e73] max-w-[140px] truncate hidden lg:block font-mono-data">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 text-sm font-semibold text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)] rounded-full transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onGetStarted}
                className="btn-btc px-5 py-2 text-sm font-bold text-white"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-[rgba(0,0,0,0.08)] bg-white/95 backdrop-blur-xl px-4 pb-5 pt-3 space-y-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)] transition-colors"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { onGetStarted(); setMenuOpen(false); }}
            className="btn-btc mt-2 w-full px-5 py-3 text-sm font-bold text-white"
          >
            Get Started Free
          </button>
        </div>
      )}
    </header>
  );
};

export default NavBar;
