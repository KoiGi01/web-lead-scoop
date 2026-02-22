import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import GlobaLeadsLogo from "@/components/icons/GlobaLeadsLogo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCredits } from "@/hooks/useCredits";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { toast } from "@/hooks/use-toast";
import LeadGeneratorSection from "@/components/landing/LeadGeneratorSection";
import AuthModal from "@/components/auth/AuthModal";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import ViewAllLeads from "@/components/landing/ViewAllLeads";
import AppSidebar from "@/components/app/AppSidebar";

// Map of plan names to credit limits
const PLAN_CREDITS: Record<string, number> = {
  free: 50,
  starter: 200,
  pro: 500,
};

const AppPage = () => {
  const { user, signOut } = useAuth();
  const { hasProfile, loading: profileLoading, refetch: refetchProfile } = useUserProfile(user?.id);
  const { balance: creditsBalance, plan: creditsPlan, refetch: refetchCredits } = useCredits(user?.id);
  const { history: searchHistory, refetch: refetchHistory } = useSearchHistory(user?.id);
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"search" | "all-leads">("search");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingShown, setOnboardingShown] = useState(false);

  // Show onboarding for new users (first sign-up) - only once per session
  useEffect(() => {
    if (user && !profileLoading && !hasProfile && !onboardingShown) {
      setOnboardingOpen(true);
      setOnboardingShown(true);
    }
  }, [user, profileLoading, hasProfile, onboardingShown]);

  // Handle search completion - refresh credits and history
  const handleSearchComplete = async () => {
    await Promise.all([refetchCredits(), refetchHistory()]);
  };

  // Handle sidebar callbacks
  const handleSelectEntry = (entry: any) => {
    // Dispatch custom event with search data
    const event = new CustomEvent('loadSearch', { detail: { keyword: entry.keyword, location: entry.location } });
    window.dispatchEvent(event);

    // Scroll to search form
    setTimeout(() => {
      const searchForm = document.querySelector('input[placeholder*="plumber"]');
      if (searchForm) {
        searchForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    toast({
      title: "Search loaded",
      description: `Reloading "${entry.keyword}" in ${entry.location}`,
    });
  };

  const handleNewSearch = () => {
    // Scroll to search form
    const searchForm = document.querySelector('input[placeholder*="plumber"]');
    if (searchForm) {
      searchForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('search_sessions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      await refetchHistory();
      toast({
        title: "History cleared",
        description: "All search history has been deleted",
      });
    } catch (err) {
      console.error('Failed to clear history:', err);
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewAllLeads = () => {
    setViewMode("all-leads");
  };

  const handleOnboardingClose = async () => {
    setOnboardingOpen(false);
    // Refetch profile to update hasProfile state after onboarding completes
    await refetchProfile();
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F7931A]/40 bg-[#F7931A]/10"
              style={{ boxShadow: "0 0 12px rgba(247,147,26,0.2)" }}
            >
              <GlobaLeadsLogo className="h-6 w-6 text-[#F7931A]" size={28} />
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
            creditsUsed={Math.max(0, (PLAN_CREDITS[creditsPlan] ?? 50) - creditsBalance)}
            creditsTotal={PLAN_CREDITS[creditsPlan] ?? 50}
            history={searchHistory}
            onSelectEntry={handleSelectEntry}
            onNewSearch={handleNewSearch}
            onClearHistory={handleClearHistory}
            onViewAllLeads={handleViewAllLeads}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Tool Content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {viewMode === "search" ? (
            <LeadGeneratorSection
              onOpenAuth={() => setAuthOpen(true)}
              onSearchComplete={handleSearchComplete}
              viewMode="search"
            />
          ) : (
            <ViewAllLeads
              userId={user?.id}
              onBackToSearch={() => setViewMode("search")}
            />
          )}
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {user && (
        <OnboardingModal
          open={onboardingOpen}
          onClose={handleOnboardingClose}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default AppPage;
