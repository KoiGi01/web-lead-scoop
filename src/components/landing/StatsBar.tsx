import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 34000, display: "34K+", label: "Leads Generated" },
  { value: 8200, display: "8,200+", label: "Businesses Scraped" },
  { value: 47, display: "47", label: "Countries Supported" },
  { value: 2, display: "~2 min", label: "Avg. Search Time" },
];

const StatsBar = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="border-y border-[rgba(0,0,0,0.06)] bg-white">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col items-center justify-center gap-1 px-6 py-8 ${
                i < stats.length - 1 ? "border-r border-[rgba(0,0,0,0.06)]" : ""
              } ${visible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <p className="text-3xl font-bold text-[#1d1d1f] tabular-nums">
                {s.display}
              </p>
              <p className="text-xs font-medium text-[#6e6e73] tracking-wide">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
