import type { OpportunitySignalKey } from "@/lib/opportunitySignals";
import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";

// Tunable thresholds (see design spec).
export const THIN_SITE_TEXT_LENGTH = 1200;
export const LOW_REVIEW_COUNT = 18;
export const WEAK_RATING = 4.0;

const BOOKING_CTA_RE = /\b(book|appointment|schedule|reserve|booking|agendar|reserva)\b/i;
const ACTION_CTA_RE = /\b(book|quote|call|contact|get started|sign up|schedule|request|buy|order|subscribe|consult|estimate)\b/i;

export interface EnrichmentContext {
  rating?: number;
  reviewCount?: number;
  hasWebsite?: boolean;
  techStack?: string[];
  ssl?: { valid: boolean; httpsRedirect: boolean };
  // Reserved for future async enrichers; undefined in this spec.
  pageSpeed?: { performance: number; lcpMs: number; mobileFriendly: boolean };
}

export interface DetectedSignal {
  key: OpportunitySignalKey;
  present: boolean;
  confidence: number;
  evidence?: { sourceUrl: string; snippet: string };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

type Detector = (facts: WebsiteSignals, ctx: EnrichmentContext) => DetectedSignal;

const sourceUrlOf = (facts: WebsiteSignals) => facts.pagesScanned[0] || "";
const pageCount = (facts: WebsiteSignals) => facts.pagesScanned.length;

const DETECTORS: Record<OpportunitySignalKey, Detector> = {
  weak_website: (facts, ctx) => {
    const reasons: string[] = [];
    if (facts.homepageTextLength < THIN_SITE_TEXT_LENGTH) reasons.push("thin homepage content");
    if (!facts.title) reasons.push("missing page title");
    if (!facts.metaDescription) reasons.push("missing meta description");
    const ssl = ctx.ssl ?? facts.ssl;
    if (ssl && ssl.valid === false) reasons.push("no valid HTTPS");
    const techStack = ctx.techStack ?? facts.techStack;
    if (techStack && techStack.some(t => ["wix", "godaddy", "weebly", "legacy-jquery"].includes(t))) {
      reasons.push(`built on ${techStack[0]}`);
    }
    return {
      key: "weak_website",
      present: reasons.length > 0,
      confidence: clamp(reasons.length ? 40 + reasons.length * 15 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: reasons.join("; ") || "website looks healthy" },
    };
  },

  no_booking: (facts) => {
    const hasBookingCta = facts.ctaTexts.some(t => BOOKING_CTA_RE.test(t));
    const present = facts.bookingLinks.length === 0 && !hasBookingCta;
    return {
      key: "no_booking",
      present,
      confidence: clamp(present ? 70 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: present ? `no booking link found across ${pageCount(facts)} page(s) scanned` : facts.bookingLinks[0] || "booking CTA present" },
    };
  },

  no_clear_cta: (facts) => {
    const hasAction = facts.ctaTexts.some(t => ACTION_CTA_RE.test(t));
    return {
      key: "no_clear_cta",
      present: !hasAction,
      confidence: clamp(!hasAction ? 65 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: !hasAction ? "no clear action CTA (book/quote/contact) found" : facts.ctaTexts.find(t => ACTION_CTA_RE.test(t)) || "" },
    };
  },

  generic_inbox: (facts) => ({
    key: "generic_inbox",
    present: facts.hasGenericInboxOnly,
    confidence: clamp(facts.hasGenericInboxOnly ? 75 : 10),
    evidence: { sourceUrl: sourceUrlOf(facts), snippet: facts.hasGenericInboxOnly ? "only generic inbox emails (info@/contact@) found" : "person-style inbox present" },
  }),

  no_contact_form: (facts) => {
    const present = !facts.contactFormFound;
    return {
      key: "no_contact_form",
      present,
      confidence: clamp(present ? 70 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: present ? "no contact form found on scanned pages" : "contact form present" },
    };
  },

  no_social_links: (facts) => {
    const present = facts.socialLinks.length === 0;
    return {
      key: "no_social_links",
      present,
      confidence: clamp(present ? 80 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: present ? "no social links found" : facts.socialLinks[0] },
    };
  },

  low_reviews: (facts, ctx) => {
    if (typeof ctx.reviewCount !== "number") {
      return { key: "low_reviews", present: false, confidence: 15, evidence: { sourceUrl: sourceUrlOf(facts), snippet: "review data unavailable" } };
    }
    const present = ctx.reviewCount < LOW_REVIEW_COUNT;
    return {
      key: "low_reviews",
      present,
      confidence: clamp(present ? 75 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: `${ctx.reviewCount} public review(s)` },
    };
  },

  weak_local_presence: (facts, ctx) => {
    if (typeof ctx.reviewCount !== "number" && typeof ctx.rating !== "number") {
      return { key: "weak_local_presence", present: false, confidence: 15, evidence: { sourceUrl: sourceUrlOf(facts), snippet: "local presence data unavailable" } };
    }
    const lowReviews = (ctx.reviewCount ?? Number.POSITIVE_INFINITY) < LOW_REVIEW_COUNT;
    const weakRating = (ctx.rating ?? 5) < WEAK_RATING;
    const present = lowReviews && weakRating;
    return {
      key: "weak_local_presence",
      present,
      confidence: clamp(present ? 60 : 10),
      evidence: { sourceUrl: sourceUrlOf(facts), snippet: `rating ${ctx.rating ?? "n/a"}, ${ctx.reviewCount ?? "n/a"} review(s)` },
    };
  },
};

export function detectOpportunitySignals(
  facts: WebsiteSignals,
  context: EnrichmentContext,
  selectedKeys: OpportunitySignalKey[],
): DetectedSignal[] {
  const unique = [...new Set(selectedKeys)];
  return unique
    .filter((key): key is OpportunitySignalKey => key in DETECTORS)
    .map(key => DETECTORS[key](facts, context));
}
