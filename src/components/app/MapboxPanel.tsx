import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

// Set token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

interface MapboxPanelProps {
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  markers: Array<{ lat: number; lng: number; name: string; hasEmail?: boolean }>;
  isSearching: boolean;
}

const MapboxPanel = ({ center, radiusKm, markers, isSearching }: MapboxPanelProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const spinRef = useRef<number | null>(null);
  const markerInstancesRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    if (!mapboxgl.accessToken) {
       console.error("Mapbox token is missing!");
       return;
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 20],
      zoom: 1.25,
      projection: "globe", // Forces globe setup
      interactive: false,
    });

    map.on("style.load", () => {
      // Atmosphere (starry space background)
      map.setFog({
        color: "rgb(0, 0, 0)",
        "high-color": "rgb(10, 10, 10)",
        "horizon-blend": 0.03,
        "space-color": "rgb(0, 0, 0)",
        "star-intensity": 0.04,
      });

      const styledLayers = map.getStyle().layers || [];
      styledLayers.forEach((layer) => {
        try {
          if (layer.type === "background") {
            map.setPaintProperty(layer.id, "background-color", "#000000");
          }
          if (layer.type === "water") {
            map.setPaintProperty(layer.id, "fill-color", "#050505");
          }
          if (layer.type === "land" || layer.id.includes("land")) {
            map.setPaintProperty(layer.id, "background-color", "#0A0A0A");
            map.setPaintProperty(layer.id, "fill-color", "#0A0A0A");
          }
          if (layer.id.includes("road") && "line-color" in ((layer as any).paint || {})) {
            map.setPaintProperty(layer.id, "line-color", "rgba(239,237,230,0.18)");
            map.setPaintProperty(layer.id, "line-opacity", 0.28);
          }
          if (layer.id.includes("admin") && "line-color" in ((layer as any).paint || {})) {
            map.setPaintProperty(layer.id, "line-color", "rgba(245,255,61,0.28)");
            map.setPaintProperty(layer.id, "line-opacity", 0.45);
          }
          if (layer.type === "symbol" && layer.id.includes("label")) {
            if ("text-color" in ((layer as any).paint || {})) {
              map.setPaintProperty(layer.id, "text-color", "#A8A59C");
            }
            if ("text-halo-color" in ((layer as any).paint || {})) {
              map.setPaintProperty(layer.id, "text-halo-color", "#000000");
            }
          }
        } catch {
          // Some Mapbox layers do not expose every paint property across style updates.
        }
      });

      mapRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      if (spinRef.current) cancelAnimationFrame(spinRef.current);
      map.remove();
    };
  }, []);

  // Globe Spinning Logic
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    let secondsPerRevolution = 120;
    let maxSpinZoom = 4;
    let spinEnabled = !isSearching && (!center || map.getZoom() < maxSpinZoom);

    let lastTime: number;

    const spinGlobe = (time: number) => {
      if (!lastTime) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;

      if (spinEnabled && mapRef.current) {
        const distancePerSecond = 360 / secondsPerRevolution;
        const center = map.getCenter();
        center.lng -= distancePerSecond * (dt / 1000);
        // Smoothly pan
        map.easeTo({ center, duration: 0, animate: false });
      }

      spinRef.current = requestAnimationFrame(spinGlobe);
    };

    if (spinEnabled) {
      spinRef.current = requestAnimationFrame(spinGlobe);
    } else {
      if (spinRef.current) {
        cancelAnimationFrame(spinRef.current);
        spinRef.current = null;
      }
    }

    return () => {
      if (spinRef.current) cancelAnimationFrame(spinRef.current);
    };
  }, [isSearching, center, mapLoaded]);

  // Handle Search Zoom & Fly To City
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !center) return;
    const map = mapRef.current;

    if (isSearching) {
      // It's searching, fly to the target
      map.flyTo({
        center: [center.lng, center.lat],
        zoom: 11,
        speed: 1.5,
        curve: 1.5,
        easing: (t) => t,
        essential: true,
      });

      // Try adding a scanning circle
      if (!map.getSource("search-radius")) {
        map.addSource("search-radius", {
          type: "geojson",
          data: {
             type: "Feature",
             geometry: { type: "Point", coordinates: [center.lng, center.lat] },
             properties: {}
          }
        });

        // Add a layer for the radius (a simple circle)
        map.addLayer({
          id: "search-radius-layer",
          type: "circle",
          source: "search-radius",
          paint: {
            "circle-radius": {
              stops: [[0, 0], [20, radiusKm * 1000]] // rough estimation for pixel radius
            },
            "circle-color": "#F5FF3D",
            "circle-opacity": 0.08,
            "circle-stroke-color": "#F5FF3D",
            "circle-stroke-opacity": 0.42,
            "circle-stroke-width": 1.5
          }
        });
      } else {
        // Update source if it already exists
        const source: any = map.getSource("search-radius");
        source.setData({
          type: "Feature",
          geometry: { type: "Point", coordinates: [center.lng, center.lat] },
          properties: {}
        });
      }
    } else if (!isSearching && center && markers.length === 0) {
      // Just panning to initially selected location (quiet state)
      map.flyTo({
        center: [center.lng, center.lat],
        zoom: 4,
        speed: 1.0,
      });
    }
  }, [center, isSearching, radiusKm, mapLoaded]);

  // Handle Plotting Markers (The discovered leads)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Remove old markers that aren't in the new list
    const currentKeys = new Set(markers.map(m => `${m.lat},${m.lng}`));
    for (const [key, markerObj] of markerInstancesRef.current.entries()) {
      if (!currentKeys.has(key)) {
        markerObj.remove();
        markerInstancesRef.current.delete(key);
      }
    }

    // Add new markers with cyber animation
    markers.forEach(({ lat, lng, name, hasEmail }) => {
      const key = `${lat},${lng}`;
      if (!markerInstancesRef.current.has(key)) {
        const el = document.createElement('div');
        el.style.width = '9px';
        el.style.height = '9px';
        el.style.backgroundColor = hasEmail ? '#F5FF3D' : '#A8A59C';
        el.style.boxShadow = hasEmail ? '0 0 12px rgba(245,255,61,0.7)' : 'none';
        el.style.borderRadius = '999px';
        
        // Add a pulse ring behind it
        const pulse = document.createElement('div');
        pulse.style.position = 'absolute';
        pulse.style.top = '50%';
        pulse.style.left = '50%';
        pulse.style.width = '100%';
        pulse.style.height = '100%';
        pulse.style.backgroundColor = '#F5FF3D';
        pulse.style.transform = 'translate(-50%, -50%)';
        pulse.style.borderRadius = '50%';
        pulse.style.animation = 'dot-pulse 1.5s infinite';
        pulse.style.zIndex = '-1';
        el.appendChild(pulse);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 10, closeButton: false }).setText(name))
          .addTo(map);

        markerInstancesRef.current.set(key, marker);
      }
    });

  }, [markers, mapLoaded]);

  return (
    <div className="w-full h-full relative bg-black" style={{ borderRadius: "0px" }}>
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Overlay Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none outline outline-1 outline-white/5"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(245,255,61,0.10), transparent 30%), linear-gradient(rgba(239,237,230,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(239,237,230,0.045) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 36px 36px, 36px 36px",
          mixBlendMode: "screen",
          opacity: 0.42,
        }}
      >
      </div>

      <div className="absolute bottom-3 right-3 z-10 border border-[#EFEDE6]/10 px-3 py-2" style={{ background: "rgba(0, 0, 0, 0.72)", backdropFilter: "blur(18px)" }}>
        <div className="flex gap-2 items-center text-[10px] font-mono text-[#A8A59C]">
          <div className="w-2 h-2 rounded-full bg-[#F5FF3D]"></div> <span className="text-[#EFEDE6]">Lead with contact</span>
          <div className="w-2 h-2 rounded-full bg-[#A8A59C] ml-4"></div> Lead found
        </div>
      </div>
    </div>
  );
};

export default MapboxPanel;
