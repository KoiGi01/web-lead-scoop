import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ScoreEntry {
  who: string;
  score: number;
  reasons: [string, boolean][]; // [text, isNegative]
}

// ─── AI Score data ─────────────────────────────────────────────────────────────
const SCORE_DATA: ScoreEntry[] = [
  {
    who: "Clínica Almeida & Silva",
    score: 94,
    reasons: [
      ["Premium positioning + EN/PT site", false],
      ["Online booking → digital-mature", false],
      ["Visible team page + emails", false],
      ["Mid-size — limited expansion budget", true],
    ],
  },
  {
    who: "Sorriso Premium",
    score: 88,
    reasons: [
      ["Multi-location signals scale", false],
      ["Live chat → outbound-receptive", false],
      ["Active LinkedIn presence", false],
      ["Generic marketing email only", true],
    ],
  },
  {
    who: "DentaLab Estoril",
    score: 81,
    reasons: [
      ["B2B specialist — high deal value", false],
      ["WhatsApp-first reachability", false],
      ["Industry-specific keywords", false],
      ["Smaller team — slower decisions", true],
    ],
  },
  {
    who: "Clínica Ribeiro",
    score: 67,
    reasons: [
      ["Real practice, real patients", false],
      ["Phone-only contact channel", true],
      ["Static site, no team page", true],
      ["Family practice — low budget", true],
    ],
  },
];

// ─── Score bar row ─────────────────────────────────────────────────────────────
interface ScoreRowProps {
  entry: ScoreEntry;
  index: number;
  isHovered: boolean;
  isLocked: boolean;
  barsVisible: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}

