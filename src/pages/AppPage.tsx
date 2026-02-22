import { useState, useEffect, useRef } from "react";
import { Target, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCredits } from "@/hooks/useCredits";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import LeadGeneratorSection from "@/components/landing/LeadGeneratorSection";
import AuthModal from "@/components/auth/AuthModal";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import AppSidebar from "@/components/app/AppSidebar";

const AppPage = () => {
  const { user, signOut } = useAuth();
  const { hasProfile, loading: profileLoading } = useUserProfile(user?.id);
  const { balance: creditsBalance, plan: creditsPlan, refetch: refetchCredits } = useCredits(user?.id);
  const { history: searchHistory, refetch: refetchHistory } = useSearchHistory(user?.id);
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  // Show onboarding for new users (first sign-up)
  useEffect(() => {
    if (user && !profileLoading && !hasProfile) {
      setOnboardingOpen(true);
    }
  }, [user, profileLoading, hasProfile]);

  // Handle search completion - refresh credits and history
  const handleSearchComplete = async () => {
    await Promise.all([refetchCredits(), refetchHistory()]);
  };

  return (
    <div className="min-h-screen bg-[#030304] flex flex-col">

      {/* ── App Header ── */}
      <header
        className="sticky top-0 z-50 border-b border-white/10 bg-[#0F1115]/95 backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F7931A]/40 bg-[#F7931A]/10"
              style={{ boxShadow: "0 0 12px rgba(247,147,26,0.2)" }}
            >
              <Target className="h-4 w-4 text-[#F7931A]" strokeWidth={2} />
            </div>
            <span className="font-heading font-bold text-white tracking-tight">
              GlobaLeads<span className="text-[#F7931A]">22</span>
            </span>
            {/* System status */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                Online
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isDev && (
              <button
                onClick={() => setDevMode(!devMode)}
                className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider rounded-full transition-all border"
                style={
                  devMode
                    ? { background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", color: "#FFD600" }
                    : { border: "1px solid rgba(255,255,255,0.2)", color: "#94A3B8" }
                }
              >
                {devMode ? "⚡ Dev Mode ON" : "⚡ Dev Mode"}
              </button>
            )}

            {user ? (
              <>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white bg-gradient-to-br from-[#F7931A] to-[#EA580C]"
                  style={{ boxShadow: "0 0 12px rgba(247,147,26,0.3)" }}
                >
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden font-mono text-xs text-[#94A3B8] sm:block max-w-[180px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] hover:text-[#F7931A] transition-colors"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <button
                className="btn-btc px-5 py-2.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest text-white"
                onClick={() => setAuthOpen(true)}
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content with Sidebar ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {user && (
          <AppSidebar
            creditsUsed={0}
            creditsTotal={creditsBalance}
            history={searchHistory}
            onSelectEntry={() => {}}
            onNewSearch={() => {}}
            onClearHistory={() => {}}
          />
        )}

        {/* Tool Content */}
        <main className="flex-1 overflow-y-auto">
          <LeadGeneratorSection
            onOpenAuth={() => setAuthOpen(true)}
            devBypass={devMode}
            onSearchComplete={handleSearchComplete}
          />
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {user && (
        <OnboardingModal
          open={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default AppPage;
