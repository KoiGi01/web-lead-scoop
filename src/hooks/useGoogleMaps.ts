import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useState } from "react";

// Module-level singleton — persists across re-renders and component instances
let loaderPromise: Promise<void> | null = null;

export function useGoogleMaps() {
  const [googleApi, setGoogleApi] = useState<typeof google | null>(null);

  useEffect(() => {
    if (!loaderPromise) {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: "weekly",
        libraries: ["places"],
      });
      loaderPromise = loader.load();
    }

    loaderPromise
      .then(() => setGoogleApi(window.google))
      .catch((err) => console.error("Error loading Google Maps:", err));
  }, []);

  return { google: googleApi };
}
