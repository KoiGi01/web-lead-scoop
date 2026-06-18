import type { Json } from "@/integrations/supabase/types";

export type OutreachCtaType = "reply" | "book_call" | "send_audit" | "custom";
export type OutreachTone = "direct" | "warm" | "premium";

export interface OutreachProfile {
  valueProp: string;
  proofPoint?: string;
  ctaType: OutreachCtaType;
  ctaDetail?: string;
  tone: OutreachTone;
}

export const defaultOutreachProfile: OutreachProfile = {
  valueProp: "",
  proofPoint: "",
  ctaType: "reply",
  ctaDetail: "",
  tone: "direct",
};

export const parseOutreachProfile = (value: Json | null | undefined): OutreachProfile => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultOutreachProfile;
  const record = value as Record<string, Json | undefined>;
  const ctaType = record.ctaType;
  const tone = record.tone;
  return {
    valueProp: typeof record.valueProp === "string" ? record.valueProp : "",
    proofPoint: typeof record.proofPoint === "string" ? record.proofPoint : "",
    ctaType: ctaType === "book_call" || ctaType === "send_audit" || ctaType === "custom" || ctaType === "reply" ? ctaType : "reply",
    ctaDetail: typeof record.ctaDetail === "string" ? record.ctaDetail : "",
    tone: tone === "warm" || tone === "premium" || tone === "direct" ? tone : "direct",
  };
};

export const serializeOutreachProfile = (profile: OutreachProfile): Json => ({
  valueProp: profile.valueProp.trim(),
  proofPoint: profile.proofPoint?.trim() || "",
  ctaType: profile.ctaType,
  ctaDetail: profile.ctaDetail?.trim() || "",
  tone: profile.tone || "direct",
});

export const hasOutreachValueProp = (profile: OutreachProfile) => profile.valueProp.trim().length > 0;
