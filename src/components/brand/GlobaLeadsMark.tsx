interface GlobaLeadsMarkProps {
  size?: number;
  theme?: "dark" | "light";
  className?: string;
}

const GlobaLeadsMark = ({ size = 28, theme = "dark", className }: GlobaLeadsMarkProps) => {
  const stroke = theme === "dark" ? "#EFEDE6" : "#000000";
  const dot = "#F5FF3D";
  const strokeWidth = Math.max(1.4, size * 0.055);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="GlobaLeads22 mark"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - strokeWidth) / 2}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={Math.max(2.5, size * 0.18)}
        fill={dot}
        style={{ filter: "drop-shadow(0 0 7px rgba(245,255,61,0.8))" }}
      />
    </svg>
  );
};

export default GlobaLeadsMark;
