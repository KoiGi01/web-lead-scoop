import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  Globe2,
  LayoutDashboard,
  Loader2,
  Mail,
  MapPin,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { serializeOutreachProfile, type OutreachCtaType, type OutreachTone } from "@/lib/outreachProfile";
import type { Json } from "@/integrations/supabase/types";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface SetupPreset {
  id: string;
  label: string;
  description: string;
  serviceType: string;
  clientType: string;
  pricingTier: string;
  valueProp: string;
  proofPoint: string;
  ctaType: OutreachCtaType;
  tone: OutreachTone;
  icon: LucideIcon;
}

const SERVICE_TYPES = [
  "Marketing",
  "Web Design",
  "SEO",
  "Lead Generation",
  "Automation",
  "Consulting",
];

const SETUP_PRESETS: SetupPreset[] = [
  {
    id: "local-growth",
    label: "Local growth engine",
    description: "Find dentists, med spas, roofers, clinics, and other local businesses with visible demand signals.",
    serviceType: "Web Design",
    clientType: "local_businesses",
    pricingTier: "mid_tier",
    valueProp: "We help local service businesses turn weak websites into booking-focused pages that generate more qualified inquiries.",
    proofPoint: "",
    ctaType: "send_audit",
    tone: "direct",
    icon: MapPin,
  },
  {
    id: "agency-outreach",
    label: "Agency prospecting",
    description: "Prioritize companies that look ready for paid ads, SEO, websites, automation, or lead generation help.",
    serviceType: "Lead Generation",
    clientType: "any",
    pricingTier: "premium",
    valueProp: "We help growing businesses identify missed revenue opportunities and turn them into practical outreach campaigns.",
    proofPoint: "",
    ctaType: "book_call",
    tone: "premium",
    icon: LayoutDashboard,
  },
  {
    id: "ecommerce-audit",
    label: "Ecommerce audits",
    description: "Look for online stores with conversion, SEO, contact, and trust gaps worth turning into quick audits.",
    serviceType: "Marketing",
    clientType: "ecommerce",
    pricingTier: "mid_tier",
    valueProp: "We help ecommerce teams find the simple website and funnel gaps that keep shoppers from becoming customers.",
    proofPoint: "",
    ctaType: "send_audit",
    tone: "warm",
    icon: Globe2,
  },
];

const CLIENT_TYPES = [
  { value: "local_businesses", label: "Local businesses", description: "Clinics, contractors, restaurants, studios, and local teams.", icon: Building2 },
  { value: "ecommerce", label: "Online stores", description: "Brands selling through a website or marketplace.", icon: Globe2 },
  { value: "agencies", label: "Agencies", description: "Teams that may need fulfillment, leads, or partnerships.", icon: Target },
  { value: "any", label: "Any good-fit business", description: "Keep searches flexible and let the signal quality decide.", icon: Sparkles },
];

const PRICING_TIERS = [
  { value: "budget", label: "Starter", description: "Smaller jobs and fast wins." },
  { value: "mid_tier", label: "Growth", description: "Meaningful projects with room for strategy." },
  { value: "premium", label: "Premium", description: "Higher-trust prospects and larger deals." },
];

const CTA_OPTIONS: Array<{ value: OutreachCtaType; label: string; description: string }> = [
  { value: "reply", label: "Get a reply", description: "Ask if they want the idea." },
  { value: "book_call", label: "Book a call", description: "Use a scheduling link for qualified prospects." },
  { value: "send_audit", label: "Send an audit", description: "Offer a short list of specific gaps." },
  { value: "custom", label: "Custom ask", description: "Use your own next step." },
];

const TONE_OPTIONS: Array<{ value: OutreachTone; label: string; description: string }> = [
  { value: "direct", label: "Direct", description: "Clear and concise." },
  { value: "warm", label: "Warm", description: "Friendly and approachable." },
  { value: "premium", label: "Premium", description: "Polished and selective." },
];

const SETUP_FEATURES = [
  { label: "AI-curated lead lists", description: "Searches rank prospects by fit, signals, and opportunity.", icon: Sparkles },
  { label: "Smart recipient groups", description: "Organize outreach by industry, stage, priority, and service.", icon: Target },
  { label: "Email drafts that know you", description: "Your value prop, proof, tone, and CTA shape every draft.", icon: Mail },
];

