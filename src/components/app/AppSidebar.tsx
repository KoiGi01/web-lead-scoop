import {
  Search, Clock, Trash2, Plus, Mail, Phone, Globe,
  ChevronLeft, ChevronRight, Zap, ArrowUpRight, Archive,
} from "lucide-react";
import type { SearchHistoryEntry } from "@/hooks/useSearchHistory";

interface AppSidebarProps {
  history: SearchHistoryEntry[];
  onSelectEntry: (entry: SearchHistoryEntry) => void;
  onNewSearch: () => void;
  onClearHistory: () => void;
  onViewAllLeads: () => void;
  creditsUsed: number;
  creditsTotal: number;
  onBuyCredits?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AppSidebar = ({
  history,
  onSelectEntry,
  onNewSearch,
  onClearHistory,
  onViewAllLeads,
  creditsUsed,
  creditsTotal,
  onBuyCredits,
  collapsed = false,
  onToggleCollapse,
}: AppSidebarProps) => {
  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const creditPercent = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0;

  const totalSearches = history.length;
  const totalLeads = history.reduce((s, h) => s + h.leadCount, 0);
  const totalEmails = history.reduce((s, h) => s + h.emailCount, 0);
  const totalWhatsapp = history.reduce((s, h) => s + h.whatsappCount, 0);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 overflow-hidden border-r border-[#EFEDE6]/[0.14] transition-all duration-300 ease-in-out relative bg-black ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="relative flex h-14 flex-shrink-0 items-center justify-between border-b border-[#EFEDE6]/[0.10] px-4 py-3">
        {!collapsed && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Workspace</span>
        )}
        <button
          onClick={onToggleCollapse}
          className="flex-shrink-0 p-1.5 text-[#A8A59C] transition-colors hover:text-[#EFEDE6]"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {collapsed ? (
        <div className="flex flex-col gap-3 border-b border-[#EFEDE6]/[0.10] px-3 py-5">
          <button
            onClick={onNewSearch}
            className="flex aspect-square w-full items-center justify-center border border-[#EFEDE6]/25 text-[#EFEDE6] transition-all hover:border-[#F5FF3D] hover:bg-[#F5FF3D] hover:text-black"
            title="New Search"
          >
            <Plus className="h-7 w-7" />
          </button>
          <button
            onClick={onNewSearch}
            className="flex aspect-square w-full items-center justify-center border border-[#EFEDE6]/10 text-[#A8A59C] transition-all hover:border-[#F5FF3D]/60 hover:text-[#F5FF3D]"
            title="Recent Searches"
          >
            <Clock className="h-5 w-5" />
          </button>
          <button
            onClick={onViewAllLeads}
            className="flex aspect-square w-full items-center justify-center border border-[#EFEDE6]/10 text-[#A8A59C] transition-all hover:border-[#F5FF3D]/60 hover:text-[#F5FF3D]"
            title="All Leads"
          >
            <Archive className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
          <section className="flex-shrink-0 border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
            <div className="border-b border-[#EFEDE6]/10 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">New search</p>
            </div>
            <button
              onClick={onNewSearch}
              className="group flex w-full items-center gap-3 px-3 py-4 text-left transition-colors hover:bg-[#EFEDE6]/[0.03]"
            >
              <span className="flex h-12 w-12 items-center justify-center border border-[#F5FF3D] text-[#F5FF3D] transition-colors group-hover:bg-[#F5FF3D] group-hover:text-black">
                <Plus className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-display text-sm font-semibold text-[#EFEDE6]">Start a fresh run</span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Search maps and sites</span>
              </span>
            </button>
          </section>

          <section className="flex min-h-0 flex-1 flex-col border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[#EFEDE6]/10 px-3 py-2">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                <Clock className="h-3 w-3" /> Recent searches
              </span>
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B] transition-colors hover:text-[#EFEDE6]"
                >
                  <Trash2 className="h-2.5 w-2.5" /> Clear
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {history.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center border border-[#EFEDE6]/10">
                    <Search className="h-6 w-6 text-[#67645B]" />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">No searches yet</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Run a search to begin</p>
                </div>
              )}
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className="group w-full border border-[#EFEDE6]/[0.08] px-3 py-2.5 text-left transition-all hover:border-[#F5FF3D]/50 hover:bg-[#EFEDE6]/[0.03] active:translate-y-px"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[11px] font-bold text-[#EFEDE6]/90 transition-colors group-hover:text-[#F5FF3D]">
                        {entry.keyword}
                      </p>
                      <p className="truncate font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{entry.location}</p>
                    </div>
                    <span className="flex-shrink-0 font-mono text-[11px] font-bold text-[#F5FF3D]">
                      {entry.leadCount}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="flex items-center gap-0.5 font-mono text-[10px] text-[#67645B]">
                      <Mail className="h-2 w-2" /> {entry.emailCount}
                    </span>
                    <span className="flex items-center gap-0.5 font-mono text-[10px] text-[#67645B]">
                      <Phone className="h-2 w-2" /> {entry.whatsappCount}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-[#67645B]">{formatTime(entry.timestamp)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="flex-shrink-0 border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
            <div className="flex items-center justify-between border-b border-[#EFEDE6]/10 px-3 py-2">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                <Archive className="h-3 w-3" /> Lead archive
              </span>
              <button
                onClick={onViewAllLeads}
                className="font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] transition-colors hover:text-[#F5FF3D]"
              >
                Open
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                { label: "SEARCHES", value: totalSearches, icon: Search },
                { label: "LEADS", value: totalLeads, icon: Globe },
                { label: "EMAILS", value: totalEmails, icon: Mail },
                { label: "WHATSAPP", value: totalWhatsapp, icon: Phone },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="border border-[#EFEDE6]/[0.08] px-3 py-3 text-center transition-all hover:border-[#F5FF3D]/40"
                >
                  <p className="font-mono text-[18px] font-black tabular-nums text-[#EFEDE6]">{value}</p>
                  <p className="mt-1 flex items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                    <Icon className="h-2.5 w-2.5" /> {label}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={onViewAllLeads}
              className="flex w-full items-center justify-center gap-2 border-t border-[#EFEDE6]/10 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[#F5FF3D] transition-colors hover:bg-[#F5FF3D] hover:text-black"
            >
              <Archive className="h-3.5 w-3.5" /> View all leads
            </button>
          </section>
        </div>
      )}

      <div className="relative flex-shrink-0 border-t border-[#EFEDE6]/[0.10] px-4 py-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Zap className="h-4 w-4 text-[#F5FF3D]" />
            <span className="font-mono text-[10px] font-bold tabular-nums text-[#EFEDE6]">{creditsRemaining}</span>
          </div>
        ) : (
          <>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Credit ledger</span>
              <button
                onClick={onBuyCredits}
                className="flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] transition-colors hover:text-[#F5FF3D]"
              >
                Buy more <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="mb-2.5 flex items-baseline gap-1.5">
              <span className="font-mono text-[28px] font-black tabular-nums text-[#EFEDE6]">
                {creditsRemaining}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">/ {creditsTotal}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-[#EFEDE6]/[0.08]">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${creditPercent}%`,
                  background: creditPercent > 25 ? "#F5FF3D" : "#EF4444",
                }}
              />
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
              {creditsRemaining} remaining
            </p>
          </>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
