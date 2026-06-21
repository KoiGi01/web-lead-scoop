import type { Json, Database } from "@/integrations/supabase/types";
import { serializeOutreachProfile } from "@/lib/outreachProfile";

export type OnboardingSlots = {
  offer: string;
  market: string;
  problem: string;
  emailAsk: string;
  fullName: string;
  companyName: string;
};

export type UserProfileUpsert = Database["public"]["Tables"]["user_profiles"]["Insert"];

export const emptyOnboardingSlots = (): OnboardingSlots => ({
  offer: "",
  market: "",
  problem: "",
  emailAsk: "",
  fullName: "",
  companyName: "",
});

export const normalizeOnboardingSlots = (slots?: Partial<OnboardingSlots> | null): OnboardingSlots => ({
  ...emptyOnboardingSlots(),
  ...slots,
});

export function buildOnboardingProfile(
  userId: string,
  slots: OnboardingSlots,
  opts: { skip: boolean; completedAt?: string },
): UserProfileUpsert {
  const offerText = slots.offer.trim();
  const serviceType = opts.skip || !offerText ? "Lead research" : offerText;

  const outreachProfile = serializeOutreachProfile({
    valueProp: opts.skip ? "" : slots.problem.trim(),
    proofPoint: "",
    ctaType: !opts.skip && slots.emailAsk.trim() ? "custom" : "reply",
    ctaDetail: opts.skip ? "" : slots.emailAsk.trim(),
    tone: "direct",
  });

  const setupProfile = {
    version: 3,
    preset: opts.skip ? "skipped" : "custom",
    business: {
      fullName: slots.fullName.trim(),
      roleTitle: "",
      companyName: slots.companyName.trim(),
      companyWebsite: "",
    },
    offer: {
      serviceType,
      serviceOther: "",
      pricingTier: "mid_tier",
    },
    audience: {
      clientType: "any",
      targetCustomer: opts.skip ? "" : offerText,
      location: opts.skip ? "" : slots.market.trim(),
      sellsOnline: true,
    },
    outreachProfile,
    ...(opts.skip ? { skipped: true } : {}),
    completedAt: opts.completedAt || new Date().toISOString(),
  };

  return {
    id: userId,
    service_type: serviceType,
    service_other: null,
    full_name: slots.fullName.trim() || null,
    role_title: null,
    company_name: slots.companyName.trim() || null,
    company_website: null,
    phone: null,
    client_type: "any",
    pricing_tier: "mid_tier",
    location: opts.skip ? null : slots.market.trim() || null,
    sells_online: true,
    outreach_profile: outreachProfile,
    setup_profile: setupProfile as Json,
  };
}
