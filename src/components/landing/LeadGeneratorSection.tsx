import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, Loader2, MapPin } from "lucide-react";
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

const LeadGeneratorSection = () => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("");
  const [maxResults, setMaxResults] = useState("60");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<LeadResult[] | null>(null);

  const handleGenerate = async () => {
    if (!keyword.trim() || !location.trim()) {
      toast({ title: "Missing fields", description: "Please enter a keyword and location.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setProgress(0);
    setStatus("Searching businesses...");

    try {
      const { data: searchData, error: searchError } = await supabase.functions.invoke("search-places", {
        body: { keyword: keyword.trim(), location: location.trim(), radius: radius ? Number(radius) : undefined, maxResults: Number(maxResults) || 60 },
      });

      if (searchError || !searchData?.success) {
        throw new Error(searchData?.error || searchError?.message || "Failed to search businesses");
      }

      const businesses: Business[] = searchData.businesses;
      setStatus(`Found ${businesses.length} businesses. Scanning websites...`);
      setProgress(20);

      const leads: LeadResult[] = [];
      const withWebsite = businesses.filter((b) => b.website);
      const withoutWebsite = businesses.filter((b) => !b.website);

      for (const b of withoutWebsite) {
        leads.push({ ...b, emails: [], whatsapp: [], contactPageFound: false });
      }

      for (let i = 0; i < withWebsite.length; i++) {
        const business = withWebsite[i];
        setStatus(`Scanning website ${i + 1}/${withWebsite.length}: ${business.name}`);
        setProgress(20 + Math.round(((i + 1) / withWebsite.length) * 70));

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

      setResults(leads);
      setProgress(100);
      setStatus(`Done! ${leads.length} leads ready for download.`);
      toast({ title: "Complete", description: `${leads.length} leads generated successfully.` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An error occurred";
      setStatus(`Error: ${msg}`);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!results) return;

    const headers = ["Business Name", "Category", "Address", "Phone (Maps)", "Website", "Email", "WhatsApp", "Contact Page Found"];

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
      fill: { fgColor: { rgb: "E8630A" }, patternType: "solid" as const },
      alignment: { horizontal: "center" as const, vertical: "center" as const },
      border: { bottom: { style: "thin" as const, color: { rgb: "C2530A" } } },
    };

    const cellStyle = {
      font: { sz: 10, name: "Calibri" },
      alignment: { vertical: "center" as const, wrapText: true },
      border: { bottom: { style: "thin" as const, color: { rgb: "E5E7EB" } } },
    };

    const altRowStyle = {
      ...cellStyle,
      fill: { fgColor: { rgb: "FFF7ED" }, patternType: "solid" as const },
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
    XLSX.writeFile(wb, `leads-${keyword}-${location}.xlsx`);
  };

  return (
    <section id="tool" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Lead Generator</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start Your Search
          </h2>
          <p className="mt-3 text-muted-foreground">Enter a business type and location to extract leads instantly.</p>
        </div>

        <Card className="mb-8 border border-border bg-card p-6 shadow-xl shadow-primary/5">
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyword" className="mb-1.5 block text-sm font-medium">Business keyword</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="keyword" placeholder='"plumber", "dentist", "restaurant"' value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9" disabled={isProcessing} />
              </div>
            </div>

            <div>
              <Label htmlFor="location" className="mb-1.5 block text-sm font-medium">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="location" placeholder='"Miami, FL", "London, UK"' value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9" disabled={isProcessing} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="radius" className="mb-1.5 block text-sm font-medium">
                  Radius (km) <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="radius" type="number" placeholder="50" min="1" value={radius} onChange={(e) => setRadius(e.target.value)} disabled={isProcessing} />
              </div>
              <div>
                <Label htmlFor="maxResults" className="mb-1.5 block text-sm font-medium">
                  Max results <span className="text-muted-foreground">(20–60)</span>
                </Label>
                <Input id="maxResults" type="number" min="20" max="60" step="20" value={maxResults} onChange={(e) => setMaxResults(e.target.value)} disabled={isProcessing} />
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isProcessing} className="w-full font-semibold" size="lg">
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : (
                "Generate Leads"
              )}
            </Button>
          </div>
        </Card>

        {(isProcessing || results) && (
          <Card className="mb-8 border border-border bg-card p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status}</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </Card>
        )}

        {results && !isProcessing && (
          <Card className="border border-border bg-card p-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} leads with {results.filter((r) => r.emails.length > 0).length} emails found
            </p>
            <Button onClick={handleDownload} size="lg" variant="default" className="font-semibold">
              <Download className="mr-2 h-4 w-4" />
              Download XLSX
            </Button>
          </Card>
        )}
      </div>
    </section>
  );
};

export default LeadGeneratorSection;
