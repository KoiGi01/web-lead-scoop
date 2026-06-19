import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Search,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { serializeOutreachProfile, type OutreachCtaType, type OutreachTone } from "@/lib/outreachProfile";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface HelperPreset {
  label: string;
  serviceType: string;
  targetCustomer: string;
  clientType: string;
  valueProp: string;
  ctaType: OutreachCtaType;
  tone: OutreachTone;
}

const SERVICE_TYPES = ["Web Design", "SEO", "Marketing", "Lead Generation", "Automation", "Consulting"];

const HELPER_PRESETS: HelperPreset[] = [
  {
    label: "Websites for local businesses",
    serviceType: "Web Design",
    targetCustomer: "Dentists, med spas, roofers, and local clinics",
    clientType: "local_businesses",
    valueProp: "We help local service businesses turn weak websites into booking-focused pages that generate more qualified inquiries.",
    ctaType: "send_audit",
    tone: "direct",
  },
  {
    label: "SEO for service companies",
    serviceType: "SEO",
    targetCustomer: "Local service businesses that need more visibility",
    clientType: "local_businesses",
    valueProp: "We help local service businesses improve their search visibility and turn more nearby buyers into inquiries.",
    ctaType: "reply",
    tone: "direct",
  },
  {
    label: "Audits for online stores",
    serviceType: "Marketing",
    targetCustomer: "Online stores with visible conversion gaps",
    clientType: "ecommerce",
    valueProp: "We help ecommerce teams find the simple website and funnel gaps that keep shoppers from becoming customers.",
    ctaType: "send_audit",
    tone: "warm",
  },
];

const CLIENT_TYPES = [
  { value: "local_businesses", label: "Local businesses" },
  { value: "ecommerce", label: "Online stores" },
  { value: "agencies", label: "Agencies" },
  { value: "any", label: "Any good fit" },
];

const CTA_OPTIONS: Array<{ value: OutreachCtaType; label: string; detail: string }> = [
  { value: "reply", label: "Reply if interested", detail: "Low-friction interest check." },
  { value: "book_call", label: "Book a call", detail: "Send qualified leads to a link." },
  { value: "send_audit", label: "Receive a quick audit", detail: "Offer useful observations first." },
  { value: "custom", label: "Custom ask", detail: "Use your own next step." },
];

const TONE_OPTIONS: Array<{ value: OutreachTone; label: string }> = [
  { value: "direct", label: "Direct" },
  { value: "warm", label: "Warm" },
  { value: "premium", label: "Premium" },
];

const stepLabels = ["Offer", "Market", "Problem", "Email", "Sender"] as const;

