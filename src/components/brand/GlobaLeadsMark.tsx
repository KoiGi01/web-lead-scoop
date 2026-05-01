interface GlobaLeadsMarkProps {
  size?: number;
  theme?: "dark" | "light";
  className?: string;
}

const GlobaLeadsMark = ({ size = 28, theme = "dark", className }: GlobaLeadsMarkProps) => {
  const shadow =
    theme === "dark"
      ? "drop-shadow(0 0 10px rgba(245, 255, 61, 0.45))"
      : "drop-shadow(0 0 8px rgba(245, 255, 61, 0.28))";

  return (
    <img
      src="/favicon.png"
      alt="GlobaLeads22 mark"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        filter: shadow,
        display: "block",
      }}
    />
  );
};

export default GlobaLeadsMark;
