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
    <section id="faq" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F7] border border-[rgba(0,0,0,0.08)] px-3.5 py-1.5 mb-5 text-xs font-semibold text-[#6e6e73] tracking-wide">
            FAQ
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1d1d1f] leading-tight">
            Common questions
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[rgba(0,0,0,0.07)] overflow-hidden bg-white"
            >
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[#FAFAFA] transition-colors"
              >
                <span className="text-sm font-semibold text-[#1d1d1f]">{faq.q}</span>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                  {open === idx
                    ? <Minus className="h-3.5 w-3.5 text-[#6e6e73]" />
                    : <Plus className="h-3.5 w-3.5 text-[#6e6e73]" />
                  }
                </span>
              </button>
              {open === idx && (
                <div className="px-6 pb-5 border-t border-[rgba(0,0,0,0.06)]">
                  <p className="text-sm text-[#6e6e73] leading-relaxed pt-4">{faq.a}</p>
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
