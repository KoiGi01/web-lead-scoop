interface GlobaLeadsLogoProps {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
  showMark?: boolean;
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { text: 16, width: 34, height: 34 },
  md: { text: 20, width: 46, height: 46 },
  lg: { text: 28, width: 64, height: 64 },
};

const GlobaLeadsLogo = ({
  size = "md",
  theme = "dark",
  showMark = true,
  showText = true,
  className,
}: GlobaLeadsLogoProps) => {
  const { text, width, height } = sizeMap[size];
  const wordColor = theme === "dark" ? "#EFEDE6" : "#000000";

  if (showMark) {
    return (
      <span
        className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
        aria-label="GlobaLeads22"
      >
        <img
          src="/logo.png"
          alt=""
          width={width}
          height={height}
          aria-hidden="true"
          style={{
            width,
            height,
            objectFit: "contain",
            display: "block",
            flex: "0 0 auto",
            borderRadius: Math.round(width * 0.18),
          }}
        />
        {showText && (
          <span
            style={{
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 800,
              fontSize: text,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              color: wordColor,
              whiteSpace: "nowrap",
            }}
          >
            GlobaLeads
            <sup
              style={{
                color: "#F5FF3D",
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: Math.max(9, Math.round(text * 0.66)),
                fontWeight: 600,
                marginLeft: 1,
                verticalAlign: "super",
              }}
            >
              22
            </sup>
          </span>
        )}
      </span>
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
