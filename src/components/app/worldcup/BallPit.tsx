import { useEffect, useRef } from "react";
import { drawBall } from "@/lib/footballSprite";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  citron: boolean;
  rot: number;
  vr: number;
}

// Ambient footballs that drift and fall across the background. Click one and it
// bounces away. Sits behind the page content (clicks over the content column go
// to the UI; clicks in the margins reach the canvas). Static under reduced motion.
const BallPit = ({ className = "" }: { className?: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (fromTop = false): Ball => ({
      x: Math.random() * w,
      y: fromTop ? -30 - Math.random() * 80 : Math.random() * h,
      vx: (Math.random() - 0.5) * 0.9,
      vy: Math.random() * 1.4,
      r: 11 + Math.random() * 17,
      citron: Math.random() < 0.16,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.12,
    });

    resize();
    const count = Math.min(18, Math.max(7, Math.round(window.innerWidth / 110)));
    const balls: Ball[] = Array.from({ length: count }, () => spawn());

    const renderStatic = () => {
      ctx.clearRect(0, 0, w, h);
      for (const b of balls) drawBall(ctx, b.x, b.y, b.r, b.rot, b.citron);
    };

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      // Time-based so the balls drift at the same speed on any refresh rate.
      const dt = Math.min(2.5, (now - last) / 16.667);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const b of balls) {
        b.vy += 0.05 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.7; }
        else if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * 0.7; }
        if (b.y > h - b.r) {
          b.y = h - b.r;
          b.vy *= -0.62;
          b.vx *= 0.98;
          b.vr *= 0.9;
        }
        if (b.y > h + 120) Object.assign(b, spawn(true));
        drawBall(ctx, b.x, b.y, b.r, b.rot, b.citron);
      }
      raf = requestAnimationFrame(step);
    };

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let nearest: Ball | null = null;
      let nd = Infinity;
      for (const b of balls) {
        const d = (b.x - mx) ** 2 + (b.y - my) ** 2;
        if (d < nd) { nd = d; nearest = b; }
      }
      if (nearest && nd < (nearest.r + 26) ** 2) {
        const dx = nearest.x - mx;
        const dy = nearest.y - my;
        const m = Math.hypot(dx, dy) || 1;
        nearest.vx += (dx / m) * 6;
        nearest.vy = -8 - Math.random() * 5;
        nearest.vr = (Math.random() - 0.5) * 0.7;
      }
    };

    window.addEventListener("resize", resize);
    if (reduce) {
      renderStatic();
    } else {
      canvas.addEventListener("click", onClick);
      raf = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
};

export default BallPit;
