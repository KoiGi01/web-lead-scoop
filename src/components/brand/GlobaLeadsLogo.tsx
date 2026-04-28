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
  const wordColor = theme === "dark" ? "#ECDCC9" : "#00272B";

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
    >
      {showMark && <GlobaLeadsMark size={mark} theme={theme} />}
      <span
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: text,
          letterSpacing: "-0.025em",
          lineHeight: 1,
        }}
      >
        <span style={{ color: wordColor }}>GlobaLeads</span>
        <span style={{ color: "#4D243D" }}>22</span>
      </span>
    </span>
  );
};

export default GlobaLeadsLogo;
