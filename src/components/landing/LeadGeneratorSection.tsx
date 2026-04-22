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
  Lightbulb, TrendingUp, Linkedin, Shield
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
    {Icon && <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 pointer-events-none" />}
    <input
      id={id}
      type={type}
      min={min}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full h-12 bg-black/30 border border-white/[0.10] focus:border-white/40 text-white text-sm placeholder:text-white/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-mono-data"
      style={{ borderRadius: "3px", paddingLeft: Icon ? "2.5rem" : "1rem", paddingRight: "1rem" }}
    />
  </div>
);

/* Mono label */
const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label
    htmlFor={htmlFor}
    className="block mb-2 font-mono-data text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]"
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
    const parsed = searchSchema.safeParse({ keyword, location, radius: radius || "", maxResults });
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
          body: { keyword: keyword.trim(), location: location.trim(), radius: radius ? Number(radius) : undefined, maxResults },
        }),
        supabase.functions.invoke("web-search-leads", {
          body: { keyword: keyword.trim(), location: location.trim(), maxResults: Math.min(maxResults, 20) },
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
                keyword: keyword.trim(),
                location: location.trim(),
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
    XLSX.writeFile(wb, `GlobaLeads22-${keyword}-${location}.xlsx`);
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

  // Filter and sort results — multi-predicate filtering
  const filteredResults = results?.filter(r => {
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

  // Only render search form in "search" mode
  if (viewMode === "all-leads") {
    return null; // Parent will handle ViewAllLeads component
  }

  return (
    <section id="tool" className="w-full pb-20 relative font-mono text-[#e5e2e1]" style={{ background: "transparent" }}>
      {/* Absolute Grain overlay */}
      <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCQaVDAPffRmh8CSO1KPsZf25EqZARcoeQW6wntnuYT2TPvG3Rid6Co7m28Kg5wkK7o99xvzGAboo78Lz4IakvxyBI4p2JpJl3Ea1tdVdfRUArFJRJiKc3l4PgDflnG8C39mgYIxHXZ94yX_zukcM_6BViuj8n5TcWB2KO8PjGjOxxh73-m5wAvcXaSVt96raS-LO4U1wdUYmHC9TYaE--sV1CwKtWW46-uubx2SxTai4xgYH5Xy_1FLOUYFlddwz1ByjCtez5pStjr')] opacity-[0.03] pointer-events-none z-0"></div>

      <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto relative z-10 w-full mt-6">
      
        {/* Auth loading */}
        {authLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#f7931a]" />
          </div>
        )}

        {/* ── Locked state ── */}
        {!authLoading && !user && (
          <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full relative pt-10">
            <div className="mb-10 text-center">
              <div className="text-[#f7931a] mb-4 flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-none bg-[#f7931a] animate-pulse" />
                // REDACTED INTELLIGENCE MODULE
              </div>
              <h2 className="font-bold text-[#e5e2e1] tracking-tighter uppercase text-3xl md:text-5xl">
                RESTRICTED_ACCESS
              </h2>
            </div>

            <div className="flex flex-col items-center gap-6 p-10 text-center bg-[#0e0e0e] border border-white/10 w-full relative">
              <div className="relative flex h-16 w-16 items-center justify-center border border-white/5 rounded-none bg-[#131313]">
                <Lock className="h-7 w-7 text-[#dbc2ae]/50" />
              </div>
              <div className="relative">
                <h3 class="text-sm font-bold text-[#e5e2e1] tracking-widest uppercase mb-2">
                  AUTHENTICATION REQUIRED
                </h3>
                <p className="text-[#dbc2ae] text-xs max-w-sm mx-auto opacity-70">
                  Establish a secure connection session to deploy extraction algorithms.
                </p>
              </div>
              <button
                className="w-full py-4 bg-[#f7931a] text-[#4b2800] font-bold uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all rounded-none"
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
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-4 mb-6">
              <div>
                <p className="text-[10px] text-[#f7931a] tracking-[0.4em] uppercase mb-1">Session ID: 0x{userProfile?.id ? userProfile.id.slice(0, 6).toUpperCase() : 'FF1290'}-A</p>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tighter uppercase text-[#e5e2e1]">OPERATIONAL_DASHBOARD</h1>
              </div>
              <div className="mt-4 md:mt-0 text-left md:text-right">
                <p className="text-[10px] text-[#dbc2ae] uppercase">Node Latitude: {searchCenter ? searchCenter.lat.toFixed(4) : "34.0522"} N</p>
                <p className="text-[10px] text-[#dbc2ae] uppercase">Node Longitude: {searchCenter ? searchCenter.lng.toFixed(4) : "118.2437"} W</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ── LEFT COLUMN: INPUTS & STATUS (4 columns) ── */}
              <div className="lg:col-span-4 lg:col-start-1 lg:sticky lg:top-[90px] flex flex-col gap-6">
                
                {/* Form Input Card */}
                <div className="bg-[#0e0e0e] p-6 border-l-2 border-[#f7931a] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                    <Shield className="w-16 h-16" />
                  </div>
                  <h2 className="text-xs font-bold tracking-[0.2em] text-[#f7931a] uppercase mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#f7931a]"></span> INITIATE EXTRACTION
                  </h2>

                  <div className="space-y-5">
                    {/* Keyword */}
                    <div className="space-y-1">
                      <label htmlFor="keyword" className="text-[10px] text-[#dbc2ae] uppercase font-bold">_KEYWORD_QUERY</label>
                      <input
                        id="keyword"
                        placeholder='e.g. CYBER_PROTOCOL'
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onBlur={() => validateField("keyword", keyword)}
                        disabled={isProcessing}
                        className={`w-full bg-[#1c1b1b] border-0 border-b border-white/10 text-[#f7931a] placeholder:text-white/20 focus:ring-0 focus:border-[#f7931a] font-mono text-xs p-3 rounded-none ${fieldErrors.keyword ? 'border-[#ffb4ab]' : ''}`}
                      />
                      {fieldErrors.keyword && <p className="text-[#ffb4ab] text-[9px] mt-1 uppercase">{fieldErrors.keyword}</p>}
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                      <label htmlFor="location" className="text-[10px] text-[#dbc2ae] uppercase font-bold">_LOCATION_NODE</label>
                      <div className="w-full bg-[#1c1b1b] border-0 border-b border-white/10 focus-within:border-[#f7931a] relative text-[#f7931a]">
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
                        <label htmlFor="radius" className="text-[10px] text-[#dbc2ae] uppercase font-bold">_RADIUS_KM</label>
                        <input
                          id="radius"
                          type="number"
                          min="1"
                          placeholder="50"
                          value={radius}
                          onChange={(e) => setRadius(e.target.value)}
                          disabled={isProcessing}
                          className="w-full bg-[#1c1b1b] border-0 border-b border-white/10 text-[#f7931a] focus:ring-0 focus:border-[#f7931a] font-mono text-xs text-center p-3 rounded-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#dbc2ae] uppercase font-bold">_YIELD_LIMITS</label>
                        <select
                          value={maxResults}
                          onChange={(e) => setMaxResults(Number(e.target.value))}
                          disabled={isProcessing}
                          className="w-full bg-[#1c1b1b] border-0 border-b border-white/10 text-[#f7931a] focus:ring-0 focus:border-[#f7931a] font-mono text-xs text-center p-3 rounded-none appearance-none cursor-pointer"
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
                      className={`w-full py-4 font-bold uppercase tracking-widest text-sm transition-all rounded-none mt-2 ${isProcessing ? 'bg-[#f7931a]/30 text-[#4b2800]/50 cursor-not-allowed' : 'bg-[#f7931a] text-[#4b2800] hover:brightness-110 active:scale-[0.98]'}`}
                    >
                      {isProcessing ? 'DEPLOYING...' : 'DEPLOY ANALYSIS NODE'}
                    </button>
                  </div>
                </div>

                {/* Progress Panel */}
                {(isProcessing || (results && progress > 0)) && (
                  <div className="bg-[#0e0e0e] p-6 border border-white/10 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[10px] font-bold text-[#e5e2e1] uppercase tracking-widest">SCAN_PROGRESS</h3>
                      <span className="text-[10px] text-[#f7931a] animate-pulse">LIVE_STREAM</span>
                    </div>

                    <div className="w-full h-1 bg-white/5 mb-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-[#f7931a] shadow-[0_0_10px_#F7931A] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="h-40 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1 text-[#dbc2ae] opacity-80 pl-1 pr-2">
                       {STEPS_INIT.map((step, i) => {
                          const current = steps[i];
                          if(current.status === "pending") return null;
                          return (
                            <p key={step.label} className={current.status === "active" ? "text-[#f7931a]" : ""}>
                              {">"} {step.label}... {current.status === "active" ? <span><span className="blinking-cursor"></span></span> : "[OK]"}
                            </p>
                          )
                       })}
                       <p className="text-[9px] text-[#f7931a] uppercase mt-2 opacity-70">
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
                <div className="bg-[#1c1b1b] border border-white/10 h-[600px] w-full relative overflow-hidden flex flex-col transition-all duration-700">
                  <div className="absolute top-4 left-4 z-10 space-y-2 pointer-events-none">
                    <div className="bg-[#0e0e0e]/80 backdrop-blur-md p-2 border border-white/10 text-[10px] font-mono shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                      <span className="text-[#f7931a]">VISUALIZER:</span> GLOBAL_NET_FLOW (V2.0)
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
                    <div className="mb-6 p-6 bg-[#0e0e0e] border border-[#f7931a]/30 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                        <CheckCheck className="w-24 h-24" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tighter text-[#f7931a] uppercase mb-2 flex items-center gap-2">
                         [ TASK COMPLETED ]
                      </h2>
                      <p className="text-[#dbc2ae] text-[10px] uppercase tracking-widest font-mono">
                        EXTRACTION SUCCESSFUL. {sortedResults?.length ?? 0} NODES SECURED. AWAITING COMMAND.
                      </p>
                    </div>

                  {/* Toolkit Actions & Filters */}
                  <div className="bg-[#0e0e0e] border border-white/10 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="flex items-center relative w-full md:w-64">
                          <Search className="h-4 w-4 absolute left-3 text-[#dbc2ae]/40" />
                          <input
                            type="text"
                            placeholder="QUERY_PAYLOAD..."
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                            className="h-10 w-full bg-[#1c1b1b] border border-white/10 pl-9 pr-3 text-[#e5e2e1] text-[10px] placeholder:text-[#dbc2ae]/30 outline-none focus:border-[#f7931a] font-mono transition-none rounded-none"
                          />
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                       {leadsNeedingIntelligence > 0 && userProfile && !confirmUnlockAll && (
                          <button
                            onClick={handleUnlockAllIntelligence}
                            className="bg-[#f7931a]/10 border border-[#f7931a]/30 text-[#f7931a] hover:bg-[#f7931a]/20 px-4 py-2 font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-2"
                          >
                            <Zap className="h-3.5 w-3.5" /> [ UNLOCK_ALL ({leadsNeedingIntelligence}) ]
                          </button>
                        )}
                        <button
                          onClick={handleCopyEmails}
                          disabled={emailCount === 0}
                          className="bg-[#1c1b1b] border border-white/10 text-[#e5e2e1] hover:bg-[#353534] px-4 py-2 font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-2 disabled:opacity-30"
                        >
                          {emailsCopied ? <><CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> [ COPIED_EMAILS ]</> : <><Copy className="h-3.5 w-3.5" /> [ DUMP_EMAILS ]</>}
                        </button>
                        <button
                          onClick={handleDownload}
                          className="bg-[#1c1b1b] border border-white/10 text-emerald-500 hover:bg-[#353534] px-4 py-2 font-mono text-[10px] tracking-wider uppercase transition-all flex items-center gap-2"
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

                  <div className="bg-[#0e0e0e] border border-white/10 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left font-mono text-[11px] leading-tight border-collapse">
                      <thead>
                        <tr className="bg-[#2a2a2a] border-b border-white/10">
                          <th className="p-4 font-bold uppercase tracking-widest text-[#f7931a]">Target Identity</th>
                          <th className="p-4 font-bold uppercase tracking-widest text-[#f7931a]">Comms Protocol</th>
                          <th className="p-4 font-bold uppercase tracking-widest text-[#f7931a] min-w-[200px]">Web Footprint</th>
                          {userProfile && <th className="p-4 font-bold uppercase tracking-widest text-[#f7931a]">Opp. Score / Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedResults?.map((r, i) => (
                          <tr key={r.placeId || i} className="hover:bg-white/5 transition-colors group align-top">
                            <td className="p-4">
                              <div className="flex flex-col gap-1 max-w-[200px]">
                                <span className="font-bold text-[#e5e2e1] truncate block">{r.name}</span>
                                {r.category && <span className="text-[9px] text-[#dbc2ae]/60 uppercase tracking-widest">{r.category.replace(/_/g, " ")}</span>}
                              </div>
                            </td>

                            <td className="p-4 text-[#dbc2ae]">
                                <div className="space-y-3">
                                  {r.phone ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px]">{r.phone}</span>
                                      <button onClick={() => handleCopyField(`${r.placeId}-phone`, r.phone)} className="opacity-50 hover:opacity-100 hover:text-[#f7931a]" title="Copy Phone">
                                        {copiedKeys.has(`${r.placeId}-phone`) ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                      </button>
                                    </div>
                                  ) : <span className="text-[10px] opacity-30">NO_PHONE_NODE</span>}
                                  
                                  {r.emails.length > 0 ? (
                                    <div className="space-y-1.5 pl-2 border-l border-[#f7931a]/30">
                                      {r.emails.slice(0, 2).map((e, eIdx) => (
                                        <div key={e} className="flex items-center gap-2">
                                          <span className="text-[#f7931a] text-[10px] truncate max-w-[150px]">{e}</span>
                                          <button onClick={() => handleCopyField(`${r.placeId}-email-${eIdx}`, e)} className="opacity-50 hover:opacity-100 hover:text-[#f7931a]" title="Copy Email">
                                            {copiedKeys.has(`${r.placeId}-email-${eIdx}`) ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                          </button>
                                        </div>
                                      ))}
                                      {r.emails.length > 2 && <p className="text-[8px] text-white/30 pt-1">+{r.emails.length - 2} HIDDEN_NODES</p>}
                                    </div>
                                  ) : <span className="text-[10px] opacity-30 block">NO_EMAIL_NODE</span>}
                                </div>
                            </td>

                            <td className="p-4">
                               <div className="flex flex-col gap-2">
                                {r.website ? (
                                  <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-white/50 hover:text-white transition-colors w-max p-1 hover:bg-[#353534]">
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
                                  <span className="text-[10px] text-[#f7931a] animate-pulse">DECRYPTING...</span>
                                ) : r.intelligence ? (
                                  <div className="flex gap-1 flex-col">
                                    <span className="font-bold text-[#f7931a] text-xs mb-1">{r.intelligence.opportunityScore}%</span>
                                    <span className="text-[9px] text-[#dbc2ae] leading-snug"><span className="text-[#e5e2e1] font-bold">HOOK:</span> {r.intelligence.outreachHook}</span>
                                  </div>
                                ) : r.website ? (
                                  <button onClick={() => handleUnlockIntelligence(i)} className="px-2 py-1.5 border border-[#f7931a]/30 text-[#f7931a] bg-[#f7931a]/5 hover:bg-[#f7931a] hover:text-[#131313] transition-all text-[9px] uppercase tracking-tighter w-full max-w-[140px] flex justify-center mt-2 group/btn">
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
