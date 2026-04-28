import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    num: "01",
    stage: "Discover",
    title: (
      <>
        Search{" "}
        <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
          maps
        </em>
      </>
    ),
    body: "Type a keyword and a city. We pull every matching business in radius — name, address, website, hours.",
  },
  {
    num: "02",
    stage: "Crawl",
    title: (
      <>
        Scan the{" "}
        <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
          open web
        </em>
      </>
    ),
    body: "Deep crawl of about, contact, team, legal pages — collecting every published touchpoint, in seconds.",
  },
  {
    num: "03",
    stage: "Extract",
    title: (
      <>
        Verify{" "}
        <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
          channels
        </em>
      </>
    ),
    body: "Emails, LinkedIn handles, WhatsApp numbers — pulled, deduplicated, validated. Burner addresses flagged.",
  },
  {
    num: "04",
    stage: "Score",
    title: (
      <>
        AI{" "}
        <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}>
          fit-signal
        </em>
      </>
    ),
    body: "Claude reads each entity and rates intent, fit and reachability. Sort, filter, export to .xlsx.",
  },
];

interface StepCardProps {
  step: (typeof STEPS)[number];
  active: boolean;
  delay: number;
}

const StepCard = ({ step, active, delay }: StepCardProps) => (
  <div
    className="flex flex-col p-8 border-b border-[#EFEDE6]/[0.14]"
    style={{
      backgroundColor: active ? "rgba(245,255,61,0.04)" : "transparent",
      transition: `background-color 0.5s ease ${delay}ms, opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      opacity: active ? 1 : 0,
      transform: active ? "translateY(0)" : "translateY(14px)",
    }}
  >
    {/* Step number */}
    <p
      className="font-display font-extrabold leading-none mb-6"
      style={{
        fontSize: "48px",
        color: active ? "#F5FF3D" : "#3A3833",
        transition: `color 0.5s ease ${delay}ms`,
      }}
    >
      {step.num}
    </p>

    {/* Stage tag */}
    <div className="flex items-center gap-2 mb-5">
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{
          backgroundColor: active ? "#F5FF3D" : "#3A3833",
          boxShadow: active ? "0 0 8px 2px rgba(245,255,61,0.5)" : "none",
          transition: `background-color 0.5s ease ${delay}ms, box-shadow 0.5s ease ${delay}ms`,
        }}
      />
      <span
        className="font-mono text-[11px] tracking-widest uppercase"
        style={{
          color: active ? "#F5FF3D" : "#3A3833",
          transition: `color 0.5s ease ${delay}ms`,
        }}
      >
        {step.stage}
      </span>
    </div>

    {/* Title */}
    <h3
      className="font-display font-bold tracking-tight mb-4 leading-snug"
      style={{ fontSize: "22px", color: "#EFEDE6" }}
    >
      {step.title}
    </h3>

    {/* Body */}
    <p style={{ fontSize: "14px", color: "#A8A59C", lineHeight: "1.7" }}>{step.body}</p>
  </div>
);

const HowItWorksV2 = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [activeSteps, setActiveSteps] = useState<boolean[]>([false, false, false, false]);

  useEffect(() => {
    const headerObs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHeaderVisible(true); },
      { threshold: 0.3 }
    );
    const pipelineObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger activate each step
          STEPS.forEach((_, i) => {
            setTimeout(() => {
              setActiveSteps((prev) => {
                const next = [...prev];
                next[i] = true;
                return next;
              });
            }, i * 150);
          });
        }
      },
      { threshold: 0.15 }
    );
    if (headerRef.current) headerObs.observe(headerRef.current);
    if (pipelineRef.current) pipelineObs.observe(pipelineRef.current);
    return () => { headerObs.disconnect(); pipelineObs.disconnect(); };
  }, []);

  return (
    <section
      id="how"
      className="border-b border-[#EFEDE6]/[0.14]"
      style={{ backgroundColor: "#000", paddingTop: "140px", paddingBottom: "140px" }}
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 32px" }}>

        {/* Section header */}
        <div
          ref={headerRef}
          className="grid mb-16"
          style={{
            gridTemplateColumns: "1fr 1.2fr",
            gap: "48px",
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <h2
            className="font-display font-extrabold tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(40px, 4.8vw, 68px)", color: "#EFEDE6" }}
          >
            From keyword to{" "}
            <em
              className="font-serif"
              style={{ fontStyle: "italic", fontFamily: "'Newsreader', serif", color: "#F5FF3D" }}
            >
              qualified sheet
            </em>
            .
          </h2>

          <div className="flex items-end pb-1">
            <p style={{ fontSize: "16px", color: "#A8A59C", lineHeight: "1.6" }}>
              Four stages, fully automated. You stop after the first one — we handle the rest.
            </p>
          </div>
        </div>

        {/* Pipeline grid */}
        <div
          ref={pipelineRef}
          className="grid grid-cols-4 border border-[#EFEDE6]/[0.14]"
          style={{ borderBottom: "none" }}
        >
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              style={{
                borderRight: i < STEPS.length - 1 ? "1px solid rgba(239,237,230,0.14)" : "none",
              }}
            >
              <StepCard step={step} active={activeSteps[i]} delay={0} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HowItWorksV2;
