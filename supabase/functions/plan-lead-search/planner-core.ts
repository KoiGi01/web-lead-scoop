// planner-core.ts
// Pure logic module — no Deno.* or remote imports so vitest (Node/Vite) can import it.

export type LocationMode = "country" | "city";
export type Depth = "simple" | "normal" | "deep";
export type Strictness = "broad" | "balanced" | "strict";
export type RequiredChannel = "phone" | "website" | "email" | "linkedin" | "person";

export type OpportunitySignal =
  | "weak_website" | "no_booking" | "no_clear_cta" | "generic_inbox"
  | "low_reviews" | "no_social_links" | "no_contact_form" | "weak_local_presence";

export type ScanTarget =
  | "homepage" | "contact" | "about" | "team" | "booking" | "services" | "pricing" | "social";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface PlanRequest {
  brief: string;
  service?: string;
  messages?: ChatMessage[];
  currentKeyword?: string;
  currentLocation?: string;
  userProfile?: {
    service_type?: string;
    pricing_tier?: string;
  } | null;
}

export interface KnownFields {
  targetBusiness?: string;
  location?: string;
  locationMode?: LocationMode;
  requiredChannels?: RequiredChannel[];
}

export interface SearchPlan {
  targetBusiness: string;
  location: string;
  locationMode: LocationMode;
  depth: Depth;
  enrichMode: boolean;
  strictness: Strictness;
  requiredChannels: RequiredChannel[];
  queryVariants: string[];
  maxResults: 20 | 40 | 60;
  summary: string;
  service: string;
  strategy: string;
  opportunitySignals: OpportunitySignal[];
  scanTargets: ScanTarget[];
}

export const allowedDepths: Depth[] = ["simple", "normal", "deep"];
export const allowedStrictness: Strictness[] = ["broad", "balanced", "strict"];
export const allowedLocationModes: LocationMode[] = ["country", "city"];
export const allowedChannels: RequiredChannel[] = ["phone", "website", "email", "linkedin", "person"];

const allowedSignals: OpportunitySignal[] = [
  "weak_website", "no_booking", "no_clear_cta", "generic_inbox",
  "low_reviews", "no_social_links", "no_contact_form", "weak_local_presence",
];
const allowedScanTargets: ScanTarget[] = [
  "homepage", "contact", "about", "team", "booking", "services", "pricing", "social",
];

const SERVICE_SIGNALS: Record<string, OpportunitySignal[]> = {
  "web design": ["weak_website", "no_clear_cta", "no_booking", "no_contact_form"],
  "seo": ["weak_local_presence", "low_reviews", "weak_website", "no_social_links"],
  "ai automation": ["no_booking", "no_contact_form", "generic_inbox"],
  "booking automation": ["no_booking", "no_clear_cta", "no_contact_form"],
  "social media marketing": ["no_social_links", "low_reviews", "weak_website"],
  "reputation management": ["low_reviews", "weak_local_presence", "no_social_links"],
  "paid ads": ["no_clear_cta", "weak_website", "weak_local_presence"],
  "crm setup": ["no_contact_form", "generic_inbox", "no_booking"],
  "lead generation": ["no_clear_cta", "generic_inbox", "no_contact_form"],
};

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

function inferService(brief: string, fallback = ""): string {
  const lower = brief.toLowerCase();
  if (/web\s*design|website|site redesign|landing page/.test(lower)) return "Web design";
  if (/\bseo\b|rank|local visibility|google business/.test(lower)) return "SEO";
  if (/ai automation|automation|workflow|zapier|make\.com/.test(lower)) return "AI automation";
  if (/booking|appointment|schedule/.test(lower)) return "Booking automation";
  if (/social media|instagram|tiktok|facebook|content/.test(lower)) return "Social media marketing";
  if (/reputation|reviews|ratings/.test(lower)) return "Reputation management";
  if (/paid ads|google ads|meta ads|ppc/.test(lower)) return "Paid ads";
  if (/\bcrm\b|pipeline|hubspot|salesforce/.test(lower)) return "CRM setup";
  if (/lead gen|lead generation|prospecting|outreach/.test(lower)) return "Lead generation";
  return fallback;
}

