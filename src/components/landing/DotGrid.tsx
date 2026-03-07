import { useEffect, useRef } from "react";

/*
  Dot-matrix spinning globe with geographically accurate continents.
  Dense square-pixel grid (Dot Hub / Nothing Phone style).
  Continents are filled landmasses, not just outlines.
*/

const DOT_SIZE = 2;
const GAP = 5;
const ROTATION_SPEED = 0.12;
const LAND_ALPHA = 0.82;
const GRID_ALPHA = 0.12;
const OCEAN_ALPHA = 0.035;
const OUTLINE_ALPHA = 0.18;

const toRad = (d: number) => (d * Math.PI) / 180;

// Project (lon, lat) in degrees onto 2D with Y-axis rotation
function project(
  lonDeg: number, latDeg: number, rot: number,
  cx: number, cy: number, r: number
) {
  const lon = toRad(lonDeg) + rot;
  const lat = toRad(latDeg);
  const cl = Math.cos(lat);
  return {
    x: cx + cl * Math.sin(lon) * r,
    y: cy - Math.sin(lat) * r,
    z: cl * Math.cos(lon),
  };
}

function gridKey(px: number, py: number) {
  return ((Math.round(px / GAP)) << 16) | (Math.round(py / GAP) & 0xFFFF);
}

