import type { DetectedSignal } from "@/lib/detectOpportunitySignals";
import { opportunitySignalLabels } from "@/lib/opportunitySignals";

export interface OpportunityCardSignal {
  key: DetectedSignal["key"];
  label: string;
  confidence: number;
  evidence?: DetectedSignal["evidence"];
}

export interface OpportunityCardSummary {
  presentSignals: OpportunityCardSignal[];
  whyText: string;
  hasSignals: boolean;
}

/**
 * Pure, deterministic card summary from rule-based detection.
 * - presentSignals: the detected signals that are present, highest confidence first.
 * - whyText: a service-aware, plain-language reason built from the present signal
 *   labels (NO AI — the AI-written angle is Phase 6). Empty when nothing is present
 *   so the card can fall back rather than fabricate a reason.
 */
export function summarizeOpportunityCard(
  detectedSignals: DetectedSignal[] | undefined,
  service: string,
): OpportunityCardSummary {
  const presentSignals: OpportunityCardSignal[] = (detectedSignals ?? [])
    .filter(signal => signal.present)
    .sort((a, b) => b.confidence - a.confidence)
    .map(signal => ({
      key: signal.key,
      label: opportunitySignalLabels[signal.key] || signal.key,
      confidence: signal.confidence,
      evidence: signal.evidence,
    }));

  const hasSignals = presentSignals.length > 0;
  if (!hasSignals) {
    return { presentSignals, whyText: "", hasSignals };
  }

  const labelList = presentSignals.map(signal => signal.label.toLowerCase()).join(", ");
  const trimmedService = service.trim();
  const whyText = trimmedService
    ? `${trimmedService} opportunity — ${labelList}.`
    : `Opportunity signals — ${labelList}.`;

  return { presentSignals, whyText, hasSignals };
}
