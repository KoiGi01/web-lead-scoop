import { useEffect, useRef, useState } from "react";
import MapHudOverlay from "./MapHudOverlay";

interface LeadMapPanelProps {
  google: typeof window.google | null;
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  markers: Array<{ lat: number; lng: number; name: string; hasEmail?: boolean }>;
  isSearching: boolean;
}

// Pure black wireframe — no labels, no icons, just geometry outlines
const WIREFRAME_STYLE: google.maps.MapTypeStyle[] = [
  // Base: pure black everything
  { elementType: "geometry", stylers: [{ color: "#000000" }] },
  { elementType: "labels", stylers: [{ visibility: "off" }] },

  // Roads: faint cyan-white wireframe lines
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#0d1a1a" }, { visibility: "simplified" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0a2020" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#080f0f" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#050a0a" }] },

  // Water: very subtle dark teal
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020808" }] },

  // Land boundaries: faint lines
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#0a1a1a" }, { weight: 0.5 }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },

  // Hide everything unnecessary
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#010101" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#000000" }] },
];

const LeadMapPanel = ({
  google,
  center,
  radiusKm,
  markers,
  isSearching,
}: LeadMapPanelProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markerInstancesRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!google || !mapRef.current || mapInstanceRef.current) return;

    try {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: center || { lat: 20, lng: 0 },
        zoom: center ? 12 : 2,
        disableDefaultUI: true,
        gestureHandling: "cooperative",
        styles: WIREFRAME_STYLE,
        backgroundColor: "#000000",
      });
      // Signal map ready after tiles load
      google.maps.event.addListenerOnce(mapInstanceRef.current, "idle", () => {
        setMapReady(true);
      });
    } catch (err) {
      console.error("Error initializing map:", err);
    }
  }, [google]);

  // Update map center and create/update circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (center) {
      mapInstanceRef.current.panTo(center);
      mapInstanceRef.current.setZoom(12);

      if (!circleRef.current) {
        circleRef.current = new google.maps.Circle({
          map: mapInstanceRef.current,
          center,
          radius: radiusKm * 1000,
          fillColor: "#00ffaa",
          fillOpacity: 0.02,
          strokeColor: "#00ffaa",
          strokeOpacity: 0.08,
          strokeWeight: 1,
        });
      } else {
        circleRef.current.setCenter(center);
        circleRef.current.setRadius(radiusKm * 1000);
      }
    }
  }, [center, radiusKm, google]);

  // Animate marker in
  const animateMarkerIn = (marker: google.maps.Marker, targetScale: number) => {
    const startTime = performance.now();
    const duration = 600;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Elastic ease out
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress) * Math.cos((progress * 10 - 0.75) * ((2 * Math.PI) / 3));
      const scale = eased * targetScale;

      const icon = marker.getIcon() as google.maps.Symbol;
      marker.setIcon({ ...icon, scale });

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  // Add/update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !google) return;

    markers.forEach(({ lat, lng, name, hasEmail }) => {
      const key = `${lat},${lng}`;

      if (markerInstancesRef.current.has(key)) {
        const existing = markerInstancesRef.current.get(key)!;
        const color = hasEmail ? "#00ffaa" : "#1a3a2a";
        const icon = existing.getIcon() as google.maps.Symbol;
        existing.setIcon({ ...icon, fillColor: color, strokeColor: color });
      } else {
        const color = hasEmail ? "#00ffaa" : "#1a3a2a";
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: color,
            strokeWeight: 2,
            strokeOpacity: 0.4,
          },
          title: name,
          optimized: false,
        });

        markerInstancesRef.current.set(key, marker);
        animateMarkerIn(marker, 6);
      }
    });
  }, [markers, google]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markerInstancesRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markerInstancesRef.current.clear();
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, []);

  // Don't render anything until we have a center point
  if (!google || !center) {
    return null;
  }

  return (
    <div className="h-[260px] sm:h-[340px] overflow-hidden border border-white/[0.06] relative"
      style={{ borderRadius: "4px", background: "#000" }}>
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* HUD Canvas Overlay */}
      <MapHudOverlay
        mapInstance={mapInstanceRef.current}
        center={center}
        radiusKm={radiusKm}
        markers={markers}
        isSearching={isSearching}
      />

      {/* Status overlay */}
      <div className="absolute top-3 left-3 px-3 py-1.5 border border-[#00ffaa]/[0.15]"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", borderRadius: "3px", zIndex: 2 }}>
        {isSearching ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00ffaa" }} />
            <span className="label-mono" style={{ color: "rgba(0,255,170,0.7)", fontSize: "10px" }}>
              SCANNING...
            </span>
          </div>
        ) : markers.length > 0 ? (
          <span className="label-mono" style={{ color: "rgba(0,255,170,0.5)", fontSize: "10px" }}>
            {markers.length} LEADS MAPPED
          </span>
        ) : (
          <span className="label-mono" style={{ color: "rgba(0,255,170,0.3)", fontSize: "10px" }}>
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
};

export default LeadMapPanel;
