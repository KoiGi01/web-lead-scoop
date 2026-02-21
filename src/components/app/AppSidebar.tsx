import {
  Search, BarChart3, Clock, Trash2, Plus, Mail, Phone, Globe,
  ChevronLeft, ChevronRight, Zap, ArrowUpRight,
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
  creditsUsed: number;
  creditsTotal: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AppSidebar = ({
  history,
  onSelectEntry,
  onNewSearch,
  onClearHistory,
  creditsUsed,
  creditsTotal,
  collapsed = false,
  onToggleCollapse,
}: AppSidebarProps) => {
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

  /* ── Collapsed rail ── */
  if (collapsed) {
    return (
      <aside
        className="hidden md:flex flex-col items-center w-14 py-4 gap-3 flex-shrink-0 border-r border-[#babecc]"
        style={{ background: "#e0e5ec" }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-[#4a5568] hover:text-[#2d3436] transition-colors btn-press"
          style={{ boxShadow: "var(--shadow-card)" }}
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={onNewSearch}
          className="p-2 rounded-lg text-white bg-[#ff4757] btn-press"
          style={{ boxShadow: "4px 4px 8px rgba(166,50,60,0.3), -2px -2px 6px rgba(255,100,110,0.2)" }}
          title="New Search"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          className="p-2 rounded-lg text-[#4a5568] btn-press"
          style={{ boxShadow: "var(--shadow-recessed)" }}
          title="History"
        >
          <Clock className="h-4 w-4" />
        </button>
        <button
          className="p-2 rounded-lg text-[#4a5568] btn-press"
          style={{ boxShadow: "var(--shadow-recessed)" }}
          title="Stats"
        >
          <BarChart3 className="h-4 w-4" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-1">
          <Zap className="h-4 w-4 text-[#ff4757]" />
          <span className="font-mono-data text-[10px] font-bold text-[#2d3436]">{creditsRemaining}</span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="hidden md:flex flex-col w-64 flex-shrink-0 overflow-hidden border-r border-[#babecc]"
      style={{ background: "#e0e5ec" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[#babecc]"
      >
        <span
          className="font-mono-data text-[10px] font-bold uppercase tracking-widest text-[#4a5568]"
        >
          Dashboard
        </span>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#2d3436] transition-colors btn-press"
          style={{ boxShadow: "var(--shadow-recessed)" }}
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* New Search Button */}
      <div className="px-3 pt-3">
        <button
          onClick={onNewSearch}
          className="btn-press w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-mono-data text-[11px] font-bold uppercase tracking-widest text-white bg-[#ff4757]"
          style={{ boxShadow: "4px 4px 8px rgba(166,50,60,0.3), -2px -2px 6px rgba(255,100,110,0.2)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <Plus className="h-3.5 w-3.5" /> New Search
        </button>
      </div>

      {/* Stats Grid */}
      <div className="px-3 pt-4 pb-2">
        <p className="font-mono-data text-[9px] uppercase tracking-widest font-bold text-[#4a5568] mb-2.5 flex items-center gap-1.5">
          <BarChart3 className="h-2.5 w-2.5" /> Stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Searches", value: totalSearches, icon: Search },
            { label: "Leads",    value: totalLeads,    icon: Globe },
            { label: "Emails",   value: totalEmails,   icon: Mail },
            { label: "WhatsApp", value: totalWhatsapp, icon: Phone },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl px-3 py-2.5 text-center"
              style={{ boxShadow: "var(--shadow-recessed)", background: "#d1d9e6" }}
            >
              <p className="font-mono-data text-lg font-bold text-[#2d3436] leading-tight">{value}</p>
              <p className="font-mono-data text-[8px] text-[#4a5568] flex items-center justify-center gap-1 mt-0.5 uppercase tracking-wider">
                <Icon className="h-2 w-2" /> {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-[#babecc]/60 my-1" />

      {/* Search History */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono-data text-[9px] uppercase tracking-widest font-bold text-[#4a5568] flex items-center gap-1.5">
            <Clock className="h-2.5 w-2.5" /> Recent Searches
          </p>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="font-mono-data text-[9px] text-[#4a5568] hover:text-[#ff4757] transition-colors flex items-center gap-1 uppercase tracking-wider"
            >
              <Trash2 className="h-2.5 w-2.5" /> Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5">
          {history.length === 0 && (
            <div className="py-8 text-center">
              <div
                className="mx-auto mb-3 h-12 w-12 rounded-full flex items-center justify-center"
                style={{ boxShadow: "var(--shadow-recessed)" }}
              >
                <Search className="h-5 w-5 text-[#babecc]" />
              </div>
              <p className="font-mono-data text-[10px] text-[#4a5568] uppercase tracking-wider">No searches yet</p>
              <p className="font-mono-data text-[9px] text-[#babecc] mt-1 uppercase tracking-wider">Run a search to see history</p>
            </div>
          )}
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="w-full text-left rounded-xl px-3 py-2.5 transition-all group btn-press"
              style={{ boxShadow: "var(--shadow-recessed)", background: "#d1d9e6" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono-data text-[11px] font-bold text-[#2d3436] truncate group-hover:text-[#ff4757] transition-colors">
                    {entry.keyword}
                  </p>
                  <p className="font-mono-data text-[9px] text-[#4a5568] truncate uppercase tracking-wider">{entry.location}</p>
                </div>
                <span
                  className="flex-shrink-0 rounded-full px-2 py-0.5 font-mono-data text-[9px] font-bold text-[#ff4757]"
                  style={{ boxShadow: "var(--shadow-floating)", background: "#e0e5ec" }}
                >
                  {entry.leadCount}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 font-mono-data text-[9px] text-[#4a5568] uppercase tracking-wider">
                <span className="flex items-center gap-0.5">
                  <Mail className="h-2 w-2" /> {entry.emailCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <Phone className="h-2 w-2" /> {entry.whatsappCount}
                </span>
                <span className="ml-auto">{formatTime(entry.timestamp)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Credits — pinned bottom */}
      <div className="mt-auto border-t border-[#babecc]/60 px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono-data text-[9px] uppercase tracking-widest text-[#4a5568]">Credits</span>
          <a
            href="#pricing"
            className="font-mono-data text-[9px] font-bold text-[#ff4757] hover:underline flex items-center gap-0.5 uppercase tracking-wider"
          >
            Upgrade <ArrowUpRight className="h-2.5 w-2.5" />
          </a>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="font-mono-data text-2xl font-bold text-[#2d3436]" style={{ textShadow: "0 1px 0 #ffffff" }}>
            {creditsRemaining}
          </span>
          <span className="font-mono-data text-sm text-[#4a5568]">/ {creditsTotal}</span>
        </div>
        {/* Progress bar — neumorphic */}
        <div className="h-2 rounded-full overflow-hidden" style={{ boxShadow: "var(--shadow-recessed)", background: "#d1d9e6" }}>
          <div
            className="h-full rounded-full bg-[#ff4757] transition-all duration-500"
            style={{ width: `${creditPercent}%`, boxShadow: "0 0 6px rgba(255,71,87,0.5)" }}
          />
        </div>
        <p className="font-mono-data text-[9px] text-[#4a5568] mt-1.5 uppercase tracking-wider">
          {creditsUsed} of {creditsTotal} used
        </p>
      </div>
    </aside>
  );
};

export default AppSidebar;
