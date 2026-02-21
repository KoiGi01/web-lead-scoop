import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Search, Download, Loader2, MapPin, Copy, CheckCheck,
  Mail, Phone, Globe, ExternalLink, ChevronRight, Lock,
  Target,
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

interface LeadResult extends Business {
  emails: string[];
  whatsapp: string[];
  contactPageFound: boolean;
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

/* Input field with industrial recessed styling */
const IndustrialInput = ({
  id, placeholder, value, onChange, disabled, icon: Icon, type = "text", min,
}: {
  id: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; icon?: React.ComponentType<{ className?: string }>; type?: string; min?: string;
}) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#babecc] pointer-events-none" />}
    <input
      id={id}
      type={type}
      min={min}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full rounded-xl h-12 px-4 font-mono-data text-sm text-[#2d3436] placeholder:text-[#babecc] outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:ring-2 focus:ring-[#ff4757]/40"
      style={{
        background: "#d1d9e6",
        boxShadow: "var(--shadow-recessed)",
        paddingLeft: Icon ? "2.5rem" : "1rem",
        border: "1px solid transparent",
      }}
    />
  </div>
);

/* Label with industrial stamp look */
const StampLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label
    htmlFor={htmlFor}
    className="block mb-2 font-mono-data text-[10px] font-bold uppercase tracking-widest text-[#4a5568]"
  >
    {children}
  </label>
);

