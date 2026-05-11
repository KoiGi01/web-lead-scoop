import {
  ArrowUpRight,
  Bookmark,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Inbox,
  KanbanSquare,
  Plus,
  Settings,
  ShieldCheck,
  Zap,
} from "lucide-react";

export type AppSidebarView =
  | "search"
  | "lead-inbox"
  | "pipeline"
  | "follow-ups"
  | "saved-searches"
  | "settings"
  | "admin";

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
}: AppSidebarProps) => {
  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const creditPercent = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0;
  const navItems = [
    { label: "New Search", view: "search" as const, icon: Plus, accent: true },
    { label: "Lead Inbox", view: "lead-inbox" as const, icon: Inbox },
    { label: "Pipeline", view: "pipeline" as const, icon: KanbanSquare },
    { label: "Follow-ups", view: "follow-ups" as const, icon: CalendarClock },
    { label: "Saved Searches", view: "saved-searches" as const, icon: Bookmark },
    { label: "Settings & Credits", view: "settings" as const, icon: Settings },
    ...(isAdmin && onViewAdmin ? [{ label: "Admin Usage", view: "admin" as const, icon: ShieldCheck }] : []),
  ];

  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 overflow-hidden border-r border-[#EFEDE6]/[0.14] transition-all duration-300 ease-in-out relative bg-black ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="relative flex h-14 flex-shrink-0 items-center justify-between border-b border-[#EFEDE6]/[0.10] px-3 py-3">
        {!collapsed && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Workspace</span>
        )}
        <button
          onClick={onToggleCollapse}
          className="ml-auto flex-shrink-0 p-1.5 text-[#A8A59C] transition-colors hover:text-[#EFEDE6]"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        {navItems.map(({ label, view, icon: Icon, accent }) => {
          const active = activeView === view;
          return (
            <button
              key={label}
              onClick={() => view === "admin" && onViewAdmin ? onViewAdmin() : onNavigate(view)}
              title={label}
              className={`group flex items-center gap-3 rounded-none px-2.5 py-3 text-left transition-all ${
                active
                  ? "border border-[#F5FF3D] bg-[#F5FF3D] text-black"
                  : accent
                    ? "border border-[#F5FF3D]/40 text-[#F5FF3D] hover:bg-[#F5FF3D] hover:text-black"
                    : "border border-transparent text-[#A8A59C] hover:border-[#EFEDE6]/10 hover:bg-[#EFEDE6]/[0.03] hover:text-[#EFEDE6]"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className={`flex-shrink-0 ${accent ? "h-5 w-5" : "h-4 w-4"}`} />
              {!collapsed && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="relative flex-shrink-0 border-t border-[#EFEDE6]/[0.10] px-3 py-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Zap className="h-4 w-4 text-[#F5FF3D]" />
            <span className="font-mono text-[10px] font-bold tabular-nums text-[#EFEDE6]">{creditsRemaining}</span>
          </div>
        ) : (
          <>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Credits</span>
              <button
                onClick={onBuyCredits}
                className="flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] transition-colors hover:text-[#F5FF3D]"
              >
                Buy <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="mb-2 flex items-baseline gap-1.5">
              <span className="font-mono text-[22px] font-black tabular-nums text-[#EFEDE6]">
                {creditsRemaining}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">/ {creditsTotal}</span>
            </div>
            <div className="h-1 overflow-hidden bg-[#EFEDE6]/[0.08]">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${creditPercent}%`,
                  background: creditPercent > 25 ? "#F5FF3D" : "#EF4444",
                }}
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
