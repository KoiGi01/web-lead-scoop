import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useEffect, useState } from "react";

// Module-level singleton — persists across re-renders and component instances
let loadPromise: Promise<void> | null = null;

let optionsSet = false;

function loadGoogleMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  if (!optionsSet) {
    setOptions({
      key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      v: "weekly",
    });
    optionsSet = true;
  }

  loadPromise = importLibrary("places").then(() => undefined);
  return loadPromise;
}

export function useGoogleMaps() {
  const [googleApi, setGoogleApi] = useState<typeof google | null>(null);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setGoogleApi(window.google))
      .catch((err) => console.error("Error loading Google Maps:", err));
  }, []);

  return { google: googleApi };
}
