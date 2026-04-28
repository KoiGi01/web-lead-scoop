import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  onGetStarted: () => void;
}

type Stage = 0 | 1 | 2 | 3;

interface NetworkNode {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface ResultRow {
  name: string;
  channels: string[];
  score: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUERIES: [string, string][] = [
  ['dental clinics',  'Lisbon, Portugal'],
  ['law firms',       'Berlin, Germany'],
  ['solar installers','Austin, Texas'],
  ['boutique hotels', 'Mexico City'],
];

const RESULT_ROWS: ResultRow[] = [
  { name: 'Clínica Almeida & Silva',   channels: ['@', 'in', 'w'],  score: 94 },
  { name: 'Sorriso Premium Dental',    channels: ['@', 'in'],       score: 88 },
  { name: 'DentaLab Estoril',          channels: ['@', 'w'],        score: 81 },
  { name: 'Clínica Ribeiro & Filhos',  channels: ['@', '☏'],        score: 78 },
  { name: 'Smile Studio Lisboa',       channels: ['@', 'in'],       score: 72 },
];

const STAGE_NAMES = ['SEARCH', 'SCANNING', 'RESULTS', 'EXPORT'];

// 8 peripheral nodes distributed evenly around center (SVG viewport 220×180)
const NETWORK_NODES: NetworkNode[] = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
  return {
    id: i,
    x: 110 + Math.cos(angle) * 72,
    y: 90  + Math.sin(angle) * 62,
    angle,
  };
});

// ─── Magnetic button hook ─────────────────────────────────────────────────────

function useMagnetic() {
  const ref = useRef<HTMLButtonElement>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) * 0.25;
    const dy = (e.clientY - cy) * 0.25;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }, []);

  const onMouseLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = '';
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

// ─── ScoreBar sub-component ───────────────────────────────────────────────────

