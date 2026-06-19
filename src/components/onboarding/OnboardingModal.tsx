import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  Globe2,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { serializeOutreachProfile, type OutreachCtaType, type OutreachTone } from "@/lib/outreachProfile";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

type Step = 1 | 2 | 3 | 4;

const SERVICE_TYPES = [
  "Marketing",
  "Web Design",
  "SEO",
  "Lead Generation",
  "Automation",
  "Consulting",
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

const stepMeta: Record<Step, { title: string; description: string; icon: typeof UserRound }> = {
  1: {
    title: "Welcome. Let's set up your workspace.",
    description: "A few details help GlobaLeads find better prospects and write emails that sound like you.",
    icon: UserRound,
  },
  2: {
    title: "Who should we look for?",
    description: "Choose the kind of customers you want first. You can still search any niche later.",
    icon: Target,
  },
  3: {
    title: "How should AI write for you?",
    description: "This becomes the base context for discovery emails, follow-ups, and quick audits.",
    icon: Mail,
  },
  4: {
    title: "Set your deal fit.",
    description: "Tell us the kind of opportunity that is worth prioritizing.",
    icon: ShieldCheck,
  },
};

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
  const [valueProp, setValueProp] = useState("");
  const [proofPoint, setProofPoint] = useState("");
  const [ctaType, setCtaType] = useState<OutreachCtaType>("reply");
  const [ctaDetail, setCtaDetail] = useState("");
  const [tone, setTone] = useState<OutreachTone>("direct");

  const finalServiceType = serviceType === "Other" ? serviceOther.trim() : serviceType;
  const activeStep = stepMeta[step];
  const StepIcon = activeStep.icon;
  const canContinue =
    (step === 1 && Boolean(finalServiceType)) ||
    (step === 2 && Boolean(clientType)) ||
    (step === 3 && Boolean(valueProp.trim())) ||
    (step === 4 && Boolean(pricingTier));

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
        outreach_profile: skip
          ? serializeOutreachProfile({ valueProp: "", proofPoint: "", ctaType: "reply", ctaDetail: "", tone: "direct" })
          : serializeOutreachProfile({ valueProp, proofPoint, ctaType, ctaDetail, tone }),
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
        1: "Choose what you sell to continue.",
        2: "Choose your first buyer type.",
        3: "Add the outcome you help clients get.",
        4: "Choose the deal size you want to prioritize.",
      };
      setError(messages[step]);
      return;
    }

    if (step < 4) {
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
      <DialogContent className="max-h-[94vh] overflow-hidden border border-[#d9e4f2] bg-[#f7f9fc] p-0 text-[#162033] shadow-2xl sm:max-w-4xl">
        <div className="grid max-h-[94vh] overflow-y-auto lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="bg-[#e9f2ff] p-6 text-[#1f3454] lg:min-h-[650px]">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-white shadow-sm">
                <Sparkles className="h-5 w-5 text-[#3b82f6]" />
              </div>
              <div>
                <p className="font-display text-lg font-black text-[#10223b]">GlobaLeads22</p>
                <p className="text-xs text-[#5c6f8d]">First-run setup</p>
              </div>
            </div>

            <div className="mt-10 space-y-3">
              {([1, 2, 3, 4] as Step[]).map(item => {
                const itemMeta = stepMeta[item];
                const ItemIcon = itemMeta.icon;
                const active = step === item;
                const complete = item < step;
                return (
                  <div
                    key={item}
                    className={`flex items-center gap-3 rounded-[14px] p-3 transition-colors ${active ? "bg-white text-[#10223b] shadow-sm" : "text-[#6f819d]"}`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] ${complete ? "bg-[#d8f7dc] text-[#24703b]" : active ? "bg-[#e9f2ff] text-[#2563eb]" : "bg-white/65 text-[#8aa0bd]"}`}>
                      {complete ? <Check className="h-4 w-4" /> : <ItemIcon className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{itemMeta.title.replace("Welcome. ", "").replace("Let's set up your workspace.", "Workspace")}</p>
                      <p className="text-xs text-[#7c8da7]">Step {item} of 4</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 rounded-[16px] bg-white/65 p-4">
              <p className="text-sm font-bold text-[#10223b]">Why this matters</p>
              <p className="mt-2 text-sm leading-6 text-[#60728d]">
                Your answers shape lead scoring, email drafts, and the default outreach angle.
              </p>
            </div>
          </aside>

          <main className="bg-white p-6 sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <DialogHeader className="space-y-2 text-left">
                <div className="mb-2 grid h-12 w-12 place-items-center rounded-[16px] bg-[#eef5ff] text-[#2563eb]">
                  <StepIcon className="h-5 w-5" />
                </div>
                <DialogTitle className="font-display text-3xl font-black leading-tight text-[#111827]">
                  {activeStep.title}
                </DialogTitle>
                <DialogDescription className="max-w-xl text-sm leading-6 text-[#65758d]">
                  {activeStep.description}
                </DialogDescription>
              </DialogHeader>
              <button
                type="button"
                onClick={() => void saveProfile(true)}
                disabled={saving}
                className="rounded-[10px] border border-[#dbe4f0] px-3 py-2 text-xs font-semibold text-[#65758d] transition-colors hover:border-[#b9c8dc] hover:text-[#162033] disabled:opacity-50"
              >
                Skip
              </button>
            </div>

            {step === 1 && (
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
                  <p className="mb-3 text-sm font-bold text-[#111827]">What do you sell?</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SERVICE_TYPES.map((service) => (
                      <ChoiceButton
                        key={service}
                        selected={serviceType === service}
                        label={service}
                        onClick={() => {
                          setServiceType(service);
                          setServiceOther("");
                          setError(null);
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceType("Other");
                      setError(null);
                    }}
                    className={`mt-2 h-12 w-full rounded-[12px] border px-4 text-left text-sm font-semibold transition-colors ${serviceType === "Other" ? "border-[#2563eb] bg-[#eef5ff] text-[#1d4ed8]" : "border-[#dbe4f0] bg-[#f8fafc] text-[#334155] hover:border-[#b9c8dc]"}`}
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
                      className="mt-2 h-12 w-full rounded-[12px] border border-[#dbe4f0] bg-white px-4 text-sm text-[#162033] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb]"
                    />
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
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
                          setError(null);
                        }}
                        className={`min-h-32 rounded-[16px] border p-4 text-left transition-colors ${selected ? "border-[#2563eb] bg-[#eef5ff]" : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#b9c8dc]"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className={`grid h-10 w-10 place-items-center rounded-[12px] ${selected ? "bg-[#2563eb] text-white" : "bg-white text-[#2563eb]"}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          {selected && <Check className="h-5 w-5 text-[#2563eb]" />}
                        </div>
                        <p className="mt-4 text-sm font-bold text-[#111827]">{option.label}</p>
                        <p className="mt-1 text-sm leading-5 text-[#65758d]">{option.description}</p>
                      </button>
                    );
                  })}
                </div>

                <Field label="Preferred market" value={location} onChange={setLocation} placeholder="United States, Mexico, Miami..." />

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[16px] border border-[#dbe4f0] bg-[#f8fafc] p-4 text-sm text-[#52647d]">
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

            {step === 3 && (
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#111827]">What outcome do you help clients get?</span>
                  <textarea
                    value={valueProp}
                    onChange={(event) => setValueProp(event.target.value)}
                    placeholder="Example: We help local clinics turn outdated websites into booking-focused pages that bring in more patient inquiries."
                    className="h-28 w-full resize-none rounded-[14px] border border-[#dbe4f0] bg-[#f8fafc] p-4 text-sm leading-6 text-[#162033] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb]"
                  />
                </label>

                <Field label="Any proof we can mention?" value={proofPoint} onChange={setProofPoint} placeholder="Built 30+ websites for local service businesses" />

                <div>
                  <p className="mb-3 text-sm font-bold text-[#111827]">What should emails ask for?</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CTA_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setCtaType(option.value);
                          setError(null);
                        }}
                        className={`min-h-20 rounded-[14px] border p-3 text-left transition-colors ${ctaType === option.value ? "border-[#2563eb] bg-[#eef5ff]" : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#b9c8dc]"}`}
                      >
                        <span className="text-sm font-bold text-[#111827]">{option.label}</span>
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
                  <p className="mb-3 text-sm font-bold text-[#111827]">Email tone</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {TONE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTone(option.value)}
                        className={`rounded-[14px] border p-3 text-left transition-colors ${tone === option.value ? "border-[#2563eb] bg-[#eef5ff]" : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#b9c8dc]"}`}
                      >
                        <span className="text-sm font-bold text-[#111827]">{option.label}</span>
                        <span className="mt-1 block text-xs text-[#65758d]">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {PRICING_TIERS.map((tier) => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => {
                        setPricingTier(tier.value);
                        setError(null);
                      }}
                      className={`min-h-28 rounded-[16px] border p-4 text-left transition-colors ${pricingTier === tier.value ? "border-[#2563eb] bg-[#eef5ff]" : "border-[#dbe4f0] bg-[#f8fafc] hover:border-[#b9c8dc]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#111827]">{tier.label}</span>
                        {pricingTier === tier.value && <Check className="h-4 w-4 text-[#2563eb]" />}
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[#65758d]">{tier.description}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-[18px] border border-[#dbe4f0] bg-[#f8fafc] p-5">
                  <p className="text-sm font-bold text-[#111827]">Ready when you are</p>
                  <p className="mt-2 text-sm leading-6 text-[#65758d]">
                    Your workspace will use these answers to rank leads, organize your first campaigns, and draft more relevant outreach.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-[12px] border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#b91c1c]">
                {error}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#e7edf5] pt-5">
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

              <Button
                type="button"
                variant="accent"
                onClick={handleNext}
                disabled={saving}
                className="min-w-40 bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : step === 4 ? (
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
          </main>
        </div>
      </DialogContent>
    </Dialog>
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
    <span className="text-sm font-bold text-[#111827]">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-[12px] border border-[#dbe4f0] bg-[#f8fafc] px-4 text-sm text-[#162033] outline-none transition-colors placeholder:text-[#94a3b8] focus:border-[#2563eb]"
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
    className={`flex min-h-16 items-center justify-between gap-2 rounded-[14px] border px-3 py-3 text-left text-sm font-semibold transition-colors ${selected ? "border-[#2563eb] bg-[#eef5ff] text-[#1d4ed8]" : "border-[#dbe4f0] bg-[#f8fafc] text-[#334155] hover:border-[#b9c8dc]"}`}
  >
    <span>{label}</span>
    {selected && <Check className="h-4 w-4 shrink-0" />}
  </button>
);

export default OnboardingModal;
