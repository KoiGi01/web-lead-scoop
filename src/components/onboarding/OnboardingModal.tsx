import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { serializeOutreachProfile } from "@/lib/outreachProfile";
import { track } from "@/lib/analytics";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ["Offer", "Market", "Problem", "Email", "Sender"] as const;

export function OnboardingModal({ open, onClose, userId }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One natural-language answer per question.
  const [offer, setOffer] = useState("");        // Q1 — what you sell + ideal customer
  const [market, setMarket] = useState("");       // Q2 — where to find customers
  const [problem, setProblem] = useState("");      // Q3 — problem you solve
  const [emailAsk, setEmailAsk] = useState("");     // Q4 — what the first email asks for
  const [fullName, setFullName] = useState("");     // Q5 — sender name
  const [companyName, setCompanyName] = useState(""); // Q5 — sender company

  const firstFieldRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const progress = Math.round((step / 5) * 100);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDir(1);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Let the entrance animation settle before grabbing focus.
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 360);
    return () => window.clearTimeout(id);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const loadAuthDefaults = async () => {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata || {};
      const name =
        metadata.full_name ||
        metadata.name ||
        [metadata.given_name, metadata.family_name].filter(Boolean).join(" ");

      if (typeof name === "string" && name.trim()) setFullName((current) => current || name.trim());
      if (typeof metadata.company_name === "string" && metadata.company_name.trim()) {
        setCompanyName((current) => current || metadata.company_name.trim());
      }
    };
    void loadAuthDefaults();
  }, [open]);

  // Map the five answers onto the existing profile shape. Anything not asked
  // keeps a safe default so downstream code and `setup_profile` stay intact.
  const buildProfile = (skip: boolean) => {
    const offerText = offer.trim();
    const serviceType = skip || !offerText ? "Lead research" : offerText;

    const outreachProfile = serializeOutreachProfile({
      valueProp: skip ? "" : problem.trim(),
      proofPoint: "",
      ctaType: !skip && emailAsk.trim() ? "custom" : "reply",
      ctaDetail: skip ? "" : emailAsk.trim(),
      tone: "direct",
    });

    const setupProfile = {
      version: 3,
      preset: skip ? "skipped" : "custom",
      business: {
        fullName: fullName.trim(),
        roleTitle: "",
        companyName: companyName.trim(),
        companyWebsite: "",
      },
      offer: {
        serviceType,
        serviceOther: "",
        pricingTier: "mid_tier",
      },
      audience: {
        clientType: "any",
        targetCustomer: skip ? "" : offerText,
        location: skip ? "" : market.trim(),
        sellsOnline: true,
      },
      outreachProfile,
      ...(skip ? { skipped: true } : {}),
      completedAt: new Date().toISOString(),
    };

    return {
      id: userId,
      service_type: serviceType,
      service_other: null,
      full_name: fullName.trim() || null,
      role_title: null,
      company_name: companyName.trim() || null,
      company_website: null,
      phone: null,
      client_type: "any",
      pricing_tier: "mid_tier",
      location: skip ? null : market.trim() || null,
      sells_online: true,
      outreach_profile: outreachProfile,
      setup_profile: setupProfile as Json,
    };
  };

  const saveProfile = async (skip = false) => {
    try {
      setSaving(true);
      setError(null);

      const profile = buildProfile(skip);
      if (!profile.service_type || !profile.client_type || !profile.pricing_tier) {
        setError("Finish the required setup first.");
        return;
      }

      const { error: insertError } = await supabase.from("user_profiles").upsert(profile);
      if (insertError) {
        setError(insertError.message);
        return;
      }

      track("onboarding_completed", { skipped: skip });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your setup.");
    } finally {
      setSaving(false);
    }
  };

  const stepValid = useMemo(() => {
    switch (step) {
      case 1:
        return offer.trim().length > 0;
      case 2:
        return market.trim().length > 0;
      case 3:
        return problem.trim().length > 0;
      case 4:
        return emailAsk.trim().length > 0;
      case 5:
        return fullName.trim().length > 0 && companyName.trim().length > 0;
    }
  }, [step, offer, market, problem, emailAsk, fullName, companyName]);

  const stepError: Record<Step, string> = {
    1: "Tell us what you sell and who you sell it to.",
    2: "Add the place or market you want to find customers in.",
    3: "Describe the problem you solve.",
    4: "Say what the first email should ask for.",
    5: "Add the name and company emails should come from.",
  };

  const handleNext = () => {
    if (!stepValid) {
      setError(stepError[step]);
      return;
    }
    setError(null);
    if (step < 5) {
      setDir(1);
      setStep((s) => (s + 1) as Step);
      return;
    }
    void saveProfile();
  };

  const handleBack = () => {
    setError(null);
    setDir(-1);
    setStep((s) => Math.max(1, s - 1) as Step);
  };

  // Enter advances single-line fields; Cmd/Ctrl+Enter advances from anywhere.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const isTextarea = (e.target as HTMLElement).tagName === "TEXTAREA";
    if (!isTextarea || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      handleNext();
    }
  };

  if (!open) return null;

  const enterAnim = dir === 1 ? "gl-in-up" : "gl-in-down";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#08090c] text-[#f3f5f8]">
      <style>{`
        @keyframes glInUp { from { opacity: 0; transform: translateY(22px); filter: blur(8px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes glInDown { from { opacity: 0; transform: translateY(-22px); filter: blur(8px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes glRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glScan { from { transform: translateX(-101%); } to { transform: translateX(101%); } }
        @keyframes glSpin { to { transform: rotate(405deg); } }
        @keyframes glRail { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .gl-in-up > * { animation: glInUp .6s cubic-bezier(.16,1,.3,1) both; }
        .gl-in-down > * { animation: glInDown .6s cubic-bezier(.16,1,.3,1) both; }
        .gl-rise { animation: glRise .55s cubic-bezier(.16,1,.3,1) both; }
        .gl-scan { animation: glScan 1.1s cubic-bezier(.5,0,.2,1) both; }
        .gl-spin { animation: glSpin 60s linear infinite; transform-origin: center; }
        .gl-rail { animation: glRail .65s cubic-bezier(.16,1,.3,1) both; transform-origin: left center; }
        @media (prefers-reduced-motion: reduce) {
          .gl-in-up > *, .gl-in-down > *, .gl-rise, .gl-scan, .gl-spin, .gl-rail { animation: none !important; }
        }
      `}</style>

      {/* Quiet, logo-inspired geometry — a single slowly rotating square mark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-16vh] top-1/2 hidden h-[60vh] w-[60vh] -translate-y-1/2 lg:block"
      >
        <div className="gl-spin h-full w-full border border-[#e8fb52]/[0.07]" />
        <div className="gl-spin absolute inset-[14%] border border-[#e8fb52]/[0.05]" style={{ animationDuration: "90s", animationDirection: "reverse" }} />
      </div>

      <div className="relative flex h-screen flex-col">
        {/* Top progress rail doubles as the accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-[#e8fb52]/10">
          <div
            key={step}
            className="gl-rail h-px bg-[#e8fb52] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <header className="flex h-16 flex-shrink-0 items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-[6px] object-contain" />
            <p className="font-display text-[16px] font-extrabold tracking-[-0.02em]">
              GlobaLeads<sup className="font-mono text-[8px] font-semibold text-[#e8fb52]">22</sup>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveProfile(true)}
            disabled={saving}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b6472] transition-colors hover:text-[#f3f5f8] disabled:opacity-50"
          >
            Skip
          </button>
        </header>

        <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-5 sm:px-8 lg:px-12">
          {/* Step index */}
          <div className="flex flex-shrink-0 items-baseline gap-3 pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b6472]">
            <span className="text-[#e8fb52]">{String(step).padStart(2, "0")}</span>
            <span className="text-[#3a414e]">/ 05</span>
            <span className="text-[#5b6472]">{STEP_LABELS[step - 1]}</span>
          </div>

          {/* Question stage */}
          <div className="flex min-h-0 flex-1 items-center py-8 sm:py-10">
            <div key={step} className={`w-full ${enterAnim}`}>
              {step === 1 && (
                <Question prompt="What do you sell — and who is it for?">
                  <BigTextarea
                    ref={firstFieldRef as React.Ref<HTMLTextAreaElement>}
                    value={offer}
                    onChange={setOffer}
                    onKeyDown={onKeyDown}
                    placeholder="Websites for dental clinics and med spas that want more bookings."
                  />
                </Question>
              )}

              {step === 2 && (
                <Question prompt="Where do you want to find them?">
                  <BigInput
                    ref={firstFieldRef as React.Ref<HTMLInputElement>}
                    value={market}
                    onChange={setMarket}
                    onKeyDown={onKeyDown}
                    placeholder="Miami, United States, Mexico City…"
                  />
                </Question>
              )}

              {step === 3 && (
                <Question prompt="What problem do you solve for them?">
                  <BigTextarea
                    ref={firstFieldRef as React.Ref<HTMLTextAreaElement>}
                    value={problem}
                    onChange={setProblem}
                    onKeyDown={onKeyDown}
                    placeholder="Their site looks dated and loses visitors before they ever book."
                  />
                </Question>
              )}

              {step === 4 && (
                <Question prompt="What should the first email ask them to do?">
                  <BigTextarea
                    ref={firstFieldRef as React.Ref<HTMLTextAreaElement>}
                    value={emailAsk}
                    onChange={setEmailAsk}
                    onKeyDown={onKeyDown}
                    placeholder="Reply if they'd like a quick look at what's costing them bookings."
                  />
                </Question>
              )}

              {step === 5 && (
                <Question prompt="Who should the emails come from?">
                  <div className="mt-9 grid max-w-3xl gap-px overflow-hidden border border-[#f3f5f8]/[0.1] bg-[#f3f5f8]/[0.1] sm:grid-cols-2">
                    <LineField
                      ref={firstFieldRef as React.Ref<HTMLInputElement>}
                      label="Name"
                      value={fullName}
                      onChange={setFullName}
                      onKeyDown={onKeyDown}
                      placeholder="Alex Rivera"
                    />
                    <LineField
                      label="Company"
                      value={companyName}
                      onChange={setCompanyName}
                      onKeyDown={onKeyDown}
                      placeholder="Rivera Studio"
                    />
                  </div>
                </Question>
              )}
            </div>
          </div>

          {error && (
            <div className="flex-shrink-0 pb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#ff8a7c]">
              {error}
            </div>
          )}

          <footer className="flex flex-shrink-0 items-center justify-between pb-6 pt-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || saving}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#5b6472] transition-colors hover:text-[#f3f5f8] disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <Button
              type="button"
              variant="accent"
              onClick={handleNext}
              disabled={saving}
              className="group min-w-40 gap-2 bg-[#e8fb52] font-semibold text-[#08090c] hover:bg-[#f3ff8a]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : step === 5 ? (
                <>
                  Start finding customers
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </footer>
        </main>
      </div>
    </div>
  );
}

