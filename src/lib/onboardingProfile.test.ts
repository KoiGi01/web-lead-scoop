import { describe, expect, it } from "vitest";

import { buildOnboardingProfile, type OnboardingSlots } from "@/lib/onboardingProfile";

const userId = "00000000-0000-4000-8000-000000000001";
const completedAt = "2026-06-20T12:00:00.000Z";

const fullSlots: OnboardingSlots = {
  offer: " Websites for dental clinics ",
  market: " Miami ",
  problem: " Their booking flow loses patients. ",
  emailAsk: " Reply for a quick look. ",
  fullName: " Alex Rivera ",
  companyName: " Rivera Studio ",
};

describe("buildOnboardingProfile", () => {
  it("maps complete onboarding slots to the existing user_profiles row shape", () => {
    expect(buildOnboardingProfile(userId, fullSlots, { skip: false, completedAt })).toEqual({
      id: userId,
      service_type: "Websites for dental clinics",
      service_other: null,
      full_name: "Alex Rivera",
      role_title: null,
      company_name: "Rivera Studio",
      company_website: null,
      phone: null,
      client_type: "any",
      pricing_tier: "mid_tier",
      location: "Miami",
      sells_online: true,
      outreach_profile: {
        valueProp: "Their booking flow loses patients.",
        proofPoint: "",
        ctaType: "custom",
        ctaDetail: "Reply for a quick look.",
        tone: "direct",
      },
      setup_profile: {
        version: 3,
        preset: "custom",
        business: {
          fullName: "Alex Rivera",
          roleTitle: "",
          companyName: "Rivera Studio",
          companyWebsite: "",
        },
        offer: {
          serviceType: "Websites for dental clinics",
          serviceOther: "",
          pricingTier: "mid_tier",
        },
        audience: {
          clientType: "any",
          targetCustomer: "Websites for dental clinics",
          location: "Miami",
          sellsOnline: true,
        },
        outreachProfile: {
          valueProp: "Their booking flow loses patients.",
          proofPoint: "",
          ctaType: "custom",
          ctaDetail: "Reply for a quick look.",
          tone: "direct",
        },
        completedAt,
      },
    });
  });

  it("writes the same skipped profile as the typeform skip path", () => {
    const profile = buildOnboardingProfile(userId, fullSlots, { skip: true, completedAt });

    expect(profile).toMatchObject({
      service_type: "Lead research",
      full_name: "Alex Rivera",
      company_name: "Rivera Studio",
      location: null,
      outreach_profile: {
        valueProp: "",
        proofPoint: "",
        ctaType: "reply",
        ctaDetail: "",
        tone: "direct",
      },
      setup_profile: {
        version: 3,
        preset: "skipped",
        skipped: true,
        audience: {
          clientType: "any",
          targetCustomer: "",
          location: "",
          sellsOnline: true,
        },
        completedAt,
      },
    });
  });

  it("keeps safe defaults when the bounded chat finishes with partial slots", () => {
    const profile = buildOnboardingProfile(userId, {
      offer: "",
      market: "",
      problem: "Need more booked calls.",
      emailAsk: "",
      fullName: "",
      companyName: "",
    }, { skip: false, completedAt });

    expect(profile.service_type).toBe("Lead research");
    expect(profile.location).toBeNull();
    expect(profile.full_name).toBeNull();
    expect(profile.company_name).toBeNull();
    expect(profile.outreach_profile).toEqual({
      valueProp: "Need more booked calls.",
      proofPoint: "",
      ctaType: "reply",
      ctaDetail: "",
      tone: "direct",
    });
  });
});
