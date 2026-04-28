import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    quote: "We replaced 40 hours of manual research per week with GlobaLeads. The email extraction accuracy is genuinely impressive.",
    author: "SARAH K.",
    role: "SALES MANAGER",
    company: "TECHSTART INC.",
    initials: "SK",
    code: "USER_01",
  },
  {
    quote: "Finally a prospecting tool that works globally. We are running it across 12 cities simultaneously now.",
    author: "JAMES R.",
    role: "CEO",
    company: "DIGITAL AGENCY PRO",
    initials: "JR",
    code: "USER_02",
  },
  {
    quote: "The AI scoring feature completely changed how we prioritize leads. ROI was visible within the first week.",
    author: "MARIA C.",
    role: "MARKETING DIRECTOR",
    company: "GROWTH VENTURES",
    initials: "MC",
    code: "USER_03",
  },
];

const TestimonialsSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="py-24 sm:py-32 border-t border-petrol-900/[0.06] bg-cream-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        <div className={`mb-16 flex items-end justify-between border-b border-petrol-900/[0.08] pb-8 ${visible ? "animate-section-in" : "opacity-0"}`}>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25 mb-3">// OPERATOR REPORTS</div>
            <h2
              className="text-4xl sm:text-5xl font-black text-petrol-900 tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              WHAT GROWTH<br />TEAMS ARE SAYING
            </h2>
          </div>
          <div className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-petrol-900/25 text-right">
            03 VERIFIED<br />REPORTS
          </div>
        </div>

        <div ref={ref} className="grid gap-0 md:grid-cols-3 border border-petrol-900/[0.08]">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className={`p-7 bg-white flex flex-col gap-5 hover:bg-cream-50 transition-colors
                ${idx < testimonials.length - 1 ? "border-b md:border-b-0 md:border-r border-petrol-900/[0.08]" : ""}
                ${visible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${idx * 90}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-wine-700/50" />
                  ))}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-petrol-900/25">{t.code}</span>
              </div>

              <div
                className="font-black text-wine-700 leading-none select-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "72px", marginBottom: "-20px", marginTop: "-8px", opacity: 0.18 }}
                aria-hidden="true"
              >
                "
              </div>

              <p className="font-body text-[17px] text-petrol-900 leading-relaxed flex-1">
                {t.quote}
              </p>

              <div className="flex items-center gap-3 border-t border-petrol-900/[0.06] pt-4 mt-auto">
                <div
                  className="flex h-9 w-9 items-center justify-center border border-petrol-900/[0.14] flex-shrink-0 bg-cream-50"
                  style={{ borderRadius: "2px" }}
                >
                  <span className="font-mono text-[10px] font-bold text-petrol-900/60">{t.initials}</span>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold text-petrol-900 tracking-widest">{t.author}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-cream-700">{t.role} · {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default TestimonialsSection;
