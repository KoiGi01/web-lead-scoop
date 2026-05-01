import { useState, useEffect } from "react";
import { Loader2, Mail, Phone, Globe, ExternalLink, Copy, CheckCheck, Download, Linkedin, ArrowLeft, Lock, Zap, Search, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEMO_USER_ID } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "@/hooks/use-toast";
import XLSX from "xlsx-js-style";
import { Button } from "@/components/ui/button";

interface SavedLead {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  emails: string[];
  whatsapp: string[];
  contacts?: DecisionMakerContact[];
  linkedinUrl?: string;
  contact_page_found: boolean;
  intelligence?: any;
  created_at: string;
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

interface ViewAllLeadsProps {
  userId: string | undefined;
  onBackToSearch: () => void;
}

const ViewAllLeads = ({ userId, onBackToSearch }: ViewAllLeadsProps) => {
  const { user } = useAuth();
  const { profile: userProfile } = useUserProfile(user?.id);
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "emails" | "score">("name");
  const [filterByEmail, setFilterByEmail] = useState(false);
  const [emailsCopied, setEmailsCopied] = useState(false);
  // Smart filtering state
  const [filterText, setFilterText] = useState("");
  const [filterByPhone, setFilterByPhone] = useState(false);
  const [filterByWebsite, setFilterByWebsite] = useState(false);
  const [filterByLinkedIn, setFilterByLinkedIn] = useState(false);
  const [filterByIntelligence, setFilterByIntelligence] = useState(false);
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());

  const getTopContact = (lead: SavedLead) =>
    [...(lead.contacts || [])].sort((a, b) => (b.decisionMakerScore || 0) - (a.decisionMakerScore || 0))[0];

  // Fetch all leads on mount
  useEffect(() => {
    if (userId) {
      fetchAllLeads();
    }
  }, [userId]);

