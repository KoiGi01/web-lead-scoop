import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DotMatrixLogo from "./DotMatrixLogo";

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
    { label: "Features",    href: "#features" },
    { label: "How It Works",href: "#how-it-works" },
    { label: "Pricing",     href: "#pricing" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.06]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center">
          <DotMatrixLogo size="md" />
        </a>

        {/* Status indicator */}
        <div className="hidden lg:flex items-center gap-2 ml-6">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="label-mono">SYSTEM ONLINE</span>
        </div>

        <nav className="hidden md:flex items-center gap-0 ml-auto mr-6">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-[11px] font-bold tracking-[0.12em] uppercase text-white/40 hover:text-white/90 transition-colors"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="label-mono text-white/50">{user.email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 label-mono text-white/40 hover:text-white/80 transition-colors"
              >
                <LogOut className="h-3 w-3" /> SIGN OUT
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onOpenAuth}
                className="label-mono text-white/40 hover:text-white/80 transition-colors px-3 py-2"
              >
                SIGN IN
              </button>
              <button
                onClick={onGetStarted}
                className="btn-btc px-5 py-2.5 text-[11px]"
              >
                GET STARTED
              </button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-white/50 hover:text-white transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#080808] border-t border-white/[0.06] px-4 pb-5 pt-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-2 py-3 label-mono text-white/40 hover:text-white transition-colors border-b border-white/[0.04]"
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { onGetStarted(); setMenuOpen(false); }}
            className="btn-btc mt-4 w-full py-3 text-[11px]"
          >
            GET STARTED FREE
          </button>
        </div>
      )}
    </header>
  );
};

export default NavBar;
