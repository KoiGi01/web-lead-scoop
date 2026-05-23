import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface CreditsModalProps {
  open: boolean;
  onClose: () => void;
  onSelectBundle: (bundleKey: string, checkoutType?: "topup" | "subscription") => void;
  loading: boolean;
}

const PLANS = [
  { key: "starter", name: "Starter", price: 9, credits: 100, searches: 10 },
  { key: "growth", name: "Growth", price: 19, credits: 300, searches: 30, popular: true },
  { key: "pro", name: "Pro", price: 39, credits: 700, searches: 70, note: "Org + priority" },
] as const;

const CreditsModal = ({ open, onClose, onSelectBundle, loading }: CreditsModalProps) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="overflow-hidden border border-[#EFEDE6]/10 bg-black p-0 sm:max-w-2xl">
      <div className="h-1 w-full bg-[#F5FF3D]" />
      <div className="p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-center font-heading text-xl font-bold text-[#EFEDE6]">
            Upgrade or add <span className="text-[#F5FF3D]">Credits</span>
          </DialogTitle>
          <p className="mt-1 text-center text-sm text-[#A8A59C]">
            Paid plans unlock full search quality. Top-ups add extra credits when you need more.
          </p>
        </DialogHeader>

        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Monthly plans</p>
        <div className="grid grid-cols-3 gap-3">
          {PLANS.map((plan) => (
            <button
              key={plan.key}
              disabled={loading}
              onClick={() => onSelectBundle(plan.key, "subscription")}
              className={`relative flex flex-col items-center border p-4 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                plan.popular
                  ? "border-[#F5FF3D] bg-[#F5FF3D]/5 hover:bg-[#F5FF3D]/10"
                  : "border-[#EFEDE6]/10 hover:border-[#EFEDE6]/30 hover:bg-[#EFEDE6]/5"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 bg-[#F5FF3D] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-black">
                  Popular
                </span>
              )}
              <span className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">{plan.name}</span>
              <span className="text-2xl font-bold text-[#EFEDE6]">${plan.price}</span>
              <span className="mt-1 font-mono text-sm font-semibold text-[#F5FF3D]">{plan.credits} cr/mo</span>
              <span className="mt-1 font-mono text-[10px] text-[#67645B]">{plan.searches} searches</span>
              {"note" in plan && plan.note && (
                <span className="mt-1 text-center font-mono text-[9px] uppercase tracking-widest text-[#A8A59C]">{plan.note}</span>
              )}
              {loading && <Loader2 className="mt-2 h-3 w-3 animate-spin text-[#A8A59C]" />}
            </button>
          ))}
        </div>

        <p className="mb-3 mt-6 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Credit top-ups</p>
        <div className="grid grid-cols-3 gap-3">
          {PLANS.map((bundle) => (
            <button
              key={`topup-${bundle.key}`}
              disabled={loading}
              onClick={() => onSelectBundle(bundle.key, "topup")}
              className="relative flex flex-col items-center border border-[#EFEDE6]/10 p-3 transition-all hover:border-[#EFEDE6]/30 hover:bg-[#EFEDE6]/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">{bundle.name}</span>
              <span className="mt-1 text-lg font-bold text-[#EFEDE6]">${bundle.price}</span>
              <span className="mt-1 font-mono text-xs font-semibold text-[#F5FF3D]">{bundle.credits} credits</span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
          Secure payment via Stripe · Searches start at 5 credits
        </p>
      </div>
    </DialogContent>
  </Dialog>
);

export default CreditsModal;
