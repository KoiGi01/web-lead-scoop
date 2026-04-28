import { useRef, useEffect } from 'react';

const FAQS = [
  {
    q: 'Where do the leads come from?',
    a: 'Public Google Maps results plus a focused crawl of the company\'s own site and indexed social pages. Nothing behind logins, nothing scraped from gated databases.',
  },
  {
    q: 'How accurate are the emails?',
    a: '~91% deliverable on average across our last 30 days. Role inboxes (info@, contact@) and burner addresses are flagged separately so you can route them differently.',
  },
  {
    q: 'Is this GDPR-compliant?',
    a: 'We only surface data already published on the public web by the businesses themselves. You\'re responsible for outreach compliance in your jurisdiction — we link straight to source pages so it\'s auditable.',
  },
  {
    q: 'Do credits expire?',
    a: 'No. Buy a pack, burn it on your timeline. There are no auto-renewals, no recurring charges, and no "use it or lose it" clauses.',
  },
  {
    q: 'Can I export to my CRM?',
    a: 'Yes — every search exports as a clean .xlsx with stable columns. Native HubSpot, Pipedrive and Zapier integrations are on the roadmap.',
  },
  {
    q: 'What\'s the refund policy?',
    a: 'Unused credits are refundable within 14 days, no questions. If a search returns zero relevant leads, the credits land back in your account automatically.',
  },
];

const useFadeIn = (ref: React.RefObject<Element>) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        (el as HTMLElement).style.opacity = '1';
        (el as HTMLElement).style.transform = 'translateY(0)';
        obs.unobserve(el);
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
};

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFadeIn(ref as React.RefObject<Element>);
  return (
    <div
      ref={ref}
      style={{ opacity: 0, transform: 'translateY(14px)', transition: `opacity .8s cubic-bezier(.2,.8,.2,1) ${delay}ms, transform .8s cubic-bezier(.2,.8,.2,1) ${delay}ms` }}
    >
      {children}
    </div>
  );
};

const FaqSectionV2 = () => (
  <section id="faq" style={{ padding: '140px 0', borderBottom: '1px solid rgba(239,237,230,.14)' }}>
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60, alignItems: 'end', marginBottom: 64 }}>
        <FadeIn>
          <h2 style={{ fontFamily: 'Archivo', fontWeight: 800, fontSize: 'clamp(44px,5.2vw,76px)', lineHeight: .94, letterSpacing: '-.035em' }}>
            Common{' '}
            <em style={{ fontFamily: "'Newsreader'", fontStyle: 'italic', fontWeight: 300, color: '#F5FF3D', letterSpacing: '-.025em' }}>questions.</em>
          </h2>
        </FadeIn>
        <FadeIn delay={60}>
          <p style={{ fontSize: 16, color: '#A8A59C', lineHeight: 1.55 }}>
            The questions every operator asks before their first search.
          </p>
        </FadeIn>
      </div>

      <div style={{ borderTop: '1px solid rgba(239,237,230,.14)', maxWidth: 980, margin: '0 auto' }}>
        {FAQS.map((faq, i) => (
          <details
            key={i}
            style={{ borderBottom: '1px solid rgba(239,237,230,.14)' }}
          >
            <summary
              style={{
                listStyle: 'none',
                padding: '24px 4px',
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: '1fr 32px',
                alignItems: 'center',
                gap: 24,
                fontFamily: 'Archivo',
                fontWeight: 500,
                fontSize: 22,
                letterSpacing: '-.025em',
                color: '#EFEDE6',
                transition: 'color .2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EFEDE6')}
            >
              <span>{faq.q}</span>
              <span
                style={{
                  width: 32, height: 32,
                  border: '1px solid rgba(239,237,230,.28)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#EFEDE6',
                  transition: 'all .3s',
                  flexShrink: 0,
                }}
              >+</span>
            </summary>
            <div style={{ padding: '0 4px 24px', fontSize: 15, color: '#A8A59C', lineHeight: 1.65, maxWidth: 760 }}>
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  </section>
);

export default FaqSectionV2;
