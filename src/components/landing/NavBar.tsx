import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import GlobaLeadsLogo from "@/components/brand/GlobaLeadsLogo";
import { Button } from "@/components/ui/button";

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
    { label: "Features",     href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing",      href: "#pricing" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-cream-50/95 backdrop-blur-sm border-b border-petrol-900/[0.08]"
          : "bg-cream-50/80 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center">
          <GlobaLeadsLogo size="md" theme="light" />
        </a>

        <div className="hidden lg:flex items-center gap-2 ml-6">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-wine-700 opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-wine-700" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">SYSTEM ONLINE</span>
        </div>

        <nav className="hidden md:flex items-center gap-0 ml-auto mr-6">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-[11px] font-bold font-mono tracking-[0.12em] uppercase text-petrol-900/60 hover:text-petrol-900 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/50">{user.email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-petrol-900/40 hover:text-petrol-900/80 transition-colors"
              >
                <LogOut className="h-3 w-3" /> SIGN OUT
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onOpenAuth}
                className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/40 hover:text-petrol-900/80 transition-colors px-3 py-2"
              >
                SIGN IN
              </button>
              <Button variant="primary" size="sm" onClick={onGetStarted}>
                GET STARTED
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-petrol-900/50 hover:text-petrol-900 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-cream-50 border-t border-petrol-900/[0.08] px-4 pb-5 pt-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-2 py-3 font-mono text-[10px] uppercase tracking-widest text-petrol-900/40 hover:text-petrol-900 transition-colors border-b border-petrol-900/[0.06]"
            >
              {l.label}
            </a>
          ))}
          <Button
            variant="primary"
            size="sm"
            className="mt-4 w-full py-3"
            onClick={() => { onGetStarted(); setMenuOpen(false); }}
          >
            GET STARTED FREE
          </Button>
        </div>
      )}
    </header>
  );
};

export default NavBar;
