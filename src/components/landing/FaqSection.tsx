import { useState, useEffect, useRef } from "react";

const faqs = [
  {
    q: "How accurate are the email addresses?",
    a: "We scrape emails directly from business websites using multi-page scanning. Accuracy typically runs 85-90% depending on how well the site is populated.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel whenever — no questions, no lock-ins. Paid plans include a 7-day money-back guarantee.",
  },
  {
    q: "How many credits per search?",
    a: "Credits scale with max results: 20 leads = 1 credit, 40 leads = 2 credits, 60 leads = 3 credits. AI scoring uses additional credits per lead.",
  },
  {
    q: "Does it work outside the US?",
    a: "Absolutely. GlobaLeads works in 47+ countries worldwide. Just enter any city — we have covered Miami to Tokyo.",
  },
  {
    q: "What export formats are supported?",
    a: "You get a professionally styled Excel (.xlsx) file with colored headers and auto-sized columns. You can import this into any CRM, Mailchimp, or cold email tool.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — our Demo plan gives you 30 credits for 1 search (up to 60 leads) completely free. No credit card required.",
  },
];

const FaqSection = () => {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="faq" className="py-24 sm:py-32 border-t border-white/[0.04]" style={{ background: "#050505" }}>
      {/* Subtle scanline overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">

        <div className={`mb-16 border-b border-white/[0.06] pb-8 ${visible ? "animate-section-in" : "opacity-0"}`}>
          <div className="label-mono mb-3 text-white/25">// SYSTEM FAQ</div>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight"
            style={{ fontFamily: "'Space Mono', monospace" }}>
            COMMON<br />QUESTIONS
          </h2>
        </div>

        <div ref={ref} className="max-w-2xl">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className={`border-b border-white/[0.06] last:border-b-0 ${visible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full flex items-start justify-between gap-4 py-5 text-left group"
              >
                <div className="font-mono-data text-[11px] text-white/55 group-hover:text-white/80 transition-colors leading-relaxed">
                  <span className="text-white/25 mr-2">&gt;</span>
                  <span className="text-white/30 mr-1">Q:</span>
                  {faq.q}
                  {open !== idx && (
                    <span className="animate-blink text-white/40 ml-0.5">|</span>
                  )}
                </div>
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center border border-white/10 mt-0.5 group-hover:border-white/25 transition-colors"
                  style={{ borderRadius: "2px" }}>
                  <span className="font-mono-data text-[10px] text-white/35">
                    {open === idx ? "−" : "+"}
                  </span>
                </span>
              </button>

              {open === idx && (
                <div className="pb-5 pl-5 animate-fade-in-up">
                  <div className="flex gap-2">
                    <span className="font-mono-data text-[11px] text-white/25 flex-shrink-0">A:</span>
                    <p className="font-mono-data text-[11px] text-white/40 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FaqSection;
