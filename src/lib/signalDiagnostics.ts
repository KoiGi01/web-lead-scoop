import type { DetectedSignal } from "@/lib/detectOpportunitySignals";
import type { OpportunitySignalKey } from "@/lib/opportunitySignals";

export interface SignalDiagnostics {
  /** Detection candidates: leads that have a website (extraction only runs on websited businesses). */
  sitesScanned: number;
  /** Candidates whose site could not be read (no websiteSignals → scrape failed → detection couldn't run). */
  sitesUnreadable: number;
  /** Candidates with at least one present detected signal. */
  sitesWithSignals: number;
  /** Per selected signal key, how many candidates had it present. Selected keys only. */
  perSignal: Array<{ key: OpportunitySignalKey; present: number }>;
}

interface DiagnosticsLead {
  website?: string;
  websiteSignals?: unknown;
  detectedSignals?: DetectedSignal[];
}

/**
 * Aggregate, internal/admin signal-detection diagnostics for one search.
 * Pure: derived from the in-memory leads (each carries websiteSignals + detectedSignals)
 * and the user's selected signal keys. No network, no persistence.
 */
export function computeSignalDiagnostics(
  leads: DiagnosticsLead[],
  selectedKeys: OpportunitySignalKey[],
): SignalDiagnostics {
  const candidates = leads.filter(lead => Boolean(lead.website));

  const sitesUnreadable = candidates.filter(lead => lead.websiteSignals == null).length;
  const sitesWithSignals = candidates.filter(lead =>
    (lead.detectedSignals ?? []).some(signal => signal.present),
  ).length;
  const perSignal = selectedKeys.map(key => ({
    key,
    present: candidates.filter(lead =>
      (lead.detectedSignals ?? []).some(signal => signal.key === key && signal.present),
    ).length,
  }));

  return {
    sitesScanned: candidates.length,
    sitesUnreadable,
    sitesWithSignals,
    perSignal,
  };
}
