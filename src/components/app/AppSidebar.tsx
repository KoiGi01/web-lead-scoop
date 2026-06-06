import {
  ArrowUpRight,
  Bookmark,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Home,
  KanbanSquare,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

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

      {/* user */}
      {!collapsed && (
        <div className="flex flex-shrink-0 items-center gap-2.5 px-4 pb-4 pt-1">
          <span className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#2a2f3a,#14171d)] font-mono text-[10px] font-semibold text-[#98a0af] shadow-[inset_0_0_0_1px_rgba(233,238,247,0.13)]">
            {initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-semibold text-[#f3f5f8]">{userName || "Account"}</div>
            {planLabel && (
              <div className="truncate font-mono text-[9.5px] uppercase tracking-wide text-[#5b6472]">{planLabel}</div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
