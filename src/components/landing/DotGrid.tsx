import { useEffect, useRef } from "react";

// Subtle wave-ripple dot grid — hero section only
const GAP = 26;
const RADIUS = 1.1;
const BASE_ALPHA = 0.06;
const WAVE_AMP = 0.16;   // max brightness added by wave
const WAVE_FREQ = 0.28;  // spatial frequency
const WAVE_SPEED = 1.4;  // radians per second

const DotGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width  = parent ? parent.offsetWidth  : window.innerWidth;
      canvas.height = parent ? parent.offsetHeight : window.innerHeight;
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = (ts - startRef.current) / 1000;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width  / GAP) + 1;
      const rows = Math.ceil(height / GAP) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * GAP;
          const y = row * GAP;

          // Diagonal wave: sweeps top-left to bottom-right
          const wave = Math.sin(col * WAVE_FREQ + row * WAVE_FREQ * 0.6 - t * WAVE_SPEED);
          // Normalize 0–1 and ease
          const intensity = (wave + 1) * 0.5;
          const alpha = BASE_ALPHA + intensity * WAVE_AMP;

          ctx.beginPath();
          ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default DotGrid;
