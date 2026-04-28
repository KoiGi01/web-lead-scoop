import { useEffect, useRef } from 'react';

interface CTASectionProps {
  onGetStarted: () => void;
}

const CTASection = ({ onGetStarted }: CTASectionProps) => {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const el = bgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        const off = (r.top - window.innerHeight / 2) * 0.15;
        el.style.transform = `translate(-50%, calc(-50% + ${off}px))`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMagneticMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.25;
    const y = (e.clientY - r.top - r.height / 2) * 0.25;
    e.currentTarget.style.transform = `translate(${x}px, ${y}px)`;
  };
  const handleMagneticLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = '';
  };

  return (
    <section
      id="cta"
      style={{ padding: '160px 0', position: 'relative', overflow: 'hidden', textAlign: 'center', borderBottom: '1px solid rgba(239,237,230,.14)' }}
    >
      <div
        ref={bgRef}
        aria-hidden="true"
        style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontWeight: 300,
          fontSize: 'min(54vw, 820px)', lineHeight: 1,
          color: 'rgba(245,255,61,.04)',
          pointerEvents: 'none', zIndex: 0, letterSpacing: '-.05em',
          userSelect: 'none',
        }}
      >
        22
      </div>

      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'Archivo', fontWeight: 800,
            fontSize: 'clamp(56px,7.2vw,120px)',
            lineHeight: .92, letterSpacing: '-.04em',
            marginBottom: 32,
          }}>
            Run your first search<br />in{' '}
            <em style={{ fontFamily: "'Newsreader'", fontStyle: 'italic', fontWeight: 300, color: '#F5FF3D', letterSpacing: '-.025em' }}>
              90 seconds.
            </em>
          </h2>

          <p style={{ fontSize: 18, color: '#A8A59C', maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.5 }}>
            Two fields. One button. Walk away with a ranked sheet of qualified leads — or close the tab. No demo call, no Slack onboarding.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 36, flexWrap: 'wrap' }}>
            <button
              onClick={onGetStarted}
              onMouseMove={handleMagneticMove}
              onMouseLeave={handleMagneticLeave}
              style={{
                background: '#F5FF3D', color: '#000', border: '1px solid #F5FF3D',
                fontFamily: 'Archivo', fontWeight: 600, fontSize: 14,
                padding: '14px 22px', cursor: 'pointer', borderRadius: 0,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'background .2s, box-shadow .3s, transform .2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#FFFE7A';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 4px rgba(245,255,61,.12), 0 0 30px -4px rgba(245,255,61,.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#F5FF3D';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              Start free — 50 credits <span style={{ display: 'inline-block', transition: 'transform .2s' }}>→</span>
            </button>

            <a
              href="#pricing"
              style={{
                fontFamily: 'Archivo', fontWeight: 500, fontSize: 14,
                padding: '14px 22px', border: '1px solid rgba(239,237,230,.28)',
                color: '#EFEDE6', textDecoration: 'none', borderRadius: 0,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'border-color .2s, background .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#EFEDE6'; e.currentTarget.style.background = 'rgba(239,237,230,.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,237,230,.28)'; e.currentTarget.style.background = ''; }}
            >
              View pricing
            </a>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', fontSize: 13, color: '#67645B' }}>
            {['No credit card', '30-second setup', 'Credits never expire', '14-day refund'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, background: '#F5FF3D', borderRadius: '50%', opacity: .7 }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
