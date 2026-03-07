import { useEffect, useRef } from "react";

/*
  Dot-matrix spinning globe.
  Dense square-pixel grid (like Nothing Phone / Dot Hub style).
  Renders a wireframe sphere with latitude/longitude lines
  plus simplified continental landmass outlines.
*/

const DOT_SIZE = 2;      // px — square pixel size
const GAP = 6;           // px — center-to-center distance
const ROTATION_SPEED = 0.15; // radians per second — slow elegant spin
const GLOBE_ALPHA = 0.75;    // brightness of globe dots
const BG_ALPHA = 0.04;       // very faint background grid dots

// Simplified continent outlines as (lat, lon) polygons in degrees.
// These are rough shapes — just enough to be recognizable.
const CONTINENTS: [number, number][][] = [
  // North America
  [[-10,72],[10,70],[30,65],[45,60],[55,55],[65,48],[72,40],[65,30],[55,25],[50,30],[45,28],[35,20],[25,15],[15,12],[5,15],[-5,20],[-15,25],[-25,30],[-20,45],[-10,60],[-10,72]],
  // South America
  [[-35,10],[-25,-5],[-15,-10],[-10,-20],[0,-35],[5,-40],[10,-50],[5,-55],[0,-52],[-5,-50],[-15,-40],[-25,-25],[-35,0],[-35,10]],
  // Europe
  [[0,50],[10,55],[20,60],[35,65],[40,70],[35,72],[25,70],[15,65],[5,60],[0,55],[0,50]],
  // Africa
  [[10,35],[20,30],[30,20],[35,10],[40,0],[35,-10],[30,-20],[25,-30],[15,-35],[5,-30],[0,-20],[-5,-10],[-10,0],[-5,10],[0,20],[5,30],[10,35]],
  // Asia (simplified)
  [[40,70],[50,65],[60,60],[75,55],[85,50],[90,45],[100,40],[110,35],[120,30],[130,25],[135,20],[130,15],[120,10],[110,15],[100,20],[90,25],[80,35],[70,45],[60,55],[50,65],[40,70]],
  // Australia
  [[110,-15],[120,-18],[130,-22],[135,-28],[130,-35],[120,-38],[115,-35],[110,-28],[112,-20],[110,-15]],
];

// Convert degrees to radians
const toRad = (d: number) => (d * Math.PI) / 180;

// Project a 3D point on sphere surface to 2D, with Y-axis rotation
function projectPoint(
  lonDeg: number,
  latDeg: number,
  rotation: number,
  cx: number,
  cy: number,
  radius: number
): { x: number; y: number; visible: boolean } {
  const lon = toRad(lonDeg) + rotation;
  const lat = toRad(latDeg);
  const cosLat = Math.cos(lat);

  const x3d = cosLat * Math.sin(lon);
  const y3d = Math.sin(lat);
  const z3d = cosLat * Math.cos(lon);

  // Only draw front-facing points
  return {
    x: cx + x3d * radius,
    y: cy - y3d * radius,
    visible: z3d > 0,
  };
}

// Rasterize a point onto the dot grid (returns grid col/row)
function toGrid(px: number, py: number): string {
  const col = Math.round(px / GAP);
  const row = Math.round(py / GAP);
  return `${col},${row}`;
}

const DotGlobe = () => {
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
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = (ts - startRef.current) / 1000;
      const rotation = t * ROTATION_SPEED;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / GAP);
      const rows = Math.ceil(height / GAP);

      // Globe center and radius
      const cx = width * 0.5;
      const cy = height * 0.5;
      const radius = Math.min(width, height) * 0.38;

      // Collect all lit globe pixels into a Set
      const litPixels = new Set<string>();

      // --- Latitude lines (every 20 degrees) ---
      for (let lat = -80; lat <= 80; lat += 20) {
        for (let lon = 0; lon < 360; lon += 3) {
          const p = projectPoint(lon, lat, rotation, cx, cy, radius);
          if (p.visible) litPixels.add(toGrid(p.x, p.y));
        }
      }

      // --- Longitude lines (every 30 degrees) ---
      for (let lon = 0; lon < 360; lon += 30) {
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = projectPoint(lon, lat, rotation, cx, cy, radius);
          if (p.visible) litPixels.add(toGrid(p.x, p.y));
        }
      }

      // --- Continent outlines ---
      for (const continent of CONTINENTS) {
        for (let i = 0; i < continent.length - 1; i++) {
          const [lon1, lat1] = continent[i];
          const [lon2, lat2] = continent[i + 1];
          // Interpolate between consecutive points
          const steps = 18;
          for (let s = 0; s <= steps; s++) {
            const frac = s / steps;
            const lon = lon1 + (lon2 - lon1) * frac;
            const lat = lat1 + (lat2 - lat1) * frac;
            const p = projectPoint(lon, lat, rotation, cx, cy, radius);
            if (p.visible) litPixels.add(toGrid(p.x, p.y));
          }
        }
      }

      // --- Equator (brighter, thicker) ---
      for (let lon = 0; lon < 360; lon += 2) {
        const p = projectPoint(lon, 0, rotation, cx, cy, radius);
        if (p.visible) litPixels.add(toGrid(p.x, p.y));
      }

      // --- Outer circle (globe silhouette) ---
      for (let angle = 0; angle < Math.PI * 2; angle += 0.02) {
        const ex = cx + Math.cos(angle) * radius;
        const ey = cy + Math.sin(angle) * radius;
        litPixels.add(toGrid(ex, ey));
      }

      // --- Render all dots ---
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * GAP;
          const y = row * GAP;
          const key = `${col},${row}`;

          if (litPixels.has(key)) {
            // Globe dot — bright square pixel
            ctx.fillStyle = `rgba(255,255,255,${GLOBE_ALPHA})`;
            ctx.fillRect(x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE);
          } else {
            // Background grid dot — barely visible
            ctx.fillStyle = `rgba(255,255,255,${BG_ALPHA})`;
            ctx.fillRect(x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE);
          }
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

export default DotGlobe;
