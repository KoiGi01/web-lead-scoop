import { Star } from "lucide-react";

const marqueeItems = [
  "B2B Freelancer", "Cold Email Pro", "Marketing Agency", "Sales Team",
  "Local SEO Expert", "Lead Gen Specialist", "Outreach Consultant", "Growth Hacker",
  "B2B Freelancer", "Cold Email Pro", "Marketing Agency", "Sales Team",
  "Local SEO Expert", "Lead Gen Specialist", "Outreach Consultant", "Growth Hacker",
];

const testimonials = [
  {
    quote: "I was manually building lead lists for hours. GlobaLeads22 cut that to 10 minutes. It paid for itself on the first client.",
    name: "Alex M.",
    role: "B2B Sales Freelancer",
    initials: "AM",
    color: "#6366f1",
    stars: 5,
    rotate: "-rotate-1",
  },
  {
    quote: "The email extraction is surprisingly accurate. We run campaigns for local restaurants and GlobaLeads22 saves us days of research every week.",
    name: "Sarah K.",
    role: "Marketing Agency Owner",
    initials: "SK",
    color: "#ec4899",
    stars: 5,
    rotate: "rotate-0",
  },
  {
    quote: "Finally a tool that just works. Search, wait 2 minutes, download your Excel. The WhatsApp feature alone is worth the subscription.",
    name: "James T.",
    role: "Cold Email Consultant",
    initials: "JT",
    color: "#f59e0b",
    stars: 5,
    rotate: "rotate-1",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="bg-[#0F1115] py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Field Reports
            </span>
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            What Our <span className="gradient-text">Users Say</span>
          </h2>
        </div>

        {/* Scrolling marquee */}
        <div className="relative mb-14 overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10" style={{ background: "linear-gradient(to right, #0F1115, transparent)" }} />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10" style={{ background: "linear-gradient(to left, #0F1115, transparent)" }} />
          <div className="flex gap-3 animate-marquee whitespace-nowrap">
            {marqueeItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center rounded-full px-4 py-1.5 font-mono-data text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] border border-white/10 bg-white/5"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Testimonial cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className={`group relative rounded-2xl p-6 glass-card ${t.rotate} card-lift`}
            >
              {/* Orange top accent line */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#F7931A]/50 to-transparent" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(t.stars)].map((_, i) => (
                  <svg key={i} className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-sm leading-relaxed text-[#94A3B8] mb-5">"{t.quote}"</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: t.color }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-heading font-semibold text-white">{t.name}</p>
                  <p className="font-mono-data text-[10px] text-[#94A3B8] uppercase tracking-wider">{t.role}</p>
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
