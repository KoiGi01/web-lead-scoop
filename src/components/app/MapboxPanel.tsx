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
      zoom: 1.5,
      projection: "globe", // Forces globe setup
      interactive: false,
    });

    map.on("style.load", () => {
      // Atmosphere (starry space background)
      map.setFog({
        color: "rgb(14, 14, 14)", // Lower atmosphere
        "high-color": "rgb(8, 8, 8)", // Upper atmosphere
        "horizon-blend": 0.05, // Atmosphere thickness
        "space-color": "rgb(8, 8, 8)", // Background color
        "star-intensity": 0.15 // Background star brightness
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
        zoom: 12,
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
            "circle-color": "#F7931A",
            "circle-opacity": 0.05,
            "circle-stroke-color": "#F7931A",
            "circle-stroke-opacity": 0.3,
            "circle-stroke-width": 1
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
        el.style.width = '8px';
        el.style.height = '8px';
        el.style.backgroundColor = hasEmail ? '#F7931A' : '#7f4f14';
        el.style.boxShadow = hasEmail ? '0 0 10px #F7931A' : 'none';
        el.style.borderRadius = '0'; // Pure blocky aesthetic
        
        // Add a pulse ring behind it
        const pulse = document.createElement('div');
        pulse.style.position = 'absolute';
        pulse.style.top = '50%';
        pulse.style.left = '50%';
        pulse.style.width = '100%';
        pulse.style.height = '100%';
        pulse.style.backgroundColor = '#F7931A';
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
    <div className="w-full h-full relative" style={{ borderRadius: "0px", background: "#080808" }}>
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Overlay Grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20 outline outline-1 outline-white/5" 
           style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="absolute bottom-4 right-4 z-10 p-4 border border-white/10" style={{ background: "rgba(15, 15, 15, 0.6)", backdropFilter: "blur(20px)" }}>
        <div className="flex gap-2 items-center text-[10px] font-mono text-white/50">
          <div className="w-2 h-2 bg-[#F7931A] shadow-[0_0_5px_#F7931A]"></div> ACTIVE_TARGET
          <div className="w-2 h-2 bg-[#7f4f14] ml-4"></div> GHOST_NODE
        </div>
      </div>
    </div>
  );
};

export default MapboxPanel;
