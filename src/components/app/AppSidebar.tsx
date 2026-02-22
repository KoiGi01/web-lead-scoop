import { useState } from "react";
import {
  Search, BarChart3, Clock, Trash2, Plus, Mail, Phone, Globe,
  ChevronLeft, ChevronRight, Zap, ArrowUpRight, Archive,
} from "lucide-react";

export interface SearchHistoryEntry {
  id: string;
  keyword: string;
  location: string;
  leadCount: number;
  emailCount: number;
  whatsappCount: number;
  timestamp: number;
}

interface AppSidebarProps {
  history: SearchHistoryEntry[];
  onSelectEntry: (entry: SearchHistoryEntry) => void;
  onNewSearch: () => void;
  onClearHistory: () => void;
  onViewAllLeads: () => void;
  creditsUsed: number;
  creditsTotal: number;
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

  /* ── Collapsed rail (reference design style) ── */
  if (collapsed) {
    return (
      <aside
        className="hidden md:flex flex-col items-center w-20 py-4 gap-3 flex-shrink-0 border-r border-white/10 bg-[#0F1115]"
      >
        {/* Logo/brand placeholder */}
        <div
          className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#EA580C] to-[#F7931A] flex items-center justify-center text-white font-bold text-sm"
          style={{ boxShadow: "0 0 12px rgba(247,147,26,0.3)" }}
        >
          GL
        </div>

        {/* Separator */}
        <div className="w-8 h-px bg-white/10" />

        {/* Navigation buttons */}
        <button
          onClick={onNewSearch}
          className="p-2.5 rounded-lg text-white bg-gradient-to-r from-[#EA580C] to-[#F7931A] transition-all hover:shadow-lg"
          style={{ boxShadow: "0 0 16px rgba(247,147,26,0.3)" }}
          title="New Search"
        >
          <Plus className="h-5 w-5" />
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`p-2.5 rounded-lg transition-all ${
            activeTab === "history"
              ? "text-white bg-white/10 border border-white/20"
              : "text-[#94A3B8] hover:text-white border border-white/10"
          }`}
          title="History"
        >
          <Clock className="h-5 w-5" />
        </button>

        <button
          onClick={onViewAllLeads}
          className="p-2.5 rounded-lg text-[#94A3B8] hover:text-white transition-all border border-white/10 hover:border-[#F7931A]/50"
          title="All Leads"
        >
          <Archive className="h-5 w-5" />
        </button>

        <button
          className="p-2.5 rounded-lg text-[#94A3B8] hover:text-white transition-all border border-white/10 hover:border-[#F7931A]/50"
          title="Stats"
        >
          <BarChart3 className="h-5 w-5" />
        </button>

        {/* Separator */}
        <div className="w-8 h-px bg-white/10 mt-auto" />

        {/* Credits compact */}
        <div className="flex flex-col items-center gap-1.5 pt-2">
          <Zap className="h-4 w-4 text-[#F7931A]" />
          <span className="font-mono text-[10px] font-bold text-[#F7931A]">{creditsRemaining}</span>
        </div>

        {/* Expand button */}
        <button
          onClick={onToggleCollapse}
          className="p-2.5 rounded-lg text-[#94A3B8] hover:text-white transition-colors border border-white/10 hover:border-[#F7931A]/50 mt-auto"
          title="Expand"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  /* ── Expanded sidebar ── */
  return (
    <aside
      className="hidden md:flex flex-col w-72 flex-shrink-0 overflow-hidden border-r border-white/10 bg-[#0F1115]"
    >
      {/* Header with collapse button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#EA580C] to-[#F7931A] flex items-center justify-center text-white font-bold text-xs"
            style={{ boxShadow: "0 0 12px rgba(247,147,26,0.3)" }}
          >
            GL
          </div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-white">
            GlobaLeads
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white transition-colors border border-white/10 hover:border-[#F7931A]/50"
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* New Search Button */}
      <div className="px-4 pt-3 pb-2">
        <button
          onClick={onNewSearch}
          className="btn-btc w-full flex items-center justify-center gap-2 rounded-lg py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-white"
        >
          <Plus className="h-4 w-4" /> New Search
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="px-4 pt-2 border-b border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-3 py-2.5 rounded-t-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
              activeTab === "history"
                ? "text-white border-[#F7931A] bg-white/5"
                : "text-[#94A3B8] border-transparent hover:text-white"
            }`}
          >
            <Clock className="h-3 w-3 inline mr-1" /> History
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`flex-1 px-3 py-2.5 rounded-t-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
              activeTab === "leads"
                ? "text-white border-[#F7931A] bg-white/5"
                : "text-[#94A3B8] border-transparent hover:text-white"
            }`}
          >
            <Archive className="h-3 w-3 inline mr-1" /> All Leads
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 pt-3">
        {/* History Tab */}
        {activeTab === "history" && (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[9px] uppercase tracking-widest font-bold text-[#94A3B8]">
                Recent Searches
              </p>
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="font-mono text-[9px] text-[#94A3B8] hover:text-[#F7931A] transition-colors flex items-center gap-1 uppercase tracking-wider"
                >
                  <Trash2 className="h-2.5 w-2.5" /> Clear
                </button>
              )}
            </div>

            {/* History items */}
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5">
              {history.length === 0 && (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div
                    className="mx-auto mb-3 h-14 w-14 rounded-full flex items-center justify-center border border-white/10 bg-white/5"
                  >
                    <Search className="h-6 w-6 text-[#94A3B8]" />
                  </div>
                  <p className="font-mono text-[10px] text-[#94A3B8] uppercase tracking-wider">No searches yet</p>
                  <p className="font-mono text-[9px] text-[#94A3B8]/50 mt-1 uppercase tracking-wider">Run a search to see history</p>
                </div>
              )}
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className="w-full text-left rounded-lg px-3 py-2.5 transition-all bg-[#030304] border border-white/10 hover:border-[#F7931A]/50 hover:bg-[#F7931A]/5 group active:translate-y-px"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold text-white truncate group-hover:text-[#F7931A] transition-colors">
                        {entry.keyword}
                      </p>
                      <p className="font-mono text-[9px] text-[#94A3B8] truncate uppercase tracking-wider">{entry.location}</p>
                    </div>
                    <span className="flex-shrink-0 font-mono text-[10px] font-bold text-[#F7931A]">
                      {entry.leadCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 font-mono text-[8px] text-[#94A3B8] uppercase tracking-wider">
                    <span className="flex items-center gap-0.5">
                      <Mail className="h-2 w-2" /> {entry.emailCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Phone className="h-2 w-2" /> {entry.whatsappCount}
                    </span>
                    <span className="ml-auto text-[9px]">{formatTime(entry.timestamp)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* All Leads Tab */}
        {activeTab === "leads" && (
          <>
            {/* Stats Grid */}
            <p className="font-mono text-[9px] uppercase tracking-widest font-bold text-[#94A3B8] mb-2.5">
              Lifetime Stats
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Searches", value: totalSearches, icon: Search },
                { label: "Leads",    value: totalLeads,    icon: Globe },
                { label: "Emails",   value: totalEmails,   icon: Mail },
                { label: "WhatsApp", value: totalWhatsapp, icon: Phone },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-lg px-3 py-3 text-center bg-[#030304] border border-white/10 hover:border-[#F7931A]/30 transition-all"
                >
                  <p className="font-mono text-base font-bold text-[#F7931A]">{value}</p>
                  <p className="font-mono text-[8px] text-[#94A3B8] flex items-center justify-center gap-1 mt-1 uppercase tracking-wider">
                    <Icon className="h-2.5 w-2.5" /> {label}
                  </p>
                </div>
              ))}
            </div>

            {/* View All Leads Button */}
            <button
              onClick={onViewAllLeads}
              className="btn-btc w-full flex items-center justify-center gap-2 rounded-lg py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-white mt-auto mb-4"
            >
              <Archive className="h-4 w-4" /> View All Leads
            </button>
          </>
        )}
      </div>

      {/* Credits — pinned bottom */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-[#94A3B8]">Credits</span>
          <a
            href="#pricing"
            className="font-mono text-[9px] font-bold text-[#F7931A] hover:underline flex items-center gap-0.5 uppercase tracking-wider"
          >
            Upgrade <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="font-mono text-2xl font-bold text-[#F7931A]">
            {creditsRemaining}
          </span>
          <span className="font-mono text-sm text-[#94A3B8]">/ {creditsTotal}</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden bg-[#030304] border border-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#EA580C] to-[#F7931A] transition-all duration-500"
            style={{ width: `${creditPercent}%`, boxShadow: "0 0 12px rgba(247,147,26,0.4)" }}
          />
        </div>
        <p className="font-mono text-[9px] text-[#94A3B8] mt-1.5 uppercase tracking-wider">
          {creditsRemaining} remaining
        </p>
      </div>
    </aside>
  );
};

export default AppSidebar;
