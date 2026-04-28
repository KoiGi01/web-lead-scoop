const LogoMark = () => (
  <span
    style={{
      width: 28, height: 28,
      border: '1.5px solid #EFEDE6',
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <span style={{ width: 5, height: 5, background: '#F5FF3D', borderRadius: '50%', boxShadow: '0 0 8px #F5FF3D' }} />
  </span>
);

const FooterSectionV2 = () => (
  <footer style={{ background: '#000', paddingTop: 80, paddingBottom: 40 }}>
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
        <div>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <LogoMark />
            <span style={{ fontFamily: 'Archivo', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: '#EFEDE6' }}>
              GlobaLeads<sup style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: '#F5FF3D', verticalAlign: 'top', fontWeight: 500 }}>22</sup>
            </span>
          </a>
          <p style={{ fontSize: 14, color: '#A8A59C', lineHeight: 1.6, marginTop: 18, maxWidth: 340 }}>
            B2B prospecting for operators who'd rather close deals than babysit scrapers.
          </p>
        </div>

        {[
          { heading: 'Product', links: ['How it works', 'Features', 'Pricing', 'FAQ'], hrefs: ['#how', '#features', '#pricing', '#faq'] },
          { heading: 'Company', links: ['About', 'Blog', 'Contact', 'Status'], hrefs: ['#', '#', '#', '#'] },
          { heading: 'Legal', links: ['Privacy', 'Terms', 'DPA', 'Security'], hrefs: ['/privacy', '/terms', '#', '#'] },
        ].map(col => (
          <div key={col.heading}>
            <h5 style={{ fontSize: 13, color: '#67645B', fontWeight: 500, marginBottom: 18, fontFamily: 'Archivo' }}>{col.heading}</h5>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {col.links.map((link, i) => (
                <li key={link}>
                  <a
                    href={col.hrefs[i]}
                    style={{ fontSize: 14, color: '#A8A59C', textDecoration: 'none', transition: 'color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#F5FF3D')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#A8A59C')}
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(239,237,230,.14)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: '#67645B', flexWrap: 'wrap', gap: 12 }}>
        <span>© 2026 GlobaLeads22. All rights reserved.</span>
        <span>Built in Lisbon</span>
      </div>
    </div>
  </footer>
);

export default FooterSectionV2;
