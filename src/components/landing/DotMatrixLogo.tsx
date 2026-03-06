interface DotMatrixLogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { text: "11px", badge: "10px", badgePad: "2px 5px" },
  md: { text: "14px", badge: "11px", badgePad: "2px 6px" },
  lg: { text: "22px", badge: "16px", badgePad: "3px 8px" },
};

const DotMatrixLogo = ({ size = "md" }: DotMatrixLogoProps) => {
  const s = sizes[size];
  return (
    <span
      className="font-black text-white tracking-tight inline-flex items-center gap-0.5"
      style={{ fontFamily: "'Space Mono', monospace", fontSize: s.text }}
    >
      GLOBALEADS
      <span
        className="bg-white text-[#080808] font-black inline-flex items-center justify-center"
        style={{ fontSize: s.badge, padding: s.badgePad, borderRadius: "2px", lineHeight: 1 }}
      >
        22
      </span>
    </span>
  );
};

export default DotMatrixLogo;
