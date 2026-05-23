import { useState, useEffect } from "react";
import { CreditCard, LogOut, Moon, Settings, Sun, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCredits } from "@/hooks/useCredits";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAdmin } from "@/hooks/useAdmin";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import type { SearchHistoryEntry } from "@/hooks/useSearchHistory";
import { getIncludedCredits } from "@/lib/entitlements";
import { toast } from "@/hooks/use-toast";
import LeadGeneratorSection from "@/components/landing/LeadGeneratorSection";
import AuthModal from "@/components/auth/AuthModal";
import CreditsModal from "@/components/app/CreditsModal";
import EditProfileModal from "@/components/app/EditProfileModal";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import ViewAllLeads from "@/components/landing/ViewAllLeads";
import AppSidebar from "@/components/app/AppSidebar";
import type { AppSidebarView } from "@/components/app/AppSidebar";
import AdminDashboard from "@/components/app/AdminDashboard";
import SavedSearches from "@/components/app/SavedSearches";
import SettingsCredits from "@/components/app/SettingsCredits";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobaLeadsLogo from "@/components/brand/GlobaLeadsLogo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const isAppSubdomain = window.location.hostname.startsWith("app.");
const devMode = import.meta.env.DEV;

type AppTheme = "light" | "dark";
type AppViewMode = AppSidebarView;

