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

const TestimonialsSection = () => (
  <section className="py-24 sm:py-32 border-t border-white/[0.04]">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-16 flex items-end justify-between border-b border-white/[0.06] pb-8">
        <div>
          <div className="label-mono mb-3 text-white/25">// OPERATOR REPORTS</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
            WHAT GROWTH<br />TEAMS ARE SAYING
          </h2>
        </div>
        <div className="hidden md:block label-mono text-white/20 text-right">
          03 VERIFIED<br />REPORTS
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-3 border border-white/[0.06]">
        {testimonials.map((t, idx) => (
          <div
            key={idx}
            className={`p-7 flex flex-col gap-5 hover:bg-white/[0.02] transition-colors animate-fade-in-up ${idx < testimonials.length - 1 ? "border-b md:border-b-0 md:border-r border-white/[0.06]" : ""}`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {/* Score dots */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full bg-white/70" />
                ))}
              </div>
              <span className="label-mono text-white/20">{t.code}</span>
            </div>

            <p className="font-mono-data text-[11px] text-white/45 leading-relaxed flex-1">
              "{t.quote}"
            </p>

            <div className="flex items-center gap-3 border-t border-white/[0.05] pt-4">
              <div className="flex h-9 w-9 items-center justify-center border border-white/15 flex-shrink-0">
                <span className="font-mono-data text-[10px] font-bold text-white/60">{t.initials}</span>
              </div>
              <div>
                <p className="font-mono-data text-[10px] font-bold text-white/70 tracking-widest">{t.author}</p>
                <p className="label-mono text-white/25">{t.role} · {t.company}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
