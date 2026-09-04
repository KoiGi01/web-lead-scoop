import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Bug,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  CreditCard,
  Home,
  KanbanSquare,
  LogOut,
  Mail,
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
  badgeTone?: "accent" | "alert";
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
  pipelineCount?: number;
  followupsCount?: number;
  email?: string;
  showPaidBadge?: boolean;
  paidBadgeLabel?: string;
  reportBugHref?: string;
  variant?: "desktop" | "mobile";
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
  userName,
  planLabel,
  prospectsCount,
  pipelineCount,
  followupsCount,
  email,
  showPaidBadge,
  paidBadgeLabel,
  reportBugHref,
  variant = "desktop",
  onEditProfile,
  onSignOut,
}: AppSidebarProps) => {
  // Desktop rail sits collapsed and expands as a flyout on hover.
  const [hovered, setHovered] = useState(false);
  const collapsed = variant === "mobile" ? false : !hovered;
  // Labels fade out instantly on collapse, fade in (slightly delayed) on expand,
  // while staying in flow so icons/rows never shift position or height.
  const labelFade = `transition-opacity duration-150 ${collapsed ? "opacity-0" : "opacity-100 delay-100"}`;

  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const creditPercent = creditsTotal > 0 ? Math.min(100, (creditsRemaining / creditsTotal) * 100) : 0;

  const workspace: NavItem[] = [
    { label: "Home", view: "home", icon: Home },
    { label: "New scan", view: "search", icon: Plus, accent: true },
    { label: "Prospects", view: "lead-inbox", icon: Users, badge: prospectsCount, badgeTone: "alert" },
    { label: "Pipeline", view: "pipeline", icon: KanbanSquare, badge: pipelineCount, badgeTone: "alert" },
    { label: "Email automations", view: "follow-ups", icon: Mail, badge: followupsCount },
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

  const renderItem = ({ label, view, icon: Icon, accent, badge, badgeTone = "accent" }: NavItem) => {
    const active = activeView === view;
    const hasNumericBadge = typeof badge === "number" && badge > 0;
    const badgeText = hasNumericBadge ? (badge! > 99 ? "99+" : String(badge)) : "";
    const badgeDescription = badgeTone === "alert" ? `${badgeText} unseen leads` : `${badgeText} items`;
    const base = "group relative flex w-full min-w-0 items-center gap-3 rounded-[10px] px-2.5 py-2 text-[13.5px] font-medium transition-colors";
    const state = active
      ? "bg-[#14171d] text-[#f3f5f8] shadow-[inset_0_0_0_1px_rgba(233,238,247,0.13)]"
      : accent
        ? "border border-[#e8fb52]/30 bg-[#e8fb52]/[0.05] text-[#e8fb52] hover:bg-[#e8fb52] hover:text-[#08090c] font-semibold"
        : "text-[#98a0af] hover:bg-[#0f1115] hover:text-[#f3f5f8]";
    return (
      <button
        key={label}
        type="button"
        title={collapsed ? (hasNumericBadge ? `${label}: ${badgeDescription}` : label) : undefined}
        aria-label={hasNumericBadge ? `${label}, ${badgeDescription}` : label}
        onClick={() => (view === "admin" && onViewAdmin ? onViewAdmin() : onNavigate(view))}
        className={`${base} ${state}`}
      >
        <Icon
          className={`h-[17px] w-[17px] flex-shrink-0 ${
            active ? "text-[#e8fb52]" : accent ? "" : "opacity-75 group-hover:opacity-100"
          }`}
        />
        <span className={`truncate ${labelFade}`}>{label}</span>
        {hasNumericBadge && !collapsed && (
          <span
            className={`ml-auto rounded-full px-1.5 py-px font-mono text-[10px] font-bold ${
              badgeTone === "alert"
                ? "bg-[#ff3b30] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_0_16px_rgba(255,59,48,0.35)]"
                : "bg-[#e8fb52]/[0.13] text-[#e8fb52]"
            }`}
          >
            {badgeText}
          </span>
        )}
        {hasNumericBadge && collapsed && (
          <span
            className={`absolute right-1 top-1 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 font-mono text-[8px] font-bold leading-none ${
              badgeTone === "alert"
                ? "bg-[#ff3b30] text-white shadow-[0_0_0_1px_#0b0d11,0_0_0_2px_rgba(255,59,48,0.45)]"
                : "bg-[#e8fb52] text-[#08090c] shadow-[0_0_0_1px_#0b0d11]"
            }`}
          >
            {badgeText}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={
        variant === "desktop"
          ? "relative hidden h-full w-[64px] flex-shrink-0 md:block"
          : "flex h-full w-full flex-col"
      }
    >
      <div
        onMouseEnter={() => variant === "desktop" && setHovered(true)}
        onMouseLeave={() => variant === "desktop" && setHovered(false)}
        className={
          variant === "desktop"
            ? `absolute inset-y-0 left-0 z-40 flex h-full flex-col overflow-hidden border-r border-[#f3f5f8]/[0.07] bg-[#0b0d11] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                collapsed ? "w-[64px]" : "w-[228px] shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
              }`
            : "flex h-full w-full flex-col bg-[#0b0d11]"
        }
      >
      {/* brand */}
      <div className="flex h-16 flex-shrink-0 items-center gap-2.5 border-b border-[#f3f5f8]/[0.07] px-3.5">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="h-[30px] w-[30px] flex-shrink-0 rounded-[8px] object-contain"
        />
        <span className={`whitespace-nowrap font-display text-[16.5px] font-bold tracking-[-0.02em] text-[#f3f5f8] ${labelFade}`}>
          GlobaLeads<sup className="font-mono text-[8px] text-[#e8fb52]">22</sup>
        </span>
      </div>

      {/* nav */}
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden px-3 py-3">
        <div>
          <p className={`mb-2 whitespace-nowrap px-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b6472] ${labelFade}`}>Workspace</p>
          <div className="flex flex-col gap-1.5">
            {workspace.map(renderItem)}
          </div>
        </div>
        <div>
          <p className={`mb-2 whitespace-nowrap px-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5b6472] ${labelFade}`}>Library</p>
          <div className="flex flex-col gap-1.5">
            {library.map(renderItem)}
          </div>
        </div>
      </nav>

      {/* credits */}
      <div className="flex-shrink-0 px-3 pb-2.5">
        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#f3f5f8]/[0.07] bg-[#0f1115] p-3">
          <Zap className="h-4 w-4 shrink-0 text-[#e8fb52]" />
          <div className={`min-w-0 flex-1 ${labelFade}`}>
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
            <div className="mt-1 whitespace-nowrap font-display text-[18px] font-bold tracking-[-0.02em] text-[#f3f5f8]">
              {creditsRemaining.toLocaleString()}
              <span className="text-xs font-medium text-[#5b6472]"> / {creditsTotal.toLocaleString()}</span>
            </div>
            <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[#1c2029]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${creditPercent}%`, background: creditPercent > 18 ? "#e8fb52" : "#ff5c49" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* report a bug — earns credits */}
      {reportBugHref && (
        <div className="flex-shrink-0 px-3 pb-2">
          <a
            href={reportBugHref}
            aria-label="Report a bug"
            title={collapsed ? "Report a bug" : undefined}
            className={`relative flex w-full min-w-0 items-center overflow-hidden rounded-[10px] border border-[#e8fb52]/25 bg-[#e8fb52]/[0.05] px-[11px] transition-[height,background-color] duration-300 hover:bg-[#e8fb52]/[0.1] ${collapsed ? "h-[33px]" : "h-[57px]"}`}
          >
            <Bug className="h-[15px] w-[15px] flex-shrink-0 text-[#e8fb52]" />
            <div className={`absolute left-[36px] top-2 w-[156px] overflow-hidden transition-opacity duration-150 ${collapsed ? "opacity-0" : "opacity-100 delay-150"}`}>
              <div className="whitespace-nowrap text-[12px] font-semibold leading-tight text-[#f3f5f8]">Report a bug</div>
              <div className="whitespace-normal break-words font-mono text-[9px] uppercase leading-[1.35] tracking-wide text-[#e8fb52]/80">Eligible fixes may earn credits</div>
            </div>
          </a>
        </div>
      )}

      {/* account */}
      <div className="flex-shrink-0 px-3 pb-4 pt-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={collapsed ? (userName || "Account") : undefined}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#0f1115]"
            >
              <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#2a2f3a,#14171d)] font-mono text-[10px] font-semibold text-[#98a0af] shadow-[inset_0_0_0_1px_rgba(233,238,247,0.13)]">
                {initials}
              </span>
              <div className={`min-w-0 flex-1 text-left ${labelFade}`}>
                <div className="truncate text-[12.5px] font-semibold text-[#f3f5f8]">{userName || "Account"}</div>
                {planLabel && (
                  <div className="truncate font-mono text-[9.5px] uppercase tracking-wide text-[#5b6472]">{planLabel}</div>
                )}
              </div>
              <ChevronUp className={`ml-auto h-4 w-4 flex-shrink-0 text-[#5b6472] ${labelFade}`} />
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
      </div>
    </aside>
  );
};

export default AppSidebar;
