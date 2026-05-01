interface GlobaLeadsLogoProps {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
  showMark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { text: 13, width: 140, height: 54 },
  md: { text: 15, width: 190, height: 73 },
  lg: { text: 19, width: 250, height: 96 },
};

const GlobaLeadsLogo = ({
  size = "md",
  theme = "dark",
  showMark = true,
  className,
}: GlobaLeadsLogoProps) => {
  const { text, width, height } = sizeMap[size];
  const wordColor = theme === "dark" ? "#EFEDE6" : "#000000";

  if (showMark) {
    return (
      <img
        src="/logo.png"
        alt="GlobaLeads22"
        width={width}
        height={height}
        className={className}
        style={{
          width,
          height,
          objectFit: "contain",
          display: "block",
        }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
    >
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