const LeadGeneratorSection = ({ onOpenAuth, devBypass }: LeadGeneratorSectionProps) => {
  const { user, loading: authLoading } = useAuth();
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
      fill: { fgColor: { rgb: "FF4757" }, patternType: "solid" as const },
      alignment: { horizontal: "center" as const, vertical: "center" as const },
      border: { bottom: { style: "thin" as const, color: { rgb: "CC0011" } } },
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

  const emailCount    = results?.reduce((acc, r) => acc + r.emails.length, 0) ?? 0;
  const whatsappCount = results?.reduce((acc, r) => acc + r.whatsapp.length, 0) ?? 0;

  return (
    <section id="tool" className="bg-[#e0e5ec] py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-10 text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
            style={{ boxShadow: "var(--shadow-recessed)" }}
          >
            <Target className="h-3 w-3 text-[#ff4757]" />
            <span className="font-mono-data text-[10px] font-bold uppercase tracking-[0.12em] text-[#4a5568]">
              Lead Generator
            </span>
          </div>
          <h2
            className="text-4xl font-bold tracking-tight text-[#2d3436] sm:text-5xl"
            style={{ textShadow: "0 1px 0 #ffffff" }}
          >
            Start Your Search
          </h2>
          <p className="mt-4 text-[#4a5568] text-lg">
            Enter a business type and location to extract leads instantly.
          </p>
        </div>

        {/* Auth loading */}
        {authLoading && !devBypass && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff4757]" />
          </div>
        )}

        {/* ── Locked state ── */}
        {!authLoading && !effectiveUser && (
          <div
            className="flex flex-col items-center gap-6 rounded-2xl p-12 text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ boxShadow: "var(--shadow-recessed)" }}
            >
              <Lock className="h-7 w-7 text-[#babecc]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#2d3436] mb-2" style={{ textShadow: "0 1px 0 #ffffff" }}>
                Sign in to generate leads
              </h3>
              <p className="text-[#4a5568] text-sm max-w-sm mx-auto">
                Create a free account or sign in to start searching Google Maps and the web for business contacts.
              </p>
            </div>
            <button
              className="btn-press px-8 py-3.5 rounded-xl font-mono-data text-xs font-bold uppercase tracking-widest text-white bg-[#ff4757]"
              style={{ boxShadow: "4px 4px 10px rgba(166,50,60,0.4), -2px -2px 8px rgba(255,100,110,0.3)", border: "1px solid rgba(255,255,255,0.2)" }}
              onClick={onOpenAuth}
            >
              Sign In / Sign Up Free
            </button>
            {/* Blurred preview */}
            <div className="w-full rounded-xl overflow-hidden relative mt-2" style={{ boxShadow: "var(--shadow-recessed)", background: "#d1d9e6" }}>
              <div className="absolute inset-0 bg-[#e0e5ec]/70 backdrop-blur-sm z-10 rounded-xl" />
              <div className="grid grid-cols-3 gap-2 p-4 pointer-events-none select-none opacity-60">
                {["Business Name", "Email", "Phone"].map(h => (
                  <div key={h} className="h-6 rounded-lg bg-[#babecc] text-[10px] flex items-center justify-center text-[#4a5568] font-mono-data font-bold uppercase tracking-wider">{h}</div>
                ))}
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-5 rounded-lg bg-[#babecc]/60" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Signed-in tool ── */}
        {(devBypass || (!authLoading && effectiveUser)) && (<>

          {/* Search Form Panel */}
          <div
            className="mb-6 rounded-2xl bg-[#e0e5ec] p-6 relative overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {/* Corner screws */}
            <span className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full opacity-40" style={{ background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full opacity-40" style={{ background: "radial-gradient(circle at 65% 35%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
            <span className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full opacity-40" style={{ background: "radial-gradient(circle at 35% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />
            <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full opacity-40" style={{ background: "radial-gradient(circle at 65% 65%, rgba(255,255,255,0.9) 1px, rgba(0,0,0,0.2) 2.5px, transparent 5px)" }} />

            <div className="space-y-5">
              {/* Keyword + Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <StampLabel htmlFor="keyword">Business Keyword</StampLabel>
                  <IndustrialInput
                    id="keyword"
                    placeholder='"plumber", "dentist"'
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={isProcessing}
                    icon={Search}
                  />
                </div>
                <div>
                  <StampLabel htmlFor="location">Location</StampLabel>
                  <IndustrialInput
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
                  <StampLabel htmlFor="radius">
                    Radius (km) <span className="text-[#babecc] normal-case font-normal">(optional)</span>
                  </StampLabel>
                  <IndustrialInput
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
                  <StampLabel htmlFor="max-results">
                    Max Results: <span className="text-[#ff4757]">{maxResults}</span>
                  </StampLabel>
                  <div className="flex gap-2">
                    {[20, 40, 60].map((v) => (
                      <button
                        key={v}
                        onClick={() => setMaxResults(v)}
                        disabled={isProcessing}
                        className="flex-1 rounded-xl py-3 font-mono-data text-xs font-bold uppercase tracking-wider transition-all btn-press"
                        style={
                          maxResults === v
                            ? { background: "#ff4757", color: "#ffffff", boxShadow: "4px 4px 8px rgba(166,50,60,0.3), -2px -2px 6px rgba(255,100,110,0.2)", border: "1px solid rgba(255,255,255,0.15)" }
                            : { boxShadow: "var(--shadow-recessed)", background: "#d1d9e6", color: "#4a5568" }
                        }
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
                className="btn-press w-full flex items-center justify-center gap-2.5 rounded-xl py-4 font-mono-data text-sm font-bold uppercase tracking-widest text-white bg-[#ff4757] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                style={{ boxShadow: "4px 4px 10px rgba(166,50,60,0.4), -2px -2px 8px rgba(255,100,110,0.3)", border: "1px solid rgba(255,255,255,0.2)" }}
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
            <div
              className="mb-6 rounded-2xl bg-[#e0e5ec] p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
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
                            ? { background: "#ff4757", color: "#ffffff", boxShadow: "var(--shadow-floating)" }
                            : current.status === "active"
                            ? { background: "#e0e5ec", color: "#ff4757", boxShadow: "var(--shadow-floating)", border: "2px solid #ff4757" }
                            : { background: "#d1d9e6", color: "#babecc", boxShadow: "var(--shadow-recessed)" }
                        }
                      >
                        {current.status === "done" ? "✓" : i + 1}
                      </div>
                      <span
                        className="font-mono-data text-[10px] font-bold hidden sm:inline uppercase tracking-wider transition-colors"
                        style={{ color: current.status === "done" ? "#ff4757" : current.status === "active" ? "#2d3436" : "#babecc" }}
                      >
                        {step.label}
                      </span>
                      {i < STEPS_INIT.length - 1 && (
                        <ChevronRight className="h-3.5 w-3.5 text-[#babecc] mx-1 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status + percentage */}
              <div className="flex items-center justify-between font-mono-data text-sm mb-2">
                <span className="text-[#4a5568] truncate max-w-[75%] text-xs uppercase tracking-wider">{status}</span>
                <span className="font-bold text-[#ff4757]">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 rounded-full overflow-hidden" style={{ boxShadow: "var(--shadow-recessed)", background: "#d1d9e6" }}>
                <div
                  className="h-full rounded-full bg-[#ff4757] transition-all duration-300"
                  style={{ width: `${progress}%`, boxShadow: "0 0 8px rgba(255,71,87,0.5)" }}
                />
              </div>
            </div>
          )}

          {/* ── Results Panel ── */}
          {results && !isProcessing && (
            <div
              className="rounded-2xl bg-[#e0e5ec] overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* Summary header */}
              <div
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#babecc]"
                style={{ background: "#d1d9e6", boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.06)" }}
              >
                <div className="flex gap-4 font-mono-data text-xs font-bold uppercase tracking-wider">
                  <span className="text-[#2d3436]">{results.length} businesses</span>
                  <span className="flex items-center gap-1 text-[#4a5568]">
                    <Mail className="h-3 w-3" /> {emailCount} emails
                  </span>
                  <span className="flex items-center gap-1 text-[#4a5568]">
                    <Phone className="h-3 w-3" /> {whatsappCount} WhatsApp
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyEmails}
                    disabled={emailCount === 0}
                    className="btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono-data text-[10px] font-bold uppercase tracking-wider text-[#4a5568] disabled:opacity-40"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    {emailsCopied ? (
                      <><CheckCheck className="h-3.5 w-3.5 text-emerald-600" />Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" />Copy Emails</>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="btn-press flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono-data text-[10px] font-bold uppercase tracking-wider text-white bg-[#ff4757]"
                    style={{ boxShadow: "4px 4px 8px rgba(166,50,60,0.3), -2px -2px 6px rgba(255,100,110,0.2)" }}
                  >
                    <Download className="h-3.5 w-3.5" />Download XLSX
                  </button>
                </div>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead
                    className="sticky top-0"
                    style={{ background: "#d1d9e6", boxShadow: "0 1px 0 #babecc" }}
                  >
                    <tr>
                      {["Business", "Phone", "Email", "Website"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-mono-data text-[9px] font-bold uppercase tracking-widest text-[#4a5568]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#babecc]/40">
                    {results.map((r, i) => (
                      <tr
                        key={r.placeId || i}
                        className="transition-colors"
                        style={{ background: i % 2 === 1 ? "#d1d9e6" : "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,71,87,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 1 ? "#d1d9e6" : "transparent")}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#2d3436] truncate max-w-[180px]">{r.name}</p>
                          {r.category && (
                            <p className="font-mono-data text-[9px] text-[#4a5568] capitalize mt-0.5 uppercase tracking-wider">{r.category.replace(/_/g, " ")}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono-data text-xs text-[#4a5568] whitespace-nowrap">
                          {r.phone || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.emails.length > 0 ? (
                            <div className="space-y-0.5">
                              {r.emails.slice(0, 2).map((e) => (
                                <p key={e} className="font-mono-data text-xs text-[#ff4757] truncate max-w-[200px]">{e}</p>
                              ))}
                              {r.emails.length > 2 && (
                                <p className="font-mono-data text-[9px] text-[#4a5568]">+{r.emails.length - 2} more</p>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono-data text-xs text-[#babecc]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.website ? (
                            <a
                              href={r.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono-data text-xs text-[#4a5568] hover:text-[#ff4757] transition-colors"
                            >
                              <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="font-mono-data text-xs text-[#babecc]">—</span>
                          )}
                        </td>
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