const ScoreRow = ({
  entry, index, isHovered, isLocked, barsVisible, onHover, onLeave, onClick,
}: ScoreRowProps) => {
  const highlighted = isHovered || isLocked;
  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2.5 cursor-pointer"
      style={{
        backgroundColor: highlighted ? "rgba(245,255,61,0.06)" : "transparent",
        transition: "background-color 0.2s",
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span style={{ fontSize: "12px", color: "#EFEDE6", fontWeight: 500, lineHeight: 1.3 }}>
          {entry.who}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: highlighted ? "#F5FF3D" : "#EFEDE6",
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
            transition: "color 0.2s",
          }}
        >
          {entry.score}
        </span>
      </div>
      {/* Score bar */}
      <div
        className="w-full rounded-none overflow-hidden"
        style={{ height: "5px", backgroundColor: "rgba(239,237,230,0.08)" }}
      >
        <div
          style={{
            height: "100%",
            width: barsVisible ? `${entry.score}%` : "0%",
            backgroundColor: "#F5FF3D",
            transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${index * 120 + 200}ms`,
          }}
        />
      </div>
    </div>
  );
};

// ─── AI Score card (big card, col-span 1 row-span 2) ──────────────────────────
const AIScoreCard = ({ barsVisible }: { barsVisible: boolean }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number>(0);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);

  const activeIndex = lockedIndex !== null ? lockedIndex : hoveredIndex;

  const handleClick = useCallback((i: number) => {
    setLockedIndex((prev) => (prev === i ? null : i));
  }, []);

  const active = SCORE_DATA[activeIndex];

  return (
    <div
      className="flex flex-col border-b border-[#EFEDE6]/[0.14]"
      style={{
        padding: "32px",
        borderRight: "1px solid rgba(239,237,230,0.14)",
        gridRow: "span 2",
      }}
    >
      {/* Cat label */}
      <p style={{ fontSize: "13px", color: "#67645B", marginBottom: "18px", letterSpacing: "0.05em" }}>
        AI scoring
      </p>

      {/* h3 */}
      <h3
        className="font-display font-bold tracking-tight leading-snug mb-3"
        style={{ fontSize: "28px", color: "#EFEDE6" }}
      >
        Stop guessing which lead to{" "}
        <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
          email first
        </em>
        .
      </h3>

      {/* p */}
      <p style={{ fontSize: "14.5px", color: "#A8A59C", lineHeight: "1.7", marginBottom: "28px" }}>
        Every result gets a 0–100 fit score from a model that reads the company's website,
        services and reachability. Hover a row — see the reasoning.
      </p>

      {/* Two-col visual */}
      <div
        className="grid flex-1 gap-3"
        style={{ gridTemplateColumns: "1fr 1fr", minHeight: "220px" }}
      >
        {/* LEFT: score list */}
        <div className="flex flex-col gap-0.5">
          {SCORE_DATA.map((entry, i) => (
            <ScoreRow
              key={entry.who}
              entry={entry}
              index={i}
              isHovered={hoveredIndex === i && lockedIndex === null}
              isLocked={lockedIndex === i}
              barsVisible={barsVisible}
              onHover={() => setHoveredIndex(i)}
              onLeave={() => {}}
              onClick={() => handleClick(i)}
            />
          ))}
        </div>

        {/* RIGHT: explainer panel */}
        <div
          className="flex flex-col p-3 border border-[#EFEDE6]/[0.14]"
          style={{ backgroundColor: "rgba(245,255,61,0.03)" }}
        >
          {/* Big score */}
          <p
            className="font-display font-bold mb-1"
            style={{ fontSize: "34px", color: "#F5FF3D", lineHeight: 1 }}
          >
            {active.score}
          </p>
          <p style={{ fontSize: "10px", color: "#67645B", marginBottom: "10px", letterSpacing: "0.08em" }}>
            HOVER A ROW
          </p>

          {/* Who */}
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#EFEDE6",
              marginBottom: "12px",
              lineHeight: 1.4,
            }}
          >
            {active.who}
          </p>

          {/* Reasons */}
          <div className="flex flex-col gap-2">
            {active.reasons.map(([text, isNeg], j) => (
              <div key={j} className="flex items-start gap-2">
                <span
                  className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: isNeg ? "#67645B" : "#F5FF3D" }}
                />
                <span style={{ fontSize: "11px", color: isNeg ? "#67645B" : "#A8A59C", lineHeight: 1.5 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Multi-channel card ────────────────────────────────────────────────────────
const SOURCES = [
  { icon: "@", label: "Email" },
  { icon: "in", label: "LinkedIn" },
  { icon: "W", label: "WhatsApp" },
  { icon: "G", label: "Maps" },
  { icon: "☏", label: "Phone" },
  { icon: "⌖", label: "Address" },
];

const MultiChannelCard = () => {
  const [litIndex, setLitIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setLitIndex((prev) => (prev + 1) % SOURCES.length);
    }, 700);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex flex-col border-b border-[#EFEDE6]/[0.14]"
      style={{ padding: "32px", borderRight: "1px solid rgba(239,237,230,0.14)" }}
    >
      <p style={{ fontSize: "13px", color: "#67645B", marginBottom: "18px" }}>Multi-channel</p>
      <h3
        className="font-display font-bold tracking-tight leading-snug mb-3"
        style={{ fontSize: "28px", color: "#EFEDE6" }}
      >
        Email, LinkedIn, WhatsApp —{" "}
        <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
          verified
        </em>
        .
      </h3>
      <p style={{ fontSize: "14.5px", color: "#A8A59C", lineHeight: "1.7", marginBottom: "24px" }}>
        Every entity enriched until you have the actual humans behind it.
      </p>

      {/* Source tiles */}
      <div className="grid grid-cols-3 gap-2 mt-auto">
        {SOURCES.map((src, i) => {
          const isLit = litIndex === i;
          return (
            <div
              key={src.label}
              className="flex flex-col items-center justify-center gap-2 py-4 border border-[#EFEDE6]/[0.07]"
              style={{
                backgroundColor: isLit ? "rgba(245,255,61,0.08)" : "transparent",
                transition: "background-color 0.3s",
              }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
                style={{
                  backgroundColor: isLit ? "rgba(245,255,61,0.18)" : "rgba(239,237,230,0.06)",
                  color: isLit ? "#F5FF3D" : "#67645B",
                  boxShadow: isLit ? "0 0 10px rgba(245,255,61,0.3)" : "none",
                  transition: "all 0.3s",
                }}
              >
                {src.icon}
              </div>
              <span style={{ fontSize: "11px", color: isLit ? "#F5FF3D" : "#67645B", transition: "color 0.3s" }}>
                {src.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Speed card with gauge ─────────────────────────────────────────────────────
const SpeedCard = ({ gaugeVisible }: { gaugeVisible: boolean }) => {
  const BARS = 12;
  // 9 white-on, 2 yellow peak, 1 off
  const getBarColor = (i: number) => {
    if (i < 9) return "#EFEDE6";
    if (i < 11) return "#F5FF3D";
    return "rgba(239,237,230,0.1)";
  };

  return (
    <div
      className="flex flex-col border-b border-[#EFEDE6]/[0.14]"
      style={{ padding: "32px", borderRight: "1px solid rgba(239,237,230,0.14)" }}
    >
      <p style={{ fontSize: "13px", color: "#67645B", marginBottom: "18px" }}>Speed</p>
      <h3
        className="font-display font-bold tracking-tight leading-snug mb-3"
        style={{ fontSize: "28px", color: "#EFEDE6" }}
      >
        90 seconds.{" "}
        <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
          Zero
        </em>{" "}
        setup.
      </h3>
      <p style={{ fontSize: "14.5px", color: "#A8A59C", lineHeight: "1.7", marginBottom: "28px" }}>
        No extension. No 'connect your inbox.' Two fields, one button, full sheet.
      </p>

      {/* Gauge */}
      <div className="mt-auto border border-[#EFEDE6]/[0.14] p-4">
        {/* Label row */}
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: "11px", color: "#67645B" }}>Extraction velocity</span>
          <span style={{ fontSize: "11px", color: "#F5FF3D", fontWeight: 600 }}>Optimal</span>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-1 mb-3" style={{ height: "36px" }}>
          {Array.from({ length: BARS }).map((_, i) => {
            const active = gaugeVisible;
            const barH = 40 + (i / (BARS - 1)) * 60;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${barH}%`,
                  backgroundColor: active ? getBarColor(i) : "rgba(239,237,230,0.1)",
                  transition: `background-color 0.4s ease ${i * 50}ms`,
                }}
              />
            );
          })}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between border-t border-[#EFEDE6]/[0.07] pt-3">
          <div>
            <p style={{ fontSize: "10px", color: "#67645B", marginBottom: "2px" }}>P50 latency</p>
            <p style={{ fontSize: "13px", color: "#EFEDE6", fontFamily: "'JetBrains Mono', monospace" }}>0.82s</p>
          </div>
          <div className="text-right">
            <p style={{ fontSize: "10px", color: "#67645B", marginBottom: "2px" }}>P95 search</p>
            <p style={{ fontSize: "13px", color: "#EFEDE6", fontFamily: "'JetBrains Mono', monospace" }}>92s</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Generic small card ────────────────────────────────────────────────────────
interface SmallCardProps {
  cat: string;
  title: React.ReactNode;
  body: string;
  borderRight?: boolean;
}

const SmallCard = ({ cat, title, body, borderRight = true }: SmallCardProps) => (
  <div
    className="flex flex-col border-b border-[#EFEDE6]/[0.14] transition-colors duration-200"
    style={{
      padding: "32px",
      borderRight: borderRight ? "1px solid rgba(239,237,230,0.14)" : "none",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(239,237,230,0.02)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
    }}
  >
    <p style={{ fontSize: "13px", color: "#67645B", marginBottom: "18px" }}>{cat}</p>
    <h3
      className="font-display font-bold tracking-tight leading-snug mb-3"
      style={{ fontSize: "28px", color: "#EFEDE6" }}
    >
      {title}
    </h3>
    <p style={{ fontSize: "14.5px", color: "#A8A59C", lineHeight: "1.7" }}>{body}</p>
  </div>
);

// ─── Section ──────────────────────────────────────────────────────────────────
const FeaturesSectionV2 = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);

  useEffect(() => {
    const headerObs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHeaderVisible(true); },
      { threshold: 0.2 }
    );
    const gridObs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setGridVisible(true); },
      { threshold: 0.1 }
    );
    if (headerRef.current) headerObs.observe(headerRef.current);
    if (gridRef.current) gridObs.observe(gridRef.current);
    return () => { headerObs.disconnect(); gridObs.disconnect(); };
  }, []);

  return (
    <section
      id="features"
      className="border-b border-[#EFEDE6]/[0.14]"
      style={{ backgroundColor: "#000", paddingTop: "140px", paddingBottom: "140px" }}
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 32px" }}>

        {/* Section header */}
        <div
          ref={headerRef}
          className="grid mb-16"
          style={{
            gridTemplateColumns: "1fr 1.2fr",
            gap: "48px",
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <h2
            className="font-display font-extrabold tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(40px, 4.8vw, 68px)", color: "#EFEDE6" }}
          >
            Everything you need.{" "}
            <em
              className="font-serif"
              style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}
            >
              Nothing
            </em>{" "}
            you don't.
          </h2>

          <div className="flex items-end pb-1">
            <p style={{ fontSize: "16px", color: "#A8A59C", lineHeight: "1.6" }}>
              Hover any row in the AI scoring panel to see why the score is what it is.
              The signal isn't magic — it's explainable.
            </p>
          </div>
        </div>

        {/* Feature grid */}
        <div
          ref={gridRef}
          className="grid border border-[#EFEDE6]/[0.14]"
          style={{
            gridTemplateColumns: "repeat(3, 1fr)",
            gridAutoRows: "minmax(220px, auto)",
            borderBottom: "none",
            opacity: gridVisible ? 1 : 0,
            transform: gridVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          {/* Card 1: AI scoring — col 1, row 1–2 */}
          <div style={{ gridRow: "span 2" }}>
            <AIScoreCard barsVisible={gridVisible} />
          </div>

          {/* Card 2: Multi-channel — col 2, row 1 */}
          <MultiChannelCard />

          {/* Card 3: Speed — col 3, row 1 */}
          <SpeedCard gaugeVisible={gridVisible} />

          {/* Card 4: Export — col 2, row 2 */}
          <SmallCard
            cat="Export"
            title={
              <>
                One-click{" "}
                <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
                  .xlsx
                </em>
              </>
            }
            body="Stable columns. Paste into your CRM, sequencer, or sheet. No reformatting."
          />

          {/* Card 5: History — col 3, row 2 */}
          <SmallCard
            cat="History"
            title={
              <>
                Persistent{" "}
                <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
                  sessions
                </em>
              </>
            }
            body="Every search saved. Reopen, sort, filter, re-export — credits never billed twice."
            borderRight={false}
          />
        </div>

      </div>
    </section>
  );
};

export default FeaturesSectionV2;
