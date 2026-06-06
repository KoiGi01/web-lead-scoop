import { opportunitySignalLabels } from "@/lib/opportunitySignals";
import type { DetectedSignal } from "@/lib/detectOpportunitySignals";
import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";

export interface WebsiteSignalsSummary {
  pagesScanned: string[];
  title?: string;
  metaDescription?: string;
  homepageTextLength: number;
  contactFormFound: boolean;
  contactPageFound: boolean;
  bookingLinks: string[];
  socialLinks: string[];
  hasGenericInboxOnly: boolean;
  techStack: string[];
  ssl: { valid: boolean; httpsRedirect: boolean };
}

export interface PersistedSignals {
  version: 1;
  service: string;
  detected: DetectedSignal[];
  website: WebsiteSignalsSummary;
}

export interface LeadIntelligencePayload {
  detectedIssues: string[];
  signals: PersistedSignals;
}

export function buildLeadIntelligence(
  detectedSignals: DetectedSignal[] | undefined,
  websiteSignals: WebsiteSignals | undefined,
  service: string,
): LeadIntelligencePayload | null {
  if (!websiteSignals || !detectedSignals || detectedSignals.length === 0) return null;

  const detectedIssues = detectedSignals
    .filter(signal => signal.present)
    .map(signal => opportunitySignalLabels[signal.key] || signal.key);

  const website: WebsiteSignalsSummary = {
    pagesScanned: websiteSignals.pagesScanned,
    title: websiteSignals.title,
    metaDescription: websiteSignals.metaDescription,
    homepageTextLength: websiteSignals.homepageTextLength,
    contactFormFound: websiteSignals.contactFormFound,
    contactPageFound: websiteSignals.contactPageFound,
    bookingLinks: websiteSignals.bookingLinks,
    socialLinks: websiteSignals.socialLinks,
    hasGenericInboxOnly: websiteSignals.hasGenericInboxOnly,
    techStack: websiteSignals.techStack,
    ssl: websiteSignals.ssl,
  };

  return {
    detectedIssues,
    signals: {
      version: 1,
      service: service.trim(),
      detected: detectedSignals,
      website,
    },
  };
}
