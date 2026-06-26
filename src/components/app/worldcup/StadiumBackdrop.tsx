// Atmospheric "stadium at night" layer behind the predictions content:
// faint pitch markings, two floodlight glows, and a pitch-green wash at the
// bottom. Purely decorative (pointer-events: none) so the ball-pit stays
// clickable. The floodlight pulse is gated on prefers-reduced-motion via CSS.
const StadiumBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    {/* pitch-green wash rising from the bottom */}
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(130% 70% at 50% 118%, rgba(95,227,161,0.13), transparent 58%)" }}
    />

    {/* floodlights */}
    <div
      className="wc-floodlight absolute -left-24 -top-28 h-[22rem] w-[22rem] rounded-full"
      style={{ background: "radial-gradient(circle, rgba(232,251,82,0.18), transparent 70%)" }}
    />
    <div
      className="wc-floodlight absolute -right-24 -top-28 h-[22rem] w-[22rem] rounded-full"
      style={{ background: "radial-gradient(circle, rgba(87,185,255,0.12), transparent 70%)", animationDelay: "1.2s" }}
    />

    {/* pitch markings */}
    <svg
      className="absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2"
      viewBox="0 0 800 800"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="rgba(243,245,248,0.055)" strokeWidth="2">
        <line x1="0" y1="400" x2="800" y2="400" />
        <circle cx="400" cy="400" r="120" />
        <rect x="250" y="-70" width="300" height="170" />
        <rect x="250" y="700" width="300" height="170" />
      </g>
      <circle cx="400" cy="400" r="5" fill="rgba(243,245,248,0.09)" />
    </svg>
  </div>
);

export default StadiumBackdrop;
