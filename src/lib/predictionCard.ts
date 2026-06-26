interface CardOpts {
  homeTeam: string;
  awayTeam: string;
  // The pick as shown on the card: a scoreline ("2–1") or a result ("France to win").
  pick: string;
}

const SIZE = 1080;
const BG = "#08090c";
const ACCENT = "#e8fb52";
const TEXT = "#f3f5f8";

export async function renderPredictionCard(opts: CardOpts): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, SIZE, 14);
  ctx.fillRect(0, SIZE - 14, SIZE, 14);

  ctx.textAlign = "center";

  ctx.fillStyle = ACCENT;
  ctx.font = "700 38px Arial";
  ctx.fillText("MY WORLD CUP PREDICTION", SIZE / 2, 200);

  ctx.fillStyle = TEXT;
  ctx.font = "800 64px Arial";
  ctx.fillText(`${opts.homeTeam}  vs  ${opts.awayTeam}`, SIZE / 2, 430);

  ctx.fillStyle = ACCENT;
  // Scale the pick down for longer result labels so it never overflows.
  const pickSize = opts.pick.length <= 5 ? 200 : opts.pick.length <= 14 ? 110 : 80;
  ctx.font = `900 ${pickSize}px Arial`;
  ctx.fillText(opts.pick, SIZE / 2, 680);

  ctx.fillStyle = TEXT;
  ctx.font = "700 40px Arial";
  ctx.fillText("Make your pick → globaleads22.com", SIZE / 2, 920);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
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
