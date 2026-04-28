import { useRef, useEffect } from 'react';

const useFadeIn = (ref: React.RefObject<HTMLDivElement>, delay = 0) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, delay);
        obs.unobserve(el);
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
};

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFadeIn(ref, delay);
  return (
    <div ref={ref} style={{ opacity: 0, transform: 'translateY(14px)', transition: `opacity .8s cubic-bezier(.2,.8,.2,1) ${delay}ms, transform .8s cubic-bezier(.2,.8,.2,1) ${delay}ms` }}>
      {children}
    </div>
  );
};

const QuoteSection = () => (
  <section style={{ padding: '140px 0', borderBottom: '1px solid rgba(239,237,230,.14)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80, alignItems: 'center' }}>
        <FadeIn>
          <div style={{
            fontFamily: "'Newsreader', serif",
            fontStyle: 'italic',
            fontSize: 240,
            lineHeight: .7,
            color: '#F5FF3D',
            fontWeight: 300,
            userSelect: 'none',
          }}>
            "
          </div>
        </FadeIn>

        <div>
          <FadeIn delay={80}>
            <p style={{
              fontFamily: 'Archivo',
              fontWeight: 400,
              fontSize: 'clamp(28px,3vw,40px)',
              lineHeight: 1.25,
              letterSpacing: '-.02em',
              color: '#EFEDE6',
              marginBottom: 32,
            }}>
              We replaced an{' '}
              <em style={{ fontFamily: "'Newsreader'", fontStyle: 'italic', fontWeight: 300, color: '#F5FF3D', letterSpacing: '-.025em' }}>
                $890/month
              </em>
              {' '}Apollo seat and two hours of manual scraping with a single GlobaLeads22 search. Our SDR books five meetings off every export.
            </p>
          </FadeIn>

          <FadeIn delay={160}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 46, height: 46,
                border: '1.5px solid #EFEDE6',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Archivo', fontWeight: 700, fontSize: 15, color: '#EFEDE6',
                flexShrink: 0,
              }}>
                M
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <b style={{ color: '#EFEDE6', fontWeight: 600, fontSize: 15 }}>Mara Köhler</b>
                <small style={{ color: '#67645B', fontSize: 13, marginTop: 3 }}>Head of Growth · Northbeam</small>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  </section>
);

export default QuoteSection;