export function serviceDefaults(service: string): { signals: OpportunitySignal[]; scanTargets: ScanTarget[]; strategy: string } {
  const key = service.trim().toLowerCase();
  const signals = SERVICE_SIGNALS[key] || ["weak_website", "no_clear_cta", "generic_inbox"];
  const scanTargets = SCAN_TARGETS_BY_SERVICE[key] || ["homepage", "contact", "about"];
  const svc = service.trim() || "your service";
  const strategy = `Prospects that need ${svc} usually show it on their public site. I'm prioritizing businesses with visible gaps (${signals.slice(0, 3).join(", ").replace(/_/g, " ")}), then pulling a likely decision-maker so you get an evidence-based opening.`;
  return { signals, scanTargets, strategy };
}

export function uniqueStrings(values: unknown[], limit = 8): string[] {
  return [...new Set(values.map(v => String(v || "").trim()).filter(Boolean))].slice(0, limit);
}

export function clampEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function clampList<T extends string>(values: unknown, allowed: T[], limit: number): T[] {
  return uniqueStrings(Array.isArray(values) ? values : [], limit).filter(v => allowed.includes(v as T)) as T[];
}

export function normalizeChannel(channel: unknown): RequiredChannel | "" {
  const value = String(channel || "").trim().toLowerCase();
  if (value === "whatsapp") return "phone";
  if (value === "linkedin" || value === "linkedin") return "linkedin";
  return allowedChannels.includes(value as RequiredChannel) ? value as RequiredChannel : "";
}

export function inferLocation(brief: string, fallback = "") {
  const patterns = [
    /\bin\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|\s+and|$)/i,
    /\bnear\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|\s+and|$)/i,
    /\bfrom\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|\s+and|$)/i,
  ];
  for (const p of patterns) {
    const match = brief.match(p);
    if (match?.[1]) return match[1].trim().replace(/[.!,;:]$/, "");
  }
  return fallback || "";
}