// Accurate continent outlines as [lon, lat] degree pairs.
// Each polygon is a closed coastline path with enough points
// to be recognizable at dot-matrix resolution.
const CONTINENTS: [number, number][][] = [
  // Africa
  [[-17,14.7],[-17.1,21],[-13,24.5],[-5,36],[0,36],[3,37],[10,37],[11,33.5],[12,24],[15,23],[24,20],[28.5,21.5],[32,31.5],[34.5,31.5],[36,22],[42,12],[51,12],[51,5],[45,-1],[42,-5],[40.5,-11],[35,-25],[28,-33],[20,-34.8],[17,-32],[14,-24],[12,-17],[9,-4],[6,4],[2,6],[-5,5],[-8,4],[-13,9],[-17,14.7]],
  // Europe
  [[-9,36],[0,36],[3,37],[6,43],[3,43],[-2,43],[-9,43],[-9,36]], // Iberia
  [[3,43],[5,44],[7,48],[3,48],[0,46],[-2,48],[-5,48],[-5,43],[3,43]], // France
  [[-5,48],[-6,54],[-3,58],[-6,58],[-8,54],[-10,52],[-5,48]], // UK
  [[7,48],[6,51],[4,53],[6,55],[8,58],[12,57],[13,54],[15,51],[12,47],[7,48]], // Germany/Benelux
  [[13,54],[18,55],[24,55],[28,56],[28,60],[25,65],[20,65],[12,63],[10,58],[13,54]], // Scandinavia
  [[12,47],[18,48],[24,48],[28,47],[27,42],[23,38],[20,40],[15,41],[12,47]], // Balkans/Italy shape
  [[28,47],[32,47],[40,42],[40,44],[36,45],[30,50],[28,56],[28,47]], // Eastern Europe
  // Asia
  [[40,42],[55,37],[60,35],[66,25],[60,22],[56,27],[51,12],[60,24],[66,25],[74,22],[78,8],[80,12],[88,22],[92,20],[100,14],[105,10],[102,2],[104,1],[110,2],[117,7],[120,14],[122,18],[118,24],[112,20],[110,22],[108,21],[105,16],[100,15],[100,22],[102,22],[107,22],[108,28],[117,30],[120,32],[123,34],[130,35],[130,42],[128,37],[125,34],[120,33],[117,34],[110,35],[105,32],[90,28],[87,28],[82,25],[80,28],[76,35],[68,38],[60,38],[55,37]],
  // Asia - Siberia/Russia upper
  [[40,44],[50,45],[60,42],[70,44],[80,50],[90,50],[100,52],[110,53],[120,55],[130,48],[135,45],[140,47],[140,53],[135,55],[130,58],[120,63],[110,65],[100,67],[90,70],[80,70],[70,68],[60,65],[50,60],[40,55],[36,50],[40,44]],
  // North America
  [[-168,65],[-162,64],[-152,60],[-140,60],[-137,58],[-135,56],[-130,54],[-127,50],[-124,46],[-124,42],[-118,34],[-112,30],[-108,28],[-105,26],[-100,26],[-97.5,26],[-95,29],[-90,29],[-88,30],[-85,30],[-82,25],[-80,25],[-81,31],[-78,35],[-75,38],[-73,41],[-70,42],[-67,45],[-65,47],[-60,47],[-55,50],[-57,52],[-60,54],[-64,58],[-68,60],[-75,62],[-80,63],[-85,65],[-90,68],[-95,70],[-105,72],[-115,70],[-125,72],[-135,70],[-145,65],[-155,60],[-160,62],[-168,65]],
  // Central America & Caribbean bridge
  [[-105,26],[-100,20],[-97,18],[-96,16],[-92,15],[-88,15],[-84,11],[-80,8],[-77,8],[-82,10],[-86,12],[-88,16],[-92,17],[-97,20],[-100,22],[-105,26]],
  // South America
  [[-77,8],[-75,11],[-73,12],[-62,11],[-55,6],[-50,0],[-50,-2],[-44,-2],[-38,-5],[-35,-8],[-35,-15],[-40,-15],[-40,-22],[-42,-23],[-48,-28],[-52,-33],[-55,-35],[-57,-38],[-68,-55],[-72,-50],[-75,-45],[-73,-38],[-71,-30],[-70,-18],[-75,-15],[-77,-12],[-81,-5],[-80,0],[-77,8]],
  // Australia
  [[114,-22],[119,-18],[124,-15],[130,-12],[136,-12],[136,-16],[143,-15],[145,-17],[150,-23],[152,-26],[153,-28],[150,-35],[145,-38],[137,-36],[132,-33],[130,-31],[124,-34],[116,-34],[114,-31],[114,-22]],
  // Greenland
  [[-55,60],[-50,62],[-45,60],[-40,62],[-22,70],[-18,76],[-20,80],[-30,82],[-45,82],[-55,80],[-58,76],[-55,72],[-50,66],[-55,60]],
  // Japan
  [[130,31],[131,34],[135,35],[137,37],[140,40],[142,43],[145,44],[144,40],[141,37],[137,34],[132,31],[130,31]],
  // Indonesia (simplified)
  [[95,5],[100,1],[104,1],[106,-2],[106,-6],[112,-7],[115,-8],[120,-8],[125,-5],[128,-3],[132,-2],[135,-4],[131,-8],[127,-8],[122,-10],[118,-8],[114,-8],[106,-7],[106,-3],[102,1],[98,3],[95,5]],
  // New Zealand
  [[166,-35],[168,-38],[172,-40],[174,-42],[172,-44],[170,-46],[168,-44],[166,-42],[172,-40],[168,-37],[166,-35]],
];

interface DotGlobeProps {
  className?: string;
}

