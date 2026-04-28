import { useEffect, useRef, useState } from "react";

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1600, active: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return value;
}

// ─── Individual stat cell ─────────────────────────────────────────────────────
interface StatCellProps {
  label: string;
  target: number;
  /** How to format the raw integer into display text */
  format: (n: number) => React.ReactNode;
  desc: string;
  isLast: boolean;
  active: boolean;
  delay: number;
}

const StatCell = ({ label, target, format, desc, isLast, active, delay }: StatCellProps) => {
  const val = useCountUp(target, 1600, active);

  return (
    <div
      className={`flex flex-col px-8 py-10 border-b border-[#EFEDE6]/[0.14] ${!isLast ? "border-r border-[#EFEDE6]/[0.14]" : ""}`}
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      <p className="text-[13px] tracking-wide mb-6" style={{ color: "#67645B" }}>{label}</p>
      <p
        className="font-display font-extrabold tabular-nums leading-none tracking-tighter mb-3.5"
        style={{ fontSize: "80px", color: "#EFEDE6" }}
      >
        {format(val)}
      </p>
      <p className="text-[13px]" style={{ color: "#A8A59C" }}>{desc}</p>
    </div>
  );
};

// ─── Format helpers ────────────────────────────────────────────────────────────
const fmt2_4M = (n: number): React.ReactNode => {
  const m = (n / 1000000).toFixed(1);
  return (
    <>
      {m}
      <em
        className="font-serif not-italic"
        style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}
      >
        M+
      </em>
    </>
  );
};

const fmtPct = (n: number): React.ReactNode => (
  <>
    {n}
    <em
      className="font-serif"
      style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}
    >
      %
    </em>
  </>
);

const fmtTime = (_n: number): React.ReactNode => (
  <>
    {"~90"}
    <em
      className="font-serif"
      style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}
    >
      s
    </em>
  </>
);

const fmtPlain = (n: number): React.ReactNode => <>{n}</>;

const STATS = [
  {
    label: "Total leads extracted",
    target: 2400000,
    format: fmt2_4M,
    desc: "Verified businesses worldwide",
  },
  {
    label: "Email hit-rate",
    target: 91,
    format: fmtPct,
    desc: "Deliverable inboxes",
  },
  {
    label: "Median search time",
    target: 90,
    format: fmtTime,
    desc: "Keyword to ranked sheet",
  },
  {
    label: "Free credits to start",
    target: 50,
    format: fmtPlain,
    desc: "No card required",
  },
];

// ─── Section ──────────────────────────────────────────────────────────────────
const StatsBandSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [headingVisible, setHeadingVisible] = useState(false);

  useEffect(() => {
    const headingObs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHeadingVisible(true); },
      { threshold: 0.2 }
    );
    const statsObs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.15 }
    );
    if (headingRef.current) headingObs.observe(headingRef.current);
    if (sectionRef.current) statsObs.observe(sectionRef.current);
    return () => { headingObs.disconnect(); statsObs.disconnect(); };
  }, []);

  return (
    <section
      className="border-b border-[#EFEDE6]/[0.14]"
      style={{ backgroundColor: "#000", paddingTop: "112px", paddingBottom: "112px" }}
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 32px" }}>

        {/* Heading row */}
        <div
          ref={headingRef}
          className="grid mb-16"
          style={{
            gridTemplateColumns: "1fr 1.4fr",
            gap: "48px",
            opacity: headingVisible ? 1 : 0,
            transform: headingVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <h2
            className="font-display font-extrabold tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(44px, 5.2vw, 76px)", color: "#EFEDE6" }}
          >
            The pipeline runs{" "}
            <em
              className="font-serif"
              style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}
            >
              quietly
            </em>
            , in the background.
          </h2>

          <div className="flex items-end pb-1">
            <p style={{ fontSize: "16px", color: "#A8A59C", lineHeight: "1.6" }}>
              Real numbers from real searches, last 30 days. No vanity rounding.
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div
          ref={sectionRef}
          className="grid grid-cols-4 border-t border-[#EFEDE6]/[0.14]"
        >
          {STATS.map((stat, i) => (
            <StatCell
              key={stat.label}
              label={stat.label}
              target={stat.target}
              format={stat.format}
              desc={stat.desc}
              isLast={i === STATS.length - 1}
              active={statsVisible}
              delay={i * 80}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default StatsBandSection;