export function OnboardingModal({ open, onClose, userId }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceOther, setServiceOther] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [clientType, setClientType] = useState("any");
  const [location, setLocation] = useState("");
  const [sellsOnline, setSellsOnline] = useState(true);
  const [valueProp, setValueProp] = useState("");
  const [proofPoint, setProofPoint] = useState("");
  const [ctaType, setCtaType] = useState<OutreachCtaType>("reply");
  const [ctaDetail, setCtaDetail] = useState("");
  const [tone, setTone] = useState<OutreachTone>("direct");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");

  const finalServiceType = serviceType === "Other" ? serviceOther.trim() : serviceType;
  const progress = Math.round((step / 5) * 100);

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

  const setupProfile = useMemo(() => {
    const outreachProfile = serializeOutreachProfile({ valueProp, proofPoint, ctaType, ctaDetail, tone });

    return {
      version: 3,
      preset: selectedPreset || "custom",
      business: {
        fullName: fullName.trim(),
        roleTitle: roleTitle.trim(),
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim(),
      },
      offer: {
        serviceType: finalServiceType,
        serviceOther: serviceType === "Other" ? serviceOther.trim() : "",
        pricingTier: "mid_tier",
      },
      audience: {
        clientType: clientType || "any",
        targetCustomer: targetCustomer.trim(),
        location: location.trim(),
        sellsOnline,
      },
      outreachProfile,
      completedAt: new Date().toISOString(),
    };
  }, [
    clientType,
    companyName,
    companyWebsite,
    ctaDetail,
    ctaType,
    finalServiceType,
    fullName,
    location,
    proofPoint,
    roleTitle,
    selectedPreset,
    sellsOnline,
    serviceOther,
    serviceType,
    targetCustomer,
    tone,
    valueProp,
  ]);

  const applyPreset = (preset: HelperPreset) => {
    setSelectedPreset(preset.label);
    setServiceType(preset.serviceType);
    setServiceOther("");
    setTargetCustomer(preset.targetCustomer);
    setClientType(preset.clientType);
    setValueProp(preset.valueProp);
    setCtaType(preset.ctaType);
    setTone(preset.tone);
    setError(null);
  };

  const saveProfile = async (skip = false) => {
    try {
      setSaving(true);
      setError(null);

      const skippedOutreach = serializeOutreachProfile({ valueProp: "", proofPoint: "", ctaType: "reply", ctaDetail: "", tone: "direct" });
      const skippedSetupProfile = {
        version: 3,
        preset: "skipped",
        business: {
          fullName: fullName.trim(),
          roleTitle: roleTitle.trim(),
          companyName: companyName.trim(),
          companyWebsite: companyWebsite.trim(),
        },
        offer: {
          serviceType: "Lead research",
          serviceOther: "",
          pricingTier: "mid_tier",
        },
        audience: {
          clientType: "any",
          targetCustomer: targetCustomer.trim(),
          location: location.trim(),
          sellsOnline,
        },
        outreachProfile: skippedOutreach,
        skipped: true,
        completedAt: new Date().toISOString(),
      };

      const profile = {
        id: userId,
        service_type: skip ? "Lead research" : finalServiceType,
        service_other: !skip && serviceType === "Other" ? serviceOther.trim() : null,
        full_name: fullName.trim() || null,
        role_title: roleTitle.trim() || null,
        company_name: companyName.trim() || null,
        company_website: companyWebsite.trim() || null,
        phone: null,
        client_type: skip ? "any" : clientType || "any",
        pricing_tier: "mid_tier",
        location: location.trim() || null,
        sells_online: sellsOnline,
        outreach_profile: skip
          ? skippedOutreach
          : serializeOutreachProfile({ valueProp, proofPoint, ctaType, ctaDetail, tone }),
        setup_profile: (skip ? skippedSetupProfile : setupProfile) as Json,
      };

      if (!profile.service_type || !profile.client_type || !profile.pricing_tier) {
        setError("Finish the required setup fields first.");
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

  const validateStep = () => {
    const checks: Record<Step, [boolean, string]> = {
      1: [Boolean(finalServiceType && targetCustomer.trim()), "Describe what you sell and who you want as customers."],
      2: [Boolean(location.trim()), "Add the market or location you usually care about."],
      3: [Boolean(valueProp.trim()), "Describe the problem you solve."],
      4: [Boolean(ctaType), "Choose what the first email should ask for."],
      5: [Boolean(fullName.trim() && companyName.trim()), "Add the sender name and company."],
    };
    const result = checks[step];
    if (result[0]) return true;
    setError(result[1]);
    return false;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 5) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#08090c] text-[#f3f5f8]">
      <style>{`
        @keyframes glStepIn {
          from { opacity: 0; transform: translateY(26px) scale(.985); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes glWave {
          0% { transform: translate3d(-34px, 0, 0); opacity: .18; }
          50% { transform: translate3d(12px, -16px, 0); opacity: .42; }
          100% { transform: translate3d(42px, 8px, 0); opacity: .22; }
        }
        @keyframes glPulseLine {
          0%, 100% { transform: scaleX(.18); opacity: .45; }
          50% { transform: scaleX(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gl-step, .gl-wave, .gl-pulse-line { animation: none !important; }
        }
        .gl-step { animation: glStepIn .54s cubic-bezier(.16, 1, .3, 1) both; }
        .gl-wave { animation: glWave 7s ease-in-out infinite alternate; transform-origin: center; }
        .gl-wave:nth-child(2) { animation-duration: 9s; animation-delay: -2s; }
        .gl-wave:nth-child(3) { animation-duration: 11s; animation-delay: -4s; }
        .gl-pulse-line { animation: glPulseLine 1.2s ease-in-out both; transform-origin: left center; }
      `}</style>

      <div className="pointer-events-none absolute right-[-12vw] top-[12vh] hidden h-[52vh] w-[52vh] rotate-45 border-[44px] border-[#e8fb52]/10 lg:block" />
      <div className="pointer-events-none absolute bottom-[-18vh] left-[-10vw] h-[42vh] w-[42vh] rotate-45 bg-[#e8fb52]/[0.035]" />

      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] w-full text-[#e8fb52]" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
        <path className="gl-wave" d="M-80 280 C 180 120, 360 380, 650 220 S 1090 110, 1520 260" fill="none" stroke="currentColor" strokeWidth="2" opacity=".32" />
        <path className="gl-wave" d="M-80 340 C 220 190, 420 410, 710 280 S 1110 180, 1520 330" fill="none" stroke="currentColor" strokeWidth="1.3" opacity=".22" />
        <path className="gl-wave" d="M-80 210 C 240 70, 430 300, 760 160 S 1120 80, 1520 190" fill="none" stroke="currentColor" strokeWidth=".9" opacity=".16" />
      </svg>

      <div className="relative flex h-screen flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            <p className="font-display text-[16px] font-bold tracking-[-0.02em]">
              GlobaLeads<sup className="font-mono text-[8px] text-[#e8fb52]">22</sup>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveProfile(true)}
            disabled={saving}
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472] transition-colors hover:text-[#f3f5f8] disabled:opacity-50"
          >
            Skip
          </button>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e8fb52]">
              {stepLabels[step - 1]} <span>{progress}%</span>
            </div>
            <div className="h-px flex-1 bg-[#e8fb52]/20">
              <div key={step} className="gl-pulse-line h-px bg-[#e8fb52]" style={{ width: `${progress}%` }} />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e8fb52]">
              {String(step).padStart(2, "0")} / 05
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center py-10 sm:py-14">
            <QuestionFrame key={step}>
              {step === 1 && (
                <div>
                  <QuestionTitle eyebrow="Offer">Describe what you sell and who your ideal customer is.</QuestionTitle>
                  <div className="mt-8 flex max-w-4xl flex-wrap gap-2">
                    {HELPER_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                          selectedPreset === preset.label
                            ? "border-[#e8fb52] bg-[#e8fb52] text-[#08090c]"
                            : "border-[#e8fb52]/20 text-[#e8fb52] hover:border-[#e8fb52]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-8 grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
                    <div>
                      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">What you sell</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SERVICE_TYPES.map(service => (
                          <OptionButton
                            key={service}
                            selected={serviceType === service}
                            label={service}
                            compact
                            onClick={() => {
                              setServiceType(service);
                              setServiceOther("");
                              setSelectedPreset("custom");
                            }}
                          />
                        ))}
                        <OptionButton
                          selected={serviceType === "Other"}
                          label="Something else"
                          compact
                          onClick={() => {
                            setServiceType("Other");
                            setSelectedPreset("custom");
                          }}
                        />
                      </div>
                      {serviceType === "Other" && (
                        <TechInput value={serviceOther} onChange={setServiceOther} placeholder="Describe the service" autoFocus />
                      )}
                    </div>
                    <div>
                      <TechInput
                        label="Ideal customer"
                        value={targetCustomer}
                        onChange={(value) => {
                          setTargetCustomer(value);
                          setSelectedPreset("custom");
                        }}
                        placeholder="Dentists, roofers, med spas, SaaS agencies..."
                        autoFocus
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {CLIENT_TYPES.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setClientType(option.value)}
                            className={`border px-3 py-2 text-xs font-semibold transition-colors ${
                              clientType === option.value
                                ? "border-[#e8fb52] bg-[#e8fb52]/10 text-[#e8fb52]"
                                : "border-[#f3f5f8]/10 text-[#98a0af] hover:text-[#f3f5f8]"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <SingleInput
                    eyebrow="Market"
                    question="Where do you usually want to find customers?"
                    value={location}
                    onChange={setLocation}
                    placeholder="United States, Miami, Mexico..."
                    icon={MapPin}
                  />
                  <button
                    type="button"
                    onClick={() => setSellsOnline(current => !current)}
                    className={`mt-7 inline-flex items-center gap-3 border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      sellsOnline
                        ? "border-[#e8fb52] bg-[#e8fb52]/[0.08] text-[#e8fb52]"
                        : "border-[#f3f5f8]/[0.1] bg-[#0f1115] text-[#98a0af] hover:text-[#f3f5f8]"
                    }`}
                  >
                    <span className={`grid h-4 w-4 place-items-center border ${sellsOnline ? "border-[#e8fb52]" : "border-[#5b6472]"}`}>
                      {sellsOnline && <Check className="h-3 w-3" />}
                    </span>
                    I can sell outside this market
                  </button>
                </div>
              )}

              {step === 3 && (
                <div>
                  <QuestionTitle eyebrow="Problem">What problem do you solve for them?</QuestionTitle>
                  <textarea
                    autoFocus
                    value={valueProp}
                    onChange={(event) => {
                      setValueProp(event.target.value);
                      setSelectedPreset("custom");
                    }}
                    placeholder="Example: We help clinics turn outdated websites into pages that bring in more qualified bookings."
                    className="mt-9 h-40 w-full max-w-4xl resize-none border border-[#f3f5f8]/[0.1] bg-[#0f1115] p-5 text-xl leading-8 text-[#f3f5f8] outline-none transition-colors placeholder:text-[#5b6472] focus:border-[#e8fb52]"
                  />
                  <TechInput label="Proof we can mention" value={proofPoint} onChange={setProofPoint} placeholder="Optional: 30+ sites built, 12 clinics served, 4.9-star clients..." />
                </div>
              )}

              {step === 4 && (
                <div>
                  <QuestionTitle eyebrow="Email">What should the first email ask them to do?</QuestionTitle>
                  <div className="mt-9 grid max-w-4xl gap-3 sm:grid-cols-2">
                    {CTA_OPTIONS.map(option => (
                      <OptionButton
                        key={option.value}
                        selected={ctaType === option.value}
                        label={option.label}
                        detail={option.detail}
                        icon={Mail}
                        onClick={() => {
                          setCtaType(option.value);
                          setSelectedPreset("custom");
                        }}
                      />
                    ))}
                  </div>
                  {(ctaType === "book_call" || ctaType === "custom") && (
                    <div className="mt-5 max-w-4xl">
                      <TechInput
                        label={ctaType === "book_call" ? "Booking link" : "Custom ask"}
                        value={ctaDetail}
                        onChange={setCtaDetail}
                        placeholder={ctaType === "book_call" ? "https://calendly.com/..." : "Ask if they want a 3-point homepage teardown"}
                      />
                    </div>
                  )}
                  <div className="mt-7 flex max-w-4xl flex-wrap gap-3">
                    {TONE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTone(option.value)}
                        className={`border px-4 py-3 text-sm font-bold transition-colors ${
                          tone === option.value
                            ? "border-[#e8fb52] bg-[#e8fb52]/10 text-[#e8fb52]"
                            : "border-[#f3f5f8]/10 text-[#98a0af] hover:text-[#f3f5f8]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div>
                  <QuestionTitle eyebrow="Sender">What name and company should emails come from?</QuestionTitle>
                  <div className="mt-9 grid max-w-4xl gap-4 sm:grid-cols-2">
                    <TechInput label="Your name" value={fullName} onChange={setFullName} placeholder="Your name" autoFocus icon={UserRound} />
                    <TechInput label="Company" value={companyName} onChange={setCompanyName} placeholder="Company name" />
                    <TechInput label="Role" value={roleTitle} onChange={setRoleTitle} placeholder="Optional" />
                    <TechInput label="Website" value={companyWebsite} onChange={setCompanyWebsite} placeholder="Optional" icon={Globe2} />
                  </div>
                </div>
              )}
            </QuestionFrame>
          </div>

          {error && (
            <div className="mt-5 border border-[#ff5c49]/30 bg-[#ff5c49]/10 px-4 py-3 text-sm text-[#ff8a7c]">
              {error}
            </div>
          )}

          <footer className="flex flex-shrink-0 items-center justify-between pb-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={step === 1 || saving}
              className="border-[#e8fb52]/20 bg-[#08090c] text-[#e8fb52] hover:border-[#e8fb52] hover:bg-[#08090c]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              variant="accent"
              onClick={handleNext}
              disabled={saving}
              className="min-w-44 bg-[#e8fb52] text-[#08090c] hover:bg-[#f3ff8a]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : step === 5 ? (
                <>
                  <Search className="h-4 w-4" />
                  Start searching
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </footer>
        </main>
      </div>
    </div>
  );
}