  const fetchAllLeads = async () => {
    if (!userId) return;
    setLoading(true);
    if (userId === DEMO_USER_ID) {
      setLeads([
        {
          id: "demo-lead-1",
          name: "Clínica Almeida & Silva",
          address: "Av. da Liberdade, Lisbon, Portugal",
          phone: "+351 21 000 1001",
          website: "https://almeidasilva.example",
          category: "dental_clinic",
          emails: ["growth@almeidasilva.example", "hello@almeidasilva.example"],
          whatsapp: ["+351 91 000 1001"],
          contacts: [{ fullName: "Maria Almeida", title: "Head of Growth", email: "growth@almeidasilva.example", source: "hunter", decisionMakerScore: 88, decisionMakerReason: "healthcare title fit" }],
          linkedinUrl: "https://linkedin.com/company/almeida-silva",
          contact_page_found: true,
          intelligence: {
            opportunityScore: 94,
            businessMaturity: "Premium multi-location practice",
            positioning: "High-value clinic with multilingual site and visible booking flow",
            detectedIssues: ["No automated follow-up", "Weak local landing pages"],
            opportunitySummary: "Strong fit for outbound growth because the site already signals premium intent.",
            suggestedPitchAngle: "Increase booked consults from international patients",
            outreachHook: "Your English/Portuguese positioning is strong, but the booking flow leaks follow-up opportunities.",
          },
          created_at: new Date().toISOString(),
        },
        {
          id: "demo-lead-2",
          name: "Sorriso Premium Dental",
          address: "Rua Garrett, Lisbon, Portugal",
          phone: "+351 21 000 1002",
          website: "https://sorrisopremium.example",
          category: "cosmetic_dentistry",
          emails: ["contact@sorrisopremium.example"],
          whatsapp: [],
          contacts: [{ fullName: "Ana Sorriso", title: "Practice Manager", email: "contact@sorrisopremium.example", source: "hunter", decisionMakerScore: 74, decisionMakerReason: "healthcare title fit" }],
          linkedinUrl: "",
          contact_page_found: true,
          intelligence: {
            opportunityScore: 88,
            businessMaturity: "Established practice",
            positioning: "Cosmetic-first positioning with visible team and services",
            detectedIssues: ["Generic contact page"],
            opportunitySummary: "Good candidate for conversion-focused landing pages and retargeting.",
            suggestedPitchAngle: "Turn cosmetic traffic into qualified consults",
            outreachHook: "Your cosmetic pages have strong intent, but the contact path asks visitors to do too much work.",
          },
          created_at: new Date().toISOString(),
        },
        {
          id: "demo-lead-3",
          name: "DentaLab Estoril",
          address: "Estoril, Cascais, Portugal",
          phone: "",
          website: "https://dentalab.example",
          category: "dental_lab",
          emails: ["info@dentalab.example"],
          whatsapp: ["+351 91 000 1003"],
          contacts: [],
          linkedinUrl: "https://linkedin.com/company/dentalab-estoril",
          contact_page_found: true,
          intelligence: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("saved_leads")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads((data || []).map((lead: any) => ({
        ...lead,
        emails: Array.isArray(lead.emails) ? lead.emails : [],
        whatsapp: Array.isArray(lead.whatsapp) ? lead.whatsapp : [],
        contacts: Array.isArray(lead.contacts) ? lead.contacts : [],
      })));
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

  const handleCopyField = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKeys(prev => new Set(prev).add(key));
      setTimeout(() => setCopiedKeys(prev => {
        const next = new Set(prev); next.delete(key); return next;
      }), 2000);
    });
  };

  const handleDownload = () => {
    const headers = ["Business Name", "Category", "Address", "Phone", "Website", "Email", "WhatsApp", "LinkedIn", "Likely Decision Maker", "Decision Maker Title", "Decision Maker Email", "Decision Maker LinkedIn", "Decision Maker Source", "Contact Page"];
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
    const rows = sortedResults.map((r) => {
      const contact = getTopContact(r);
      return [
        r.name, r.category, r.address, r.phone, r.website,
        r.emails.join(", "), r.whatsapp.join(", "), r.linkedinUrl || "",
        contact?.fullName || "", contact?.title || "", contact?.email || "", contact?.linkedinUrl || "", contact?.source || "",
        r.contact_page_found ? "Yes" : "No",
      ];
    });
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

  // Filter and sort — multi-predicate filtering
  const filteredResults = leads.filter(r => {
    if (filterByEmail && r.emails.length === 0) return false;
    if (filterByPhone && !r.phone) return false;
    if (filterByWebsite && !r.website) return false;
    if (filterByLinkedIn && !r.linkedinUrl) return false;
    if (filterByIntelligence && !r.intelligence) return false;
    if (filterScoreMin > 0 && (r.intelligence?.opportunityScore ?? 0) < filterScoreMin) return false;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      const contact = getTopContact(r);
      const contactText = [contact?.fullName, contact?.title, contact?.email].filter(Boolean).join(" ");
      if (!r.name.toLowerCase().includes(q) && !r.address.toLowerCase().includes(q) && !r.emails.join(" ").toLowerCase().includes(q) && !contactText.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sortedResults = [...filteredResults].sort((a, b) => {
    const contactDelta = (getTopContact(b)?.decisionMakerScore || 0) - (getTopContact(a)?.decisionMakerScore || 0);
    if (contactDelta !== 0) return contactDelta;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "emails") return (b.emails.length) - (a.emails.length);
    if (sortBy === "score") return ((b.intelligence?.opportunityScore ?? -1) - (a.intelligence?.opportunityScore ?? -1));
    return 0;
  });

  const emailCount = sortedResults.reduce((acc, r) => acc + r.emails.length, 0);
  const whatsappCount = sortedResults.reduce((acc, r) => acc + r.whatsapp.length, 0);
  const activeFilterCount = [filterByEmail, filterByPhone, filterByWebsite, filterByLinkedIn, filterByIntelligence, filterScoreMin > 0, filterText.trim() !== ""].filter(Boolean).length;
  const totalResultCount = leads.length;
  const websiteCount = sortedResults.filter(r => r.website).length;
  const scoredLeads = sortedResults.filter(r => r.intelligence);
  const averageScore = scoredLeads.length
    ? Math.round(scoredLeads.reduce((acc, r) => acc + (r.intelligence?.opportunityScore ?? 0), 0) / scoredLeads.length)
    : "-";

  return (
    <section id="tool" className="flex flex-1 flex-col bg-black py-8 text-[#EFEDE6]">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-5 border-b border-[#EFEDE6]/[0.14] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              onClick={onBackToSearch}
              className="mb-5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#A8A59C] transition-colors hover:text-[#F5FF3D]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </button>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-[#F5FF3D]">Saved intelligence</p>
            <h2 className="font-display text-5xl font-black leading-[0.95] tracking-[-0.04em] text-[#EFEDE6]">
              Lead Archive
            </h2>
            <p className="mt-4 max-w-2xl text-base text-[#A8A59C]">
              Every saved search result, ready to filter, copy, score, and export.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#F5FF3D]" />
          </div>
        )}

        {!loading && leads.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] py-20 text-center">
            <Archive className="mb-4 h-10 w-10 text-[#67645B]" />
            <p className="font-display text-2xl font-bold text-[#EFEDE6]">No leads saved yet.</p>
            <p className="mt-2 text-sm text-[#A8A59C]">Run a search and your archive will start filling up.</p>
          </div>
        )}

        {!loading && leads.length > 0 && (
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] sm:grid-cols-5">
              {[
                ["Visible", sortedResults.length],
                ["Total", totalResultCount],
                ["Emails", emailCount],
                ["Websites", websiteCount],
                ["Avg score", averageScore],
              ].map(([label, value]) => (
                <div key={String(label)} className="border-b border-r border-[#EFEDE6]/10 p-4 last:border-r-0 sm:border-b-0">
                  <p className="font-mono text-2xl font-black tabular-nums text-[#EFEDE6]">{value}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{label}</p>
                </div>
              ))}
            </div>

            <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Sort</span>
                  {["name", "emails", "score"].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSortBy(opt as typeof sortBy)}
                      className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                        sortBy === opt
                          ? "border-[#F5FF3D] bg-[#F5FF3D] text-black"
                          : "border-[#EFEDE6]/10 text-[#A8A59C] hover:border-[#F5FF3D]/50 hover:text-[#EFEDE6]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#67645B]" />
                    <input
                      type="text"
                      placeholder="Search archive..."
                      value={filterText}
                      onChange={e => setFilterText(e.target.value)}
                      className="h-10 w-full border border-[#EFEDE6]/10 bg-black pl-9 pr-3 font-mono text-xs text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70 sm:w-64"
                    />
                  </div>
                  <button
                    onClick={handleCopyEmails}
                    disabled={emailCount === 0}
                    className="border border-[#EFEDE6]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6] hover:border-[#F5FF3D] disabled:opacity-30"
                  >
                    {emailsCopied ? "Copied emails" : "Copy emails"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="border border-[#F5FF3D] bg-[#F5FF3D] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#FFFE7A]"
                  >
                    Export XLSX
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  { key: "email", label: "Has email", icon: Mail, active: filterByEmail, toggle: () => setFilterByEmail(v => !v) },
                  { key: "phone", label: "Has phone", icon: Phone, active: filterByPhone, toggle: () => setFilterByPhone(v => !v) },
                  { key: "website", label: "Has site", icon: Globe, active: filterByWebsite, toggle: () => setFilterByWebsite(v => !v) },
                  { key: "linkedin", label: "LinkedIn", icon: Linkedin, active: filterByLinkedIn, toggle: () => setFilterByLinkedIn(v => !v) },
                  ...(userProfile ? [{ key: "intel", label: "Has intel", icon: Zap, active: filterByIntelligence, toggle: () => setFilterByIntelligence(v => !v) }] : []),
                ] as { key: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean; toggle: () => void }[]).map(f => (
                  <button
                    key={f.key}
                    onClick={f.toggle}
                    className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                      f.active
                        ? "border-[#F5FF3D] bg-[#F5FF3D] text-black"
                        : "border-[#EFEDE6]/10 text-[#A8A59C] hover:border-[#F5FF3D]/50 hover:text-[#EFEDE6]"
                    }`}
                  >
                    <f.icon className="h-3 w-3" /> {f.label}
                  </button>
                ))}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setFilterByEmail(false);
                      setFilterByPhone(false);
                      setFilterByWebsite(false);
                      setFilterByLinkedIn(false);
                      setFilterByIntelligence(false);
                      setFilterScoreMin(0);
                      setFilterText("");
                    }}
                    className="border border-red-400/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-400/10"
                  >
                    Clear {activeFilterCount}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-x-auto border border-[#EFEDE6]/[0.14] bg-black">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead className="sticky top-0 bg-[#0A0A0A]">
                  <tr className="border-b border-[#EFEDE6]/10">
                    {["Business", "Channels", "Actions", "Website", "LinkedIn", userProfile ? "Intel" : ""].filter(Boolean).map(h => (
                      <th key={h} className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[#67645B]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEDE6]/10">
                  {sortedResults.map((r, i) => (
                    <tr key={r.id} className="animate-row-in align-top transition-colors hover:bg-[#EFEDE6]/[0.03]" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                      <td className="px-4 py-4">
                        <p className="max-w-[220px] truncate font-display text-sm font-semibold text-[#EFEDE6]">{r.name}</p>
                        {r.category && <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{r.category.replace(/_/g, " ")}</p>}
                        <p className="mt-2 max-w-[240px] truncate text-xs text-[#A8A59C]">{r.address || "No address listed"}</p>
                        {getTopContact(r) && (
                          <div className="mt-3 border border-[#EFEDE6]/10 bg-black p-2">
                            <p className="font-mono text-[9px] uppercase tracking-widest text-[#67645B]">Likely decision maker</p>
                            <p className="mt-1 max-w-[220px] truncate text-xs font-semibold text-[#EFEDE6]">{getTopContact(r)?.fullName || getTopContact(r)?.email}</p>
                            {getTopContact(r)?.title && <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-[#A8A59C]">{getTopContact(r)?.title}</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="mb-2 flex gap-1.5">
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
                        <p className="font-mono text-[11px] text-[#A8A59C]">{r.phone || "-"}</p>
                        {r.emails[0] && <p className="mt-1 max-w-[220px] truncate font-mono text-[11px] text-[#F5FF3D]">{r.emails[0]}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          {r.emails.length > 0 && (
                            <button onClick={() => handleCopyField(`${r.id}-email`, r.emails[0])} title="Copy email" className="border border-[#EFEDE6]/10 p-1.5 text-[#A8A59C] hover:border-[#F5FF3D] hover:text-[#F5FF3D]">
                              {copiedKeys.has(`${r.id}-email`) ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                          {r.phone && (
                            <button onClick={() => handleCopyField(`${r.id}-phone`, r.phone)} title="Copy phone" className="border border-[#EFEDE6]/10 p-1.5 text-[#A8A59C] hover:border-[#F5FF3D] hover:text-[#F5FF3D]">
                              {copiedKeys.has(`${r.id}-phone`) ? <CheckCheck className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                            </button>
                          )}
                          {r.emails.length > 0 && (
                            <a href={`mailto:${r.emails[0]}`} title="Open in email client" className="border border-[#EFEDE6]/10 p-1.5 text-[#A8A59C] hover:border-[#F5FF3D] hover:text-[#F5FF3D]">
                              <Mail className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {r.website ? (
                          <a href={r.website} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[220px] items-center gap-1.5 truncate font-mono text-[11px] text-[#A8A59C] hover:text-[#EFEDE6]">
                            <Globe className="h-3.5 w-3.5" />
                            <span className="truncate">{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span className="font-mono text-[11px] text-[#67645B]">-</span>}
                      </td>
                      <td className="px-4 py-4">
                        {r.linkedinUrl ? (
                          <a href={r.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#0A66C2] hover:text-[#4A9BE8]">
                            <Linkedin className="h-3.5 w-3.5" /> Profile <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span className="font-mono text-[11px] text-[#67645B]">-</span>}
                      </td>
                      {userProfile && (
                        <td className="px-4 py-4">
                          {r.intelligence ? (
                            <div className="max-w-[220px]">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xl font-black text-[#F5FF3D]">{r.intelligence.opportunityScore ?? 0}</span>
                                <div className="h-1.5 w-28 bg-[#EFEDE6]/10">
                                  <div className="h-full bg-[#F5FF3D]" style={{ width: `${r.intelligence.opportunityScore ?? 0}%` }} />
                                </div>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-[#A8A59C]">{r.intelligence.positioning}</p>
                            </div>
                          ) : <span className="font-mono text-[11px] text-[#67645B]">-</span>}
                        </td>
                      )}
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

  return (
    <section id="tool" className="bg-petrol-950 py-16 sm:py-24 flex-1 flex flex-col">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 flex flex-col flex-1">

        {/* Header */}
        <div className="mb-10">
          <button
            onClick={onBackToSearch}
            className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-wine-500 hover:text-cream-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </button>
          <div className="text-center">
            <h2 className="font-heading text-4xl font-bold tracking-tight text-cream-100 sm:text-5xl">
              Your <span className="gradient-text">Leads</span>
            </h2>
            <p className="mt-4 text-cream-300 text-lg">
              All leads from your searches in one place.
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-wine-500" />
          </div>
        )}

        {/* Empty state */}
        {!loading && leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 flex-1 text-center">
            <p className="text-cream-300 text-base">No leads found. Run a search to get started!</p>
          </div>
        )}

        {/* Content */}
        {!loading && leads.length > 0 && (
          <div className="rounded-2xl bg-petrol-800 border border-cream-100/10 overflow-hidden flex flex-col flex-1">

            {/* Summary + Controls */}
            <div className="px-5 py-4 border-b border-cream-100/10 bg-black/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-4 font-mono text-xs font-bold uppercase tracking-wider">
                  <span className="text-cream-100">{sortedResults.length} results</span>
                  <span className="flex items-center gap-1 text-cream-300">
                    <Mail className="h-3 w-3" /> {emailCount} emails
                  </span>
                  <span className="flex items-center gap-1 text-cream-300">
                    <Phone className="h-3 w-3" /> {whatsappCount} WhatsApp
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyEmails}
                    disabled={emailCount === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider text-cream-300 border border-cream-100/10 bg-cream-100/5 hover:border-wine-700/30 hover:text-cream-100 transition-all disabled:opacity-40"
                  >
                    {emailsCopied ? (
                      <><CheckCheck className="h-3.5 w-3.5 text-emerald-400" />Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" />Copy Emails</>
                    )}
                  </button>
                  <Button
                    variant="accent"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider"
                    onClick={handleDownload}
                    style={{ borderRadius: "8px" }}
                  >
                    <Download className="h-3.5 w-3.5" />Download XLSX
                  </Button>
                </div>
              </div>

              {/* Row 1: Sort + Text Search */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-mono text-[9px] text-cream-300 uppercase tracking-wider">Sort:</span>
                <div className="flex gap-1.5">
                  {["name", "emails", "score"].map(opt => (
                    <button key={opt} onClick={() => setSortBy(opt as typeof sortBy)}
                      className={`px-2.5 py-1.5 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider transition-all ${sortBy === opt ? "bg-wine-700 text-cream-50" : "bg-cream-100/5 border border-cream-100/10 text-cream-300 hover:border-wine-700/30"}`}>
                      {opt === "name" ? "Name" : opt === "emails" ? "Emails" : "Score"}
                    </button>
                  ))}
                </div>
                <div className="ml-auto">
                  <input type="text" placeholder="Search leads..." value={filterText} onChange={e => setFilterText(e.target.value)}
                    className="h-7 w-44 bg-petrol-900/60 border border-cream-100/10 rounded-lg px-3 text-cream-100 text-xs placeholder:text-cream-100/30 outline-none focus:border-wine-700/50 font-mono" />
                </div>
              </div>

              {/* Row 2: Filter pills + Score threshold + Clear */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {([
                  { key: "email", label: "Has Email", icon: Mail, active: filterByEmail, toggle: () => setFilterByEmail(v => !v) },
                  { key: "phone", label: "Has Phone", icon: Phone, active: filterByPhone, toggle: () => setFilterByPhone(v => !v) },
                  { key: "website", label: "Has Site", icon: Globe, active: filterByWebsite, toggle: () => setFilterByWebsite(v => !v) },
                  { key: "linkedin", label: "LinkedIn", icon: Linkedin, active: filterByLinkedIn, toggle: () => setFilterByLinkedIn(v => !v) },
                  ...(userProfile ? [{ key: "intel", label: "Has Intel", icon: Zap, active: filterByIntelligence, toggle: () => setFilterByIntelligence(v => !v) }] : []),
                ] as { key: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean; toggle: () => void }[]).map(f => (
                  <button key={f.key} onClick={f.toggle}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider transition-all ${f.active ? "bg-wine-700 text-cream-50" : "bg-cream-100/5 border border-cream-100/10 text-cream-300 hover:border-wine-700/30"}`}>
                    <f.icon className="h-3 w-3" />{f.label}
                  </button>
                ))}

