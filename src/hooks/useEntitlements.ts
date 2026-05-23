import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getPlanEntitlements, normalizePlan, type PlanKey } from "@/lib/entitlements";

interface UseEntitlementsReturn {
  plan: PlanKey;
  effectivePlan: PlanKey;
  organizationId: string | null;
  organizationName: string | null;
  subscriptionStatus: string;
  stripeSubscriptionId: string | null;
  includedCredits: number;
  fullSearchQuality: boolean;
  canCreateOrganization: boolean;
  workflowFeatures: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useEntitlements(userId: string | undefined, plan: string | null | undefined, isAdmin = false): UseEntitlementsReturn {
  const [effectivePlan, setEffectivePlan] = useState<PlanKey>(normalizePlan(plan));
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("none");
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ownPlan = normalizePlan(plan);

  const fetchEntitlements = async () => {
    if (!userId) {
      setEffectivePlan(ownPlan);
      setOrganizationId(null);
      setOrganizationName(null);
      setSubscriptionStatus("none");
      setStripeSubscriptionId(null);
      return;
    }

    setLoading(true);
    try {
      const [{ data: credits }, { data: membership }] = await Promise.all([
        supabase
          .from("user_credits")
          .select("plan, subscription_status, stripe_subscription_id")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("organization_memberships")
          .select("organization_id, organizations(id, name, plan, subscription_status)")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle(),
      ]);

      const org = Array.isArray(membership?.organizations)
        ? membership?.organizations[0]
        : membership?.organizations;
      const orgPlan = normalizePlan(org?.plan);
      const userPlan = normalizePlan(credits?.plan || plan);
      const nextPlan = org && orgPlan !== "free" ? orgPlan : userPlan;

      setEffectivePlan(nextPlan);
      setOrganizationId(org?.id || membership?.organization_id || null);
      setOrganizationName(org?.name || null);
      setSubscriptionStatus(credits?.subscription_status || org?.subscription_status || "none");
      setStripeSubscriptionId(credits?.stripe_subscription_id || null);
    } catch (error) {
      console.error("Failed to load entitlements:", error);
      setEffectivePlan(ownPlan);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEntitlements();
  }, [userId, plan]);

  const entitlements = getPlanEntitlements(effectivePlan, isAdmin);

  return {
    plan: ownPlan,
    effectivePlan,
    organizationId,
    organizationName,
    subscriptionStatus,
    stripeSubscriptionId,
    loading,
    refetch: fetchEntitlements,
    ...entitlements,
  };
}
