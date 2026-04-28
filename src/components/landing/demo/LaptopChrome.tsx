import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LaptopChromeProps {
  children: ReactNode;
  className?: string;
}

const LaptopChrome = ({ children, className }: LaptopChromeProps) => {
  return (
    <div className={cn("w-full max-w-[920px] mx-auto select-none", className)}>
      <div
        className="relative rounded-t-2xl p-3 pb-2"
        style={{
          background: "linear-gradient(180deg, #1A1F22 0%, #0E1316 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 60px -20px rgba(0,0,0,0.45)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-2.5 pl-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-cream-100/30">
            globaleads22.com
          </span>
        </div>

        <div
          className="relative aspect-[16/10] w-full overflow-hidden rounded-b-md rounded-t-sm bg-petrol-900"
          style={{
            boxShadow:
              "inset 0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {children}
        </div>
      </div>

      <div className="relative mx-auto h-3 w-full" aria-hidden="true">
        <div
          className="absolute inset-x-0 top-0 h-3"
          style={{
            background:
              "linear-gradient(180deg, #14191C 0%, #0A0D0F 60%, transparent 100%)",
            clipPath: "polygon(2% 0, 98% 0, 96% 100%, 4% 100%)",
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-1 w-24 -translate-x-1/2 rounded-b-full"
          style={{ background: "rgba(0,0,0,0.6)" }}
        />
      </div>
    </div>
  );
};

export default LaptopChrome;
