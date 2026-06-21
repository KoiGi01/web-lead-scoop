import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ArrowRight,
  ArrowLeft,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Globe,
  Linkedin,
  Loader2,
  Mail,
  Paperclip,
  Phone,
  Play,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import XLSX from "xlsx-js-style";

import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { canUseSearchQuality, PLAN_LABELS, normalizePlan } from "@/lib/entitlements";
import { isOpportunityModeEnabled } from "@/lib/opportunityMode";
import {
  OpportunitySignalKey,
  opportunitySignalOptions,
  opportunitySignalLabels,
  getServiceRecommendedSignalKeys,
  getServiceSignalKeys,
  signalRequiresWebsite,
} from "@/lib/opportunitySignals";
import { ScanTarget, synthesizeScanPlanIntelligence } from "@/lib/scanPlan";
import { detectOpportunitySignals, type DetectedSignal } from "@/lib/detectOpportunitySignals";
import type { WebsiteSignals } from "../../supabase/functions/_shared/websiteSignals";
import { buildLeadIntelligence } from "@/lib/leadIntelligence";
import { computeSignalDiagnostics, type SignalDiagnostics } from "@/lib/signalDiagnostics";
import { summarizeOpportunityCard } from "@/lib/opportunityCard";
import { track } from "@/lib/analytics";

interface Business {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviewCount?: number;
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
  websiteSignals?: WebsiteSignals;
  detectedSignals?: DetectedSignal[];
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
  signals?: SignalDiagnostics;
}

type Depth = "simple" | "normal" | "deep";
type LocationMode = "country" | "city";
type Strictness = "broad" | "balanced" | "strict";
type ProgressStage = "idle" | "maps" | "scrape" | "enrich" | "rank" | "done";
type SearchMode = "free" | "manual";
type ChatRole = "user" | "assistant";

interface SearchStepStatus {
  current: number;
  total: number;
  peopleFound: number;
  businessName: string;
}

interface RequiredContactFilters {
  phone: boolean;
  website: boolean;
  email: boolean;
  linkedin: boolean;
  person: boolean;
}

