// Transient celebration burst — a spray of citron/white particles under
// gravity. Self-contained: creates a fixed full-screen canvas, animates, then
// removes itself. No-op under prefers-reduced-motion.
interface BurstOpts {
  count?: number;
  originX?: number;
  originY?: number;
  power?: number;
}

export function confettiBurst(opts: BurstOpts = {}): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const count = opts.count ?? 90;
  const power = opts.power ?? 1;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:60;";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const ox = opts.originX ?? window.innerWidth / 2;
  const oy = opts.originY ?? window.innerHeight * 0.38;
  const colors = ["#e8fb52", "#ffffff", "#cfe935"];

  const parts = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (4 + Math.random() * 8);
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      r: 2.5 + Math.random() * 4.5,
      color: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.5,
      life: 0,
      ttl: 70 + Math.random() * 45,
      square: Math.random() < 0.5,
    };
  });

  let raf = 0;
  let frame = 0;
  const tick = () => {
    frame += 1;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = false;
    for (const p of parts) {
      p.life += 1;
      if (p.life > p.ttl) continue;
      alive = true;
      p.vy += 0.24;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
      ctx.fillStyle = p.color;
      if (p.square) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (alive && frame < 260) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(tick);
}
