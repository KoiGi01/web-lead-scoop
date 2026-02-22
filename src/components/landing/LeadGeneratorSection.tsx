import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  Search, Download, Loader2, MapPin, Copy, CheckCheck,
  Mail, Phone, Globe, ExternalLink, ChevronRight, Lock, Zap,
  Target, Lightbulb, TrendingUp,
} from "lucide-react";
import XLSX from "xlsx-js-style";

interface Business {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
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
  contactPageFound: boolean;
  intelligence?: LeadIntelligence | null;
  intelligenceLoading?: boolean;
}

type StepStatus = "idle" | "active" | "done";

interface Step {
  label: string;
  status: StepStatus;
}

const STEPS_INIT: Step[] = [
  { label: "Search Maps & Web", status: "idle" },
  { label: "Scan Websites",     status: "idle" },
  { label: "Compile Leads",     status: "idle" },
];

interface LeadGeneratorSectionProps {
  onOpenAuth?: () => void;
  devBypass?: boolean;
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
      className="w-full h-12 bg-black/50 border-b-2 border-white/20 focus:border-[#F7931A] text-white text-sm placeholder:text-white/30 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)]"
      style={{ paddingLeft: Icon ? "2.5rem" : "1rem", paddingRight: "1rem" }}
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

const LeadGeneratorSection = ({ onOpenAuth, devBypass }: LeadGeneratorSectionProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile: userProfile } = useUserProfile(user?.id);
  const effectiveUser = devBypass ? true : user;

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

  const setStep = (index: number, s: StepStatus) => {
    setSteps((prev) => prev.map((st, i) => (i === index ? { ...st, status: s } : st)));
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  };

