import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  prefix?: string;
}

const stats: Stat[] = [
  { value: 34,   suffix: "K+",   label: "Leads Generated" },
  { value: 8200, suffix: "+",    label: "Businesses Scraped" },
  { value: 47,   suffix: "+",    label: "Countries Supported" },
  { value: 2,    prefix: "~", suffix: " min", label: "Avg. Search Time" },
];

function useCountUp(target: number, duration = 1600, active = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return count;
}

function StatItem({ stat, active }: { stat: Stat; active: boolean }) {
  const count = useCountUp(stat.value, 1600, active);
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8">
      <p className="font-mono-data text-3xl font-bold text-[#F7931A] tabular-nums">
        {stat.prefix ?? ""}{count.toLocaleString()}{stat.suffix}
      </p>
      <p className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {stat.label}
      </p>
    </div>
  );
}

const StatsBar = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden border-y border-slate-200/50 bg-white/60 backdrop-blur-md"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-12 bg-[#F7931A] opacity-[0.04] blur-[60px]" />
      </div>
      <div className="relative mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200/50">
          {stats.map((s) => (
            <StatItem key={s.label} stat={s} active={active} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
