export type OpportunitySignalKey =
  | "weak_website"
  | "no_website"
  | "no_booking"
  | "no_clear_cta"
  | "generic_inbox"
  | "low_reviews"
  | "no_social_links"
  | "no_contact_form"
  | "weak_local_presence";

// Signals derived from scanning a website. These are meaningless (and mutually
// exclusive) when the target has no website at all.
export const WEBSITE_DEPENDENT_SIGNALS: ReadonlySet<OpportunitySignalKey> = new Set([
  "weak_website",
  "no_booking",
  "no_clear_cta",
  "generic_inbox",
  "no_social_links",
  "no_contact_form",
]);

export const signalRequiresWebsite = (key: OpportunitySignalKey) => WEBSITE_DEPENDENT_SIGNALS.has(key);

export const opportunitySignalOptions: Array<{
  key: OpportunitySignalKey;
  label: string;
  description: string;
  services: string[];
}> = [
  {
    key: "weak_website",
    label: "Weak website",
    description: "Outdated, thin, messy, or low-converting website signals.",
    services: ["Web design", "SEO", "Paid ads", "Lead generation"],
  },
  {
    key: "no_website",
    label: "No website",
    description: "Business has no website at all — a build-from-scratch opportunity (and no page to scan, so no scraping cost).",
    services: ["Web design", "SEO", "Lead generation", "Booking automation"],
  },
  {
    key: "no_booking",
    label: "No booking flow",
    description: "No clear appointment, reservation, or booking path.",
    services: ["Booking automation", "Web design", "AI automation", "CRM setup"],
  },
  {
    key: "no_clear_cta",
    label: "No clear CTA",
    description: "No obvious consultation, quote, booking, or contact action.",
    services: ["Web design", "Paid ads", "Lead generation", "SEO"],
  },
  {
    key: "generic_inbox",
    label: "Generic inbox",
    description: "Only generic email paths such as info, contact, sales, or support.",
    services: ["Lead generation", "CRM setup", "AI automation"],
  },
  {
    key: "low_reviews",
    label: "Low reviews",
    description: "Weak review count, reputation, or review activity.",
    services: ["Reputation management", "SEO", "Social media marketing"],
  },
  {
    key: "no_social_links",
    label: "No social links",
    description: "Weak or missing visible social presence.",
    services: ["Social media marketing", "Web design", "SEO"],
  },
  {
    key: "no_contact_form",
    label: "No contact form",
    description: "No obvious form or lead-capture path on the public site.",
    services: ["Lead generation", "CRM setup", "Web design", "AI automation"],
  },
  {
    key: "weak_local_presence",
    label: "Weak local presence",
    description: "Local visibility gaps, incomplete footprint, or poor discovery signals.",
    services: ["SEO", "Reputation management", "Paid ads"],
  },
];

export const opportunitySignalLabels = Object.fromEntries(
  opportunitySignalOptions.map(option => [option.key, option.label]),
) as Record<OpportunitySignalKey, string>;

export const getServiceRecommendedSignalKeys = (service = ""): OpportunitySignalKey[] => {
  const normalized = service.trim().toLowerCase();
  if (!normalized) return ["weak_website", "no_clear_cta", "generic_inbox"];
  const exact = opportunitySignalOptions
    .filter(option => option.services.some(item => item.toLowerCase() === normalized))
    .map(option => option.key)
    // "No website" is opt-in (it changes scan composition), never a default.
    .filter(key => key !== "no_website");
  if (exact.length) return exact.slice(0, 4);
  if (/web|site|design|ux|landing/i.test(service)) return ["weak_website", "no_clear_cta", "no_booking", "no_contact_form"];
  if (/seo|local|rank|visibility/i.test(service)) return ["weak_local_presence", "low_reviews", "weak_website", "no_social_links"];
  if (/booking|appointment|reservation/i.test(service)) return ["no_booking", "no_clear_cta", "no_contact_form"];
  if (/automation|crm|workflow/i.test(service)) return ["no_booking", "no_contact_form", "generic_inbox"];
  if (/social|content|instagram|tiktok|facebook/i.test(service)) return ["no_social_links", "low_reviews", "weak_website"];
  return ["weak_website", "no_clear_cta", "generic_inbox"];
};

// The full set of signals to OFFER in the selector for a given service — only the
// signals relevant to what the user sells (never all 8). Exact-service matches
// return every relevant key (uncapped, in option order); custom/unknown services
// fall back to the keyword recommendations.
export const getServiceSignalKeys = (service = ""): OpportunitySignalKey[] => {
  const normalized = service.trim().toLowerCase();
  if (!normalized) return getServiceRecommendedSignalKeys(service);
  const exact = opportunitySignalOptions
    .filter(option => option.services.some(item => item.toLowerCase() === normalized))
    .map(option => option.key);
  if (exact.length) return exact;
  return getServiceRecommendedSignalKeys(service);
};
