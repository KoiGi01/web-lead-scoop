import { useEffect, useRef, useState } from "react";

interface PricingSectionV2Props {
  onGetStarted: (bundleKey: string) => void;
}

const Bullet = ({ muted = false }: { muted?: boolean }) => (
  <span
    className="relative flex-shrink-0 mt-[3px]"
    style={{
      width: 14,
      height: 14,
      borderRadius: "50%",
      border: muted ? "1px solid #67645B" : "1px solid #EFEDE6",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: muted ? "#67645B" : "#F5FF3D",
      }}
    />
  </span>
);

const GhostBtn = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full py-3 text-[13px] font-medium text-paper rounded-none transition-all duration-150"
    style={{
      border: "1px solid rgba(239,237,230,0.28)",
      background: "transparent",
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget;
      el.style.borderColor = "#EFEDE6";
      el.style.background = "rgba(239,237,230,0.04)";
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget;
      el.style.borderColor = "rgba(239,237,230,0.28)";
      el.style.background = "transparent";
    }}
  >
    {children}
  </button>
);

const PricingSectionV2 = ({ onGetStarted }: PricingSectionV2Props) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  const [headerVisible, setHeaderVisible] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const observe = (
      el: Element | null,
      setter: (v: boolean) => void,
      threshold = 0.08
    ) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setter(true);
        },
        { threshold }
      );
      obs.observe(el);
      observers.push(obs);
    };

    observe(headerRef.current, setHeaderVisible);
    observe(gridRef.current, setGridVisible);
    observe(footerRef.current, setFooterVisible);

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    const btn = primaryBtnRef.current;
    if (!btn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.18;
      const dy = (e.clientY - cy) * 0.18;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const handleMouseLeave = () => {
      btn.style.transform = "";
    };

    btn.addEventListener("mousemove", handleMouseMove);
    btn.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      btn.removeEventListener("mousemove", handleMouseMove);
      btn.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const fadeClass = (visible: boolean) =>
    `transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3.5"}`;

  const starterFeatures = [
    { label: "Full discovery + enrichment", muted: false },
    { label: "Email, LinkedIn, WhatsApp", muted: false },
    { label: "AI intel scoring (per unlock)", muted: false },
    { label: "Excel export", muted: false },
    { label: "Priority queue", muted: true },
  ];

  const growthFeatures = [
    "Everything in Starter",
    "Bulk intel-unlock",
    "Sort & filter — score, email, name",
    "Persistent search history",
    "Priority queue",
  ];

  const proFeatures = [
    "Everything in Growth",
    "Best $/credit ratio",
    "Higher concurrent searches",
    "Email support · 24h SLA",
    "Early access to API",
  ];

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="py-36 border-b border-[#EFEDE6]/[0.14]"
      style={{ background: "#000" }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 32px" }}>

        {/* Section header */}
        <div
          ref={headerRef}
          className={`grid md:grid-cols-2 gap-10 mb-16 ${fadeClass(headerVisible)}`}
        >
          <h2
            className="font-display font-extrabold tracking-tight leading-tight text-paper"
            style={{ fontSize: "clamp(40px, 5vw, 64px)" }}
          >
            Pay for what you{" "}
            <em
              className="font-serif not-italic text-lemon"
              style={{ fontStyle: "italic" }}
            >
              extract.
            </em>
          </h2>
          <p
            className="text-paper-dim text-[16px] leading-relaxed self-end"
            style={{ maxWidth: 480 }}
          >
            One-time credit packs. No monthly lock-in. 10 credits per search, 1
            per intel unlock. Credits never expire.
          </p>
        </div>

        {/* Pricing grid */}
        <div
          ref={gridRef}
          className={`grid md:grid-cols-3 border border-[#EFEDE6]/[0.14] ${fadeClass(gridVisible)}`}
        >

          {/* PLAN 1 — Starter */}
          <div className="flex flex-col border-r border-[#EFEDE6]/[0.14] p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="text-paper-mid" style={{ fontSize: 13 }}>Starter</span>
              <span className="text-paper-mid" style={{ fontSize: 13 }}>For solo operators</span>
            </div>

            <p
              className="font-display font-extrabold tracking-tight text-paper mb-6"
              style={{ fontSize: 38 }}
            >
              Starter
            </p>

            <div
              className="flex items-baseline gap-3 py-5 mb-6 border-t border-b border-[#EFEDE6]/[0.14]"
            >
              <span
                className="font-display font-extrabold tracking-tight text-paper"
                style={{ fontSize: 64, lineHeight: 1 }}
              >
                $9
              </span>
              <span className="text-paper-mid" style={{ fontSize: 12 }}>one-time</span>
            </div>

            <p className="mb-6" style={{ fontSize: 14 }}>
              <span className="font-semibold text-lemon">100 credits</span>
              <span className="text-paper-dim"> · ~10 searches</span>
            </p>

            <ul className="flex flex-col gap-[11px] mb-8 flex-1">
              {starterFeatures.map((f) => (
                <li key={f.label} className="flex items-start gap-2.5">
                  <Bullet muted={f.muted} />
                  <span
                    className={f.muted ? "text-paper-mid" : "text-paper-dim"}
                    style={{ fontSize: 14 }}
                  >
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <GhostBtn onClick={() => onGetStarted("starter")}>
              Buy Starter
            </GhostBtn>
          </div>

          {/* PLAN 2 — Growth (featured) */}
          <div
            className="flex flex-col border-r border-[#EFEDE6]/[0.14] p-8"
            style={{ background: "rgba(245,255,61,0.04)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-paper-mid" style={{ fontSize: 13 }}>Growth</span>
              <span
                className="font-display font-bold uppercase text-black bg-lemon px-2 py-0.5"
                style={{ fontSize: 11, letterSpacing: "0.08em" }}
              >
                Popular
              </span>
            </div>

            <p
              className="font-serif text-lemon mb-6"
              style={{
                fontSize: 38,
                fontStyle: "italic",
                fontWeight: 400,
                lineHeight: 1.1,
              }}
            >
              Growth
            </p>

            <div
              className="flex items-baseline gap-3 py-5 mb-6 border-t border-b border-[#EFEDE6]/[0.14]"
            >
              <span
                className="font-display font-extrabold tracking-tight text-paper"
                style={{ fontSize: 64, lineHeight: 1 }}
              >
                $19
              </span>
              <span className="text-paper-mid" style={{ fontSize: 12 }}>one-time</span>
            </div>

            <p className="mb-6" style={{ fontSize: 14 }}>
              <span className="font-semibold text-lemon">300 credits</span>
              <span className="text-paper-dim"> · ~30 searches</span>
            </p>

            <ul className="flex flex-col gap-[11px] mb-8 flex-1">
              {growthFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Bullet />
                  <span className="text-paper-dim" style={{ fontSize: 14 }}>{f}</span>
                </li>
              ))}
            </ul>

            <button
              ref={primaryBtnRef}
              onClick={() => onGetStarted("growth")}
              className="w-full py-3 text-[13px] font-semibold text-black bg-lemon rounded-none transition-all duration-150"
              style={{ border: "1px solid #F5FF3D" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "#FFFE7A";
                el.style.boxShadow =
                  "0 0 0 4px rgba(245,255,61,0.12), 0 0 30px -4px rgba(245,255,61,0.5)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "#F5FF3D";
                el.style.boxShadow = "";
              }}
            >
              Buy Growth →
            </button>
          </div>

          {/* PLAN 3 — Pro */}
          <div className="flex flex-col p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="text-paper-mid" style={{ fontSize: 13 }}>Pro</span>
              <span className="text-paper-mid" style={{ fontSize: 13 }}>For agencies</span>
            </div>

            <p
              className="font-display font-extrabold tracking-tight text-paper mb-6"
              style={{ fontSize: 38 }}
            >
              Pro
            </p>

            <div
              className="flex items-baseline gap-3 py-5 mb-6 border-t border-b border-[#EFEDE6]/[0.14]"
            >
              <span
                className="font-display font-extrabold tracking-tight text-paper"
                style={{ fontSize: 64, lineHeight: 1 }}
              >
                $39
              </span>
              <span className="text-paper-mid" style={{ fontSize: 12 }}>one-time</span>
            </div>

            <p className="mb-6" style={{ fontSize: 14 }}>
              <span className="font-semibold text-lemon">700 credits</span>
              <span className="text-paper-dim"> · ~70 searches</span>
            </p>

            <ul className="flex flex-col gap-[11px] mb-8 flex-1">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Bullet />
                  <span className="text-paper-dim" style={{ fontSize: 14 }}>{f}</span>
                </li>
              ))}
            </ul>

            <GhostBtn onClick={() => onGetStarted("pro")}>Buy Pro</GhostBtn>
          </div>
        </div>

        {/* Footer note */}
        <p
          ref={footerRef}
          className={`text-center text-paper-dim mt-8 ${fadeClass(footerVisible)}`}
          style={{ fontSize: 14 }}
        >
          Every account starts with{" "}
          <span className="font-semibold text-lemon">50 free credits</span>
          {" "}— no card required.
        </p>

      </div>
    </section>
  );
};

export default PricingSectionV2;
