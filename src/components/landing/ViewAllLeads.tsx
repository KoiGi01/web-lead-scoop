import { useState, useEffect } from "react";
import { Loader2, Mail, Phone, Globe, ExternalLink, Copy, CheckCheck, Download, Linkedin, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import XLSX from "xlsx-js-style";

interface SavedLead {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  emails: string[];
  whatsapp: string[];
  linkedinUrl?: string;
  contact_page_found: boolean;
  intelligence?: any;
  created_at: string;
}

interface ViewAllLeadsProps {
  userId: string | undefined;
  onBackToSearch: () => void;
}

const ViewAllLeads = ({ userId, onBackToSearch }: ViewAllLeadsProps) => {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "emails" | "score">("name");
  const [filterByEmail, setFilterByEmail] = useState(false);
  const [emailsCopied, setEmailsCopied] = useState(false);

  // Fetch all leads on mount
  useEffect(() => {
    if (userId) {
      fetchAllLeads();
    }
  }, [userId]);

  const fetchAllLeads = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_leads")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Error fetching leads:", err);
      toast({ title: "Error", description: "Failed to load leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmails = () => {
    const emails = sortedResults.flatMap((r) => r.emails).filter(Boolean);
    navigator.clipboard.writeText(emails.join("\n")).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 2000);
      toast({ title: "Copied!", description: `${emails.length} email(s) copied to clipboard.` });
    });
  };

  const handleDownload = () => {
    const headers = ["Business Name", "Category", "Address", "Phone", "Website", "Email", "WhatsApp", "LinkedIn", "Contact Page"];
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
    const rows = sortedResults.map((r) => [
      r.name, r.category, r.address, r.phone, r.website,
      r.emails.join(", "), r.whatsapp.join(", "), r.linkedinUrl || "", r.contact_page_found ? "Yes" : "No",
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
    XLSX.utils.book_append_sheet(wb, ws, "All Leads");
    XLSX.writeFile(wb, `GlobaLeads22-All-Leads.xlsx`);
  };

  // Filter and sort
  const filteredResults = leads.filter(r => !filterByEmail || r.emails.length > 0);
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "emails") return (b.emails.length) - (a.emails.length);
    if (sortBy === "score") {
      const scoreA = a.intelligence?.opportunityScore ?? -1;
      const scoreB = b.intelligence?.opportunityScore ?? -1;
      return scoreB - scoreA;
    }
    return 0;
  });

  const emailCount = sortedResults.reduce((acc, r) => acc + r.emails.length, 0);
  const whatsappCount = sortedResults.reduce((acc, r) => acc + r.whatsapp.length, 0);

  return (
    <section id="tool" className="bg-[#030304] py-16 sm:py-24 flex-1 flex flex-col">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 flex flex-col flex-1">

        {/* Header */}
        <div className="mb-10">
          <button
            onClick={onBackToSearch}
            className="mb-4 flex items-center gap-2 font-mono-data text-[10px] font-bold uppercase tracking-widest text-[#F7931A] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </button>
          <div className="text-center">
            <h2 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Your <span className="gradient-text">Leads</span>
            </h2>
            <p className="mt-4 text-[#94A3B8] text-lg">
              All leads from your searches in one place.
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-[#F7931A]" />
          </div>
        )}

        {/* Empty state */}
        {!loading && leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 flex-1 text-center">
            <p className="text-[#94A3B8] text-base">No leads found. Run a search to get started!</p>
          </div>
        )}

        {/* Content */}
        {!loading && leads.length > 0 && (
          <div className="rounded-2xl bg-[#0F1115] border border-white/10 overflow-hidden flex flex-col flex-1">

            {/* Summary + Controls */}
            <div className="px-5 py-4 border-b border-white/10 bg-black/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-4 font-mono-data text-xs font-bold uppercase tracking-wider">
                  <span className="text-white">{sortedResults.length} results</span>
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

              {/* Filter + Sort Controls */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-mono-data text-[9px] text-[#94A3B8] uppercase tracking-wider">Sort:</span>
                <div className="flex gap-1.5">
                  {["name", "emails", "score"].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSortBy(opt as typeof sortBy)}
                      className={`px-2.5 py-1.5 rounded-lg font-mono-data text-[9px] font-bold uppercase tracking-wider transition-all ${
                        sortBy === opt
                          ? "bg-gradient-to-r from-[#EA580C] to-[#F7931A] text-white shadow-[0_0_12px_rgba(247,147,26,0.3)]"
                          : "bg-white/5 border border-white/10 text-[#94A3B8] hover:border-[#F7931A]/30"
                      }`}
                    >
                      {opt === "name" ? "Name" : opt === "emails" ? "Emails" : "Score"}
                    </button>
                  ))}
                </div>

                <span className="ml-auto font-mono-data text-[9px] text-[#94A3B8] uppercase tracking-wider">Filter:</span>
                <button
                  onClick={() => setFilterByEmail(!filterByEmail)}
                  className={`px-2.5 py-1.5 rounded-lg font-mono-data text-[9px] font-bold uppercase tracking-wider transition-all ${
                    filterByEmail
                      ? "bg-gradient-to-r from-[#EA580C] to-[#F7931A] text-white shadow-[0_0_12px_rgba(247,147,26,0.3)]"
                      : "bg-white/5 border border-white/10 text-[#94A3B8] hover:border-[#F7931A]/30"
                  }`}
                >
                  <Mail className="h-3 w-3 inline mr-1" />Has Email
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0F1115] border-b border-white/10">
                  <tr>
                    {["Business", "Phone", "Email", "Website", "LinkedIn"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono-data text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sortedResults.map((r, i) => (
                    <tr
                      key={r.id}
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
                      <td className="px-4 py-3">
                        {r.linkedinUrl ? (
                          <a
                            href={r.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono-data text-xs text-[#0A66C2] hover:text-[#004182] transition-colors"
                          >
                            <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[100px]">Profile</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="font-mono-data text-xs text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ViewAllLeads;
