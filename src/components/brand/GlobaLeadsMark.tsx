interface GlobaLeadsMarkProps {
  size?: number;
  theme?: "dark" | "light";
  className?: string;
}

const GlobaLeadsMark = ({ size = 28, theme = "dark", className }: GlobaLeadsMarkProps) => {
  const bg = theme === "dark" ? "#4D243D" : "#00272B";
  const fg = theme === "dark" ? "#ECDCC9" : "#FAF5EC";
  const r = Math.round(size * 0.214);
  const fontSize = Math.round(size * 0.6);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="GlobaLeads22 mark"
    >
      <rect width={size} height={size} rx={r} fill={bg} />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fg}
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
      >
        G
      </text>
    </svg>
  );
};

export default GlobaLeadsMark;
