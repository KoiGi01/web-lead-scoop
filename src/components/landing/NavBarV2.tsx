import { useState, useEffect, useRef } from "react";

interface NavBarV2Props {
  onGetStarted: () => void;
  onOpenAuth: () => void;
}

const NavBarV2 = ({ onGetStarted, onOpenAuth }: NavBarV2Props) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryBtnRef = useRef<HTMLAnchorElement>(null);
  const ghostBtnRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const buttons = [
      { ref: primaryBtnRef.current },
      { ref: ghostBtnRef.current },
    ];

    const cleanups: (() => void)[] = [];

    buttons.forEach(({ ref }) => {
      if (!ref) return;
      const el = ref;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * 0.18;
        const dy = (e.clientY - cy) * 0.18;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      };

      const handleMouseLeave = () => {
        el.style.transform = "";
      };

      el.addEventListener("mousemove", handleMouseMove);
      el.addEventListener("mouseleave", handleMouseLeave);
      cleanups.push(() => {
        el.removeEventListener("mousemove", handleMouseMove);
        el.removeEventListener("mouseleave", handleMouseLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const links = [
    { label: "How it works", href: "#how" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <nav
      className="sticky top-0 z-50 border-b border-[#EFEDE6]/[0.14]"
      style={{
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 24,
          padding: "16px 32px",
        }}
      >
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5 no-underline"
          style={{ color: "#EFEDE6" }}
        >
          <span
            className="relative flex items-center justify-center shrink-0"
            style={{
              width: 28,
              height: 28,
              border: "1.5px solid #EFEDE6",
              borderRadius: "50%",
            }}
          >
            <span
              className="rounded-full bg-lemon"
              style={{
                width: 7,
                height: 7,
                boxShadow: "0 0 8px #F5FF3D",
              }}
            />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-paper">
            <b>GlobaLeads</b>
            <sup
              className="text-lemon font-mono"
              style={{ fontSize: 10, verticalAlign: "top" }}
            >
              22
            </sup>
          </span>
        </a>

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center justify-center gap-7">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[14px] text-paper-dim hover:text-paper transition-colors duration-150 no-underline"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA buttons — desktop */}
        <div className="hidden md:flex items-center gap-2.5">
          <a
            ref={ghostBtnRef}
            href="#"
            onClick={(e) => { e.preventDefault(); onOpenAuth(); }}
            className="inline-flex items-center px-4 py-2 text-[13px] font-medium text-paper rounded-none no-underline transition-all duration-150"
            style={{
              border: "1px solid rgba(239,237,230,0.28)",
              transitionProperty: "border-color, background, transform, box-shadow",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "#EFEDE6";
              el.style.background = "rgba(239,237,230,0.04)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "rgba(239,237,230,0.28)";
              el.style.background = "";
            }}
          >
            Sign in
          </a>
          <a
            ref={primaryBtnRef}
            href="#cta"
            onClick={(e) => { e.preventDefault(); onGetStarted(); }}
            className="inline-flex items-center gap-1 px-4 py-2 text-[13px] font-semibold text-black bg-lemon rounded-none no-underline transition-all duration-150"
            style={{
              border: "1px solid #F5FF3D",
              transitionProperty: "background, box-shadow, transform",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = "#FFFE7A";
              el.style.boxShadow =
                "0 0 0 4px rgba(245,255,61,0.12), 0 0 30px -4px rgba(245,255,61,0.5)";
              el.style.transform = "translate(-1px,-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "#F5FF3D";
              el.style.boxShadow = "";
              el.style.transform = "";
            }}
          >
            Start free{" "}
            <span className="inline-block transition-transform duration-150 group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </div>

        {/* Mobile hamburger — sits in the 3rd column on small screens */}
        <button
          className="md:hidden flex flex-col items-center justify-center gap-[5px] p-1 text-paper"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span
            className={`block h-px w-5 bg-paper transition-all duration-200 origin-center ${menuOpen ? "rotate-45 translate-y-[6px]" : ""}`}
          />
          <span
            className={`block h-px w-5 bg-paper transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-px w-5 bg-paper transition-all duration-200 origin-center ${menuOpen ? "-rotate-45 -translate-y-[6px]" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#EFEDE6]/[0.14] bg-black px-8 pb-6 pt-4 flex flex-col gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="py-3 text-[14px] text-paper-dim hover:text-paper transition-colors border-b border-[#EFEDE6]/[0.08] no-underline"
            >
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2.5 mt-4">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onOpenAuth(); setMenuOpen(false); }}
              className="inline-flex justify-center items-center py-2.5 text-[13px] font-medium text-paper rounded-none no-underline"
              style={{ border: "1px solid rgba(239,237,230,0.28)" }}
            >
              Sign in
            </a>
            <a
              href="#cta"
              onClick={(e) => { e.preventDefault(); onGetStarted(); setMenuOpen(false); }}
              className="inline-flex justify-center items-center gap-1 py-2.5 text-[13px] font-semibold text-black bg-lemon rounded-none no-underline"
              style={{ border: "1px solid #F5FF3D" }}
            >
              Start free →
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBarV2;
