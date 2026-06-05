import { Building2, CreditCard, LogOut, Mail, Zap } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { PLAN_LABELS, type PlanKey } from "@/lib/entitlements";

interface SettingsCreditsProps {
  user: User | null;
  creditsBalance: number;
  creditsTotal: number;
  isAdmin?: boolean;
  plan: PlanKey;
  organizationName: string | null;
  organizationId: string | null;
  onBuyCredits: () => void;
  onSignOut: () => void;
}

const SettingsCredits = ({
  user,
  creditsBalance,
  creditsTotal,
  isAdmin = false,
  plan,
  organizationName,
  organizationId,
  onBuyCredits,
  onSignOut,
}: SettingsCreditsProps) => {
  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-black text-[#f3f5f8]">
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
        <div className="mb-3 border-b border-[#f3f5f8]/[0.14] pb-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#e8fb52]">Settings & Credits</p>
          <h2 className="font-display text-2xl font-black leading-none tracking-[-0.04em] text-[#f3f5f8]">
            Account
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border border-[#f3f5f8]/[0.14] bg-[#111319] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-[#f3f5f8]/10 bg-black">
                <Mail className="h-4 w-4 text-[#e8fb52]" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Signed in as</p>
                <p className="truncate text-sm font-semibold text-[#f3f5f8]">{user?.email || "No account"}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-[#f3f5f8]/10 bg-black p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Role</p>
                <p className="mt-2 font-display text-xl font-bold text-[#f3f5f8]">{isAdmin ? "Admin" : "Workspace user"}</p>
              </div>
              <div className="border border-[#f3f5f8]/10 bg-black p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Plan</p>
                <p className="mt-2 font-display text-xl font-bold text-[#f3f5f8]">{PLAN_LABELS[plan]}</p>
              </div>
              <div className="border border-[#f3f5f8]/10 bg-black p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Plan credits</p>
                <p className="mt-2 font-display text-xl font-bold text-[#f3f5f8]">{creditsTotal}</p>
              </div>
            </div>

            <div className="mt-4 border border-[#f3f5f8]/10 bg-black p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#e8fb52]" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Organization</p>
              </div>
              {organizationId ? (
                <div>
                  <p className="font-display text-lg font-bold text-[#f3f5f8]">{organizationName || "Organization"}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">{organizationId}</p>
                </div>
              ) : (
                <div className="border border-[#f3f5f8]/10 bg-[#0d0f13] p-3">
                  <p className="font-display text-base font-bold text-[#f3f5f8]">Team seats coming soon</p>
                  <p className="mt-1 text-sm leading-6 text-[#9aa3b2]">
                    Pro will add organization seats so multiple people can use the CRM together. This is not available yet.
                  </p>
                </div>
              )}
            </div>

            {user && (
              <button
                onClick={onSignOut}
                className="mt-5 inline-flex h-10 items-center gap-2 border border-[#f3f5f8]/10 px-4 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] hover:border-red-400/50 hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            )}
          </section>

          <aside className="border border-[#f3f5f8]/[0.14] bg-[#111319] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-[#e8fb52]/40 bg-[#e8fb52]/10">
                <Zap className="h-4 w-4 text-[#e8fb52]" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Available credits</p>
                <p className="font-display text-3xl font-black text-[#f3f5f8]">{creditsBalance}</p>
              </div>
            </div>

            <div className="mb-5 h-1.5 bg-[#f3f5f8]/10">
              <div
                className="h-full bg-[#e8fb52]"
                style={{ width: `${creditsTotal > 0 ? Math.min(100, (creditsBalance / creditsTotal) * 100) : 0}%` }}
              />
            </div>

            <button
              onClick={onBuyCredits}
              className="inline-flex h-11 w-full items-center justify-center gap-2 border border-[#e8fb52] bg-[#e8fb52] px-4 font-display text-sm font-bold text-black hover:bg-[#f3ff8a]"
            >
              <CreditCard className="h-4 w-4" /> Upgrade or top up
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default SettingsCredits;