                {userProfile && (
                  <div className="flex items-center gap-1 ml-1">
                    <span className="font-mono text-[9px] text-cream-300 uppercase tracking-wider">Score≥</span>
                    {[0, 25, 50, 75].map(n => (
                      <button key={n} onClick={() => setFilterScoreMin(n)}
                        className={`px-2 py-1 rounded font-mono text-[9px] font-bold transition-all ${filterScoreMin === n ? "bg-wine-700 text-cream-50" : "bg-cream-100/5 border border-cream-100/10 text-cream-300 hover:border-wine-700/30"}`}>
                        {n === 0 ? "All" : n}
                      </button>
                    ))}
                  </div>
                )}

                <span className="font-mono text-[9px] text-cream-300 ml-auto">
                  {sortedResults.length}/{totalResultCount}
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setFilterByEmail(false);
                      setFilterByPhone(false);
                      setFilterByWebsite(false);
                      setFilterByLinkedIn(false);
                      setFilterByIntelligence(false);
                      setFilterScoreMin(0);
                      setFilterText("");
                    }}
                    className="px-2.5 py-1 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider text-red-400 border border-red-400/30 bg-red-400/10 hover:bg-red-400/20 transition-all">
                    Clear {activeFilterCount}
                  </button>
                )}
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-petrol-800 border-b border-cream-100/10">
                  <tr>
                    {["Business", "Phone", "Email", "Actions", "Website", "LinkedIn", userProfile ? "Intelligence" : ""].filter(Boolean).map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[9px] font-bold uppercase tracking-widest text-cream-300">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sortedResults.map((r, i) => (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-wine-700/5"
                      style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent" }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-heading font-medium text-cream-100 truncate max-w-[180px]">{r.name}</p>
                        {r.category && (
                          <p className="font-mono text-[9px] text-cream-300 capitalize mt-0.5 uppercase tracking-wider">{r.category.replace(/_/g, " ")}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-cream-300 whitespace-nowrap">
                        {r.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.emails.length > 0 ? (
                          <div className="space-y-0.5">
                            {r.emails.slice(0, 2).map((e) => (
                              <p key={e} className="font-mono text-xs text-wine-500 truncate max-w-[200px]">{e}</p>
                            ))}
                            {r.emails.length > 2 && (
                              <p className="font-mono text-[9px] text-cream-300">+{r.emails.length - 2} more</p>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-cream-100/20">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.website ? (
                          <a
                            href={r.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-xs text-cream-300 hover:text-wine-500 transition-colors"
                          >
                            <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-cream-100/20">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.linkedinUrl ? (
                          <a
                            href={r.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-mono text-xs text-[#0A66C2] hover:text-[#004182] transition-colors"
                          >
                            <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[100px]">Profile</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-cream-100/20">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {r.emails.length > 0 && (
                            <button
                              onClick={() => handleCopyField(`${r.id}-email`, r.emails[0])}
                              title="Copy email"
                              className="p-1.5 rounded-md bg-cream-100/5 border border-cream-100/10 hover:border-wine-700/40 hover:bg-wine-700/10 transition-all"
                            >
                              {copiedKeys.has(`${r.id}-email`) ? (
                                <CheckCheck className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3 text-cream-300" />
                              )}
                            </button>
                          )}
                          {r.phone && (
                            <button
                              onClick={() => handleCopyField(`${r.id}-phone`, r.phone)}
                              title="Copy phone"
                              className="p-1.5 rounded-md bg-cream-100/5 border border-cream-100/10 hover:border-wine-700/40 hover:bg-wine-700/10 transition-all"
                            >
                              {copiedKeys.has(`${r.id}-phone`) ? (
                                <CheckCheck className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Phone className="h-3 w-3 text-cream-300" />
                              )}
                            </button>
                          )}
                          {r.emails.length > 0 && (
                            <a
                              href={`mailto:${r.emails[0]}`}
                              title="Open in email client"
                              className="p-1.5 rounded-md bg-cream-100/5 border border-cream-100/10 hover:border-wine-700/40 hover:bg-wine-700/10 transition-all"
                            >
                              <Mail className="h-3 w-3 text-cream-300" />
                            </a>
                          )}
                          {!r.emails.length && !r.phone && (
                            <span className="font-mono text-xs text-cream-100/20">—</span>
                          )}
                        </div>
                      </td>
                      {userProfile && (
                        <td className="px-4 py-3">
                          {r.intelligence ? (
                            <div className="space-y-1.5 min-w-[160px]">
                              <div className="flex items-center gap-2 bg-wine-700/15 rounded-lg p-2 border border-wine-700/20">
                                <Zap className="h-3.5 w-3.5 text-wine-500 flex-shrink-0" />
                                <span className="font-mono text-xs font-bold text-wine-500">
                                  {r.intelligence.opportunityScore ?? 0}/100
                                </span>
                              </div>
                              <div className="text-[9px] text-cream-300 space-y-0.5">
                                <p><strong>Maturity:</strong> {r.intelligence.businessMaturity}</p>
                                <p><strong>Position:</strong> {r.intelligence.positioning}</p>
                                {r.intelligence.detectedIssues?.length > 0 && (
                                  <p><strong>Issues:</strong> {r.intelligence.detectedIssues.length}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-cream-100/20">—</span>
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
      </div>
    </section>
  );
};

export default ViewAllLeads;
