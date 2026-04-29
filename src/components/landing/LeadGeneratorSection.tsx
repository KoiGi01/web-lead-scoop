import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCredits } from "@/hooks/useCredits";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import {
  Search, Download, Loader2, MapPin, Copy, CheckCheck,
  Mail, Phone, Globe, ExternalLink, ChevronRight, Lock, Zap,
  Lightbulb, TrendingUp, Linkedin, Shield, Clock
} from "lucide-react";
import XLSX from "xlsx-js-style";

import LocationAutocomplete from "@/components/app/LocationAutocomplete";
// import LeadMapPanel from "@/components/app/LeadMapPanel";
import MapboxPanel from "@/components/app/MapboxPanel";

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

interface LeadIntelligence {
  opportunityScore: number;
  businessMaturity: string;
  positioning: string;
  detectedIssues: string[];
  opportunitySummary: string;
  suggestedPitchAngle: string;
  outreachHook: string;
}

interface LeadResult extends Business {
  emails: string[];
  whatsapp: string[];
  linkedinUrl?: string;
  contactPageFound: boolean;
  intelligence?: LeadIntelligence | null;
  intelligenceLoading?: boolean;
  dbId?: string; // Supabase lead ID for Intelligence updates
}

type StepStatus = "idle" | "active" | "done";

interface Step {
  label: string;
  status: StepStatus;
}

interface MapMarker {
  lat: number;
  lng: number;
  name: string;
  hasEmail?: boolean;
}

interface SelectedPlace {
  label: string;
  lat: number;
  lng: number;
}

type BusinessModel = "local" | "online" | "hybrid" | "any";
type CompanySize = "solo" | "small" | "mid" | "any";

interface SearchPlan {
  targetBusiness: string;
  location: string;
  businessModel: BusinessModel;
  companySize: CompanySize;
  intentSignals: string[];
  requiredChannels: string[];
  queryVariants: string[];
  maxResults: 20 | 40 | 60;
  radius?: number;
  summary: string;
}

const STEPS_INIT: Step[] = [
  { label: "Search Maps & Web", status: "idle" },
  { label: "Scan Websites",     status: "idle" },
  { label: "Compile Leads",     status: "idle" },
];

// Zod schema for form validation
const searchSchema = z.object({
  keyword:  z.string().trim().min(2, "Enter at least 2 characters"),
  location: z.string().trim().min(2, "Enter a city or region"),
  radius:   z.union([
    z.literal(""),
    z.coerce.number().int().min(1, "Min 1 km").max(500, "Max 500 km"),
  ]),
  maxResults: z.union([z.literal(20), z.literal(40), z.literal(60)]),
});
type SearchFormErrors = Partial<Record<"keyword" | "location" | "radius", string>>;

interface LeadGeneratorSectionProps {
  onOpenAuth?: () => void;
  onSearchComplete?: () => void;
  viewMode?: "search" | "all-leads";
  onToggleViewMode?: (mode: "search" | "all-leads") => void;
}

/* Dark terminal input */
const DarkInput = ({
  id, placeholder, value, onChange, disabled, icon: Icon, type = "text", min,
}: {
  id: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; icon?: React.ComponentType<{ className?: string }>; type?: string; min?: string;
}) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-100/30 pointer-events-none" />}
    <input
      id={id}
      type={type}
      min={min}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full h-12 bg-petrol-800/80 border border-cream-100/[0.10] focus:border-cream-100/30 text-cream-100 text-sm placeholder:text-cream-100/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-mono"
      style={{ borderRadius: "3px", paddingLeft: Icon ? "2.5rem" : "1rem", paddingRight: "1rem" }}
    />
  </div>
);

/* Mono label */
const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label
    htmlFor={htmlFor}
    className="block mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-cream-300"
  >
    {children}
  </label>
);