const QuestionFrame = ({ children }: { children: ReactNode }) => (
  <section className="gl-step w-full">
    {children}
  </section>
);

const QuestionTitle = ({ children, eyebrow }: { children: string; eyebrow: string }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8fb52]">{eyebrow}</p>
    <h1 className="mt-4 max-w-4xl font-display text-[42px] font-bold leading-[0.98] tracking-[-0.04em] text-[#f3f5f8] sm:text-[62px]">
      {children}
    </h1>
  </div>
);

const SingleInput = ({
  eyebrow,
  question,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  eyebrow: string;
  question: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
}) => (
  <div>
    <QuestionTitle eyebrow={eyebrow}>{question}</QuestionTitle>
    <div className="mt-10 flex max-w-4xl items-center gap-4 border-b border-[#f3f5f8]/[0.16] pb-4 focus-within:border-[#e8fb52]">
      <Icon className="h-6 w-6 shrink-0 text-[#e8fb52]" />
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-16 min-w-0 flex-1 bg-transparent font-display text-4xl font-bold tracking-[-0.03em] text-[#f3f5f8] outline-none placeholder:text-[#3a414d] sm:text-5xl"
      />
    </div>
  </div>
);

const TechInput = ({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  icon: Icon,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  icon?: LucideIcon;
}) => (
  <label className="block">
    {label && <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">{label}</span>}
    <span className="flex h-14 w-full items-center gap-3 border border-[#f3f5f8]/[0.1] bg-[#0f1115] px-4 transition-colors focus-within:border-[#e8fb52]">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-[#e8fb52]" />}
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-base text-[#f3f5f8] outline-none placeholder:text-[#5b6472]"
      />
    </span>
  </label>
);

const OptionButton = ({
  selected,
  label,
  detail,
  icon: Icon,
  compact,
  onClick,
}: {
  selected: boolean;
  label: string;
  detail?: string;
  icon?: LucideIcon;
  compact?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group border p-4 text-left transition-all hover:-translate-y-0.5 ${
      compact ? "min-h-14" : "min-h-24"
    } ${
      selected
        ? "border-[#e8fb52] bg-[#e8fb52]/[0.07] shadow-[0_0_0_1px_rgba(232,251,82,.16)]"
        : "border-[#f3f5f8]/[0.1] bg-[#0f1115] hover:border-[#f3f5f8]/25"
    }`}
  >
    <span className="flex items-start justify-between gap-4">
      <span>
        {Icon && <Icon className={`mb-4 h-5 w-5 ${selected ? "text-[#e8fb52]" : "text-[#5b6472] group-hover:text-[#98a0af]"}`} />}
        <span className={`block font-display font-bold tracking-[-0.03em] text-[#f3f5f8] ${compact ? "text-lg" : "text-2xl"}`}>
          {label}
        </span>
        {detail && <span className="mt-2 block text-sm leading-6 text-[#98a0af]">{detail}</span>}
      </span>
      {selected && <Check className="h-5 w-5 text-[#e8fb52]" />}
    </span>
  </button>
);

export default OnboardingModal;