function ScoreBar({ score, visible }: { score: number; visible: boolean }) {
  return (
    <div style={{ width: 56, height: 4, background: 'rgba(239,237,230,0.1)', borderRadius: 2, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: visible ? `${score}%` : '0%',
          background: '#F5FF3D',
          borderRadius: 2,
          transition: visible ? 'width 0.5s cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HeroSectionV2({ onGetStarted }: Props) {
  // ── Copy entrance state ────────────────────────────────────────────────────
  const [copyVisible, setCopyVisible] = useState([false, false, false, false]);

  // ── Animation panel state ──────────────────────────────────────────────────
  const [currentStage,  setCurrentStage]  = useState<Stage>(0);
  const [queryIdx,      setQueryIdx]      = useState(0);
  const [typewriterKw,  setTypewriterKw]  = useState('');
  const [typewriterLoc, setTypewriterLoc] = useState('');
  const [kwActive,      setKwActive]      = useState(true);
  const [locActive,     setLocActive]     = useState(false);
  const [btnReady,      setBtnReady]      = useState(false);
  const [networkNodes,  setNetworkNodes]  = useState<number[]>([]); // indices of visible lines
  const [sourcesCount,  setSourcesCount]  = useState(0);
  const [resultRows,    setResultRows]    = useState<number[]>([]);  // indices of visible rows
  const [progressPct,   setProgressPct]   = useState(0);
  const [progressDur,   setProgressDur]   = useState(14);

  const cancelled = useRef({ cancelled: false });
  const primaryMag = useMagnetic();

  // ── Copy entrance: staggered fade-in on mount ──────────────────────────────
  useEffect(() => {
    const delays = [0, 120, 260, 420];
    const timers = delays.map((d, i) =>
      setTimeout(() => setCopyVisible(prev => {
        const next = [...prev];
        next[i] = true;
        return next;
      }), d)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Main animation loop ────────────────────────────────────────────────────
  useEffect(() => {
    const signal = { cancelled: false };
    cancelled.current = signal;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const wait = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        if (signal.cancelled) { reject(new Error('cancelled')); return; }
        const id = setTimeout(() => {
          if (signal.cancelled) reject(new Error('cancelled'));
          else resolve();
        }, ms);
        const poll = setInterval(() => {
          if (signal.cancelled) { clearTimeout(id); clearInterval(poll); reject(new Error('cancelled')); }
        }, 50);
        // once resolved, clear poll
        const origResolve = resolve;
        (resolve as unknown) = () => { clearInterval(poll); origResolve(); };
        void origResolve;
      });

    async function runLoop(qi: number) {
      const kw  = QUERIES[qi][0];
      const loc = QUERIES[qi][1];

      // ── Reset progress bar ───────────────────────────────────────────────
      setProgressPct(0);
      setProgressDur(14);
      // Trigger fill on next tick so transition fires
      setTimeout(() => {
        if (!signal.cancelled) {
          setProgressPct(100);
        }
      }, 80);

      if (prefersReduced) {
        setCurrentStage(2);
        setResultRows([0, 1, 2, 3, 4]);
        return; // no further looping
      }

      // ════ STAGE 0 — SEARCH ════════════════════════════════════════════════
      setCurrentStage(0);
      setTypewriterKw('');
      setTypewriterLoc('');
      setKwActive(true);
      setLocActive(false);
      setBtnReady(false);
      setNetworkNodes([]);
      setSourcesCount(0);
      setResultRows([]);

      // Type keyword
      for (let i = 1; i <= kw.length; i++) {
        if (signal.cancelled) throw new Error('cancelled');
        setTypewriterKw(kw.slice(0, i));
        await new Promise<void>((res, rej) => {
          const id = setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 60 + Math.random() * 40);
          void id;
        });
      }

      await new Promise<void>((res, rej) => setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 340));

      // Activate location field
      setKwActive(false);
      setLocActive(true);

      for (let i = 1; i <= loc.length; i++) {
        if (signal.cancelled) throw new Error('cancelled');
        setTypewriterLoc(loc.slice(0, i));
        await new Promise<void>((res, rej) => {
          const id = setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 55 + Math.random() * 35);
          void id;
        });
      }

      await new Promise<void>((res, rej) => setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 300));
      setLocActive(false);
      setBtnReady(true);

      await new Promise<void>((res, rej) => setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 1200));

      // ════ STAGE 1 — SCANNING ══════════════════════════════════════════════
      setCurrentStage(1);
      setNetworkNodes([]);
      setSourcesCount(0);

      for (let i = 0; i < 8; i++) {
        if (signal.cancelled) throw new Error('cancelled');
        await new Promise<void>((res, rej) => setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 200));
        setNetworkNodes(prev => [...prev, i]);
        setSourcesCount(i + 1);
      }

      await new Promise<void>((res, rej) => setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 600));

      // ════ STAGE 2 — RESULTS ═══════════════════════════════════════════════
      setCurrentStage(2);
      setResultRows([]);

      for (let i = 0; i < RESULT_ROWS.length; i++) {
        if (signal.cancelled) throw new Error('cancelled');
        await new Promise<void>((res, rej) => setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 280));
        setResultRows(prev => [...prev, i]);
      }

      await new Promise<void>((res, rej) => setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 1400));

      // ════ STAGE 3 — EXPORT ════════════════════════════════════════════════
      setCurrentStage(3);

      await new Promise<void>((res, rej) => setTimeout(() => signal.cancelled ? rej(new Error('cancelled')) : res(), 2400));

      // Loop to next query
      if (!signal.cancelled) {
        const next = (qi + 1) % QUERIES.length;
        setQueryIdx(next);
        runLoop(next).catch(() => {});
      }
    }

    runLoop(0).catch(() => {});

    return () => {
      signal.cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-run loop when queryIdx changes (handled inside runLoop itself) ───────
  // (loop is self-contained, no external trigger needed)

  const [kw, loc] = QUERIES[queryIdx];

  // ── Render helpers ─────────────────────────────────────────────────────────

  const fadeStyle = (visible: boolean, delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(18px)',
    transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  });

  return (
    <section
      style={{
        background: '#000',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 80,
        overflow: 'hidden',
      }}
    >
      {/* ── Container ── */}
      <div
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '0 32px',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
            gap: 64,
            alignItems: 'center',
          }}
          className="hero-grid"
        >

          {/* ══════════════════════════════════════════════════════════════════
              LEFT — COPY
          ══════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* H1 */}
            <div style={fadeStyle(copyVisible[0])}>
              <h1
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: 'clamp(44px, 5.5vw, 72px)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  color: '#EFEDE6',
                  margin: 0,
                }}
              >
                Find buyers,
                <br />
                <span
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontStyle: 'italic',
                    color: '#F5FF3D',
                    fontSize: 'clamp(48px, 6vw, 78px)',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                  }}
                >
                  not cold lists.
                </span>
              </h1>
            </div>

            {/* Subheadline */}
            <div style={fadeStyle(copyVisible[1], 40)}>
              <p
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: 18,
                  lineHeight: 1.65,
                  color: '#A8A59C',
                  maxWidth: 520,
                  margin: 0,
                }}
              >
                Type a keyword and a city. Walk away in 90 seconds with a{' '}
                <strong style={{ color: '#EFEDE6', fontWeight: 600 }}>
                  ranked sheet of real businesses
                </strong>{' '}
                — verified emails, LinkedIn handles, AI fit-scores. Built for operators who&apos;d
                rather close deals than babysit scrapers.
              </p>
            </div>

            {/* CTA row */}
            <div style={{ ...fadeStyle(copyVisible[2], 80), display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* Primary */}
              <button
                ref={primaryMag.ref}
                onMouseMove={primaryMag.onMouseMove}
                onMouseLeave={primaryMag.onMouseLeave}
                onClick={onGetStarted}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#F5FF3D',
                  color: '#000',
                  border: 'none',
                  borderRadius: 0,
                  padding: '14px 24px',
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  transition: 'background 150ms ease, transform 200ms ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FFFE7A')}
              >
                Start free — 50 credits
                <span style={{ fontSize: 16, lineHeight: 1 }}>→</span>
              </button>

              {/* Ghost */}
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'transparent',
                  color: '#A8A59C',
                  border: '1px solid rgba(239,237,230,0.14)',
                  borderRadius: 0,
                  padding: '14px 24px',
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease, color 150ms ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(239,237,230,0.28)';
                  e.currentTarget.style.color = '#EFEDE6';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(239,237,230,0.14)';
                  e.currentTarget.style.color = '#A8A59C';
                }}
              >
                See how it works
              </button>
            </div>

            {/* Trust row */}
            <div style={{ ...fadeStyle(copyVisible[3], 140), display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Stars */}
              <span style={{ color: '#F5FF3D', fontSize: 14, letterSpacing: 1 }}>★★★★★</span>
              <span style={{ color: '#67645B', fontSize: 13 }}>·</span>
              <span style={{ fontFamily: "'Archivo', sans-serif", fontSize: 13, color: '#A8A59C' }}>
                4.9 / 5 · 312 operators
              </span>
              <span style={{ color: '#67645B', fontSize: 13 }}>·</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#67645B',
                }}
              >
                No credit card
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT — ANIMATION PANEL
          ══════════════════════════════════════════════════════════════════ */}
          <div
            style={{
              ...fadeStyle(copyVisible[1], 200),
              position: 'relative',
            }}
          >
            <AnimationPanel
              stage={currentStage}
              queryIdx={queryIdx}
              kw={kw}
              loc={loc}
              typewriterKw={typewriterKw}
              typewriterLoc={typewriterLoc}
              kwActive={kwActive}
              locActive={locActive}
              btnReady={btnReady}
              networkNodes={networkNodes}
              sourcesCount={sourcesCount}
              resultRows={resultRows}
              progressPct={progressPct}
              progressDur={progressDur}
            />
          </div>

        </div>
      </div>

      {/* ── Responsive grid override ── */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

// ─── Animation Panel ──────────────────────────────────────────────────────────

interface PanelProps {
  stage: Stage;
  queryIdx: number;
  kw: string;
  loc: string;
  typewriterKw: string;
  typewriterLoc: string;
  kwActive: boolean;
  locActive: boolean;
  btnReady: boolean;
  networkNodes: number[];
  sourcesCount: number;
  resultRows: number[];
  progressPct: number;
  progressDur: number;
}

function AnimationPanel({
  stage, queryIdx,
  typewriterKw, typewriterLoc,
  kwActive, locActive, btnReady,
  networkNodes, sourcesCount,
  resultRows,
  progressPct, progressDur,
}: PanelProps) {

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1.05 / 1',
        background: '#080807',
        border: '1px solid rgba(239,237,230,0.14)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Corner ticks ────────────────────────────────────────────────── */}
      {/* Top-right */}
      <div
        style={{
          position: 'absolute',
          top: -1,
          right: -1,
          width: 14,
          height: 14,
          border: '1px solid rgba(239,237,230,0.55)',
          background: 'transparent',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      {/* Bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: -1,
          left: -1,
          width: 14,
          height: 14,
          border: '1px solid rgba(239,237,230,0.55)',
          background: 'transparent',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(239,237,230,0.07)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Pulsing dot */}
          <span
            className="animate-pulse-dot"
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#F5FF3D',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#EFEDE6',
            }}
          >
            {STAGE_NAMES[stage]}
          </span>
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.06em',
            color: '#F5FF3D',
          }}
        >
          Step {stage + 1} of 4
        </span>
      </div>

      {/* ── Stage content ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Stage 0 — SEARCH */}
        <StageSearch
          visible={stage === 0}
          typewriterKw={typewriterKw}
          typewriterLoc={typewriterLoc}
          kwActive={kwActive}
          locActive={locActive}
          btnReady={btnReady}
        />

        {/* Stage 1 — SCANNING */}
        <StageScanning
          visible={stage === 1}
          networkNodes={networkNodes}
          sourcesCount={sourcesCount}
        />

        {/* Stage 2 — RESULTS */}
        <StageResults
          visible={stage === 2}
          resultRows={resultRows}
        />

        {/* Stage 3 — EXPORT */}
        <StageExport visible={stage === 3} />

      </div>

      {/* ── Bottom: pips + progress bar ─────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid rgba(239,237,230,0.07)',
          padding: '10px 16px 12px',
          flexShrink: 0,
        }}
      >
        {/* Pips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          {([0, 1, 2, 3] as Stage[]).map(s => (
            <div
              key={s}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: stage === s ? '#F5FF3D' : 'rgba(239,237,230,0.18)',
                boxShadow: stage === s ? '0 0 8px rgba(245,255,61,0.6)' : 'none',
                transition: 'background 300ms ease, box-shadow 300ms ease',
              }}
            />
          ))}
        </div>

        {/* Progress bar track */}
        <div
          style={{
            height: 2,
            background: 'rgba(239,237,230,0.08)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: '#F5FF3D',
              borderRadius: 1,
              transition: progressPct === 0 ? 'none' : `width ${progressDur}s linear`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Stage 0 — Search ─────────────────────────────────────────────────────────

function StageSearch({
  visible,
  typewriterKw,
  typewriterLoc,
  kwActive,
  locActive,
  btnReady,
}: {
  visible: boolean;
  typewriterKw: string;
  typewriterLoc: string;
  kwActive: boolean;
  locActive: boolean;
  btnReady: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 14,
        padding: '20px 24px',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Keyword field */}
      <div
        style={{
          border: `1px solid ${kwActive ? '#F5FF3D' : 'rgba(239,237,230,0.14)'}`,
          padding: '12px 16px',
          transition: 'border-color 300ms ease',
          background: kwActive ? 'rgba(245,255,61,0.03)' : 'transparent',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: kwActive ? '#F5FF3D' : '#67645B',
            marginBottom: 6,
            transition: 'color 300ms ease',
          }}
        >
          KEYWORD
        </div>
        <div
          style={{
            fontFamily: "'Archivo', sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: '#EFEDE6',
            letterSpacing: '-0.01em',
            minHeight: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {typewriterKw || <span style={{ color: '#3A3833' }}>—</span>}
          {kwActive && (
            <span
              className="animate-caret-blink"
              style={{ display: 'inline-block', width: 2, height: 22, background: '#F5FF3D', borderRadius: 1 }}
            />
          )}
        </div>
      </div>

      {/* Location field */}
      <div
        style={{
          border: `1px solid ${locActive ? '#F5FF3D' : 'rgba(239,237,230,0.14)'}`,
          padding: '12px 16px',
          transition: 'border-color 300ms ease',
          background: locActive ? 'rgba(245,255,61,0.03)' : 'transparent',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: locActive ? '#F5FF3D' : '#67645B',
            marginBottom: 6,
            transition: 'color 300ms ease',
          }}
        >
          LOCATION
        </div>
        <div
          style={{
            fontFamily: "'Archivo', sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: '#EFEDE6',
            letterSpacing: '-0.01em',
            minHeight: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {typewriterLoc || <span style={{ color: '#3A3833' }}>—</span>}
          {locActive && (
            <span
              className="animate-caret-blink"
              style={{ display: 'inline-block', width: 2, height: 22, background: '#F5FF3D', borderRadius: 1 }}
            />
          )}
        </div>
      </div>

      {/* Run search button */}
      <div style={{ opacity: btnReady ? 1 : 0, transition: 'opacity 400ms ease' }}>
        <button
          className={btnReady ? 'animate-pulse-btn' : ''}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#F5FF3D',
            color: '#000',
            border: 'none',
            borderRadius: 0,
            padding: '10px 20px',
            fontFamily: "'Archivo', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'default',
          }}
        >
          Run search →
        </button>
      </div>
    </div>
  );
}

// ─── Stage 1 — Scanning ───────────────────────────────────────────────────────

function StageScanning({
  visible,
  networkNodes,
  sourcesCount,
}: {
  visible: boolean;
  networkNodes: number[];
  sourcesCount: number;
}) {
  const CX = 110;
  const CY = 90;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <svg
        viewBox="0 0 220 180"
        style={{ width: '80%', maxWidth: 280, height: 'auto', overflow: 'visible' }}
      >
        {/* Lines */}
        {NETWORK_NODES.map((node, i) => (
          <line
            key={node.id}
            x1={CX}
            y1={CY}
            x2={node.x}
            y2={node.y}
            stroke={networkNodes.includes(i) ? '#F5FF3D' : 'transparent'}
            strokeWidth={1}
            strokeOpacity={networkNodes.includes(i) ? 0.6 : 0}
            style={{
              transition: networkNodes.includes(i)
                ? 'stroke-opacity 0.28s ease, stroke 0.28s ease'
                : 'none',
              strokeDasharray: '4 3',
            }}
          />
        ))}

        {/* Peripheral dots */}
        {NETWORK_NODES.map((node, i) => (
          <circle
            key={`dot-${node.id}`}
            cx={node.x}
            cy={node.y}
            r={4}
            fill={networkNodes.includes(i) ? '#F5FF3D' : 'rgba(239,237,230,0.15)'}
            style={{
              transition: 'fill 0.28s ease',
              filter: networkNodes.includes(i) ? 'drop-shadow(0 0 4px rgba(245,255,61,0.7))' : 'none',
            }}
          />
        ))}

        {/* Center dot */}
        <circle
          cx={CX}
          cy={CY}
          r={7}
          fill="#F5FF3D"
          style={{ filter: 'drop-shadow(0 0 6px rgba(245,255,61,0.8))' }}
        />
        <circle cx={CX} cy={CY} r={3} fill="#000" />
      </svg>

      {/* Counter */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#A8A59C',
        }}
      >
        <span style={{ color: '#F5FF3D', fontWeight: 700, fontSize: 16 }}>{sourcesCount}</span>
        {' '}sources scanned
      </div>
    </div>
  );
}

// ─── Stage 2 — Results ────────────────────────────────────────────────────────

function StageResults({
  visible,
  resultRows,
}: {
  visible: boolean;
  resultRows: number[];
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: visible ? 'auto' : 'none',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 70px 72px 40px',
          gap: 8,
          padding: '8px 14px',
          borderBottom: '1px solid rgba(239,237,230,0.07)',
          position: 'sticky',
          top: 0,
          background: '#080807',
          zIndex: 2,
        }}
      >
        {['Business', 'Channels', 'Score', 'Fit'].map(h => (
          <span
            key={h}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#67645B',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1 }}>
        {RESULT_ROWS.map((row, i) => {
          const isVisible = resultRows.includes(i);
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 70px 72px 40px',
                gap: 8,
                padding: '8px 14px',
                borderBottom: '1px solid rgba(239,237,230,0.05)',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-8px)',
                transition: isVisible
                  ? `opacity 0.35s cubic-bezier(0.22,1,0.36,1) ${i * 40}ms, transform 0.35s cubic-bezier(0.22,1,0.36,1) ${i * 40}ms`
                  : 'none',
                alignItems: 'center',
              }}
            >
              {/* Business name */}
              <span
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: 11,
                  color: '#EFEDE6',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.name}
              </span>

              {/* Channels */}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {row.channels.map((ch, ci) => (
                  <span
                    key={ci}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: '#A8A59C',
                      background: 'rgba(239,237,230,0.06)',
                      padding: '1px 4px',
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>

              {/* Score bar */}
              <ScoreBar score={row.score} visible={isVisible} />

              {/* Fit score */}
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  color: row.score >= 90 ? '#F5FF3D' : row.score >= 80 ? '#FFFE7A' : '#A8A59C',
                }}
              >
                {row.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stage 3 — Export ─────────────────────────────────────────────────────────

function StageExport({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* XLSX box */}
      <div
        className="animate-lift"
        style={{
          width: 120,
          height: 140,
          border: '1px solid #F5FF3D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 6,
          background: 'rgba(245,255,61,0.04)',
        }}
      >
        {/* Folded corner accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '0 18px 18px 0',
            borderColor: `transparent #F5FF3D transparent transparent`,
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            fontWeight: 700,
            color: '#F5FF3D',
            letterSpacing: '0.04em',
          }}
        >
          .XLSX
        </span>
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#F5FF3D',
            fontWeight: 700,
          }}
        >
          EXPORTED
        </span>
        <span
          style={{
            fontFamily: "'Archivo', sans-serif",
            fontSize: 14,
            color: '#A8A59C',
            fontWeight: 500,
          }}
        >
          184 verified leads
        </span>
      </div>
    </div>
  );
}
