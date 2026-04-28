import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";

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
import ErrorBoundary from "@/components/ErrorBoundary";

// Map of plan names to credit limits (for sidebar progress bar)
const PLAN_CREDITS: Record<string, number> = {
  free: 30,
  demo: 30,
  starter: 100,
  growth: 300,
  pro: 700,
};

const AppPage = () => {
  const { user, signOut } = useAuth();
  const { hasProfile, checked: profileChecked, refetch: refetchProfile } = useUserProfile(user?.id);
  const { balance: creditsBalance, plan: creditsPlan, refetch: refetchCredits } = useCredits(user?.id);
  const { history: searchHistory, refetch: refetchHistory } = useSearchHistory(user?.id);
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"search" | "all-leads">("search");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingShown, setOnboardingShown] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Show onboarding for new users (first sign-up) - only once per session
  useEffect(() => {
    if (user && profileChecked && !hasProfile && !onboardingShown) {
      setOnboardingOpen(true);
      setOnboardingShown(true);
    }
  }, [user, profileChecked, hasProfile, onboardingShown]);

  // Handle demo signup, checkout success, and bundle query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('checkout') === 'success') {
      toast({
        title: "Credits added!",
        description: "Your credits have been added to your account.",
      });
      refetchCredits();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // If demo param exists, create a demo user session
    if (params.get('demo') === 'true' && !user) {
      setAuthOpen(true);
      // Remove demo param from URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('demo');
      window.history.replaceState({}, '', newUrl.pathname);
    }

    // If bundle param exists and user is logged in, trigger checkout
    const bundleParam = params.get('bundle');
    if (bundleParam && user && !checkoutLoading) {
      handleBuyCredits(bundleParam);
      // Remove bundle param from URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('bundle');
      window.history.replaceState({}, '', newUrl.pathname);
    }
  }, [user]);

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

  const handleBuyCredits = async (bundleKey: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { bundleKey, userId: user.id },
      });

      if (error || !data?.url) {
        toast({
          title: "Checkout error",
          description: error?.message || "Failed to create checkout session. Please try again.",
          variant: "destructive",
        });
        setCheckoutLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        title: "Checkout error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: "#080808" }}>
      {/* Dot-matrix ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)",
        }}
      />

      {/* ── App Header ── */}
      <header
        className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{ background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* Logo — dot-matrix style matching landing page */}
          <div className="flex items-center gap-4">
            <span
              className="font-black text-white tracking-tight inline-flex items-center gap-0.5"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: "14px" }}
            >
              GLOBALEADS
              <span
                className="bg-white text-[#080808] font-black inline-flex items-center justify-center"
                style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "2px", lineHeight: 1 }}
              >
                22
              </span>
            </span>
            {/* System status */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="label-mono">SYSTEM ONLINE</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="hidden sm:block label-mono text-white/50 max-w-[200px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 label-mono text-white/40 hover:text-white/80 transition-colors"
                >
                  <LogOut className="h-3 w-3" /> SIGN OUT
                </button>
              </>
            ) : (
              <button
                className="btn-btc px-5 py-2.5 text-[11px]"
                onClick={() => setAuthOpen(true)}
              >
                SIGN IN
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
            onBuyCredits={() => window.location.href = 'https://globaleads22.com/#pricing'}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Tool Content */}
        <main className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
          <ErrorBoundary>
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
          </ErrorBoundary>
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
