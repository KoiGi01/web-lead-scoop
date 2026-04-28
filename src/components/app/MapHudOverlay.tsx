import { useEffect, useRef } from "react";

/* ── Types ─────────────────────────────────────── */

interface MapHudOverlayProps {
  mapInstance: google.maps.Map | null;
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  markers: Array<{ lat: number; lng: number; name: string; hasEmail?: boolean }>;
  isSearching: boolean;
}

interface DataFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  age: number;
  maxAge: number;
  size: number;
}

interface TargetingEvent {
  x: number;
  y: number;
  name: string;
  startTime: number;
}

interface ExtractEvent {
  x: number;
  y: number;
  name: string;
  startTime: number;
  particles: Array<{ angle: number; speed: number; char: string }>;
}

interface ConnectionLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
  age: number;
  maxAge: number;
}

/* ── Constants ─────────────────────────────────── */

const FONT = "'JetBrains Mono', 'Courier New', monospace";
const C = "0,255,170"; // Accent color RGB — cyber green
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const HEX = "0123456789ABCDEF";
const rHex = (n: number) => Array.from({ length: n }, () => HEX[(Math.random() * 16) | 0]).join("");
const rInt = (max: number) => (Math.random() * max) | 0;
const rFloat = (min: number, max: number) => min + Math.random() * (max - min);

const DATA_TEMPLATES = [
  () => `0x${rHex(4)}`,
  () => `0x${rHex(8)}`,
  () => `${rInt(255)}.${rInt(255)}.${rInt(255)}.${rInt(255)}`,
  () => `${(Math.random() * 180 - 90).toFixed(4)},${(Math.random() * 360 - 180).toFixed(4)}`,
  () => ["PING OK", "PORT 443", "SSL VALID", "DNS RESOLVE", "TCP ACK", "AUTH OK", "TLS 1.3", "HTTP 200", "WHOIS OK", "MX RECORD", "SMTP 250", "TRACE RT", "CERT OK", "SCAN 80"][rInt(14)],
  () => `[${rHex(2)}:${rHex(2)}:${rHex(2)}]`,
  () => `PKT ${rInt(9999)}`,
  () => `TTL ${rInt(128)}`,
];

/* ── Helpers ───────────────────────────────────── */

function latLngToPixel(
  map: google.maps.Map,
  lat: number,
  lng: number,
  canvasW: number,
  canvasH: number
): { x: number; y: number } | null {
  const projection = map.getProjection();
  const bounds = map.getBounds();
  if (!projection || !bounds) return null;

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const topRight = projection.fromLatLngToPoint(ne)!;
  const bottomLeft = projection.fromLatLngToPoint(sw)!;
  const point = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng))!;

  const worldW = topRight.x - bottomLeft.x;
  const worldH = bottomLeft.y - topRight.y;
  if (worldW === 0 || worldH === 0) return null;

  return {
    x: ((point.x - bottomLeft.x) / worldW) * canvasW,
    y: ((point.y - topRight.y) / worldH) * canvasH,
  };
}

/* ── Component ─────────────────────────────────── */

