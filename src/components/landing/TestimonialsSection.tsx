import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "We replaced 40 hours of manual research per week with GlobaLeads. The email extraction accuracy is genuinely impressive.",
    author: "Sarah K.",
    role: "Sales Manager",
    company: "TechStart Inc.",
    initials: "SK",
    color: "blue",
  },
  {
    quote: "Finally a prospecting tool that works globally. We are running it across 12 cities simultaneously now.",
    author: "James R.",
    role: "CEO",
    company: "Digital Agency Pro",
    initials: "JR",
    color: "violet",
  },
  {
    quote: "The AI scoring feature completely changed how we prioritize leads. ROI was visible within the first week.",
    author: "Maria C.",
    role: "Marketing Director",
    company: "Growth Ventures",
    initials: "MC",
    color: "green",
  },
];

const avatarColors: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
  green:  "bg-emerald-100 text-emerald-700",
};

const TestimonialsSection = () => {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F7] border border-[rgba(0,0,0,0.08)] px-3.5 py-1.5 mb-5 text-xs font-semibold text-[#6e6e73] tracking-wide">
            Customer stories
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1d1d1f] mb-4 leading-tight">
            Trusted by growth<br />teams worldwide
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="card-lift p-7 flex flex-col gap-5 animate-fade-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-sm text-[#3d3d3f] leading-relaxed">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-3 border-t border-[rgba(0,0,0,0.05)] pt-4 mt-auto">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${avatarColors[t.color]}`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1d1d1f]">{t.author}</p>
                  <p className="text-xs text-[#6e6e73]">{t.role} · {t.company}</p>
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