  const handleGenerate = async () => {
    if (!keyword.trim() || !location.trim()) {
      toast({ title: "Missing fields", description: "Please enter a keyword and location.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    setResults(null);
    setProgress(0);
    setSteps(STEPS_INIT);

    try {
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

      const mapsDomains   = new Set(mapsBusinesses.filter(b => b.website).map(b => getDomain(b.website)));
      const uniqueWebLeads = webLeads.filter(l => l.website && !mapsDomains.has(getDomain(l.website)));

      setStep(1, "active");
      const totalToScan = mapsBusinesses.filter(b => b.website).length;
      setStatus(`Found ${mapsBusinesses.length + uniqueWebLeads.length} businesses — scanning websites…`);

      const leads: LeadResult[] = [];

      for (const b of mapsBusinesses.filter(b => !b.website)) {
        leads.push({ ...b, emails: [], whatsapp: [], contactPageFound: false });
      }

      const withWebsite = mapsBusinesses.filter(b => b.website);
      for (let i = 0; i < withWebsite.length; i++) {
        const business = withWebsite[i];
        setStatus(`Scanning ${i + 1}/${totalToScan}: ${business.name}`);
        setProgress(20 + Math.round(((i + 1) / totalToScan) * 65));
        try {
          const { data: contactData } = await supabase.functions.invoke("extract-contacts", {
            body: { url: business.website },
          });
          leads.push({ ...business, emails: contactData?.emails || [], whatsapp: contactData?.whatsapp || [], contactPageFound: contactData?.contactPageFound || false });
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
      setStep(2, "done");
      setResults(leads);
      setProgress(100);
      setStatus(`${leads.length} leads ready!`);
      toast({ title: "✅ Complete", description: `${leads.length} leads generated.` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An error occurred";
      setStatus(`Error: ${msg}`);
      setSteps(STEPS_INIT);
      toast({ title: "Error", description: msg, variant: "destructive" });
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to unlock intelligence";
      toast({ title: "Error", description: msg, variant: "destructive" });

      // Clear loading state
      const newResults = [...results];
      newResults[index].intelligenceLoading = false;
      setResults(newResults);
    }
  };

  const emailCount    = results?.reduce((acc, r) => acc + r.emails.length, 0) ?? 0;
  const whatsappCount = results?.reduce((acc, r) => acc + r.whatsapp.length, 0) ?? 0;

  return (
    <section id="tool" className="bg-[#030304] py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <Target className="h-3 w-3 text-[#F7931A]" />
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              Lead Generator
            </span>
          </div>
          <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Start Your <span className="gradient-text">Search</span>
          </h2>
          <p className="mt-4 text-[#94A3B8] text-lg">
            Enter a business type and location to extract leads instantly.
          </p>
        </div>

        {/* Auth loading */}
        {authLoading && !devBypass && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#F7931A]" />
          </div>
        )}

        {/* ── Locked state ── */}
        {!authLoading && !effectiveUser && (
          <div className="flex flex-col items-center gap-6 rounded-2xl p-12 text-center bg-[#0F1115] border border-white/10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F7931A]/10 border border-[#F7931A]/30">
              <Lock className="h-7 w-7 text-[#F7931A]" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-semibold text-white mb-2">
                Sign in to generate leads
              </h3>
              <p className="text-[#94A3B8] text-sm max-w-sm mx-auto">
                Create a free account or sign in to start searching Google Maps and the web for business contacts.
              </p>
            </div>
            <button
              className="btn-btc px-8 py-3.5 font-mono-data text-xs font-bold uppercase tracking-widest text-white"
              onClick={onOpenAuth}
            >
              Sign In / Sign Up Free
            </button>
            {/* Blurred preview */}
            <div className="w-full rounded-xl overflow-hidden relative mt-2 border border-white/10 bg-[#030304]">
              <div className="absolute inset-0 bg-[#030304]/70 backdrop-blur-sm z-10 rounded-xl" />
              <div className="grid grid-cols-3 gap-2 p-4 pointer-events-none select-none opacity-40">
                {["Business Name", "Email", "Phone"].map(h => (
                  <div key={h} className="h-6 rounded-lg bg-white/10 text-[10px] flex items-center justify-center text-[#94A3B8] font-mono-data font-bold uppercase tracking-wider">{h}</div>
                ))}
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-5 rounded-lg bg-white/5" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Signed-in tool ── */}
        {(devBypass || (!authLoading && effectiveUser)) && (<>

          {/* Search Form Panel */}
          <div className="mb-6 rounded-2xl bg-[#0F1115] border border-white/10 p-6 relative overflow-hidden">
            {/* Orange corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#F7931A]/30 rounded-tl-2xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#F7931A]/30 rounded-br-2xl" />

            <div className="space-y-5">
              {/* Keyword + Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="keyword">Business Keyword</FieldLabel>
                  <DarkInput
                    id="keyword"
                    placeholder='"plumber", "dentist"'
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={isProcessing}
                    icon={Search}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="location">Location</FieldLabel>
                  <DarkInput
                    id="location"
                    placeholder='"Miami, FL", "London, UK"'
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isProcessing}
                    icon={MapPin}
                  />
                </div>
              </div>

              {/* Radius + Max results */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="radius">
                    Radius (km) <span className="text-white/20 normal-case font-normal">(optional)</span>
                  </FieldLabel>
                  <DarkInput
                    id="radius"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="max-results">
                    Max Results: <span className="text-[#F7931A]">{maxResults}</span>
                  </FieldLabel>
                  <div className="flex gap-2">
                    {[20, 40, 60].map((v) => (
                      <button
                        key={v}
                        onClick={() => setMaxResults(v)}
                        disabled={isProcessing}
                        className={`flex-1 rounded-lg py-3 font-mono-data text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                          maxResults === v
                            ? "bg-gradient-to-r from-[#EA580C] to-[#F7931A] text-white shadow-[0_0_16px_rgba(247,147,26,0.3)]"
                            : "bg-white/5 border border-white/10 text-[#94A3B8] hover:border-[#F7931A]/30"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="btn-btc w-full flex items-center justify-center gap-2.5 py-4 font-mono-data text-sm font-bold uppercase tracking-widest text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                ) : (
                  <><Search className="h-4 w-4" /> Generate Leads</>
                )}
              </button>
            </div>
          </div>

          {/* ── Progress Panel ── */}
          {(isProcessing || (results && progress > 0)) && (
            <div className="mb-6 rounded-2xl bg-[#0F1115] border border-white/10 p-5">
              {/* Step indicators */}
              <div className="flex items-center justify-between mb-5">
                {STEPS_INIT.map((step, i) => {
                  const current = steps[i];
                  return (
                    <div key={step.label} className="flex items-center gap-1.5 flex-1">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full font-mono-data text-xs font-bold flex-shrink-0 transition-all duration-300"
                        style={
                          current.status === "done"
                            ? { background: "linear-gradient(to right, #EA580C, #F7931A)", color: "#ffffff", boxShadow: "0 0 16px rgba(247,147,26,0.4)" }
                            : current.status === "active"
                            ? { background: "transparent", color: "#F7931A", border: "2px solid #F7931A", boxShadow: "0 0 12px rgba(247,147,26,0.3)" }
                            : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.1)" }
                        }
                      >
                        {current.status === "done" ? "✓" : i + 1}
                      </div>
                      <span
                        className="font-mono-data text-[10px] font-bold hidden sm:inline uppercase tracking-wider transition-colors"
                        style={{ color: current.status === "done" ? "#F7931A" : current.status === "active" ? "#ffffff" : "rgba(255,255,255,0.2)" }}
                      >
                        {step.label}
                      </span>
                      {i < STEPS_INIT.length - 1 && (
                        <ChevronRight className="h-3.5 w-3.5 text-white/20 mx-1 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status + percentage */}
              <div className="flex items-center justify-between font-mono-data text-sm mb-2">
                <span className="text-[#94A3B8] truncate max-w-[75%] text-xs uppercase tracking-wider">{status}</span>
                <span className="font-bold text-[#F7931A]">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#EA580C] to-[#F7931A] transition-all duration-300"
                  style={{ width: `${progress}%`, boxShadow: "0 0 10px rgba(247,147,26,0.5)" }}
                />
              </div>
            </div>
          )}

          {/* ── Results Panel ── */}
          {results && !isProcessing && (
            <div className="rounded-2xl bg-[#0F1115] border border-white/10 overflow-hidden">
              {/* Summary header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-black/30">
                <div className="flex gap-4 font-mono-data text-xs font-bold uppercase tracking-wider">
                  <span className="text-white">{results.length} businesses</span>
                  <span className="flex items-center gap-1 text-[#94A3B8]">
                    <Mail className="h-3 w-3" /> {emailCount} emails
                  </span>
                  <span className="flex items-center gap-1 text-[#94A3B8]">
                    <Phone className="h-3 w-3" /> {whatsappCount} WhatsApp
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyEmails}
                    disabled={emailCount === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono-data text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border border-white/10 bg-white/5 hover:border-[#F7931A]/30 hover:text-white transition-all disabled:opacity-40"
                  >
                    {emailsCopied ? (
                      <><CheckCheck className="h-3.5 w-3.5 text-emerald-400" />Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" />Copy Emails</>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="btn-btc flex items-center gap-1.5 px-3.5 py-2 font-mono-data text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ borderRadius: "8px" }}
                  >
                    <Download className="h-3.5 w-3.5" />Download XLSX
                  </button>
                </div>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0F1115] border-b border-white/10">
                    <tr>
                      {["Business", "Phone", "Email", "Website", userProfile ? "Intelligence" : ""].filter(Boolean).map(h => (
                        <th key={h} className="px-4 py-3 text-left font-mono-data text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {results.map((r, i) => (
                      <tr
                        key={r.placeId || i}
                        className="transition-colors hover:bg-[#F7931A]/5"
                        style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent" }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-heading font-medium text-white truncate max-w-[180px]">{r.name}</p>
                          {r.category && (
                            <p className="font-mono-data text-[9px] text-[#94A3B8] capitalize mt-0.5 uppercase tracking-wider">{r.category.replace(/_/g, " ")}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono-data text-xs text-[#94A3B8] whitespace-nowrap">
                          {r.phone || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.emails.length > 0 ? (
                            <div className="space-y-0.5">
                              {r.emails.slice(0, 2).map((e) => (
                                <p key={e} className="font-mono-data text-xs text-[#F7931A] truncate max-w-[200px]">{e}</p>
                              ))}
                              {r.emails.length > 2 && (
                                <p className="font-mono-data text-[9px] text-[#94A3B8]">+{r.emails.length - 2} more</p>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono-data text-xs text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.website ? (
                            <a
                              href={r.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono-data text-xs text-[#94A3B8] hover:text-[#F7931A] transition-colors"
                            >
                              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="font-mono-data text-xs text-white/20">—</span>
                          )}
                        </td>
                        {userProfile && (
                          <td className="px-4 py-3">
                            {r.intelligenceLoading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-[#F7931A]" />
                                <span className="font-mono-data text-[9px] text-[#94A3B8]">Analyzing…</span>
                              </div>
                            ) : r.intelligence ? (
                              <div className="space-y-2">
                                {/* Intelligence card - click to expand */}
                                <div className="bg-gradient-to-r from-[#EA580C]/10 to-[#F7931A]/10 border border-[#F7931A]/30 rounded-lg p-3 hover:border-[#F7931A]/50 transition-all cursor-default">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <TrendingUp className="h-3.5 w-3.5 text-[#F7931A]" />
                                      <span className="font-mono-data font-bold text-[#F7931A]">{r.intelligence.opportunityScore}/100</span>
                                    </div>
                                  </div>
                                  <div className="mt-2 space-y-1 text-[9px]">
                                    <p className="text-[#94A3B8]"><span className="font-semibold text-white">Maturity:</span> {r.intelligence.businessMaturity}</p>
                                    <p className="text-[#94A3B8]"><span className="font-semibold text-white">Pitch:</span> {r.intelligence.suggestedPitchAngle}</p>
                                    {r.intelligence.detectedIssues.length > 0 && (
                                      <p className="text-[#94A3B8]"><span className="font-semibold text-white">{r.intelligence.detectedIssues.length} issues</span></p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : r.website ? (
                              <button
                                onClick={() => handleUnlockIntelligence(i)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#F7931A]/40 bg-[#F7931A]/10 hover:bg-[#F7931A]/20 transition-all"
                              >
                                <Lock className="h-3 w-3 text-[#F7931A]" />
                                <span className="font-mono-data text-[9px] font-bold uppercase tracking-wider text-[#F7931A]">Unlock</span>
                              </button>
                            ) : (
                              <span className="font-mono-data text-xs text-white/20">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>)}
      </div>
    </section>
  );
};

export default LeadGeneratorSection;