const MapHudOverlay = ({ mapInstance, center, radiusKm, markers, isSearching }: MapHudOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const prevMarkerCountRef = useRef(0);
  const prevEmailKeysRef = useRef(new Set<string>());
  const fragmentsRef = useRef<DataFragment[]>([]);
  const targetingRef = useRef<TargetingEvent[]>([]);
  const extractRef = useRef<ExtractEvent[]>([]);
  const connectionsRef = useRef<ConnectionLine[]>([]);
  const lastFragmentSpawn = useRef(0);
  const isSearchingRef = useRef(false);
  const wasSearchingRef = useRef(false);
  const markersRef = useRef(markers);
  const centerRef = useRef(center);
  const radiusRef = useRef(radiusKm);
  const mapRefInternal = useRef(mapInstance);

  // Keep refs in sync
  useEffect(() => { isSearchingRef.current = isSearching; }, [isSearching]);
  useEffect(() => { markersRef.current = markers; }, [markers]);
  useEffect(() => { centerRef.current = center; }, [center]);
  useEffect(() => { radiusRef.current = radiusKm; }, [radiusKm]);
  useEffect(() => { mapRefInternal.current = mapInstance; }, [mapInstance]);

  // Detect new markers and email changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapInstance) return;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    // New markers added
    if (markers.length > prevMarkerCountRef.current) {
      const newMarkers = markers.slice(prevMarkerCountRef.current);
      const now = performance.now();
      for (const m of newMarkers) {
        const px = latLngToPixel(mapInstance, m.lat, m.lng, w, h);
        if (px) {
          targetingRef.current.push({
            x: px.x,
            y: px.y,
            name: m.name.substring(0, 20),
            startTime: now + Math.random() * 400,
          });
          // Connection lines from center to new markers
          connectionsRef.current.push({
            from: { x: w / 2, y: h / 2 },
            to: { x: px.x, y: px.y },
            age: 0,
            maxAge: 2 + Math.random(),
          });
        }
      }
    }
    prevMarkerCountRef.current = markers.length;

    // Email status changes
    const newEmailKeys = new Set<string>();
    for (const m of markers) {
      if (m.hasEmail) {
        const key = `${m.lat},${m.lng}`;
        newEmailKeys.add(key);
        if (!prevEmailKeysRef.current.has(key)) {
          const px = latLngToPixel(mapInstance, m.lat, m.lng, w, h);
          if (px) {
            const chars = ["@", ".", "A", "Z", "#", "*", "M", "X", "$", "&"];
            extractRef.current.push({
              x: px.x,
              y: px.y,
              name: m.name.substring(0, 14),
              startTime: performance.now(),
              particles: Array.from({ length: 8 }, (_, i) => ({
                angle: (i / 8) * Math.PI * 2,
                speed: 40 + Math.random() * 60,
                char: chars[rInt(chars.length)],
              })),
            });
          }
        }
      }
    }
    prevEmailKeysRef.current = newEmailKeys;
  }, [markers, mapInstance]);

  // Main canvas setup + animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const lowEnd = (navigator.hardwareConcurrency || 4) < 4;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent ? parent.offsetWidth : 500;
      const h = parent ? parent.offsetHeight : 340;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    /* ── Draw sub-functions ── */

    function drawGrid(w: number, h: number, t: number, searching: boolean) {
      const alpha = searching ? 0.06 : 0.025;
      const spacing = 40;
      ctx!.lineWidth = 0.5;

      for (let x = spacing; x < w; x += spacing) {
        const isMajor = (x / spacing) % 4 === 0;
        ctx!.strokeStyle = `rgba(${C},${isMajor ? alpha * 2 : alpha})`;
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
        ctx!.stroke();
      }
      for (let y = spacing; y < h; y += spacing) {
        const isMajor = (y / spacing) % 4 === 0;
        ctx!.strokeStyle = `rgba(${C},${isMajor ? alpha * 2 : alpha})`;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }

      // Pulsing center crosshair lines when searching
      if (searching) {
        const pulse = 0.04 + 0.03 * Math.sin(t * 3);
        ctx!.strokeStyle = `rgba(${C},${pulse})`;
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.moveTo(w / 2, 0);
        ctx!.lineTo(w / 2, h);
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.moveTo(0, h / 2);
        ctx!.lineTo(w, h / 2);
        ctx!.stroke();
      }
    }

    function drawCornerBrackets(w: number, h: number, t: number, searching: boolean) {
      const len = 30;
      const off = 6;
      const baseAlpha = searching ? 0.5 + 0.15 * Math.sin(t * 3) : 0.15 + 0.05 * Math.sin(t * 1.5);
      ctx!.strokeStyle = `rgba(${C},${baseAlpha})`;
      ctx!.lineWidth = 1.5;

      // Top-left
      ctx!.beginPath();
      ctx!.moveTo(off, off + len); ctx!.lineTo(off, off); ctx!.lineTo(off + len, off);
      ctx!.stroke();
      // Top-right
      ctx!.beginPath();
      ctx!.moveTo(w - off - len, off); ctx!.lineTo(w - off, off); ctx!.lineTo(w - off, off + len);
      ctx!.stroke();
      // Bottom-left
      ctx!.beginPath();
      ctx!.moveTo(off, h - off - len); ctx!.lineTo(off, h - off); ctx!.lineTo(off + len, h - off);
      ctx!.stroke();
      // Bottom-right
      ctx!.beginPath();
      ctx!.moveTo(w - off - len, h - off); ctx!.lineTo(w - off, h - off); ctx!.lineTo(w - off, h - off - len);
      ctx!.stroke();

      // Inner tick marks
      if (searching) {
        ctx!.lineWidth = 1;
        ctx!.strokeStyle = `rgba(${C},${baseAlpha * 0.5})`;
        const tick = 8;
        const inset = 20;
        // Top edge ticks
        for (let x = inset + 40; x < w - inset; x += 40) {
          ctx!.beginPath(); ctx!.moveTo(x, off); ctx!.lineTo(x, off + tick); ctx!.stroke();
        }
        // Left edge ticks
        for (let y = inset + 40; y < h - inset; y += 40) {
          ctx!.beginPath(); ctx!.moveTo(off, y); ctx!.lineTo(off + tick, y); ctx!.stroke();
        }
      }
    }

    function drawScanline(w: number, h: number, t: number, searching: boolean) {
      // Primary scanline
      const yPos = (t * 20) % h;
      const grad = ctx!.createLinearGradient(0, yPos - 6, 0, yPos + 6);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.5, `rgba(${C},${searching ? 0.06 : 0.025})`);
      grad.addColorStop(1, "transparent");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, yPos - 6, w, 12);

      // Secondary scanline going opposite direction when searching
      if (searching) {
        const yPos2 = h - ((t * 30) % h);
        const grad2 = ctx!.createLinearGradient(0, yPos2 - 4, 0, yPos2 + 4);
        grad2.addColorStop(0, "transparent");
        grad2.addColorStop(0.5, `rgba(${C},0.03)`);
        grad2.addColorStop(1, "transparent");
        ctx!.fillStyle = grad2;
        ctx!.fillRect(0, yPos2 - 4, w, 8);
      }
    }

    function drawStatusText(w: number, h: number, t: number, searching: boolean) {
      ctx!.font = `9px ${FONT}`;
      ctx!.textBaseline = "top";

      // Top-right: timestamp + coordinates
      ctx!.textAlign = "right";
      const now = new Date();
      const ts = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} | ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      ctx!.fillStyle = `rgba(${C},0.35)`;
      ctx!.fillText(ts, w - 12, 14);

      const c = centerRef.current;
      if (c) {
        ctx!.fillStyle = `rgba(${C},0.25)`;
        ctx!.fillText(`LAT ${c.lat.toFixed(4)}  LON ${c.lng.toFixed(4)}`, w - 12, 26);
      }

      // Bottom-left: system status
      ctx!.textAlign = "left";
      const mCount = markersRef.current.length;
      if (searching) {
        const pulseAlpha = 0.5 + 0.3 * Math.sin(t * 5);
        ctx!.fillStyle = `rgba(${C},${pulseAlpha})`;
        ctx!.font = `bold 10px ${FONT}`;
        ctx!.fillText("SYS: SCANNING", 12, h - 34);
        ctx!.font = `9px ${FONT}`;
        ctx!.fillStyle = `rgba(${C},0.35)`;
        ctx!.fillText(`TARGETS: ${mCount}`, 12, h - 20);

        // Animated loading bar
        const barW = 80;
        const barH = 2;
        const barY = h - 12;
        ctx!.fillStyle = `rgba(${C},0.1)`;
        ctx!.fillRect(12, barY, barW, barH);
        const fillW = ((t * 0.3) % 1) * barW;
        ctx!.fillStyle = `rgba(${C},0.5)`;
        ctx!.fillRect(12, barY, fillW, barH);
      } else if (mCount > 0) {
        ctx!.fillStyle = `rgba(${C},0.3)`;
        ctx!.fillText("SYS: COMPLETE", 12, h - 34);
        ctx!.fillStyle = `rgba(${C},0.25)`;
        ctx!.fillText(`TARGETS: ${mCount}`, 12, h - 20);
      } else {
        ctx!.fillStyle = `rgba(${C},0.15)`;
        ctx!.fillText("SYS: IDLE", 12, h - 20);
      }

      // Bottom-right: radius + connection info
      ctx!.textAlign = "right";
      ctx!.fillStyle = `rgba(${C},0.2)`;
      ctx!.fillText(`RADIUS: ${radiusRef.current}KM`, w - 12, h - 20);

      if (searching) {
        ctx!.fillStyle = `rgba(${C},0.15)`;
        ctx!.fillText(`CONN: ${mCount} ACTIVE`, w - 12, h - 34);
      }
    }

    function drawRadarSweep(cx: number, cy: number, radius: number, t: number) {
      const sweepAngle = (t * Math.PI * 1.2) % (Math.PI * 2); // ~1.7s per revolution
      const trailCount = lowEnd ? 15 : 40;
      const trailArc = (Math.PI * 2) / 2.5; // 144 degrees — wider trail

      // Radar ring circles
      for (let r = 1; r <= 3; r++) {
        const ringR = (r / 3) * radius;
        ctx!.strokeStyle = `rgba(${C},0.04)`;
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Gradient trail (cone)
      for (let i = 0; i < trailCount; i++) {
        const frac = i / trailCount;
        const angle = sweepAngle - frac * trailArc;
        const alpha = 0.12 * (1 - frac) * (1 - frac);
        ctx!.strokeStyle = `rgba(${C},${alpha})`;
        ctx!.lineWidth = 1 - frac * 0.5;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx!.stroke();
      }

      // Main sweep line — bright
      ctx!.strokeStyle = `rgba(${C},0.6)`;
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
      ctx!.stroke();

      // Glow at tip
      const tipX = cx + Math.cos(sweepAngle) * radius;
      const tipY = cy + Math.sin(sweepAngle) * radius;
      const tipGrad = ctx!.createRadialGradient(tipX, tipY, 0, tipX, tipY, 8);
      tipGrad.addColorStop(0, `rgba(${C},0.3)`);
      tipGrad.addColorStop(1, "transparent");
      ctx!.fillStyle = tipGrad;
      ctx!.fillRect(tipX - 8, tipY - 8, 16, 16);

      // Center dot with glow
      const centerGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 6);
      centerGrad.addColorStop(0, `rgba(${C},0.5)`);
      centerGrad.addColorStop(1, "transparent");
      ctx!.fillStyle = centerGrad;
      ctx!.fillRect(cx - 6, cy - 6, 12, 12);
      ctx!.fillStyle = `rgba(${C},0.8)`;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawScanRing(cx: number, cy: number, maxRadius: number, t: number) {
      const period = 2;
      for (let offset = 0; offset < 3; offset++) {
        const progress = ((t + offset * period / 3) % period) / period;
        const r = progress * maxRadius;
        const alpha = 0.2 * (1 - progress) * (1 - progress);
        const lineW = 2 * (1 - progress);

        ctx!.strokeStyle = `rgba(${C},${alpha})`;
        ctx!.lineWidth = lineW;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }

    function drawDataFragments(w: number, h: number, t: number, dt: number) {
      if (lowEnd) return;
      const frags = fragmentsRef.current;

      // Spawn more frequently
      if (t - lastFragmentSpawn.current > 0.1 && frags.length < 25) {
        lastFragmentSpawn.current = t;
        const side = rInt(4); // spawn from edges
        let x: number, y: number, vx: number, vy: number;
        if (side === 0) { x = rFloat(20, w - 20); y = h + 10; vx = rFloat(-5, 5); vy = -(12 + Math.random() * 15); }
        else if (side === 1) { x = rFloat(20, w - 20); y = -10; vx = rFloat(-5, 5); vy = 12 + Math.random() * 15; }
        else if (side === 2) { x = -10; y = rFloat(20, h - 20); vx = 12 + Math.random() * 15; vy = rFloat(-5, 5); }
        else { x = w + 10; y = rFloat(20, h - 20); vx = -(12 + Math.random() * 15); vy = rFloat(-5, 5); }

        frags.push({
          x, y, vx, vy,
          text: DATA_TEMPLATES[rInt(DATA_TEMPLATES.length)](),
          age: 0,
          maxAge: 1.5 + Math.random() * 2,
          size: Math.random() > 0.7 ? 10 : 8,
        });
      }

      // Update + draw
      ctx!.textBaseline = "top";

      for (let i = frags.length - 1; i >= 0; i--) {
        const f = frags[i];
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.age += dt;
        if (f.age >= f.maxAge || f.x < -50 || f.x > w + 50 || f.y < -50 || f.y > h + 50) {
          frags.splice(i, 1);
          continue;
        }
        const lifeProgress = f.age / f.maxAge;
        const alpha = 0.35 * Math.sin(lifeProgress * Math.PI); // fade in and out
        ctx!.font = `${f.size}px ${FONT}`;
        ctx!.textAlign = "left";
        ctx!.fillStyle = `rgba(${C},${alpha})`;
        ctx!.fillText(f.text, f.x, f.y);
      }
    }

    function drawConnectionLines(dt: number) {
      const lines = connectionsRef.current;
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        line.age += dt;
        if (line.age >= line.maxAge) { lines.splice(i, 1); continue; }

        const progress = line.age / line.maxAge;
        const drawProgress = Math.min(progress * 3, 1); // draw line fast
        const alpha = 0.15 * (1 - progress);

        const dx = line.to.x - line.from.x;
        const dy = line.to.y - line.from.y;
        const endX = line.from.x + dx * drawProgress;
        const endY = line.from.y + dy * drawProgress;

        // Dashed line
        ctx!.setLineDash([4, 4]);
        ctx!.strokeStyle = `rgba(${C},${alpha})`;
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.moveTo(line.from.x, line.from.y);
        ctx!.lineTo(endX, endY);
        ctx!.stroke();
        ctx!.setLineDash([]);

        // Moving dot along line
        if (drawProgress < 1) {
          const dotProgress = (progress * 5) % 1;
          const dotX = line.from.x + dx * dotProgress;
          const dotY = line.from.y + dy * dotProgress;
          ctx!.fillStyle = `rgba(${C},${alpha * 3})`;
          ctx!.beginPath();
          ctx!.arc(dotX, dotY, 1.5, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    function drawTargeting(now: number) {
      const events = targetingRef.current;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "top";

      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        const elapsed = now - ev.startTime;
        const duration = 1800;
        if (elapsed < 0) continue;
        const progress = elapsed / duration;
        if (progress > 1) { events.splice(i, 1); continue; }

        const { x, y } = ev;

        if (progress < 0.35) {
          // Phase 1: Converging brackets + spinning ring
          const p = progress / 0.35;
          const scale = 4 - 3 * easeOutCubic(p);
          const size = 14 * scale;
          const alpha = 0.2 + 0.5 * easeOutCubic(p);
          ctx!.strokeStyle = `rgba(${C},${alpha})`;
          ctx!.lineWidth = 1.5;

          const halfLen = 7 * scale;
          ctx!.beginPath(); ctx!.moveTo(x - size, y - size + halfLen); ctx!.lineTo(x - size, y - size); ctx!.lineTo(x - size + halfLen, y - size); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x + size - halfLen, y - size); ctx!.lineTo(x + size, y - size); ctx!.lineTo(x + size, y - size + halfLen); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x - size, y + size - halfLen); ctx!.lineTo(x - size, y + size); ctx!.lineTo(x - size + halfLen, y + size); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x + size - halfLen, y + size); ctx!.lineTo(x + size, y + size); ctx!.lineTo(x + size, y + size - halfLen); ctx!.stroke();

          // Spinning ring with gap
          const rot = elapsed * 0.008;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(x, y, size * 0.7, rot, rot + Math.PI * 1.5);
          ctx!.stroke();
          ctx!.beginPath();
          ctx!.arc(x, y, size * 0.4, rot + Math.PI, rot + Math.PI * 2.2);
          ctx!.stroke();

        } else if (progress < 0.65) {
          // Phase 2: Locked — tight brackets, crosshair, name
          const p = (progress - 0.35) / 0.3;
          const flashAlpha = p < 0.15 ? 0.9 : 0.5 * (1 - (p - 0.15) / 0.85);
          const size = 14;
          ctx!.strokeStyle = `rgba(${C},${flashAlpha})`;
          ctx!.lineWidth = 1.5;

          const halfLen = 7;
          ctx!.beginPath(); ctx!.moveTo(x - size, y - size + halfLen); ctx!.lineTo(x - size, y - size); ctx!.lineTo(x - size + halfLen, y - size); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x + size - halfLen, y - size); ctx!.lineTo(x + size, y - size); ctx!.lineTo(x + size, y - size + halfLen); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x - size, y + size - halfLen); ctx!.lineTo(x - size, y + size); ctx!.lineTo(x - size + halfLen, y + size); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x + size - halfLen, y + size); ctx!.lineTo(x + size, y + size); ctx!.lineTo(x + size, y + size - halfLen); ctx!.stroke();

          // Crosshair
          ctx!.lineWidth = 1;
          ctx!.beginPath(); ctx!.moveTo(x - 6, y); ctx!.lineTo(x + 6, y); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x, y - 6); ctx!.lineTo(x, y + 6); ctx!.stroke();

          // "LOCKED" + name
          ctx!.font = `bold 8px ${FONT}`;
          ctx!.fillStyle = `rgba(${C},${flashAlpha})`;
          ctx!.fillText("LOCKED", x, y + size + 4);
          ctx!.font = `7px ${FONT}`;
          ctx!.fillStyle = `rgba(${C},${flashAlpha * 0.6})`;
          ctx!.fillText(ev.name, x, y + size + 15);

          // Brief flash ring
          if (p < 0.2) {
            const flashR = size * (1 + p * 3);
            ctx!.strokeStyle = `rgba(${C},${0.4 * (1 - p / 0.2)})`;
            ctx!.lineWidth = 2;
            ctx!.beginPath();
            ctx!.arc(x, y, flashR, 0, Math.PI * 2);
            ctx!.stroke();
          }

        } else {
          // Phase 3: Fade out with shrinking ring
          const p = (progress - 0.65) / 0.35;
          const alpha = 0.4 * (1 - easeOutCubic(p));
          ctx!.strokeStyle = `rgba(${C},${alpha})`;
          ctx!.lineWidth = 1;
          const size = 14 * (1 - p * 0.3);
          ctx!.beginPath(); ctx!.arc(x, y, size, 0, Math.PI * 2); ctx!.stroke();

          // Small dot remains
          ctx!.fillStyle = `rgba(${C},${alpha * 0.5})`;
          ctx!.beginPath(); ctx!.arc(x, y, 2, 0, Math.PI * 2); ctx!.fill();
        }
      }
    }

    function drawExtraction(now: number) {
      const events = extractRef.current;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "top";

      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        const elapsed = now - ev.startTime;
        const duration = 2500;
        const progress = elapsed / duration;
        if (progress > 1) { events.splice(i, 1); continue; }

        const { x, y, particles } = ev;

        if (progress < 0.25) {
          // Phase 1: EXTRACTING... with orbiting chars + hex stream
          const p = progress / 0.25;
          const pulseAlpha = 0.4 + 0.3 * Math.sin(p * Math.PI * 8);
          ctx!.font = `bold 9px ${FONT}`;
          ctx!.fillStyle = `rgba(${C},${pulseAlpha})`;
          ctx!.fillText("EXTRACTING...", x, y - 22);

          // Orbiting particles — two rings
          ctx!.font = `9px ${FONT}`;
          for (const part of particles) {
            const orbitR = 18 + 5 * Math.sin(p * Math.PI * 3);
            const angle = part.angle + elapsed * 0.006;
            const px = x + Math.cos(angle) * orbitR;
            const py = y + Math.sin(angle) * orbitR;
            ctx!.fillStyle = `rgba(${C},${0.5 * (1 - p * 0.3)})`;
            ctx!.fillText(part.char, px, py);
          }

          // Inner spinning hexagon
          ctx!.strokeStyle = `rgba(${C},${0.3 * (1 - p)})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          for (let j = 0; j <= 6; j++) {
            const angle = (j / 6) * Math.PI * 2 + elapsed * 0.003;
            const r = 10;
            const method = j === 0 ? "moveTo" : "lineTo";
            ctx![method](x + Math.cos(angle) * r, y + Math.sin(angle) * r);
          }
          ctx!.stroke();

        } else if (progress < 0.65) {
          // Phase 2: Particles explode outward with trails
          const p = (progress - 0.25) / 0.4;
          ctx!.font = `9px ${FONT}`;
          for (const part of particles) {
            const dist = part.speed * easeOutCubic(p);
            const px = x + Math.cos(part.angle) * dist;
            const py = y + Math.sin(part.angle) * dist - p * 25;
            const alpha = 0.5 * (1 - p);

            // Trail: 4 copies with decreasing alpha
            for (let t = 0; t < 4; t++) {
              const trailFrac = t * 0.12;
              const tpx = x + Math.cos(part.angle) * (dist * (1 - trailFrac));
              const tpy = y + Math.sin(part.angle) * (dist * (1 - trailFrac)) - (p - trailFrac * p) * 25;
              ctx!.fillStyle = `rgba(${C},${alpha * (1 - t * 0.25)})`;
              ctx!.fillText(part.char, tpx, tpy);
            }
          }

          // Center glow
          const glowAlpha = 0.3 * (1 - p);
          const glow = ctx!.createRadialGradient(x, y, 0, x, y, 20);
          glow.addColorStop(0, `rgba(${C},${glowAlpha})`);
          glow.addColorStop(1, "transparent");
          ctx!.fillStyle = glow;
          ctx!.fillRect(x - 20, y - 20, 40, 40);

        } else {
          // Phase 3: DATA ACQUIRED + bright flash + ring burst
          const p = (progress - 0.65) / 0.35;
          const flashAlpha = p < 0.1 ? 0.9 : 0.5 * (1 - (p - 0.1) / 0.9);
          ctx!.font = `bold 9px ${FONT}`;
          ctx!.fillStyle = `rgba(${C},${flashAlpha})`;
          ctx!.fillText("DATA ACQUIRED", x, y - 22);

          // Expanding ring burst
          if (p < 0.4) {
            const ringProgress = p / 0.4;
            ctx!.strokeStyle = `rgba(${C},${0.6 * (1 - ringProgress)})`;
            ctx!.lineWidth = 2 * (1 - ringProgress);
            ctx!.beginPath();
            ctx!.arc(x, y, 10 + ringProgress * 30, 0, Math.PI * 2);
            ctx!.stroke();

            // Second inner ring
            ctx!.strokeStyle = `rgba(${C},${0.3 * (1 - ringProgress)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.arc(x, y, 5 + ringProgress * 20, 0, Math.PI * 2);
            ctx!.stroke();
          }

          // Glow flash
          if (p < 0.2) {
            const glowSize = 15 + p * 40;
            const glow = ctx!.createRadialGradient(x, y, 0, x, y, glowSize);
            glow.addColorStop(0, `rgba(${C},${0.4 * (1 - p / 0.2)})`);
            glow.addColorStop(1, "transparent");
            ctx!.fillStyle = glow;
            ctx!.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);
          }
        }
      }
    }

    // Edge glow effect when searching
    function drawEdgeGlow(w: number, h: number, t: number) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      const alpha = 0.03 + 0.02 * pulse;

      // Top edge
      const topGrad = ctx!.createLinearGradient(0, 0, 0, 30);
      topGrad.addColorStop(0, `rgba(${C},${alpha})`);
      topGrad.addColorStop(1, "transparent");
      ctx!.fillStyle = topGrad;
      ctx!.fillRect(0, 0, w, 30);

      // Bottom edge
      const botGrad = ctx!.createLinearGradient(0, h, 0, h - 30);
      botGrad.addColorStop(0, `rgba(${C},${alpha})`);
      botGrad.addColorStop(1, "transparent");
      ctx!.fillStyle = botGrad;
      ctx!.fillRect(0, h - 30, w, 30);
    }

    /* ── Main draw loop ── */

    let prevTs = 0;

    const draw = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = (ts - startRef.current) / 1000;
      const dt = prevTs ? (ts - prevTs) / 1000 : 0.016;
      prevTs = ts;

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const searching = isSearchingRef.current;

      // Track search state transitions
      if (searching && !wasSearchingRef.current) {
        fragmentsRef.current = [];
        connectionsRef.current = [];
      }
      wasSearchingRef.current = searching;

      // 1. Grid
      drawGrid(w, h, t, searching);

      // 2. Corner brackets
      drawCornerBrackets(w, h, t, searching);

      // 3. Scanline
      drawScanline(w, h, t, searching);

      // 4. Status text
      drawStatusText(w, h, t, searching);

      // Searching-only effects
      if (searching) {
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.min(w, h) * 0.42;

        // 5. Radar sweep
        drawRadarSweep(cx, cy, maxR, t);

        // 6. Scan rings
        drawScanRing(cx, cy, maxR, t);

        // 7. Data fragments
        drawDataFragments(w, h, t, dt);

        // 8. Edge glow
        drawEdgeGlow(w, h, t);
      }

      // 9. Connection lines (triggered)
      drawConnectionLines(dt);

      // 10. Targeting reticles (triggered)
      drawTargeting(ts);

      // 11. Extraction effects (triggered)
      drawExtraction(ts);

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
      style={{ zIndex: 1 }}
    />
  );
};

export default MapHudOverlay;
