const TICKER_ITEMS = [
  { count: "184 leads", detail: "dental clinics · Lisbon · 12s ago" },
  { count: "218 leads", detail: "law firms · Berlin · 47s ago" },
  { count: "312 leads", detail: "coffee shops · San Francisco · 2m ago" },
  { count: "147 leads", detail: "boutique hotels · Mexico City · 3m ago" },
  { count: "2.4M+ leads", detail: "extracted all-time" },
];

const TickerContent = () => (
  <span className="flex items-center gap-12 whitespace-nowrap">
    {TICKER_ITEMS.map((item, i) => (
      <span key={i} className="flex items-center gap-3">
        <span className="text-paper-mid">▸</span>
        <b className="font-display font-medium text-paper">{item.count}</b>
        <span className="text-paper-mid">· {item.detail}</span>
      </span>
    ))}
  </span>
);

const TickerStrip = () => {
  return (
    <div
      className="border-b border-[#EFEDE6]/[0.14] bg-black overflow-hidden"
      style={{ padding: "14px 0" }}
    >
      <div
        className="flex items-center gap-12 whitespace-nowrap font-mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "#67645B",
          animation: "march 60s linear infinite",
        }}
      >
        <TickerContent />
        {/* Duplicate for seamless infinite loop */}
        <TickerContent />
      </div>
    </div>
  );
};

export default TickerStrip;
