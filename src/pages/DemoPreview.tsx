import { useState } from "react";
import DemoLaptop, { DemoScene } from "@/components/landing/demo/DemoLaptop";
import { Button } from "@/components/ui/button";

const DemoPreview = () => {
  const [scene, setScene] = useState<DemoScene>(0);
  const [progress, setProgress] = useState(0.5);
  const [autoplay, setAutoplay] = useState(false);

  return (
    <div className="min-h-screen bg-petrol-900 text-cream-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold mb-2">DemoLaptop preview</h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-cream-100/40">
            // dev only — phase A scaffolding
          </p>
        </div>

        <div className="rounded-lg border border-cream-100/8 bg-petrol-800 p-6 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-cream-100/50">
              scene:
            </span>
            {([0, 1, 2, 3] as DemoScene[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setAutoplay(false);
                  setScene(s);
                }}
                className={`h-8 px-3 rounded-md font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  scene === s && !autoplay
                    ? "bg-wine-700 text-cream-100"
                    : "bg-cream-100/5 border border-cream-100/12 text-cream-300 hover:border-cream-100/25"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <span className="font-mono text-[11px] uppercase tracking-widest text-cream-100/50">
              progress:
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              onChange={(e) => {
                setAutoplay(false);
                setProgress(parseFloat(e.target.value));
              }}
              className="flex-1 accent-wine-500"
              disabled={autoplay}
            />
            <span className="font-mono text-[11px] tabular-nums text-cream-100/60 w-12 text-right">
              {progress.toFixed(2)}
            </span>
          </div>

          <Button
            variant={autoplay ? "accent" : "secondary"}
            size="sm"
            onClick={() => setAutoplay(!autoplay)}
          >
            {autoplay ? "Stop autoplay" : "Start autoplay"}
          </Button>
        </div>

        <DemoLaptop
          scene={autoplay ? undefined : scene}
          progress={autoplay ? undefined : progress}
          autoplay={autoplay}
        />
      </div>
    </div>
  );
};

export default DemoPreview;
