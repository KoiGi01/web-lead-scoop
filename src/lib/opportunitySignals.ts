export type OpportunitySignalKey =
  | "weak_website"
  | "no_booking"
  | "no_clear_cta"
  | "generic_inbox"
  | "low_reviews"
  | "no_social_links"
  | "no_contact_form"
  | "weak_local_presence";

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
    .map(option => option.key);
  if (exact.length) return exact.slice(0, 4);
  if (/web|site|design|ux|landing/i.test(service)) return ["weak_website", "no_clear_cta", "no_booking", "no_contact_form"];
  if (/seo|local|rank|visibility/i.test(service)) return ["weak_local_presence", "low_reviews", "weak_website", "no_social_links"];
  if (/booking|appointment|reservation/i.test(service)) return ["no_booking", "no_clear_cta", "no_contact_form"];
  if (/automation|crm|workflow/i.test(service)) return ["no_booking", "no_contact_form", "generic_inbox"];
  if (/social|content|instagram|tiktok|facebook/i.test(service)) return ["no_social_links", "low_reviews", "weak_website"];
  return ["weak_website", "no_clear_cta", "generic_inbox"];
};