const Question = ({ prompt, children }: { prompt: string; children: React.ReactNode }) => (
  <div>
    <h1 className="max-w-4xl font-display text-[34px] font-extrabold leading-[1.02] tracking-[-0.035em] text-[#f3f5f8] sm:text-[52px] lg:text-[60px]">
      {prompt}
    </h1>
    {/* a single scanning line under each question reinforces the step change */}
    <div className="mt-6 h-px max-w-3xl overflow-hidden bg-[#f3f5f8]/[0.06]">
      <div className="gl-scan h-px w-full bg-gradient-to-r from-transparent via-[#e8fb52] to-transparent" />
    </div>
    {children}
  </div>
);

const fieldText =
  "w-full bg-transparent text-[#f3f5f8] outline-none placeholder:text-[#3a414e]";

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
}

const BigInput = forwardRef<HTMLInputElement, InputProps>(
  ({ value, onChange, onKeyDown, placeholder }, ref) => (
    <div className="mt-9 flex max-w-3xl items-center border-b border-[#f3f5f8]/[0.14] pb-3 transition-colors focus-within:border-[#e8fb52]">
      <span className="mr-4 h-7 w-1 flex-shrink-0 bg-[#e8fb52]" aria-hidden="true" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${fieldText} font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl`}
      />
    </div>
  ),
);
BigInput.displayName = "BigInput";

const BigTextarea = forwardRef<HTMLTextAreaElement, InputProps>(
  ({ value, onChange, onKeyDown, placeholder }, ref) => (
    <div className="mt-9 flex max-w-3xl gap-4 border-b border-[#f3f5f8]/[0.14] pb-3 transition-colors focus-within:border-[#e8fb52]">
      <span className="mt-2 h-7 w-1 flex-shrink-0 bg-[#e8fb52]" aria-hidden="true" />
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={2}
        className={`${fieldText} resize-none font-display text-2xl font-semibold leading-snug tracking-[-0.015em] sm:text-[28px]`}
      />
    </div>
  ),
);
BigTextarea.displayName = "BigTextarea";

const LineField = forwardRef<HTMLInputElement, InputProps & { label: string }>(
  ({ label, value, onChange, onKeyDown, placeholder }, ref) => (
    <label className="flex flex-col gap-2 bg-[#08090c] p-5 transition-colors focus-within:bg-[#0f1115]">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b6472]">{label}</span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${fieldText} font-display text-xl font-bold tracking-[-0.015em] sm:text-2xl`}
      />
    </label>
  ),
);
LineField.displayName = "LineField";

export default OnboardingModal;
