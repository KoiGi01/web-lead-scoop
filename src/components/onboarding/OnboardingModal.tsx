import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

type Step = 1 | 2 | 3 | 4;

const SERVICE_TYPES = [
  "Web Design",
  "SEO",
  "Marketing",
  "Automation",
  "Ads",
  "Branding",
];

const CLIENT_TYPES = [
  { value: "local_businesses", label: "Local businesses" },
  { value: "ecommerce", label: "Ecommerce stores" },
  { value: "agencies", label: "Agencies" },
  { value: "any", label: "Any business" },
];

const PRICING_TIERS = [
  { value: "budget", label: "Budget", description: "Under $1,000" },
  { value: "mid_tier", label: "Mid-tier", description: "$1k – $5k" },
  { value: "premium", label: "Premium", description: "$5k+" },
];

export function OnboardingModal({
  open,
  onClose,
  userId,
}: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [serviceType, setServiceType] = useState<string>("");
  const [serviceOther, setServiceOther] = useState<string>("");
  const [clientType, setClientType] = useState<string>("");
  const [pricingTier, setPricingTier] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [sellsOnline, setSellsOnline] = useState<boolean>(false);

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as Step);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
      setError(null);
    }
  };

  const handleSkip = async () => {
    // Skip step 4 and save with defaults
    await handleSave();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate required fields
      if (!serviceType || !clientType || !pricingTier) {
        setError("Please complete all required fields");
        setSaving(false);
        return;
      }

      const finalServiceType =
        serviceType === "Other" ? serviceOther : serviceType;

      if (!finalServiceType) {
        setError("Please specify a service type");
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("user_profiles")
        .upsert({
          id: userId,
          service_type: finalServiceType,
          service_other: serviceType === "Other" ? serviceOther : null,
          client_type: clientType,
          pricing_tier: pricingTier,
          location: location || null,
          sells_online: sellsOnline,
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      setSaving(false);
    }
  };

  const isStep1Valid = serviceType && (serviceType !== "Other" || serviceOther);
  const isStep2Valid = clientType;
  const isStep3Valid = pricingTier;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border border-white/10 bg-[#0F1115]">
        {/* Header gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#EA580C] to-[#F7931A]" />

        <div className="p-6 sm:p-8">
          {/* Progress dots */}
          <div className="flex gap-2 mb-8 justify-center">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s <= step ? "bg-[#F7931A] w-8" : "bg-white/10 w-2"
                }`}
              />
            ))}
          </div>

          <DialogHeader className="mb-6 text-center">
            <DialogTitle className="text-2xl font-heading font-bold text-white">
              {step === 1 && "What service do you offer?"}
              {step === 2 && "Who is your ideal client?"}
              {step === 3 && "Your pricing range per project?"}
              {step === 4 && "Almost there! (Optional)"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8] mt-2">
              {step === 1 &&
                "This helps us personalize pitch angles for your leads"}
              {step === 2 && "We'll tailor recommendations to your focus"}
              {step === 3 && "This affects which opportunities we highlight"}
              {step === 4 && "Location and service type will improve personalization"}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Service Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_TYPES.map((service) => (
                  <button
                    key={service}
                    onClick={() => {
                      setServiceType(service);
                      setServiceOther("");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left font-semibold ${
                      serviceType === service
                        ? "border-[#F7931A] bg-[#F7931A]/10 text-[#F7931A]"
                        : "border-white/10 bg-white/5 text-[#94A3B8] hover:border-white/20"
                    }`}
                  >
                    {service}
                  </button>
                ))}
              </div>

              {/* Other input */}
              <div>
                <button
                  onClick={() => setServiceType("Other")}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left font-semibold ${
                    serviceType === "Other"
                      ? "border-[#F7931A] bg-[#F7931A]/10 text-[#F7931A]"
                      : "border-white/10 bg-white/5 text-[#94A3B8] hover:border-white/20"
                  }`}
                >
                  Other
                </button>
                {serviceType === "Other" && (
                  <input
                    type="text"
                    placeholder="Specify your service..."
                    value={serviceOther}
                    onChange={(e) => setServiceOther(e.target.value)}
                    className="mt-2 w-full px-3 py-2 bg-black/50 border-b-2 border-white/20 focus:border-[#F7931A] text-white placeholder:text-white/30 outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 2: Client Type */}
          {step === 2 && (
            <div className="space-y-3">
              {CLIENT_TYPES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setClientType(option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    clientType === option.value
                      ? "border-[#F7931A] bg-[#F7931A]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div
                    className={`font-semibold ${
                      clientType === option.value
                        ? "text-[#F7931A]"
                        : "text-[#94A3B8]"
                    }`}
                  >
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Pricing Tier */}
          {step === 3 && (
            <div className="grid grid-cols-3 gap-3">
              {PRICING_TIERS.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => setPricingTier(tier.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    pricingTier === tier.value
                      ? "border-[#F7931A] bg-[#F7931A]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div
                    className={`font-semibold text-sm ${
                      pricingTier === tier.value
                        ? "text-[#F7931A]"
                        : "text-[#94A3B8]"
                    }`}
                  >
                    {tier.label}
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-1">
                    {tier.description}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Optional Details */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#94A3B8] mb-2">
                  Location (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Miami, FL or New York"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border-b-2 border-white/20 focus:border-[#F7931A] text-white placeholder:text-white/30 outline-none text-sm"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  id="sells_online"
                  checked={sellsOnline}
                  onChange={(e) => setSellsOnline(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="sells_online"
                  className="flex-1 text-sm text-[#94A3B8] cursor-pointer"
                >
                  I provide online services (not location-specific)
                </label>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-400/30 text-sm text-orange-400">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex gap-3 justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-4 py-2 rounded-full border border-white/20 text-[#94A3B8] hover:text-white hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
            >
              Back
            </button>

            <div className="flex gap-2">
              {step === 4 && (
                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="px-4 py-2 rounded-full border border-white/20 text-[#94A3B8] hover:text-white hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                >
                  Skip
                </button>
              )}

              {step < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !isStep1Valid) ||
                    (step === 2 && !isStep2Valid) ||
                    (step === 3 && !isStep3Valid)
                  }
                  className="px-6 py-2 rounded-full btn-btc disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 rounded-full btn-btc disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving..." : "Finish Setup"}
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingModal;
