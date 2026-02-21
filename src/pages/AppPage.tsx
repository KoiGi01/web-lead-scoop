import { useState } from "react";
import { Target, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LeadGeneratorSection from "@/components/landing/LeadGeneratorSection";
import AuthModal from "@/components/auth/AuthModal";

const AppPage = () => {
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  return (
    <div className="min-h-screen bg-[#e0e5ec] flex flex-col">

      {/* ── App Header ── */}
      <header
        className="sticky top-0 z-50 border-b border-[#babecc]"
        style={{ background: "#e0e5ec", boxShadow: "0 2px 8px #babecc, 0 -1px 0 #ffffff" }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <Target className="h-4 w-4 text-[#ff4757]" strokeWidth={2} />
            </div>
            <span className="font-bold text-[#2d3436] tracking-tight" style={{ textShadow: "0 1px 0 #ffffff" }}>
              GlobaLeads22
            </span>
            {/* System status */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              <div className="h-1.5 w-1.5 led-green" />
              <span className="font-mono-data text-[9px] font-bold uppercase tracking-widest text-emerald-700">
                Online
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isDev && (
              <button
                onClick={() => setDevMode(!devMode)}
                className="btn-press rounded-full px-3 py-1.5 font-mono-data text-[10px] font-bold uppercase tracking-wider transition-all"
                style={
                  devMode
                    ? { background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#b45309", boxShadow: "var(--shadow-recessed)" }
                    : { boxShadow: "var(--shadow-recessed)", color: "#4a5568" }
                }
              >
                {devMode ? "⚡ Dev Mode ON" : "⚡ Dev Mode"}
              </button>
            )}

            {user ? (
              <>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white bg-[#ff4757]"
                  style={{ boxShadow: "var(--shadow-sharp)" }}
                >
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden font-mono-data text-xs text-[#4a5568] sm:block max-w-[180px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono-data text-[10px] font-bold uppercase tracking-wider text-[#4a5568] hover:text-[#ff4757] transition-colors"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <button
                className="btn-press px-5 py-2 rounded-lg font-mono-data text-[10px] font-bold uppercase tracking-widest text-white bg-[#ff4757]"
                style={{ boxShadow: "4px 4px 8px rgba(166,50,60,0.35), -2px -2px 6px rgba(255,100,110,0.3)" }}
                onClick={() => setAuthOpen(true)}
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Tool Content ── */}
      <main className="flex-1">
        <LeadGeneratorSection onOpenAuth={() => setAuthOpen(true)} devBypass={devMode} />
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};

export default AppPage;
