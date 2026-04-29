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
import GlobaLeadsLogo from "@/components/brand/GlobaLeadsLogo";
import { Button } from "@/components/ui/button";

const PLAN_CREDITS: Record<string, number> = {
  free: 30,
  demo: 30,
  starter: 100,
  growth: 300,
  pro: 700,
};

const isAppSubdomain = window.location.hostname.startsWith("app.");

const AppPage = () => {
  const { user, loading, signOut } = useAuth();
  const { hasProfile, checked: profileChecked, refetch: refetchProfile } = useUserProfile(user?.id);
  const { balance: creditsBalance, plan: creditsPlan, refetch: refetchCredits } = useCredits(user?.id);
  const { history: searchHistory, refetch: refetchHistory } = useSearchHistory(user?.id);
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"search" | "all-leads">("search");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingShown, setOnboardingShown] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // On the app subdomain, auto-open sign-in modal for unauthenticated users
  useEffect(() => {
    if (isAppSubdomain && !loading && !user) {
      setAuthOpen(true);
    }
  }, [loading, user]);

  useEffect(() => {
    if (user && profileChecked && !hasProfile && !onboardingShown) {
      setOnboardingOpen(true);
      setOnboardingShown(true);
    }
  }, [user, profileChecked, hasProfile, onboardingShown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('checkout') === 'success') {
      toast({
        title: "Credits added!",
        description: "Your credits have been added to your account.",
      });
      refetchCredits();
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (params.get('demo') === 'true' && !user) {
      setAuthOpen(true);
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('demo');
      window.history.replaceState({}, '', newUrl.pathname);
    }

    const bundleParam = params.get('bundle');
    if (bundleParam && user && !checkoutLoading) {
      handleBuyCredits(bundleParam);
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('bundle');
      window.history.replaceState({}, '', newUrl.pathname);
    }
  }, [user]);

  const handleSearchComplete = async () => {
    await Promise.all([refetchCredits(), refetchHistory()]);
  };

  const handleSelectEntry = (entry: any) => {
    const event = new CustomEvent('loadSearch', { detail: { keyword: entry.keyword, location: entry.location } });
    window.dispatchEvent(event);

    setTimeout(() => {
      const searchForm = document.querySelector('input[placeholder*="Dental clinics"]');
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
    const searchForm = document.querySelector('input[placeholder*="Dental clinics"]');
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
    <div className="h-screen flex flex-col relative overflow-hidden bg-black text-[#EFEDE6]">
      {/* ── App Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#EFEDE6]/[0.14] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

          <div className="flex items-center gap-4">
            <GlobaLeadsLogo size="md" theme="dark" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5FF3D]/50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F5FF3D]" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Live prospecting workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 border border-[#EFEDE6]/10 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F5FF3D]" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6]">
                    {creditsBalance} credits
                  </span>
                </div>
                <span className="hidden sm:block font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] max-w-[200px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] hover:text-[#EFEDE6] transition-colors"
                >
                  <LogOut className="h-3 w-3" /> SIGN OUT
                </button>
              </>
            ) : (
              <Button variant="accent" size="sm" onClick={() => setAuthOpen(true)}>
                SIGN IN
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content with Sidebar ── */}
      <div className="flex flex-1 overflow-hidden">
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

        <main className="flex-1 overflow-y-auto flex flex-col">
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
