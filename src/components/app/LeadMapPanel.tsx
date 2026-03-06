import { useEffect, useRef, useState } from "react";

interface LeadMapPanelProps {
  google: typeof window.google | null;
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  markers: Array<{ lat: number; lng: number; name: string; hasEmail?: boolean }>;
  isSearching: boolean;
}

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f1115" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#030304" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f1115" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#030304" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }],
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

      // Create or update circle
      if (!circleRef.current) {
        circleRef.current = new google.maps.Circle({
          map: mapInstanceRef.current,
          center,
          radius: radiusKm * 1000,
          fillColor: "#F7931A",
          fillOpacity: 0.08,
          strokeColor: "#F7931A",
          strokeOpacity: 0.35,
          strokeWeight: 1.5,
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
      // Ease-out: sqrt gives soft landing
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
        // Update existing marker color if hasEmail changed
        const existing = markerInstancesRef.current.get(key)!;
        const color = hasEmail ? "#F7931A" : "#94A3B8";
        const icon = existing.getIcon() as google.maps.Symbol;
        existing.setIcon({ ...icon, fillColor: color, strokeColor: color });
      } else {
        // Create new marker
        const color = hasEmail ? "#F7931A" : "#94A3B8";
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0, // Start at 0 — will animate in
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

  // Loading state
  if (!google) {
    return (
      <div className="h-[260px] sm:h-[340px] rounded-2xl bg-[#0F1115] border border-white/10 animate-pulse" />
    );
  }

  // No location state
  if (!center) {
    return (
      <div className="h-[260px] sm:h-[340px] rounded-2xl bg-[#0F1115] border border-white/10 flex items-center justify-center">
        <p className="text-[#94A3B8] text-xs font-mono-data text-center px-4">
          Select a location to preview the map
        </p>
      </div>
    );
  }

  return (
    <div className="h-[260px] sm:h-[340px] rounded-2xl overflow-hidden border border-white/10 relative bg-[#0F1115]">
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Status overlay */}
      <div className="absolute top-3 left-3 bg-[#0F1115]/90 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10">
        {isSearching ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#F7931A] rounded-full animate-pulse" />
            <span className="font-mono-data text-[9px] text-[#F7931A] font-bold uppercase tracking-widest">
              Scanning...
            </span>
          </div>
        ) : markers.length > 0 ? (
          <span className="font-mono-data text-[9px] text-[#94A3B8] font-bold uppercase tracking-widest">
            {markers.length} leads mapped
          </span>
        ) : (
          <span className="font-mono-data text-[9px] text-[#94A3B8] font-bold uppercase tracking-widest">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
};

export default LeadMapPanel;
