import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "How accurate are the email addresses?",
    a: "We use multiple verification sources and web scraping to extract emails directly from business websites. Accuracy is typically 85-90% depending on how well-populated the website is.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your subscription anytime. If you cancel within 7 days, we'll refund your purchase in full.",
  },
  {
    q: "How many credits do I need per search?",
    a: "The cost depends on your max results: 20 leads = 1 credit, 40 leads = 2 credits, 60 leads = 3 credits. You also need credits to unlock AI lead scoring.",
  },
  {
    q: "Do you offer a free trial?",
    a: "Yes! Start with our free demo to get 30 credits for 1 search. That's up to 60 leads with no payment required.",
  },
  {
    q: "Can I export my leads to other tools?",
    a: "Absolutely. You can download leads as Excel or CSV, then import into Salesforce, HubSpot, Mailchimp, or any CRM.",
  },
  {
    q: "Is my data private and secure?",
    a: "Yes. All data is encrypted in transit and at rest. We never share your data with third parties. Your searches and exports are yours alone.",
  },
];

const FaqSection = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-32">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-600">
            Got questions? We've got answers.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-[#EBEBF0] rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
              >
                <h3 className="text-left font-bold text-slate-900">
                  {faq.q}
                </h3>
                <ChevronDown
                  className={`h-5 w-5 text-slate-500 transition-transform flex-shrink-0 ${
                    open === idx ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open === idx && (
                <div className="px-6 py-4 bg-blue-50/50 border-t border-[#EBEBF0]">
                  <p className="text-slate-700 leading-relaxed">
                    {faq.a}
                  </p>
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