export function inferTarget(brief: string, location: string, fallback = "") {
  let text = brief
    .replace(/^find\s+/i, "")
    .replace(/^search\s+for\s+/i, "")
    .replace(/^show\s+me\s+/i, "")
    .replace(/\b(Business type|Location|Lead quality|Search depth|Starting point)\s*:\s*/gi, "")
    .replace(/\b(leads|businesses|companies|prospects)\b/gi, "")
    .replace(/\b(with email|with emails|with phone|with linkedin|with website|with managers|with founders|with owners|premium|local|small|good|best)\b/gi, "")
    .replace(/\bfor\s+(my|our)\s+(agency|business|company|service|services)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (location) text = text.replace(new RegExp(`\\bin\\s+${location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), "").trim();
  text = text.split(/\bwith\b|\bthat\b|\bwho\b|\bonly\b/i)[0].trim();
  return text.length >= 3 ? text : fallback || "";
}

export function inferRequiredChannels(brief: string): RequiredChannel[] {
  const lower = brief.toLowerCase();
  return uniqueStrings([
    lower.includes("phone") || lower.includes("call") || lower.includes("whatsapp") ? "phone" : "",
    lower.includes("website") || lower.includes("site") ? "website" : "",
    lower.includes("email") ? "email" : "",
    lower.includes("linkedin") ? "linkedin" : "",
    /owner|manager|founder|ceo|director|decision|person|people|contact/i.test(brief) ? "person" : "",
  ]).map(normalizeChannel).filter(Boolean) as RequiredChannel[];
}

export function makeQuestion(missingFields: string[], knownFields: KnownFields) {
  if (missingFields.includes("targetBusiness")) {
    return "What industry, niche, or type of business should I search for?";
  }
  if (missingFields.includes("location")) {
    return `Where should I search${knownFields.targetBusiness ? ` for ${knownFields.targetBusiness}` : ""}? Give me a city, area, or country.`;
  }
  if (missingFields.includes("quality")) {
    return "What makes a lead good for this search: email, phone, website, LinkedIn, or a likely person?";
  }
  return "What else should I know before building the search plan?";
}

export function clarificationResponse(req: PlanRequest, missingFields?: string[]) {
  const brief = req.brief || "";
  const location = inferLocation(brief, req.currentLocation || "");
  const targetBusiness = inferTarget(brief, location, req.currentKeyword || "");
  const missing = missingFields?.length
    ? missingFields
    : [
      targetBusiness ? "" : "targetBusiness",
      location ? "" : "location",
    ].filter(Boolean);
  const knownFields: KnownFields = {
    targetBusiness: targetBusiness || undefined,
    location: location || undefined,
    locationMode: location && /,|city|area|near/i.test(location) ? "city" : undefined,
    requiredChannels: inferRequiredChannels(brief),
  };
  return {
    success: true,
    state: "needs_clarification",
    question: makeQuestion(missing, knownFields),
    missingFields: missing,
    knownFields,
    source: "heuristic",
  };
}

export function heuristicPlan(req: PlanRequest): SearchPlan | null {
  const brief = req.brief || "";
  const location = inferLocation(brief, req.currentLocation || "");
  const targetBusiness = inferTarget(brief, location, req.currentKeyword || "");
  if (!targetBusiness || !location) return null;

  const service = (req.service || inferService(brief)).trim();
  const requiredChannels = inferRequiredChannels(brief);
  const wantsPerson = requiredChannels.includes("person");
  const wantsStrict = /\bonly|required|must have|must-have\b/i.test(brief) || requiredChannels.length >= 2;
  const wantsDeep = /\bdeep|more|many|large list|thorough\b/i.test(brief);
  const wantsSimple = /\bquick|small list|simple|few\b/i.test(brief);
  const depth: Depth = wantsDeep ? "deep" : wantsSimple ? "simple" : "normal";
  const locationMode: LocationMode = /\b(country|nationwide|all over|across)\b/i.test(brief) ? "country" : "city";
  const maxResults: 20 | 40 | 60 = depth === "deep" ? 60 : depth === "simple" ? 20 : 40;
  const defaults = serviceDefaults(service);

  const queryVariants = uniqueStrings([
    `${targetBusiness} ${location}`,
    `${targetBusiness} ${location} contact`,
    `${targetBusiness} ${location} official website`,
    `${targetBusiness} ${location} reviews`,
    wantsPerson ? `${targetBusiness} ${location} owner manager` : "",
  ], 6);

  return {
    targetBusiness, location, locationMode, depth,
    enrichMode: wantsPerson || requiredChannels.includes("linkedin"),
    strictness: wantsStrict ? "strict" : "balanced",
    requiredChannels, queryVariants, maxResults,
    summary: `Search for ${targetBusiness} in ${location}, prioritizing contact-ready prospects${requiredChannels.length ? ` with ${requiredChannels.join(", ")}` : ""}.`,
    service,
    strategy: defaults.strategy,
    opportunitySignals: defaults.signals,
    scanTargets: defaults.scanTargets,
  };
}

export function validatePlan(raw: Record<string, unknown>, fallback: SearchPlan | null): SearchPlan | null {
  const targetBusiness = String(raw.targetBusiness || fallback?.targetBusiness || "").trim();
  const location = String(raw.location || fallback?.location || "").trim();
  if (!targetBusiness || !location) return null;

  const depth = clampEnum(raw.depth, allowedDepths, fallback?.depth || "normal");
  const maxResults: 20 | 40 | 60 = depth === "deep" ? 60 : depth === "simple" ? 20 : 40;
  const requiredChannels = uniqueStrings((raw.requiredChannels as unknown[]) || fallback?.requiredChannels || [], 5)
    .map(normalizeChannel).filter(Boolean) as RequiredChannel[];
  const queryVariants = uniqueStrings((raw.queryVariants as unknown[]) || fallback?.queryVariants || [], 6);
  const service = String(raw.service || fallback?.service || "").trim();
  const defaults = serviceDefaults(service);
  const opportunitySignals = clampList(raw.opportunitySignals, allowedSignals, 5);
  const scanTargets = clampList(raw.scanTargets, allowedScanTargets, 6);

  return {
    targetBusiness, location,
    locationMode: clampEnum(raw.locationMode, allowedLocationModes, fallback?.locationMode || "city"),
    depth,
    enrichMode: typeof raw.enrichMode === "boolean" ? raw.enrichMode : Boolean(fallback?.enrichMode || requiredChannels.includes("person") || requiredChannels.includes("linkedin")),
    strictness: clampEnum(raw.strictness, allowedStrictness, fallback?.strictness || "balanced"),
    requiredChannels,
    queryVariants: queryVariants.length ? queryVariants : uniqueStrings([
      `${targetBusiness} ${location}`,
      `${targetBusiness} ${location} contact`,
      `${targetBusiness} ${location} official website`,
    ], 6),
    maxResults,
    summary: String(raw.summary || fallback?.summary || `Search for ${targetBusiness} in ${location}, prioritizing contact-ready prospects.`),
    service,
    strategy: String(raw.strategy || fallback?.strategy || defaults.strategy),
    opportunitySignals: opportunitySignals.length ? opportunitySignals : defaults.signals,
    scanTargets: scanTargets.length ? scanTargets : defaults.scanTargets,
  };
}

export function parseGeminiJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Planner returned no JSON");
    return JSON.parse(match[0]);
  }
}
