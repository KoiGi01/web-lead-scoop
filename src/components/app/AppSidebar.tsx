import {
  ArrowUpRight,
  Bookmark,
  Bug,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Clock,
  CreditCard,
  Home,
  KanbanSquare,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AppSidebarView =
  | "home"
  | "search"
  | "lead-inbox"
  | "pipeline"
  | "follow-ups"
  | "saved-searches"
  | "settings"
  | "admin";

interface NavItem {
  label: string;
  view: AppSidebarView;
  icon: LucideIcon;
  accent?: boolean;
  badge?: number;
}

interface AppSidebarProps {
  activeView: AppSidebarView;
  onNavigate: (view: AppSidebarView) => void;
  onViewAdmin?: () => void;
  isAdmin?: boolean;
  creditsUsed: number;
  creditsTotal: number;
  onBuyCredits?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userName?: string;
  planLabel?: string;
  prospectsCount?: number;
  followupsCount?: number;
  email?: string;
  showPaidBadge?: boolean;
  paidBadgeLabel?: string;
  reportBugHref?: string;
  onEditProfile?: () => void;
  onSignOut?: () => void;
}

const AppSidebar = ({
  activeView,
  onNavigate,
  onViewAdmin,
  isAdmin = false,
  creditsUsed,
  creditsTotal,
  onBuyCredits,
  collapsed = false,
  onToggleCollapse,
  userName,
  planLabel,
  prospectsCount,
  followupsCount,
  email,
  showPaidBadge,
  paidBadgeLabel,
  reportBugHref,
  onEditProfile,
  onSignOut,
}: AppSidebarProps) => {
  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const creditPercent = creditsTotal > 0 ? Math.min(100, (creditsRemaining / creditsTotal) * 100) : 0;

  const workspace: NavItem[] = [
    { label: "Home", view: "home", icon: Home },
    { label: "New scan", view: "search", icon: Plus, accent: true },
    { label: "Prospects", view: "lead-inbox", icon: Users, badge: prospectsCount },
    { label: "Pipeline", view: "pipeline", icon: KanbanSquare },
    { label: "Follow-ups", view: "follow-ups", icon: Clock, badge: followupsCount },
  ];
  const library: NavItem[] = [
    { label: "Saved scans", view: "saved-searches", icon: Bookmark },
    { label: "Settings", view: "settings", icon: Settings },
    ...(isAdmin && onViewAdmin ? [{ label: "Admin", view: "admin" as const, icon: ShieldCheck }] : []),
  ];

  const initials = (userName || "U")
    .split(" ")
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const renderItem = ({ label, view, icon: Icon, accent, badge }: NavItem) => {
    const active = activeView === view;
    const base = "group relative flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-[13.5px] font-medium transition-colors";
    const state = active
      ? "bg-[#14171d] text-[#f3f5f8] shadow-[inset_0_0_0_1px_rgba(233,238,247,0.13)]"
      : accent
        ? "border border-[#e8fb52]/30 bg-[#e8fb52]/[0.05] text-[#e8fb52] hover:bg-[#e8fb52] hover:text-[#08090c] font-semibold"
        : "text-[#98a0af] hover:bg-[#0f1115] hover:text-[#f3f5f8]";
    return (
      <button
        key={label}
        type="button"
        title={collapsed ? label : undefined}
        onClick={() => (view === "admin" && onViewAdmin ? onViewAdmin() : onNavigate(view))}
        className={`${base} ${state} ${collapsed ? "justify-center px-0" : ""}`}
      >
        <Icon
          className={`h-[17px] w-[17px] flex-shrink-0 ${
            active ? "text-[#e8fb52]" : accent ? "" : "opacity-75 group-hover:opacity-100"
          }`}
        />
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && typeof badge === "number" && badge > 0 && (
          <span className="ml-auto rounded-full bg-[#e8fb52]/[0.13] px-1.5 py-px font-mono text-[10px] text-[#e8fb52]">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`hidden h-full flex-shrink-0 flex-col border-r border-[#f3f5f8]/[0.07] bg-[#0b0d11] transition-[width] duration-300 ease-in-out md:flex ${
        collapsed ? "w-[68px]" : "w-[248px]"
      }`}
    >
      {/* brand + collapse */}
      <div className="flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-[#f3f5f8]/[0.07] px-3.5">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="h-[30px] w-[30px] flex-shrink-0 rounded-[8px] object-contain"
        />
        {!collapsed && (
          <span className="font-display text-[16.5px] font-bold tracking-[-0.02em] text-[#f3f5f8]">
            GlobaLeads<sup className="font-mono text-[8px] text-[#e8fb52]">22</sup>
          </span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand" : "Collapse"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex h-7 w-7 items-center justify-center rounded-md text-[#5b6472] transition-colors hover:bg-[#14171d] hover:text-[#f3f5f8] ${
            collapsed ? "mx-auto" : "ml-auto"
          }`}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="px-2.5 pb-2 pt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b6472]">Workspace</p>
        )}
        {workspace.map(renderItem)}
        {!collapsed && (
          <p className="px-2.5 pb-2 pt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b6472]">Library</p>
        )}
        {collapsed && <div className="my-2 h-px bg-[#f3f5f8]/[0.07]" />}
        {library.map(renderItem)}
      </nav>

      {/* credits */}
      <div className="flex-shrink-0 px-3 pb-2.5">
        {collapsed ? (
          <button
            type="button"
            onClick={onBuyCredits}
            title={`${creditsRemaining} credits left`}
            className="flex w-full flex-col items-center gap-1 rounded-[10px] border border-[#f3f5f8]/[0.07] py-2.5 text-[#f3f5f8] hover:border-[#f3f5f8]/[0.13]"
          >
            <Zap className="h-4 w-4 text-[#e8fb52]" />
            <span className="font-mono text-[10px] font-semibold tabular-nums">{creditsRemaining}</span>
          </button>
        ) : (
          <div className="rounded-[13px] border border-[#f3f5f8]/[0.07] bg-[#0f1115] p-3.5">
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-[#5b6472]">
              <span>Credits</span>
              <button
                type="button"
                onClick={onBuyCredits}
                className="inline-flex items-center gap-0.5 text-[#98a0af] transition-colors hover:text-[#e8fb52]"
              >
                Buy <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="mb-2 mt-2 font-display text-[22px] font-bold tracking-[-0.02em] text-[#f3f5f8]">
              {creditsRemaining.toLocaleString()}
              <span className="text-xs font-medium text-[#5b6472]"> / {creditsTotal.toLocaleString()}</span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-full bg-[#1c2029]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${creditPercent}%`, background: creditPercent > 18 ? "#e8fb52" : "#ff5c49" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* report a bug — earns credits */}
      {reportBugHref && (
        <div className="flex-shrink-0 px-3 pb-2">
          {collapsed ? (
            <a
              href={reportBugHref}
              title="Report a bug · +100 credits when fixed"
              className="flex w-full items-center justify-center rounded-[10px] border border-[#e8fb52]/25 bg-[#e8fb52]/[0.05] py-2.5 text-[#e8fb52] transition-colors hover:bg-[#e8fb52]/[0.1]"
            >
              <Bug className="h-4 w-4" />
            </a>
          ) : (
            <a
              href={reportBugHref}
              className="flex items-center gap-2.5 rounded-[10px] border border-[#e8fb52]/25 bg-[#e8fb52]/[0.05] px-2.5 py-2 transition-colors hover:bg-[#e8fb52]/[0.1]"
            >
              <Bug className="h-[15px] w-[15px] flex-shrink-0 text-[#e8fb52]" />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold leading-tight text-[#f3f5f8]">Report a bug</div>
                <div className="font-mono text-[9px] uppercase tracking-wide text-[#e8fb52]/80">+100 credits when fixed</div>
              </div>
            </a>
          )}
        </div>
      )}

      {/* account */}
      <div className="flex-shrink-0 px-3 pb-4 pt-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={collapsed ? (userName || "Account") : undefined}
              className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#0f1115] ${collapsed ? "justify-center px-0" : ""}`}
            >
              <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#2a2f3a,#14171d)] font-mono text-[10px] font-semibold text-[#98a0af] shadow-[inset_0_0_0_1px_rgba(233,238,247,0.13)]">
                {initials}
              </span>
              {!collapsed && (
                <>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-[12.5px] font-semibold text-[#f3f5f8]">{userName || "Account"}</div>
                    {planLabel && (
                      <div className="truncate font-mono text-[9.5px] uppercase tracking-wide text-[#5b6472]">{planLabel}</div>
                    )}
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 flex-shrink-0 text-[#5b6472]" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-60 border-[#f3f5f8]/10 bg-black p-1 text-[#f3f5f8]"
          >
            <DropdownMenuLabel className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-[#f3f5f8]">{userName || "Account"}</p>
              {email && (
                <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">{email}</p>
              )}
              {showPaidBadge && paidBadgeLabel && (
                <span className="mt-2 inline-flex items-center gap-1.5 border border-[#e8fb52]/50 bg-[#e8fb52]/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#e8fb52]">
                  {paidBadgeLabel} member
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#f3f5f8]/10" />
            <DropdownMenuItem
              onClick={onEditProfile}
              className="cursor-pointer gap-2 rounded-none px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#9aa3b2] focus:bg-[#e8fb52]/10 focus:text-[#e8fb52]"
            >
              <UserRound className="h-3.5 w-3.5" /> Edit profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onBuyCredits}
              className="cursor-pointer gap-2 rounded-none px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#9aa3b2] focus:bg-[#e8fb52]/10 focus:text-[#e8fb52]"
            >
              <CreditCard className="h-3.5 w-3.5" /> Upgrade or top up
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onNavigate("settings")}
              className="cursor-pointer gap-2 rounded-none px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#9aa3b2] focus:bg-[#e8fb52]/10 focus:text-[#e8fb52]"
            >
              <Settings className="h-3.5 w-3.5" /> Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#f3f5f8]/10" />
            <DropdownMenuItem
              onClick={onSignOut}
              className="cursor-pointer gap-2 rounded-none px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-red-300 focus:bg-red-500/10 focus:text-red-200"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};

export default AppSidebar;
