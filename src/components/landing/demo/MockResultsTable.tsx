import { Mail, Phone, Linkedin, Zap } from "lucide-react";
import { MockLead } from "./mockData";
import { cn } from "@/lib/utils";

interface MockResultsTableProps {
  leads: MockLead[];
  visibleCount: number;
  highlightId?: string | null;
  showScores?: boolean;
}

const MockResultsTable = ({
  leads,
  visibleCount,
  highlightId,
  showScores = false,
}: MockResultsTableProps) => {
  const visible = leads.slice(0, Math.max(0, visibleCount));

  return (
    <div className="rounded-md border border-cream-100/8 bg-petrol-800 overflow-hidden">
      <div className="grid grid-cols-[1.6fr_1fr_1.4fr_auto] gap-3 px-4 py-2.5 bg-petrol-900/60 border-b border-cream-100/8">
        {["Business", "Phone", "Email", showScores ? "Score" : "Actions"].map((h) => (
          <div
            key={h}
            className="font-mono text-[9px] font-bold uppercase tracking-widest text-cream-100/35"
          >
            {h}
          </div>
        ))}
      </div>

      <div className="divide-y divide-cream-100/[0.04]">
        {visible.map((lead, i) => (
          <div
            key={lead.id}
            className={cn(
              "grid grid-cols-[1.6fr_1fr_1.4fr_auto] gap-3 px-4 py-2.5 items-center transition-colors",
              "animate-row-in",
              highlightId === lead.id ? "bg-wine-700/12" : "hover:bg-cream-100/[0.02]",
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="min-w-0">
              <p className="font-medium text-cream-100 text-[13px] truncate">
                {lead.name}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-cream-100/35 truncate">
                {lead.category}
              </p>
            </div>

            <div className="font-mono text-[11px] text-cream-300 truncate">
              {lead.phone}
            </div>

            <div className="font-mono text-[11px] text-wine-500 truncate">
              {lead.email}
            </div>

            {showScores ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-wine-700/15 border border-wine-700/30">
                <Zap className="h-3 w-3 text-wine-500" />
                <span className="font-mono text-[11px] font-bold text-wine-500 tabular-nums">
                  {lead.score}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="p-1 rounded bg-cream-100/5 border border-cream-100/8">
                  <Mail className="h-3 w-3 text-cream-300" />
                </span>
                <span className="p-1 rounded bg-cream-100/5 border border-cream-100/8">
                  <Phone className="h-3 w-3 text-cream-300" />
                </span>
                {lead.linkedin && (
                  <span className="p-1 rounded bg-cream-100/5 border border-cream-100/8">
                    <Linkedin className="h-3 w-3 text-cream-300" />
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {Array.from({ length: Math.max(0, leads.length - visible.length) }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className="grid grid-cols-[1.6fr_1fr_1.4fr_auto] gap-3 px-4 py-2.5 items-center"
          >
            <div className="h-3.5 w-2/3 rounded bg-cream-100/5" />
            <div className="h-3.5 w-3/4 rounded bg-cream-100/5" />
            <div className="h-3.5 w-4/5 rounded bg-cream-100/5" />
            <div className="h-3.5 w-12 rounded bg-cream-100/5" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MockResultsTable;
