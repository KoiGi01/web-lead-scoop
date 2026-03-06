import { useState } from "react";
import { Plus, Minus } from "lucide-react";

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

  return (
    <section id="faq" className="py-24 sm:py-32 border-t border-white/[0.04]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 border-b border-white/[0.06] pb-8">
          <div className="label-mono mb-3 text-white/25">// SYSTEM FAQ</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>
            COMMON<br />QUESTIONS
          </h2>
        </div>

        <div className="max-w-2xl">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border-b border-white/[0.06] last:border-b-0"
            >
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left hover:bg-white/[0.015] px-2 -mx-2 transition-colors"
              >
                <span className="font-mono-data text-[11px] font-bold text-white/60 tracking-wide">{faq.q}</span>
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center border border-white/10">
                  {open === idx
                    ? <Minus className="h-3 w-3 text-white/40" />
                    : <Plus className="h-3 w-3 text-white/40" />
                  }
                </span>
              </button>
              {open === idx && (
                <div className="pb-5 px-2 -mx-2">
                  <p className="font-mono-data text-[11px] text-white/30 leading-relaxed">{faq.a}</p>
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
