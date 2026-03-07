import { useEffect, useRef, useState } from "react";

interface LeadMapPanelProps {
  google: typeof window.google | null;
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  markers: Array<{ lat: number; lng: number; name: string; hasEmail?: boolean }>;
  isSearching: boolean;
}

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#080808" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#555" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0a0a0a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050505" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
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

  // Initialize map
  useEffect(() => {
    if (!google || !mapRef.current || mapInstanceRef.current) return;

    try {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: center || { lat: 20, lng: 0 },
        zoom: center ? 11 : 2,
        disableDefaultUI: true,
        gestureHandling: "cooperative",
        styles: DARK_MAP_STYLE,
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
      mapInstanceRef.current.setZoom(11);

      // Monochrome circle
      if (!circleRef.current) {
        circleRef.current = new google.maps.Circle({
          map: mapInstanceRef.current,
          center,
          radius: radiusKm * 1000,
          fillColor: "#ffffff",
          fillOpacity: 0.04,
          strokeColor: "#ffffff",
          strokeOpacity: 0.15,
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
    const duration = 400;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = Math.sqrt(progress);
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
        const color = hasEmail ? "#ffffff" : "#555555";
        const icon = existing.getIcon() as google.maps.Symbol;
        existing.setIcon({ ...icon, fillColor: color, strokeColor: color });
      } else {
        const color = hasEmail ? "#ffffff" : "#555555";
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
            strokeOpacity: 0.3,
          },
          title: name,
          optimized: false,
        });

        markerInstancesRef.current.set(key, marker);
        animateMarkerIn(marker, 8);
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
    <div className="h-[260px] sm:h-[340px] overflow-hidden border border-white/[0.08] relative"
      style={{ borderRadius: "4px", background: "#080808" }}>
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Status overlay */}
      <div className="absolute top-3 left-3 px-3 py-1.5 border border-white/[0.10]"
        style={{ background: "rgba(8,8,8,0.9)", backdropFilter: "blur(8px)", borderRadius: "3px" }}>
        {isSearching ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="label-mono text-white/60">
              SCANNING...
            </span>
          </div>
        ) : markers.length > 0 ? (
          <span className="label-mono text-white/40">
            {markers.length} LEADS MAPPED
          </span>
        ) : (
          <span className="label-mono text-white/30">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
};

export default LeadMapPanel;
