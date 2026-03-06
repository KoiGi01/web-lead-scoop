import { useEffect, useRef, useState } from "react";

const stats = [
  { display: "34K+",  label: "LEADS GENERATED" },
  { display: "8,200+",label: "BUSINESSES SCRAPED" },
  { display: "47",    label: "COUNTRIES" },
  { display: "~2MIN", label: "AVG SEARCH TIME" },
];

const StatsBar = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="border-y border-white/[0.06] bg-black/40 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col items-center justify-center gap-1.5 px-6 py-8 ${i < stats.length - 1 ? "border-r border-white/[0.05]" : ""} ${visible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <p className="text-2xl font-black text-white tabular-nums tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>{s.display}</p>
              <p className="label-mono">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