interface SearchConfig {
  selectedService: string;
  industry: string;
  location: string;
  language: string;
  locationMode: LocationMode;
  depth: Depth;
  enrichMode: boolean;
  strictness: Strictness;
  required: RequiredContactFilters;
  opportunitySignals: OpportunitySignalKey[];
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
  opportunitySignals?: OpportunitySignalKey[];
  queryVariants: string[];
  maxResults: number;
  summary: string;
  service?: string;
  strategy?: string;
  scanTargets?: ScanTarget[];
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
  onSearchComplete?: (savedLeadCount?: number) => void;
  onScanStateChange?: (status: { active: boolean; progress: number; label: string }) => void;
  onBuyCredits?: () => void;
  viewMode?: "search" | "all-leads";
  onToggleViewMode?: (mode: "search" | "all-leads") => void;
  isAdmin?: boolean;
  effectivePlan?: string;
  demoMode?: boolean;
  opportunityModeEnabled?: boolean;
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
            ? "border-[#e8fb52] bg-[#e8fb52] text-black"
            : "border-[#f3f5f8]/30 bg-transparent text-[#9aa3b2] hover:border-[#e8fb52] hover:text-[#e8fb52]"
        }`}
      >
        ?
      </button>
      {open && (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="absolute left-0 top-full z-30 mt-2 w-72 border border-[#f3f5f8]/15 bg-[#111319] p-3.5 text-xs leading-5 text-[#9aa3b2] shadow-[0_12px_32px_rgba(0,0,0,0.65)]"
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
      {enabled && displayedText.length < text.length && <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse bg-[#e8fb52]" />}
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
    <div className="mt-3 w-full rounded-[12px] border border-[#f3f5f8]/[0.07] bg-[#0f1115] p-4">
      <div className="flex items-start gap-2.5 border-b border-[#f3f5f8]/[0.07] pb-3">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e8fb52]" />
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#e8fb52]">Quick clarification</p>
          <p className="mt-1 text-xs leading-5 text-[#9aa3b2]">Helps the agent tune the scan and return better prospects.</p>
        </div>
      </div>
      <div className="grid gap-4 py-4">
        {questions.map(question => (
          <div key={question.id}>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">{question.header}</p>
            <p className="mt-1 text-[13.5px] font-semibold text-[#f3f5f8]">{question.question}</p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {[...question.options, "Write my own answer"].map(option => {
                const value = option === "Write my own answer" ? "__custom" : option;
                const active = answers[question.id] === value;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [question.id]: value }))}
                    disabled={disabled}
                    className={`flex min-h-[40px] items-center gap-2 rounded-[9px] border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? "border-[#e8fb52] bg-[#e8fb52]/10 text-[#e8fb52]"
                        : "border-[#f3f5f8]/[0.13] bg-black text-[#9aa3b2] hover:border-[#e8fb52]/60 hover:text-[#f3f5f8]"
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 shrink-0 rounded-full border ${active ? "border-[#e8fb52] bg-[#e8fb52]" : "border-[#98a0af]/50"}`} />
                    <span className="text-xs font-medium leading-5">{option}</span>
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
                className="mt-2 h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60 disabled:opacity-50"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[#f3f5f8]/[0.07] pt-3.5">
        <button
          type="button"
          onClick={() => onSubmit(buildAnswer())}
          disabled={disabled || !canSubmit}
          className="h-10 rounded-[9px] bg-[#e8fb52] px-5 font-display text-sm font-bold text-[#08090c] transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
        >
          Submit
        </button>
        <span className="text-xs text-[#5d6675]">Skip to use the agent's defaults.</span>
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
    <div className="flex max-w-[88%] gap-3">
      <div className="mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] border border-[#f3f5f8]/[0.13] bg-[#1c2029] text-[#e8fb52]">
        <Bot className="h-[15px] w-[15px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">Agent</div>
        <div className="whitespace-pre-line rounded-[13px] rounded-tl-[4px] border border-[#f3f5f8]/[0.07] bg-[#14171d] px-3.5 py-2.5 text-[13.5px] leading-[1.55] text-[#f3f5f8]">
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
    </div>
  );
};

const searchSchema = z.object({
  selectedService: z.string().trim().min(2, "Choose what you sell"),
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


const getOpportunitySignalLabels = (signals: OpportunitySignalKey[] = []) =>
  signals.length ? signals.map(signal => opportunitySignalLabels[signal] || signal).join(", ") : "none";

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

const demoLeadResults: LeadResult[] = [
  {
    placeId: "demo-1",
    name: "BrightSmile Dental Clinic",
    address: "Austin, TX",
    phone: "(512) 555-0184",
    website: "https://example.com/brightsmile",
    category: "dental clinic",
    emails: ["hello@brightsmile.example"],
    whatsapp: [],
    linkedinUrl: "https://linkedin.com/in/sofia-almeida-demo",
    socialLinks: ["https://instagram.com/brightsmile-demo"],
    contactPageFound: true,
    emailSource: "both",
    contacts: [{
      fullName: "Dr. Sofia Almeida",
      title: "Clinic Director",
      source: "website",
      decisionMakerScore: 94,
      decisionMakerReason: "Team page lists clinic director.",
      email: "sofia@brightsmile.example",
      linkedinUrl: "https://linkedin.com/in/sofia-almeida-demo",
    }],
    leadQualityScore: 96,
    leadQualityLabel: "Strong lead",
    leadQualityReason: "person + website + email + phone + visible booking gap.",
    detectedSignals: [
      { key: "no_booking", present: true, confidence: 88, evidence: { sourceUrl: "https://example.com/brightsmile", snippet: "No online booking link found on the homepage." } },
      { key: "weak_website", present: true, confidence: 71, evidence: { sourceUrl: "https://example.com/brightsmile", snippet: "Single-page site with dated layout and no mobile menu." } },
    ],
  },
  {
    placeId: "demo-2",
    name: "Austin Cosmetic Dentistry",
    address: "Austin, TX",
    phone: "(512) 555-0138",
    website: "https://example.com/austin-cosmetic",
    category: "cosmetic dentist",
    emails: ["contact@austincosmetic.example"],
    whatsapp: [],
    linkedinUrl: "https://linkedin.com/in/mark-collins-demo",
    socialLinks: [],
    contactPageFound: true,
    emailSource: "firecrawl",
    contacts: [{
      fullName: "Mark Collins",
      title: "Owner",
      source: "website",
      decisionMakerScore: 86,
      decisionMakerReason: "Owner listed on about page.",
      email: "mark@austincosmetic.example",
    }],
    leadQualityScore: 88,
    leadQualityLabel: "Strong lead",
    leadQualityReason: "owner + public email + weak consultation CTA.",
    detectedSignals: [
      { key: "no_clear_cta", present: true, confidence: 80, evidence: { sourceUrl: "https://example.com/austin-cosmetic", snippet: "No consultation or quote CTA above the fold." } },
      { key: "generic_inbox", present: true, confidence: 62, evidence: { sourceUrl: "https://example.com/austin-cosmetic", snippet: "Only a generic contact@ inbox is published." } },
    ],
  },
  {
    placeId: "demo-3",
    name: "Westside Dental Studio",
    address: "Austin, TX",
    phone: "(512) 555-0172",
    website: "https://example.com/westside-dental",
    category: "dental studio",
    emails: ["info@westside.example"],
    whatsapp: [],
    socialLinks: ["https://facebook.com/westside-demo"],
    contactPageFound: true,
    emailSource: "firecrawl",
    contacts: [{
      fullName: "Sarah Nguyen",
      title: "Practice Manager",
      source: "website",
      decisionMakerScore: 78,
      decisionMakerReason: "Practice manager listed on team page.",
    }],
    leadQualityScore: 81,
    leadQualityLabel: "Good lead",
    leadQualityReason: "person + phone + website + generic inbox.",
    detectedSignals: [
      { key: "low_reviews", present: true, confidence: 66, evidence: { sourceUrl: "https://example.com/westside-dental", snippet: "Low public review count relative to nearby clinics." } },
      { key: "no_social_links", present: true, confidence: 58, evidence: { sourceUrl: "https://example.com/westside-dental", snippet: "No visible Instagram or Facebook links." } },
    ],
  },
  {
    placeId: "demo-4",
    name: "Cedar Park Family Dental",
    address: "Austin, TX",
    phone: "(512) 555-0119",
    website: "",
    category: "dental clinic",
    emails: [],
    whatsapp: [],
    socialLinks: [],
    contactPageFound: false,
    emailSource: "none",
    contacts: [],
    leadQualityScore: 68,
    leadQualityLabel: "Good lead",
    leadQualityReason: "active listing with phone, but no website at all.",
    detectedSignals: [
      { key: "no_website", present: true, confidence: 94, evidence: { sourceUrl: "no-website", snippet: "No website found in public business listings — only a Google profile." } },
    ],
  },
];

const inferBriefService = (brief: string) => {
  const lower = brief.toLowerCase();
  if (/web\s*design|website|site redesign|landing page|mobile ux|conversion/i.test(lower)) return "Web design";
  if (/\bseo\b|rank|ranking|local visibility|google business|organic/i.test(lower)) return "SEO";
  if (/ai automation|automation|automate|workflow|zapier|make\.com/i.test(lower)) return "AI automation";
  if (/booking|appointment|schedule|scheduling/i.test(lower)) return "Booking automation";
  if (/social media|instagram|tiktok|facebook|content/i.test(lower)) return "Social media marketing";
  if (/reputation|reviews|review count|ratings/i.test(lower)) return "Reputation management";
  if (/paid ads|google ads|facebook ads|meta ads|ppc/i.test(lower)) return "Paid ads";
  if (/\bcrm\b|pipeline|hubspot|salesforce/i.test(lower)) return "CRM setup";
  if (/lead gen|lead generation|prospecting|outreach/i.test(lower)) return "Lead generation";
  return "General outreach";
};

const planToSearchConfig = (plan: FreeSearchPlan, brief: string): SearchConfig => {
  const lowerBrief = brief.toLowerCase();
  const requiredChannels = new Set(plan.requiredChannels.map(channel => channel.toLowerCase()));
  const wantsPerson = /owner|manager|founder|ceo|director|decision|person|people|contact/i.test(`${brief} ${plan.summary}`);
  const depth: Depth = plan.maxResults >= 60 ? "deep" : plan.maxResults <= 20 ? "simple" : "normal";
  const locationKey = plan.location.trim().toLowerCase();
  const selectedService = inferBriefService(brief);
  const intelligence = synthesizeScanPlanIntelligence(plan.service || selectedService, {
    signals: plan.opportunitySignals,
    queryVariants: plan.queryVariants,
  });

  return {
    selectedService,
    industry: plan.targetBusiness,
    location: plan.location,
    language: "",
    locationMode: plan.locationMode || (countryCitySeeds[locationKey] ? "country" : "city"),
    depth: plan.depth || depth,
    enrichMode: typeof plan.enrichMode === "boolean" ? plan.enrichMode : wantsPerson || requiredChannels.has("linkedin"),
    strictness: plan.strictness || (requiredChannels.size >= 2 || lowerBrief.includes("only") ? "strict" : "balanced"),
    required: { ...channelsToRequiredContacts(plan.requiredChannels), person: channelsToRequiredContacts(plan.requiredChannels).person || wantsPerson },
    opportunitySignals: plan.opportunitySignals?.length ? plan.opportunitySignals : intelligence.opportunitySignals,
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

const getOpportunityLabel = (lead: LeadResult) => {
  if (lead.leadQualityLabel === "Strong lead") return "Strong opportunity";
  if (lead.leadQualityLabel === "Good lead") return "Good opportunity";
  return "Needs more evidence";
};

const customServiceValue = "__custom__";

const serviceOptions = [
  { value: "Web design", label: "Web design" },
  { value: "SEO", label: "SEO" },
  { value: "AI automation", label: "AI automation" },
  { value: "Booking automation", label: "Booking automation" },
  { value: "Social media marketing", label: "Social media" },
  { value: "Reputation management", label: "Reputation" },
  { value: "Paid ads", label: "Paid ads" },
  { value: "CRM setup", label: "CRM setup" },
  { value: "Lead generation", label: "Lead generation" },
  { value: customServiceValue, label: "Custom" },
];

const hasPresentNoWebsiteSignal = (lead: LeadResult) =>
  Boolean(lead.detectedSignals?.some(signal => signal.key === "no_website" && signal.present));

const passesQualityGate = (lead: LeadResult, _config: SearchConfig) => {
  // "No website" prospects are a valid opportunity even without a named person.
  return hasQualifiedPersonLead(lead) || hasPresentNoWebsiteSignal(lead);
};

const getPreferredSignalScore = (lead: LeadResult, required: RequiredContactFilters) =>
  (required.phone && lead.phone ? 12 : 0) +
  (required.website && lead.website ? 10 : 0) +
  (required.email && lead.emails.length > 0 ? 14 : 0) +
  (required.linkedin && hasPersonLinkedInSignal(lead) ? 14 : 0) +
  (required.person && hasPersonName(lead) ? 8 : 0);

const BURST_PROGRESS_STEPS = [24, 26, 40, 57, 68, 79, 87, 92, 96, 97];

const getBurstProgressTarget = (stage: ProgressStage, progress: number) => {
  if (stage === "done") return 100;
  if (stage === "rank") return 97;
  const desired = Math.max(progress, stage === "maps" ? 40 : stage === "scrape" ? 79 : 92);
  return BURST_PROGRESS_STEPS.find(step => step >= desired) ?? 97;
};

const getInvokeTimeoutMs = (depth: Depth) => {
  if (depth === "deep") return 22000;
  if (depth === "normal") return 18000;
  return 14000;
};

const invokeWithTimeout = async <T,>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  message = "Provider timed out",
): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

const SegmentedCircularProgress = ({ value, label }: { value: number; label: string }) => {
  const segments = 28;
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const filled = Math.round((clamped / 100) * segments);

  return (
    <div className="relative mx-auto grid h-44 w-44 place-items-center">
      <div className="absolute inset-0 rounded-full border border-[#e8fb52]/10 bg-[#e8fb52]/[0.03] shadow-[0_0_60px_rgba(245,255,61,0.08)]" />
      {Array.from({ length: segments }).map((_, index) => {
        const active = index < filled;
        return (
          <span
            key={index}
            className={`absolute left-1/2 top-1/2 h-5 w-1.5 origin-[50%_82px] -translate-x-1/2 -translate-y-[82px] rounded-[2px] transition-all duration-500 ${
              active
                ? "bg-[#e8fb52] shadow-[0_0_14px_rgba(245,255,61,0.7)]"
                : "bg-[#f3f5f8]/10"
            }`}
            style={{ transform: `translateX(-50%) translateY(-82px) rotate(${index * (360 / segments)}deg)` }}
          />
        );
      })}
      <div className="relative grid h-28 w-28 place-items-center rounded-full border border-[#f3f5f8]/10 bg-black text-center shadow-[inset_0_0_32px_rgba(245,255,61,0.04)]">
        <div>
          <p className="font-mono text-3xl font-black tabular-nums text-[#f3f5f8]">{clamped}%</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">{label}</p>
        </div>
      </div>
    </div>
  );
};

const LeadGeneratorSection = ({ onOpenAuth, onSearchComplete, onScanStateChange, onBuyCredits, viewMode = "search", isAdmin = false, effectivePlan = "free", demoMode = false, opportunityModeEnabled = false }: LeadGeneratorSectionProps) => {
  const opportunityModeOn = demoMode || opportunityModeEnabled || isOpportunityModeEnabled();
  const { user: authUser, loading: rawAuthLoading } = useAuth();
  const demoUser = demoMode ? { id: "00000000-0000-4000-8000-000000000001", email: "demo@globaleads22.local" } : null;
  const user = demoMode ? demoUser : authUser;
  const authLoading = demoMode ? false : rawAuthLoading;
  const { balance: fetchedCreditsBalance, deduct: fetchedDeductCredits } = useCredits(demoMode ? undefined : user?.id);
  const creditsBalance = demoMode ? 140 : fetchedCreditsBalance;
  const deductCredits = demoMode ? async (_amount: number) => undefined : fetchedDeductCredits;
  const plan = normalizePlan(effectivePlan);
  const hasFullAppAccess = isAdmin || plan !== "free";

  const [searchMode, setSearchMode] = useState<SearchMode | null>("manual");
  const [selectedService, setSelectedService] = useState(demoMode ? "Web design" : "");
  const [customService, setCustomService] = useState("");
  const [industry, setIndustry] = useState(demoMode ? "Dental clinics" : "");
  const [country, setCountry] = useState(demoMode ? "Austin, Texas" : "");
  const [language, setLanguage] = useState(demoMode ? "English" : "");
  const [locationMode, setLocationMode] = useState<LocationMode>(demoMode ? "city" : "country");
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
  const [opportunitySignals, setOpportunitySignals] = useState<OpportunitySignalKey[]>(
    demoMode ? ["weak_website", "no_booking", "no_clear_cta"] : [],
  );
  const [preferPublicEmail, setPreferPublicEmail] = useState(true);
  const [onlyWithWebsite, setOnlyWithWebsite] = useState(true);
  const [skipSaved, setSkipSaved] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<ProgressStage>("idle");
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [searchStepStatus, setSearchStepStatus] = useState<SearchStepStatus | null>(null);
  const [results, setResults] = useState<LeadResult[] | null>(null);
  const [searchDiagnostics, setSearchDiagnostics] = useState<SearchDiagnostics | null>(null);
  const [filterText, setFilterText] = useState("");
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const [freeInput, setFreeInput] = useState("");
  const [freeBrief, setFreeBrief] = useState("");
  const [freeTarget, setFreeTarget] = useState("");
  const [freeLocation, setFreeLocation] = useState("");
  const [freeMessages, setFreeMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Tell me the prospects you want. Include what they sell, where they are, and any public contact signals you care about.",
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
      setSearchStepStatus(null);
      setShareUrl("");
    };
    const handleNewSearch = () => {
      setSearchMode("manual");
      setSelectedService("");
      setCustomService("");
      setOpportunitySignals([]);
      setResults(null);
      setSearchDiagnostics(null);
      setSearchStepStatus(null);
      setShareUrl("");
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

  // Enrich (decision-maker discovery) is opt-in. It runs ~5 profile searches per
  // business — the dominant Firecrawl cost — and is NOT needed for opportunity
  // signals (those derive from the page scrape we do regardless). See
  // OPPORTUNITY_SIGNALS.md. Toggle lives in the "Advanced" panel below.

  const searchCost = getSearchCost(depth, enrichMode);
  const usageType = isAdmin ? "internal" : "customer";
  const chargedCredits = isAdmin ? 0 : searchCost;
  const selectedServiceValue = selectedService === customServiceValue ? customService.trim() : selectedService;
  const searchConfig: SearchConfig = {
    selectedService: selectedServiceValue,
    industry: industry.trim(),
    location: country.trim(),
    language: language.trim(),
    locationMode,
    depth,
    enrichMode,
    strictness,
    required: requiredContacts,
    opportunitySignals,
    preferPublicEmail,
  };

  const requestUpgrade = (reason = "Upgrade to unlock full search quality.") => {
    toast({
      title: "Upgrade for full search quality",
      description: `${PLAN_LABELS[plan]} is limited to simple searches. ${reason}`,
    });
    onBuyCredits?.();
  };

  const requestWorkspaceUpgrade = () => {
    toast({
      title: "Upgrade to export opportunities",
      description: "Starter and Growth unlock copy, export, and the full sales workspace.",
    });
    onBuyCredits?.();
  };

  const canRunConfig = (config: SearchConfig) => canUseSearchQuality(plan, config.depth, config.enrichMode, isAdmin);

  const progressLabels: Record<ProgressStage, string> = {
    idle: "Preparing search...",
    maps: "Searching...",
    scrape: "Scanning websites...",
    enrich: "Enriching contacts...",
    rank: "Finalizing...",
    done: "Search complete",
  };
  const progressBlockCount = 12;
  const filledProgressBlocks = Math.max(1, Math.min(progressBlockCount, Math.ceil((displayProgress / 100) * progressBlockCount)));

  useEffect(() => {
    if (!isProcessing) {
      setDisplayProgress(stage === "done" ? 100 : 0);
      return;
    }

    setDisplayProgress(current => Math.max(current, Math.min(progress, 6)));
    const interval = window.setInterval(() => {
      setDisplayProgress(current => {
        const target = getBurstProgressTarget(stage, progress);
        if (current >= target) return current;
        const gap = target - current;
        const jump = gap > 18 ? 9 : gap > 8 ? 4 : gap > 3 ? 1.4 : 0.45;
        return Math.min(target, current + jump);
      });
    }, 520);

    return () => window.clearInterval(interval);
  }, [isProcessing, progress, stage]);

  // Report scan status up so AppPage can keep a persistent progress dock alive
  // while the user navigates to other views.
  useEffect(() => {
    onScanStateChange?.({ active: isProcessing, progress: displayProgress, label: progressLabels[stage] });
  }, [isProcessing, displayProgress, stage, onScanStateChange]);

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

  const toggleOpportunitySignal = (key: OpportunitySignalKey) => {
    setOpportunitySignals(prev => {
      if (prev.includes(key)) return prev.filter(signal => signal !== key);
      // "No website" is mutually exclusive with website-derived signals.
      if (key === "no_website") {
        return [...prev.filter(signal => !signalRequiresWebsite(signal)), key];
      }
      return [...prev, key];
    });
  };

  const selectService = (value: string) => {
    setSelectedService(value);
    if (opportunitySignals.length > 0) return;
    const nextService = value === customServiceValue ? customService : value;
    setOpportunitySignals(getServiceRecommendedSignalKeys(nextService).slice(0, 3));
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
    if (!hasFullAppAccess) {
      requestWorkspaceUpgrade();
      return;
    }
    const emails = sortedResults.flatMap(lead => lead.emails).filter(Boolean);
    navigator.clipboard.writeText(emails.join("\n")).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 2000);
      toast({ title: "Copied", description: `${emails.length} email(s) copied.` });
    });
  };

  const handleDownload = () => {
    if (!sortedResults) return;
    if (!hasFullAppAccess) {
      requestWorkspaceUpgrade();
      return;
    }
    const headers = [
      "Person Name",
      "Person Title",
      "Service Sold",
      "Business Name",
      "Category",
      "Address",
      "Phone",
      "Website",
      "Emails",
      "WhatsApp",
      "Social Profiles",
      "LinkedIn",
      "Opportunity Fit",
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
        searchConfig.selectedService,
        lead.name,
        lead.category,
        lead.address,
        lead.phone,
        lead.website,
        lead.emails.join(", "),
        lead.whatsapp.join(", "),
        (lead.socialLinks || []).join(", "),
        lead.linkedinUrl || "",
        getOpportunityLabel(lead),
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
    XLSX.utils.book_append_sheet(wb, ws, "Opportunities");
    XLSX.writeFile(wb, `GlobaLeads22-${industry || "opportunities"}-${country || "search"}.xlsx`);
  };

  const createPreviewToken = () => {
    const bytes = new Uint8Array(18);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(36).padStart(2, "0")).join("").slice(0, 28);
  };

  const getPreviewBaseUrl = () => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return window.location.origin;
    }

    return "https://www.globaleads22.com";
  };

  const handleShareList = async () => {
    if (!sortedResults?.length || shareLoading) return;
    if (!user?.id && !demoMode) {
      toast({ title: "Sign in required", description: "Sign in to create public preview links.", variant: "destructive" });
      return;
    }
    setShareLoading(true);

    try {
      const token = createPreviewToken();
      const title = `${searchConfig.selectedService || "Curated"} leads in ${searchConfig.location}`;
      const previewLeads = sortedResults.map(lead => ({
        name: lead.name || "",
        address: lead.address || "",
        phone: lead.phone || "",
        website: lead.website || "",
        category: lead.category || "",
        selected_service: searchConfig.selectedService || null,
        emails: lead.emails || [],
        whatsapp: lead.whatsapp || [],
        contacts: lead.contacts || [],
        linkedin_url: lead.linkedinUrl || null,
        social_links: lead.socialLinks || [],
        contact_page_found: Boolean(lead.contactPageFound),
        intelligence: buildLeadIntelligence(lead.detectedSignals, lead.websiteSignals, searchConfig.selectedService) ?? null,
        quality_score: lead.leadQualityScore ?? null,
        quality_label: lead.leadQualityLabel || null,
        quality_reason: lead.leadQualityReason || summarizeOpportunityCard(lead.detectedSignals, searchConfig.selectedService).whyText || null,
      }));

      const previewPayload = {
        token,
        created_by: user?.id || null,
        title,
        description: `Preview list from a GlobaLeads22 search for ${searchConfig.industry} in ${searchConfig.location}.`,
        search_config: {
          industry: searchConfig.industry,
          location: searchConfig.location,
          selectedService: searchConfig.selectedService,
          opportunitySignals: searchConfig.opportunitySignals,
          depth: searchConfig.depth,
          enrichMode: searchConfig.enrichMode,
        },
        leads: previewLeads,
        lead_count: previewLeads.length,
        created_at: new Date().toISOString(),
      };

      if (demoMode) {
        const { error } = await supabase.functions.invoke("create-lead-list-preview", { body: previewPayload });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lead_list_previews").insert(previewPayload);
        if (error) throw error;
      }

      const url = `${getPreviewBaseUrl()}/preview/${token}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Preview link copied", description: "Share this public demo list with prospects or on social." });
      } catch {
        toast({ title: "Preview link ready", description: "Copy the public demo link from the preview panel." });
      }
    } catch (error) {
      console.error("Error creating lead list preview:", error);
      toast({ title: "Share failed", description: "Could not create a preview link for this list.", variant: "destructive" });
    } finally {
      setShareLoading(false);
    }
  };

  const validateSearch = () => {
    const errors: Record<string, string> = {};
    const parsed = searchSchema.safeParse({ selectedService: selectedServiceValue, industry, country, language });
    if (!parsed.success) {
      parsed.error.errors.forEach(error => {
        const key = String(error.path[0]);
        if (!errors[key]) errors[key] = error.message;
      });
    }
    if (opportunityModeOn && opportunitySignals.length === 0) {
      errors.opportunitySignals = "Select at least one opportunity signal.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createSearchSession = async (config = searchConfig, creditsUsed = chargedCredits) => {
    if (demoMode) return { id: "demo-search-session" };
    if (!user?.id) return null;
    const sessionPayload = {
      user_id: user.id,
      keyword: config.industry,
      location: config.location,
      selected_service: config.selectedService || null,
      opportunity_signals: config.opportunitySignals,
      depth: config.depth,
      enrich_mode: config.enrichMode,
      usage_type: usageType,
      status: "running",
      credits_used: creditsUsed,
      agent_plan: freePlan
        ? {
            service: freePlan.plan.service || null,
            strategy: freePlan.plan.strategy || null,
            queryVariants: freePlan.plan.queryVariants || [],
            opportunitySignals: freePlan.plan.opportunitySignals || [],
            scanTargets: freePlan.plan.scanTargets || [],
          }
        : null,
    };

    let { data, error } = await supabase
      .from("search_sessions")
      .insert(sessionPayload)
      .select()
      .single();

    if (error && /selected_service|opportunity_signals|agent_plan|schema cache/i.test(error.message)) {
      const { selected_service: _selectedService, opportunity_signals: _opportunitySignals, agent_plan: _agentPlan, ...fallbackPayload } = sessionPayload;
      const fallback = await supabase
        .from("search_sessions")
        .insert(fallbackPayload)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

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
    if (demoMode) return;
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
        selectedService: config.selectedService,
        opportunitySignals: config.opportunitySignals,
        requiredContacts: config.required,
        quotedCredits,
      },
    });
  };

  const saveSearch = async (leads: LeadResult[], searchSessionId: string | null, config = searchConfig, creditsUsed = chargedCredits) => {
    if (demoMode) return;
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
        selected_service: config.selectedService || null,
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
        intelligence: buildLeadIntelligence(lead.detectedSignals, lead.websiteSignals, config.selectedService) ?? null,
      }));

      let { data: saved, error: saveError } = await supabase.from("saved_leads").insert(payload).select();
      if (saveError && /selected_service|linkedin_url|social_links|intelligence|schema cache/i.test(saveError.message)) {
        const fallbackPayload = payload.map(({ selected_service: _selectedService, linkedin_url: _linkedinUrl, social_links: _socialLinks, intelligence: _intelligence, ...lead }) => lead);
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
    if (demoMode) return;
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
    const parsed = searchSchema.safeParse({ selectedService: config.selectedService, industry: config.industry, country: config.location, language: config.language });
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
      requestUpgrade("Starter and Growth unlock normal, deep, and enrichment searches.");
      return;
    }

    if (demoMode) {
      setIsProcessing(true);
      setResults(null);
      setSearchDiagnostics(null);
      setSearchStepStatus(null);
      setProgress(0);
      setStage("maps");
      setStatus("Searching demo businesses...");

      await new Promise(resolve => window.setTimeout(resolve, 450));
      setProgress(26);
      setStage("scrape");
      setStatus("Scanning public websites...");
      setSearchStepStatus({ current: 4, total: 12, peopleFound: 1, businessName: "BrightSmile Dental Clinic" });

      await new Promise(resolve => window.setTimeout(resolve, 650));
      setProgress(57);
      setStage("enrich");
      setStatus("Enriching contacts...");
      setSearchStepStatus({ current: 9, total: 12, peopleFound: 3, businessName: "Austin Cosmetic Dentistry" });

      await new Promise(resolve => window.setTimeout(resolve, 650));
      setProgress(96);
      setStage("rank");
      setStatus("Scoring opportunities...");

      await new Promise(resolve => window.setTimeout(resolve, 350));
      const ranked = demoLeadResults.map(enrichLeadQuality);
      setResults(ranked);
      setSearchDiagnostics({
        discoveredCompanies: 18,
        scannedWebsites: 12,
        peopleFound: 3,
        emailsFound: 4,
        linkedinProfilesFound: 2,
        savedLeads: ranked.length,
        rejectedNoPerson: 9,
        rejectedNoCompany: 0,
      });
      setSearchStepStatus(null);
      setStage("done");
      setStatus(`${ranked.length} demo opportunities ready`);
      setProgress(100);
      setIsProcessing(false);
      onSearchComplete?.(ranked.length);
      return;
    }

    setIsProcessing(true);
    track("scan_started", {
      service: config.selectedService,
      depth: config.depth,
      enrich: config.enrichMode,
      signals: config.opportunitySignals?.length || 0,
    });
    setResults(null);
    setSearchDiagnostics(null);
    setSearchStepStatus(null);
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
        await recordCreditTransaction("spend", -runCost, searchSessionId, "Opportunity search", config, runCost);
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
        const peopleFoundBefore = leads.filter(hasQualifiedPersonLead).length;
        const currentStage = config.enrichMode ? "enrich" : "scrape";
        setStage(currentStage);
        setSearchStepStatus({
          current: index + 1,
          total: websitesToScan.length,
          peopleFound: peopleFoundBefore,
          businessName: business.name,
        });
        setStatus(`${config.enrichMode ? "Enriching contacts" : "Scraping websites"} · Website ${index + 1}/${websitesToScan.length}`);
        setProgress(26 + Math.round((index / Math.max(1, websitesToScan.length)) * 66));

        try {
          const contactResponse = await invokeWithTimeout(
            supabase.functions.invoke("extract-contacts", {
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
            }),
            getInvokeTimeoutMs(config.depth),
            "Contact enrichment timed out",
          );
          const websiteSignals: WebsiteSignals | undefined = contactResponse.data?.websiteSignals;
          const detectedSignals = websiteSignals
            ? detectOpportunitySignals(
                websiteSignals,
                {
                  rating: business.rating,
                  reviewCount: business.reviewCount,
                  hasWebsite: Boolean(business.website),
                  techStack: websiteSignals.techStack,
                  ssl: websiteSignals.ssl,
                },
                config.opportunitySignals || [],
              )
            : undefined;
          const lead = {
            ...business,
            emails: contactResponse.data?.emails || [],
            whatsapp: contactResponse.data?.whatsapp || [],
            linkedinUrl: contactResponse.data?.linkedinUrl,
            socialLinks: contactResponse.data?.socialLinks || [],
            contactPageFound: contactResponse.data?.contactPageFound || false,
            emailSource: contactResponse.data?.emailSource || "none",
            contacts: contactResponse.data?.contacts || [],
            websiteSignals,
            detectedSignals,
          };
          leads.push(lead);
          setSearchStepStatus(current => current ? { ...current, peopleFound: leads.filter(hasQualifiedPersonLead).length } : current);
        } catch (error) {
          console.warn(`Skipping slow contact enrichment for ${business.name}:`, error);
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

      // "No website" prospects: a build-from-scratch web-design opportunity.
      // These have no page to scrape, so they cost no Firecrawl credits. Only
      // pulled in when the user is actually hunting for them.
      if ((config.opportunitySignals || []).includes("no_website")) {
        for (const business of businesses) {
          if (business.website) continue;
          if (leads.length >= depthSettings.maxResults) break;
          leads.push({
            ...business,
            emails: [],
            whatsapp: [],
            socialLinks: [],
            contactPageFound: false,
            emailSource: "none",
            contacts: [],
            detectedSignals: [{
              key: "no_website",
              present: true,
              confidence: 92,
              evidence: { sourceUrl: "no-website", snippet: "No website found in public business listings." },
            }],
          });
        }
      }

      setStage("rank");
      setStatus("Finalizing person-qualified opportunities...");
      setProgress(96);

      const seen = new Set<string>();
      const deduped = leads.map(enrichLeadQuality).filter(lead => {
        const key = lead.website ? normalizeDomain(lead.website) : lead.placeId;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const qualityFiltered = deduped.filter(lead => passesQualityGate(lead, config));
      setSearchStepStatus(current => current ? { ...current, peopleFound: qualityFiltered.length } : current);
      const diagnostics: SearchDiagnostics = {
        discoveredCompanies: businesses.length,
        scannedWebsites,
        peopleFound: deduped.filter(hasQualifiedPersonLead).length,
        emailsFound: deduped.reduce((acc, lead) => acc + lead.emails.length, 0),
        linkedinProfilesFound: deduped.reduce((acc, lead) => acc + (lead.contacts?.filter(contact => contact.linkedinUrl && /linkedin\.com\/in\//i.test(contact.linkedinUrl)).length || 0), 0),
        savedLeads: qualityFiltered.length,
        rejectedNoPerson: deduped.filter(lead => lead.name?.trim() && !hasPersonName(lead)).length,
        rejectedNoCompany,
        signals: config.opportunitySignals?.length
          ? computeSignalDiagnostics(deduped, config.opportunitySignals)
          : undefined,
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
      setSearchStepStatus(null);
      setStage("done");
      setStatus(`${ranked.length} opportunities ready`);
      setProgress(100);
      toast({
        title: "Search complete",
        description: ranked.length
          ? `${ranked.length} person-qualified opportunities found.`
          : `Found ${businesses.length} companies, but no public person names yet.`,
      });
      await saveSearch(ranked, searchSessionId, config, runChargedCredits);
      track("scan_completed", { leads: ranked.length, enrich: config.enrichMode, depth: config.depth });
      onSearchComplete?.(ranked.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      const isCreditError = /INSUFFICIENT_CREDITS|Insufficient credits/i.test(message);
      setStatus(message);
      setStage("idle");
      setProgress(0);
      setSearchStepStatus(null);
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
    const matchingService = serviceOptions.find(option => option.value === config.selectedService);
    setSelectedService(matchingService ? matchingService.value : customServiceValue);
    setCustomService(matchingService ? "" : config.selectedService);
    setIndustry(config.industry);
    setCountry(config.location);
    setLanguage(config.language);
    setLocationMode(config.locationMode);
    setDepth(config.depth);
    setEnrichMode(config.enrichMode);
    setStrictness(config.strictness);
    setRequiredContacts(config.required);
    setOpportunitySignals(config.opportunitySignals || []);
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
      const inferredService = (selectedServiceValue || inferBriefService(nextBrief)).trim();
      const { data, error } = await supabase.functions.invoke("plan-lead-search", {
        body: {
          brief: nextBrief,
          messages: nextMessages,
          currentKeyword: nextTarget,
          currentLocation: nextLocation,
          service: inferredService,
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
      const enriched = synthesizeScanPlanIntelligence(plan.service || config.selectedService, {
        signals: plan.opportunitySignals,
        queryVariants: plan.queryVariants,
      });
      const normalizedPlan: FreeSearchPlan = {
        ...plan,
        service: plan.service || config.selectedService,
        strategy: plan.strategy || enriched.strategy,
        scanTargets: plan.scanTargets?.length ? plan.scanTargets : enriched.scanTargets,
        opportunitySignals: plan.opportunitySignals?.length ? plan.opportunitySignals : enriched.opportunitySignals,
      };
      setFreePlan({ plan: normalizedPlan, config, brief: nextBrief });
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
        summary: `Search for ${nextTarget} in ${nextLocation}, prioritizing contact-ready prospects.`,
      };
      const config = planToSearchConfig(fallbackPlan, nextBrief);
      const fallbackEnriched = synthesizeScanPlanIntelligence(fallbackPlan.service || config.selectedService, {
        signals: fallbackPlan.opportunitySignals,
        queryVariants: fallbackPlan.queryVariants,
      });
      const normalizedFallback: FreeSearchPlan = {
        ...fallbackPlan,
        service: fallbackPlan.service || config.selectedService,
        strategy: fallbackPlan.strategy || fallbackEnriched.strategy,
        scanTargets: fallbackPlan.scanTargets?.length ? fallbackPlan.scanTargets : fallbackEnriched.scanTargets,
        opportunitySignals: fallbackPlan.opportunitySignals?.length ? fallbackPlan.opportunitySignals : fallbackEnriched.opportunitySignals,
      };
      setFreePlan({ plan: normalizedFallback, config, brief: nextBrief });
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
    // Quality is always on: enrichment (decision-maker contacts) always runs.
    const config = { ...freePlan.config, enrichMode: true };
    applySearchConfigToForm(config);
    void handleGenerate(config);
  };

  const searchModeCards = [
    {
      mode: "free" as const,
      badge: "Beta",
      title: "AI Search",
      description: "Describe the prospects you want. The assistant asks follow-up questions and builds an opportunity search plan before credits are spent.",
      bullets: ["Clarifies target and location", "Builds an opportunity brief", "Waits for confirmation"],
      bestFor: "Guided prospecting",
      Icon: Bot,
      featured: true,
    },
    {
      mode: "manual" as const,
      badge: "Precise",
      title: "Manual Search",
      description: "Use structured controls when you already know the niche, location, quality bar, and public contact signals that matter.",
      bullets: ["Industry and location controls", "Depth, enrich, and strictness", "Person-first prospect output"],
      bestFor: "Repeatable prospecting",
      Icon: Search,
      featured: false,
    },
  ];

  return (
    <section
      id="tool"
      data-opportunity-mode={opportunityModeOn ? "on" : "off"}
      className={`h-full w-full bg-black text-[#f3f5f8] ${searchMode === "free" && !isProcessing && !results ? "overflow-hidden" : "overflow-auto"}`}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-6">
        {authLoading && (
          <div className="flex min-h-[360px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#e8fb52]" />
          </div>
        )}

        {!authLoading && !user && (
          <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center text-center">
            <h1 className="font-display text-4xl font-black tracking-[-0.04em] text-[#f3f5f8]">Find prospects with a reason to buy.</h1>
            <p className="mt-4 text-sm leading-6 text-[#9aa3b2]">Sign in to discover businesses, public contact data, likely decision makers, and visible opportunity signals.</p>
            <button
              onClick={onOpenAuth}
              className="mt-6 border border-[#e8fb52] bg-[#e8fb52] px-5 py-3 font-display text-sm font-bold text-black hover:bg-[#f3ff8a]"
            >
              Start prospecting
            </button>
          </div>
        )}

        {!authLoading && user && (
          <>
            {!searchMode && !isProcessing && !results && (
              <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-10">
                <div className="w-full max-w-6xl">
                  <div className="mb-8 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#e8fb52]">New search</p>
                    <h1 className="mt-3 font-display text-3xl font-black leading-tight tracking-[-0.04em] text-[#f3f5f8] sm:text-4xl">Choose how you want to find opportunities.</h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#9aa3b2]">Start guided with a prompt, or use precise manual controls for repeatable opportunity searches.</p>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {searchModeCards.map(({ mode, badge, title, description, bullets, bestFor, Icon, featured }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSearchMode(mode)}
                        className={`new-search-card group grid min-h-[390px] overflow-hidden border bg-[#111319] text-left shadow-[0_18px_46px_rgba(0,0,0,0.26)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_28px_68px_rgba(0,0,0,0.36)] md:grid-cols-[160px_minmax(0,1fr)] ${
                          featured ? "new-search-card-featured border-[#e8fb52]/80" : "new-search-card-muted border-[#f3f5f8]/[0.16] hover:border-[#e8fb52]/50"
                        }`}
                      >
                        <div className={`new-search-card-rail relative min-h-[138px] overflow-hidden border-b border-[#f3f5f8]/10 md:min-h-0 md:border-b-0 md:border-r ${featured ? "border-[#e8fb52]/40" : "border-[#f3f5f8]/10"}`}>
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
                            <span className={`inline-flex border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${featured ? "border-[#e8fb52] bg-black text-[#e8fb52]" : "border-[#f3f5f8]/20 text-[#9aa3b2] group-hover:border-[#e8fb52]/70 group-hover:text-[#e8fb52]"}`}>
                              {badge}
                            </span>
                            <h2 className="mt-7 font-display text-3xl font-black leading-none tracking-[-0.04em] text-[#f3f5f8]">{title}</h2>
                            <p className="mt-5 max-w-md text-base leading-7 text-[#9aa3b2]">{description}</p>

                            <div className="mt-7 grid gap-3 border-t border-[#f3f5f8]/10 pt-6">
                              {bullets.map(item => (
                                <span key={item} className="flex items-center gap-3 text-sm text-[#9aa3b2]">
                                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e8fb52] text-black">
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  </span>
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 border-t border-[#f3f5f8]/10 px-6 py-5 sm:px-8">
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Best for</p>
                              <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-widest text-[#f3f5f8]">{bestFor}</p>
                            </div>
                            <span className="grid h-14 w-14 shrink-0 place-items-center border border-[#f3f5f8]/10 bg-[#f3f5f8]/5 text-[#9aa3b2] transition-all duration-300 group-hover:translate-x-1 group-hover:border-[#FBEE03] group-hover:bg-[#FBEE03] group-hover:text-black">
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

            {(searchMode === "manual" || searchMode === "free") && !isProcessing && !results && (() => {
              const mode = searchMode;
              const sizeMeta: Record<Depth, { name: string; count: string }> = {
                simple: { name: "Quick", count: "~20 prospects" },
                normal: { name: "Standard", count: "~40 prospects" },
                deep: { name: "Deep", count: "~60 prospects" },
              };

              interface PlanView {
                hasPlan: boolean;
                service: string;
                niche: string;
                location: string;
                locationMode: LocationMode;
                depth: Depth;
                strategy: string;
                queries: string[];
                signals: OpportunitySignalKey[];
                scanTargets: string[];
                canStart: boolean;
                onStart: () => void;
              }

              let view: PlanView;
              if (mode === "manual") {
                const svc = selectedServiceValue;
                const niche = industry.trim();
                const loc = country.trim();
                const canStart = Boolean(svc && niche && loc);
                const intel = synthesizeScanPlanIntelligence(svc);
                view = {
                  hasPlan: canStart,
                  service: svc,
                  niche,
                  location: loc,
                  locationMode,
                  depth,
                  strategy: intel.strategy,
                  queries: canStart ? buildQueryVariants(searchConfig).slice(0, 5) : [],
                  signals: opportunitySignals.length ? opportunitySignals : intel.opportunitySignals,
                  scanTargets: intel.scanTargets,
                  canStart,
                  onStart: () => handleGenerate(searchConfig),
                };
              } else {
                const p = freePlan;
                view = {
                  hasPlan: !!p,
                  service: p?.config.selectedService || "",
                  niche: p?.config.industry || "",
                  location: p?.config.location || "",
                  locationMode: p?.config.locationMode || "city",
                  depth: p?.config.depth || "normal",
                  strategy: p?.plan.strategy || "",
                  queries: p?.plan.queryVariants || [],
                  signals: p?.plan.opportunitySignals || [],
                  scanTargets: p?.plan.scanTargets || [],
                  canStart: !!p,
                  onStart: startFreeSearch,
                };
              }
              const cost = getSearchCost(view.depth, mode === "free" ? true : enrichMode);
              const sm = sizeMeta[view.depth];

              const sectionWrap = "border-t border-[#f3f5f8]/[0.06] px-6 py-4 first:border-t-0";
              const cardLabel = "font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b7584]";
              const chipBase = "rounded-[8px] border px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em] transition-all";
              const chipOn = "border-[#e8fb52] bg-[#e8fb52] text-[#08090c] shadow-[0_0_24px_-6px_rgba(232,251,82,0.55)]";
              const chipOff = "border-[#f3f5f8]/[0.08] bg-[#14171d] text-[#c4ccd8] hover:border-[#f3f5f8]/25 hover:bg-[#191d25] hover:text-[#f3f5f8]";
              const inputClass = "dark-autofill w-full rounded-[10px] border bg-[#0f1217] px-4 py-3 text-[17px] font-semibold tracking-[-0.01em] text-[#f3f5f8] outline-none transition-colors placeholder:text-[#454d5a] focus:border-[#e8fb52] disabled:opacity-50";
              const scanSizes: Array<{ depth: Depth; name: string; count: string }> = [
                { depth: "simple", name: "Quick", count: "~20" },
                { depth: "normal", name: "Standard", count: "~40" },
                { depth: "deep", name: "Deep", count: "~60" },
              ];
              const advancedToggles: Array<{ title: string; desc: string; value: boolean; onToggle: () => void }> = [
                { title: "Find named contacts (Enrich)", desc: "Hunt decision-maker names & emails. Better contacts, but ~2× the credits.", value: enrichMode, onToggle: () => setEnrichMode(prev => !prev) },
                { title: "Only businesses with a website", desc: "Skip shops with no site to evaluate or pitch.", value: onlyWithWebsite, onToggle: () => setOnlyWithWebsite(prev => !prev) },
                { title: "Skip prospects I've already saved", desc: "Don't spend credits re-finding businesses you have.", value: skipSaved, onToggle: () => setSkipSaved(prev => !prev) },
              ];

              return (
                <div className={`flex w-full flex-col ${mode === "free" ? "h-[calc(100vh-7.5rem)] min-h-[600px]" : "max-w-[1240px]"}`}>
                  <style>{`
                    @keyframes glRailScan { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                    @keyframes glGlow { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
                    .gl-rail-scan { animation: glRailScan 3.4s cubic-bezier(.4,0,.2,1) infinite; }
                    .gl-glow { animation: glGlow 2.6s ease-in-out infinite; }
                    @media (prefers-reduced-motion: reduce) { .gl-rail-scan, .gl-glow { animation: none !important; } }
                  `}</style>
                  <div className="mb-5 flex shrink-0 items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h1 className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] text-[#f3f5f8]">New scan</h1>
                      <p className="mt-2 max-w-[54ch] text-[13px] leading-relaxed text-[#9aa3b2]">
                        {mode === "manual"
                          ? "Tell us what you sell and who to find. The plan on the right updates as you go."
                          : "Describe who you want in plain language. The agent builds the plan before any credits are spent."}
                      </p>
                    </div>
                    <div className="inline-flex shrink-0 border border-[#f3f5f8]/[0.12] bg-[#0b0c10]">
                      <button type="button" onClick={() => setSearchMode("manual")} aria-pressed={mode === "manual"} className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${mode === "manual" ? "bg-[#e8fb52] text-[#08090c]" : "text-[#9aa3b2] hover:text-[#f3f5f8]"}`}>
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Manual
                      </button>
                      <button type="button" onClick={() => setSearchMode("free")} aria-pressed={mode === "free"} className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${mode === "free" ? "bg-[#e8fb52] text-[#08090c]" : "text-[#9aa3b2] hover:text-[#f3f5f8]"}`}>
                        <Sparkles className="h-3.5 w-3.5" /> AI assisted
                      </button>
                    </div>
                  </div>

                  <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
                    {/* LEFT PANE — input (form or chat) */}
                    <div className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#f3f5f8]/[0.08] bg-gradient-to-b from-[#101319] to-[#0a0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      {mode === "manual" ? (
                        <div className="min-h-0 flex-1 overflow-y-auto">
                          <div className={sectionWrap}>
                            <p className={cardLabel}>What do you sell</p>
                            <div className="mt-3.5 flex flex-wrap gap-2">
                              {serviceOptions.map(option => {
                                const active = selectedService === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => selectService(option.value)}
                                    aria-pressed={active}
                                    className={`${chipBase} ${active ? chipOn : chipOff}`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                            {selectedService === customServiceValue && (
                              <input
                                value={customService}
                                onChange={event => {
                                  setCustomService(event.target.value);
                                  if (opportunitySignals.length === 0) {
                                    setOpportunitySignals(getServiceRecommendedSignalKeys(event.target.value).slice(0, 3));
                                  }
                                }}
                                placeholder="Describe your service"
                                className={`mt-4 ${inputClass} ${fieldErrors.selectedService ? "border-[#ffb4ab]" : "border-[#f3f5f8]/15"}`}
                              />
                            )}
                            {fieldErrors.selectedService && <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ffb4ab]">{fieldErrors.selectedService}</p>}
                          </div>

                          {selectedService && (() => {
                            const effectiveService = selectedService === customServiceValue ? customService : selectedService;
                            const signalKeys = getServiceSignalKeys(effectiveService);
                            if (!signalKeys.length) return null;
                            const noWebsiteSelected = opportunitySignals.includes("no_website");
                            return (
                              <div className={sectionWrap}>
                                <p className={cardLabel}>Opportunity signals</p>
                                <p className="mt-2 text-[12px] leading-5 text-[#5d6675]">The gaps to look for — tuned to what you sell. Toggle what matters.</p>
                                <div className="mt-3.5 flex flex-wrap gap-2">
                                  {signalKeys.map(key => {
                                    const active = opportunitySignals.includes(key);
                                    const disabled = noWebsiteSelected && key !== "no_website" && signalRequiresWebsite(key);
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() => toggleOpportunitySignal(key)}
                                        aria-pressed={active}
                                        disabled={disabled}
                                        title={disabled ? "Needs a website — not available with “No website”." : opportunitySignalOptions.find(option => option.key === key)?.description}
                                        className={`${chipBase} ${disabled ? "cursor-not-allowed border-[#f3f5f8]/[0.05] bg-transparent text-[#3a414e] line-through" : active ? chipOn : chipOff}`}
                                      >
                                        {opportunitySignalLabels[key] || key}
                                      </button>
                                    );
                                  })}
                                </div>
                                {noWebsiteSelected && (
                                  <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#5d6675]">Website-based signals are off — these prospects have no site to scan.</p>
                                )}
                                {fieldErrors.opportunitySignals && <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ffb4ab]">{fieldErrors.opportunitySignals}</p>}
                              </div>
                            );
                          })()}

                          <div className={sectionWrap}>
                            <p className={cardLabel}>Who &amp; where</p>
                            <div className="mt-4 grid gap-6 sm:grid-cols-2">
                              <div>
                                <label htmlFor="industry" className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">Target market / niche</label>
                                <input
                                  id="industry"
                                  value={industry}
                                  onChange={event => setIndustry(event.target.value)}
                                  placeholder="Dentists"
                                  className={`mt-2 ${inputClass} ${fieldErrors.industry ? "border-[#ffb4ab]" : "border-[#f3f5f8]/15"}`}
                                />
                                {fieldErrors.industry && <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ffb4ab]">{fieldErrors.industry}</p>}
                              </div>
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <label htmlFor="country" className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">Location</label>
                                  <div className="inline-flex overflow-hidden rounded-[8px] border border-[#f3f5f8]/[0.12]">
                                    {(["country", "city"] as LocationMode[]).map(option => (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() => setLocationMode(option)}
                                        className={`px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
                                          locationMode === option ? "bg-[#e8fb52] text-[#08090c]" : "text-[#9aa3b2] hover:text-[#f3f5f8]"
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
                                  placeholder={locationMode === "country" ? "Mexico" : "Austin, TX"}
                                  className={`mt-2 ${inputClass} ${fieldErrors.country ? "border-[#ffb4ab]" : "border-[#f3f5f8]/15"}`}
                                />
                                {fieldErrors.country && <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ffb4ab]">{fieldErrors.country}</p>}
                              </div>
                            </div>
                          </div>

                          <div className={sectionWrap}>
                            <p className={cardLabel}>Scan size</p>
                            <div className="mt-3.5 grid grid-cols-3 gap-2">
                              {scanSizes.map(size => {
                                const active = depth === size.depth;
                                const credits = getSearchCost(size.depth, enrichMode);
                                return (
                                  <button
                                    key={size.depth}
                                    type="button"
                                    onClick={() => {
                                      if (!canUseSearchQuality(plan, size.depth, enrichMode, isAdmin)) {
                                        requestUpgrade("Upgrade to unlock larger, fully enriched scans.");
                                        return;
                                      }
                                      setDepth(size.depth);
                                    }}
                                    aria-pressed={active}
                                    className={`relative rounded-[12px] border p-4 text-left transition-all ${
                                      active
                                        ? "border-[#e8fb52] bg-[#e8fb52]/[0.07] shadow-[inset_0_0_0_1px_rgba(232,251,82,0.25),0_0_34px_-10px_rgba(232,251,82,0.5)]"
                                        : "border-[#f3f5f8]/[0.08] bg-[#14171d] hover:border-[#f3f5f8]/25 hover:bg-[#191d25]"
                                    }`}
                                  >
                                    {active && <Check className="absolute right-3 top-3 h-4 w-4 text-[#e8fb52]" strokeWidth={2.5} />}
                                    <div className="font-display text-[15px] font-bold tracking-[-0.02em] text-[#f3f5f8]">{size.name}</div>
                                    <div className="mt-0.5 text-[11px] text-[#5d6675]">{size.count} results</div>
                                    <div className="mt-3 font-mono text-[11px] tracking-[0.04em] text-[#e8fb52]">{credits} cr</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className={sectionWrap}>
                            <p className={cardLabel}>Advanced · optional</p>
                            <div className="mt-2 flex flex-col">
                              {advancedToggles.map((row, index) => (
                                <div key={row.title} className={`flex items-center justify-between gap-4 py-3 ${index === 0 ? "" : "border-t border-[#f3f5f8]/[0.07]"}`}>
                                  <div className="min-w-0">
                                    <b className="block text-[13px] font-semibold text-[#f3f5f8]">{row.title}</b>
                                    <span className="text-[11.5px] text-[#5d6675]">{row.desc}</span>
                                  </div>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={row.value}
                                    onClick={row.onToggle}
                                    className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${row.value ? "bg-[#e8fb52]" : "bg-[#1c2029]"}`}
                                  >
                                    <span className={`absolute top-[3px] h-4 w-4 rounded-full transition-all ${row.value ? "left-[19px] bg-[#08090c]" : "left-[3px] bg-white"}`} />
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center justify-between gap-4 border-t border-[#f3f5f8]/[0.07] py-3">
                                <div className="min-w-0">
                                  <b className="block text-[13px] font-semibold text-[#f3f5f8]">Language</b>
                                  <span className="text-[11.5px] text-[#5d6675]">Force a language for non-English markets.</span>
                                </div>
                                <input
                                  value={language}
                                  onChange={event => setLanguage(event.target.value)}
                                  placeholder="Any"
                                  className="w-[120px] shrink-0 rounded-[9px] border border-[#f3f5f8]/[0.1] bg-[#0f1217] px-3 py-2 text-[13px] text-[#f3f5f8] outline-none transition-colors placeholder:text-[#5d6675] focus:border-[#e8fb52]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex shrink-0 items-center gap-2.5 border-b border-[#f3f5f8]/[0.07] px-[18px] py-[13px]">
                            <span className="h-[7px] w-[7px] rounded-full bg-[#5fe3a1] shadow-[0_0_10px_#5fe3a1]" />
                            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#9aa3b2]">Prospecting agent</span>
                            <span className="ml-auto rounded-full border border-[#f3f5f8]/[0.13] px-2.5 py-[3px] font-mono text-[9px] uppercase tracking-[0.1em] text-[#5d6675]">Plans before it spends</span>
                          </div>
                          <div className="min-h-0 flex-1 space-y-[18px] overflow-y-auto px-5 py-[22px]">
                            {freeMessages.map((message, index) => (
                              message.role === "assistant" ? (
                                <AssistantChatMessage
                                  key={`${message.role}-${index}`}
                                  message={message}
                                  onSubmitClarification={answer => void handleFreeClarification(answer)}
                                  disabled={isPlanningFreeSearch || isProcessing || index !== freeMessages.length - 1}
                                />
                              ) : (
                                <div key={`${message.role}-${index}`} className="ml-auto flex max-w-[88%] flex-row-reverse gap-3">
                                  <div className="mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] border border-[#f3f5f8]/[0.13] bg-[#0f1115] text-[#98a0af]">
                                    <UserRound className="h-[15px] w-[15px]" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="mb-1.5 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">You</div>
                                    <div className="rounded-[13px] rounded-tr-[4px] bg-[#e8fb52] px-3.5 py-2.5 text-[13.5px] font-medium leading-[1.5] text-[#08090c]">
                                      {message.text}
                                    </div>
                                  </div>
                                </div>
                              )
                            ))}
                            {isPlanningFreeSearch && (
                              <div className="flex max-w-[88%] gap-3">
                                <div className="mt-0.5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] border border-[#f3f5f8]/[0.13] bg-[#1c2029] text-[#e8fb52]">
                                  <Bot className="h-[15px] w-[15px]" />
                                </div>
                                <div className="inline-flex items-center gap-2 self-start rounded-[13px] rounded-tl-[4px] border border-[#f3f5f8]/[0.07] bg-[#14171d] px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#9aa3b2]">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#e8fb52]" /> Planning scan
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 border-t border-[#f3f5f8]/[0.07] px-4 py-3.5">
                            <div className="flex items-center gap-2.5 rounded-[12px] border border-[#f3f5f8]/[0.13] bg-black py-[7px] pl-[15px] pr-[7px]">
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
                                placeholder="Refine the plan — add a city, a niche detail, anything…"
                                className="h-9 min-w-0 flex-1 bg-transparent text-[14px] text-[#f3f5f8] outline-none placeholder:text-[#5d6675] disabled:opacity-50"
                              />
                              <button
                                type="button"
                                onClick={() => void handleFreeSearchSubmit()}
                                disabled={!freeInput.trim() || isPlanningFreeSearch || isProcessing}
                                aria-label="Send"
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] bg-[#e8fb52] text-[#08090c] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Send className="h-[17px] w-[17px]" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* RIGHT PANE — live scan summary rail */}
                    <div className="flex flex-col self-start overflow-hidden rounded-[14px] border border-[#f3f5f8]/[0.1] bg-gradient-to-b from-[#16191f] to-[#0a0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:sticky lg:top-2 lg:max-h-[calc(100vh-9rem)]">
                      <div className="relative shrink-0 border-b border-[#f3f5f8]/[0.08] px-5 pb-3.5 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e8fb52]">Scan plan</div>
                          {view.hasPlan && (
                            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5fe3a1]">
                              <span className="gl-glow h-1.5 w-1.5 rounded-full bg-[#5fe3a1]" /> Ready
                            </div>
                          )}
                        </div>
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px overflow-hidden">
                          <div className="gl-rail-scan h-px w-1/2 bg-gradient-to-r from-transparent via-[#e8fb52] to-transparent" />
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                        <div className="font-display text-[16px] font-bold leading-snug tracking-[-0.02em]">
                          <span className={view.service ? "text-[#e8fb52]" : "text-[#3a414e]"}>{view.service || "What you sell"}</span>
                          <span className="text-[#5d6675]"> → </span>
                          <span className={view.niche ? "text-[#f3f5f8]" : "text-[#3a414e]"}>{view.niche || "niche"}</span>
                          <span className="text-[#5d6675]"> · </span>
                          <span className={view.location ? "text-[#f3f5f8]" : "text-[#3a414e]"}>{view.location || "location"}</span>
                        </div>
                        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#5d6675]">
                          {sm.name} · {sm.count}{enrichMode || mode === "free" ? " · contacts included" : ""}
                        </div>

                        {view.hasPlan ? (
                          <>
                            {view.strategy && (
                              <div className="mt-5 border-t border-[#f3f5f8]/[0.08] pt-4">
                                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">Strategy</div>
                                <p className="mt-2 text-[12.5px] leading-[1.55] text-[#9aa3b2]">{view.strategy}</p>
                              </div>
                            )}

                            {!!view.queries.length && (
                              <div className="mt-5 border-t border-[#f3f5f8]/[0.08] pt-4">
                                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">Search queries</div>
                                <ul className="mt-2.5 space-y-1.5">
                                  {view.queries.slice(0, 6).map((q, i) => (
                                    <li key={`${q}-${i}`} className="truncate font-mono text-[11px] text-[#f3f5f8]/90">
                                      <span className="text-[#5d6675]">{String(i + 1).padStart(2, "0")}</span> {q}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {(!!view.signals.length || !!view.scanTargets.length) && (
                              <div className="mt-5 border-t border-[#f3f5f8]/[0.08] pt-4">
                                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">The agent will look for</div>
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {view.signals.map(sig => (
                                    <span key={sig} className="border border-[#e8fb52]/30 bg-[#e8fb52]/[0.08] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#e8fb52]">
                                      {opportunitySignalLabels[sig] || sig}
                                    </span>
                                  ))}
                                  {view.scanTargets.map(target => (
                                    <span key={target} className="border border-[#f3f5f8]/[0.14] bg-transparent px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#98a0af]">
                                      {target}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="mt-5 border-t border-[#f3f5f8]/[0.08] pt-4">
                            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">How it works</div>
                            <ol className="mt-3 space-y-2.5">
                              {[
                                { n: "1", t: "Pick what you sell", done: Boolean(view.service) },
                                { n: "2", t: "Add a niche & location", done: Boolean(view.niche && view.location) },
                                { n: "3", t: "Start the scan", done: false },
                              ].map(stepItem => (
                                <li key={stepItem.n} className="flex items-center gap-3">
                                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${stepItem.done ? "border-[#e8fb52] bg-[#e8fb52] text-[#08090c]" : "border-[#f3f5f8]/15 bg-[#14171d] text-[#6b7584]"}`}>
                                    {stepItem.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : stepItem.n}
                                  </span>
                                  <span className={`text-[13px] ${stepItem.done ? "text-[#f3f5f8]" : "text-[#9aa3b2]"}`}>{stepItem.t}</span>
                                </li>
                              ))}
                            </ol>
                            <p className="mt-4 text-[11.5px] leading-5 text-[#5d6675]">
                              {mode === "manual"
                                ? "Your queries and opportunity signals build here as you go."
                                : "The agent plans the scan here before you spend any credits."}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 border-t border-[#f3f5f8]/[0.08] bg-[#08090c]/60 px-5 py-4">
                        <div className="mb-3.5 flex items-end justify-between gap-4">
                          <div>
                            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5d6675]">Your credits</div>
                            <div className="mt-1 font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#f3f5f8]">{creditsBalance}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5d6675]">This scan</div>
                            <div className="mt-1 font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#e8fb52]">{isAdmin ? "Free" : `${cost} cr`}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={view.onStart}
                          disabled={!view.canStart || isProcessing}
                          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-[#e8fb52] font-display text-[15px] font-bold text-[#08090c] shadow-[0_8px_26px_-10px_rgba(232,251,82,0.55)] transition-all hover:bg-white hover:shadow-[0_12px_34px_-8px_rgba(232,251,82,0.6)] disabled:cursor-not-allowed disabled:opacity-25 disabled:shadow-none"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          {isProcessing ? "Scanning…" : isAdmin ? "Start scan · admin" : view.canStart ? `Start scan · ${cost} credits` : "Complete the form to start"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {isProcessing && (
              <div className="overflow-hidden border border-[#f3f5f8]/[0.14] bg-[#111319] px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-[220px] items-center gap-3">
                    <span className="relative grid h-8 w-8 place-items-center border border-[#e8fb52]/40 bg-[#e8fb52]/10">
                      <span className="absolute h-2 w-2 animate-ping rounded-full bg-[#e8fb52]" />
                      <Loader2 className="relative h-4 w-4 animate-spin text-[#e8fb52]" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-bold text-[#f3f5f8]">{progressLabels[stage]}</p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                        {searchStepStatus
                          ? `Website ${searchStepStatus.current}/${searchStepStatus.total}`
                          : stage === "rank"
                            ? "Finalizing..."
                            : "Building your opportunity list"}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="grid min-w-0 flex-1 grid-cols-12 gap-1.5">
                        {Array.from({ length: progressBlockCount }).map((_, index) => {
                          const filled = index < filledProgressBlocks;
                          const active = index === filledProgressBlocks - 1;
                          return (
                            <span
                              key={index}
                              className={`h-4 border transition-all duration-500 ${
                                filled
                                  ? `border-[#e8fb52] bg-[#e8fb52] shadow-[0_0_14px_rgba(245,255,61,0.35)] ${active ? "animate-pulse" : ""}`
                                  : "border-[#f3f5f8]/10 bg-[#f3f5f8]/[0.04]"
                              }`}
                            />
                          );
                        })}
                      </div>
                      <span className="w-12 text-right font-mono text-xs font-bold tabular-nums text-[#e8fb52]">
                        {Math.round(displayProgress)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                      <span>{searchStepStatus ? "Finding people, emails, and public profiles" : status}</span>
                      {searchStepStatus && <span className="text-[#e8fb52]">People found: {searchStepStatus.peopleFound}</span>}
                      {searchStepStatus?.businessName && <span className="max-w-[320px] truncate text-[#9aa3b2]">{searchStepStatus.businessName}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {results && !isProcessing && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-5">
                  {[
                    ["Opportunities", sortedResults?.length ?? 0],
                    ["Strong fits", strongLeadCount],
                    ["Websites", websiteCount],
                    ["Emails", emailCount],
                    ["Contacts", contactCount],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border border-[#f3f5f8]/[0.14] bg-[#111319] p-4">
                      <p className="font-mono text-2xl font-black text-[#f3f5f8]">{value}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">{label}</p>
                    </div>
                  ))}
                </div>

                {searchDiagnostics && (
                  <div className="border border-[#e8fb52]/25 bg-[#e8fb52]/[0.06] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e8fb52]">Person-first search</p>
                        <p className="mt-1 text-sm leading-6 text-[#9aa3b2]">
                          Found {searchDiagnostics.discoveredCompanies} companies, scanned {searchDiagnostics.scannedWebsites} websites, and saved {searchDiagnostics.savedLeads} opportunities with a real person name.
                          {searchDiagnostics.rejectedNoPerson > 0 ? ` ${searchDiagnostics.rejectedNoPerson} company-only candidates were rejected.` : ""}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] sm:min-w-[360px]">
                        <span className="border border-[#f3f5f8]/10 bg-black/40 p-2"><b className="block text-base text-[#f3f5f8]">{searchDiagnostics.peopleFound}</b>People</span>
                        <span className="border border-[#f3f5f8]/10 bg-black/40 p-2"><b className="block text-base text-[#f3f5f8]">{searchDiagnostics.emailsFound}</b>Emails</span>
                        <span className="border border-[#f3f5f8]/10 bg-black/40 p-2"><b className="block text-base text-[#f3f5f8]">{searchDiagnostics.linkedinProfilesFound}</b>LinkedIn</span>
                      </div>
                    </div>
                    {isAdmin && searchDiagnostics.signals && (
                      <div className="mt-3 border-t border-[#e8fb52]/20 pt-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e8fb52]">Signal detection · admin</p>
                        <p className="mt-1 text-sm leading-6 text-[#9aa3b2]">
                          Scanned {searchDiagnostics.signals.sitesScanned} sites · {searchDiagnostics.signals.sitesUnreadable} unreadable · {searchDiagnostics.signals.sitesWithSignals} surfaced ≥1 signal.
                        </p>
                        {searchDiagnostics.signals.perSignal.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {searchDiagnostics.signals.perSignal.map(item => (
                              <span key={item.key} className="border border-[#f3f5f8]/10 bg-black/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2]">
                                {opportunitySignalLabels[item.key] || item.key} <b className="text-[#f3f5f8]">{item.present}</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3 border border-[#f3f5f8]/[0.14] bg-[#111319] p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6675]" />
                    <input
                      type="text"
                      placeholder="Filter opportunities..."
                      value={filterText}
                      onChange={event => setFilterText(event.target.value)}
                      className="h-10 w-full border border-[#f3f5f8]/10 bg-black pl-9 pr-3 font-mono text-xs text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/70"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleShareList} disabled={shareLoading || !sortedResults?.length} className="inline-flex items-center gap-2 border border-[#f3f5f8]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#f3f5f8] hover:border-[#e8fb52] disabled:opacity-30">
                      {shareLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                      Share list
                    </button>
                    <button onClick={handleCopyEmails} disabled={emailCount === 0} className="border border-[#f3f5f8]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#f3f5f8] hover:border-[#e8fb52] disabled:opacity-30">
                      {!hasFullAppAccess ? "Upgrade to copy" : emailsCopied ? "Copied emails" : "Copy emails"}
                    </button>
                    <button onClick={handleDownload} className="inline-flex items-center gap-2 border border-[#e8fb52] bg-[#e8fb52] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#f3ff8a]">
                      <Download className="h-3.5 w-3.5" />
                      {!hasFullAppAccess ? "Upgrade to export" : "Export XLSX"}
                    </button>
                  </div>
                </div>
                {shareUrl && (
                  <div className="flex flex-col gap-2 border border-[#e8fb52]/25 bg-[#e8fb52]/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#e8fb52]">Public preview ready</p>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all font-mono text-xs text-[#f3f5f8] hover:text-[#e8fb52]">
                        {shareUrl}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(shareUrl).then(() => toast({ title: "Copied", description: "Preview link copied again." }))}
                      className="shrink-0 border border-[#e8fb52]/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52] hover:bg-[#e8fb52]/10"
                    >
                      Copy link
                    </button>
                  </div>
                )}

                <div className="grid gap-3 lg:grid-cols-2">
                  {sortedResults?.map((lead, index) => {
                    const contact = getTopContact(lead);
                    const cardId = lead.placeId || String(index);
                    const expanded = expandedCards.has(cardId);
                    const summary = summarizeOpportunityCard(
                      lead.detectedSignals,
                      selectedService === customServiceValue ? customService : selectedService,
                    );
                    const qualityTone =
                      lead.leadQualityLabel === "Strong lead"
                        ? "border-[#e8fb52]/40 text-[#e8fb52]"
                        : lead.leadQualityLabel === "Good lead"
                          ? "border-[#57b9ff]/50 text-[#57b9ff]"
                          : "border-[#f3f5f8]/15 text-[#9aa3b2]";
                    const badges = [
                      lead.website ? "Website" : "",
                      lead.emails.length ? "Email" : "No email",
                      lead.emailSource === "hunter" || lead.emailSource === "both" ? "Enriched" : "",
                      lead.linkedinUrl || contact?.linkedinUrl ? "LinkedIn" : "",
                      lead.socialLinks?.length ? "Social" : "",
                    ].filter(Boolean);
                    const hasContactPath = Boolean(lead.emails[0] || lead.phone || lead.website || lead.socialLinks?.[0]);

                    return (
                      <article key={cardId} className="border border-[#f3f5f8]/[0.14] bg-[#111319] p-4 transition-colors hover:border-[#f3f5f8]/20">
                        {/* Header — company + opportunity score */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-lg font-bold tracking-[-0.02em] text-[#f3f5f8]">{lead.name}</h3>
                            <p className="mt-1 line-clamp-1 text-xs text-[#5d6675]">{lead.address || lead.category?.replace(/_/g, " ") || "No location listed"}</p>
                          </div>
                          <span className={`shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${qualityTone}`}>
                            {getOpportunityLabel(lead)} · {lead.leadQualityScore || 0}
                          </span>
                        </div>

                        {/* Buying signals — surfaced whenever any were detected */}
                        {summary.hasSignals && (
                          <div className="mt-3.5">
                            <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Buying signals</p>
                            {summary.hasSignals ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {summary.presentSignals.map(signal => (
                                  <span key={signal.key} className="inline-flex items-center gap-1.5 border border-[#e8fb52]/30 bg-[#e8fb52]/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#e8fb52]">
                                    {signal.label}
                                    <b className="font-semibold text-[#cfe935]">{signal.confidence}</b>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-1.5 text-xs leading-5 text-[#5d6675]">No opportunity signals detected on this prospect.</p>
                            )}
                          </div>
                        )}

                        {/* Why this prospect */}
                        <div className="mt-3.5 border border-[#f3f5f8]/10 bg-black/40 p-3">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">Why this prospect</p>
                          <p className="mt-1 text-xs leading-5 text-[#9aa3b2]">
                            {summary.whyText || lead.leadQualityReason || "Usable public evidence for outreach."}
                          </p>
                        </div>

                        {/* Footer — contact availability + details toggle */}
                        <div className="mt-3.5 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-1.5">
                            {badges.map(badge => (
                              <span key={badge} className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${badge === "No email" ? "border-[#f3f5f8]/10 text-[#5d6675]" : "border-[#f3f5f8]/15 text-[#9aa3b2]"}`}>
                                {badge}
                              </span>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCardExpanded(cardId)}
                            aria-expanded={expanded}
                            className="inline-flex shrink-0 items-center gap-1.5 border border-[#f3f5f8]/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-[#9aa3b2] transition-colors hover:border-[#e8fb52]/50 hover:text-[#f3f5f8]"
                          >
                            Details
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        {/* Detail panel (collapsible) */}
                        <div className={`grid transition-all duration-200 ease-out motion-reduce:transition-none ${expanded ? "mt-3.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                          <div className="overflow-hidden" inert={!expanded ? true : undefined}>
                            <div className="space-y-3.5 border-t border-[#f3f5f8]/10 pt-3.5">
                              {summary.hasSignals && (
                                <div>
                                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Evidence</p>
                                  <ul className="mt-2 space-y-1.5">
                                    {summary.presentSignals.map(signal => (
                                      <li key={signal.key} className="text-xs leading-5 text-[#9aa3b2]">
                                        <span className="text-[#f3f5f8]">{signal.label}</span>
                                        {signal.evidence?.snippet ? ` — “${signal.evidence.snippet}”` : ""}
                                        {signal.evidence?.sourceUrl?.startsWith("http") && (
                                          <span className="ml-1 font-mono text-[10px] text-[#5d6675]">{compactUrl(signal.evidence.sourceUrl)}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Contact</p>
                                  <div className="mt-2 space-y-2">
                                    {lead.emails[0] && (
                                      <button onClick={() => handleCopyField(`${lead.placeId}-email`, lead.emails[0])} className="flex max-w-full items-center gap-2 truncate font-mono text-xs text-[#e8fb52] hover:underline">
                                        {copiedKeys.has(`${lead.placeId}-email`) ? <CheckCheck className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                                        <span className="truncate">{lead.emails[0]}</span>
                                      </button>
                                    )}
                                    {lead.phone && (
                                      <button onClick={() => handleCopyField(`${lead.placeId}-phone`, lead.phone)} className="flex items-center gap-2 font-mono text-xs text-[#9aa3b2] hover:text-[#f3f5f8]">
                                        {copiedKeys.has(`${lead.placeId}-phone`) ? <CheckCheck className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                                        {lead.phone}
                                      </button>
                                    )}
                                    {lead.website && (
                                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex max-w-full items-center gap-2 truncate font-mono text-xs text-[#9aa3b2] hover:text-[#f3f5f8]">
                                        <Globe className="h-3.5 w-3.5" />
                                        <span className="truncate">{compactUrl(lead.website)}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                    {lead.socialLinks?.[0] && (
                                      <a href={lead.socialLinks[0]} target="_blank" rel="noopener noreferrer" className="flex max-w-full items-center gap-2 truncate font-mono text-xs text-[#9aa3b2] hover:text-[#f3f5f8]">
                                        <Globe className="h-3.5 w-3.5" />
                                        <span className="truncate">{compactUrl(lead.socialLinks[0])}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                    {!hasContactPath && <p className="text-xs text-[#5d6675]">No public contact path found.</p>}
                                  </div>
                                </div>

                                <div className="border border-[#f3f5f8]/10 bg-black p-3">
                                  <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
                                    <UserRound className="h-3.5 w-3.5" />
                                    Likely decision maker
                                  </p>
                                  {contact ? (
                                    <div>
                                      <p className="font-display text-sm font-bold text-[#f3f5f8]">{contact.fullName || contact.email || contact.linkedinUrl}</p>
                                      {contact.title && <p className="mt-1 text-xs text-[#9aa3b2]">{contact.title}</p>}
                                      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52]">{contact.source} · {contact.decisionMakerScore}/100</p>
                                      {contact.linkedinUrl && (
                                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-[#57b9ff] hover:text-[#8FD8FF]">
                                          <Linkedin className="h-3.5 w-3.5" />
                                          LinkedIn
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-[#5d6675]">{enrichMode ? "No named contact found." : "Use Enrich to find named contacts."}</p>
                                  )}
                                </div>
                              </div>

                              {opportunityModeOn && (
                                <div>
                                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Outreach angle</p>
                                  <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-[#5d6675]">
                                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                    An AI-written outreach angle arrives with opportunity scoring.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {sortedResults?.length === 0 && (
                  <div className="border border-[#f3f5f8]/[0.14] bg-[#111319] p-8 text-center">
                    <p className="font-display text-lg font-bold text-[#f3f5f8]">No opportunities match this filter.</p>
                    <p className="mt-2 text-sm text-[#9aa3b2]">Clear the filter or run a deeper search to find more usable evidence.</p>
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
