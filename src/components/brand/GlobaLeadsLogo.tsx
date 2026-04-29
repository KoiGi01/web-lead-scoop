import GlobaLeadsMark from "@/components/brand/GlobaLeadsMark";

interface GlobaLeadsLogoProps {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
  showMark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { mark: 20, text: 13 },
  md: { mark: 28, text: 15 },
  lg: { mark: 36, text: 19 },
};

const GlobaLeadsLogo = ({
  size = "md",
  theme = "dark",
  showMark = true,
  className,
}: GlobaLeadsLogoProps) => {
  const { mark, text } = sizeMap[size];
  const wordColor = theme === "dark" ? "#EFEDE6" : "#000000";

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
    >
      {showMark && <GlobaLeadsMark size={mark} theme={theme} />}
      <span
        style={{
          fontFamily: "'Archivo', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: text,
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        <span style={{ color: wordColor }}>GlobaLeads</span>
        <sup
          style={{
            color: "#F5FF3D",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: Math.max(9, Math.round(text * 0.66)),
            fontWeight: 500,
            marginLeft: 1,
            verticalAlign: "super",
          }}
        >
          22
        </sup>
      </span>
    </span>
  );
};

export default GlobaLeadsLogo;
