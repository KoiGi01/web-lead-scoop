const COMPANIES = [
  "NORTHBEAM STUDIO",
  "HELIX VENTURES",
  "PIVOT & CO.",
  "BEACON GROWTH",
  "ATLAS OUTBOUND",
  "SONDERLY",
  "VOLT CAPITAL",
  "MERIDIAN B2B",
];

const Dot = () => (
  <span className="inline-block w-1.5 h-1.5 rounded-full bg-lemon opacity-60 mx-14 shrink-0" />
);

const MarqueeContent = () => (
  <span className="flex items-center whitespace-nowrap">
    {COMPANIES.map((name, i) => (
      <span key={i} className="flex items-center">
        <span
          className="font-display font-semibold uppercase text-paper-mid"
          style={{
            fontSize: 24,
            letterSpacing: "-0.01em",
            opacity: 0.7,
          }}
        >
          {name}
        </span>
        <Dot />
      </span>
    ))}
  </span>
);

const MarqueeStrip = () => {
  return (
    <section className="py-8 border-b border-[#EFEDE6]/[0.14] bg-black overflow-hidden">
      <p className="text-center text-[13px] text-paper-mid mb-[18px]">
        Operating teams using GlobaLeads22
      </p>
      <div
        className="flex items-center whitespace-nowrap"
        style={{ animation: "march 50s linear infinite" }}
      >
        <MarqueeContent />
        {/* Duplicate for seamless infinite loop */}
        <MarqueeContent />
      </div>
    </section>
  );
};

export default MarqueeStrip;
