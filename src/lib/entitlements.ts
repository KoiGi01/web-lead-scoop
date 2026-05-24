export type PlanKey = "free" | "starter" | "growth" | "pro";
export type SearchDepth = "simple" | "normal" | "deep";

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "growth", "pro"];

export const PLAN_CREDITS: Record<PlanKey, number> = {
  free: 30,
  starter: 150,
  growth: 500,
  pro: 1500,
};

export const PLAN_LABELS: Record<PlanKey, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

export const normalizePlan = (plan?: string | null): PlanKey => {
  if (plan === "starter" || plan === "growth" || plan === "pro") return plan;
  return "free";
};

export const isPaidPlan = (plan?: string | null) => normalizePlan(plan) !== "free";

export const getIncludedCredits = (plan?: string | null) => PLAN_CREDITS[normalizePlan(plan)];

export const canUseSearchQuality = (
  plan: string | null | undefined,
  depth: SearchDepth,
  enrichMode: boolean,
  isAdmin = false,
) => {
  if (isAdmin || isPaidPlan(plan)) return true;
  return depth === "simple" && !enrichMode;
};

export const getPlanEntitlements = (plan?: string | null, isAdmin = false) => {
  const normalized = normalizePlan(plan);
  const paid = isPaidPlan(normalized);
  return {
    plan: normalized,
    label: PLAN_LABELS[normalized],
    includedCredits: PLAN_CREDITS[normalized],
    fullSearchQuality: isAdmin || paid,
    canCreateOrganization: isAdmin,
    earlyAccess: isAdmin || normalized === "pro",
    prioritySupport: isAdmin || normalized === "pro",
    workflowFeatures: isAdmin || paid,
  };
};
