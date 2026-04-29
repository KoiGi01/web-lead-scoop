import { useEffect, useRef, useState, useMemo } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

interface LocationAutocompleteProps {
  google: typeof window.google | null;
  value: string;
  onChange: (val: string) => void;
  onPlaceSelect: (place: { label: string; lat: number; lng: number }) => void;
  onBlur?: () => void;
  disabled?: boolean;
  hasError?: boolean;
}

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

const LocationAutocomplete = ({
  google,
  value,
  onChange,
  onPlaceSelect,
  onBlur,
  disabled = false,
  hasError = false,
}: LocationAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const sessionTokenRef = useRef<any>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Initialize services when Google Maps loads
  useEffect(() => {
    if (!google) return;

    try {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      // PlacesService needs a dummy map container
      const dummyDiv = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
    } catch (err) {
      console.error("Error initializing Places services:", err);
    }
  }, [google]);

  // Fetch predictions on input change with debounce
  useEffect(() => {
    if (!autocompleteServiceRef.current || !value.trim()) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await autocompleteServiceRef.current!.getPlacePredictions({
          input: value,
          types: ["(regions)"],
          sessionToken: sessionTokenRef.current,
        });

        // The response may be the array directly or an object with .predictions
        const preds = Array.isArray(result) ? result : (result as any)?.predictions ?? [];

        const newPredictions: Prediction[] = preds.map((pred: any) => ({
          placeId: pred.place_id,
          mainText: pred.structured_formatting?.main_text || pred.description || "",
          secondaryText: pred.structured_formatting?.secondary_text || "",
        }));

        setPredictions(newPredictions);
        setIsOpen(newPredictions.length > 0);
        setHighlightedIndex(0);
      } catch (err) {
        console.error("Autocomplete error:", err);
        setPredictions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]);

  const handleSelectPrediction = (prediction: Prediction) => {
    if (!placesServiceRef.current) return;

    try {
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.placeId,
          fields: ["geometry", "formatted_address"],
          sessionToken: sessionTokenRef.current,
        },
        (place, status) => {
          if (status === "OK" && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const label = place.formatted_address || prediction.mainText;

            onChange(label);
            onPlaceSelect({ label, lat, lng });
            setPredictions([]);
            setIsOpen(false);

            // Refresh session token for next search
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
        }
      );
    } catch (err) {
      console.error("Error fetching place details:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % predictions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev === 0 ? predictions.length - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        handleSelectPrediction(predictions[highlightedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setPredictions([]);
        break;
    }
  };

  const handleInputBlur = () => {
    // Delay close to allow click on predictions to register
    setTimeout(() => {
      setIsOpen(false);
      onBlur?.();
    }, 200);
  };

  // Calculate dropdown position - fixed to be within viewport bounds
  const dropdownPosition = useMemo(() => {
    if (!inputRef.current) return { top: 0, left: 0, width: 0 };
    const rect = inputRef.current.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + window.scrollX;
    const width = rect.width;

    // Ensure dropdown doesn't extend beyond viewport
    const maxLeft = Math.max(0, Math.min(left, window.innerWidth - width - 16));

    return {
      top,
      left: maxLeft,
      width,
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative">
        {/* Input */}
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-100/30 pointer-events-none" />
          <input
            ref={inputRef}
            id="location"
            type="text"
            placeholder="Miami, FL, London, UK..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            onFocus={() => value.trim() && predictions.length > 0 && setIsOpen(true)}
            disabled={disabled}
            autoComplete="off"
            className={`w-full h-12 bg-black ${
              hasError ? "border border-[#ff4757]" : "border border-[#EFEDE6]/10"
            } focus:border-[#F5FF3D]/70 text-[#EFEDE6] text-sm font-mono placeholder:text-[#67645B] outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            style={{ paddingLeft: "2.5rem", paddingRight: "1rem", borderRadius: "0px" }}
          />
        </div>

        {/* Loading spinner */}
        {isLoading && (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5FF3D] animate-spin pointer-events-none" />
        )}
      </div>

      {/* Dropdown Portal */}
      {isOpen && predictions.length > 0
        && createPortal(
          <div
            className="fixed z-50 bg-[#0A0A0A] border border-[#EFEDE6]/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden"
            style={{
              borderRadius: "0px",
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {predictions.map((pred, idx) => (
              <button
                key={pred.placeId}
                className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 border-l-2 ${
                  idx === highlightedIndex
                    ? "bg-[#F5FF3D]/10 border-[#F5FF3D]"
                    : "border-transparent hover:bg-[#EFEDE6]/[0.05] hover:border-[#EFEDE6]/20"
                }`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelectPrediction(pred)}
              >
                <MapPin className="h-3.5 w-3.5 text-[#67645B] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[#EFEDE6] text-sm font-mono truncate">{pred.mainText}</div>
                  {pred.secondaryText && (
                    <div className="text-[#A8A59C] text-xs truncate">{pred.secondaryText}</div>
                  )}
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default LocationAutocomplete;
