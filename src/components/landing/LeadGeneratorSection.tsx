import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ArrowRight,
  ArrowLeft,
  Bot,
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Linkedin,
  Loader2,
  Mail,
  Phone,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import XLSX from "xlsx-js-style";

import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { canUseSearchQuality, PLAN_LABELS, normalizePlan } from "@/lib/entitlements";

interface Business {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  lat?: number;
  lng?: number;
}

interface DecisionMakerContact {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  department?: string;
  seniority?: string;
  linkedinUrl?: string;
  confidence?: number;
  source: "hunter" | "linkedin" | "website";
  decisionMakerScore: number;
  decisionMakerReason: string;
}

interface LeadResult extends Business {
  emails: string[];
  whatsapp: string[];
  linkedinUrl?: string;
  socialLinks?: string[];
  contactPageFound: boolean;
  emailSource?: "firecrawl" | "hunter" | "both" | "none";
  contacts: DecisionMakerContact[];
  leadQualityScore?: number;
  leadQualityLabel?: "Strong lead" | "Good lead" | "Needs work";
  leadQualityReason?: string;
  dbId?: string;
}

interface SearchDiagnostics {
  discoveredCompanies: number;
  scannedWebsites: number;
  peopleFound: number;
  emailsFound: number;
  linkedinProfilesFound: number;
  savedLeads: number;
  rejectedNoPerson: number;
  rejectedNoCompany: number;
}

type Depth = "simple" | "normal" | "deep";
type LocationMode = "country" | "city";
type Strictness = "broad" | "balanced" | "strict";
type ProgressStage = "idle" | "maps" | "scrape" | "enrich" | "rank" | "done";
type SearchMode = "free" | "manual";
type ChatRole = "user" | "assistant";

interface RequiredContactFilters {
  phone: boolean;
  website: boolean;
  email: boolean;
  linkedin: boolean;
  person: boolean;
}

interface SearchConfig {
  industry: string;
  location: string;
  language: string;
  locationMode: LocationMode;
  depth: Depth;
  enrichMode: boolean;
  strictness: Strictness;
  required: RequiredContactFilters;
  preferPublicEmail: boolean;
  queryVariants?: string[];
}

interface FreeSearchPlan {
  targetBusiness: string;
  location: string;
  locationMode: LocationMode;
  depth: Depth;
  enrichMode: boolean;
  strictness: Strictness;
  requiredChannels: string[];
  queryVariants: string[];
  maxResults: number;
  summary: string;
}

interface ChatMessage {
  role: ChatRole;
  text: string;
  clarificationQuestions?: ClarificationQuestion[];
  answered?: boolean;
}

interface ClarificationQuestion {
  id: string;
  header: string;
  question: string;
  options: string[];
}

interface FreeSearchPlannerResponse {
  success: boolean;
  state?: "needs_clarification" | "ready";
  question?: string;
  missingFields?: string[];
  knownFields?: {
    targetBusiness?: string;
    location?: string;
    locationMode?: LocationMode;
    requiredChannels?: string[];
  };
  plan?: FreeSearchPlan;
  source?: string;
  error?: string;
}

interface LeadGeneratorSectionProps {
  onOpenAuth?: () => void;
  onSearchComplete?: () => void;
  onBuyCredits?: () => void;
  viewMode?: "search" | "all-leads";
  onToggleViewMode?: (mode: "search" | "all-leads") => void;
  isAdmin?: boolean;
  effectivePlan?: string;
}

const depthConfig: Record<Depth, { label: string; credits: number; maxResults: number; shards: number; websiteLimit: number; targetPeople: number }> = {
  simple: { label: "Simple", credits: 5, maxResults: 30, shards: 4, websiteLimit: 10, targetPeople: 8 },
  normal: { label: "Normal", credits: 10, maxResults: 70, shards: 10, websiteLimit: 24, targetPeople: 18 },
  deep: { label: "Deep", credits: 20, maxResults: 120, shards: 15, websiteLimit: 40, targetPeople: 32 },
};