const stepMeta: Record<Step, { title: string; description: string; icon: LucideIcon; navLabel: string }> = {
  1: {
    title: "Welcome to GlobaLeads22.",
    description: "Let's set up your workspace so searches, pipeline defaults, and AI emails start from the right context.",
    icon: Rocket,
    navLabel: "Welcome",
  },
  2: {
    title: "Tell us about your business.",
    description: "This gives lead scoring and email drafts the basics of who you are and what you sell.",
    icon: UserRound,
    navLabel: "Business",
  },
  3: {
    title: "Choose your best-fit customers.",
    description: "Pick the first audience and market we should optimize around. You can search anything later.",
    icon: Target,
    navLabel: "Customers",
  },
  4: {
    title: "Shape your AI outreach.",
    description: "A little context here makes discovery emails, follow-ups, and audit offers much more specific.",
    icon: WandSparkles,
    navLabel: "Outreach",
  },
  5: {
    title: "Your workspace is ready.",
    description: "Review the setup profile we will save as JSON, then start searching.",
    icon: ShieldCheck,
    navLabel: "Finish",
  },
};

export function OnboardingModal({ open, onClose, userId }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1);
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
  const [pricingTier, setPricingTier] = useState("");
  const [location, setLocation] = useState("");
  const [sellsOnline, setSellsOnline] = useState(true);
  const [valueProp, setValueProp] = useState("");
  const [proofPoint, setProofPoint] = useState("");
  const [ctaType, setCtaType] = useState<OutreachCtaType>("reply");
  const [ctaDetail, setCtaDetail] = useState("");
  const [tone, setTone] = useState<OutreachTone>("direct");

  const finalServiceType = serviceType === "Other" ? serviceOther.trim() : serviceType;
  const activeStep = stepMeta[step];
  const StepIcon = activeStep.icon;
  const canContinue =
    step === 1 ||
    (step === 2 && Boolean(finalServiceType)) ||
    (step === 3 && Boolean(clientType)) ||
    (step === 4 && Boolean(valueProp.trim())) ||
    (step === 5 && Boolean(pricingTier));

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
      version: 1,
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
    tone,
    valueProp,
  ]);

  const previewJson = useMemo(() => JSON.stringify(setupProfile, null, 2), [setupProfile]);

  const applyPreset = (preset: SetupPreset) => {
    setSelectedPreset(preset.id);
    setServiceType(preset.serviceType);
    setServiceOther("");
    setClientType(preset.clientType);
    setPricingTier(preset.pricingTier);
    setValueProp(preset.valueProp);
    setProofPoint(preset.proofPoint);
    setCtaType(preset.ctaType);
    setTone(preset.tone);
    setError(null);
  };

  const saveProfile = async (skip = false) => {
    try {
      setSaving(true);
      setError(null);

      const skippedSetupProfile = {
        version: 1,
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
      const messages: Record<Step, string> = {
        1: "Choose a preset or continue with a blank workspace.",
        2: "Choose what you sell to continue.",
        3: "Choose your first buyer type.",
        4: "Add the outcome you help clients get.",
        5: "Choose the deal size you want to prioritize.",
      };
      setError(messages[step]);
      return;
    }

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f4f8ff] text-[#142033]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-12 h-72 w-72 rounded-full bg-[#bfdbfe]/70 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#dbeafe]/80 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#ccfbf1]/50 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-white shadow-sm ring-1 ring-[#d8e3f2]">
              <Sparkles className="h-5 w-5 text-[#2563eb]" />
            </div>
            <div>
              <p className="font-display text-lg font-black text-[#0f172a]">GlobaLeads22</p>
              <p className="text-xs font-semibold text-[#64748b]">Workspace setup</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void saveProfile(true)}
            disabled={saving}
            className="rounded-[12px] border border-[#cbd8ea] bg-white/75 px-4 py-2 text-sm font-semibold text-[#52637a] shadow-sm backdrop-blur transition-colors hover:border-[#9fb2cc] hover:text-[#162033] disabled:opacity-50"
          >
            Skip for now
          </button>
        </header>

        <div className="mt-7 grid flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-white/70 bg-white/60 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="space-y-2">
              {([1, 2, 3, 4, 5] as Step[]).map(item => {
                const itemMeta = stepMeta[item];
                const ItemIcon = itemMeta.icon;
                const active = item === step;
                const complete = item < step;

                return (
                  <div
                    key={item}
                    className={`flex items-center gap-3 rounded-[18px] p-3 transition-colors ${active ? "bg-[#0f172a] text-white shadow-lg shadow-[#0f172a]/10" : complete ? "bg-[#e8f7ee] text-[#17623b]" : "text-[#64748b]"}`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${active ? "bg-white/12 text-white" : complete ? "bg-white text-[#17623b]" : "bg-white text-[#2563eb]"}`}>
                      {complete ? <Check className="h-4 w-4" /> : <ItemIcon className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{itemMeta.navLabel}</p>
                      <p className={`text-xs ${active ? "text-white/65" : "text-[#7a8ca5]"}`}>Step {item} of 5</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-[22px] bg-[#eaf3ff] p-4">
              <p className="text-sm font-black text-[#0f172a]">Your setup powers</p>
              <div className="mt-3 space-y-3">
                {SETUP_FEATURES.map(feature => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div key={feature.label} className="flex gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[12px] bg-white text-[#2563eb]">
                        <FeatureIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-black text-[#172033]">{feature.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[#60728d]">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="rounded-[32px] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur sm:p-7 lg:p-9">
            <div className="flex min-h-[690px] flex-col">
              <section className="flex items-start justify-between gap-5">
                <div>
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-[20px] bg-[#eaf3ff] text-[#2563eb]">
                    <StepIcon className="h-6 w-6" />
                  </div>
                  <h1 className="max-w-2xl font-display text-4xl font-black leading-tight text-[#0f172a] sm:text-5xl">
                    {activeStep.title}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#60728d]">
                    {activeStep.description}
                  </p>
                </div>
                <div className="hidden rounded-[18px] bg-[#f1f5f9] px-4 py-3 text-right sm:block">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">Setup profile</p>
                  <p className="mt-1 text-sm font-black text-[#0f172a]">Saved as JSON</p>
                </div>
              </section>

              <div className="mt-8 flex-1">
                {step === 1 && (
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
                    <div>
                      <p className="text-sm font-black text-[#0f172a]">Start with a preset</p>
                      <p className="mt-1 text-sm leading-6 text-[#64748b]">
                        Presets are only starting points. They prefill the setup so you can adjust the details in the next steps.
                      </p>
                      <div className="mt-4 grid gap-3">
                        {SETUP_PRESETS.map(preset => {
                          const PresetIcon = preset.icon;
                          const selected = selectedPreset === preset.id;

                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => applyPreset(preset)}
                              className={`group rounded-[24px] border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${selected ? "border-[#2563eb] bg-[#eaf3ff] shadow-lg shadow-[#2563eb]/10" : "border-[#dbe5f2] bg-white hover:border-[#aebfd5]"}`}
                            >
                              <div className="flex items-start gap-4">
                                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[18px] ${selected ? "bg-[#2563eb] text-white" : "bg-[#f1f5f9] text-[#2563eb]"}`}>
                                  <PresetIcon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0">
                                  <span className="flex items-center gap-2 text-base font-black text-[#0f172a]">
                                    {preset.label}
                                    {selected && <Check className="h-4 w-4 text-[#2563eb]" />}
                                  </span>
                                  <span className="mt-1 block text-sm leading-6 text-[#60728d]">{preset.description}</span>
                                  <span className="mt-3 flex flex-wrap gap-2">
                                    <SmallChip>{preset.serviceType}</SmallChip>
                                    <SmallChip>{preset.pricingTier === "premium" ? "Premium deals" : "Growth deals"}</SmallChip>
                                    <SmallChip>{preset.ctaType === "send_audit" ? "Audit CTA" : preset.ctaType === "book_call" ? "Booking CTA" : "Reply CTA"}</SmallChip>
                                  </span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-[#0f172a] p-5 text-white">
                      <p className="font-display text-2xl font-black">What happens next</p>
                      <div className="mt-5 space-y-4">
                        {[
                          "We build your lead search defaults.",
                          "We remember your preferred buyer and deal size.",
                          "We give AI the context it needs before writing emails.",
                          "We save the whole setup in one JSON profile.",
                        ].map((item, index) => (
                          <div key={item} className="flex gap-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-[#bfdbfe]">
                              {index + 1}
                            </span>
                            <p className="text-sm leading-6 text-white/78">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Your name" value={fullName} onChange={setFullName} placeholder="Sofia Almeida" />
                      <Field label="Your role" value={roleTitle} onChange={setRoleTitle} placeholder="Founder, Sales lead..." />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Company name" value={companyName} onChange={setCompanyName} placeholder="Northstar Studio" />
                      <Field label="Company website" value={companyWebsite} onChange={setCompanyWebsite} placeholder="https://example.com" />
                    </div>
                    <Field label="Phone" value={phone} onChange={setPhone} placeholder="Optional" />

                    <div>
                      <p className="mb-3 text-sm font-black text-[#111827]">What do you sell?</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {SERVICE_TYPES.map((service) => (
                          <ChoiceButton
                            key={service}
                            selected={serviceType === service}
                            label={service}
                            onClick={() => {
                              setServiceType(service);
                              setServiceOther("");
                              setSelectedPreset(current => current && service !== SETUP_PRESETS.find(preset => preset.id === current)?.serviceType ? "custom" : current);
                              setError(null);
                            }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setServiceType("Other");
                          setSelectedPreset("custom");
                          setError(null);
                        }}
                        className={`mt-2 h-12 w-full rounded-[14px] border px-4 text-left text-sm font-bold transition-colors ${serviceType === "Other" ? "border-[#2563eb] bg-[#eef5ff] text-[#1d4ed8]" : "border-[#dbe4f0] bg-[#f8fafc] text-[#334155] hover:border-[#b9c8dc]"}`}
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
                          className="mt-2 h-12 w-full rounded-[14px] border border-[#dbe4f0] bg-white px-4 text-sm text-[#162033] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb]"
                        />
                      )}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CLIENT_TYPES.map((option) => {
                        const Icon = option.icon;
                        const selected = clientType === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setClientType(option.value);
                              setSelectedPreset("custom");
                              setError(null);
                            }}
                            className={`min-h-32 rounded-[20px] border p-4 text-left transition-colors ${selected ? "border-[#2563eb] bg-[#eef5ff]" : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#b9c8dc]"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className={`grid h-10 w-10 place-items-center rounded-[14px] ${selected ? "bg-[#2563eb] text-white" : "bg-white text-[#2563eb]"}`}>
                                <Icon className="h-5 w-5" />
                              </span>
                              {selected && <Check className="h-5 w-5 text-[#2563eb]" />}
                            </div>
                            <p className="mt-4 text-sm font-black text-[#111827]">{option.label}</p>
                            <p className="mt-1 text-sm leading-5 text-[#65758d]">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>

                    <Field label="Preferred market" value={location} onChange={setLocation} placeholder="United States, Mexico, Miami..." />

                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[20px] border border-[#dbe4f0] bg-[#f8fafc] p-4 text-sm text-[#52647d]">
                      <span>
                        <b className="block text-[#111827]">I can work outside my local area</b>
                        <span className="mt-1 block">Use this for remote-friendly services and broader searches.</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={sellsOnline}
                        onChange={(event) => setSellsOnline(event.target.checked)}
                        className="h-5 w-5 accent-[#2563eb]"
                      />
                    </label>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-black text-[#111827]">What outcome do you help clients get?</span>
                      <textarea
                        value={valueProp}
                        onChange={(event) => {
                          setValueProp(event.target.value);
                          setSelectedPreset("custom");
                        }}
                        placeholder="Example: We help local clinics turn outdated websites into booking-focused pages that bring in more patient inquiries."
                        className="h-28 w-full resize-none rounded-[18px] border border-[#dbe4f0] bg-[#f8fafc] p-4 text-sm leading-6 text-[#162033] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb]"
                      />
                    </label>

                    <Field label="Any proof we can mention?" value={proofPoint} onChange={setProofPoint} placeholder="Built 30+ websites for local service businesses" />

                    <div>
                      <p className="mb-3 text-sm font-black text-[#111827]">What should emails ask for?</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CTA_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setCtaType(option.value);
                              setSelectedPreset("custom");
                              setError(null);
                            }}
                            className={`min-h-20 rounded-[18px] border p-3 text-left transition-colors ${ctaType === option.value ? "border-[#2563eb] bg-[#eef5ff]" : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#b9c8dc]"}`}
                          >
                            <span className="text-sm font-black text-[#111827]">{option.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-[#65758d]">{option.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {(ctaType === "book_call" || ctaType === "custom") && (
                      <Field
                        label={ctaType === "book_call" ? "Booking link" : "Custom ask"}
                        value={ctaDetail}
                        onChange={setCtaDetail}
                        placeholder={ctaType === "book_call" ? "https://calendly.com/..." : "Ask if they want a 3-point homepage teardown"}
                      />
                    )}

                    <div>
                      <p className="mb-3 text-sm font-black text-[#111827]">Email tone</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {TONE_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setTone(option.value);
                              setSelectedPreset("custom");
                            }}
                            className={`rounded-[18px] border p-3 text-left transition-colors ${tone === option.value ? "border-[#2563eb] bg-[#eef5ff]" : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#b9c8dc]"}`}
                          >
                            <span className="text-sm font-black text-[#111827]">{option.label}</span>
                            <span className="mt-1 block text-xs text-[#65758d]">{option.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-3">
                        {PRICING_TIERS.map((tier) => (
                          <button
                            key={tier.value}
                            type="button"
                            onClick={() => {
                              setPricingTier(tier.value);
                              setSelectedPreset("custom");
                              setError(null);
                            }}
                            className={`min-h-28 rounded-[20px] border p-4 text-left transition-colors ${pricingTier === tier.value ? "border-[#2563eb] bg-[#eef5ff]" : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#b9c8dc]"}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-black text-[#111827]">{tier.label}</span>
                              {pricingTier === tier.value && <Check className="h-4 w-4 text-[#2563eb]" />}
                            </div>
                            <p className="mt-2 text-sm leading-5 text-[#65758d]">{tier.description}</p>
                          </button>
                        ))}
                      </div>

                      <div className="rounded-[24px] border border-[#dbe4f0] bg-[#f8fafc] p-5">
                        <p className="text-sm font-black text-[#111827]">Ready when you are</p>
                        <p className="mt-2 text-sm leading-6 text-[#65758d]">
                          We will save the setup profile below as JSON and also keep the older profile columns updated for search, pipeline, and email automation compatibility.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[24px] bg-[#0f172a] shadow-lg">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#93c5fd]">setup_profile.json</p>
                        <span className="rounded-full bg-[#22c55e]/15 px-2 py-1 text-xs font-bold text-[#86efac]">Live preview</span>
                      </div>
                      <pre className="max-h-[430px] overflow-auto p-4 text-xs leading-5 text-[#dbeafe]">
                        {previewJson}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-5 rounded-[14px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#b91c1c]">
                  {error}
                </div>
              )}

              <footer className="mt-8 flex items-center justify-between gap-3 border-t border-[#e7edf5] pt-5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                  disabled={step === 1 || saving}
                  className="min-w-24 border-[#dbe4f0] bg-white text-[#334155] hover:bg-[#f8fafc]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>

                <div className="flex items-center gap-3">
                  {step === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreset("custom");
                        setError(null);
                        setStep(2);
                      }}
                      className="hidden text-sm font-semibold text-[#64748b] hover:text-[#0f172a] sm:inline"
                    >
                      Start blank
                    </button>
                  )}
                  <Button
                    type="button"
                    variant="accent"
                    onClick={handleNext}
                    disabled={saving}
                    className="min-w-44 bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
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
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <label className="grid gap-1.5">
    <span className="text-sm font-black text-[#111827]">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-[14px] border border-[#dbe4f0] bg-[#f8fafc] px-4 text-sm text-[#162033] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb]"
    />
  </label>
);

const ChoiceButton = ({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-16 items-center justify-between gap-2 rounded-[16px] border px-3 py-3 text-left text-sm font-bold transition-colors ${selected ? "border-[#2563eb] bg-[#eef5ff] text-[#1d4ed8]" : "border-[#dbe4f0] bg-[#f8fafc] text-[#334155] hover:border-[#b9c8dc]"}`}
  >
    <span>{label}</span>
    {selected && <Check className="h-4 w-4 shrink-0" />}
  </button>
);

const SmallChip = ({ children }: { children: string }) => (
  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#52647d] ring-1 ring-[#dbe4f0]">
    {children}
  </span>
);

export default OnboardingModal;
