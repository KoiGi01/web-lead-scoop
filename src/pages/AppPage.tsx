import { useState, useEffect } from "react";
import { CheckCheck, CreditCard, Loader2, LogOut, Moon, Settings, Sun, UserRound } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const isAppSubdomain = window.location.hostname.startsWith("app.");
const devMode = import.meta.env.DEV;

type AppTheme = "light" | "dark";
type AppViewMode = AppSidebarView;
type CheckoutConfirmationStatus = "idle" | "confirming" | "success" | "pending" | "error";
const PAID_WORKSPACE_VIEWS = new Set<AppSidebarView>(["lead-inbox", "pipeline", "follow-ups", "saved-searches"]);

interface CheckoutConfirmationState {
  open: boolean;
  status: CheckoutConfirmationStatus;
  checkoutType: "subscription" | "topup";
  sessionId: string | null;
  title: string;
  description: string;
}

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
  const [workspaceUpgradeOpen, setWorkspaceUpgradeOpen] = useState(false);
  const [viewMode, setViewMode] = useState<AppViewMode>("search");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingShown, setOnboardingShown] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutConfirmation, setCheckoutConfirmation] = useState<CheckoutConfirmationState>({
    open: false,
    status: "idle",
    checkoutType: "topup",
    sessionId: null,
    title: "",
    description: "",
  });
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
    const checkoutParam = params.get("checkout");

    if (checkoutParam === "success" || checkoutParam === "subscription_success") {
      void confirmCheckoutReturn(
        checkoutParam === "subscription_success" ? "subscription" : "topup",
        params.get("session_id"),
      );
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

  async function confirmCheckoutReturn(checkoutType: "subscription" | "topup", sessionId: string | null) {
    if (!user?.id) return;

    setCheckoutConfirmation({
      open: true,
      status: "confirming",
      checkoutType,
      sessionId,
      title: "Confirming payment...",
      description: "Stripe accepted the payment. We are waiting for your account to update.",
    });

    const attempts = sessionId ? 12 : 4;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await Promise.all([refetchCredits(), entitlements.refetch()]);

      const [{ data: creditsRow }, { data: paymentRow }] = await Promise.all([
        supabase
          .from("user_credits")
          .select("balance, plan, subscription_status")
          .eq("user_id", user.id)
          .maybeSingle(),
        sessionId
          ? supabase
              .from("stripe_payments")
              .select("id, credits_granted, bundle_key, metadata")
              .eq("user_id", user.id)
              .eq("checkout_session_id", sessionId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const subscriptionActive =
        checkoutType === "subscription" &&
        creditsRow?.plan &&
        creditsRow.plan !== "free" &&
        ["active", "trialing"].includes(String(creditsRow.subscription_status || ""));
      const topupRecorded = checkoutType === "topup" && Boolean(paymentRow);
      const sessionRecorded = sessionId ? Boolean(paymentRow) : Boolean(subscriptionActive || creditsRow);

      if ((checkoutType === "subscription" && subscriptionActive && sessionRecorded) || topupRecorded) {
        const title = checkoutType === "subscription" ? "Plan activated" : "Credits added";
        const description = checkoutType === "subscription"
          ? `Your ${String(creditsRow?.plan || "paid")} plan is active and credits are ready.`
          : `${paymentRow?.credits_granted || "Your"} credits were added to your account.`;

        setCheckoutConfirmation({
          open: true,
          status: "success",
          checkoutType,
          sessionId,
          title,
          description,
        });
        toast({ title, description });
        return;
      }

      await new Promise(resolve => window.setTimeout(resolve, 2500));
    }

    setCheckoutConfirmation({
      open: true,
      status: "pending",
      checkoutType,
      sessionId,
      title: "Payment received, activation pending",
      description: "Stripe received the payment, but the account update has not arrived yet. Try refreshing in a moment.",
    });
  }

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
    if (PAID_WORKSPACE_VIEWS.has(view) && !entitlements.workflowFeatures) {
      setWorkspaceUpgradeOpen(true);
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
                onBuyCredits={() => setCreditsOpen(true)}
                onSignOut={signOut}
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
      <Dialog open={workspaceUpgradeOpen} onOpenChange={setWorkspaceUpgradeOpen}>
        <DialogContent className="border-[#EFEDE6]/15 bg-black text-[#EFEDE6] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-black">
              Unlock the sales workspace
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#A8A59C]">
              Lead Inbox, Pipeline, Follow-ups, and Saved Searches are available on Starter and Growth.
              Upgrade to organize leads, track outreach, and close more deals.
            </DialogDescription>
          </DialogHeader>

          <div className="border border-[#F5FF3D]/30 bg-[#F5FF3D]/10 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">
              Starter and Growth unlock all current app capabilities
            </p>
            <p className="mt-2 text-sm text-[#EFEDE6]">
              Full search quality, lead inbox, pipeline, follow-ups, saved searches, and exports.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setWorkspaceUpgradeOpen(false)}
              className="h-10 border border-[#EFEDE6]/10 px-4 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] hover:border-[#EFEDE6]/30 hover:text-[#EFEDE6]"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceUpgradeOpen(false);
                setCreditsOpen(true);
              }}
              className="h-10 border border-[#F5FF3D] bg-[#F5FF3D] px-4 font-display text-sm font-bold text-black hover:bg-[#FFFE7A]"
            >
              Upgrade now
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={checkoutConfirmation.open}
        onOpenChange={open => setCheckoutConfirmation(current => ({ ...current, open }))}
      >
        <DialogContent className="border-[#EFEDE6]/15 bg-black text-[#EFEDE6] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 font-display text-xl font-black">
              {checkoutConfirmation.status === "confirming" ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#F5FF3D]" />
              ) : checkoutConfirmation.status === "success" ? (
                <CheckCheck className="h-5 w-5 text-[#F5FF3D]" />
              ) : (
                <CreditCard className="h-5 w-5 text-[#F5FF3D]" />
              )}
              {checkoutConfirmation.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#A8A59C]">
              {checkoutConfirmation.description}
            </DialogDescription>
          </DialogHeader>

          <div className="border border-[#EFEDE6]/10 bg-[#0A0A0A] p-3 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
            <p>Type: <span className="text-[#EFEDE6]">{checkoutConfirmation.checkoutType}</span></p>
            {checkoutConfirmation.sessionId && (
              <p className="mt-1 truncate">Session: <span className="text-[#EFEDE6]">{checkoutConfirmation.sessionId}</span></p>
            )}
          </div>

          {checkoutConfirmation.status === "pending" && (
            <DialogFooter>
              <button
                type="button"
                onClick={() => void confirmCheckoutReturn(checkoutConfirmation.checkoutType, checkoutConfirmation.sessionId)}
                className="h-10 border border-[#F5FF3D] bg-[#F5FF3D] px-4 font-display text-sm font-bold text-black"
              >
                Check again
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
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
