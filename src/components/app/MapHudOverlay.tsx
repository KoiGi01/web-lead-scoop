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
  vy: number;
  text: string;
  age: number;
  maxAge: number;
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

/* ── Helpers ────────────────────────────────────── */

const FONT = "'Space Mono', monospace";
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const HEX = "0123456789ABCDEF";
const rHex = (n: number) => Array.from({ length: n }, () => HEX[(Math.random() * 16) | 0]).join("");
const rInt = (max: number) => (Math.random() * max) | 0;

const DATA_TEMPLATES = [
  () => `0x${rHex(4)}`,
  () => `0x${rHex(8)}`,
  () => `${rInt(255)}.${rInt(255)}.${rInt(255)}.${rInt(255)}`,
  () => `${(Math.random() * 180 - 90).toFixed(4)},${(Math.random() * 360 - 180).toFixed(4)}`,
  () => ["PING OK", "PORT 443", "SSL VALID", "DNS RESOLVE", "TCP ACK", "AUTH OK", "TLS 1.3", "HTTP 200", "WHOIS OK", "MX RECORD"][rInt(10)],
];

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
  const lastFragmentSpawn = useRef(0);
  const isSearchingRef = useRef(false);
  const wasSearchingRef = useRef(false);
  const markersRef = useRef(markers);
  const centerRef = useRef(center);
  const radiusRef = useRef(radiusKm);
  const mapRef = useRef(mapInstance);

  // Keep refs in sync
  useEffect(() => { isSearchingRef.current = isSearching; }, [isSearching]);
  useEffect(() => { markersRef.current = markers; }, [markers]);
  useEffect(() => { centerRef.current = center; }, [center]);
  useEffect(() => { radiusRef.current = radiusKm; }, [radiusKm]);
  useEffect(() => { mapRef.current = mapInstance; }, [mapInstance]);

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
            name: m.name.substring(0, 16),
            startTime: now + Math.random() * 300, // stagger slightly
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
            const chars = ["@", ".", "A", "Z", "#", "*", "M", "X"];
            extractRef.current.push({
              x: px.x,
              y: px.y,
              name: m.name.substring(0, 12),
              startTime: performance.now(),
              particles: Array.from({ length: 6 }, (_, i) => ({
                angle: (i / 6) * Math.PI * 2,
                speed: 30 + Math.random() * 40,
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

    function drawGrid(w: number, h: number, searching: boolean) {
      const alpha = searching ? 0.07 : 0.04;
      const spacing = 40;
      ctx!.lineWidth = 0.5;

      for (let x = spacing; x < w; x += spacing) {
        const isMajor = (x / spacing) % 4 === 0;
        ctx!.strokeStyle = `rgba(255,255,255,${isMajor ? alpha * 1.8 : alpha})`;
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
        ctx!.stroke();
      }
      for (let y = spacing; y < h; y += spacing) {
        const isMajor = (y / spacing) % 4 === 0;
        ctx!.strokeStyle = `rgba(255,255,255,${isMajor ? alpha * 1.8 : alpha})`;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }
    }

    function drawCornerBrackets(w: number, h: number, t: number, searching: boolean) {
      const len = 24;
      const off = 8;
      const baseAlpha = searching ? 0.45 : 0.2 + 0.06 * Math.sin(t * 1.5);
      ctx!.strokeStyle = `rgba(255,255,255,${baseAlpha})`;
      ctx!.lineWidth = 1;

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

      if (searching) {
        // Small crosshair dots at corners
        ctx!.fillStyle = `rgba(255,255,255,${baseAlpha * 0.6})`;
        const sz = 2;
        ctx!.fillRect(off - sz / 2, off - sz / 2, sz, sz);
        ctx!.fillRect(w - off - sz / 2, off - sz / 2, sz, sz);
        ctx!.fillRect(off - sz / 2, h - off - sz / 2, sz, sz);
        ctx!.fillRect(w - off - sz / 2, h - off - sz / 2, sz, sz);
      }
    }

    function drawScanline(w: number, h: number, t: number) {
      const yPos = (t * 15) % h;
      const grad = ctx!.createLinearGradient(0, yPos - 3, 0, yPos + 3);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.5, "rgba(255,255,255,0.035)");
      grad.addColorStop(1, "transparent");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, yPos - 3, w, 6);
    }

    function drawStatusText(w: number, h: number, t: number, searching: boolean) {
      ctx!.font = `9px ${FONT}`;
      ctx!.textBaseline = "top";

      // Top-right: timestamp + coordinates
      ctx!.textAlign = "right";
      const now = new Date();
      const ts = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} | ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      ctx!.fillStyle = `rgba(255,255,255,0.25)`;
      ctx!.fillText(ts, w - 12, 14);

      const c = centerRef.current;
      if (c) {
        ctx!.fillText(`LAT ${c.lat.toFixed(4)}  LON ${c.lng.toFixed(4)}`, w - 12, 26);
      }

      // Bottom-left: system status
      ctx!.textAlign = "left";
      const mCount = markersRef.current.length;
      if (searching) {
        const pulseAlpha = 0.3 + 0.15 * Math.sin(t * 4);
        ctx!.fillStyle = `rgba(255,255,255,${pulseAlpha})`;
        ctx!.fillText("SYS: SCANNING", 12, h - 30);
        ctx!.fillStyle = `rgba(255,255,255,0.25)`;
        ctx!.fillText(`TARGETS: ${mCount}`, 12, h - 18);
      } else if (mCount > 0) {
        ctx!.fillStyle = `rgba(255,255,255,0.2)`;
        ctx!.fillText("SYS: COMPLETE", 12, h - 30);
        ctx!.fillText(`TARGETS: ${mCount}`, 12, h - 18);
      } else {
        ctx!.fillStyle = `rgba(255,255,255,0.15)`;
        ctx!.fillText("SYS: IDLE", 12, h - 18);
      }

      // Bottom-right: radius
      ctx!.textAlign = "right";
      ctx!.fillStyle = `rgba(255,255,255,0.15)`;
      ctx!.fillText(`RADIUS: ${radiusRef.current}KM`, w - 12, h - 18);
    }

    function drawRadarSweep(cx: number, cy: number, radius: number, t: number) {
      const sweepAngle = (t * Math.PI) % (Math.PI * 2); // ~2s per revolution
      const trailCount = lowEnd ? 10 : 30;
      const trailArc = (Math.PI * 2) / 3; // 120 degrees

      // Trail
      for (let i = 0; i < trailCount; i++) {
        const frac = i / trailCount;
        const angle = sweepAngle - frac * trailArc;
        const alpha = 0.12 * (1 - frac);
        ctx!.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx!.lineWidth = 0.5;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx!.stroke();
      }

      // Main sweep line
      ctx!.strokeStyle = `rgba(255,255,255,0.35)`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
      ctx!.stroke();

      // Center dot
      ctx!.fillStyle = `rgba(255,255,255,0.25)`;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawScanRing(cx: number, cy: number, maxRadius: number, t: number) {
      const period = 2.5;
      for (let offset = 0; offset < 2; offset++) {
        const progress = ((t + offset * period * 0.5) % period) / period;
        const r = progress * maxRadius;
        const alpha = 0.25 * (1 - progress);
        const lineW = 1.5 * (1 - progress * 0.7);

        ctx!.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx!.lineWidth = lineW;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }

    function drawDataFragments(w: number, h: number, t: number, dt: number) {
      if (lowEnd) return;
      const frags = fragmentsRef.current;

      // Spawn
      if (t - lastFragmentSpawn.current > 0.2 && frags.length < 15) {
        lastFragmentSpawn.current = t;
        frags.push({
          x: 20 + Math.random() * (w - 40),
          y: h * 0.3 + Math.random() * (h * 0.6),
          vy: 8 + Math.random() * 12,
          text: DATA_TEMPLATES[rInt(DATA_TEMPLATES.length)](),
          age: 0,
          maxAge: 2 + Math.random() * 2,
        });
      }

      // Update + draw
      ctx!.font = `9px ${FONT}`;
      ctx!.textAlign = "left";
      ctx!.textBaseline = "top";

      for (let i = frags.length - 1; i >= 0; i--) {
        const f = frags[i];
        f.y -= f.vy * dt;
        f.age += dt;
        if (f.age >= f.maxAge) {
          frags.splice(i, 1);
          continue;
        }
        const alpha = 0.25 * (1 - f.age / f.maxAge);
        ctx!.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx!.fillText(f.text, f.x, f.y);
      }
    }

    function drawTargeting(now: number) {
      const events = targetingRef.current;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "top";

      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        const elapsed = now - ev.startTime;
        const duration = 1500;
        if (elapsed < 0) continue; // staggered, not started yet
        const progress = elapsed / duration;
        if (progress > 1) { events.splice(i, 1); continue; }

        const { x, y } = ev;

        if (progress < 0.4) {
          // Phase 1: Converging brackets
          const p = progress / 0.4;
          const scale = 3 - 2 * easeOutCubic(p);
          const size = 12 * scale;
          const alpha = 0.15 + 0.35 * easeOutCubic(p);
          ctx!.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx!.lineWidth = 1;

          // 4 corner brackets
          const halfLen = 6 * scale;
          // TL
          ctx!.beginPath(); ctx!.moveTo(x - size, y - size + halfLen); ctx!.lineTo(x - size, y - size); ctx!.lineTo(x - size + halfLen, y - size); ctx!.stroke();
          // TR
          ctx!.beginPath(); ctx!.moveTo(x + size - halfLen, y - size); ctx!.lineTo(x + size, y - size); ctx!.lineTo(x + size, y - size + halfLen); ctx!.stroke();
          // BL
          ctx!.beginPath(); ctx!.moveTo(x - size, y + size - halfLen); ctx!.lineTo(x - size, y + size); ctx!.lineTo(x - size + halfLen, y + size); ctx!.stroke();
          // BR
          ctx!.beginPath(); ctx!.moveTo(x + size - halfLen, y + size); ctx!.lineTo(x + size, y + size); ctx!.lineTo(x + size, y + size - halfLen); ctx!.stroke();

          // Rotating circle
          const rot = elapsed * 0.005;
          ctx!.beginPath();
          ctx!.arc(x, y, size * 0.8, rot, rot + Math.PI * 1.2);
          ctx!.stroke();

        } else if (progress < 0.7) {
          // Phase 2: Locked
          const p = (progress - 0.4) / 0.3;
          const flashAlpha = p < 0.2 ? 0.7 : 0.4 * (1 - (p - 0.2) / 0.8);
          const size = 12;
          ctx!.strokeStyle = `rgba(255,255,255,${flashAlpha})`;
          ctx!.lineWidth = 1;

          const halfLen = 6;
          ctx!.beginPath(); ctx!.moveTo(x - size, y - size + halfLen); ctx!.lineTo(x - size, y - size); ctx!.lineTo(x - size + halfLen, y - size); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x + size - halfLen, y - size); ctx!.lineTo(x + size, y - size); ctx!.lineTo(x + size, y - size + halfLen); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x - size, y + size - halfLen); ctx!.lineTo(x - size, y + size); ctx!.lineTo(x - size + halfLen, y + size); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x + size - halfLen, y + size); ctx!.lineTo(x + size, y + size); ctx!.lineTo(x + size, y + size - halfLen); ctx!.stroke();

          // Crosshair lines
          ctx!.beginPath(); ctx!.moveTo(x - 4, y); ctx!.lineTo(x + 4, y); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(x, y - 4); ctx!.lineTo(x, y + 4); ctx!.stroke();

          // "LOCKED" text
          ctx!.font = `bold 8px ${FONT}`;
          ctx!.fillStyle = `rgba(255,255,255,${flashAlpha * 0.8})`;
          ctx!.fillText("LOCKED", x, y + size + 4);

        } else {
          // Phase 3: Fade out
          const p = (progress - 0.7) / 0.3;
          const alpha = 0.35 * (1 - easeOutCubic(p));
          ctx!.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx!.lineWidth = 1;
          const size = 12;
          ctx!.beginPath(); ctx!.arc(x, y, size * 0.8, 0, Math.PI * 2); ctx!.stroke();
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
        const duration = 2000;
        const progress = elapsed / duration;
        if (progress > 1) { events.splice(i, 1); continue; }

        const { x, y, particles } = ev;

        if (progress < 0.3) {
          // Phase 1: EXTRACTING... with orbiting chars
          const p = progress / 0.3;
          const pulseAlpha = 0.3 + 0.2 * Math.sin(p * Math.PI * 6);
          ctx!.font = `bold 8px ${FONT}`;
          ctx!.fillStyle = `rgba(255,255,255,${pulseAlpha})`;
          ctx!.fillText("EXTRACTING...", x, y - 18);

          ctx!.font = `9px ${FONT}`;
          for (const part of particles) {
            const orbitR = 16 + 4 * Math.sin(p * Math.PI * 2);
            const angle = part.angle + elapsed * 0.004;
            const px = x + Math.cos(angle) * orbitR;
            const py = y + Math.sin(angle) * orbitR;
            ctx!.fillStyle = `rgba(255,255,255,${0.4 * (1 - p * 0.5)})`;
            ctx!.fillText(part.char, px, py);
          }

        } else if (progress < 0.7) {
          // Phase 2: Particles fly outward
          const p = (progress - 0.3) / 0.4;
          ctx!.font = `9px ${FONT}`;
          for (const part of particles) {
            const dist = part.speed * easeOutCubic(p);
            const px = x + Math.cos(part.angle) * dist;
            const py = y + Math.sin(part.angle) * dist - p * 20;
            const alpha = 0.35 * (1 - p);

            // Trail: 3 copies
            for (let t = 0; t < 3; t++) {
              const trailFrac = t * 0.15;
              const tpx = x + Math.cos(part.angle) * (dist - dist * trailFrac);
              const tpy = y + Math.sin(part.angle) * (dist - dist * trailFrac) - (p - trailFrac * p) * 20;
              ctx!.fillStyle = `rgba(255,255,255,${alpha * (1 - t * 0.3)})`;
              ctx!.fillText(part.char, tpx, tpy);
            }
          }

        } else {
          // Phase 3: DATA ACQUIRED + flash
          const p = (progress - 0.7) / 0.3;
          const flashAlpha = p < 0.15 ? 0.7 : 0.4 * (1 - (p - 0.15) / 0.85);
          ctx!.font = `bold 8px ${FONT}`;
          ctx!.fillStyle = `rgba(255,255,255,${flashAlpha})`;
          ctx!.fillText("DATA ACQUIRED", x, y - 18);

          // Brief flash ring
          if (p < 0.3) {
            ctx!.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p / 0.3)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.arc(x, y, 8 + p * 20, 0, Math.PI * 2);
            ctx!.stroke();
          }
        }
      }
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
        // Search just started — clear old fragments
        fragmentsRef.current = [];
      }
      wasSearchingRef.current = searching;

      // 1. Grid
      drawGrid(w, h, searching);

      // 2. Corner brackets
      drawCornerBrackets(w, h, t, searching);

      // 3. Scanline
      drawScanline(w, h, t);

      // 4. Status text
      drawStatusText(w, h, t, searching);

      // Searching-only effects
      if (searching) {
        const cx = w / 2;
        const cy = h / 2;
        const maxR = Math.min(w, h) * 0.4;

        // 5. Radar sweep
        drawRadarSweep(cx, cy, maxR, t);

        // 6. Scan ring
        drawScanRing(cx, cy, maxR, t);

        // 7. Data fragments
        drawDataFragments(w, h, t, dt);
      }

      // 8. Targeting reticles (triggered, can fire anytime)
      drawTargeting(ts);

      // 9. Extraction effects (triggered)
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
