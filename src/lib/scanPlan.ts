import {
  OpportunitySignalKey,
  opportunitySignalLabels,
  getServiceRecommendedSignalKeys,
} from "@/lib/opportunitySignals";

export type ScanTarget =
  | "homepage"
  | "contact"
  | "about"
  | "team"
  | "booking"
  | "services"
  | "pricing"
  | "social";

export interface ScanPlanIntelligence {
  service: string;
  strategy: string;
  opportunitySignals: OpportunitySignalKey[];
  scanTargets: ScanTarget[];
  queryVariants: string[];
}

const SCAN_TARGETS_BY_SERVICE: Record<string, ScanTarget[]> = {
  "web design": ["homepage", "services", "contact", "booking"],
  "seo": ["homepage", "services", "pricing", "contact"],
  "ai automation": ["homepage", "booking", "contact"],
  "booking automation": ["homepage", "booking", "contact"],
  "social media marketing": ["homepage", "social", "contact"],
  "reputation management": ["homepage", "contact", "social"],
  "paid ads": ["homepage", "services", "contact"],
  "crm setup": ["homepage", "contact", "team"],
  "lead generation": ["homepage", "contact", "services"],
};

const DEFAULT_SCAN_TARGETS: ScanTarget[] = ["homepage", "contact", "about"];

const buildStrategy = (service: string, signalLabels: string[]): string => {
  const svc = service.trim() || "your service";
  const focus = signalLabels.length
    ? signalLabels.slice(0, 3).join(", ").toLowerCase()
    : "weak public conversion paths";
  return `Prospects that need ${svc} usually show it on their public site. I'm prioritizing businesses with ${focus}, then pulling a likely decision-maker so you get an evidence-based opening.`;
};

export const synthesizeScanPlanIntelligence = (
  service: string,
  opts: { signals?: OpportunitySignalKey[]; queryVariants?: string[] } = {},
): ScanPlanIntelligence => {
  const signals = (opts.signals?.length ? opts.signals : getServiceRecommendedSignalKeys(service)).slice(0, 4);
  const labels = signals.map(signal => opportunitySignalLabels[signal] || signal);
  const key = service.trim().toLowerCase();
  const scanTargets = SCAN_TARGETS_BY_SERVICE[key] || DEFAULT_SCAN_TARGETS;
  return {
    service: service.trim(),
    strategy: buildStrategy(service, labels),
    opportunitySignals: signals,
    scanTargets,
    queryVariants: opts.queryVariants || [],
  };
};
