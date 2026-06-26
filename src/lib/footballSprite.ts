// The real football artwork (lives in public/). Loaded once, lazily.
export const FOOTBALL_IMAGE_SRC = "/sport-ball-football-free-png.webp";

let ballImg: HTMLImageElement | null = null;
let ballReady = false;

function getBallImage(): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (!ballImg) {
    ballImg = new Image();
    ballImg.onload = () => {
      ballReady = true;
    };
    ballImg.onerror = () => {
      ballImg = null;
      ballReady = false;
    };
    ballImg.src = FOOTBALL_IMAGE_SRC;
  }
  return ballReady ? ballImg : null;
}

// Preferred renderer: draws the real ball image, clipped to a circle so any
// non-transparent corners are hidden. Falls back to the vector ball until the
// image is loaded (or if it fails to load).
export function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot = 0,
  citron = false,
): void {
  const img = getBallImage();
  if (!img) {
    drawFootball(ctx, x, y, r, rot, citron);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  // Aspect-correct "cover" so the round ball never stretches: scale by the
  // smaller source dimension, let the larger overflow (clipped to the circle).
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const box = r * 2 * 1.16;
  const scale = box / Math.min(iw, ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

// Shared stylized-football fallback used until the image loads. Crisp white (or
// citron accent) ball with dark seams — on-brand, not cartoonish.
export function drawFootball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot = 0,
  citron = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // body
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = citron ? "#e8fb52" : "#f3f5f8";
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.strokeStyle = citron ? "rgba(8,9,12,0.30)" : "rgba(8,9,12,0.16)";
  ctx.stroke();

  const dark = citron ? "#0b0d11" : "#1c2029";
  const pr = r * 0.36;

  // center pentagon
  ctx.fillStyle = dark;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const px = Math.cos(a) * pr;
    const py = Math.sin(a) * pr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // seams radiating to the edge
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + Math.PI / 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * pr * 0.95, Math.sin(a) * pr * 0.95);
    ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
    ctx.stroke();
  }

  ctx.restore();
}
