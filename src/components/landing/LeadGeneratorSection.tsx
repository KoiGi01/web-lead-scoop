import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
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
import { useAuth, DEMO_USER_ID } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";

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
  contactPageFound: boolean;
  emailSource?: "firecrawl" | "hunter" | "both" | "none";
  contacts: DecisionMakerContact[];
  dbId?: string;
}

type Depth = "simple" | "normal" | "deep";
type ProgressStage = "idle" | "maps" | "scrape" | "enrich" | "rank" | "done";

interface LeadGeneratorSectionProps {
  onOpenAuth?: () => void;
  onSearchComplete?: () => void;
  viewMode?: "search" | "all-leads";
  onToggleViewMode?: (mode: "search" | "all-leads") => void;
  isAdmin?: boolean;
}

const depthConfig: Record<Depth, { label: string; credits: number; maxResults: 20 | 40 | 60; shards: number; websiteLimit: number }> = {
  simple: { label: "Simple", credits: 5, maxResults: 20, shards: 3, websiteLimit: 10 },
  normal: { label: "Normal", credits: 10, maxResults: 40, shards: 8, websiteLimit: 20 },
  deep: { label: "Deep", credits: 20, maxResults: 60, shards: 15, websiteLimit: 40 },
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

const getSearchCost = (depth: Depth, enrich: boolean) => depthConfig[depth].credits * (enrich ? 2 : 1);

const buildQueryVariants = (industry: string, country: string, language: string, depth: Depth) => {
  const key = country.trim().toLowerCase();
  const cities = (countryCitySeeds[key] || []).slice(0, depthConfig[depth].shards);
  const lang = language.trim();
  const cityQueries = cities.map(city => `${industry} ${city} ${country}`);
  return [
    ...cityQueries,
    `${industry} ${country}`,
    lang ? `${industry} ${country} ${lang}` : "",
  ].filter(Boolean);
};

const LeadGeneratorSection = ({ onOpenAuth, onSearchComplete, viewMode = "search", isAdmin = false }: LeadGeneratorSectionProps) => {
  const { user: realUser, loading: authLoading } = useAuth();
  const devMode = import.meta.env.DEV;
  const demoUser = devMode ? { id: DEMO_USER_ID, email: "demo@account.com" } as any : null;
  const user = realUser || demoUser;
  const { balance: creditsBalance, deduct: deductCredits } = useCredits(user?.id);

  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [depth, setDepth] = useState<Depth>("normal");
  const [enrichMode, setEnrichMode] = useState(false);
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
  const [preferPublicEmail, setPreferPublicEmail] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<ProgressStage>("idle");
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<LeadResult[] | null>(null);
  const [filterText, setFilterText] = useState("");
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleLoadSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIndustry(customEvent.detail.keyword || "");
      setCountry(customEvent.detail.location || "");
      setResults(null);
    };
    window.addEventListener("loadSearch", handleLoadSearch);
    return () => window.removeEventListener("loadSearch", handleLoadSearch);
  }, []);

  const searchCost = getSearchCost(depth, enrichMode);
  const usageType = isAdmin ? "internal" : "customer";
  const chargedCredits = isAdmin ? 0 : searchCost;

  const progressSteps = [
    { key: "maps", label: "Searching Maps" },
    { key: "scrape", label: "Scraping websites" },
    { key: "enrich", label: "Enriching contacts" },
    { key: "rank", label: "Ranking leads" },
  ] as const;

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
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [results, filterText]);

  const sortedResults = useMemo(() => {
    if (!filteredResults) return null;
    return [...filteredResults].sort((a, b) => {
      const aContact = getTopContact(a);
      const bContact = getTopContact(b);
      const contactDelta = (bContact?.decisionMakerScore || 0) - (aContact?.decisionMakerScore || 0);
      if (contactDelta !== 0) return contactDelta;
      if (preferPublicEmail && a.emails.length !== b.emails.length) return b.emails.length - a.emails.length;
      if (!!a.website !== !!b.website) return a.website ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredResults, preferPublicEmail]);

  const emailCount = sortedResults?.reduce((acc, lead) => acc + lead.emails.length, 0) ?? 0;
  const contactCount = sortedResults?.reduce((acc, lead) => acc + (lead.contacts?.length || 0), 0) ?? 0;
  const websiteCount = sortedResults?.filter(lead => lead.website).length ?? 0;

  if (viewMode === "all-leads") return null;

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
      "Business Name",
      "Category",
      "Address",
      "Phone",
      "Website",
      "Emails",
      "WhatsApp",
      "Likely Decision Maker",
      "Decision Maker Title",
      "Decision Maker Email",
      "Decision Maker LinkedIn",
      "Decision Maker Source",
    ];
    const rows = sortedResults.map(lead => {
      const contact = getTopContact(lead);
      return [
        lead.name,
        lead.category,
        lead.address,
        lead.phone,
        lead.website,
        lead.emails.join(", "),
        lead.whatsapp.join(", "),
        contact?.fullName || "",
        contact?.title || "",
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

  const createSearchSession = async () => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from("search_sessions")
      .insert({
        user_id: user.id,
        keyword: industry.trim(),
        location: country.trim(),
        depth,
        enrich_mode: enrichMode,
        usage_type: usageType,
        status: "running",
        credits_used: chargedCredits,
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
  ) => {
    if (!user?.id || user.id === DEMO_USER_ID) return;
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      search_session_id: searchSessionId || null,
      type,
      amount,
      balance_after: type === "refund" ? creditsBalance : Math.max(0, creditsBalance - Math.abs(amount)),
      usage_type: usageType,
      description,
      metadata: { depth, enrichMode, quotedCredits: searchCost },
    });
  };

  const saveSearch = async (leads: LeadResult[], searchSessionId: string | null) => {
    if (!user?.id) return;
    try {
      let sessionId = searchSessionId;
      if (!sessionId) {
        const sessionData = await createSearchSession();
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
          credits_used: chargedCredits,
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
      }));

      const { data: saved } = await supabase.from("saved_leads").insert(payload).select();
      if (saved) {
        setResults(prev => prev?.map((lead, index) => ({ ...lead, dbId: saved[index]?.id })) ?? null);
      }
    } catch (error) {
      console.error("Error saving search:", error);
    }
  };

  const refundCredits = async (searchSessionId?: string | null) => {
    if (!user?.id || user.id === DEMO_USER_ID) return;
    try {
      const { data: current } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      if (current) {
        await supabase
          .from("user_credits")
          .update({ balance: current.balance + searchCost, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        await recordCreditTransaction("refund", searchCost, searchSessionId, "Search failed refund");
      }
    } catch {
      console.error("Failed to refund credits");
    }
  };

  const handleGenerate = async () => {
    if (!validateSearch()) return;
    if (!isAdmin && creditsBalance < searchCost) {
      toast({ title: "Insufficient credits", description: `This search costs ${searchCost} credits.`, variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setProgress(0);
    setStage("maps");
    setStatus("Searching trusted Maps businesses...");

    let creditsDeducted = false;
    let searchSessionId: string | null = null;
    try {
      const sessionData = await createSearchSession();
      searchSessionId = sessionData?.id || null;

      if (isAdmin) {
        await recordCreditTransaction("admin_spend", 0, searchSessionId, "Internal admin search");
      } else {
        await deductCredits(searchCost);
        creditsDeducted = true;
        await recordCreditTransaction("spend", -searchCost, searchSessionId, "Lead search");
      }

      const config = depthConfig[depth];
      const queryVariants = buildQueryVariants(industry.trim(), country.trim(), language.trim(), depth);
      const { data: mapsData, error: mapsError } = await supabase.functions.invoke("search-places", {
        body: {
          keyword: industry.trim(),
          location: country.trim(),
          maxResults: config.maxResults,
          queryVariants,
          userId: user.id,
          searchSessionId,
          depth,
          enrichMode,
          usageType,
          creditsChargedToUser: chargedCredits,
        },
      });

      if (mapsError || !mapsData?.success) {
        throw new Error(mapsData?.error || mapsError?.message || "Failed to search Google Maps");
      }

      const businesses: Business[] = (mapsData.businesses || []).filter((business: Business) => {
        if (!business.name) return false;
        if (hasWebsiteOnly && !business.website) return false;
        return true;
      });

      setProgress(25);
      setStage("scrape");
      setStatus(`Found ${businesses.length} businesses. Scraping websites...`);

      const leads: LeadResult[] = [];
      const websitesToScan = businesses.filter(business => business.website).slice(0, config.websiteLimit);
      const websitePlaceIds = new Set(websitesToScan.map(business => business.placeId));

      businesses
        .filter(business => !websitePlaceIds.has(business.placeId))
        .forEach(business => {
          leads.push({
            ...business,
            emails: [],
            whatsapp: [],
            contactPageFound: false,
            emailSource: "none",
            contacts: [],
          });
        });

      for (let index = 0; index < websitesToScan.length; index++) {
        const business = websitesToScan[index];
        const currentStage = enrichMode ? "enrich" : "scrape";
        setStage(currentStage);
        setStatus(`${enrichMode ? "Enriching" : "Scraping"} ${index + 1}/${websitesToScan.length}: ${business.name}`);
        setProgress(25 + Math.round(((index + 1) / Math.max(1, websitesToScan.length)) * 60));

        try {
          const { data: contactData } = await supabase.functions.invoke("extract-contacts", {
            body: {
              url: business.website,
              enrichMode,
              industry: industry.trim(),
              depth,
              userId: user.id,
              searchSessionId,
              usageType,
              creditsChargedToUser: chargedCredits,
            },
          });
          leads.push({
            ...business,
            emails: contactData?.emails || [],
            whatsapp: contactData?.whatsapp || [],
            linkedinUrl: contactData?.linkedinUrl,
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
          });
        }
      }

      setStage("rank");
      setStatus("Ranking leads...");
      setProgress(95);

      const seen = new Set<string>();
      const deduped = leads.filter(lead => {
        const key = lead.website ? normalizeDomain(lead.website) : lead.placeId;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const ranked = deduped.sort((a, b) => {
        const contactDelta = (getTopContact(b)?.decisionMakerScore || 0) - (getTopContact(a)?.decisionMakerScore || 0);
        if (contactDelta !== 0) return contactDelta;
        if (preferPublicEmail && a.emails.length !== b.emails.length) return b.emails.length - a.emails.length;
        if (!!a.website !== !!b.website) return a.website ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setResults(ranked);
      setStage("done");
      setStatus(`${ranked.length} leads ready`);
      setProgress(100);
      toast({ title: "Search complete", description: `${ranked.length} trusted leads found.` });
      await saveSearch(ranked, searchSessionId);
      onSearchComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      setStatus(message);
      setStage("idle");
      setProgress(0);
      toast({ title: "Search failed", description: message, variant: "destructive" });
      if (searchSessionId) {
        await supabase.from("search_sessions").update({ status: "failed" }).eq("id", searchSessionId);
      }
      if (creditsDeducted) await refundCredits(searchSessionId);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section id="tool" className="h-full w-full overflow-auto bg-black text-[#EFEDE6]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6">
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
            <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
              <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_0.75fr]">
                <div>
                  <label htmlFor="industry" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">Industry / niche</label>
                  <input
                    id="industry"
                    value={industry}
                    onChange={event => setIndustry(event.target.value)}
                    placeholder="AI agencies"
                    disabled={isProcessing}
                    className={`h-12 w-full border bg-black px-3 font-mono text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50 ${fieldErrors.industry ? "border-[#ffb4ab]" : "border-[#EFEDE6]/10"}`}
                  />
                  {fieldErrors.industry && <p className="mt-1 font-mono text-[10px] uppercase text-[#ffb4ab]">{fieldErrors.industry}</p>}
                </div>

                <div>
                  <label htmlFor="country" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">Country</label>
                  <input
                    id="country"
                    value={country}
                    onChange={event => setCountry(event.target.value)}
                    placeholder="Mexico"
                    disabled={isProcessing}
                    className={`h-12 w-full border bg-black px-3 font-mono text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50 ${fieldErrors.country ? "border-[#ffb4ab]" : "border-[#EFEDE6]/10"}`}
                  />
                  {fieldErrors.country && <p className="mt-1 font-mono text-[10px] uppercase text-[#ffb4ab]">{fieldErrors.country}</p>}
                </div>

                <div>
                  <label htmlFor="language" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">Language</label>
                  <input
                    id="language"
                    value={language}
                    onChange={event => setLanguage(event.target.value)}
                    placeholder="Spanish"
                    disabled={isProcessing}
                    className="h-12 w-full border border-[#EFEDE6]/10 bg-black px-3 font-mono text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid gap-4 border-t border-[#EFEDE6]/10 p-4 lg:grid-cols-[auto_auto_1fr_auto] lg:items-center">
                <div className="inline-grid grid-cols-3 border border-[#EFEDE6]/10 bg-black">
                  {(Object.keys(depthConfig) as Depth[]).map(option => (
                    <button
                      key={option}
                      onClick={() => setDepth(option)}
                      disabled={isProcessing}
                      className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${depth === option ? "bg-[#F5FF3D] text-black" : "text-[#A8A59C] hover:text-[#EFEDE6]"}`}
                    >
                      {depthConfig[option].label}
                    </button>
                  ))}
                </div>

                <div className="inline-grid grid-cols-2 border border-[#EFEDE6]/10 bg-black">
                  <button
                    onClick={() => setEnrichMode(false)}
                    disabled={isProcessing}
                    className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${!enrichMode ? "bg-[#EFEDE6] text-black" : "text-[#A8A59C] hover:text-[#EFEDE6]"}`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => setEnrichMode(true)}
                    disabled={isProcessing}
                    className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${enrichMode ? "bg-[#F5FF3D] text-black" : "text-[#A8A59C] hover:text-[#EFEDE6]"}`}
                  >
                    Enrich
                  </button>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#A8A59C]">
                    <input type="checkbox" checked={hasWebsiteOnly} onChange={event => setHasWebsiteOnly(event.target.checked)} disabled={isProcessing} className="accent-[#F5FF3D]" />
                    Has website
                  </label>
                  <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#A8A59C]">
                    <input type="checkbox" checked={preferPublicEmail} onChange={event => setPreferPublicEmail(event.target.checked)} disabled={isProcessing} className="accent-[#F5FF3D]" />
                    Public email preferred
                  </label>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isProcessing}
                  className="h-12 border border-[#F5FF3D] bg-[#F5FF3D] px-6 font-display text-sm font-bold text-black transition-colors hover:bg-[#FFFE7A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? "Finding leads..." : isAdmin ? `Find leads - admin` : `Find leads - ${searchCost} credits`}
                </button>
              </div>
            </div>

            {(isProcessing || results) && (
              <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex flex-wrap gap-3">
                    {progressSteps.map(step => {
                      const active = stage === step.key;
                      const complete =
                        stage === "done" ||
                        progressSteps.findIndex(item => item.key === stage) > progressSteps.findIndex(item => item.key === step.key);
                      const hidden = step.key === "enrich" && !enrichMode;
                      if (hidden) return null;
                      return (
                        <span key={step.key} className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${active || complete ? "text-[#EFEDE6]" : "text-[#67645B]"}`}>
                          <span className={`h-2 w-2 rounded-full ${complete ? "bg-[#F5FF3D]" : active ? "border border-[#F5FF3D]" : "border border-[#67645B]"}`} />
                          {step.label}
                        </span>
                      );
                    })}
                  </div>
                  <div className="h-1 flex-1 bg-[#EFEDE6]/10">
                    <div className="h-full bg-[#F5FF3D] transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#A8A59C]">{status}</span>
                </div>
              </div>
            )}

            {results && !isProcessing && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ["Leads", sortedResults?.length ?? 0],
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
                    const badges = [
                      lead.website ? "Website" : "",
                      lead.emails.length ? "Email" : "No email",
                      lead.emailSource === "hunter" || lead.emailSource === "both" ? "Hunter" : "",
                      lead.linkedinUrl || contact?.linkedinUrl ? "LinkedIn" : "",
                    ].filter(Boolean);

                    return (
                      <article key={lead.placeId || index} className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-lg font-bold tracking-[-0.02em] text-[#EFEDE6]">{lead.name}</h3>
                            <p className="mt-1 line-clamp-1 text-xs text-[#A8A59C]">{lead.address || lead.category?.replace(/_/g, " ") || "No location listed"}</p>
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

            {!results && !isProcessing && (
              <div className="border border-dashed border-[#EFEDE6]/[0.16] bg-[#0A0A0A]/60 p-8 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-[#F5FF3D]" />
                <p className="mt-3 font-display text-lg font-bold text-[#EFEDE6]">Run a Maps-first search.</p>
                <p className="mt-1 text-sm text-[#A8A59C]">Use Enrich when you need likely decision makers and Hunter contacts.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default LeadGeneratorSection;
