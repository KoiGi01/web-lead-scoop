import { useEffect, useState } from "react";
import { Building2, Check, Globe2, Loader2, Search, Sparkles, Target } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

type Step = 1 | 2 | 3;

const SERVICE_TYPES = [
  "Marketing",
  "Web Design",
  "SEO",
  "Lead Generation",
  "Automation",
  "Consulting",
];

const CLIENT_TYPES = [
  { value: "local_businesses", label: "Local businesses", icon: Building2 },
  { value: "ecommerce", label: "Online stores", icon: Globe2 },
  { value: "agencies", label: "Agencies", icon: Target },
  { value: "any", label: "Any good-fit business", icon: Sparkles },
];

const PRICING_TIERS = [
  { value: "budget", label: "Starter", description: "Lower-ticket offers" },
  { value: "mid_tier", label: "Growth", description: "Mid-ticket projects" },
  { value: "premium", label: "Premium", description: "High-value deals" },
];

export function OnboardingModal({ open, onClose, userId }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState("");
  const [serviceOther, setServiceOther] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [clientType, setClientType] = useState("");
  const [pricingTier, setPricingTier] = useState("");
  const [location, setLocation] = useState("");
  const [sellsOnline, setSellsOnline] = useState(true);

  const finalServiceType = serviceType === "Other" ? serviceOther.trim() : serviceType;
  const canContinue =
    (step === 1 && Boolean(finalServiceType)) ||
    (step === 2 && Boolean(clientType)) ||
    (step === 3 && Boolean(pricingTier));

  useEffect(() => {
    if (!open) return;

    const loadAuthDefaults = async () => {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata || {};
      const name =
        metadata.full_name ||
        metadata.name ||
        [metadata.given_name, metadata.family_name].filter(Boolean).join(" ");

      if (typeof name === "string" && name.trim()) setFullName(current => current || name.trim());
      if (typeof metadata.company_name === "string" && metadata.company_name.trim()) {
        setCompanyName(current => current || metadata.company_name.trim());
      }
    };

    void loadAuthDefaults();
  }, [open]);

  const saveProfile = async (skip = false) => {
    try {
      setSaving(true);
      setError(null);

      const profile = {
        id: userId,
        service_type: skip ? "Lead research" : finalServiceType,
        service_other: !skip && serviceType === "Other" ? serviceOther.trim() : null,
        full_name: fullName.trim() || null,
        role_title: roleTitle.trim() || null,
        company_name: companyName.trim() || null,
        company_website: companyWebsite.trim() || null,
        phone: phone.trim() || null,
        client_type: skip ? "any" : clientType,
        pricing_tier: skip ? "mid_tier" : pricingTier,
        location: location.trim() || null,
        sells_online: sellsOnline,
      };

      if (!profile.service_type || !profile.client_type || !profile.pricing_tier) {
        setError("Choose one option to continue.");
        return;
      }

      const { error: insertError } = await supabase.from("user_profiles").upsert(profile);
      if (insertError) {
        setError(insertError.message);
        return;
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your setup.");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (!canContinue) {
      setError("Choose one option to continue.");
      return;
    }

    if (step < 3) {
      setStep((step + 1) as Step);
      setError(null);
      return;
    }

    void saveProfile();
  };

  const handleBack = () => {
    setStep((current) => Math.max(1, current - 1) as Step);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !saving && void saveProfile(true)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border border-[#EFEDE6]/10 bg-black p-0 text-[#EFEDE6] shadow-2xl sm:max-w-xl">
        <div className="h-1 w-full bg-[#F5FF3D]" />
        <div className="p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((item) => (
                <span
                  key={item}
                  className={`h-1.5 rounded-full transition-all ${
                    item <= step ? "w-8 bg-[#F5FF3D]" : "w-3 bg-[#EFEDE6]/15"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => void saveProfile(true)}
              disabled={saving}
              className="font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] transition-colors hover:text-[#EFEDE6] disabled:opacity-50"
            >
              Skip
            </button>
          </div>

          <DialogHeader className="mb-6 text-left">
            <DialogTitle className="font-display text-2xl font-black text-[#EFEDE6]">
              {step === 1 && "What do you sell?"}
              {step === 2 && "Who should we help you find?"}
              {step === 3 && "Set your search defaults"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#A8A59C]">
              {step === 1 && "This helps rank leads around the kind of work you actually want."}
              {step === 2 && "Pick the buyer type closest to your first campaign."}
              {step === 3 && "You can still search any niche or country later."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-11 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none transition-colors placeholder:text-[#67645B] focus:border-[#F5FF3D]"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Company name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="h-11 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none transition-colors placeholder:text-[#67645B] focus:border-[#F5FF3D]"
                />
                <input
                  type="text"
                  placeholder="Your role (optional)"
                  value={roleTitle}
                  onChange={(event) => setRoleTitle(event.target.value)}
                  className="h-11 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none transition-colors placeholder:text-[#67645B] focus:border-[#F5FF3D]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="url"
                  placeholder="Company website (optional)"
                  value={companyWebsite}
                  onChange={(event) => setCompanyWebsite(event.target.value)}
                  className="h-11 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none transition-colors placeholder:text-[#67645B] focus:border-[#F5FF3D]"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-11 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none transition-colors placeholder:text-[#67645B] focus:border-[#F5FF3D]"
                />
              </div>

              <div className="border-t border-[#EFEDE6]/10 pt-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">What do you sell?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SERVICE_TYPES.map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => {
                        setServiceType(service);
                        setServiceOther("");
                        setError(null);
                      }}
                      className={`min-h-16 border px-3 py-3 text-left text-sm font-semibold transition-colors ${
                        serviceType === service
                          ? "border-[#F5FF3D] bg-[#F5FF3D]/10 text-[#F5FF3D]"
                          : "border-[#EFEDE6]/10 bg-[#EFEDE6]/[0.03] text-[#EFEDE6] hover:border-[#EFEDE6]/30"
                      }`}
                    >
                      {serviceType === service && <Check className="mb-2 h-3.5 w-3.5" />}
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setServiceType("Other");
                  setError(null);
                }}
                className={`w-full border px-3 py-3 text-left text-sm font-semibold transition-colors ${
                  serviceType === "Other"
                    ? "border-[#F5FF3D] bg-[#F5FF3D]/10 text-[#F5FF3D]"
                    : "border-[#EFEDE6]/10 bg-[#EFEDE6]/[0.03] text-[#EFEDE6] hover:border-[#EFEDE6]/30"
                }`}
              >
                Other
              </button>

              {serviceType === "Other" && (
                <input
                  type="text"
                  autoFocus
                  placeholder="Example: commercial cleaning, recruiting, software"
                  value={serviceOther}
                  onChange={(event) => setServiceOther(event.target.value)}
                  className="h-11 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none transition-colors placeholder:text-[#67645B] focus:border-[#F5FF3D]"
                />
              )}

            </div>
          )}

          {step === 2 && (
            <div className="grid gap-2">
              {CLIENT_TYPES.map((option) => {
                const Icon = option.icon;
                const selected = clientType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setClientType(option.value);
                      setError(null);
                    }}
                    className={`flex min-h-14 items-center gap-3 border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-[#F5FF3D] bg-[#F5FF3D]/10 text-[#F5FF3D]"
                        : "border-[#EFEDE6]/10 bg-[#EFEDE6]/[0.03] text-[#EFEDE6] hover:border-[#EFEDE6]/30"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-semibold">{option.label}</span>
                    {selected && <Check className="ml-auto h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-3">
                {PRICING_TIERS.map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => {
                      setPricingTier(tier.value);
                      setError(null);
                    }}
                    className={`min-h-24 border p-3 text-left transition-colors ${
                      pricingTier === tier.value
                        ? "border-[#F5FF3D] bg-[#F5FF3D]/10"
                        : "border-[#EFEDE6]/10 bg-[#EFEDE6]/[0.03] hover:border-[#EFEDE6]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#EFEDE6]">{tier.label}</span>
                      {pricingTier === tier.value && <Check className="h-4 w-4 text-[#F5FF3D]" />}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#A8A59C]">{tier.description}</p>
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">
                  Preferred market
                </span>
                <input
                  type="text"
                  placeholder="Example: United States, Mexico, Miami"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="h-11 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none transition-colors placeholder:text-[#67645B] focus:border-[#F5FF3D]"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-3 border border-[#EFEDE6]/10 bg-[#EFEDE6]/[0.03] p-3 text-sm text-[#A8A59C]">
                <input
                  type="checkbox"
                  checked={sellsOnline}
                  onChange={(event) => setSellsOnline(event.target.checked)}
                  className="h-4 w-4 accent-[#F5FF3D]"
                />
                I can work with customers outside my local area
              </label>
            </div>
          )}

          {error && (
            <div className="mt-5 border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={step === 1 || saving}
              className="min-w-24"
            >
              Back
            </Button>

            <Button
              type="button"
              variant="accent"
              onClick={handleNext}
              disabled={saving}
              className="min-w-36"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : step === 3 ? (
                <>
                  <Search className="h-4 w-4" />
                  Start Searching
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingModal;
