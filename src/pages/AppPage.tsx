import { useState, useEffect } from "react";
import { Bug, CheckCheck, CreditCard, Loader2, Settings } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCredits } from "@/hooks/useCredits";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAdmin } from "@/hooks/useAdmin";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import type { SearchHistoryEntry } from "@/hooks/useSearchHistory";
import { getIncludedCredits, isPaidPlan, PLAN_LABELS } from "@/lib/entitlements";
import { isOpportunityModeEnabled } from "@/lib/opportunityMode";
import { toast } from "@/hooks/use-toast";
import LeadGeneratorSection from "@/components/landing/LeadGeneratorSection";
import AuthModal from "@/components/auth/AuthModal";
import CreditsModal from "@/components/app/CreditsModal";
import EditProfileModal from "@/components/app/EditProfileModal";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import ViewAllLeads from "@/components/landing/ViewAllLeads";
import HomeDashboard from "@/components/app/HomeDashboard";
import AppSidebar from "@/components/app/AppSidebar";
import type { AppSidebarView } from "@/components/app/AppSidebar";
import AdminDashboard from "@/components/app/AdminDashboard";
import SavedSearches from "@/components/app/SavedSearches";
import SettingsCredits from "@/components/app/SettingsCredits";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobaLeadsLogo from "@/components/brand/GlobaLeadsLogo";
import { Button } from "@/components/ui/button";
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
const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const isDemoPreview = devMode && isLocalHost && new URLSearchParams(window.location.search).get("demo") === "1";
const productionAppUrl = "https://app.globaleads22.com";
const demoUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@globaleads22.local",
  user_metadata: {
    full_name: "Demo User",
    name: "Demo User",
  },
} as any;
const demoProfile = {
  id: demoUser.id,
  full_name: "Demo User",
  company_name: "Demo Workspace",
} as any;

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
  const { user: authUser, loading: rawLoading, signOut: rawSignOut } = useAuth();
  const dataUserId = isDemoPreview ? undefined : authUser?.id;
  const { profile: fetchedProfile, hasProfile: fetchedHasProfile, checked: fetchedProfileChecked, refetch: refetchProfile } = useUserProfile(dataUserId);
  const { balance: fetchedCreditsBalance, plan: fetchedCreditsPlan, refetch: refetchCredits } = useCredits(dataUserId);
  const { isAdmin: fetchedIsAdmin } = useAdmin(dataUserId);
  const entitlements = useEntitlements(dataUserId, isDemoPreview ? "growth" : fetchedCreditsPlan, fetchedIsAdmin);
  const { history: fetchedSearchHistory, loading: fetchedSearchHistoryLoading, refetch: refetchHistory } = useSearchHistory(dataUserId);
  const user = isDemoPreview ? demoUser : authUser;
  const loading = isDemoPreview ? false : rawLoading;
  const profile = isDemoPreview ? demoProfile : fetchedProfile;
  const hasProfile = isDemoPreview ? true : fetchedHasProfile;
  const profileChecked = isDemoPreview ? true : fetchedProfileChecked;
  const creditsBalance = isDemoPreview ? 140 : fetchedCreditsBalance;
  const creditsPlan = isDemoPreview ? "growth" : fetchedCreditsPlan;
  const isAdmin = isDemoPreview ? false : fetchedIsAdmin;
  const searchHistory = isDemoPreview ? [] : fetchedSearchHistory;
  const searchHistoryLoading = isDemoPreview ? false : fetchedSearchHistoryLoading;
  const signOut = isDemoPreview
    ? async () => {
        window.location.href = "/";
      }
    : rawSignOut;
  const opportunityModeEnabled = isDemoPreview || isOpportunityModeEnabled();
  const [authOpen, setAuthOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [workspaceUpgradeOpen, setWorkspaceUpgradeOpen] = useState(false);
  const [viewMode, setViewMode] = useState<AppViewMode>("home");
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
  // v1 of the redesign is dark-only; light mode is deferred (see redesign spec).
  const [theme] = useState<AppTheme>("dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("globaleads-app-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (isAppSubdomain || isLocalHost || devMode || isDemoPreview) {
      return;
    }

    const target = new URL(productionAppUrl);
    target.search = window.location.search;
    target.hash = window.location.hash;
    window.location.replace(target.toString());
  }, []);

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
    if (isDemoPreview) {
      toast({
        title: "Demo preview",
        description: "Checkout is disabled in the local demo.",
      });
      return;
    }

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
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Account";
  const showPaidBadge = !isAdmin && isPaidPlan(entitlements.effectivePlan);
  const paidBadgeLabel = PLAN_LABELS[entitlements.effectivePlan];
  const bugReportHref = `mailto:contact@globaleads22.com?subject=${encodeURIComponent("GlobaLeads22 bug report")}&body=${encodeURIComponent([
    "Bug report",
    "",
    `Account: ${user?.email || "Not signed in"}`,
    `Plan: ${isAdmin ? "admin" : entitlements.effectivePlan}`,
    `Page: ${typeof window !== "undefined" ? window.location.href : ""}`,
    "",
    "What happened?",
    "",
    "What did you expect to happen?",
    "",
    "Steps to reproduce:",
    "1. ",
  ].join("\n"))}`;

  return (
    <div className="app-theme app-dark dark relative flex h-screen overflow-hidden bg-[#08090c] text-[#f3f5f8]">
      {/* ── Full-height sidebar ── */}
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
          userName={String(displayName)}
          planLabel={isAdmin ? "Admin" : paidBadgeLabel}
          email={user.email}
          showPaidBadge={showPaidBadge}
          paidBadgeLabel={paidBadgeLabel}
          reportBugHref={bugReportHref}
          onEditProfile={() => setEditProfileOpen(true)}
          onSignOut={signOut}
        />
      )}

      {/* ── Right column: scrolling content (signed-in workspace has no top bar —
           account menu + New scan live in the sidebar) ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!user && (
          <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-[#f3f5f8]/[0.07] bg-[#08090c] px-4 sm:px-6">
            <GlobaLeadsLogo size="md" theme="dark" />
            <div className="ml-auto flex items-center gap-2.5">
              <Button variant="accent" size="sm" className="whitespace-nowrap" onClick={() => setAuthOpen(true)}>
                SIGN IN
              </Button>
            </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            {viewMode === "search" ? (
              <LeadGeneratorSection
                onOpenAuth={() => setAuthOpen(true)}
                onSearchComplete={handleSearchComplete}
                onBuyCredits={() => setCreditsOpen(true)}
                viewMode="search"
                isAdmin={isAdmin}
                effectivePlan={entitlements.effectivePlan}
                demoMode={isDemoPreview}
                opportunityModeEnabled={opportunityModeEnabled}
              />
            ) : viewMode === "home" ? (
              <HomeDashboard
                userId={user?.id}
                demoMode={isDemoPreview}
                userName={String(displayName)}
                searchHistory={searchHistory}
                creditsRemaining={creditsBalance}
                creditsTotal={planCredits}
                onNewScan={() => handleNavigate("search")}
                onResumeScan={() => handleNavigate("search")}
                onViewScans={() => setViewMode("saved-searches")}
                onViewFollowups={() => handleNavigate("follow-ups")}
              />
            ) : viewMode === "lead-inbox" ? (
              <ViewAllLeads
                userId={user?.id}
                mode="inbox"
                demoMode={isDemoPreview}
              />
            ) : viewMode === "pipeline" ? (
              <ViewAllLeads
                userId={user?.id}
                mode="pipeline"
                demoMode={isDemoPreview}
              />
            ) : viewMode === "follow-ups" ? (
              <ViewAllLeads
                userId={user?.id}
                mode="follow-ups"
                demoMode={isDemoPreview}
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
        <DialogContent className="border-[#f3f5f8]/15 bg-black text-[#f3f5f8] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-black">
              Unlock the sales workspace
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#9aa3b2]">
              Lead Inbox, Pipeline, Follow-ups, and Saved Searches are available on Starter and Growth.
              Upgrade to organize leads, track outreach, and close more deals.
            </DialogDescription>
          </DialogHeader>

          <div className="border border-[#e8fb52]/30 bg-[#e8fb52]/10 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#e8fb52]">
              Starter and Growth unlock all current app capabilities
            </p>
            <p className="mt-2 text-sm text-[#f3f5f8]">
              Full search quality, lead inbox, pipeline, follow-ups, saved searches, and exports.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setWorkspaceUpgradeOpen(false)}
              className="h-10 border border-[#f3f5f8]/10 px-4 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] hover:border-[#f3f5f8]/30 hover:text-[#f3f5f8]"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceUpgradeOpen(false);
                setCreditsOpen(true);
              }}
              className="h-10 border border-[#e8fb52] bg-[#e8fb52] px-4 font-display text-sm font-bold text-black hover:bg-[#f3ff8a]"
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
        <DialogContent className="border-[#f3f5f8]/15 bg-black text-[#f3f5f8] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 font-display text-xl font-black">
              {checkoutConfirmation.status === "confirming" ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#e8fb52]" />
              ) : checkoutConfirmation.status === "success" ? (
                <CheckCheck className="h-5 w-5 text-[#e8fb52]" />
              ) : (
                <CreditCard className="h-5 w-5 text-[#e8fb52]" />
              )}
              {checkoutConfirmation.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#9aa3b2]">
              {checkoutConfirmation.description}
            </DialogDescription>
          </DialogHeader>

          <div className="border border-[#f3f5f8]/10 bg-[#111319] p-3 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
            <p>Type: <span className="text-[#f3f5f8]">{checkoutConfirmation.checkoutType}</span></p>
            {checkoutConfirmation.sessionId && (
              <p className="mt-1 truncate">Session: <span className="text-[#f3f5f8]">{checkoutConfirmation.sessionId}</span></p>
            )}
          </div>

          {checkoutConfirmation.status === "pending" && (
            <DialogFooter>
              <button
                type="button"
                onClick={() => void confirmCheckoutReturn(checkoutConfirmation.checkoutType, checkoutConfirmation.sessionId)}
                className="h-10 border border-[#e8fb52] bg-[#e8fb52] px-4 font-display text-sm font-bold text-black"
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
