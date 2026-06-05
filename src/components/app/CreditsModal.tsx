import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface CreditsModalProps {
  open: boolean;
  onClose: () => void;
  onSelectBundle: (bundleKey: string, checkoutType?: "topup" | "subscription") => void;
  loading: boolean;
}

const PLANS = [
  { key: "starter", name: "Starter", price: 19, founderPrice: 9.5, credits: 150, searches: 15, note: "Full app access", founderEligible: true },
  { key: "growth", name: "Growth", price: 49, founderPrice: 24.5, credits: 500, searches: 50, note: "Full app access", popular: true, founderEligible: true },
  { key: "pro", name: "Pro", price: 99, credits: 1500, searches: 150, note: "Team seats coming soon", comingSoon: true },
] as const;

const TOPUPS = [
  { key: "starter", name: "Small", price: 10, credits: 100 },
  { key: "growth", name: "Medium", price: 25, credits: 300, popular: true },
  { key: "pro", name: "Large", price: 59, credits: 800 },
] as const;

const CreditsModal = ({ open, onClose, onSelectBundle, loading }: CreditsModalProps) => {
  const [founderSpots, setFounderSpots] = useState<{ enabled: boolean; remaining: number; total: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    supabase.functions.invoke("founder-offer")
      .then(({ data }) => {
        if (!cancelled && data) setFounderSpots(data as { enabled: boolean; remaining: number; total: number });
      })
      .catch(() => {
        if (!cancelled) setFounderSpots(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="overflow-hidden border border-[#f3f5f8]/10 bg-black p-0 sm:max-w-3xl">
        <div className="h-1 w-full bg-[#e8fb52]" />
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-center font-heading text-xl font-bold text-[#f3f5f8]">
              Upgrade or add <span className="text-[#e8fb52]">Credits</span>
            </DialogTitle>
            <DialogDescription className="mt-1 text-center text-sm text-[#9aa3b2]">
              Starter and Growth unlock the full app workspace. Top-ups add extra credits when you need more.
            </DialogDescription>
            {founderSpots?.enabled && (
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-[#e8fb52]">
                Founder deal: {founderSpots.remaining} of {founderSpots.total} spots left - 50% off Starter and Growth for 3 months
              </p>
            )}
          </DialogHeader>

          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Monthly plans</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const showFounder = founderSpots?.enabled && "founderEligible" in plan && plan.founderEligible;
              const comingSoon = "comingSoon" in plan && plan.comingSoon;

              return (
                <button
                  key={plan.key}
                  disabled={loading || comingSoon}
                  onClick={() => {
                    if (!comingSoon) onSelectBundle(plan.key, "subscription");
                  }}
                  className={`relative flex min-h-[190px] flex-col items-center border p-4 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan.popular
                      ? "border-[#e8fb52] bg-[#e8fb52]/5 hover:bg-[#e8fb52]/10"
                      : "border-[#f3f5f8]/10 hover:border-[#f3f5f8]/30 hover:bg-[#f3f5f8]/5"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 bg-[#e8fb52] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-black">
                      Popular
                    </span>
                  )}
                  <span className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2]">{plan.name}</span>
                  {showFounder ? (
                    <>
                      <span className="font-mono text-[10px] text-[#5d6675] line-through">${plan.price}/mo</span>
                      <span className="text-2xl font-bold text-[#f3f5f8]">${plan.founderPrice}</span>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">Founder 3 months</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-[#f3f5f8]">${plan.price}</span>
                  )}
                  <span className="mt-2 font-mono text-sm font-semibold text-[#e8fb52]">{plan.credits} cr/mo</span>
                  <span className="mt-1 font-mono text-[10px] text-[#5d6675]">{plan.searches} searches</span>
                  {"note" in plan && plan.note && (
                    <span className="mt-1 text-center font-mono text-[9px] uppercase tracking-widest text-[#9aa3b2]">{plan.note}</span>
                  )}
                  {comingSoon && (
                    <span className="mt-3 border border-[#e8fb52]/50 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">
                      Coming Soon
                    </span>
                  )}
                  {loading && <Loader2 className="mt-2 h-3 w-3 animate-spin text-[#9aa3b2]" />}
                </button>
              );
            })}
          </div>

          <p className="mb-3 mt-6 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Credit top-ups</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {TOPUPS.map((bundle) => (
              <button
                key={`topup-${bundle.key}`}
                disabled={loading}
                onClick={() => onSelectBundle(bundle.key, "topup")}
                className="relative flex min-h-[104px] flex-col items-center border border-[#f3f5f8]/10 p-3 transition-all hover:border-[#f3f5f8]/30 hover:bg-[#f3f5f8]/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2]">{bundle.name}</span>
                <span className="mt-1 text-lg font-bold text-[#f3f5f8]">${bundle.price}</span>
                <span className="mt-1 font-mono text-xs font-semibold text-[#e8fb52]">{bundle.credits} credits</span>
              </button>
            ))}
          </div>

          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
            Secure payment via Stripe - Searches start at 5 credits
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditsModal;
