import { Loader2 } from "lucide-react";

export interface ScanStatus {
  active: boolean;
  progress: number;
  label: string;
}

interface ScanStatusDockProps {
  status: ScanStatus | null;
  onOpen: () => void;
}

// Persistent (non-dismissing) progress pill. Stays pinned bottom-right while a
// scan runs so the user can navigate the app and still watch / jump back to it.
const ScanStatusDock = ({ status, onOpen }: ScanStatusDockProps) => {
  if (!status?.active) return null;
  const pct = Math.max(0, Math.min(100, Math.round(status.progress)));

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Scan running — ${pct}%. Open scan.`}
      className="fixed bottom-5 right-5 z-[60] flex w-[272px] items-center gap-3 rounded-[13px] border border-[#e8fb52]/30 bg-gradient-to-b from-[#16191f] to-[#0a0b0e] p-3.5 text-left shadow-[0_20px_44px_-14px_rgba(0,0,0,0.75),0_0_34px_-14px_rgba(232,251,82,0.55)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <span className="relative grid h-9 w-9 shrink-0 place-items-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#e8fb52]/30" />
        <span className="absolute font-mono text-[9px] font-bold tabular-nums text-[#e8fb52]">{pct}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5fe3a1]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5fe3a1] shadow-[0_0_8px_#5fe3a1]" />
          Scan running
        </span>
        <span className="mt-1 block truncate text-[13px] font-semibold text-[#f3f5f8]">{status.label}</span>
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-[#f3f5f8]/10">
          <span
            className="block h-full rounded-full bg-[#e8fb52] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
    </button>
  );
};

export default ScanStatusDock;