const countryCitySeeds: Record<string, string[]> = {
  mexico: ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Queretaro", "Tijuana", "Merida", "Leon", "Cancun", "Toluca", "Chihuahua", "San Luis Potosi", "Aguascalientes", "Hermosillo", "Saltillo"],
  "united states": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin", "San Jose", "Miami", "Seattle", "Denver", "Atlanta"],
  usa: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin", "San Jose", "Miami", "Seattle", "Denver", "Atlanta"],
  canada: ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener", "London", "Victoria", "Halifax", "Saskatoon", "Regina"],
  spain: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Palma", "Bilbao", "Alicante", "Cordoba", "Valladolid", "Vigo", "Gijon", "Granada"],
  "united kingdom": ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Bristol", "Sheffield", "Edinburgh", "Cardiff", "Belfast", "Nottingham", "Newcastle", "Leicester", "Southampton"],
  uk: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Bristol", "Sheffield", "Edinburgh", "Cardiff", "Belfast", "Nottingham", "Newcastle", "Leicester", "Southampton"],
  australia: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Newcastle", "Wollongong", "Hobart", "Geelong", "Townsville", "Cairns", "Darwin", "Toowoomba"],
  germany: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Dusseldorf", "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden", "Hanover", "Nuremberg", "Bonn"],
  france: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Montpellier", "Strasbourg", "Bordeaux", "Lille", "Rennes", "Reims", "Toulon", "Grenoble", "Dijon"],
  brazil: ["Sao Paulo", "Rio de Janeiro", "Brasilia", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre", "Goiania", "Belem", "Florianopolis", "Vitoria", "Campinas"],
};

const HelpHint = ({ children }: { children: ReactNode }) => {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setPinned(prev => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="What does this mean?"
        aria-expanded={open}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border font-mono text-[9px] leading-none transition-colors ${
          open
            ? "border-[#F5FF3D] bg-[#F5FF3D] text-black"
            : "border-[#EFEDE6]/30 bg-transparent text-[#A8A59C] hover:border-[#F5FF3D] hover:text-[#F5FF3D]"
        }`}
      >
        ?
      </button>
      {open && (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="absolute left-0 top-full z-30 mt-2 w-72 border border-[#EFEDE6]/15 bg-[#0A0A0A] p-3.5 text-xs leading-5 text-[#A8A59C] shadow-[0_12px_32px_rgba(0,0,0,0.65)]"
          role="tooltip"
        >
          {children}
        </div>
      )}
    </span>
  );
};

const TypewriterText = ({ text, enabled = true, onDone }: { text: string; enabled?: boolean; onDone?: () => void }) => {
  const [displayedText, setDisplayedText] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      onDone?.();
      return;
    }

    setDisplayedText("");
    let index = 0;
    let completed = false;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const delay = reducedMotion ? 1 : 12;
    const interval = window.setInterval(() => {
      index += 1;
      setDisplayedText(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(interval);
        if (!completed) {
          completed = true;
          onDone?.();
        }
      }
    }, delay);

    return () => window.clearInterval(interval);
  }, [enabled, onDone, text]);

  return (
    <>
      {displayedText}
      {enabled && displayedText.length < text.length && <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse bg-[#F5FF3D]" />}
    </>
  );
};

const ClarificationPanel = ({
  questions,
  onSubmit,
  disabled,
}: {
  questions: ClarificationQuestion[];
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});

  const getAnswer = (question: ClarificationQuestion) => {
    const selected = answers[question.id];
    return selected === "__custom" ? (custom[question.id] || "").trim() : selected || "";
  };
  const canSubmit = questions.every(question => getAnswer(question).trim().length > 0);
  const buildAnswer = () => {
    if (questions.length === 1 && questions[0].id === "starter") return getAnswer(questions[0]);
    return questions.map(question => `${question.header}: ${getAnswer(question)}`).join("\n");
  };

  return (
    <div className="mt-3 w-full max-w-[720px] border border-[#1d9bf0]/70 bg-[#061827] shadow-[0_18px_48px_rgba(0,0,0,0.38)]">
      <div className="border-b border-[#1d9bf0]/35 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">Search details</p>
        <p className="mt-1 text-sm font-semibold text-[#EFEDE6]">Answer what applies. I’ll use this to tune the lead profile.</p>
      </div>
      <div className="grid gap-4 p-4">
        {questions.map(question => (
          <div key={question.id}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">{question.header}</p>
            <p className="mt-1 text-sm font-semibold text-[#EFEDE6]">{question.question}</p>
            <div className="mt-3 grid gap-2">
              {[...question.options, "Write my own answer"].map(option => {
                const value = option === "Write my own answer" ? "__custom" : option;
                const active = answers[question.id] === value;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [question.id]: value }))}
                    disabled={disabled}
                    className={`flex items-start gap-3 border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? "border-[#F5FF3D] bg-[#F5FF3D]/10 text-[#EFEDE6]"
                        : "border-[#EFEDE6]/10 bg-[#0A0A0A] text-[#A8A59C] hover:border-[#1d9bf0]/70 hover:text-[#EFEDE6]"
                    }`}
                  >
                    <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${active ? "border-[#F5FF3D] bg-[#F5FF3D]" : "border-[#A8A59C]/50"}`} />
                    <span className="text-sm leading-5">{option}</span>
                  </button>
                );
              })}
            </div>
            {answers[question.id] === "__custom" && (
              <input
                value={custom[question.id] || ""}
                onChange={event => setCustom(prev => ({ ...prev, [question.id]: event.target.value }))}
                disabled={disabled}
                placeholder="Type your own answer..."
                className="mt-2 h-10 w-full border border-[#EFEDE6]/15 bg-black px-3 text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50"
              />
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-[#EFEDE6]/10 p-4">
        <button
          type="button"
          onClick={() => onSubmit(buildAnswer())}
          disabled={disabled || !canSubmit}
          className="h-10 w-full border border-[#F5FF3D] bg-[#F5FF3D] px-4 font-display text-sm font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
        >
          Submit answers
        </button>
      </div>
    </div>
  );
};

const AssistantChatMessage = ({
  message,
  onSubmitClarification,
  disabled,
}: {
  message: ChatMessage;
  onSubmitClarification: (answer: string) => void;
  disabled?: boolean;
}) => {
  const [typingDone, setTypingDone] = useState(false);
  const hasClarification = Boolean(message.clarificationQuestions?.length && !message.answered);
  const handleTypingDone = useCallback(() => setTypingDone(true), []);

  return (
    <div className="max-w-[92%]">
      <div className="border border-[#EFEDE6]/10 bg-[#0A0A0A] px-3 py-2 text-sm leading-6 text-[#A8A59C]">
        <TypewriterText text={message.text} onDone={handleTypingDone} />
      </div>
      {hasClarification && typingDone && (
        <ClarificationPanel
          questions={message.clarificationQuestions || []}
          onSubmit={onSubmitClarification}
          disabled={disabled}
        />
      )}
    </div>
  );
};

const searchSchema = z.object({
  industry: z.string().trim().min(2, "Enter an industry or niche"),
  country: z.string().trim().min(2, "Enter a country"),
  language: z.string().trim().optional(),
});

const normalizeDomain = (url: string) => {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const compactUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

const getTopContact = (lead: LeadResult | { contacts?: DecisionMakerContact[] }) =>
  [...(lead.contacts || [])].sort((a, b) => (b.decisionMakerScore || 0) - (a.decisionMakerScore || 0))[0];

const getSearchCost = (depth: Depth, enrich: boolean) => (depthConfig[depth] ?? depthConfig.normal).credits * (enrich ? 2 : 1);

const hasPersonLinkedInSignal = (lead: LeadResult) =>
  Boolean(lead.contacts?.some(contact => contact.linkedinUrl && /linkedin\.com\/in\//i.test(contact.linkedinUrl)));

const hasLinkedInSignal = (lead: LeadResult) =>
  Boolean(lead.linkedinUrl || hasPersonLinkedInSignal(lead));

const GENERIC_EMAIL_LOCAL_PARTS = new Set([
  "admin",
  "contact",
  "contacto",
  "hello",
  "hola",
  "info",
  "mail",
  "office",
  "recepcion",
  "reception",
  "sales",
  "soporte",
  "support",
  "ventas",
]);

const isLikelyPersonName = (value?: string) => {
  const name = (value || "").trim();
  if (!name || name.includes("@") || /\d/.test(name)) return false;
  if (/(clinic|clinica|clínica|dental|dentist|dentista|office|contact|info|support|ventas|equipo|team|admin)/i.test(name)) return false;
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.length >= 2 && parts.length <= 5 && parts.every(part => /^[A-Za-zÀ-ÖØ-öø-ÿ'.-]{2,}$/.test(part)) && !GENERIC_EMAIL_LOCAL_PARTS.has(name.toLowerCase());
};

const hasPersonName = (lead: LeadResult) =>
  Boolean(lead.contacts?.some(contact => isLikelyPersonName(contact.fullName) || isLikelyPersonName([contact.firstName, contact.lastName].filter(Boolean).join(" "))));

const hasQualifiedPersonLead = (lead: LeadResult) => Boolean(lead.name?.trim() && hasPersonName(lead));

const getRequiredContactLabels = (required: RequiredContactFilters) => {
  const labels = [
    required.phone ? "phone" : "",
    required.website ? "website" : "",
    required.email ? "email" : "",
    required.linkedin ? "LinkedIn" : "",
    required.person ? "person" : "",
  ].filter(Boolean);
  return labels.length ? labels.join(", ") : "none";
};

const channelLabels: Record<keyof RequiredContactFilters, string> = {
  phone: "Phone",
  website: "Website",
  email: "Email",
  linkedin: "LinkedIn",
  person: "Person",
};

const requiredContactKeys = Object.keys(channelLabels) as (keyof RequiredContactFilters)[];

const channelsToRequiredContacts = (channels: string[] = []): RequiredContactFilters => {
  const normalized = new Set(channels.map(channel => channel.toLowerCase()));
  return {
    phone: normalized.has("phone") || normalized.has("whatsapp"),
    website: normalized.has("website"),
    email: normalized.has("email"),
    linkedin: normalized.has("linkedin"),
    person: normalized.has("person"),
  };
};

const requiredContactsToChannels = (required: RequiredContactFilters) =>
  requiredContactKeys.filter(key => required[key]);

const getClarificationQuestions = (
  text: string,
  missingFields: string[] = [],
  knownTarget = "",
): ClarificationQuestion[] => {
  const lower = text.toLowerCase();
  const fields = missingFields.length ? missingFields : [
    lower.includes("industry") || lower.includes("niche") || lower.includes("type of business") ? "targetBusiness" : "",
    lower.includes("where") || lower.includes("city") || lower.includes("country") || lower.includes("area") ? "location" : "",
    lower.includes("what makes") || lower.includes("good for this search") ? "quality" : "",
  ].filter(Boolean);
  const uniqueFields = [...new Set(fields)];

  return uniqueFields.flatMap(field => {
    if (field === "targetBusiness") {
      return [{
        id: "targetBusiness",
        header: "Business type",
        question: "What type of business should I look for?",
        options: ["Dental clinics", "AI agencies", "Boutique law firms"],
      }];
    }
    if (field === "location") {
      return [{
        id: "location",
        header: "Location",
        question: knownTarget ? `Where should I search for ${knownTarget}?` : "Where should I search?",
        options: ["Lisbon, Portugal", "Mexico", "Austin, Texas"],
      }];
    }
    if (field === "quality") {
      return [{
        id: "quality",
        header: "Lead quality",
        question: "Which contact signals matter most?",
        options: ["Public email + website", "Phone + likely manager", "LinkedIn + public email"],
      }];
    }
    if (field === "depth") {
      return [{
        id: "depth",
        header: "Search depth",
        question: "How broad should this search be?",
        options: ["Quick list", "Balanced search", "Deep search"],
      }];
    }
    return [];
  });
};

const makeAssistantMessage = (text: string, knownTarget = "", missingFields: string[] = []): ChatMessage => ({
  role: "assistant",
  text,
  clarificationQuestions: getClarificationQuestions(text, missingFields, knownTarget),
});

const inferBriefLocation = (brief: string) => {
  const match = brief.match(/\b(?:in|near|from)\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|$)/i);
  return match?.[1]?.trim().replace(/[.!,;:]$/, "") || "";
};

const inferBriefTarget = (brief: string, location: string) => {
  let text = brief
    .replace(/^find\s+/i, "")
    .replace(/^search\s+for\s+/i, "")
    .replace(/^show\s+me\s+/i, "")
    .replace(/\b(Business type|Location|Lead quality|Search depth|Starting point)\s*:\s*/gi, "")
    .replace(/\b(leads|businesses|companies|with email|with emails|with phone|with linkedin|with website|premium|local|small)\b/gi, "")
    .replace(/\bfor\s+(my|our)\s+(agency|business|company|service|services)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (location) text = text.replace(new RegExp(`\\bin\\s+${location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), "").trim();
  text = text.split(/\bwith\b|\bthat\b|\bwho\b|\bonly\b/i)[0].trim();
  return text.length >= 3 ? text : "";
};

const planToSearchConfig = (plan: FreeSearchPlan, brief: string): SearchConfig => {
  const lowerBrief = brief.toLowerCase();
  const requiredChannels = new Set(plan.requiredChannels.map(channel => channel.toLowerCase()));
  const wantsPerson = /owner|manager|founder|ceo|director|decision|person|people|contact/i.test(`${brief} ${plan.summary}`);
  const depth: Depth = plan.maxResults >= 60 ? "deep" : plan.maxResults <= 20 ? "simple" : "normal";
  const locationKey = plan.location.trim().toLowerCase();

  return {
    industry: plan.targetBusiness,
    location: plan.location,
    language: "",
    locationMode: plan.locationMode || (countryCitySeeds[locationKey] ? "country" : "city"),
    depth: plan.depth || depth,
    enrichMode: typeof plan.enrichMode === "boolean" ? plan.enrichMode : wantsPerson || requiredChannels.has("linkedin"),
    strictness: plan.strictness || (requiredChannels.size >= 2 || lowerBrief.includes("only") ? "strict" : "balanced"),
    required: { ...channelsToRequiredContacts(plan.requiredChannels), person: channelsToRequiredContacts(plan.requiredChannels).person || wantsPerson },
    preferPublicEmail: true,
    queryVariants: plan.queryVariants,
  };
};

const getPersonIntentTerms = (industry: string) => {
  const lower = industry.toLowerCase();
  const terms = ["owner", "founder", "director", "manager", "team", "leadership"];
  if (/(dent|odont|clinic|cl[ií]nica|dental)/i.test(lower)) {
    terms.unshift(
      "dentista director",
      "odontólogo fundador",
      "odontologa fundadora",
      "clínica dental doctores",
      "equipo dental",
      "especialistas dentales",
      "cirujano dentista",
    );
  }
  return terms;
};

const buildQueryVariants = (config: SearchConfig) => {
  const { industry, location, language, depth, locationMode } = config;
  const plannedVariants = (config.queryVariants || []).map(query => query.trim()).filter(Boolean);
  const key = location.trim().toLowerCase();
  const cities = (countryCitySeeds[key] || []).slice(0, depthConfig[depth].shards);
  const lang = language.trim();
  const personIntentTerms = getPersonIntentTerms(industry);
  const personQueries = personIntentTerms.slice(0, depth === "deep" ? 12 : depth === "normal" ? 9 : 5);
  if (locationMode === "city") {
    return [
      ...plannedVariants,
      `${industry} ${location}`,
      `${industry} near ${location}`,
      `${industry} ${location} contact`,
      `${industry} ${location} official website`,
      `${industry} ${location} doctors team`,
      `${industry} ${location} owner founder`,
      ...personQueries.map(term => `${term} ${location}`),
      lang ? `${industry} ${location} ${lang}` : "",
    ].filter(Boolean).filter((query, index, all) => all.indexOf(query) === index);
  }

  const cityQueries = cities.flatMap(city => [
    `${industry} ${city} ${location}`,
    `${industry} ${city} contact`,
    `${industry} ${city} doctors team`,
    `${industry} ${city} owner founder`,
    ...personQueries.slice(0, 4).map(term => `${term} ${city}`),
  ]);
  return [
    ...plannedVariants,
    `${industry} ${location}`,
    `${industry} ${location} contact`,
    `${industry} ${location} official website`,
    `${industry} ${location} doctors team`,
    `${industry} ${location} owner founder`,
    ...personQueries.map(term => `${term} ${location}`),
    lang ? `${industry} ${location} ${lang}` : "",
    ...cityQueries,
  ].filter(Boolean).filter((query, index, all) => all.indexOf(query) === index);
};

const calculateLeadQuality = (lead: LeadResult) => {
  const topContact = getTopContact(lead);
  let score = 0;
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (lead.phone) {
    score += 20;
    strengths.push("phone");
  } else {
    gaps.push("no phone");
  }

  if (lead.website) {
    score += 15;
    strengths.push("website");
  } else {
    gaps.push("no website");
  }

  if (lead.emails.length > 0) {
    score += 22;
    strengths.push("email");
  } else {
    gaps.push("no public email");
  }

  if (hasLinkedInSignal(lead)) {
    score += 14;
    strengths.push("LinkedIn");
  }

  if (lead.contactPageFound) {
    score += 8;
    strengths.push("contact page");
  }

  if (hasPersonName(lead)) {
    score += 16;
    strengths.push("likely person");
  }

  if (topContact?.decisionMakerScore) {
    score += Math.min(15, Math.round(topContact.decisionMakerScore / 7));
  }

  const leadQualityScore = Math.min(100, score);
  const leadQualityLabel = leadQualityScore >= 70 ? "Strong lead" : leadQualityScore >= 42 ? "Good lead" : "Needs work";
  const leadQualityReason = strengths.length
    ? `${strengths.slice(0, 4).join(" + ")} found${gaps[0] ? `, ${gaps[0]}` : ""}.`
    : `Limited contact data${gaps.length ? `: ${gaps.slice(0, 2).join(", ")}` : ""}.`;

  return { leadQualityScore, leadQualityLabel, leadQualityReason };
};

const enrichLeadQuality = (lead: LeadResult): LeadResult => ({
  ...lead,
  ...calculateLeadQuality(lead),
});

const passesQualityGate = (lead: LeadResult, _config: SearchConfig) => {
  return hasQualifiedPersonLead(lead);
};

const getPreferredSignalScore = (lead: LeadResult, required: RequiredContactFilters) =>
  (required.phone && lead.phone ? 12 : 0) +
  (required.website && lead.website ? 10 : 0) +
  (required.email && lead.emails.length > 0 ? 14 : 0) +
  (required.linkedin && hasPersonLinkedInSignal(lead) ? 14 : 0) +
  (required.person && hasPersonName(lead) ? 8 : 0);

const LeadGeneratorSection = ({ onOpenAuth, onSearchComplete, onBuyCredits, viewMode = "search", isAdmin = false, effectivePlan = "free" }: LeadGeneratorSectionProps) => {
  const { user, loading: authLoading } = useAuth();
  const { balance: creditsBalance, deduct: deductCredits } = useCredits(user?.id);
  const plan = normalizePlan(effectivePlan);

  const [searchMode, setSearchMode] = useState<SearchMode | null>(null);
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [locationMode, setLocationMode] = useState<LocationMode>("country");
  const [depth, setDepth] = useState<Depth>("normal");
  const [enrichMode, setEnrichMode] = useState(false);
  const [strictness, setStrictness] = useState<Strictness>("balanced");
  const [requiredContacts, setRequiredContacts] = useState<RequiredContactFilters>({
    phone: false,
    website: false,
    email: false,
    linkedin: false,
    person: false,
  });
  const [preferPublicEmail, setPreferPublicEmail] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<ProgressStage>("idle");
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [results, setResults] = useState<LeadResult[] | null>(null);
  const [searchDiagnostics, setSearchDiagnostics] = useState<SearchDiagnostics | null>(null);
  const [filterText, setFilterText] = useState("");
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [freeInput, setFreeInput] = useState("");
  const [freeBrief, setFreeBrief] = useState("");
  const [freeTarget, setFreeTarget] = useState("");
  const [freeLocation, setFreeLocation] = useState("");
  const [freeMessages, setFreeMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Tell me the leads you want. Include the business type, place, and any must-have contact info.",
      clarificationQuestions: [
        {
          id: "starter",
          header: "Starting point",
          question: "Which search should I build first?",
          options: [
            "Premium dental clinics in Lisbon with emails and managers",
            "AI agencies in Mexico with founders",
            "Boutique law firms in Austin with phone numbers",
          ],
        },
      ],
    },
  ]);
  const [freePlan, setFreePlan] = useState<{ plan: FreeSearchPlan; config: SearchConfig; brief: string } | null>(null);
  const [isPlanningFreeSearch, setIsPlanningFreeSearch] = useState(false);

  useEffect(() => {
    const handleLoadSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSearchMode("manual");
      setIndustry(customEvent.detail.keyword || "");
      setCountry(customEvent.detail.location || "");
      setResults(null);
      setSearchDiagnostics(null);
    };
    const handleNewSearch = () => {
      setSearchMode(null);
      setResults(null);
      setSearchDiagnostics(null);
      setFilterText("");
      setStage("idle");
      setProgress(0);
      setStatus("Ready");
    };
    window.addEventListener("loadSearch", handleLoadSearch);
    window.addEventListener("newSearch", handleNewSearch);
    return () => {
      window.removeEventListener("loadSearch", handleLoadSearch);
      window.removeEventListener("newSearch", handleNewSearch);
    };
  }, []);

  const searchCost = getSearchCost(depth, enrichMode);
  const usageType = isAdmin ? "internal" : "customer";
  const chargedCredits = isAdmin ? 0 : searchCost;
  const searchConfig: SearchConfig = {
    industry: industry.trim(),
    location: country.trim(),
    language: language.trim(),
    locationMode,
    depth,
    enrichMode,
    strictness,
    required: requiredContacts,
    preferPublicEmail,
  };

  const requestUpgrade = (reason = "Upgrade to unlock full search quality.") => {
    toast({
      title: "Upgrade for full search quality",
      description: `${PLAN_LABELS[plan]} is limited to simple searches. ${reason}`,
    });
    onBuyCredits?.();
  };

  const canRunConfig = (config: SearchConfig) => canUseSearchQuality(plan, config.depth, config.enrichMode, isAdmin);

  const progressLabels: Record<ProgressStage, string> = {
    idle: "Preparing search...",
    maps: "Searching...",
    scrape: "Scraping websites...",
    enrich: "Enriching contacts...",
    rank: "Ranking leads...",
    done: "Search complete",
  };
  const progressBlockCount = 12;
  const filledProgressBlocks = Math.max(1, Math.min(progressBlockCount, Math.ceil((displayProgress / 100) * progressBlockCount)));

  useEffect(() => {
    if (!isProcessing) {
      setDisplayProgress(stage === "done" ? 100 : 0);
      return;
    }

    setDisplayProgress(current => Math.max(current, Math.min(progress, 8)));
    const interval = window.setInterval(() => {
      setDisplayProgress(current => {
        const stageCap = stage === "maps" ? 82 : stage === "rank" ? 98 : 94;
        const target = Math.max(progress, current + (stage === "rank" ? 1.5 : 2.5));
        return Math.min(stageCap, Math.max(current + 1, target));
      });
    }, 420);

    return () => window.clearInterval(interval);
  }, [isProcessing, progress, stage]);

  const filteredResults = useMemo(() => {
    if (!results) return null;
    const q = filterText.trim().toLowerCase();
    return results.filter(lead => {
      if (!q) return true;
      const contact = getTopContact(lead);
      const haystack = [
        lead.name,
        lead.address,
        lead.website,
        lead.category,
        lead.emails.join(" "),
        contact?.fullName,
        contact?.title,
        lead.leadQualityLabel,
        lead.leadQualityReason,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [results, filterText]);

  const sortedResults = useMemo(() => {
    if (!filteredResults) return null;
    return [...filteredResults].sort((a, b) => {
      const preferenceDelta = getPreferredSignalScore(b, requiredContacts) - getPreferredSignalScore(a, requiredContacts);
      if (preferenceDelta !== 0) return preferenceDelta;
      const qualityDelta = (b.leadQualityScore || 0) - (a.leadQualityScore || 0);
      if (qualityDelta !== 0) return qualityDelta;
      const aContact = getTopContact(a);
      const bContact = getTopContact(b);
      const contactDelta = (bContact?.decisionMakerScore || 0) - (aContact?.decisionMakerScore || 0);
      if (contactDelta !== 0) return contactDelta;
      if (preferPublicEmail && a.emails.length !== b.emails.length) return b.emails.length - a.emails.length;
      if (!!a.website !== !!b.website) return a.website ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredResults, preferPublicEmail, requiredContacts]);

  const emailCount = sortedResults?.reduce((acc, lead) => acc + lead.emails.length, 0) ?? 0;
  const contactCount = sortedResults?.reduce((acc, lead) => acc + (lead.contacts?.length || 0), 0) ?? 0;
  const websiteCount = sortedResults?.filter(lead => lead.website).length ?? 0;
  const strongLeadCount = sortedResults?.filter(lead => lead.leadQualityLabel === "Strong lead").length ?? 0;

  if (viewMode === "all-leads") return null;

  const toggleRequiredContact = (key: keyof RequiredContactFilters) => {
    setRequiredContacts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyField = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKeys(prev => new Set(prev).add(key));
      setTimeout(() => setCopiedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }), 2000);
    });
  };

  const handleCopyEmails = () => {
    if (!sortedResults) return;
    const emails = sortedResults.flatMap(lead => lead.emails).filter(Boolean);
    navigator.clipboard.writeText(emails.join("\n")).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 2000);
      toast({ title: "Copied", description: `${emails.length} email(s) copied.` });
    });
  };

  const handleDownload = () => {
    if (!sortedResults) return;
    const headers = [
      "Person Name",
      "Person Title",
      "Business Name",
      "Category",
      "Address",
      "Phone",
      "Website",
      "Emails",
      "WhatsApp",
      "Social Profiles",
      "LinkedIn",
      "Lead Quality",
      "Quality Score",
      "Quality Reason",
      "Decision Maker Email",
      "Decision Maker LinkedIn",
      "Decision Maker Source",
    ];
    const rows = sortedResults.map(lead => {
      const contact = getTopContact(lead);
      return [
        contact?.fullName || "",
        contact?.title || "",
        lead.name,
        lead.category,
        lead.address,
        lead.phone,
        lead.website,
        lead.emails.join(", "),
        lead.whatsapp.join(", "),
        (lead.socialLinks || []).join(", "),
        lead.linkedinUrl || "",
        lead.leadQualityLabel || "",
        lead.leadQualityScore ?? "",
        lead.leadQualityReason || "",
        contact?.email || "",
        contact?.linkedinUrl || "",
        contact?.source || "",
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map((header, index) => ({
      wch: Math.min(Math.max(header.length, ...rows.map(row => String(row[index] || "").length)) + 2, 50),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `GlobaLeads22-${industry || "leads"}-${country || "search"}.xlsx`);
  };

  const validateSearch = () => {
    const parsed = searchSchema.safeParse({ industry, country, language });
    if (parsed.success) {
      setFieldErrors({});
      return true;
    }
    const errors: Record<string, string> = {};
    parsed.error.errors.forEach(error => {
      const key = String(error.path[0]);
      if (!errors[key]) errors[key] = error.message;
    });
    setFieldErrors(errors);
    return false;
  };

  const createSearchSession = async (config = searchConfig, creditsUsed = chargedCredits) => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from("search_sessions")
      .insert({
        user_id: user.id,
        keyword: config.industry,
        location: config.location,
        depth: config.depth,
        enrich_mode: config.enrichMode,
        usage_type: usageType,
        status: "running",
        credits_used: creditsUsed,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating search session:", error);
      return null;
    }

    return data;
  };

  const recordCreditTransaction = async (
    type: "spend" | "refund" | "admin_spend",
    amount: number,
    searchSessionId?: string | null,
    description?: string,
    config = searchConfig,
    quotedCredits = searchCost,
  ) => {
    if (!user?.id) return;
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      search_session_id: searchSessionId || null,
      type,
      amount,
      balance_after: type === "refund" ? creditsBalance : Math.max(0, creditsBalance - Math.abs(amount)),
      usage_type: usageType,
      description,
      metadata: {
        depth: config.depth,
        enrichMode: config.enrichMode,
        strictness: config.strictness,
        locationMode: config.locationMode,
        requiredContacts: config.required,
        quotedCredits,
      },
    });
  };

  const saveSearch = async (leads: LeadResult[], searchSessionId: string | null, config = searchConfig, creditsUsed = chargedCredits) => {
    if (!user?.id) return;
    try {
      let sessionId = searchSessionId;
      if (!sessionId) {
        const sessionData = await createSearchSession(config, creditsUsed);
        sessionId = sessionData?.id || null;
      }

      if (!sessionId) return;

      const { data: usageRows } = await supabase
        .from("api_usage_events")
        .select("estimated_cost_usd")
        .eq("search_session_id", sessionId);
      const estimatedCost = (usageRows || []).reduce((acc, row) => acc + Number(row.estimated_cost_usd || 0), 0);

      await supabase
        .from("search_sessions")
        .update({
          lead_count: leads.length,
          email_count: leads.reduce((acc, lead) => acc + lead.emails.length, 0),
          whatsapp_count: leads.reduce((acc, lead) => acc + lead.whatsapp.length, 0),
          credits_used: creditsUsed,
          estimated_cost_usd: estimatedCost,
          status: "completed",
        })
        .eq("id", sessionId);

      const payload = leads.map(lead => ({
        user_id: user.id,
        session_id: sessionId,
        name: lead.name,
        address: lead.address,
        phone: lead.phone,
        website: lead.website,
        category: lead.category,
        emails: lead.emails,
        whatsapp: lead.whatsapp,
        contact_page_found: lead.contactPageFound,
        contacts: lead.contacts,
        linkedin_url: lead.linkedinUrl || null,
        social_links: lead.socialLinks || [],
      }));

      let { data: saved, error: saveError } = await supabase.from("saved_leads").insert(payload).select();
      if (saveError && /linkedin_url|social_links|schema cache/i.test(saveError.message)) {
        const fallbackPayload = payload.map(({ linkedin_url: _linkedinUrl, social_links: _socialLinks, ...lead }) => lead);
        const fallback = await supabase.from("saved_leads").insert(fallbackPayload).select();
        saved = fallback.data;
        saveError = fallback.error;
      }
      if (saveError) throw saveError;
      if (saved) {
        setResults(prev => prev?.map((lead, index) => ({ ...lead, dbId: saved[index]?.id })) ?? null);
      }
    } catch (error) {
      console.error("Error saving search:", error);
    }
  };

  const refundCredits = async (searchSessionId?: string | null, creditsToRefund = searchCost, config = searchConfig) => {
    if (!user?.id) return;
    try {
      const { data: current } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      if (current) {
        await supabase
          .from("user_credits")
          .update({ balance: current.balance + creditsToRefund, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        await recordCreditTransaction("refund", creditsToRefund, searchSessionId, "Search failed refund", config, creditsToRefund);
      }
    } catch {
      console.error("Failed to refund credits");
    }
  };

  const handleGenerate = async (config = searchConfig) => {
    const runCost = getSearchCost(config.depth, config.enrichMode);
    const runChargedCredits = isAdmin ? 0 : runCost;
    const parsed = searchSchema.safeParse({ industry: config.industry, country: config.location, language: config.language });
    if (!parsed.success) {
      if (config === searchConfig) validateSearch();
      else toast({ title: "Search needs more detail", description: "Add an industry and location before running.", variant: "destructive" });
      return;
    }
    if (!isAdmin && creditsBalance < runCost) {
      toast({
        title: "Add credits to continue",
        description: `This search costs ${runCost} credits. You have ${creditsBalance}.`,
      });
      onBuyCredits?.();
      return;
    }
    if (!canRunConfig(config)) {
      requestUpgrade("Paid plans unlock normal, deep, and enrichment searches.");
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setSearchDiagnostics(null);
    setProgress(0);
    setStage("maps");
    setStatus("Searching trusted Maps businesses...");

    let creditsDeducted = false;
    let searchSessionId: string | null = null;
    try {
      const sessionData = await createSearchSession(config, runChargedCredits);
      searchSessionId = sessionData?.id || null;

      if (isAdmin) {
        await recordCreditTransaction("admin_spend", 0, searchSessionId, "Internal admin search", config, runCost);
      } else {
        await deductCredits(runCost);
        creditsDeducted = true;
        await recordCreditTransaction("spend", -runCost, searchSessionId, "Lead search", config, runCost);
      }

      const depthSettings = depthConfig[config.depth];
      const queryVariants = buildQueryVariants(config);
      const { data: mapsData, error: mapsError } = await supabase.functions.invoke("search-places", {
        body: {
          keyword: config.industry,
          location: config.location,
          maxResults: depthSettings.maxResults,
          queryVariants,
          userId: user.id,
          searchSessionId,
          depth: config.depth,
          enrichMode: config.enrichMode,
          usageType,
          creditsChargedToUser: runChargedCredits,
        },
      });

      if (mapsError || !mapsData?.success) {
        throw new Error(mapsData?.error || mapsError?.message || "Failed to search Google Maps");
      }

      const businesses: Business[] = (mapsData.businesses || []).filter((business: Business) => Boolean(business.name));
      const rejectedNoCompany = (mapsData.businesses || []).length - businesses.length;

      setProgress(25);
      setStage("scrape");
      setStatus(`Found ${businesses.length} businesses. Searching for named contacts...`);

      const leads: LeadResult[] = [];
      let scannedWebsites = 0;
      const websitesToScan = businesses
        .filter(business => business.website)
        .sort((a, b) => Number(Boolean(b.phone)) - Number(Boolean(a.phone)))
        .slice(0, depthSettings.websiteLimit);

      for (let index = 0; index < websitesToScan.length; index++) {
        if (leads.filter(hasQualifiedPersonLead).length >= depthSettings.targetPeople) break;
        const business = websitesToScan[index];
        scannedWebsites += 1;
        const currentStage = config.enrichMode ? "enrich" : "scrape";
        setStage(currentStage);
        setStatus(`${config.enrichMode ? "Enriching" : "Scraping"} ${index + 1}/${websitesToScan.length}: looking for a person at ${business.name}`);
        setProgress(25 + Math.round(((index + 1) / Math.max(1, websitesToScan.length)) * 60));

        try {
          const { data: contactData } = await supabase.functions.invoke("extract-contacts", {
            body: {
              url: business.website,
              businessName: business.name,
              location: business.address || config.location,
              enrichMode: config.enrichMode,
              industry: config.industry,
              depth: config.depth,
              userId: user.id,
              searchSessionId,
              usageType,
              creditsChargedToUser: runChargedCredits,
            },
          });
          leads.push({
            ...business,
            emails: contactData?.emails || [],
            whatsapp: contactData?.whatsapp || [],
            linkedinUrl: contactData?.linkedinUrl,
            socialLinks: contactData?.socialLinks || [],
            contactPageFound: contactData?.contactPageFound || false,
            emailSource: contactData?.emailSource || "none",
            contacts: contactData?.contacts || [],
          });
        } catch {
          leads.push({
            ...business,
            emails: [],
            whatsapp: [],
            contactPageFound: false,
            emailSource: "none",
            contacts: [],
            socialLinks: [],
          });
        }
      }

      setStage("rank");
      setStatus("Ranking leads...");
      setProgress(95);

      const seen = new Set<string>();
      const deduped = leads.map(enrichLeadQuality).filter(lead => {
        const key = lead.website ? normalizeDomain(lead.website) : lead.placeId;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const qualityFiltered = deduped.filter(lead => passesQualityGate(lead, config));
      const diagnostics: SearchDiagnostics = {
        discoveredCompanies: businesses.length,
        scannedWebsites,
        peopleFound: deduped.filter(hasQualifiedPersonLead).length,
        emailsFound: deduped.reduce((acc, lead) => acc + lead.emails.length, 0),
        linkedinProfilesFound: deduped.reduce((acc, lead) => acc + (lead.contacts?.filter(contact => contact.linkedinUrl && /linkedin\.com\/in\//i.test(contact.linkedinUrl)).length || 0), 0),
        savedLeads: qualityFiltered.length,
        rejectedNoPerson: deduped.filter(lead => lead.name?.trim() && !hasPersonName(lead)).length,
        rejectedNoCompany,
      };
      const ranked = qualityFiltered.sort((a, b) => {
        const preferenceDelta = getPreferredSignalScore(b, config.required) - getPreferredSignalScore(a, config.required);
        if (preferenceDelta !== 0) return preferenceDelta;
        const qualityDelta = (b.leadQualityScore || 0) - (a.leadQualityScore || 0);
        if (qualityDelta !== 0) return qualityDelta;
        const contactDelta = (getTopContact(b)?.decisionMakerScore || 0) - (getTopContact(a)?.decisionMakerScore || 0);
        if (contactDelta !== 0) return contactDelta;
        if (config.preferPublicEmail && a.emails.length !== b.emails.length) return b.emails.length - a.emails.length;
        if (!!a.website !== !!b.website) return a.website ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setResults(ranked);
      setSearchDiagnostics({ ...diagnostics, savedLeads: ranked.length });
      setStage("done");
      setStatus(`${ranked.length} leads ready`);
      setProgress(100);
      toast({
        title: "Search complete",
        description: ranked.length
          ? `${ranked.length} person-qualified leads found.`
          : `Found ${businesses.length} companies, but no public person names yet.`,
      });
      await saveSearch(ranked, searchSessionId, config, runChargedCredits);
      onSearchComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      const isCreditError = /INSUFFICIENT_CREDITS|Insufficient credits/i.test(message);
      setStatus(message);
      setStage("idle");
      setProgress(0);
      if (isCreditError) {
        toast({
          title: "Add credits to continue",
          description: "Your balance changed before this search could start.",
        });
        onBuyCredits?.();
      } else {
        toast({ title: "Search failed", description: message, variant: "destructive" });
      }
      if (searchSessionId) {
        await supabase.from("search_sessions").update({ status: "failed" }).eq("id", searchSessionId);
      }
      if (creditsDeducted) await refundCredits(searchSessionId, runCost, config);
    } finally {
      setIsProcessing(false);
    }
  };

  const applySearchConfigToForm = (config: SearchConfig) => {
    setIndustry(config.industry);
    setCountry(config.location);
    setLanguage(config.language);
    setLocationMode(config.locationMode);
    setDepth(config.depth);
    setEnrichMode(config.enrichMode);
    setStrictness(config.strictness);
    setRequiredContacts(config.required);
    setPreferPublicEmail(config.preferPublicEmail);
  };

  const submitFreeSearchText = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isPlanningFreeSearch || isProcessing) return;

    const nextMessages: ChatMessage[] = [...freeMessages, { role: "user", text }];
    setFreeMessages(nextMessages);
    setFreeInput("");
    setFreePlan(null);

    const nextBrief = [freeBrief, text].filter(Boolean).join("\n");
    let nextLocation = freeLocation || inferBriefLocation(nextBrief);
    let nextTarget = freeTarget || inferBriefTarget(nextBrief, nextLocation);

    setFreeBrief(nextBrief);
    setFreeTarget(nextTarget);
    setFreeLocation(nextLocation);

    setIsPlanningFreeSearch(true);

    try {
      const { data, error } = await supabase.functions.invoke("plan-lead-search", {
        body: {
          brief: nextBrief,
          messages: nextMessages,
          currentKeyword: nextTarget,
          currentLocation: nextLocation,
        },
      });
      const planner = data as FreeSearchPlannerResponse | null;
      if (error || !planner?.success) throw new Error(error?.message || planner?.error || "Could not plan search");

      if (planner.state === "needs_clarification") {
        const knownTarget = planner.knownFields?.targetBusiness || nextTarget;
        const knownLocation = planner.knownFields?.location || nextLocation;
        nextTarget = knownTarget || "";
        nextLocation = knownLocation || "";
        setFreeTarget(nextTarget);
        setFreeLocation(nextLocation);
        setFreeMessages(current => [...current, makeAssistantMessage(
          planner.question || "What else should I know before building the search plan?",
          nextTarget,
          planner.missingFields,
        )]);
        return;
      }

      if (!planner.plan) throw new Error("Could not plan search");
      const plan = planner.plan;
      const config = planToSearchConfig(plan, nextBrief);
      nextTarget = config.industry;
      nextLocation = config.location;
      setFreeTarget(nextTarget);
      setFreeLocation(nextLocation);
      setFreePlan({ plan, config, brief: nextBrief });
      setFreeMessages(current => [...current, makeAssistantMessage("Search plan ready. I built a profile from your request. Review or edit it, then start the search when it looks right.")]);
    } catch (error) {
      nextLocation = nextLocation || inferBriefLocation(nextBrief);
      nextTarget = nextTarget || inferBriefTarget(nextBrief, nextLocation);
      if (!nextTarget || !nextLocation) {
        setFreeTarget(nextTarget);
        setFreeLocation(nextLocation);
        const fallbackMissing = [!nextTarget ? "targetBusiness" : "", !nextLocation ? "location" : ""].filter(Boolean);
        setFreeMessages(current => [...current, makeAssistantMessage(
          fallbackMissing.length > 1
            ? "I need a couple more details before I can build the search correctly."
            : !nextTarget
              ? "What industry, niche, or type of business should I search for?"
              : `Where should I search for ${nextTarget}? Give me a city, area, or country.`,
          nextTarget,
          fallbackMissing,
        )]);
        console.error("Free search planning failed:", error);
        return;
      }

      const fallbackPlan: FreeSearchPlan = {
        targetBusiness: nextTarget,
        location: nextLocation,
        locationMode: countryCitySeeds[nextLocation.trim().toLowerCase()] ? "country" : "city",
        depth: "normal",
        enrichMode: /owner|manager|founder|ceo|director|decision|person|people|contact|linkedin/i.test(nextBrief),
        strictness: /only|required|must have|must-have/i.test(nextBrief) ? "strict" : "balanced",
        requiredChannels: /email/i.test(nextBrief) ? ["email", "website"] : ["phone", "website"],
        queryVariants: [`${nextTarget} ${nextLocation}`, `${nextTarget} ${nextLocation} contact`, `${nextTarget} ${nextLocation} website`],
        maxResults: 40,
        summary: `Search for ${nextTarget} in ${nextLocation}, prioritizing contact-ready leads.`,
      };
      const config = planToSearchConfig(fallbackPlan, nextBrief);
      setFreePlan({ plan: fallbackPlan, config, brief: nextBrief });
      setFreeMessages(current => [...current, makeAssistantMessage("I made a fallback search plan. Review the profile below before starting.")]);
      console.error("Free search planning failed:", error);
    } finally {
      setIsPlanningFreeSearch(false);
    }
  };

  const handleFreeSearchSubmit = async () => {
    await submitFreeSearchText(freeInput);
  };

  const handleFreeClarification = async (answer: string) => {
    setFreeMessages(current => current.map((message, index) =>
      index === current.length - 1 ? { ...message, answered: true } : message,
    ));
    await submitFreeSearchText(answer);
  };

  const startFreeSearch = () => {
    if (!freePlan) return;
    applySearchConfigToForm(freePlan.config);
    void handleGenerate(freePlan.config);
  };

  const updateFreePlanConfig = (updater: (config: SearchConfig) => SearchConfig) => {
    setFreePlan(current => {
      if (!current) return current;
      const config = updater(current.config);
      const maxResults = depthConfig[config.depth].maxResults;
      return {
        ...current,
        config,
        plan: {
          ...current.plan,
          targetBusiness: config.industry,
          location: config.location,
          locationMode: config.locationMode,
          depth: config.depth,
          enrichMode: config.enrichMode,
          strictness: config.strictness,
          requiredChannels: requiredContactsToChannels(config.required),
          maxResults,
        },
      };
    });
  };

  const searchModeCards = [
    {
      mode: "free" as const,
      badge: "Beta",
      title: "AI Search",
      description: "Describe the leads in plain language. The assistant asks follow-up questions and builds a search plan before credits are spent.",
      bullets: ["Clarifies missing target details", "Builds a lead profile", "Waits for confirmation"],
      bestFor: "Guided prospecting",
      Icon: Bot,
      featured: true,
    },
    {
      mode: "manual" as const,
      badge: "Precise",
      title: "Manual Search",
      description: "Use structured controls when you already know the niche, location, quality bar, and required contact channels.",
      bullets: ["Industry and location controls", "Depth, enrich, and strictness", "Person-first lead output"],
      bestFor: "Repeatable prospecting",
      Icon: Search,
      featured: false,
    },
  ];

  return (
    <section id="tool" className="h-full w-full overflow-auto bg-black text-[#EFEDE6]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-6">
        {authLoading && (
          <div className="flex min-h-[360px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#F5FF3D]" />
          </div>
        )}

        {!authLoading && !user && (
          <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center text-center">
            <h1 className="font-display text-4xl font-black tracking-[-0.04em] text-[#EFEDE6]">Find trusted leads from Maps.</h1>
            <p className="mt-4 text-sm leading-6 text-[#A8A59C]">Sign in to search businesses, scrape public contacts, and enrich likely decision makers.</p>
            <button
              onClick={onOpenAuth}
              className="mt-6 border border-[#F5FF3D] bg-[#F5FF3D] px-5 py-3 font-display text-sm font-bold text-black hover:bg-[#FFFE7A]"
            >
              Start searching
            </button>
          </div>
        )}

        {!authLoading && user && (
          <>
            {!searchMode && !isProcessing && !results && (
              <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-10">
                <div className="w-full max-w-6xl">
                  <div className="mb-8 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#F5FF3D]">New search</p>
                    <h1 className="mt-3 font-display text-3xl font-black leading-tight tracking-[-0.04em] text-[#EFEDE6] sm:text-4xl">Choose how you want to find leads.</h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#A8A59C]">Start guided with a prompt, or use precise manual controls for repeatable searches.</p>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {searchModeCards.map(({ mode, badge, title, description, bullets, bestFor, Icon, featured }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSearchMode(mode)}
                        className={`new-search-card group grid min-h-[390px] overflow-hidden border bg-[#0A0A0A] text-left shadow-[0_18px_46px_rgba(0,0,0,0.26)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_28px_68px_rgba(0,0,0,0.36)] md:grid-cols-[160px_minmax(0,1fr)] ${
                          featured ? "new-search-card-featured border-[#F5FF3D]/80" : "new-search-card-muted border-[#EFEDE6]/[0.16] hover:border-[#F5FF3D]/50"
                        }`}
                      >
                        <div className={`new-search-card-rail relative min-h-[138px] overflow-hidden border-b border-[#EFEDE6]/10 md:min-h-0 md:border-b-0 md:border-r ${featured ? "border-[#F5FF3D]/40" : "border-[#EFEDE6]/10"}`}>
                          <div className="absolute left-5 top-5 grid grid-cols-3 gap-2 opacity-35">
                            {Array.from({ length: 18 }).map((_, index) => (
                              <span key={index} className="h-1 w-1 rounded-full bg-current" />
                            ))}
                          </div>
                          <span className="pointer-events-none absolute -bottom-24 -right-14 h-52 w-52 rounded-full border border-current/20" />
                          <span className="pointer-events-none absolute -bottom-14 -right-4 h-40 w-40 rounded-full border border-current/25" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="grid h-24 w-24 place-items-center rounded-full border border-current/25 bg-[#FBECDA]/60 shadow-[inset_0_0_0_12px_rgba(255,255,255,0.12),0_14px_34px_rgba(0,0,0,0.20)] transition-transform duration-300 group-hover:scale-105">
                              <Icon className="h-9 w-9 text-[#0D0300]" />
                            </div>
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-col">
                          <div className="flex-1 p-6 sm:p-8">
                            <span className={`inline-flex border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${featured ? "border-[#F5FF3D] bg-black text-[#F5FF3D]" : "border-[#EFEDE6]/20 text-[#A8A59C] group-hover:border-[#F5FF3D]/70 group-hover:text-[#F5FF3D]"}`}>
                              {badge}
                            </span>
                            <h2 className="mt-7 font-display text-3xl font-black leading-none tracking-[-0.04em] text-[#EFEDE6]">{title}</h2>
                            <p className="mt-5 max-w-md text-base leading-7 text-[#A8A59C]">{description}</p>

                            <div className="mt-7 grid gap-3 border-t border-[#EFEDE6]/10 pt-6">
                              {bullets.map(item => (
                                <span key={item} className="flex items-center gap-3 text-sm text-[#A8A59C]">
                                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F5FF3D] text-black">
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  </span>
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 border-t border-[#EFEDE6]/10 px-6 py-5 sm:px-8">
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Best for</p>
                              <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-widest text-[#EFEDE6]">{bestFor}</p>
                            </div>
                            <span className="grid h-14 w-14 shrink-0 place-items-center border border-[#EFEDE6]/10 bg-[#EFEDE6]/5 text-[#A8A59C] transition-all duration-300 group-hover:translate-x-1 group-hover:border-[#FBEE03] group-hover:bg-[#FBEE03] group-hover:text-black">
                              <ArrowRight className="h-6 w-6" />
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {searchMode === "free" && (
              <div className="flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
                <div className="flex items-center justify-between gap-3 border-b border-[#EFEDE6]/10 px-3 py-2">
                  <button onClick={() => setSearchMode(null)} className="inline-flex h-8 items-center gap-1.5 border border-[#EFEDE6]/10 px-2.5 font-mono text-[9px] uppercase tracking-widest text-[#A8A59C] hover:border-[#F5FF3D]/50 hover:text-[#F5FF3D]">
                    <ArrowLeft className="h-3.5 w-3.5" /> Options
                  </button>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">AI search · beta</span>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="flex min-h-[520px] flex-col border border-[#EFEDE6]/10 bg-black lg:min-h-0">
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                      {freeMessages.map((message, index) => (
                        message.role === "assistant" ? (
                          <AssistantChatMessage
                            key={`${message.role}-${index}`}
                            message={message}
                            onSubmitClarification={answer => void handleFreeClarification(answer)}
                            disabled={isPlanningFreeSearch || isProcessing || index !== freeMessages.length - 1}
                          />
                        ) : (
                          <div key={`${message.role}-${index}`} className="ml-auto max-w-[84%] border border-[#F5FF3D]/30 bg-[#F5FF3D]/10 px-3 py-2 text-sm leading-6 text-[#EFEDE6]">
                            {message.text}
                          </div>
                        )
                      ))}
                      {isPlanningFreeSearch && (
                        <div className="inline-flex items-center gap-2 border border-[#EFEDE6]/10 bg-[#0A0A0A] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Planning
                        </div>
                      )}
                    </div>
                    <div className="border-t border-[#EFEDE6]/10 p-3">
                      <div className="flex gap-2">
                        <input
                          value={freeInput}
                          onChange={event => setFreeInput(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              void handleFreeSearchSubmit();
                            }
                          }}
                          disabled={isPlanningFreeSearch || isProcessing}
                          placeholder="Find dental clinics in Lisbon with emails and managers..."
                          className="h-10 min-w-0 flex-1 border border-[#EFEDE6]/10 bg-black px-3 text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70"
                        />
                        <button onClick={() => void handleFreeSearchSubmit()} disabled={!freeInput.trim() || isPlanningFreeSearch || isProcessing} className="h-10 border border-[#F5FF3D] bg-[#F5FF3D] px-4 font-display text-sm font-bold text-black disabled:opacity-40">
                          Send
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="flex min-h-[280px] flex-col border border-[#EFEDE6]/10 bg-black p-4 lg:min-h-0">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">Lead profile</p>
                    {freePlan ? (
                      <div className="mt-4 flex flex-1 flex-col gap-4">
                        <p className="text-sm leading-6 text-[#A8A59C]">{freePlan.plan.summary}</p>

                        <div className="grid gap-3">
                          <label className="grid gap-1.5">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Industry / niche</span>
                            <input
                              value={freePlan.config.industry}
                              onChange={event => updateFreePlanConfig(config => ({ ...config, industry: event.target.value }))}
                              disabled={isProcessing}
                              className="h-9 border border-[#EFEDE6]/15 bg-[#0A0A0A] px-2.5 text-sm text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70 disabled:opacity-50"
                            />
                          </label>

                          <label className="grid gap-1.5">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Location</span>
                            <input
                              value={freePlan.config.location}
                              onChange={event => updateFreePlanConfig(config => ({ ...config, location: event.target.value }))}
                              disabled={isProcessing}
                              className="h-9 border border-[#EFEDE6]/15 bg-[#0A0A0A] px-2.5 text-sm text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70 disabled:opacity-50"
                            />
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <label className="grid gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Location type</span>
                              <select
                                value={freePlan.config.locationMode}
                                onChange={event => updateFreePlanConfig(config => ({ ...config, locationMode: event.target.value as LocationMode }))}
                                disabled={isProcessing}
                                className="h-9 border border-[#EFEDE6]/15 bg-[#0A0A0A] px-2.5 font-mono text-[11px] uppercase tracking-widest text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70 disabled:opacity-50"
                              >
                                <option value="country">Country</option>
                                <option value="city">City / area</option>
                              </select>
                            </label>

                            <label className="grid gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Depth</span>
                              <select
                                value={freePlan.config.depth}
                                onChange={event => updateFreePlanConfig(config => ({ ...config, depth: event.target.value as Depth }))}
                                disabled={isProcessing}
                                className="h-9 border border-[#EFEDE6]/15 bg-[#0A0A0A] px-2.5 font-mono text-[11px] uppercase tracking-widest text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70 disabled:opacity-50"
                              >
                                <option value="simple">Simple</option>
                                <option value="normal" disabled={!canUseSearchQuality(plan, "normal", freePlan.config.enrichMode, isAdmin)}>Normal</option>
                                <option value="deep" disabled={!canUseSearchQuality(plan, "deep", freePlan.config.enrichMode, isAdmin)}>Deep</option>
                              </select>
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <label className="grid gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Mode</span>
                              <select
                                value={freePlan.config.enrichMode ? "enrich" : "normal"}
                                onChange={event => updateFreePlanConfig(config => ({ ...config, enrichMode: event.target.value === "enrich" }))}
                                disabled={isProcessing}
                                className="h-9 border border-[#EFEDE6]/15 bg-[#0A0A0A] px-2.5 font-mono text-[11px] uppercase tracking-widest text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70 disabled:opacity-50"
                              >
                                <option value="normal">Normal</option>
                                <option value="enrich" disabled={!canUseSearchQuality(plan, freePlan.config.depth, true, isAdmin)}>Enrich</option>
                              </select>
                            </label>

                            <label className="grid gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Strictness</span>
                              <select
                                value={freePlan.config.strictness}
                                onChange={event => updateFreePlanConfig(config => ({ ...config, strictness: event.target.value as Strictness }))}
                                disabled={isProcessing}
                                className="h-9 border border-[#EFEDE6]/15 bg-[#0A0A0A] px-2.5 font-mono text-[11px] uppercase tracking-widest text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70 disabled:opacity-50"
                              >
                                <option value="broad">Broad</option>
                                <option value="balanced">Balanced</option>
                                <option value="strict">Strict</option>
                              </select>
                            </label>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Priority signals</p>
                          <div className="flex flex-wrap gap-1.5">
                            {requiredContactKeys.map(key => {
                              const active = freePlan.config.required[key];
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => updateFreePlanConfig(config => ({ ...config, required: { ...config.required, [key]: !active } }))}
                                  disabled={isProcessing}
                                  className={`h-8 border px-2.5 font-mono text-[9px] uppercase tracking-widest transition-colors disabled:opacity-50 ${
                                    active
                                      ? "border-[#F5FF3D] bg-[#F5FF3D] text-black"
                                      : "border-[#EFEDE6]/15 bg-[#0A0A0A] text-[#A8A59C] hover:border-[#F5FF3D]/60 hover:text-[#EFEDE6]"
                                  }`}
                                >
                                  {channelLabels[key]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="border-t border-[#EFEDE6]/10 pt-3 font-mono text-[10px] uppercase tracking-widest">
                          <span className="text-[#67645B]">Cost <span className="text-[#F5FF3D]">{isAdmin ? "admin" : `${getSearchCost(freePlan.config.depth, freePlan.config.enrichMode)} credits`}</span></span>
                        </div>

                        <button onClick={startFreeSearch} disabled={isProcessing} className="mt-auto h-11 w-full border border-[#F5FF3D] bg-[#F5FF3D] px-4 font-display text-sm font-bold text-black disabled:opacity-40">
                          Start search
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm leading-6 text-[#A8A59C]">The search plan appears here after the assistant has the business type and location.</p>
                    )}
                  </aside>
                </div>
              </div>
            )}

            {searchMode === "manual" && (() => {
              const depthOrder: Depth[] = ["simple", "normal", "deep"];
              const strictnessOrder: Strictness[] = ["broad", "balanced", "strict"];
              const depthIndex = depthOrder.indexOf(depth);
              const strictnessIndex = strictnessOrder.indexOf(strictness);
              const requiredOptions = [
                { key: "phone" as const, label: "Phone", Icon: Phone },
                { key: "website" as const, label: "Website", Icon: Globe },
                { key: "email" as const, label: "Email", Icon: Mail },
                { key: "linkedin" as const, label: "LinkedIn", Icon: Linkedin },
                { key: "person" as const, label: "Person", Icon: UserRound },
              ];

              const renderRange = <T extends string>(
                value: T,
                order: T[],
                labels: Record<T, string>,
                onSelect: (next: T) => void,
                gateSearchQuality = false,
              ) => {
                const idx = order.indexOf(value);
                const heights = ["h-3", "h-5", "h-7", "h-9"];
                return (
                  <div className="flex items-end gap-2">
                    {order.map((option, i) => {
                      const active = option === value;
                      const passed = i < idx;
                      const h = heights[i] ?? "h-9";
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            if (gateSearchQuality && !canUseSearchQuality(plan, option as Depth, enrichMode, isAdmin)) {
                              requestUpgrade("Paid plans unlock normal, deep, and enrichment searches.");
                              return;
                            }
                            onSelect(option);
                          }}
                          disabled={isProcessing}
                          className="group flex flex-1 flex-col items-center gap-2 disabled:cursor-not-allowed"
                          aria-pressed={active}
                        >
                          <span className={`w-full border-2 transition-all duration-150 ${h} ${
                            active
                              ? "border-[#F5FF3D] bg-[#F5FF3D] shadow-[0_0_18px_-2px_rgba(245,255,61,0.55)]"
                              : passed
                                ? "border-[#F5FF3D]/70 bg-[#F5FF3D]/10"
                                : "border-[#EFEDE6]/20 bg-transparent group-hover:border-[#F5FF3D]/60 group-hover:bg-[#F5FF3D]/[0.06]"
                          }`} />
                          <span className={`font-mono text-[11px] uppercase tracking-widest transition-colors ${
                            active ? "text-[#F5FF3D]" : "text-[#A8A59C] group-hover:text-[#EFEDE6]"
                          }`}>
                            {labels[option]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              };

              const sectionEyebrow = (label: string, hint: ReactNode) => (
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px w-8 bg-[#F5FF3D]" />
                  <p className="font-mono text-xs uppercase tracking-[0.4em] text-[#EFEDE6]">{label}</p>
                  <HelpHint>{hint}</HelpHint>
                </div>
              );

              return (
              <div className="mx-auto flex w-full max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <button onClick={() => setSearchMode(null)} className="inline-flex h-8 items-center gap-1.5 border border-[#EFEDE6]/10 px-2.5 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] hover:border-[#F5FF3D]/50 hover:text-[#F5FF3D]">
                    <ArrowLeft className="h-3.5 w-3.5" /> Options
                  </button>
                  <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#F5FF3D]">Manual search</span>
                </div>

                <div className="mb-5">
                  <h1 className="font-display text-2xl font-black leading-tight tracking-tight text-[#EFEDE6]">Set up your search.</h1>
                  <p className="mt-1.5 max-w-xl text-sm leading-5 text-[#A8A59C]">Pick the target, the strategy, and the filters that matter.</p>
                </div>

                <div className="flex flex-1 flex-col gap-6 md:gap-7">
                  <section>
                    {sectionEyebrow("Target", (
                      <>
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6]">What to look for</p>
                        <p><span className="text-[#EFEDE6]">Industry</span> is the niche or business type. <span className="text-[#EFEDE6]">Location</span> narrows results to a country or a specific city. <span className="text-[#EFEDE6]">Language</span> is optional and skews discovery toward businesses operating in that language.</p>
                      </>
                    ))}
                    <div className="grid gap-5 md:grid-cols-[1.3fr_1fr_0.9fr]">
                      <div>
                        <div className="mb-1.5 flex h-7 items-center">
                          <label htmlFor="industry" className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Industry / niche</label>
                        </div>
                        <input
                          id="industry"
                          autoFocus
                          value={industry}
                          onChange={event => setIndustry(event.target.value)}
                          placeholder="AI agencies"
                          disabled={isProcessing}
                          className={`h-11 w-full max-w-md border bg-black px-3 font-mono text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50 ${fieldErrors.industry ? "border-[#ffb4ab]" : "border-[#EFEDE6]/15"}`}
                        />
                        {fieldErrors.industry && <p className="mt-1 font-mono text-[10px] uppercase text-[#ffb4ab]">{fieldErrors.industry}</p>}
                      </div>

                      <div>
                        <div className="mb-1.5 flex h-7 items-center justify-between gap-2">
                          <label htmlFor="country" className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Location</label>
                          <div className="relative inline-grid h-7 w-[148px] grid-cols-2 border border-[#EFEDE6]/15 bg-black">
                            <span
                              className={`absolute inset-y-0 w-1/2 transition-transform duration-200 ease-out ${
                                locationMode === "country" ? "translate-x-0 bg-[#EFEDE6]" : "translate-x-full bg-[#EFEDE6]"
                              }`}
                              aria-hidden
                            />
                            {(["country", "city"] as LocationMode[]).map(option => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setLocationMode(option)}
                                disabled={isProcessing}
                                className={`relative z-10 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                                  locationMode === option ? "text-black" : "text-[#A8A59C] hover:text-[#EFEDE6]"
                                }`}
                              >
                                {option === "country" ? "Country" : "City"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          id="country"
                          value={country}
                          onChange={event => setCountry(event.target.value)}
                          placeholder={locationMode === "country" ? "Mexico" : "Lisbon, Portugal"}
                          disabled={isProcessing}
                          className={`h-11 w-full border bg-black px-3 font-mono text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50 ${fieldErrors.country ? "border-[#ffb4ab]" : "border-[#EFEDE6]/15"}`}
                        />
                        {fieldErrors.country && <p className="mt-1 font-mono text-[10px] uppercase text-[#ffb4ab]">{fieldErrors.country}</p>}
                      </div>

                      <div>
                        <div className="mb-1.5 flex h-7 items-center">
                          <label htmlFor="language" className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Language <span className="text-[#67645B]/60">(optional)</span></label>
                        </div>
                        <input
                          id="language"
                          value={language}
                          onChange={event => setLanguage(event.target.value)}
                          placeholder="Spanish"
                          disabled={isProcessing}
                          className="h-11 w-full border border-[#EFEDE6]/15 bg-black px-3 font-mono text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    {sectionEyebrow("Strategy", (
                      <>
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6]">How hard the search works</p>
                        <p className="mb-1.5"><span className="text-[#EFEDE6]">Depth</span> — Simple pulls ~20 leads (5 cr), Normal ~40 (10 cr), Deep ~60 (20 cr).</p>
                        <p className="mb-1.5"><span className="text-[#EFEDE6]">Contact mode</span> — Normal extracts public website contacts. Enrich also adds likely decision-maker contacts (doubles credit cost).</p>
                        <p><span className="text-[#EFEDE6]">Strictness</span> — how loosely we match your niche. Broad casts a wide net; Strict keeps only tight matches.</p>
                      </>
                    ))}
                    <div className="grid gap-x-8 gap-y-5 md:grid-cols-[1fr_auto_1fr] md:items-end md:gap-x-10">
                      <div>
                        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Search depth</p>
                        {renderRange(depth, depthOrder, { simple: "Simple", normal: "Normal", deep: "Deep" }, setDepth, true)}
                      </div>

                      <div>
                        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Contact mode</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (!enrichMode && !canUseSearchQuality(plan, depth, true, isAdmin)) {
                              requestUpgrade("Paid plans unlock enrichment searches.");
                              return;
                            }
                            setEnrichMode(!enrichMode);
                          }}
                          disabled={isProcessing}
                          className="relative inline-grid h-11 w-[200px] grid-cols-2 border border-[#EFEDE6]/15 bg-black"
                        >
                          <span
                            className={`absolute inset-y-0 w-1/2 transition-transform duration-200 ease-out ${
                              enrichMode ? "translate-x-full bg-[#F5FF3D]" : "translate-x-0 bg-[#EFEDE6]"
                            }`}
                            aria-hidden
                          />
                          <span className={`relative z-10 flex items-center justify-center font-mono text-[11px] uppercase tracking-widest transition-colors ${!enrichMode ? "text-black" : "text-[#A8A59C]"}`}>
                            Normal
                          </span>
                          <span className={`relative z-10 flex items-center justify-center font-mono text-[11px] uppercase tracking-widest transition-colors ${enrichMode ? "text-black" : "text-[#A8A59C]"}`}>
                            Enrich
                          </span>
                        </button>
                      </div>

                      <div>
                        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Quality strictness</p>
                        {renderRange(strictness, strictnessOrder, { broad: "Broad", balanced: "Balanced", strict: "Strict" }, setStrictness)}
                      </div>
                    </div>
                  </section>

                  <section>
                    {sectionEyebrow("Filters", (
                      <>
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6]">Trim and rank the results</p>
                        <p className="mb-1.5"><span className="text-[#EFEDE6]">Person + company</span> are mandatory for every saved lead.</p>
                        <p className="mb-1.5"><span className="text-[#EFEDE6]">Priority signals</span> rank leads higher without hiding useful people.</p>
                        <p><span className="text-[#EFEDE6]">Prefer public email</span> — leads with a public email rank higher in the list. Leads without one are still shown.</p>
                      </>
                    ))}
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Priority signals</p>
                        <div className="flex flex-wrap gap-2">
                          {requiredOptions.map(({ key, label, Icon }) => {
                            const active = requiredContacts[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => toggleRequiredContact(key)}
                                disabled={isProcessing}
                                aria-pressed={active}
                                className={`inline-flex h-10 items-center gap-2 border px-3.5 font-mono text-[11px] uppercase tracking-widest transition-all ${
                                  active
                                    ? "border-[#F5FF3D] bg-[#F5FF3D] text-black shadow-[0_0_0_1px_rgba(245,255,61,0.4)]"
                                    : "border-[#EFEDE6]/20 bg-[#0A0A0A] text-[#A8A59C] hover:-translate-y-px hover:border-[#F5FF3D]/60 hover:text-[#EFEDE6]"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" /> {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreferPublicEmail(!preferPublicEmail)}
                        disabled={isProcessing}
                        className="group inline-flex items-center gap-3 self-start md:self-end md:pb-1"
                        aria-pressed={preferPublicEmail}
                      >
                        <span className="relative inline-flex h-5 w-9 items-center border border-[#EFEDE6]/20 bg-black">
                          <span
                            className={`absolute h-3 w-3 transition-all duration-200 ease-out ${
                              preferPublicEmail ? "left-[18px] bg-[#F5FF3D]" : "left-[2px] bg-[#A8A59C]"
                            }`}
                          />
                        </span>
                        <span className={`font-mono text-[11px] uppercase tracking-widest transition-colors ${
                          preferPublicEmail ? "text-[#EFEDE6]" : "text-[#A8A59C] group-hover:text-[#EFEDE6]"
                        }`}>
                          Prefer public email in ranking
                        </span>
                      </button>
                    </div>
                  </section>
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-[#EFEDE6]/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-widest text-[#67645B]">
                    {industry.trim()
                      ? <span className="text-[#EFEDE6]">{industry.trim()}</span>
                      : <span className="text-[#67645B]/70">Set industry</span>}
                    <span>·</span>
                    {country.trim()
                      ? <span className="text-[#EFEDE6]">{country.trim()}</span>
                      : <span className="text-[#67645B]/70">Set {locationMode}</span>}
                    <span>·</span>
                    <span className="text-[#EFEDE6]">{depthConfig[depth].label}{enrichMode ? " + Enrich" : ""}</span>
                    <span>·</span>
                    <span className="text-[#EFEDE6]">{strictness}</span>
                    {getRequiredContactLabels(requiredContacts) !== "none" && (
                      <>
                        <span>·</span>
                        <span className="text-[#EFEDE6]">{getRequiredContactLabels(requiredContacts)}</span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleGenerate()}
                    disabled={isProcessing}
                    className="h-12 border border-[#F5FF3D] bg-[#F5FF3D] px-6 font-display text-sm font-bold text-black transition-colors hover:bg-[#FFFE7A] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? "Finding leads..." : isAdmin ? `Find leads - admin` : `Find leads - ${searchCost} credits`}
                  </button>
                </div>
              </div>
              );
            })()}

            {isProcessing && (
              <div className="overflow-hidden border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-[220px] items-center gap-3">
                    <span className="relative grid h-8 w-8 place-items-center border border-[#F5FF3D]/40 bg-[#F5FF3D]/10">
                      <span className="absolute h-2 w-2 animate-ping rounded-full bg-[#F5FF3D]" />
                      <Loader2 className="relative h-4 w-4 animate-spin text-[#F5FF3D]" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-bold text-[#EFEDE6]">{progressLabels[stage]}</p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Building your lead list</p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="grid min-w-0 flex-1 grid-cols-12 gap-1.5">
                      {Array.from({ length: progressBlockCount }).map((_, index) => {
                        const filled = index < filledProgressBlocks;
                        const active = index === filledProgressBlocks - 1;
                        return (
                          <span
                            key={index}
                            className={`h-4 border transition-all duration-500 ${
                              filled
                                ? `border-[#F5FF3D] bg-[#F5FF3D] shadow-[0_0_14px_rgba(245,255,61,0.35)] ${active ? "animate-pulse" : ""}`
                                : "border-[#EFEDE6]/10 bg-[#EFEDE6]/[0.04]"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="w-12 text-right font-mono text-xs font-bold tabular-nums text-[#F5FF3D]">
                      {Math.round(displayProgress)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {results && !isProcessing && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-5">
                  {[
                    ["Leads", sortedResults?.length ?? 0],
                    ["Strong", strongLeadCount],
                    ["Websites", websiteCount],
                    ["Emails", emailCount],
                    ["Contacts", contactCount],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4">
                      <p className="font-mono text-2xl font-black text-[#EFEDE6]">{value}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{label}</p>
                    </div>
                  ))}
                </div>

                {searchDiagnostics && (
                  <div className="border border-[#F5FF3D]/25 bg-[#F5FF3D]/[0.06] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F5FF3D]">Person-first search</p>
                        <p className="mt-1 text-sm leading-6 text-[#A8A59C]">
                          Found {searchDiagnostics.discoveredCompanies} companies, scanned {searchDiagnostics.scannedWebsites} websites, and saved {searchDiagnostics.savedLeads} leads with a real person name.
                          {searchDiagnostics.rejectedNoPerson > 0 ? ` ${searchDiagnostics.rejectedNoPerson} company-only candidates were rejected.` : ""}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] sm:min-w-[360px]">
                        <span className="border border-[#EFEDE6]/10 bg-black/40 p-2"><b className="block text-base text-[#EFEDE6]">{searchDiagnostics.peopleFound}</b>People</span>
                        <span className="border border-[#EFEDE6]/10 bg-black/40 p-2"><b className="block text-base text-[#EFEDE6]">{searchDiagnostics.emailsFound}</b>Emails</span>
                        <span className="border border-[#EFEDE6]/10 bg-black/40 p-2"><b className="block text-base text-[#EFEDE6]">{searchDiagnostics.linkedinProfilesFound}</b>LinkedIn</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#67645B]" />
                    <input
                      type="text"
                      placeholder="Filter leads..."
                      value={filterText}
                      onChange={event => setFilterText(event.target.value)}
                      className="h-10 w-full border border-[#EFEDE6]/10 bg-black pl-9 pr-3 font-mono text-xs text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleCopyEmails} disabled={emailCount === 0} className="border border-[#EFEDE6]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6] hover:border-[#F5FF3D] disabled:opacity-30">
                      {emailsCopied ? "Copied emails" : "Copy emails"}
                    </button>
                    <button onClick={handleDownload} className="inline-flex items-center gap-2 border border-[#F5FF3D] bg-[#F5FF3D] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#FFFE7A]">
                      <Download className="h-3.5 w-3.5" />
                      Export XLSX
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {sortedResults?.map((lead, index) => {
                    const contact = getTopContact(lead);
                    const qualityTone =
                      lead.leadQualityLabel === "Strong lead"
                        ? "border-[#F5FF3D] text-[#F5FF3D]"
                        : lead.leadQualityLabel === "Good lead"
                          ? "border-[#8FD8FF]/70 text-[#8FD8FF]"
                          : "border-[#EFEDE6]/15 text-[#A8A59C]";
                    const badges = [
                      lead.website ? "Website" : "",
                      lead.emails.length ? "Email" : "No email",
                      lead.emailSource === "hunter" || lead.emailSource === "both" ? "Hunter" : "",
                      lead.linkedinUrl || contact?.linkedinUrl ? "LinkedIn" : "",
                      lead.socialLinks?.length ? "Social" : "",
                    ].filter(Boolean);

                    return (
                      <article key={lead.placeId || index} className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-lg font-bold tracking-[-0.02em] text-[#EFEDE6]">{contact?.fullName || "Named contact"}</h3>
                            <p className="mt-1 line-clamp-1 text-sm font-semibold text-[#A8A59C]">{lead.name}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-[#67645B]">{lead.address || lead.category?.replace(/_/g, " ") || "No location listed"}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${qualityTone}`}>
                                {lead.leadQualityLabel || "Needs work"} / {lead.leadQualityScore || 0}
                              </span>
                              {lead.leadQualityReason && <span className="text-xs text-[#A8A59C]">{lead.leadQualityReason}</span>}
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {badges.map(badge => (
                              <span key={badge} className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${badge === "No email" ? "border-[#EFEDE6]/10 text-[#67645B]" : "border-[#F5FF3D]/30 text-[#F5FF3D]"}`}>
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            {lead.emails[0] && (
                              <button onClick={() => handleCopyField(`${lead.placeId}-email`, lead.emails[0])} className="flex max-w-full items-center gap-2 truncate font-mono text-xs text-[#F5FF3D] hover:underline">
                                {copiedKeys.has(`${lead.placeId}-email`) ? <CheckCheck className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                                <span className="truncate">{lead.emails[0]}</span>
                              </button>
                            )}
                            {lead.phone && (
                              <button onClick={() => handleCopyField(`${lead.placeId}-phone`, lead.phone)} className="flex items-center gap-2 font-mono text-xs text-[#A8A59C] hover:text-[#EFEDE6]">
                                {copiedKeys.has(`${lead.placeId}-phone`) ? <CheckCheck className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                                {lead.phone}
                              </button>
                            )}
                            {lead.website && (
                              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex max-w-full items-center gap-2 truncate font-mono text-xs text-[#A8A59C] hover:text-[#EFEDE6]">
                                <Globe className="h-3.5 w-3.5" />
                                <span className="truncate">{compactUrl(lead.website)}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {lead.socialLinks?.[0] && (
                              <a href={lead.socialLinks[0]} target="_blank" rel="noopener noreferrer" className="flex max-w-full items-center gap-2 truncate font-mono text-xs text-[#A8A59C] hover:text-[#EFEDE6]">
                                <Globe className="h-3.5 w-3.5" />
                                <span className="truncate">{compactUrl(lead.socialLinks[0])}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          <div className="border border-[#EFEDE6]/10 bg-black p-3">
                            <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                              <UserRound className="h-3.5 w-3.5" />
                              Likely decision maker
                            </p>
                            {contact ? (
                              <div>
                                <p className="font-display text-sm font-bold text-[#EFEDE6]">{contact.fullName || contact.email || contact.linkedinUrl}</p>
                                {contact.title && <p className="mt-1 text-xs text-[#A8A59C]">{contact.title}</p>}
                                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">{contact.source} · {contact.decisionMakerScore}/100</p>
                                {contact.linkedinUrl && (
                                  <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-[#0A66C2] hover:text-[#4A9BE8]">
                                    <Linkedin className="h-3.5 w-3.5" />
                                    LinkedIn
                                  </a>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-[#67645B]">{enrichMode ? "No named contact found." : "Use Enrich to find named contacts."}</p>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {sortedResults?.length === 0 && (
                  <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-8 text-center">
                    <p className="font-display text-lg font-bold text-[#EFEDE6]">No leads match this filter.</p>
                    <p className="mt-2 text-sm text-[#A8A59C]">Clear the filter or run a deeper search.</p>
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </section>
  );
};

export default LeadGeneratorSection;
