import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Download, Loader2, MapPin, Copy, CheckCheck,
  Mail, Phone, Globe, ExternalLink, ChevronRight, Sparkles,
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
  { label: "Scan Websites", status: "idle" },
  { label: "Compile Leads", status: "idle" },
];

const LeadGeneratorSection = () => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("");
  const [maxResults, setMaxResults] = useState(40);
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<Step[]>(STEPS_INIT);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<LeadResult[] | null>(null);
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
      // Step 1 — run Google Maps + Web Search in parallel
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

      // Extract Maps businesses (required)
      const mapsData = mapsResult.status === "fulfilled" ? mapsResult.value.data : null;
      const mapsError = mapsResult.status === "fulfilled" ? mapsResult.value.error : mapsResult.reason;
      if (!mapsData?.success) {
        throw new Error(mapsData?.error || mapsError?.message || "Failed to search businesses");
      }
      const mapsBusinesses: Business[] = mapsData.businesses || [];

      // Extract Web leads (optional — don't fail if it errors)
      const webData = webResult.status === "fulfilled" ? webResult.value.data : null;
      const webLeads: LeadResult[] = webData?.success ? (webData.leads || []) : [];

      setStep(0, "done");
      setProgress(20);

      // Deduplicate: web leads whose domain already appears in Maps results get dropped
      const mapsDomains = new Set(
        mapsBusinesses.filter(b => b.website).map(b => getDomain(b.website))
      );
      const uniqueWebLeads = webLeads.filter(l => l.website && !mapsDomains.has(getDomain(l.website)));

      // Step 2 — scan Maps business websites for contact info
      setStep(1, "active");
      const totalToScan = mapsBusinesses.filter(b => b.website).length;
      setStatus(`Found ${mapsBusinesses.length + uniqueWebLeads.length} businesses — scanning websites…`);

      const leads: LeadResult[] = [];

      // Businesses without websites — add as-is
      for (const b of mapsBusinesses.filter(b => !b.website)) {
        leads.push({ ...b, emails: [], whatsapp: [], contactPageFound: false });
      }

      // Businesses with websites — extract contacts
      const withWebsite = mapsBusinesses.filter(b => b.website);
      for (let i = 0; i < withWebsite.length; i++) {
        const business = withWebsite[i];
        setStatus(`Scanning ${i + 1}/${totalToScan}: ${business.name}`);
        setProgress(20 + Math.round(((i + 1) / totalToScan) * 65));

        try {
          const { data: contactData } = await supabase.functions.invoke("extract-contacts", {
            body: { url: business.website },
          });
          leads.push({
            ...business,
            emails: contactData?.emails || [],
            whatsapp: contactData?.whatsapp || [],
            contactPageFound: contactData?.contactPageFound || false,
          });
        } catch {
          leads.push({ ...business, emails: [], whatsapp: [], contactPageFound: false });
        }
      }

      // Append deduplicated web leads
      leads.push(...uniqueWebLeads);

      setStep(1, "done");

      // Step 3
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
      fill: { fgColor: { rgb: "6366F1" }, patternType: "solid" as const },
      alignment: { horizontal: "center" as const, vertical: "center" as const },
      border: { bottom: { style: "thin" as const, color: { rgb: "4F46E5" } } },
    };

    const cellStyle = {
      font: { sz: 10, name: "Calibri" },
      alignment: { vertical: "center" as const, wrapText: true },
      border: { bottom: { style: "thin" as const, color: { rgb: "E5E7EB" } } },
    };

    const altRowStyle = {
      ...cellStyle,
      fill: { fgColor: { rgb: "EEF2FF" }, patternType: "solid" as const },
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

    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(h.length, ...rows.map((r) => String(r[i] || "").length));
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws["!cols"] = colWidths;
    ws["!rows"] = [{ hpt: 24 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `LeadScoop-${keyword}-${location}.xlsx`);
  };

  const emailCount = results?.reduce((acc, r) => acc + r.emails.length, 0) ?? 0;
  const whatsappCount = results?.reduce((acc, r) => acc + r.whatsapp.length, 0) ?? 0;

  return (
    <section id="tool" className="bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Lead Generator
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Start Your Search
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Enter a business type and location to extract leads instantly.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6 border border-border bg-card p-6 shadow-xl shadow-primary/5">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="keyword" className="mb-1.5 block text-sm font-medium">
                  Business keyword
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="keyword"
                    placeholder='"plumber", "dentist"'
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="pl-9"
                    disabled={isProcessing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location" className="mb-1.5 block text-sm font-medium">
                  Location
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder='"Miami, FL", "London, UK"'
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-9"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="radius" className="mb-1.5 block text-sm font-medium">
                  Radius (km) <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="radius"
                  type="number"
                  placeholder="50"
                  min="1"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  Max results: <span className="text-primary font-semibold">{maxResults}</span>
                </Label>
                <div className="flex gap-2 mt-2">
                  {[20, 40, 60].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMaxResults(v)}
                      disabled={isProcessing}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${maxResults === v
                        ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full font-semibold shadow-lg shadow-primary/20"
              size="lg"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
              ) : (
                <><Search className="mr-2 h-4 w-4" />Generate Leads</>
              )}
            </Button>
          </div>
        </Card>

        {/* Progress */}
        {(isProcessing || (results && progress > 0)) && (
          <Card className="mb-6 border border-border bg-card p-5">
            {/* Step indicators */}
            <div className="flex items-center justify-between mb-4">
              {STEPS_INIT.map((step, i) => {
                const current = steps[i];
                return (
                  <div key={step.label} className="flex items-center gap-1.5 flex-1">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 transition-all duration-300 ${current.status === "done"
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : current.status === "active"
                        ? "border-2 border-primary text-primary bg-primary/10"
                        : "border-2 border-border text-muted-foreground"
                      }`}>
                      {current.status === "done" ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline transition-colors ${current.status === "done" ? "text-primary" : current.status === "active" ? "text-foreground" : "text-muted-foreground"
                      }`}>
                      {step.label}
                    </span>
                    {i < STEPS_INIT.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-border mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground truncate max-w-[75%]">{status}</span>
              <span className="font-semibold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </Card>
        )}

        {/* Results */}
        {results && !isProcessing && (
          <Card className="border border-border bg-card overflow-hidden">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/50 px-5 py-3.5">
              <div className="flex gap-4 text-sm">
                <span className="font-semibold text-foreground">{results.length} businesses</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {emailCount} emails
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {whatsappCount} WhatsApp
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyEmails}
                  size="sm"
                  variant="outline"
                  disabled={emailCount === 0}
                  className="text-xs font-medium"
                >
                  {emailsCopied ? (
                    <><CheckCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />Copied!</>
                  ) : (
                    <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy Emails</>
                  )}
                </Button>
                <Button
                  onClick={handleDownload}
                  size="sm"
                  className="text-xs font-semibold shadow-sm shadow-primary/20"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />Download XLSX
                </Button>
              </div>
            </div>

            {/* Results table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r, i) => (
                    <tr key={r.placeId || i} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground truncate max-w-[180px]">{r.name}</p>
                        {r.category && (
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">{r.category.replace(/_/g, " ")}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {r.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.emails.length > 0 ? (
                          <div className="space-y-0.5">
                            {r.emails.slice(0, 2).map((e) => (
                              <p key={e} className="text-xs text-primary font-medium truncate max-w-[200px]">{e}</p>
                            ))}
                            {r.emails.length > 2 && (
                              <p className="text-xs text-muted-foreground">+{r.emails.length - 2} more</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.website ? (
                          <a
                            href={r.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
};

export default LeadGeneratorSection;