const DotGlobe = ({ className = "" }: DotGlobeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent ? parent.offsetWidth : 500;
      const h = parent ? parent.offsetHeight : 500;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = (ts - startRef.current) / 1000;
      const rot = t * ROTATION_SPEED;

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;
      const radius = Math.min(w, h) * 0.44;
      const cols = Math.ceil(w / GAP) + 1;
      const rows = Math.ceil(h / GAP) + 1;

      // Collect lit pixels — using numeric keys for performance
      const landPixels = new Set<number>();
      const gridPixels = new Set<number>();

      // --- Fill continents by scanning horizontal lines through each polygon ---
      for (const poly of CONTINENTS) {
        // Find bounding lat range
        let minLat = 90, maxLat = -90;
        for (const [, lat] of poly) {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
        // Scan latitudes
        for (let lat = minLat; lat <= maxLat; lat += 1.2) {
          // Find all longitude intersections at this latitude
          const intersections: number[] = [];
          for (let i = 0; i < poly.length - 1; i++) {
            const [lon1, lat1] = poly[i];
            const [lon2, lat2] = poly[i + 1];
            if ((lat1 <= lat && lat2 > lat) || (lat2 <= lat && lat1 > lat)) {
              const lonAt = lon1 + ((lat - lat1) / (lat2 - lat1)) * (lon2 - lon1);
              intersections.push(lonAt);
            }
          }
          intersections.sort((a, b) => a - b);
          // Fill between pairs
          for (let j = 0; j < intersections.length - 1; j += 2) {
            const lonStart = intersections[j];
            const lonEnd = intersections[j + 1];
            for (let lon = lonStart; lon <= lonEnd; lon += 1.5) {
              const p = project(lon, lat, rot, cx, cy, radius);
              if (p.z > 0.02) landPixels.add(gridKey(p.x, p.y));
            }
          }
        }
        // Also draw the outline for crisp edges
        for (let i = 0; i < poly.length - 1; i++) {
          const [lon1, lat1] = poly[i];
          const [lon2, lat2] = poly[i + 1];
          const dist = Math.sqrt((lon2 - lon1) ** 2 + (lat2 - lat1) ** 2);
          const steps = Math.max(Math.ceil(dist / 1.2), 8);
          for (let s = 0; s <= steps; s++) {
            const f = s / steps;
            const p = project(
              lon1 + (lon2 - lon1) * f,
              lat1 + (lat2 - lat1) * f,
              rot, cx, cy, radius
            );
            if (p.z > 0.02) landPixels.add(gridKey(p.x, p.y));
          }
        }
      }

      // --- Latitude grid lines (every 30 degrees) ---
      for (let lat = -60; lat <= 60; lat += 30) {
        for (let lon = 0; lon < 360; lon += 4) {
          const p = project(lon, lat, rot, cx, cy, radius);
          if (p.z > 0.05) {
            const k = gridKey(p.x, p.y);
            if (!landPixels.has(k)) gridPixels.add(k);
          }
        }
      }

      // --- Longitude grid lines (every 30 degrees) ---
      for (let lon = 0; lon < 360; lon += 30) {
        for (let lat = -90; lat <= 90; lat += 4) {
          const p = project(lon, lat, rot, cx, cy, radius);
          if (p.z > 0.05) {
            const k = gridKey(p.x, p.y);
            if (!landPixels.has(k)) gridPixels.add(k);
          }
        }
      }

      // --- Globe outline circle ---
      const outlinePixels = new Set<number>();
      for (let a = 0; a < Math.PI * 2; a += 0.015) {
        outlinePixels.add(gridKey(
          cx + Math.cos(a) * radius,
          cy + Math.sin(a) * radius
        ));
      }

      // --- Render ---
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * GAP;
          const y = row * GAP;
          const k = (col << 16) | (row & 0xFFFF);

          // Check if inside globe circle
          const dx = x - cx, dy = y - cy;
          const insideGlobe = (dx * dx + dy * dy) <= (radius + GAP) * (radius + GAP);

          let alpha: number;
          if (landPixels.has(k)) {
            alpha = LAND_ALPHA;
          } else if (outlinePixels.has(k)) {
            alpha = OUTLINE_ALPHA;
          } else if (gridPixels.has(k)) {
            alpha = GRID_ALPHA;
          } else if (insideGlobe && (dx * dx + dy * dy) <= radius * radius) {
            alpha = OCEAN_ALPHA;
          } else {
            alpha = 0.025;
          }

          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillRect(x - DOT_SIZE * 0.5, y - DOT_SIZE * 0.5, DOT_SIZE, DOT_SIZE);
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
      className={`pointer-events-none ${className}`}
    />
  );
};

export default DotGlobe;
