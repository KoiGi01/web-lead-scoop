import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Search,
  Sparkles,
  Target,
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

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface SetupPreset {
  id: string;
  label: string;
  description: string;
  serviceType: string;
  clientType: string;
  pricingTier: string;
  valueProp: string;
  ctaType: OutreachCtaType;
  tone: OutreachTone;
  icon: LucideIcon;
}

const SERVICE_TYPES = ["Marketing", "Web Design", "SEO", "Lead Generation", "Automation", "Consulting"];

const SETUP_PRESETS: SetupPreset[] = [
  {
    id: "local-growth",
    label: "Local service growth",
    description: "Dentists, roofers, med spas, clinics, and other local operators with visible gaps.",
    serviceType: "Web Design",
    clientType: "local_businesses",
    pricingTier: "mid_tier",
    valueProp: "We help local service businesses turn weak websites into booking-focused pages that generate more qualified inquiries.",
    ctaType: "send_audit",
    tone: "direct",
    icon: MapPin,
  },
  {
    id: "market-scan",
    label: "Opportunity scan",
    description: "Flexible prospecting across industries, scored around urgency and sales-readiness.",
    serviceType: "Lead Generation",
    clientType: "any",
    pricingTier: "premium",
    valueProp: "We help growing businesses identify missed revenue opportunities and turn them into practical outreach campaigns.",
    ctaType: "book_call",
    tone: "premium",
    icon: Search,
  },
  {
    id: "commerce-audit",
    label: "Commerce audit",
    description: "Online stores with conversion, SEO, trust, or contact gaps worth a quick teardown.",
    serviceType: "Marketing",
    clientType: "ecommerce",
    pricingTier: "mid_tier",
    valueProp: "We help ecommerce teams find the simple website and funnel gaps that keep shoppers from becoming customers.",
    ctaType: "send_audit",
    tone: "warm",
    icon: Globe2,
  },
];

const CLIENT_TYPES = [
  { value: "local_businesses", label: "Local businesses", detail: "Clinics, contractors, restaurants, studios.", icon: Building2 },
  { value: "ecommerce", label: "Online stores", detail: "Shops, DTC brands, marketplace sellers.", icon: Globe2 },
  { value: "agencies", label: "Agencies", detail: "Partners, fulfillment teams, white-label buyers.", icon: Target },
  { value: "any", label: "Best signal wins", detail: "Keep the search flexible.", icon: Sparkles },
];

const PRICING_TIERS = [
  { value: "budget", label: "Starter", detail: "Smaller jobs, fast wins." },
  { value: "mid_tier", label: "Growth", detail: "Projects with room for strategy." },
  { value: "premium", label: "Premium", detail: "Higher-trust, higher-value deals." },
];

const CTA_OPTIONS: Array<{ value: OutreachCtaType; label: string; detail: string }> = [
  { value: "reply", label: "Ask for a reply", detail: "Soft interest check." },
  { value: "book_call", label: "Book a call", detail: "Use a scheduling link." },
  { value: "send_audit", label: "Offer an audit", detail: "Lead with useful observations." },
  { value: "custom", label: "Custom ask", detail: "Write your own next step." },
];

const TONE_OPTIONS: Array<{ value: OutreachTone; label: string; detail: string }> = [
  { value: "direct", label: "Direct", detail: "Plain, sharp, no fluff." },
  { value: "warm", label: "Warm", detail: "A little more human." },
  { value: "premium", label: "Premium", detail: "Selective and polished." },
];

const stepLabels = [
  "Start",
  "Mode",
  "Name",
  "Company",
  "Offer",
  "Audience",
  "Market",
  "Outcome",
  "Ask",
  "Deal",
  "Commit",
] as const;

