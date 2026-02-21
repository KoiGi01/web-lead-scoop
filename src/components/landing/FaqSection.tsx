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
        <section className="relative bg-secondary/40 py-24 sm:py-32 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.025]"
                style={{
                    backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="relative mx-auto max-w-3xl px-4">
                <div className="mb-14 text-center">
                    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
                        <HelpCircle className="h-3.5 w-3.5" /> FAQ
                    </p>
                    <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        Common <span className="gradient-text">Questions</span>
                    </h2>
                </div>

                <Accordion type="single" collapsible className="space-y-3">
                    {faqs.map((faq, i) => (
                        <AccordionItem
                            key={i}
                            value={`faq-${i}`}
                            className="rounded-xl border border-border bg-card px-6 shadow-sm data-[state=open]:shadow-md data-[state=open]:border-primary/30 transition-all"
                        >
                            <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5 text-sm sm:text-base">
                                {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
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
