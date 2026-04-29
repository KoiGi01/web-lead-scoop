import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface CreditsModalProps {
    open: boolean;
    onClose: () => void;
    onSelectBundle: (bundleKey: string) => void;
    loading: boolean;
}

const BUNDLES = [
    { key: "starter", name: "Starter", price: 9, credits: 100, searches: 10 },
    { key: "growth",  name: "Growth",  price: 19, credits: 300, searches: 30, popular: true },
    { key: "pro",     name: "Pro",     price: 39, credits: 700, searches: 70 },
] as const;

const CreditsModal = ({ open, onClose, onSelectBundle, loading }: CreditsModalProps) => (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-[#EFEDE6]/10 bg-black">
            <div className="h-1 w-full bg-[#F5FF3D]" />
            <div className="p-6">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-xl font-heading font-bold text-[#EFEDE6] text-center">
                        Add <span className="text-[#F5FF3D]">Credits</span>
                    </DialogTitle>
                    <p className="text-sm text-[#A8A59C] text-center mt-1">
                        One-time purchase — no subscription, no expiry
                    </p>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-3">
                    {BUNDLES.map((b) => (
                        <button
                            key={b.key}
                            disabled={loading}
                            onClick={() => onSelectBundle(b.key)}
                            className={`relative flex flex-col items-center p-4 border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                                b.popular
                                    ? "border-[#F5FF3D] bg-[#F5FF3D]/5 hover:bg-[#F5FF3D]/10"
                                    : "border-[#EFEDE6]/10 hover:border-[#EFEDE6]/30 hover:bg-[#EFEDE6]/5"
                            }`}
                        >
                            {b.popular && (
                                <span className="absolute -top-2.5 font-mono text-[9px] uppercase tracking-widest bg-[#F5FF3D] text-black px-2 py-0.5">
                                    Popular
                                </span>
                            )}
                            <span className="font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] mb-2">
                                {b.name}
                            </span>
                            <span className="text-2xl font-bold text-[#EFEDE6]">${b.price}</span>
                            <span className="text-[#F5FF3D] font-mono text-sm font-semibold mt-1">
                                {b.credits} credits
                            </span>
                            <span className="text-[#67645B] font-mono text-[10px] mt-1">
                                {b.searches} searches
                            </span>
                            {loading && (
                                <Loader2 className="h-3 w-3 animate-spin mt-2 text-[#A8A59C]" />
                            )}
                        </button>
                    ))}
                </div>

                <p className="text-center text-[10px] font-mono text-[#67645B] mt-5 uppercase tracking-widest">
                    Secure payment via Stripe · 1 search = 10 credits
                </p>
            </div>
        </DialogContent>
    </Dialog>
);

export default CreditsModal;
