import { ArrowRight, Bookmark, Clock, RotateCcw } from "lucide-react";
import type { SearchHistoryEntry } from "@/hooks/useSearchHistory";

interface SavedSearchesProps {
  history: SearchHistoryEntry[];
  loading?: boolean;
  onRerun: (entry: SearchHistoryEntry) => void;
  onOpenLeadInbox: () => void;
}

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));

const SavedSearches = ({ history, loading = false, onRerun, onOpenLeadInbox }: SavedSearchesProps) => (
  <section className="flex flex-1 flex-col overflow-hidden bg-black text-[#f3f5f8]">
    <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
      <div className="mb-3 border-b border-[#f3f5f8]/[0.14] pb-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#e8fb52]">Saved Searches</p>
        <h2 className="font-display text-2xl font-black leading-none tracking-[-0.04em] text-[#f3f5f8]">
          Search runs
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center border border-[#f3f5f8]/[0.14] bg-[#111319]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Loading searches...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center border border-[#f3f5f8]/[0.14] bg-[#111319] px-6 text-center">
          <Bookmark className="mb-4 h-10 w-10 text-[#5d6675]" />
          <p className="font-display text-2xl font-bold text-[#f3f5f8]">No saved searches yet.</p>
          <p className="mt-2 max-w-md text-sm text-[#9aa3b2]">Run a search and it will show up here for quick reruns.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto border border-[#f3f5f8]/[0.14] bg-[#111319]">
          <div className="divide-y divide-[#f3f5f8]/10">
            {history.map(entry => (
              <article key={entry.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display text-lg font-bold text-[#f3f5f8]">{entry.keyword}</h3>
                    <span className="border border-[#f3f5f8]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#9aa3b2]">
                      {entry.location}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
                    <span>{entry.leadCount} leads</span>
                    <span>{entry.emailCount} emails</span>
                    <span>{entry.whatsappCount} WhatsApp</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(entry.timestamp)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onRerun(entry)}
                    className="inline-flex h-9 items-center gap-2 border border-[#e8fb52] bg-[#e8fb52] px-3 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#f3ff8a]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Rerun
                  </button>
                  <button
                    onClick={onOpenLeadInbox}
                    className="inline-flex h-9 items-center gap-2 border border-[#f3f5f8]/10 px-3 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] hover:border-[#e8fb52] hover:text-[#e8fb52]"
                  >
                    View leads <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  </section>
);

export default SavedSearches;
