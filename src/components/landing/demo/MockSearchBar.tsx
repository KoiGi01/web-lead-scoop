import { Search, MapPin, Loader2 } from "lucide-react";
import { useTypewriter } from "./useTypewriter";

interface MockSearchBarProps {
  query: string;
  progress: number;
  isSearching?: boolean;
}

const MockSearchBar = ({ query, progress, isSearching = false }: MockSearchBarProps) => {
  const typed = useTypewriter(query, progress);
  const showCaret = progress > 0 && progress < 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-cream-100/35">
          // SEARCH QUERY
        </span>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream-100/35" />
          <div className="h-10 rounded-md border border-cream-100/12 bg-petrol-800 pl-9 pr-3 flex items-center font-mono text-[13px] text-cream-100">
            <span>{typed}</span>
            {showCaret && (
              <span className="ml-0.5 inline-block h-3.5 w-[2px] bg-wine-500 animate-pulse" />
            )}
          </div>
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream-100/35" />
          <div className="h-10 rounded-md border border-cream-100/12 bg-petrol-800 pl-9 pr-3 flex items-center font-mono text-[13px] text-cream-100/60">
            <span>Madrid, Spain</span>
          </div>
        </div>

        <button
          disabled
          className="h-10 px-5 rounded-md bg-wine-700 text-cream-100 font-mono text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
          aria-disabled="true"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> SEARCHING
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5" /> GENERATE
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MockSearchBar;
