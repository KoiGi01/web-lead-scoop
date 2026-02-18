import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, Loader2, MapPin, Target } from "lucide-react";
import * as XLSX from "xlsx";

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

const Index = () => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("");
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
      // Step 1: Search places
      const { data: searchData, error: searchError } = await supabase.functions.invoke("search-places", {
        body: { keyword: keyword.trim(), location: location.trim(), radius: radius ? Number(radius) : undefined },
      });

      if (searchError || !searchData?.success) {
        throw new Error(searchData?.error || searchError?.message || "Failed to search businesses");
      }

      const businesses: Business[] = searchData.businesses;
      setStatus(`Found ${businesses.length} businesses. Scanning websites...`);
      setProgress(20);

      // Step 2: Extract contacts from each business with a website
      const leads: LeadResult[] = [];
      const withWebsite = businesses.filter((b) => b.website);
      const withoutWebsite = businesses.filter((b) => !b.website);

      // Add businesses without websites immediately
      for (const b of withoutWebsite) {
        leads.push({ ...b, emails: [], whatsapp: [], contactPageFound: false });
      }

      // Process businesses with websites
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
          // Skip failed sites
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

    const rows = results.map((r) => ({
      "Business Name": r.name,
      Category: r.category,
      Address: r.address,
      "Phone (Maps)": r.phone,
      Website: r.website,
      Email: r.emails.join(", "),
      WhatsApp: r.whatsapp.join(", "),
      "Contact Page Found": r.contactPageFound ? "Yes" : "No",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key] || "").length)).toString().length + 5,
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `leads-${keyword}-${location}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Target className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Local Lead Extractor</h1>
          </div>
          <p className="text-muted-foreground">Find local businesses and extract their contact details</p>
        </div>

        {/* Form */}
        <Card className="mb-8 p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyword" className="mb-1.5 block text-sm font-medium">
                Business keyword
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="keyword"
                  placeholder='e.g. "plumber", "dentist", "restaurant"'
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
                  placeholder='e.g. "Miami, FL", "London, UK"'
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-9"
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="radius" className="mb-1.5 block text-sm font-medium">
                Radius in km <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="radius"
                type="number"
                placeholder="50"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <Button onClick={handleGenerate} disabled={isProcessing} className="w-full" size="lg">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Generate Leads"
              )}
            </Button>
          </div>
        </Card>

        {/* Progress */}
        {(isProcessing || results) && (
          <Card className="mb-8 p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status}</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </Card>
        )}

        {/* Download */}
        {results && !isProcessing && (
          <Card className="p-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} leads with {results.filter((r) => r.emails.length > 0).length} emails found
            </p>
            <Button onClick={handleDownload} size="lg" variant="default">
              <Download className="mr-2 h-4 w-4" />
              Download XLSX
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
