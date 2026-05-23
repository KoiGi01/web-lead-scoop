import { useState } from "react";
import { Building2, CreditCard, Loader2, LogOut, Mail, Zap } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PLAN_LABELS, type PlanKey } from "@/lib/entitlements";

interface SettingsCreditsProps {
  user: User | null;
  creditsBalance: number;
  creditsTotal: number;
  isAdmin?: boolean;
  plan: PlanKey;
  organizationName: string | null;
  organizationId: string | null;
  canCreateOrganization: boolean;
  onBuyCredits: () => void;
  onSignOut: () => void;
  onOrganizationCreated: () => void;
}

const SettingsCredits = ({
  user,
  creditsBalance,
  creditsTotal,
  isAdmin = false,
  plan,
  organizationName,
  organizationId,
  canCreateOrganization,
  onBuyCredits,
  onSignOut,
  onOrganizationCreated,
}: SettingsCreditsProps) => {
  const [orgName, setOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) return;
    setCreatingOrg(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "create_organization", name: orgName.trim() },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Could not create organization");
      toast({ title: "Organization created", description: `${orgName.trim()} is ready.` });
      setOrgName("");
      onOrganizationCreated();
    } catch (error) {
      toast({
        title: "Organization error",
        description: error instanceof Error ? error.message : "Could not create organization.",
        variant: "destructive",
      });
    } finally {
      setCreatingOrg(false);
    }
  };

  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-black text-[#EFEDE6]">
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
        <div className="mb-3 border-b border-[#EFEDE6]/[0.14] pb-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#F5FF3D]">Settings & Credits</p>
          <h2 className="font-display text-2xl font-black leading-none tracking-[-0.04em] text-[#EFEDE6]">
            Account
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-[#EFEDE6]/10 bg-black">
                <Mail className="h-4 w-4 text-[#F5FF3D]" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Signed in as</p>
                <p className="truncate text-sm font-semibold text-[#EFEDE6]">{user?.email || "No account"}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-[#EFEDE6]/10 bg-black p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Role</p>
                <p className="mt-2 font-display text-xl font-bold text-[#EFEDE6]">{isAdmin ? "Admin" : "Workspace user"}</p>
              </div>
              <div className="border border-[#EFEDE6]/10 bg-black p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Plan</p>
                <p className="mt-2 font-display text-xl font-bold text-[#EFEDE6]">{PLAN_LABELS[plan]}</p>
              </div>
              <div className="border border-[#EFEDE6]/10 bg-black p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Plan credits</p>
                <p className="mt-2 font-display text-xl font-bold text-[#EFEDE6]">{creditsTotal}</p>
              </div>
            </div>

            <div className="mt-4 border border-[#EFEDE6]/10 bg-black p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#F5FF3D]" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Organization</p>
              </div>
              {organizationId ? (
                <div>
                  <p className="font-display text-lg font-bold text-[#EFEDE6]">{organizationName || "Organization"}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{organizationId}</p>
                </div>
              ) : canCreateOrganization ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={orgName}
                    onChange={(event) => setOrgName(event.target.value)}
                    placeholder="Company or team name"
                    className="h-10 flex-1 border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]"
                  />
                  <button
                    onClick={handleCreateOrganization}
                    disabled={creatingOrg || !orgName.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 border border-[#F5FF3D] px-4 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D] disabled:opacity-40"
                  >
                    {creatingOrg && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create org
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#A8A59C]">Upgrade to Pro to create an organization.</p>
              )}
            </div>

            {user && (
              <button
                onClick={onSignOut}
                className="mt-5 inline-flex h-10 items-center gap-2 border border-[#EFEDE6]/10 px-4 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] hover:border-red-400/50 hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            )}
          </section>

          <aside className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-[#F5FF3D]/40 bg-[#F5FF3D]/10">
                <Zap className="h-4 w-4 text-[#F5FF3D]" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Available credits</p>
                <p className="font-display text-3xl font-black text-[#EFEDE6]">{creditsBalance}</p>
              </div>
            </div>

            <div className="mb-5 h-1.5 bg-[#EFEDE6]/10">
              <div
                className="h-full bg-[#F5FF3D]"
                style={{ width: `${creditsTotal > 0 ? Math.min(100, (creditsBalance / creditsTotal) * 100) : 0}%` }}
              />
            </div>

            <button
              onClick={onBuyCredits}
              className="inline-flex h-11 w-full items-center justify-center gap-2 border border-[#F5FF3D] bg-[#F5FF3D] px-4 font-display text-sm font-bold text-black hover:bg-[#FFFE7A]"
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
