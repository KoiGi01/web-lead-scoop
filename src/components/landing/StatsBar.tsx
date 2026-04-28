import { useEffect, useRef, useState } from "react";

const stats = [
  { end: 34000, display: "34K+",   label: "LEADS GENERATED",    suffix: "+", prefix: "" },
  { end: 8200,  display: "8,200+", label: "BUSINESSES SCRAPED", suffix: "+", prefix: "" },
  { end: 47,    display: "47",     label: "COUNTRIES",           suffix: "",  prefix: "" },
  { end: 2,     display: "~2MIN",  label: "AVG SEARCH TIME",    suffix: "MIN", prefix: "~" },
];

function useCountUp(end: number, duration = 1400, active: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = end / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [end, duration, active]);
  return val;
}

const StatItem = ({ stat, visible, delay }: { stat: typeof stats[0]; visible: boolean; delay: number }) => {
  const raw = useCountUp(stat.end, 1400, visible);

  let formatted: string;
  if (stat.end >= 1000) {
    formatted = stat.prefix ? stat.prefix + Math.floor(raw / 1000) + "K" + stat.suffix
      : Math.floor(raw / 1000).toLocaleString() + "," + String(raw % 1000).padStart(3, "0") + stat.suffix;
    if (stat.end === 34000) formatted = stat.prefix ? stat.prefix + Math.floor(raw / 1000) + "K" + stat.suffix : Math.floor(raw / 1000) + "K" + stat.suffix;
    if (stat.end === 8200)  formatted = Math.floor(raw).toLocaleString() + stat.suffix;
  } else if (stat.end === 2) {
    formatted = visible ? stat.display : "~0MIN";
  } else {
    formatted = (stat.prefix ?? "") + raw + stat.suffix;
  }
  if (!visible) formatted = stat.end === 2 ? "~0MIN" : "0" + stat.suffix;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 py-10 relative ${visible ? "animate-fade-in-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p
        className="font-black text-cream-100 tabular-nums tracking-tight leading-none"
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(40px, 5vw, 64px)" }}
      >
        {visible ? stat.display : formatted}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-100/40">{stat.label}</p>
    </div>
  );
};

const StatsBar = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(true);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative border-y border-cream-100/[0.08] overflow-hidden bg-petrol-900">
      <div className="relative mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={i < stats.length - 1 ? "border-r border-cream-100/[0.08]" : ""}>
              <StatItem stat={s} visible={visible} delay={i * 90} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
