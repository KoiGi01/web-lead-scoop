import { useState } from "react";
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

type NavTab = "history" | "leads";

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
  const [activeTab, setActiveTab] = useState<NavTab>("history");
  const creditsRemaining = Math.max(0, creditsTotal - creditsUsed);
  const creditPercent = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0;

  const totalSearches = history.length;
  const totalLeads    = history.reduce((s, h) => s + h.leadCount, 0);
  const totalEmails   = history.reduce((s, h) => s + h.emailCount, 0);
  const totalWhatsapp = history.reduce((s, h) => s + h.whatsappCount, 0);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs  = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)  return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 overflow-hidden border-r border-white/[0.06] transition-all duration-300 ease-in-out relative ${
        collapsed ? "w-20" : "w-72"
      }`}
      style={{ background: "#0a0a0a" }}
    >
      {/* Scanline texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)",
        }}
      />

      {/* ═══ HEADER ═══ */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06] h-14 flex-shrink-0">
        {!collapsed && (
          <span className="label-mono text-white/20">// PANEL</span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-white/30 hover:text-white/80 transition-colors flex-shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* ═══ NEW SEARCH BUTTON ═══ */}
      <div className="relative px-3 py-3 flex-shrink-0">
        {collapsed ? (
          <button
            onClick={onNewSearch}
            className="w-full p-2.5 text-white/80 hover:text-white border border-white/[0.12] hover:border-white/30 transition-all flex items-center justify-center"
            style={{ borderRadius: "3px" }}
            title="New Search"
          >
            <Plus className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={onNewSearch}
            className="btn-btc w-full flex items-center justify-center gap-2 py-2.5 text-[11px]"
          >
            <Plus className="h-4 w-4" /> NEW SEARCH
          </button>
        )}
      </div>

      {/* ═══ NAVIGATION TABS ═══ */}
      {!collapsed && (
        <div className="relative px-4 pt-1 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex">
            {([
              { key: "history" as NavTab, label: "HISTORY", icon: Clock },
              { key: "leads" as NavTab, label: "ALL LEADS", icon: Archive },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-3 py-3 font-mono-data text-[9px] font-bold uppercase tracking-[0.15em] transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key
                    ? "text-white border-white"
                    : "text-white/25 border-transparent hover:text-white/50"
                }`}
              >
                <tab.icon className="h-3 w-3" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CONTENT AREA ═══ */}
      {!collapsed && (
        <div className="relative flex-1 overflow-hidden flex flex-col px-4 pt-3">
          {activeTab === "history" && (
            <>
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <span className="label-mono text-white/20">// RECENT</span>
                {history.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="label-mono text-white/20 hover:text-white/60 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="h-2.5 w-2.5" /> CLEAR
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5">
                {history.length === 0 && (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <div className="mx-auto mb-3 h-14 w-14 flex items-center justify-center border border-white/[0.06]"
                      style={{ borderRadius: "3px" }}>
                      <Search className="h-6 w-6 text-white/15" />
                    </div>
                    <p className="label-mono text-white/20">NO SEARCHES YET</p>
                    <p className="label-mono text-white/10 mt-1">RUN A SEARCH TO BEGIN</p>
                  </div>
                )}
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className="w-full text-left px-3 py-2.5 transition-all border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.02] group active:translate-y-px"
                    style={{ borderRadius: "3px" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono-data text-[11px] font-bold text-white/80 truncate group-hover:text-white transition-colors">
                          {entry.keyword}
                        </p>
                        <p className="label-mono text-white/20 truncate">{entry.location}</p>
                      </div>
                      <span className="flex-shrink-0 font-mono-data text-[11px] font-bold text-white/50">
                        {entry.leadCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="label-mono text-white/15 flex items-center gap-0.5">
                        <Mail className="h-2 w-2" /> {entry.emailCount}
                      </span>
                      <span className="label-mono text-white/15 flex items-center gap-0.5">
                        <Phone className="h-2 w-2" /> {entry.whatsappCount}
                      </span>
                      <span className="label-mono text-white/15 ml-auto">{formatTime(entry.timestamp)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === "leads" && (
            <>
              <span className="label-mono text-white/20 mb-3 flex-shrink-0">// LIFETIME STATS</span>
              <div className="grid grid-cols-2 gap-2 mb-4 flex-shrink-0">
                {[
                  { label: "SEARCHES", value: totalSearches, icon: Search },
                  { label: "LEADS",    value: totalLeads,    icon: Globe },
                  { label: "EMAILS",   value: totalEmails,   icon: Mail },
                  { label: "WHATSAPP", value: totalWhatsapp, icon: Phone },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="px-3 py-3 text-center border border-white/[0.06] hover:border-white/[0.12] transition-all"
                    style={{ borderRadius: "3px" }}
                  >
                    <p className="font-black text-white/80 tabular-nums"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "18px" }}>{value}</p>
                    <p className="label-mono text-white/20 flex items-center justify-center gap-1 mt-1">
                      <Icon className="h-2.5 w-2.5" /> {label}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={onViewAllLeads}
                className="btn-btc w-full flex items-center justify-center gap-2 py-2.5 text-[11px] mt-auto mb-4 flex-shrink-0"
              >
                <Archive className="h-4 w-4" /> VIEW ALL LEADS
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ CREDITS BAR ═══ */}
      <div className="relative border-t border-white/[0.06] px-4 py-4 flex-shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Zap className="h-4 w-4 text-white/40" />
            <span className="font-mono-data text-[10px] font-bold text-white/60 tabular-nums">{creditsRemaining}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2.5">
              <span className="label-mono text-white/20">// CREDITS</span>
              <button
                onClick={onBuyCredits}
                className="label-mono text-white/35 hover:text-white/70 flex items-center gap-0.5 transition-colors"
              >
                BUY MORE <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2.5">
              <span className="font-black text-white/90 tabular-nums"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "28px" }}>
                {creditsRemaining}
              </span>
              <span className="label-mono text-white/20">/ {creditsTotal}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-white/[0.06]" style={{ borderRadius: "1px" }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${creditPercent}%`,
                  background: creditPercent > 25 ? "rgba(255,255,255,0.7)" : "#ff4757",
                }}
              />
            </div>
            <p className="label-mono text-white/15 mt-2">
              {creditsRemaining} REMAINING
            </p>
          </>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
