import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Saved us 40 hours a week on manual lead research. The email accuracy is amazing.",
    author: "Sarah",
    role: "Sales Manager",
    company: "TechStart Inc",
  },
  {
    quote: "Finally a tool that actually works. Integrated directly with our Salesforce in minutes.",
    author: "James",
    role: "CEO",
    company: "Digital Agency Pro",
  },
  {
    quote: "The AI scoring feature helped us focus on the most qualified leads. ROI was immediate.",
    author: "Maria",
    role: "Marketing Director",
    company: "Growth Ventures",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 sm:py-32 bg-blue-50/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Trusted by Sales & Growth Teams
          </h2>
          <p className="text-lg text-slate-600">
            See what customers are saying about GlobaLeads.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div key={idx} className="card-lift p-8 flex flex-col gap-6">
              {/* Stars */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-blue-600 text-blue-600"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-700 leading-relaxed italic">
                "{t.quote}"
              </p>

              {/* Author */}
              <div>
                <p className="font-bold text-slate-900">{t.author}</p>
                <p className="text-sm text-slate-600">
                  {t.role} at {t.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