const AppPage = () => {
  const { user, loading, signOut } = useAuth();
  const { profile, hasProfile, checked: profileChecked, refetch: refetchProfile } = useUserProfile(user?.id);
  const { balance: creditsBalance, plan: creditsPlan, refetch: refetchCredits } = useCredits(user?.id);
  const { isAdmin } = useAdmin(user?.id);
  const entitlements = useEntitlements(user?.id, creditsPlan, isAdmin);
  const { history: searchHistory, loading: searchHistoryLoading, refetch: refetchHistory } = useSearchHistory(user?.id);
  const [authOpen, setAuthOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [viewMode, setViewMode] = useState<AppViewMode>("search");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingShown, setOnboardingShown] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("globaleads-app-theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("globaleads-app-theme", theme);
  }, [theme]);

  // On the app subdomain, auto-open sign-in modal for unauthenticated users
  useEffect(() => {
    if (isAppSubdomain && !loading && !user && !devMode) {
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

    if (params.get('checkout') === 'success' || params.get('checkout') === 'subscription_success') {
      toast({
        title: params.get('checkout') === 'subscription_success' ? "Plan activated!" : "Credits added!",
        description: params.get('checkout') === 'subscription_success'
          ? "Your plan and credits have been updated."
          : "Your credits have been added to your account.",
      });
      refetchCredits();
      entitlements.refetch();
      window.history.replaceState({}, '', window.location.pathname);
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

  const handleSelectEntry = (entry: SearchHistoryEntry) => {
    setViewMode("search");
    setTimeout(() => {
      const event = new CustomEvent('loadSearch', { detail: { keyword: entry.keyword, location: entry.location } });
      window.dispatchEvent(event);
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
    setViewMode("search");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('newSearch'));
      const searchForm = document.querySelector('input[placeholder*="Dental clinics"]');
      if (searchForm) {
        searchForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 0);
  };

  const handleViewAdmin = () => {
    if (isAdmin) setViewMode("admin");
  };

  const handleNavigate = (view: AppSidebarView) => {
    if (view === "search") {
      handleNewSearch();
      return;
    }
    if (view === "admin") {
      handleViewAdmin();
      return;
    }
    setViewMode(view);
  };

  const handleOnboardingClose = async () => {
    setOnboardingOpen(false);
    await refetchProfile();
  };

  const handleBuyCredits = async (bundleKey: string, checkoutType: "topup" | "subscription" = "topup") => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { bundleKey, planKey: bundleKey, checkoutType, userId: user.id },
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

  const planCredits = entitlements.includedCredits || getIncludedCredits(creditsPlan);
  const avatarUrl = typeof user?.user_metadata?.avatar_url === "string"
    ? user.user_metadata.avatar_url
    : typeof user?.user_metadata?.picture === "string"
      ? user.user_metadata.picture
      : "";
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Account";
  const fallbackInitials = String(displayName)
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "GL";

  return (
    <div className={`app-theme ${theme === "light" ? "app-light light" : "app-dark dark"} h-screen flex flex-col relative overflow-hidden bg-black text-[#EFEDE6]`}>
      {/* ── App Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#EFEDE6]/[0.14] bg-black/80 backdrop-blur-xl">
        <div className="flex h-14 w-full items-center">

          <div
            className="flex h-full flex-shrink-0 items-center border-r border-[#EFEDE6]/[0.10] px-3 transition-all duration-300 md:w-56"
          >
            <GlobaLeadsLogo
              size="md"
              theme={theme === "light" ? "light" : "dark"}
            />
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-4 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setTheme(current => current === "light" ? "dark" : "light")}
              className="inline-flex h-9 items-center gap-2 border border-[#EFEDE6]/10 px-3 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] transition-colors hover:border-[#F5FF3D] hover:text-[#EFEDE6]"
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{theme === "light" ? "Dark" : "Light"}</span>
            </button>
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 border border-[#EFEDE6]/10 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F5FF3D]" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6]">
                    {isAdmin ? "Admin" : `${creditsBalance} credits`}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center gap-2 border border-[#EFEDE6]/10 px-2 pr-3 transition-colors hover:border-[#F5FF3D]/60"
                      aria-label="Open account menu"
                    >
                      <Avatar className="h-7 w-7 border border-[#EFEDE6]/10">
                        <AvatarImage src={avatarUrl} alt={String(displayName)} />
                        <AvatarFallback className="bg-[#F5FF3D] font-mono text-[10px] font-black text-black">
                          {fallbackInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden max-w-[160px] truncate font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] sm:block">
                        {profile?.full_name || user.email}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 border-[#EFEDE6]/10 bg-black p-1 text-[#EFEDE6]">
                    <DropdownMenuLabel className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-[#EFEDE6]">{displayName}</p>
                      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#EFEDE6]/10" />
                    <DropdownMenuItem
                      onClick={() => setEditProfileOpen(true)}
                      className="cursor-pointer gap-2 rounded-none px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#A8A59C] focus:bg-[#F5FF3D]/10 focus:text-[#F5FF3D]"
                    >
                      <UserRound className="h-3.5 w-3.5" /> Edit profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setCreditsOpen(true)}
                      className="cursor-pointer gap-2 rounded-none px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#A8A59C] focus:bg-[#F5FF3D]/10 focus:text-[#F5FF3D]"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Upgrade or top up
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setViewMode("settings")}
                      className="cursor-pointer gap-2 rounded-none px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#A8A59C] focus:bg-[#F5FF3D]/10 focus:text-[#F5FF3D]"
                    >
                      <Settings className="h-3.5 w-3.5" /> Account settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#EFEDE6]/10" />
                    <DropdownMenuItem
                      onClick={signOut}
                      className="cursor-pointer gap-2 rounded-none px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-red-300 focus:bg-red-500/10 focus:text-red-200"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
            activeView={viewMode}
            onNavigate={handleNavigate}
            creditsUsed={Math.max(0, planCredits - creditsBalance)}
            creditsTotal={planCredits}
            onViewAdmin={handleViewAdmin}
            isAdmin={isAdmin}
            onBuyCredits={() => setCreditsOpen(true)}
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
                onBuyCredits={() => setCreditsOpen(true)}
                viewMode="search"
                isAdmin={isAdmin}
                effectivePlan={entitlements.effectivePlan}
              />
            ) : viewMode === "lead-inbox" ? (
              <ViewAllLeads
                userId={user?.id}
                mode="inbox"
              />
            ) : viewMode === "pipeline" ? (
              <ViewAllLeads
                userId={user?.id}
                mode="pipeline"
              />
            ) : viewMode === "follow-ups" ? (
              <ViewAllLeads
                userId={user?.id}
                mode="follow-ups"
              />
            ) : viewMode === "saved-searches" ? (
              <SavedSearches
                history={searchHistory}
                loading={searchHistoryLoading}
                onRerun={handleSelectEntry}
                onOpenLeadInbox={() => setViewMode("lead-inbox")}
              />
            ) : viewMode === "settings" ? (
              <SettingsCredits
                user={user}
                creditsBalance={creditsBalance}
                creditsTotal={planCredits}
                isAdmin={isAdmin}
                plan={entitlements.effectivePlan}
                organizationName={entitlements.organizationName}
                organizationId={entitlements.organizationId}
                canCreateOrganization={entitlements.canCreateOrganization}
                onBuyCredits={() => setCreditsOpen(true)}
                onSignOut={signOut}
                onOrganizationCreated={() => entitlements.refetch()}
              />
            ) : (
              <AdminDashboard
                onBackToSearch={() => setViewMode("search")}
                onUserCreditsChanged={() => {
                  refetchCredits();
                  entitlements.refetch();
                }}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <CreditsModal
        open={creditsOpen}
        onClose={() => setCreditsOpen(false)}
        onSelectBundle={(bundleKey, checkoutType) => { setCreditsOpen(false); handleBuyCredits(bundleKey, checkoutType); }}
        loading={checkoutLoading}
      />
      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        user={user}
        profile={profile}
        onSaved={refetchProfile}
      />
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
