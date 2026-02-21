import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "How accurate is the email data?",
    a: "Accuracy depends on each business's website. We extract emails directly from their pages and contact forms — so if they've published an email, we'll find it. Typically 60–80% of businesses with websites yield at least one valid contact.",
  },
  {
    q: "Does it work outside the US?",
    a: "Yes — GlobaLeads22 works in any country supported by the Google Places API. Just type your location in the local language or English. We've seen great results in Europe, Latin America, Southeast Asia, and beyond.",
  },
  {
    q: "How many leads can I get per search?",
    a: "Up to 60 businesses per search on paid plans (20 on Free). Each business can have multiple email addresses, so the total contact count is often higher than the business count.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — you can run one search for free with no credit card required, getting up to 20 leads. Upgrade to Starter or Pro when you're ready to scale.",
  },
];

const FaqSection = () => {
  return (
    <section className="relative bg-[#e0e5ec] py-24 sm:py-32 overflow-hidden">
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#a3b1c6 1px, transparent 1px), linear-gradient(90deg, #a3b1c6 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.07,
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-14 text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{ boxShadow: "var(--shadow-recessed)" }}
          >
            <HelpCircle className="h-3 w-3 text-[#ff4757]" strokeWidth={2} />
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a5568]">
              FAQ
            </span>
          </div>
          <h2
            className="text-4xl font-bold tracking-tight text-[#2d3436] sm:text-5xl"
            style={{ textShadow: "0 1px 0 #ffffff" }}
          >
            Common <span className="text-[#ff4757]">Questions</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="relative rounded-2xl border-0 px-6 transition-all"
              style={{ boxShadow: "var(--shadow-recessed)", background: "#d1d9e6" }}
            >
              <AccordionTrigger
                className="text-left font-semibold text-[#2d3436] hover:no-underline py-5 text-sm sm:text-base hover:text-[#ff4757] transition-colors"
              >
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[#4a5568] leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
