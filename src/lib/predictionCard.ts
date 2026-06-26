interface CardOpts {
  homeTeam: string;
  awayTeam: string;
  // The pick as shown big on the card: a scoreline ("2–1") or a result ("France to win").
  pick: string;
  // One-line context under the pick (e.g. "Exact score — a free month if I nail it").
  subtitle: string;
}

const W = 1080;
const H = 1350;
const BG = "#08090c";
const ACCENT = "#e8fb52";
const TEXT = "#f3f5f8";
const MUTED = "#98a0af";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Shrink the font until the text fits maxWidth (keeps long result labels on one line).
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, weight = "900") {
  let size = startPx;
  while (size > 28) {
    ctx.font = `${weight} ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

export async function renderPredictionCard(opts: CardOpts): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const [glLogo, wcLogo] = await Promise.all([
    loadImage("/logo.png"),
    loadImage("/world-cup-logo-2026.webp"),
  ]);

  const M = 90;

  // ── background ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const topGlow = ctx.createRadialGradient(W / 2, -120, 40, W / 2, -120, 920);
  topGlow.addColorStop(0, "rgba(232,251,82,0.18)");
  topGlow.addColorStop(1, "rgba(232,251,82,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const pitchGlow = ctx.createRadialGradient(W / 2, H + 140, 60, W / 2, H + 140, 820);
  pitchGlow.addColorStop(0, "rgba(95,227,161,0.16)");
  pitchGlow.addColorStop(1, "rgba(95,227,161,0)");
  ctx.fillStyle = pitchGlow;
  ctx.fillRect(0, 0, W, H);

  // faint pitch markings
  ctx.strokeStyle = "rgba(243,245,248,0.05)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.55, 240, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(M, H * 0.55);
  ctx.lineTo(W - M, H * 0.55);
  ctx.stroke();

  // citron frame
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 12);
  ctx.fillRect(0, H - 12, W, 12);

  ctx.textBaseline = "alphabetic";

  // ── header: GlobaLeads badge + wordmark (left), World Cup logo (right) ──
  if (glLogo) {
    const s = 96;
    roundRectPath(ctx, M, 80, s, s, 18);
    ctx.save();
    ctx.clip();
    ctx.drawImage(glLogo, M, 80, s, s);
    ctx.restore();
  }
  ctx.textAlign = "left";
  ctx.fillStyle = ACCENT;
  ctx.font = "800 34px Arial";
  ctx.fillText("GLOBALEADS22", M + 118, 132);
  ctx.fillStyle = MUTED;
  ctx.font = "600 24px Arial";
  ctx.fillText("Opportunity prospecting", M + 118, 166);

  if (wcLogo) {
    const h = 176;
    const w = (wcLogo.naturalWidth / wcLogo.naturalHeight) * h;
    ctx.drawImage(wcLogo, W - M - w, 58, w, h);
  }

  // ── body ──
  ctx.textAlign = "center";

  ctx.fillStyle = ACCENT;
  ctx.font = "700 30px Arial";
  ctx.fillText("W O R L D   C U P   P R E D I C T O R", W / 2, 372);

  const teams = `${opts.homeTeam}  vs  ${opts.awayTeam}`;
  const tSize = fitFont(ctx, teams, W - 2 * M, 70, "800");
  ctx.fillStyle = TEXT;
  ctx.font = `800 ${tSize}px Arial`;
  ctx.fillText(teams, W / 2, 480);

  ctx.fillStyle = MUTED;
  ctx.font = "700 27px Arial";
  ctx.fillText("M Y   C A L L", W / 2, 612);

  const pSize = fitFont(ctx, opts.pick, W - 2 * M, 200, "900");
  ctx.fillStyle = ACCENT;
  ctx.font = `900 ${pSize}px Arial`;
  ctx.fillText(opts.pick, W / 2, 828);

  ctx.fillStyle = TEXT;
  const sSize = fitFont(ctx, opts.subtitle, W - 2 * M, 36, "600");
  ctx.font = `600 ${sSize}px Arial`;
  ctx.fillText(opts.subtitle, W / 2, 952);

  // ── CTA footer ──
  const pillY = H - 180;
  ctx.fillStyle = ACCENT;
  roundRectPath(ctx, M, pillY, W - 2 * M, 100, 24);
  ctx.fill();
  ctx.fillStyle = "#08090c";
  ctx.font = "800 38px Arial";
  ctx.fillText("Predict & win → globaleads22.com", W / 2, pillY + 63);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

// Open the native share sheet with the image when supported (mobile), else
// download the file. Returns how it was handled.
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  text: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