const LeadGeneratorSection = ({ onOpenAuth, onSearchComplete, viewMode = "search", onToggleViewMode }: LeadGeneratorSectionProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile: userProfile } = useUserProfile(user?.id);
  const { balance: creditsBalance, plan: creditsPlan, deduct: deductCredits } = useCredits(user?.id);
  const { google: googleApi } = useGoogleMaps();

  const [keyword,    setKeyword]    = useState("");
  const [location,   setLocation]   = useState("");
  const [radius,     setRadius]     = useState("");
  const [maxResults, setMaxResults] = useState(40);
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps,  setSteps]  = useState<Step[]>(STEPS_INIT);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [results,  setResults]  = useState<LeadResult[] | null>(null);
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "emails" | "score">("name");
  const [filterByEmail, setFilterByEmail] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SearchFormErrors>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [confirmUnlockAll, setConfirmUnlockAll] = useState(false);
  // Filter state for smart filtering
  const [filterText, setFilterText] = useState("");
  const [filterByPhone, setFilterByPhone] = useState(false);
  const [filterByWebsite, setFilterByWebsite] = useState(false);
  const [filterByLinkedIn, setFilterByLinkedIn] = useState(false);
  const [filterByIntelligence, setFilterByIntelligence] = useState(false);
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [brief, setBrief] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [searchPlan, setSearchPlan] = useState<SearchPlan | null>(null);
  const [planError, setPlanError] = useState("");
  const [searchMode, setSearchMode] = useState<"local" | "free" | "online" | "recent" | null>(null);

  // Listen for loadSearch event from sidebar
  useEffect(() => {
    const handleLoadSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      setKeyword(customEvent.detail.keyword);
      setLocation(customEvent.detail.location);
      setSelectedPlace(null);
      setSearchCenter(null);
      setMapMarkers([]);
    };
    window.addEventListener('loadSearch', handleLoadSearch);
    return () => window.removeEventListener('loadSearch', handleLoadSearch);
  }, []);

  const setStep = (index: number, s: StepStatus) => {
    setSteps((prev) => prev.map((st, i) => (i === index ? { ...st, status: s } : st)));
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  };

  const validateField = (field: "keyword" | "location" | "radius", value: string) => {
    const result = searchSchema.shape[field].safeParse(value || undefined);
    if (!result.success) {
      setFieldErrors(prev => ({ ...prev, [field]: result.error.errors[0].message }));
    } else {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const buildHeuristicPlan = (rawBrief: string): SearchPlan => {
    const text = rawBrief.trim();
    const lower = text.toLowerCase();
    const locationMatch = text.match(/\b(?:in|near|from)\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|$)/i);
    const inferredLocation = locationMatch?.[1]?.trim().replace(/[.!,;:]$/, "") || location || "";
    let targetBusiness = text
      .replace(/^find\s+/i, "")
      .replace(/^search\s+for\s+/i, "")
      .replace(/^show\s+me\s+/i, "")
      .replace(/\b(small|solo|mid-size|medium|online-only|online only|online first|online-first|local|hybrid|premium|weak website|bad websites|visible emails|with email|with linkedin|with whatsapp)\b/gi, "")
      .replace(/\b(companies|businesses|leads)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (inferredLocation) targetBusiness = targetBusiness.replace(new RegExp(`\\bin\\s+${inferredLocation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), "").trim();
    targetBusiness = targetBusiness.split(/\bwith\b|\bthat\b|\bwho\b|\bonly\b/i)[0].trim() || keyword || "local businesses";
    const businessModel: BusinessModel = lower.includes("online-only") || lower.includes("online only")
      ? "online"
      : lower.includes("online-first") || lower.includes("online first")
        ? "hybrid"
        : lower.includes("hybrid")
          ? "hybrid"
          : lower.includes("local")
            ? "local"
            : "any";
    const companySize: CompanySize = lower.includes("solo") ? "solo" : lower.includes("small") ? "small" : lower.includes("mid") || lower.includes("medium") ? "mid" : "any";
    const intentSignals = [
      (lower.includes("weak website") || lower.includes("bad website")) && "weak website",
      lower.includes("booking") && "no booking",
      lower.includes("low review") && "low review count",
      (lower.includes("premium") || lower.includes("luxury")) && "premium positioning",
      lower.includes("linkedin") && "active LinkedIn",
      lower.includes("contact page") && "contact page present",
    ].filter(Boolean) as string[];
    const requiredChannels = [
      lower.includes("email") && "email",
      lower.includes("phone") && "phone",
      lower.includes("whatsapp") && "WhatsApp",
      lower.includes("linkedin") && "LinkedIn",
      (lower.includes("website") || lower.includes("online")) && "website",
    ].filter(Boolean) as string[];
    const base = `${targetBusiness} ${inferredLocation}`.trim();
    const queryVariants = [...new Set([
      base,
      `${targetBusiness} ${inferredLocation} contact email`.trim(),
      `${targetBusiness} ${inferredLocation} website`.trim(),
      intentSignals.includes("premium positioning") ? `premium ${targetBusiness} ${inferredLocation}`.trim() : "",
      companySize === "small" ? `independent ${targetBusiness} ${inferredLocation}`.trim() : "",
      businessModel === "online" || businessModel === "hybrid" ? `${targetBusiness} ${inferredLocation} online booking`.trim() : "",
    ].filter(Boolean))].slice(0, 6);
    return {
      targetBusiness,
      location: inferredLocation,
      businessModel,
      companySize,
      intentSignals,
      requiredChannels,
      queryVariants,
      maxResults: 40,
      radius: radius ? Number(radius) : undefined,
      summary: `Search for ${targetBusiness}${inferredLocation ? ` in ${inferredLocation}` : ""}, prioritizing ${[businessModel !== "any" ? businessModel : "", companySize !== "any" ? companySize : "", ...intentSignals, ...requiredChannels].filter(Boolean).join(", ") || "broad fit signals"}.`,
    };
  };

  const applyPlanToForm = (plan: SearchPlan) => {
    setSearchPlan(plan);
    setKeyword(plan.targetBusiness);
    setLocation(plan.location);
    setMaxResults(plan.maxResults);
    setRadius(plan.radius ? String(plan.radius) : radius);
    setSelectedPlace(null);
    setSearchCenter(null);
  };

  const handleSelectSearchMode = (mode: "local" | "free" | "online" | "recent") => {
    setSearchMode(mode);
    if (mode === "online") {
      setSearchPlan(prev => ({
        targetBusiness: prev?.targetBusiness || keyword,
        location: prev?.location || location,
        businessModel: "online",
        companySize: prev?.companySize || "any",
        intentSignals: prev?.intentSignals || [],
        requiredChannels: ["website"],
        queryVariants: prev?.queryVariants || [],
        maxResults: prev?.maxResults || 40,
        radius: prev?.radius,
        summary: "Online-first businesses with a website presence.",
      }));
    } else if (mode === "local" && searchPlan) {
      setSearchPlan(prev => prev ? { ...prev, businessModel: "local" } : prev);
    } else if (mode === "free") {
      setTimeout(() => document.getElementById("lead-brief")?.focus(), 100);
    }
  };

  const handleChangeSearchMode = () => setSearchMode(null);

  const handleBuildSearchPlan = async () => {
    const rawBrief = brief.trim();
    if (rawBrief.length < 8) {
      setPlanError("Describe the leads you want in a little more detail.");
      return;
    }
    setIsPlanning(true);
    setPlanError("");
    try {
      const { data, error } = await supabase.functions.invoke("plan-lead-search", {
        body: {
          brief: rawBrief,
          currentKeyword: keyword,
          currentLocation: location,
          userProfile: userProfile ? {
            service_type: userProfile.service_type,
            pricing_tier: userProfile.pricing_tier,
          } : null,
        },
      });
      if (error || !data?.success || !data?.plan) {
        throw new Error(error?.message || data?.error || "Planner unavailable");
      }
      applyPlanToForm(data.plan as SearchPlan);
      toast({ title: "Search plan ready", description: "Review the generated criteria, then run the search." });
    } catch {
      const fallback = buildHeuristicPlan(rawBrief);
      applyPlanToForm(fallback);
      toast({ title: "Search plan drafted", description: "Used local planning while the AI planner is unavailable." });
    } finally {
      setIsPlanning(false);
    }
  };

  const togglePlanListValue = (field: "intentSignals" | "requiredChannels", value: string) => {
    setSearchPlan(prev => {
      if (!prev) return prev;
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
      };
    });
  };

  const handleCopyField = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKeys(prev => new Set(prev).add(key));
      setTimeout(() => setCopiedKeys(prev => {
        const next = new Set(prev); next.delete(key); return next;
      }), 2000);
    });
  };

  const handleGenerate = async () => {
    setFormSubmitted(true);
    const effectiveKeyword = (searchPlan?.targetBusiness || keyword).trim();
    const effectiveLocation = (searchPlan?.location || location).trim();
    const effectiveMaxResults = searchPlan?.maxResults || maxResults;
    const effectiveRadius = searchPlan?.radius ? String(searchPlan.radius) : radius;
    const activeSearchFilters = searchPlan ? {
      businessModel: searchPlan.businessModel,
      companySize: searchPlan.companySize,
      intentSignals: searchPlan.intentSignals,
      requiredChannels: searchPlan.requiredChannels,
    } : undefined;
    const parsed = searchSchema.safeParse({ keyword: effectiveKeyword, location: effectiveLocation, radius: effectiveRadius || "", maxResults: effectiveMaxResults });
    if (!parsed.success) {
      const errs: SearchFormErrors = {};
      parsed.error.errors.forEach(e => {
        const f = e.path[0] as keyof SearchFormErrors;
        if (!errs[f]) errs[f] = e.message;
      });
      setFieldErrors(errs);
      return;
    }

    // Check credits
    if (creditsBalance < 10) {
      toast({ title: "Insufficient credits", description: "You need at least 10 credits to perform a search.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setProgress(0);
    setSteps(STEPS_INIT);
    setMapMarkers([]);
    setSearchCenter(selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : null);

    let creditsDeducted = false;
    try {
      // Deduct credits BEFORE running the search
      setStatus("Deducting credits…");
      try {
        await deductCredits(10);
        creditsDeducted = true;
      } catch (creditError) {
        const creditMsg = creditError instanceof Error ? creditError.message : "Failed to deduct credits";
        throw new Error(creditMsg);
      }

      setStep(0, "active");
      setStatus("Searching for businesses…");

      const [mapsResult, webResult] = await Promise.allSettled([
        supabase.functions.invoke("search-places", {
          body: {
            keyword: effectiveKeyword,
            location: effectiveLocation,
            radius: effectiveRadius ? Number(effectiveRadius) : undefined,
            maxResults: effectiveMaxResults,
            queryVariants: searchPlan?.queryVariants,
            filters: activeSearchFilters,
          },
        }),
        supabase.functions.invoke("web-search-leads", {
          body: {
            keyword: effectiveKeyword,
            location: effectiveLocation,
            maxResults: Math.min(effectiveMaxResults, 20),
            queryVariants: searchPlan?.queryVariants,
            filters: activeSearchFilters,
          },
        }),
      ]);

      const mapsData  = mapsResult.status === "fulfilled" ? mapsResult.value.data  : null;
      const mapsError = mapsResult.status === "fulfilled" ? mapsResult.value.error : mapsResult.reason;
      if (!mapsData?.success) throw new Error(mapsData?.error || mapsError?.message || "Failed to search businesses");

      const mapsBusinesses: Business[]   = mapsData.businesses || [];
      const webData = webResult.status === "fulfilled" ? webResult.value.data : null;
      const webLeads: LeadResult[]        = webData?.success ? (webData.leads || []) : [];

      setStep(0, "done");
      setProgress(20);

      // Set map center and populate initial markers from Places API
      const firstWithCoords = mapsBusinesses.find(b => b.lat && b.lng);
      if (firstWithCoords?.lat && firstWithCoords?.lng) {
        setSearchCenter({ lat: firstWithCoords.lat, lng: firstWithCoords.lng });
      }
      setMapMarkers(
        mapsBusinesses
          .filter(b => b.lat && b.lng)
          .map(b => ({ lat: b.lat!, lng: b.lng!, name: b.name }))
      );

      const mapsDomains   = new Set(mapsBusinesses.filter(b => b.website).map(b => getDomain(b.website)));
      const uniqueWebLeads = webLeads.filter(l => l.website && !mapsDomains.has(getDomain(l.website)));

      setStep(1, "active");
      const websiteBusinesses = mapsBusinesses.filter(b => b.website);
      const totalToScan = Math.min(10, websiteBusinesses.length);
      setStatus(`Found ${mapsBusinesses.length + uniqueWebLeads.length} businesses — scanning top ${totalToScan} websites…`);

      const leads: LeadResult[] = [];

      for (const b of mapsBusinesses.filter(b => !b.website)) {
        leads.push({ ...b, emails: [], whatsapp: [], contactPageFound: false });
      }

      const withWebsite = websiteBusinesses.slice(0, 10);
      for (let i = 0; i < withWebsite.length; i++) {
        const business = withWebsite[i];
        setStatus(`Scanning ${i + 1}/${totalToScan}: ${business.name}`);
        setProgress(20 + Math.round(((i + 1) / totalToScan) * 65));
        try {
          const { data: contactData } = await supabase.functions.invoke("extract-contacts", {
            body: { url: business.website },
          });
          leads.push({ ...business, emails: contactData?.emails || [], whatsapp: contactData?.whatsapp || [], contactPageFound: contactData?.contactPageFound || false });

          // Update map marker with email status
          if (business.lat && business.lng) {
            setMapMarkers(prev => prev.map(m =>
              (m.lat === business.lat && m.lng === business.lng)
                ? { ...m, hasEmail: (contactData?.emails?.length ?? 0) > 0 }
                : m
            ));
          }
        } catch {
          leads.push({ ...business, emails: [], whatsapp: [], contactPageFound: false });
        }
      }

      leads.push(...uniqueWebLeads);
      setStep(1, "done");
      setStep(2, "active");
      setStatus("Compiling your leads…");
      setProgress(95);
      await new Promise((r) => setTimeout(r, 400));

      // Fire-and-forget: Save search session and leads to database
      if (user?.id) {
        (async () => {
          try {
            // Create search session
            const { data: sessionData, error: sessionError } = await supabase
              .from("search_sessions")
              .insert({
                user_id: user.id,
                keyword: effectiveKeyword,
                location: effectiveLocation,
                lead_count: leads.length,
                email_count: leads.reduce((acc, l) => acc + l.emails.length, 0),
                whatsapp_count: leads.reduce((acc, l) => acc + l.whatsapp.length, 0),
                credits_used: 10,
              })
              .select()
              .single();

            if (!sessionError && sessionData) {
              // Bulk insert saved leads
              const savedLeadsInsert = leads.map((lead) => ({
                user_id: user.id,
                session_id: sessionData.id,
                name: lead.name,
                address: lead.address,
                phone: lead.phone,
                website: lead.website,
                category: lead.category,
                emails: lead.emails,
                whatsapp: lead.whatsapp,
                contact_page_found: lead.contactPageFound,
              }));

              const { data: leadsData } = await supabase
                .from("saved_leads")
                .insert(savedLeadsInsert)
                .select();

              // Map dbId back to results for Intelligence updates
              if (leadsData) {
                const dbIdMap = new Map(
                  leadsData.map((dbLead, idx) => [idx, dbLead.id])
                );
                setResults((prevResults) => {
                  if (!prevResults) return null;
                  return prevResults.map((lead, idx) => ({
                    ...lead,
                    dbId: dbIdMap.get(idx),
                  }));
                });
              }
            }
          } catch (dbError) {
            console.error("Error saving search session to database:", dbError);
          }
        })();
      }

      setStep(2, "done");
      setResults(leads);
      setProgress(100);
      setStatus(`${leads.length} leads ready!`);
      toast({ title: "✅ Complete", description: `${leads.length} leads generated.` });

      // Notify parent to refresh search history
      onSearchComplete?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An error occurred";
      setStatus(`Error: ${msg}`);
      setProgress(0);
      setSteps(STEPS_INIT);
      toast({ title: "Error", description: msg, variant: "destructive" });

      // Refund credits if deducted but search failed
      if (creditsDeducted && user?.id) {
        try {
          const { data: current } = await supabase
            .from("user_credits")
            .select("balance")
            .eq("user_id", user.id)
            .single();
          if (current) {
            await supabase
              .from("user_credits")
              .update({ balance: current.balance + 10, updated_at: new Date().toISOString() })
              .eq("user_id", user.id);
          }
        } catch {
          console.error("Failed to refund credits");
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyEmails = () => {
    if (!results) return;
    const emails = results.flatMap((r) => r.emails).filter(Boolean);
    navigator.clipboard.writeText(emails.join("\n")).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 2000);
      toast({ title: "Copied!", description: `${emails.length} email(s) copied to clipboard.` });
    });
  };

  const handleDownload = () => {
    if (!results) return;
    const headers = ["Business Name", "Category", "Address", "Phone", "Website", "Email", "WhatsApp", "Contact Page"];
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
      fill: { fgColor: { rgb: "F7931A" }, patternType: "solid" as const },
      alignment: { horizontal: "center" as const, vertical: "center" as const },
      border: { bottom: { style: "thin" as const, color: { rgb: "EA580C" } } },
    };
    const cellStyle = {
      font: { sz: 10, name: "Calibri" },
      alignment: { vertical: "center" as const, wrapText: true },
      border: { bottom: { style: "thin" as const, color: { rgb: "E5E7EB" } } },
    };
    const altRowStyle = {
      ...cellStyle,
      fill: { fgColor: { rgb: "F8F0F0" }, patternType: "solid" as const },
    };
    const rows = results.map((r) => [
      r.name, r.category, r.address, r.phone, r.website,
      r.emails.join(", "), r.whatsapp.join(", "), r.contactPageFound ? "Yes" : "No",
    ]);
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    headers.forEach((_, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    });
    rows.forEach((row, rowIdx) => {
      const style = rowIdx % 2 === 1 ? altRowStyle : cellStyle;
      row.forEach((_, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
        if (ws[cellRef]) ws[cellRef].s = style;
      });
    });
    const colWidths = headers.map((h, i) => ({ wch: Math.min(Math.max(h.length, ...rows.map((r) => String(r[i] || "").length)) + 2, 50) }));
    ws["!cols"] = colWidths;
    ws["!rows"] = [{ hpt: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `GlobaLeads22-${searchPlan?.targetBusiness || keyword}-${searchPlan?.location || location}.xlsx`);
  };

  const handleUnlockIntelligence = async (index: number) => {
    if (!results || !results[index].website || !userProfile) {
      toast({ title: "Error", description: "Missing required data", variant: "destructive" });
      return;
    }

    // Check if free user trying to unlock
    if (creditsPlan === "free") {
      toast({ title: "Upgrade required", description: "Intelligence unlocks are only available with a paid plan.", variant: "destructive" });
      return;
    }

    // Check credits
    if (creditsBalance < 1) {
      toast({ title: "Insufficient credits", description: "You need at least 1 credit to unlock intelligence.", variant: "destructive" });
      return;
    }

    const lead = results[index];
    const domain = getDomain(lead.website);

    try {
      // Set loading state
      const newResults = [...results];
      newResults[index].intelligenceLoading = true;
      setResults(newResults);

      // Call analyze-lead edge function
      const { data, error } = await supabase.functions.invoke("analyze-lead", {
        body: {
          domain,
          homepage_text: "", // Will be empty for now; in production would pass scraped text
          enrichment: {
            emails: lead.emails,
            whatsapp: lead.whatsapp,
            contact_page_found: lead.contactPageFound,
            website_present: !!lead.website,
          },
          user_profile: {
            service_type: userProfile.service_type,
            pricing_tier: userProfile.pricing_tier,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Update results with intelligence
      const updatedResults = [...results];
      updatedResults[index] = {
        ...updatedResults[index],
        intelligence: data as LeadIntelligence,
        intelligenceLoading: false,
      };
      setResults(updatedResults);

      // Fire-and-forget: Update saved_leads with intelligence and deduct credit
      if (lead.dbId) {
        (async () => {
          try {
            // Update lead intelligence in database
            await supabase
              .from("saved_leads")
              .update({ intelligence: data })
              .eq("id", lead.dbId);

            // Deduct 1 credit for Intelligence unlock
            await deductCredits(1);
          } catch (dbError) {
            console.error("Error updating lead intelligence:", dbError);
          }
        })();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to unlock intelligence";
      toast({ title: "Error", description: msg, variant: "destructive" });

      // Clear loading state
      const newResults = [...results];
      newResults[index].intelligenceLoading = false;
      setResults(newResults);
    }
  };

  const handleUnlockAllIntelligence = async () => {
    if (!results) return;

    // Count how many leads need intelligence
    const leadsNeedingIntelligence = results.filter(r => r.website && !r.intelligence);
    const costPerLead = creditsPlan === "free" ? 1 : 1;
    const totalCost = leadsNeedingIntelligence.length * costPerLead;

    if (creditsBalance < totalCost) {
      toast({
        title: "Insufficient credits",
        description: `You need ${totalCost} credits to unlock intelligence for all leads. You have ${creditsBalance}.`,
        variant: "destructive",
      });
      return;
    }

    if (leadsNeedingIntelligence.length === 0) {
      toast({ title: "Already unlocked", description: "All available leads already have intelligence." });
      return;
    }

    // Show confirmation banner
    if (!confirmUnlockAll) {
      setConfirmUnlockAll(true);
      return;
    }

    // Unlock all
    setConfirmUnlockAll(false);
    for (let i = 0; i < results.length; i++) {
      if (results[i].website && !results[i].intelligence) {
        await handleUnlockIntelligence(i);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      }
    }

    toast({ title: "Intelligence unlocked", description: `Unlocked intelligence for ${leadsNeedingIntelligence.length} leads.` });
  };

  const getLeadFitLabels = (lead: LeadResult): string[] => {
    const text = `${lead.name} ${lead.category} ${lead.website} ${lead.address}`.toLowerCase();
    const labels: string[] = [];
    if (lead.website && (searchPlan?.businessModel === "online" || searchPlan?.businessModel === "hybrid" || text.includes("online"))) labels.push("Online-first");
    if (searchPlan?.companySize === "solo" || searchPlan?.companySize === "small" || (!text.includes("group") && !text.includes("chain") && !text.includes("corporate"))) labels.push("Small company signal");
    if (!lead.website || (lead.website && lead.emails.length === 0 && !lead.linkedinUrl)) labels.push("Weak website");
    if (lead.emails.length > 0 || lead.phone || lead.whatsapp.length > 0 || lead.linkedinUrl) labels.push("Easy to contact");
    if (text.includes("premium") || text.includes("luxury") || text.includes("boutique") || searchPlan?.intentSignals.includes("premium positioning")) labels.push("Premium positioning");
    return [...new Set(labels)].slice(0, 4);
  };

  const leadMatchesSearchPlan = (lead: LeadResult) => {
    if (!searchPlan) return true;
    const required = searchPlan.requiredChannels;
    if (required.includes("email") && lead.emails.length === 0) return false;
    if (required.includes("phone") && !lead.phone) return false;
    if (required.includes("WhatsApp") && lead.whatsapp.length === 0) return false;
    if (required.includes("LinkedIn") && !lead.linkedinUrl) return false;
    if (required.includes("website") && !lead.website) return false;
    if (searchPlan.businessModel === "online" && !lead.website) return false;
    return true;
  };

  const getLeadFitScore = (lead: LeadResult) => {
    if (!searchPlan) return 0;
    let score = 0;
    const labels = getLeadFitLabels(lead);
    score += labels.length * 5;
    searchPlan.requiredChannels.forEach(channel => {
      if (channel === "email" && lead.emails.length > 0) score += 12;
      if (channel === "phone" && lead.phone) score += 8;
      if (channel === "WhatsApp" && lead.whatsapp.length > 0) score += 8;
      if (channel === "LinkedIn" && lead.linkedinUrl) score += 8;
      if (channel === "website" && lead.website) score += 8;
    });
    if (searchPlan.businessModel !== "any" && lead.website) score += 8;
    if (searchPlan.companySize === "small" && labels.includes("Small company signal")) score += 8;
    if (searchPlan.intentSignals.includes("weak website") && labels.includes("Weak website")) score += 10;
    if (searchPlan.intentSignals.includes("premium positioning") && labels.includes("Premium positioning")) score += 10;
    return score;
  };

  // Filter and sort results — multi-predicate filtering
  const filteredResults = results?.filter(r => {
    if (!leadMatchesSearchPlan(r)) return false;
    if (filterByEmail && r.emails.length === 0) return false;
    if (filterByPhone && !r.phone) return false;
    if (filterByWebsite && !r.website) return false;
    if (filterByLinkedIn && !r.linkedinUrl) return false;
    if (filterByIntelligence && !r.intelligence) return false;
    if (filterScoreMin > 0 && (r.intelligence?.opportunityScore ?? 0) < filterScoreMin) return false;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.address.toLowerCase().includes(q) && !r.emails.join(" ").toLowerCase().includes(q)) return false;
    }
    return true;
  }) ?? null;

  const sortedResults = filteredResults ? [...filteredResults].sort((a, b) => {
    if (searchPlan) return getLeadFitScore(b) - getLeadFitScore(a);
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "emails") return (b.emails.length) - (a.emails.length);
    if (sortBy === "score") return ((b.intelligence?.opportunityScore ?? -1) - (a.intelligence?.opportunityScore ?? -1));
    return 0;
  }) : null;

  const emailCount    = sortedResults?.reduce((acc, r) => acc + r.emails.length, 0) ?? 0;
  const whatsappCount = sortedResults?.reduce((acc, r) => acc + r.whatsapp.length, 0) ?? 0;
  const leadsNeedingIntelligence = results?.filter(r => r.website && !r.intelligence).length ?? 0;
  const activeFilterCount = [filterByEmail, filterByPhone, filterByWebsite, filterByLinkedIn, filterByIntelligence, filterScoreMin > 0, filterText.trim() !== ""].filter(Boolean).length;
  const totalResultCount = results?.length ?? 0;
  const websiteCount = sortedResults?.filter(r => r.website).length ?? 0;
  const scoredLeads = sortedResults?.filter(r => r.intelligence) ?? [];
  const averageScore = scoredLeads.length
    ? Math.round(scoredLeads.reduce((acc, r) => acc + (r.intelligence?.opportunityScore ?? 0), 0) / scoredLeads.length)
    : null;
  const bestLead = scoredLeads.length
    ? [...scoredLeads].sort((a, b) => (b.intelligence?.opportunityScore ?? 0) - (a.intelligence?.opportunityScore ?? 0))[0]
    : null;
  const progressStages = ["Search maps", "Scan websites", "Rank opportunities", "Export-ready"];
  const exampleSearches = [
    { keyword: "Dental clinics", location: "Lisbon" },
    { keyword: "Law firms", location: "Berlin" },
    { keyword: "Solar installers", location: "Austin" },
    { keyword: "Boutique hotels", location: "Mexico City" },
  ];

  // Only render search form in "search" mode
  if (viewMode === "all-leads") {
    return null; // Parent will handle ViewAllLeads component
  }

  return (
    <section id="tool" className="w-full min-h-full bg-black text-[#EFEDE6]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {authLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#F5FF3D]" />
          </div>
        )}

        {!authLoading && !user && (
          <div className="mx-auto grid max-w-6xl gap-8 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[#F5FF3D]">Prospecting workspace</p>
              <h1 className="max-w-3xl font-display text-5xl font-black leading-[0.92] tracking-[-0.04em] text-[#EFEDE6] sm:text-7xl">
                Find buyers, not cold lists.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-7 text-[#A8A59C]">
                Search public maps, company sites, and contact pages from one focused command deck. Start free and leave with a ranked sheet.
              </p>
              <button
                className="mt-8 inline-flex items-center gap-2 border border-[#F5FF3D] bg-[#F5FF3D] px-6 py-3 font-display text-sm font-bold text-black transition-all hover:bg-[#FFFE7A]"
                onClick={onOpenAuth}
              >
                Start free - 50 credits <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="relative border border-[#EFEDE6]/20 bg-[#0A0A0A]">
              <div className="flex items-center justify-between border-b border-[#EFEDE6]/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#67645B]">
                <span>Sample extraction</span>
                <span className="text-[#F5FF3D]">Ready</span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
                <div className="border border-[#EFEDE6]/10 bg-black px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Search</p>
                  <p className="mt-1 text-sm text-[#EFEDE6]">Dental clinics</p>
                </div>
                <div className="border border-[#EFEDE6]/10 bg-black px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Location</p>
                  <p className="mt-1 text-sm text-[#EFEDE6]">Lisbon</p>
                </div>
                <div className="border border-[#F5FF3D] bg-[#F5FF3D] px-5 py-3 text-sm font-bold text-black">Run search</div>
              </div>
              <div className="divide-y divide-[#EFEDE6]/10 border-t border-[#EFEDE6]/10">
                {[
                  ["Clínica Almeida & Silva", "premium · multilang · email", 94],
                  ["Sorriso Premium Dental", "multi-location · LinkedIn", 88],
                  ["DentaLab Estoril", "WhatsApp · booking page", 81],
                ].map(([name, detail, score]) => (
                  <div key={String(name)} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4">
                    <div>
                      <p className="font-display text-sm font-semibold text-[#EFEDE6]">{name}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{detail}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-[#F5FF3D]">{score}</p>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">score</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!authLoading && user && (
          <div className="space-y-6">
            <div className="grid gap-6 border-b border-[#EFEDE6]/[0.14] pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-[#F5FF3D]">
                  Public maps · Company sites · Emails · LinkedIn · WhatsApp · XLSX
                </p>
                <h1 className="font-display text-4xl font-black leading-[0.95] tracking-[-0.04em] text-[#EFEDE6] sm:text-6xl">
                  Find buyers, not cold lists.
                </h1>
              </div>
              <div className="grid grid-cols-3 border border-[#EFEDE6]/10 text-center">
                {[
                  ["Credits", creditsBalance],
                  ["Current", totalResultCount],
                  ["Emails", emailCount],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border-r border-[#EFEDE6]/10 px-4 py-3 last:border-r-0">
                    <p className="font-mono text-xl font-black tabular-nums text-[#EFEDE6]">{value}</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Search Mode Menu ── */}
            {searchMode === null ? (
              <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-6">
                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#F5FF3D]">Start here</p>
                  <h2 className="mt-1 font-display text-3xl font-bold tracking-[-0.03em] text-[#EFEDE6]">
                    What are you looking for?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#A8A59C]">
                    Choose a search path. You can refine everything before running.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    { mode: "local" as const, icon: MapPin, title: "Local Leads", desc: "Find businesses in a city or region. Best for clinics, agencies, contractors, venues.", cta: "Search locally" },
                    { mode: "free"  as const, icon: Zap,    title: "Free Search", desc: "Describe your ideal buyer in plain language and let the planner build the search.", cta: "Write a brief" },
                    { mode: "online" as const, icon: Globe,  title: "Online Businesses", desc: "Find website-first companies, online services, SaaS, ecommerce, and remote businesses.", cta: "Search online" },
                    { mode: "recent" as const, icon: Clock,  title: "Recent / Saved", desc: "Resume a previous search or open your saved lead archive.", cta: "Open history" },
                  ] as const).map(({ mode, icon: Icon, title, desc, cta }) => (
                    <button
                      key={mode}
                      onClick={() => handleSelectSearchMode(mode)}
                      className="group flex flex-col gap-3 border border-[#EFEDE6]/10 bg-black p-5 text-left transition-all hover:border-[#F5FF3D]/50 hover:bg-[#F5FF3D]/[0.03]"
                    >
                      <div className="flex items-start gap-4">
                        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[#EFEDE6]/10 transition-colors group-hover:border-[#F5FF3D]/40">
                          <Icon className="h-4 w-4 text-[#A8A59C] transition-colors group-hover:text-[#F5FF3D]" />
                        </span>
                        <div>
                          <p className="font-display text-sm font-bold text-[#EFEDE6]">{title}</p>
                          <p className="mt-1.5 text-xs leading-5 text-[#67645B] transition-colors group-hover:text-[#A8A59C]">{desc}</p>
                        </div>
                      </div>
                      <span className="ml-12 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D] opacity-0 transition-opacity group-hover:opacity-100">
                        {cta} →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Mode strip */}
                <div className="flex items-center justify-between border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {searchMode === "local"  && <MapPin className="h-3.5 w-3.5 text-[#F5FF3D]" />}
                    {searchMode === "free"   && <Zap    className="h-3.5 w-3.5 text-[#F5FF3D]" />}
                    {searchMode === "online" && <Globe  className="h-3.5 w-3.5 text-[#F5FF3D]" />}
                    {searchMode === "recent" && <Clock  className="h-3.5 w-3.5 text-[#F5FF3D]" />}
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6]">
                      {searchMode === "local" ? "Local Leads" : searchMode === "free" ? "Free Search" : searchMode === "online" ? "Online Businesses" : "Recent / Saved"}
                    </span>
                  </div>
                  <button
                    onClick={handleChangeSearchMode}
                    disabled={isProcessing}
                    className="font-mono text-[10px] uppercase tracking-widest text-[#67645B] transition-colors hover:text-[#EFEDE6] disabled:opacity-30"
                  >
                    Change mode
                  </button>
                </div>

                {/* Recent / Saved panel */}
                {searchMode === "recent" && (
                  <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
                    <div className="flex items-center justify-between border-b border-[#EFEDE6]/10 px-4 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Quick resume</p>
                      <button
                        onClick={() => setSearchMode("local")}
                        className="font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D] hover:underline"
                      >
                        New search →
                      </button>
                    </div>
                    <div className="space-y-4 p-4">
                      <p className="font-mono text-xs text-[#A8A59C]">Pick a quick start below, or browse your full history in the sidebar.</p>
                      <div className="flex flex-wrap gap-2">
                        {exampleSearches.map((ex) => (
                          <button
                            key={`${ex.keyword}-${ex.location}-recent`}
                            onClick={() => {
                              setKeyword(ex.keyword);
                              setLocation(ex.location);
                              setSelectedPlace(null);
                              setSearchCenter(null);
                              setSearchMode("local");
                            }}
                            className="border border-[#EFEDE6]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#A8A59C] transition-colors hover:border-[#F5FF3D]/50 hover:text-[#EFEDE6]"
                          >
                            {ex.keyword} · {ex.location}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Brief builder */}
                {searchMode !== "recent" && (
                  <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
                    <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <label htmlFor="lead-brief" className="font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">Lead brief</label>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">AI planner</span>
                        </div>
                  <textarea
                    id="lead-brief"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Find small online-first dental clinics in Lisbon with weak websites and visible emails..."
                    disabled={isPlanning || isProcessing}
                    className="min-h-[104px] w-full resize-none border border-[#EFEDE6]/10 bg-black p-3 font-mono text-sm leading-6 text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50"
                  />
                  {planError && <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[#ffb4ab]">{planError}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["small companies", "online-only", "weak website", "premium clinics", "has LinkedIn", "email reachable"].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => setBrief(prev => `${prev}${prev ? " " : ""}${chip}`)}
                        disabled={isPlanning || isProcessing}
                        className="border border-[#EFEDE6]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#A8A59C] transition-colors hover:border-[#F5FF3D]/50 hover:text-[#EFEDE6] disabled:opacity-40"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleBuildSearchPlan}
                    disabled={isPlanning || isProcessing}
                    className="mt-4 border border-[#F5FF3D] bg-[#F5FF3D] px-5 py-2.5 font-display text-sm font-bold text-black transition-all hover:bg-[#FFFE7A] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPlanning ? "Building plan..." : "Build search plan"}
                  </button>
                </div>

                <div className="border border-[#EFEDE6]/10 bg-black">
                  <div className="border-b border-[#EFEDE6]/10 px-3 py-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Generated plan</p>
                  </div>
                  {searchPlan ? (
                    <div className="space-y-3 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={searchPlan.targetBusiness}
                          onChange={(e) => {
                            setSearchPlan(prev => prev ? { ...prev, targetBusiness: e.target.value } : prev);
                            setKeyword(e.target.value);
                          }}
                          className="h-9 border border-[#EFEDE6]/10 bg-[#0A0A0A] px-3 font-mono text-xs text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70"
                        />
                        <input
                          value={searchPlan.location}
                          onChange={(e) => {
                            setSearchPlan(prev => prev ? { ...prev, location: e.target.value } : prev);
                            setLocation(e.target.value);
                          }}
                          className="h-9 border border-[#EFEDE6]/10 bg-[#0A0A0A] px-3 font-mono text-xs text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={searchPlan.businessModel}
                          onChange={(e) => setSearchPlan(prev => prev ? { ...prev, businessModel: e.target.value as BusinessModel } : prev)}
                          className="h-9 border border-[#EFEDE6]/10 bg-[#0A0A0A] px-3 font-mono text-xs text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70"
                        >
                          <option value="any">Any model</option>
                          <option value="local">Local</option>
                          <option value="online">Online</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                        <select
                          value={searchPlan.companySize}
                          onChange={(e) => setSearchPlan(prev => prev ? { ...prev, companySize: e.target.value as CompanySize } : prev)}
                          className="h-9 border border-[#EFEDE6]/10 bg-[#0A0A0A] px-3 font-mono text-xs text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70"
                        >
                          <option value="any">Any size</option>
                          <option value="solo">Solo</option>
                          <option value="small">Small</option>
                          <option value="mid">Mid</option>
                        </select>
                      </div>
                      <p className="text-xs leading-5 text-[#A8A59C]">{searchPlan.summary}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["weak website", "no booking", "low review count", "premium positioning", "active LinkedIn", "contact page present"].map(signal => (
                          <button
                            key={signal}
                            onClick={() => togglePlanListValue("intentSignals", signal)}
                            className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${searchPlan.intentSignals.includes(signal) ? "border-[#F5FF3D] bg-[#F5FF3D] text-black" : "border-[#EFEDE6]/10 text-[#A8A59C] hover:border-[#F5FF3D]/50"}`}
                          >
                            {signal}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {["email", "phone", "WhatsApp", "LinkedIn", "website"].map(channel => (
                          <button
                            key={channel}
                            onClick={() => togglePlanListValue("requiredChannels", channel)}
                            className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${searchPlan.requiredChannels.includes(channel) ? "border-[#F5FF3D] bg-[#F5FF3D] text-black" : "border-[#EFEDE6]/10 text-[#A8A59C] hover:border-[#F5FF3D]/50"}`}
                          >
                            {channel}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {searchPlan.queryVariants.map((query, idx) => (
                          <input
                            key={idx}
                            value={query}
                            onChange={(e) => setSearchPlan(prev => prev ? { ...prev, queryVariants: prev.queryVariants.map((q, i) => i === idx ? e.target.value : q) } : prev)}
                            className="h-8 w-full border border-[#EFEDE6]/10 bg-[#0A0A0A] px-3 font-mono text-[10px] text-[#A8A59C] outline-none focus:border-[#F5FF3D]/70"
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[220px] items-center justify-center p-6 text-center">
                      <p className="max-w-xs font-mono text-[11px] uppercase leading-5 tracking-widest text-[#67645B]">
                        Describe the buyer you want. The planner will turn it into editable search criteria.
                      </p>
                    </div>
                  )}
                </div>
                  </div>
                </div>
                )}

                {/* Search form */}
                {searchMode !== "recent" && (
                <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
                  <div className="grid gap-3 p-4 lg:grid-cols-[1.3fr_1.3fr_0.55fr_0.65fr_auto] lg:items-end">
                <div>
                  <label htmlFor="keyword" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#67645B]" />
                    <input
                      id="keyword"
                      placeholder="Dental clinics, law firms, solar installers..."
                      value={keyword}
                      onChange={(e) => {
                        setKeyword(e.target.value);
                        setSearchPlan(prev => prev ? { ...prev, targetBusiness: e.target.value } : prev);
                      }}
                      onBlur={() => validateField("keyword", keyword)}
                      disabled={isProcessing}
                      className={`h-12 w-full border bg-black pl-10 pr-3 font-mono text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50 ${fieldErrors.keyword ? "border-[#ffb4ab]" : "border-[#EFEDE6]/10"}`}
                    />
                  </div>
                  {fieldErrors.keyword && <p className="mt-1 font-mono text-[10px] uppercase text-[#ffb4ab]">{fieldErrors.keyword}</p>}
                </div>

                <div>
                  <label htmlFor="location" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Location</label>
                  <LocationAutocomplete
                    google={googleApi}
                    value={location}
                    onChange={(val) => {
                      setLocation(val);
                      setSearchPlan(prev => prev ? { ...prev, location: val } : prev);
                      if (selectedPlace && val !== selectedPlace.label) { setSelectedPlace(null); setSearchCenter(null); }
                    }}
                    onPlaceSelect={(place) => {
                      setLocation(place.label);
                      setSearchPlan(prev => prev ? { ...prev, location: place.label } : prev);
                      setSelectedPlace(place);
                      setSearchCenter({ lat: place.lat, lng: place.lng });
                    }}
                    onBlur={() => validateField("location", location)}
                    disabled={isProcessing}
                    hasError={!!fieldErrors.location}
                  />
                  {fieldErrors.location && <p className="mt-1 font-mono text-[10px] uppercase text-[#ffb4ab]">{fieldErrors.location}</p>}
                </div>

                <div>
                  <label htmlFor="radius" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Radius</label>
                  <input
                    id="radius"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={radius}
                    onChange={(e) => {
                      setRadius(e.target.value);
                      setSearchPlan(prev => prev ? { ...prev, radius: e.target.value ? Number(e.target.value) : undefined } : prev);
                    }}
                    disabled={isProcessing}
                    className="h-12 w-full border border-[#EFEDE6]/10 bg-black px-3 text-center font-mono text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Limit</label>
                  <select
                    value={maxResults}
                    onChange={(e) => {
                      setMaxResults(Number(e.target.value));
                      setSearchPlan(prev => prev ? { ...prev, maxResults: Number(e.target.value) as 20 | 40 | 60 } : prev);
                    }}
                    disabled={isProcessing}
                    className="h-12 w-full border border-[#EFEDE6]/10 bg-black px-3 text-center font-mono text-sm text-[#EFEDE6] outline-none focus:border-[#F5FF3D]/70 disabled:opacity-50"
                  >
                    <option value={20}>20 leads</option>
                    <option value={40}>40 leads</option>
                    <option value={60}>60 leads</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isProcessing}
                  className="h-12 border border-[#F5FF3D] bg-[#F5FF3D] px-6 font-display text-sm font-bold text-black transition-all hover:bg-[#FFFE7A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? "Searching..." : "Run search"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-[#EFEDE6]/10 px-4 py-3">
                {exampleSearches.map((ex) => (
                  <button
                    key={`${ex.keyword}-${ex.location}`}
                    onClick={() => {
                      setKeyword(ex.keyword);
                      setLocation(ex.location);
                      setSelectedPlace(null);
                      setSearchCenter(null);
                    }}
                    className="border border-[#EFEDE6]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#A8A59C] transition-colors hover:border-[#F5FF3D]/50 hover:text-[#EFEDE6]"
                  >
                    {ex.keyword} · {ex.location}
                  </button>
                ))}
                </div>
                </div>
                )}
              </>
            )}

            {(!results || isProcessing) && (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="relative h-[340px] overflow-hidden border border-[#EFEDE6]/[0.14] bg-black xl:h-[380px]">
                  <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-[#EFEDE6]/10 bg-black/70 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] backdrop-blur">
                    <span className="text-[#A8A59C]">Live extraction stage</span>
                    <span className={isProcessing ? "text-[#F5FF3D]" : "text-[#67645B]"}>{isProcessing ? "Running" : "Ready"}</span>
                  </div>
                  <span className="absolute left-0 top-0 z-20 h-4 w-4 border-l border-t border-[#EFEDE6]" />
                  <span className="absolute right-0 top-0 z-20 h-4 w-4 border-r border-t border-[#EFEDE6]" />
                  <span className="absolute bottom-0 left-0 z-20 h-4 w-4 border-b border-l border-[#EFEDE6]" />
                  <span className="absolute bottom-0 right-0 z-20 h-4 w-4 border-b border-r border-[#EFEDE6]" />
                  <div className="h-full pt-10">
                    <MapboxPanel center={searchCenter} radiusKm={radius ? Number(radius) : 50} markers={mapMarkers} isSearching={isProcessing} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-[#EFEDE6]/10">
                    <div className="h-full bg-[#F5FF3D] transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
                  <div className="border-b border-[#EFEDE6]/10 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#67645B]">Pipeline</p>
                  </div>
                  <div className="space-y-3 p-4">
                    {progressStages.map((label, idx) => {
                      const isDone = progress >= [20, 85, 95, 100][idx];
                      const isActive = isProcessing && !isDone && progress >= [0, 20, 85, 95][idx];
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full border ${isDone || isActive ? "border-[#F5FF3D] bg-[#F5FF3D]" : "border-[#67645B]"}`} />
                          <span className={`font-mono text-[11px] uppercase tracking-widest ${isDone || isActive ? "text-[#EFEDE6]" : "text-[#67645B]"}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-[#EFEDE6]/10 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#67645B]">Live feed</p>
                    <div className="mt-4 space-y-3 font-mono text-[11px] text-[#A8A59C]">
                      <p>{status || "Choose a market and run your first search."}</p>
                      <p>{mapMarkers.length} businesses mapped</p>
                      <p>{emailCount} emails found</p>
                      <p>{progress}% complete</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {results && !isProcessing && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] sm:grid-cols-5">
                  {[
                    ["Leads", sortedResults?.length ?? 0],
                    ["Emails", emailCount],
                    ["WhatsApp", whatsappCount],
                    ["Websites", websiteCount],
                    ["Avg score", averageScore ?? "-"],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border-b border-r border-[#EFEDE6]/10 p-4 last:border-r-0 sm:border-b-0">
                      <p className="font-mono text-2xl font-black tabular-nums text-[#EFEDE6]">{value}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{label}</p>
                    </div>
                  ))}
                </div>

                {bestLead?.intelligence && (
                  <div className="grid gap-4 border border-[#F5FF3D]/40 bg-[#F5FF3D]/[0.04] p-5 lg:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F5FF3D]">Best next lead</p>
                      <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.03em] text-[#EFEDE6]">{bestLead.name}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A8A59C]">{bestLead.intelligence.outreachHook}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-mono text-4xl font-black text-[#F5FF3D]">{bestLead.intelligence.opportunityScore}</p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">score</p>
                      </div>
                      {bestLead.emails[0] && (
                        <button onClick={() => handleCopyField(`${bestLead.placeId}-best-hook`, `${bestLead.emails[0]}\n${bestLead.intelligence?.outreachHook ?? ""}`)} className="border border-[#EFEDE6]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6] hover:border-[#F5FF3D]">
                          Copy hook
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#67645B]" />
                    <input type="text" placeholder="Filter leads..." value={filterText} onChange={e => setFilterText(e.target.value)} className="h-10 w-full border border-[#EFEDE6]/10 bg-black pl-9 pr-3 font-mono text-xs text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {leadsNeedingIntelligence > 0 && userProfile && !confirmUnlockAll && (
                      <button onClick={handleUnlockAllIntelligence} className="border border-[#F5FF3D]/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D] hover:bg-[#F5FF3D] hover:text-black">
                        <Zap className="mr-1 inline h-3.5 w-3.5" /> Unlock all intel ({leadsNeedingIntelligence})
                      </button>
                    )}
                    <button onClick={handleCopyEmails} disabled={emailCount === 0} className="border border-[#EFEDE6]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6] hover:border-[#F5FF3D] disabled:opacity-30">
                      {emailsCopied ? "Copied emails" : "Copy emails"}
                    </button>
                    <button onClick={handleDownload} className="border border-[#F5FF3D] bg-[#F5FF3D] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#FFFE7A]">
                      Export XLSX
                    </button>
                  </div>
                </div>

                {confirmUnlockAll && leadsNeedingIntelligence > 0 && (
                  <div className="flex flex-col gap-4 border border-[#ffb4ab] bg-[#93000a]/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-mono text-xs uppercase text-[#ffdad6]">Deduct {leadsNeedingIntelligence} credits to uncover intelligence for {leadsNeedingIntelligence} lead{leadsNeedingIntelligence !== 1 ? "s" : ""}?</span>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmUnlockAll(false)} className="border border-[#ffdad6]/20 px-4 py-2 text-[10px] uppercase text-[#ffdad6] hover:bg-[#ffdad6]/10">Cancel</button>
                      <button onClick={handleUnlockAllIntelligence} className="bg-[#ffb4ab] px-4 py-2 text-[10px] font-bold uppercase text-[#690005] hover:brightness-110">Confirm</button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto border border-[#EFEDE6]/[0.14] bg-black">
                  <table className="w-full min-w-[920px] border-collapse text-left">
                    <thead className="sticky top-0 bg-[#0A0A0A]">
                      <tr className="border-b border-[#EFEDE6]/10">
                        {["Business", "Channels", "Website", userProfile ? "Intel" : "Score"].map((h) => (
                          <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFEDE6]/10">
                      {sortedResults?.map((r, i) => {
                        const score = r.intelligence?.opportunityScore ?? null;
                        return (
                          <tr key={r.placeId || i} className="animate-row-in align-top transition-colors hover:bg-[#EFEDE6]/[0.03]" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                            <td className="px-4 py-4">
                              <p className="max-w-[260px] truncate font-display text-sm font-semibold text-[#EFEDE6]">{r.name}</p>
                              <p className="mt-1 max-w-[260px] truncate font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{r.category?.replace(/_/g, " ") || "Uncategorized"}</p>
                              <p className="mt-2 max-w-[280px] truncate text-xs text-[#A8A59C]">{r.address || "No address listed"}</p>
                              {searchPlan && (
                                <div className="mt-3 flex max-w-[300px] flex-wrap gap-1.5">
                                  {getLeadFitLabels(r).map(label => (
                                    <span key={label} className="border border-[#F5FF3D]/30 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#F5FF3D]">
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="mb-3 flex flex-wrap gap-1.5">
                                {[
                                  { ok: r.emails.length > 0, icon: Mail, label: "Email" },
                                  { ok: !!r.phone, icon: Phone, label: "Phone" },
                                  { ok: !!r.website, icon: Globe, label: "Web" },
                                  { ok: !!r.linkedinUrl, icon: Linkedin, label: "LinkedIn" },
                                ].map(({ ok, icon: Icon, label }) => (
                                  <span key={label} title={label} className={`flex h-7 w-7 items-center justify-center rounded-full border ${ok ? "border-[#F5FF3D]/60 text-[#F5FF3D]" : "border-[#EFEDE6]/10 text-[#67645B]"}`}>
                                    <Icon className="h-3.5 w-3.5" />
                                  </span>
                                ))}
                              </div>
                              {r.emails[0] ? (
                                <button onClick={() => handleCopyField(`${r.placeId}-email-0`, r.emails[0])} className="font-mono text-[11px] text-[#F5FF3D] hover:underline">{r.emails[0]}</button>
                              ) : (
                                <span className="font-mono text-[11px] text-[#67645B]">-</span>
                              )}
                              {r.phone && <p className="mt-1 font-mono text-[11px] text-[#A8A59C]">{r.phone}</p>}
                            </td>
                            <td className="px-4 py-4">
                              {r.website ? (
                                <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[240px] items-center gap-1.5 truncate font-mono text-[11px] text-[#A8A59C] hover:text-[#EFEDE6]">
                                  <Globe className="h-3.5 w-3.5" />
                                  <span className="truncate">{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="font-mono text-[11px] text-[#67645B]">-</span>
                              )}
                              {r.linkedinUrl && (
                                <a href={r.linkedinUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-[#0A66C2]">
                                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {r.intelligenceLoading ? (
                                <span className="font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">Unlocking...</span>
                              ) : r.intelligence ? (
                                <div className="group relative max-w-[260px]">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-xl font-black text-[#F5FF3D]">{score}</span>
                                    <div className="h-1.5 w-28 bg-[#EFEDE6]/10"><div className="h-full bg-[#F5FF3D]" style={{ width: `${score ?? 0}%` }} /></div>
                                  </div>
                                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#A8A59C]">{r.intelligence.outreachHook}</p>
                                  <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-80 border border-[#F5FF3D]/40 bg-black p-3 text-xs text-[#A8A59C] shadow-2xl group-hover:block">
                                    <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">Why this score</p>
                                    <p>{r.intelligence.opportunitySummary}</p>
                                  </div>
                                </div>
                              ) : r.website && userProfile ? (
                                <button onClick={() => handleUnlockIntelligence(i)} className="border border-[#F5FF3D]/40 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D] hover:bg-[#F5FF3D] hover:text-black">Unlock intel</button>
                              ) : (
                                <span className="font-mono text-[11px] text-[#67645B]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {sortedResults?.length === 0 && (
                    <div className="border-t border-[#EFEDE6]/10 p-10 text-center">
                      <p className="font-mono text-xs uppercase tracking-widest text-[#A8A59C]">No leads match the current filters.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <section id="tool" className="w-full pb-20 relative font-mono text-cream-100 bg-petrol-900">
      <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto relative z-10 w-full mt-6">

        {/* Auth loading */}
        {authLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-wine-500" />
          </div>
        )}

        {/* ── Locked state ── */}
        {!authLoading && !user && (
          <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full relative pt-10">
            <div className="mb-10 text-center">
              <div className="text-wine-500 mb-4 flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-none bg-wine-500 animate-pulse" />
                // REDACTED INTELLIGENCE MODULE
              </div>
              <h2 className="font-bold text-cream-100 tracking-tighter uppercase text-3xl md:text-5xl">
                RESTRICTED_ACCESS
              </h2>
            </div>

            <div className="flex flex-col items-center gap-6 p-10 text-center bg-petrol-800 border border-cream-100/10 w-full relative">
              <div className="relative flex h-16 w-16 items-center justify-center border border-cream-100/5 rounded-none bg-[#131313]">
                <Lock className="h-7 w-7 text-cream-200/50" />
              </div>
              <div className="relative">
                <h3 className="text-sm font-bold text-cream-100 tracking-widest uppercase mb-2">
                  AUTHENTICATION REQUIRED
                </h3>
                <p className="text-cream-200 text-xs max-w-sm mx-auto opacity-70">
                  Establish a secure connection session to deploy extraction algorithms.
                </p>
              </div>
              <button
                className="w-full py-4 bg-wine-700 text-cream-100 font-bold uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all rounded-none"
                onClick={onOpenAuth}
              >
                Launch Secure Session
              </button>
            </div>
          </div>
        )}

        {/* ── Signed-in tool (STITCH LAYOUT) ── */}
        {!authLoading && user && (
          <>
            {/* Header / Title */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-cream-100/10 pb-4 mb-6">
              <div>
                <p className="text-[10px] text-wine-500 tracking-[0.4em] uppercase mb-1">Session ID: 0x{userProfile?.id ? userProfile.id.slice(0, 6).toUpperCase() : 'FF1290'}-A</p>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tighter uppercase text-cream-100">OPERATIONAL_DASHBOARD</h1>
              </div>
              <div className="mt-4 md:mt-0 text-left md:text-right">
                <p className="text-[10px] text-cream-200 uppercase">Node Latitude: {searchCenter ? searchCenter.lat.toFixed(4) : "34.0522"} N</p>
                <p className="text-[10px] text-cream-200 uppercase">Node Longitude: {searchCenter ? searchCenter.lng.toFixed(4) : "118.2437"} W</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* ── LEFT COLUMN: INPUTS & STATUS (4 columns) ── */}
              <div className="lg:col-span-4 lg:col-start-1 lg:sticky lg:top-[90px] flex flex-col gap-6">

                {/* Form Input Card */}
                <div className="bg-petrol-800 p-6 border-l-2 border-wine-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                    <Shield className="w-16 h-16" />
                  </div>
                  <h2 className="text-xs font-bold tracking-[0.2em] text-wine-500 uppercase mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-wine-700"></span> INITIATE EXTRACTION
                  </h2>

                  <div className="space-y-5">
                    {/* Keyword */}
                    <div className="space-y-1">
                      <label htmlFor="keyword" className="text-[10px] text-cream-200 uppercase font-bold">_KEYWORD_QUERY</label>
                      <input
                        id="keyword"
                        placeholder='e.g. CYBER_PROTOCOL'
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onBlur={() => validateField("keyword", keyword)}
                        disabled={isProcessing}
                        className={`w-full bg-[#1c1b1b] border-0 border-b border-cream-100/10 text-wine-500 placeholder:text-cream-100/20 focus:ring-0 focus:border-wine-700 font-mono text-xs p-3 rounded-none ${fieldErrors.keyword ? 'border-[#ffb4ab]' : ''}`}
                      />
                      {fieldErrors.keyword && <p className="text-[#ffb4ab] text-[9px] mt-1 uppercase">{fieldErrors.keyword}</p>}
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                      <label htmlFor="location" className="text-[10px] text-cream-200 uppercase font-bold">_LOCATION_NODE</label>
                      <div className="w-full bg-[#1c1b1b] border-0 border-b border-cream-100/10 focus-within:border-wine-700 relative text-wine-500">
                        <LocationAutocomplete
                          google={googleApi}
                          value={location}
                          onChange={(val) => {
                            setLocation(val);
                            if (selectedPlace && val !== selectedPlace.label) { setSelectedPlace(null); setSearchCenter(null); }
                          }}
                          onPlaceSelect={(place) => {
                            setLocation(place.label);
                            setSelectedPlace(place);
                            setSearchCenter({ lat: place.lat, lng: place.lng });
                          }}
                          onBlur={() => validateField("location", location)}
                          disabled={isProcessing}
                          hasError={!!fieldErrors.location}
                        />
                      </div>
                      {fieldErrors.location && <p className="text-[#ffb4ab] text-[9px] mt-1 uppercase">{fieldErrors.location}</p>}
                    </div>

                    {/* Radios & Max Results */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="radius" className="text-[10px] text-cream-200 uppercase font-bold">_RADIUS_KM</label>
                        <input
                          id="radius"
                          type="number"
                          min="1"
                          placeholder="50"
                          value={radius}
                          onChange={(e) => setRadius(e.target.value)}
                          disabled={isProcessing}
                          className="w-full bg-[#1c1b1b] border-0 border-b border-cream-100/10 text-wine-500 focus:ring-0 focus:border-wine-700 font-mono text-xs text-center p-3 rounded-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-cream-200 uppercase font-bold">_YIELD_LIMITS</label>
                        <select
                          value={maxResults}
                          onChange={(e) => setMaxResults(Number(e.target.value))}
                          disabled={isProcessing}
                          className="w-full bg-[#1c1b1b] border-0 border-b border-cream-100/10 text-wine-500 focus:ring-0 focus:border-wine-700 font-mono text-xs text-center p-3 rounded-none appearance-none cursor-pointer"
                        >
                          <option value={20}>20_NODES</option>
                          <option value={40}>40_NODES</option>
                          <option value={60}>60_NODES</option>
                        </select>
                      </div>
                    </div>

                    {/* Submit Action */}
                    <button
                      onClick={handleGenerate}
                      disabled={isProcessing}
                      className={`w-full py-4 font-bold uppercase tracking-widest text-sm transition-all rounded-none mt-2 ${isProcessing ? 'bg-wine-700/30 text-cream-100/50 cursor-not-allowed' : 'bg-wine-700 text-cream-100 hover:brightness-110 active:scale-[0.98]'}`}
                    >
                      {isProcessing ? 'DEPLOYING...' : 'DEPLOY ANALYSIS NODE'}
                    </button>
                  </div>
                </div>

                {/* Progress Panel */}
                {(isProcessing || (results && progress > 0)) && (
                  <div className="bg-petrol-800 p-6 border border-cream-100/10 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[10px] font-bold text-cream-100 uppercase tracking-widest">SCAN_PROGRESS</h3>
                      <span className="text-[10px] text-wine-500 animate-pulse">LIVE_STREAM</span>
                    </div>

                    <div className="w-full h-1 bg-cream-100/5 mb-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-wine-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="h-40 overflow-y-auto font-mono text-[10px] space-y-1 text-cream-200 opacity-80 pl-1 pr-2">
                       {STEPS_INIT.map((step, i) => {
                          const current = steps[i];
                          if(current.status === "pending") return null;
                          return (
                            <p key={step.label} className={current.status === "active" ? "text-wine-500" : ""}>
                              {">"} {step.label}... {current.status === "active" ? <span><span className="blinking-cursor"></span></span> : "[OK]"}
                            </p>
                          )
                       })}
                       <p className="text-[9px] text-wine-500 uppercase mt-2 opacity-70">
                         {status} {progress}%
                       </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN: VISUALS & DATA (8 columns) ── */}
              <div className="lg:col-span-8 space-y-6">

                {/* Map View - Only show if NO results OR actively searching */}
                {(!results || isProcessing) && (
                <div className="bg-[#1c1b1b] border border-cream-100/10 h-[600px] w-full relative overflow-hidden flex flex-col transition-all duration-700">
                  <div className="absolute top-4 left-4 z-10 space-y-2 pointer-events-none">
                    <div className="bg-petrol-800/80 backdrop-blur-md p-2 border border-cream-100/10 text-[10px] font-mono shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                      <span className="text-wine-500">VISUALIZER:</span> GLOBAL_NET_FLOW (V2.0)
                    </div>
                  </div>

                  {/* Actual Map Panel */}
                  <div className="flex-1 w-full h-full grayscale brightness-50 opacity-80 mix-blend-screen overflow-hidden">
                    <MapboxPanel
                      center={searchCenter}
                      radiusKm={radius ? Number(radius) : 50}
                      markers={mapMarkers}
                      isSearching={isProcessing}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent pointer-events-none"></div>
                </div>
                )}

                {/* Data Table Panel */}
{/* Data Table Panel */}
                {results && !isProcessing && (
                  <div className="animate-fade-in-up">
                    <div className="mb-6 p-6 bg-petrol-800 border border-wine-700/30 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                        <CheckCheck className="w-24 h-24" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tighter text-wine-500 uppercase mb-2 flex items-center gap-2">
                         [ TASK COMPLETED ]
                      </h2>
                      <p className="text-cream-200 text-[10px] uppercase tracking-widest font-mono">
                        EXTRACTION SUCCESSFUL. {sortedResults?.length ?? 0} NODES SECURED. AWAITING COMMAND.
                      </p>
                    </div>

                  {/* Toolkit Actions & Filters */}
                  <div className="bg-petrol-800 border border-cream-100/10 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="flex items-center relative w-full md:w-64">
                          <Search className="h-4 w-4 absolute left-3 text-cream-200/40" />
                          <input
                            type="text"
                            placeholder="QUERY_PAYLOAD..."
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                            className="h-10 w-full bg-[#1c1b1b] border border-cream-100/10 pl-9 pr-3 text-cream-100 text-[10px] placeholder:text-cream-200/30 outline-none focus:border-wine-700/50 font-mono transition-none rounded-none"
                          />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                       {leadsNeedingIntelligence > 0 && userProfile && !confirmUnlockAll && (
                          <button
                            onClick={handleUnlockAllIntelligence}
                            className="bg-wine-700/10 border border-wine-700/30 text-wine-500 hover:bg-wine-700/20 px-4 py-2 font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-2"
                          >
                            <Zap className="h-3.5 w-3.5" /> [ UNLOCK_ALL ({leadsNeedingIntelligence}) ]
                          </button>
                        )}
                        <button
                          onClick={handleCopyEmails}
                          disabled={emailCount === 0}
                          className="bg-[#1c1b1b] border border-cream-100/10 text-cream-100 hover:bg-[#353534] px-4 py-2 font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-2 disabled:opacity-30"
                        >
                          {emailsCopied ? <><CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> [ COPIED_EMAILS ]</> : <><Copy className="h-3.5 w-3.5" /> [ DUMP_EMAILS ]</>}
                        </button>
                        <button
                          onClick={handleDownload}
                          className="bg-[#1c1b1b] border border-cream-100/10 text-emerald-500 hover:bg-[#353534] px-4 py-2 font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-2"
                        >
                          <Download className="h-3.5 w-3.5" /> [ EXPORT_CSV ]
                        </button>
                    </div>
                  </div>

                  {/* Unlock Confirm Banner */}
                  {confirmUnlockAll && leadsNeedingIntelligence > 0 && (
                    <div className="p-4 bg-[#93000a] border border-[#ffb4ab] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="font-mono text-xs text-[#ffdad6] uppercase">
                        WARNING: Deduct {leadsNeedingIntelligence} credits to uncover intelligence for {leadsNeedingIntelligence} target{leadsNeedingIntelligence !== 1 ? 's' : ''}?
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setConfirmUnlockAll(false)} className="px-4 py-2 text-[10px] uppercase text-[#ffdad6] border border-[#ffdad6]/20 hover:bg-[#ffdad6]/10">Abort</button>
                        <button onClick={handleUnlockAllIntelligence} className="px-4 py-2 bg-[#ffb4ab] text-[#690005] font-bold uppercase text-[10px] hover:brightness-110">Confirm_Deploy</button>
                      </div>
                    </div>
                  )}

                  <div className="bg-petrol-800 border border-cream-100/10 overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px] leading-tight border-collapse">
                      <thead>
                        <tr className="bg-[#2a2a2a] border-b border-cream-100/10">
                          <th className="p-4 font-bold uppercase tracking-widest text-wine-500">Target Identity</th>
                          <th className="p-4 font-bold uppercase tracking-widest text-wine-500">Comms Protocol</th>
                          <th className="p-4 font-bold uppercase tracking-widest text-wine-500 min-w-[200px]">Web Footprint</th>
                          {userProfile && <th className="p-4 font-bold uppercase tracking-widest text-wine-500">Opp. Score / Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-100/5">
                        {sortedResults?.map((r, i) => (
                          <tr key={r.placeId || i} className="hover:bg-cream-100/5 transition-colors group align-top">
                            <td className="p-4">
                              <div className="flex flex-col gap-1 max-w-[200px]">
                                <span className="font-bold text-cream-100 truncate block">{r.name}</span>
                                {r.category && <span className="text-[9px] text-cream-200/60 uppercase tracking-widest">{r.category.replace(/_/g, " ")}</span>}
                              </div>
                            </td>

                            <td className="p-4 text-cream-200">
                                <div className="space-y-3">
                                  {r.phone ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px]">{r.phone}</span>
                                      <button onClick={() => handleCopyField(`${r.placeId}-phone`, r.phone)} className="opacity-50 hover:opacity-100 hover:text-wine-500" title="Copy Phone">
                                        {copiedKeys.has(`${r.placeId}-phone`) ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                      </button>
                                    </div>
                                  ) : <span className="text-[10px] opacity-30">NO_PHONE_NODE</span>}

                                  {r.emails.length > 0 ? (
                                    <div className="space-y-1.5 pl-2 border-l border-wine-700/30">
                                      {r.emails.slice(0, 2).map((e, eIdx) => (
                                        <div key={e} className="flex items-center gap-2">
                                          <span className="text-wine-500 text-[10px] truncate max-w-[150px]">{e}</span>
                                          <button onClick={() => handleCopyField(`${r.placeId}-email-${eIdx}`, e)} className="opacity-50 hover:opacity-100 hover:text-wine-500" title="Copy Email">
                                            {copiedKeys.has(`${r.placeId}-email-${eIdx}`) ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                          </button>
                                        </div>
                                      ))}
                                      {r.emails.length > 2 && <p className="text-[8px] text-cream-100/30 pt-1">+{r.emails.length - 2} HIDDEN_NODES</p>}
                                    </div>
                                  ) : <span className="text-[10px] opacity-30 block">NO_EMAIL_NODE</span>}
                                </div>
                            </td>

                            <td className="p-4">
                               <div className="flex flex-col gap-2">
                                {r.website ? (
                                  <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-cream-100/50 hover:text-cream-100 transition-colors w-max p-1 hover:bg-[#353534]">
                                    <Globe className="h-3 w-3 opacity-60" />
                                    <span className="truncate max-w-[160px]">{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                                  </a>
                                ) : <span className="text-[10px] opacity-30">NO_WEB_FOOTPRINT</span>}

                                {r.linkedinUrl && (
                                  <a href={r.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-[#0A66C2]/80 hover:text-[#0A66C2] transition-colors w-max p-1 hover:bg-[#0A66C2]/10 mt-1">
                                    <Linkedin className="h-3 w-3" /> LINKEDIN_PROF
                                  </a>
                                )}
                               </div>
                            </td>

                            {userProfile && (
                              <td className="p-4">
                                {r.intelligenceLoading ? (
                                  <span className="text-[10px] text-wine-500 animate-pulse">DECRYPTING...</span>
                                ) : r.intelligence ? (
                                  <div className="flex gap-1 flex-col">
                                    <span className="font-bold text-wine-500 text-xs mb-1">{r.intelligence.opportunityScore}%</span>
                                    <span className="text-[9px] text-cream-200 leading-snug"><span className="text-cream-100 font-bold">HOOK:</span> {r.intelligence.outreachHook}</span>
                                  </div>
                                ) : r.website ? (
                                  <button onClick={() => handleUnlockIntelligence(i)} className="px-2 py-1.5 border border-wine-700/30 text-wine-500 bg-wine-700/5 hover:bg-wine-700 hover:text-cream-100 transition-all text-[9px] uppercase tracking-tighter w-full max-w-[140px] flex justify-center mt-2 group/btn">
                                    [ EXTRACT ]
                                  </button>
                                ) : (
                                  <span className="text-[10px] opacity-30 block mt-2">N/A</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {sortedResults?.length === 0 && (
                      <div className="p-10 text-center text-[#ffb4ab] border-t border-[#ffb4ab]/20 bg-[#93000a]/10">
                        <span className="material-symbols-outlined block text-3xl mb-2 opacity-50">warning</span>
                        <p className="text-xs uppercase tracking-widest font-bold">DATASTREAM_EMPTY</p>
                      </div>
                    )}
                  </div>
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );

};

export default LeadGeneratorSection;