export function OnboardingModal({ open, onClose, userId }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceOther, setServiceOther] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [clientType, setClientType] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [pricingTier, setPricingTier] = useState("");
  const [location, setLocation] = useState("");
  const [sellsOnline, setSellsOnline] = useState(true);
  const [valueProp, setValueProp] = useState("");
  const [proofPoint, setProofPoint] = useState("");
  const [ctaType, setCtaType] = useState<OutreachCtaType>("reply");
  const [ctaDetail, setCtaDetail] = useState("");
  const [tone, setTone] = useState<OutreachTone>("direct");

  const finalServiceType = serviceType === "Other" ? serviceOther.trim() : serviceType;
  const progress = Math.round((step / 10) * 100);

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
      version: 2,
      preset: selectedPreset || "custom",
      business: {
        fullName: fullName.trim(),
        roleTitle: roleTitle.trim(),
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim(),
        phone: phone.trim(),
      },
      offer: {
        serviceType: finalServiceType,
        serviceOther: serviceType === "Other" ? serviceOther.trim() : "",
        pricingTier,
      },
      audience: {
        clientType,
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
    phone,
    pricingTier,
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

  const applyPreset = (preset: SetupPreset) => {
    setSelectedPreset(preset.id);
    setServiceType(preset.serviceType);
    setServiceOther("");
    setClientType(preset.clientType);
    setTargetCustomer(preset.id === "local-growth" ? "Dentists, med spas, roofers, and local clinics" : preset.id === "commerce-audit" ? "Online stores with visible conversion gaps" : "Businesses with clear growth or website gaps");
    setPricingTier(preset.pricingTier);
    setValueProp(preset.valueProp);
    setProofPoint("");
    setCtaType(preset.ctaType);
    setCtaDetail("");
    setTone(preset.tone);
    setError(null);
  };

  const saveProfile = async (skip = false) => {
    try {
      setSaving(true);
      setError(null);

      const skippedSetupProfile = {
        version: 2,
        preset: "skipped",
        business: {
          fullName: fullName.trim(),
          roleTitle: roleTitle.trim(),
          companyName: companyName.trim(),
          companyWebsite: companyWebsite.trim(),
          phone: phone.trim(),
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
        outreachProfile: serializeOutreachProfile({ valueProp: "", proofPoint: "", ctaType: "reply", ctaDetail: "", tone: "direct" }),
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
        phone: phone.trim() || null,
        client_type: skip ? "any" : clientType,
        pricing_tier: skip ? "mid_tier" : pricingTier,
        location: location.trim() || null,
        sells_online: sellsOnline,
        outreach_profile: skip
          ? serializeOutreachProfile({ valueProp: "", proofPoint: "", ctaType: "reply", ctaDetail: "", tone: "direct" })
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
    const checks: Partial<Record<Step, [boolean, string]>> = {
      2: [Boolean(fullName.trim()), "Add your name."],
      3: [Boolean(companyName.trim()), "Add your company name."],
      4: [Boolean(finalServiceType), "Choose what you sell."],
      5: [Boolean(clientType) || Boolean(targetCustomer.trim()), "Choose who you want to find."],
      7: [Boolean(valueProp.trim()), "Write the outcome you help clients create."],
      9: [Boolean(pricingTier), "Choose the deal size worth prioritizing."],
    };
    const result = checks[step];
    if (!result || result[0]) return true;
    setError(result[1]);
    return false;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 10) {
      setStep((step + 1) as Step);
      setError(null);
      return;
    }
    void saveProfile();
  };

  const handleBack = () => {
    setStep((current) => Math.max(0, current - 1) as Step);
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
            <div>
              <p className="font-display text-[16px] font-bold tracking-[-0.02em]">
                GlobaLeads<sup className="font-mono text-[8px] text-[#e8fb52]">22</sup>
              </p>
            </div>
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
                {stepLabels[step]} <span className="text-[#e8fb52]">{progress}%</span>
              </div>
              <div className="h-px flex-1 bg-[#e8fb52]/20">
                <div key={step} className="gl-pulse-line h-px bg-[#e8fb52]" style={{ width: `${Math.max(8, progress)}%` }} />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e8fb52]">
                {String(step + 1).padStart(2, "0")} / {stepLabels.length}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center py-10 sm:py-14">
              <QuestionFrame key={step}>
                {step === 0 && (
                  <div>
                    <h1 className="max-w-4xl font-display text-[58px] font-bold leading-[0.92] tracking-[-0.045em] text-[#f3f5f8] sm:text-[88px] lg:text-[112px]">
                      Let’s set up your searches.
                    </h1>
                    <p className="mt-8 max-w-2xl text-xl leading-8 text-[#e8fb52]">
                      Tell us what you sell, who you want to reach, and how emails should sound.
                    </p>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <QuestionTitle eyebrow="Start">What kind of prospects do you want first?</QuestionTitle>
                    <div className="mt-10 grid gap-3">
                      {SETUP_PRESETS.map(preset => {
                        const Icon = preset.icon;
                        const selected = selectedPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className={`group grid gap-4 border p-5 text-left transition-all hover:-translate-y-1 sm:grid-cols-[42px_minmax(0,1fr)_auto] ${
                              selected
                                ? "border-[#e8fb52] bg-[#e8fb52] text-[#08090c]"
                                : "border-[#e8fb52]/20 bg-[#08090c] text-[#f3f5f8] hover:border-[#e8fb52]"
                            }`}
                          >
                            <span className={`grid h-10 w-10 place-items-center ${selected ? "bg-[#08090c] text-[#e8fb52]" : "bg-[#e8fb52] text-[#08090c]"}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span>
                              <span className={`block font-display text-2xl font-bold tracking-[-0.03em] ${selected ? "text-[#08090c]" : "text-[#f3f5f8]"}`}>{preset.label}</span>
                              <span className="mt-1 block max-w-2xl text-sm leading-6 opacity-70">{preset.description}</span>
                            </span>
                            <span className="self-center font-mono text-[10px] uppercase tracking-[0.16em] opacity-70">
                              {selected ? "Selected" : "Apply"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <SingleInput
                    eyebrow="Identity"
                    question="What name should emails come from?"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Your name"
                    icon={UserRound}
                  />
                )}

                {step === 3 && (
                  <div>
                    <QuestionTitle eyebrow="Company">What company are you selling from?</QuestionTitle>
                    <div className="mt-9 grid max-w-3xl gap-4">
                      <TechInput label="Company name" value={companyName} onChange={setCompanyName} placeholder="Your company" autoFocus />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TechInput label="Your role" value={roleTitle} onChange={setRoleTitle} placeholder="Founder, Sales lead..." />
                        <TechInput label="Website" value={companyWebsite} onChange={setCompanyWebsite} placeholder="https://example.com" />
                      </div>
                      <TechInput label="Phone" value={phone} onChange={setPhone} placeholder="Optional" />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <QuestionTitle eyebrow="Offer">What service are you selling?</QuestionTitle>
                    <div className="mt-9 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {SERVICE_TYPES.map(service => (
                        <OptionButton
                          key={service}
                          selected={serviceType === service}
                          label={service}
                          onClick={() => {
                            setServiceType(service);
                            setServiceOther("");
                            setSelectedPreset(current => current && service !== SETUP_PRESETS.find(preset => preset.id === current)?.serviceType ? "custom" : current);
                          }}
                        />
                      ))}
                      <OptionButton
                        selected={serviceType === "Other"}
                        label="Something else"
                        onClick={() => {
                          setServiceType("Other");
                          setSelectedPreset("custom");
                        }}
                      />
                    </div>
                    {serviceType === "Other" && (
                      <div className="mt-5 max-w-3xl">
                        <TechInput value={serviceOther} onChange={setServiceOther} placeholder="Commercial cleaning, recruiting, software..." autoFocus />
                      </div>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div>
                    <QuestionTitle eyebrow="Audience">Who do you want as customers?</QuestionTitle>
                    <div className="mt-9 max-w-4xl">
                      <TechInput
                        value={targetCustomer}
                        onChange={(value) => {
                          setTargetCustomer(value);
                          setSelectedPreset("custom");
                        }}
                        placeholder="Example: dentists, roofers, med spas, SaaS agencies..."
                        autoFocus
                      />
                    </div>
                    <div className="mt-5 grid max-w-4xl gap-3 sm:grid-cols-2">
                      {CLIENT_TYPES.map(option => (
                        <OptionButton
                          key={option.value}
                          selected={clientType === option.value}
                          label={option.label}
                          detail={option.detail}
                          icon={option.icon}
                          onClick={() => {
                            setClientType(option.value);
                            setSelectedPreset("custom");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div>
                    <SingleInput
                      eyebrow="Market"
                      question="Where should we look for them?"
                      value={location}
                      onChange={setLocation}
                      placeholder="United States, Miami, Mexico..."
                      icon={MapPin}
                      optional
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

                {step === 7 && (
                  <div>
                    <QuestionTitle eyebrow="Result">What problem do you solve for them?</QuestionTitle>
                    <textarea
                      autoFocus
                      value={valueProp}
                      onChange={(event) => {
                        setValueProp(event.target.value);
                        setSelectedPreset("custom");
                      }}
                      placeholder="Example: We help local clinics turn weak websites into booking-focused pages that generate more qualified inquiries."
                      className="mt-9 h-40 w-full max-w-4xl resize-none border border-[#f3f5f8]/[0.1] bg-[#0f1115] p-5 text-xl leading-8 text-[#f3f5f8] outline-none transition-colors placeholder:text-[#5b6472] focus:border-[#e8fb52]"
                    />
                    <TechInput label="Proof we can mention" value={proofPoint} onChange={setProofPoint} placeholder="Optional: 30+ sites built, $1M managed, 12 clinics served..." />
                  </div>
                )}

                {step === 8 && (
                  <div>
                    <QuestionTitle eyebrow="Email">What should the email ask them to do?</QuestionTitle>
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
                  </div>
                )}

                {step === 9 && (
                  <div>
                    <QuestionTitle eyebrow="Deal size">What size of client do you want?</QuestionTitle>
                    <div className="mt-9 grid max-w-4xl gap-3 sm:grid-cols-3">
                      {PRICING_TIERS.map(tier => (
                        <OptionButton
                          key={tier.value}
                          selected={pricingTier === tier.value}
                          label={tier.label}
                          detail={tier.detail}
                          onClick={() => {
                            setPricingTier(tier.value);
                            setSelectedPreset("custom");
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-8">
                      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">Writing tone</p>
                      <div className="flex max-w-4xl flex-wrap gap-3">
                        {TONE_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setTone(option.value);
                              setSelectedPreset("custom");
                            }}
                            className={`border px-4 py-3 text-left transition-colors ${
                              tone === option.value
                                ? "border-[#e8fb52] bg-[#e8fb52]/[0.08]"
                                : "border-[#f3f5f8]/[0.1] bg-[#0f1115] hover:border-[#f3f5f8]/25"
                            }`}
                          >
                            <span className="block text-sm font-bold text-[#f3f5f8]">{option.label}</span>
                            <span className="mt-1 block text-xs text-[#98a0af]">{option.detail}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 10 && (
                  <div>
                    <QuestionTitle eyebrow="Ready">You’re ready to find leads.</QuestionTitle>
                    <p className="mt-6 max-w-3xl text-xl leading-8 text-[#e8fb52]">
                      We’ll use this quietly in the background to rank leads and write better outreach.
                    </p>
                    <div className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
                      <Signal label="Preset" value={selectedPreset || "custom"} />
                      <Signal label="Offer" value={finalServiceType || "unset"} />
                      <Signal label="Audience" value={clientType || "unset"} />
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
                disabled={step === 0 || saving}
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
                ) : step === 10 ? (
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

const QuestionFrame = ({
  children,
}: {
  children: ReactNode;
}) => (
  <section className="gl-step w-full">
    {children}
  </section>
);

const QuestionTitle = ({ children, eyebrow }: { children: string; eyebrow: string }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8fb52]">{eyebrow}</p>
    <h1 className="mt-4 max-w-4xl font-display text-[46px] font-bold leading-[0.98] tracking-[-0.04em] text-[#f3f5f8] sm:text-[64px]">
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
  optional,
}: {
  eyebrow: string;
  question: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  optional?: boolean;
}) => (
  <div>
    <QuestionTitle eyebrow={optional ? `${eyebrow} / optional` : eyebrow}>{question}</QuestionTitle>
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
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) => (
  <label className="block">
    {label && <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">{label}</span>}
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-14 w-full border border-[#f3f5f8]/[0.1] bg-[#0f1115] px-4 text-base text-[#f3f5f8] outline-none transition-colors placeholder:text-[#5b6472] focus:border-[#e8fb52]"
    />
  </label>
);

const OptionButton = ({
  selected,
  label,
  detail,
  icon: Icon,
  onClick,
}: {
  selected: boolean;
  label: string;
  detail?: string;
  icon?: LucideIcon;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group min-h-24 border p-4 text-left transition-all hover:-translate-y-0.5 ${
      selected
        ? "border-[#e8fb52] bg-[#e8fb52]/[0.07] shadow-[0_0_0_1px_rgba(232,251,82,.16)]"
        : "border-[#f3f5f8]/[0.1] bg-[#0f1115] hover:border-[#f3f5f8]/25"
    }`}
  >
    <span className="flex items-start justify-between gap-4">
      <span>
        {Icon && <Icon className={`mb-4 h-5 w-5 ${selected ? "text-[#e8fb52]" : "text-[#5b6472] group-hover:text-[#98a0af]"}`} />}
        <span className="block font-display text-2xl font-bold tracking-[-0.03em] text-[#f3f5f8]">{label}</span>
        {detail && <span className="mt-2 block text-sm leading-6 text-[#98a0af]">{detail}</span>}
      </span>
      {selected && <Check className="h-5 w-5 text-[#e8fb52]" />}
    </span>
  </button>
);

const Signal = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-[#f3f5f8]/[0.1] bg-[#0f1115] p-4">
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5b6472]">{label}</p>
    <p className="mt-3 truncate font-display text-2xl font-bold tracking-[-0.03em] text-[#f3f5f8]">{value}</p>
  </div>
);

export default OnboardingModal;
