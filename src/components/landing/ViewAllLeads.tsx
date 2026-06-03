import { ComponentType, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CalendarClock,
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  Globe,
  LayoutGrid,
  List,
  Linkedin,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "@/hooks/use-toast";

type CrmStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
type CrmPriority = "low" | "normal" | "high";
type SortKey = "name" | "emails" | "score" | "follow_up";
type ArchiveViewMode = "list" | "board";
type DateFilter = "all" | "today" | "7d" | "30d" | "custom";
type ContactStateFilter = "all" | "contacted" | "not_contacted";

interface LeadIntelligence {
  opportunityScore?: number;
  positioning?: string;
  businessMaturity?: string;
  detectedIssues?: string[];
  opportunitySummary?: string;
  suggestedPitchAngle?: string;
  outreachHook?: string;
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

interface SavedLead {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  category: string;
  selected_service?: string | null;
  emails: string[];
  whatsapp: string[];
  contacts?: DecisionMakerContact[];
  linkedinUrl?: string;
  linkedin_url?: string | null;
  socialLinks?: string[];
  social_links?: unknown;
  contact_page_found: boolean;
  intelligence?: LeadIntelligence | null;
  crm_status: CrmStatus;
  crm_priority: CrmPriority;
  crm_notes: string;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  crm_updated_at: string | null;
  created_at: string;
}

type RawLead = Record<string, unknown> & Partial<SavedLead>;

type LeadWorkspaceMode = "inbox" | "pipeline" | "follow-ups";

interface ViewAllLeadsProps {
  userId: string | undefined;
  onBackToSearch?: () => void;
  mode?: LeadWorkspaceMode;
}

const statusOptions: { value: CrmStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const priorityOptions: { value: CrmPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

const statusTone: Record<CrmStatus, string> = {
  new: "border-slate-300 bg-slate-100 text-slate-700",
  contacted: "border-sky-300 bg-sky-100 text-sky-800",
  qualified: "border-[#DDFB1F] bg-[#F5FF3D] text-[#102B2F]",
  proposal: "border-violet-300 bg-violet-100 text-violet-800",
  won: "border-emerald-300 bg-emerald-100 text-emerald-800",
  lost: "border-red-300 bg-red-100 text-red-800",
};

const priorityTone: Record<CrmPriority, string> = {
  low: "border-slate-300 bg-slate-100 text-slate-700",
  normal: "border-cyan-200 bg-cyan-50 text-cyan-800",
  high: "border-[#DDFB1F] bg-[#F5FF3D] text-[#102B2F]",
};

const boardColumnTone: Record<CrmStatus, { shell: string; header: string; badge: string; accent: string }> = {
  new: {
    shell: "border-violet-200 bg-violet-50/90",
    header: "bg-violet-100/90 text-violet-900",
    badge: "bg-violet-600 text-white",
    accent: "border-violet-300",
  },
  contacted: {
    shell: "border-sky-200 bg-sky-50/90",
    header: "bg-sky-100/90 text-sky-900",
    badge: "bg-sky-600 text-white",
    accent: "border-sky-300",
  },
  qualified: {
    shell: "border-amber-200 bg-amber-50/90",
    header: "bg-amber-100/90 text-amber-950",
    badge: "bg-amber-500 text-black",
    accent: "border-amber-300",
  },
  proposal: {
    shell: "border-fuchsia-200 bg-fuchsia-50/90",
    header: "bg-fuchsia-100/90 text-fuchsia-950",
    badge: "bg-fuchsia-600 text-white",
    accent: "border-fuchsia-300",
  },
  won: {
    shell: "border-emerald-200 bg-emerald-50/90",
    header: "bg-emerald-100/90 text-emerald-950",
    badge: "bg-emerald-600 text-white",
    accent: "border-emerald-300",
  },
  lost: {
    shell: "border-slate-200 bg-slate-50/90",
    header: "bg-slate-100/90 text-slate-700",
    badge: "bg-slate-500 text-white",
    accent: "border-slate-300",
  },
};

const contactedStatuses: CrmStatus[] = ["contacted", "qualified", "proposal", "won", "lost"];
const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);
const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : "");
const normalizeCrmStatus = (value: unknown): CrmStatus =>
  statusOptions.some(option => option.value === value) ? value as CrmStatus : "new";
const normalizeCrmPriority = (value: unknown): CrmPriority =>
  priorityOptions.some(option => option.value === value) ? value as CrmPriority : "normal";

const ViewAllLeads = ({ userId, onBackToSearch, mode = "inbox" }: ViewAllLeadsProps) => {
  const { user } = useAuth();
  const { profile: userProfile } = useUserProfile(user?.id);
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingLeadIds, setSavingLeadIds] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [archiveViewMode, setArchiveViewMode] = useState<ArchiveViewMode>("list");
  const [sortBy, setSortBy] = useState<SortKey>("follow_up");
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDate, setFilterDate] = useState<DateFilter>("all");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [filterContactState, setFilterContactState] = useState<ContactStateFilter>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | CrmStatus>("all");
  const [filterPriority, setFilterPriority] = useState<"all" | CrmPriority>("all");
  const [filterByEmail, setFilterByEmail] = useState(false);
  const [filterByPhone, setFilterByPhone] = useState(false);
  const [filterByWebsite, setFilterByWebsite] = useState(false);
  const [filterByLinkedIn, setFilterByLinkedIn] = useState(false);
  const [filterByPersonName, setFilterByPersonName] = useState(false);
  const [filterByIntelligence, setFilterByIntelligence] = useState(false);
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<CrmStatus | null>(null);

  const getTopContact = (lead: SavedLead) =>
    [...(lead.contacts || [])].sort((a, b) => (b.decisionMakerScore || 0) - (a.decisionMakerScore || 0))[0];

  const getLeadPersonLabel = (lead: SavedLead) => {
    const topContact = getTopContact(lead);
    return topContact?.fullName || topContact?.email || "No person listed";
  };

  const mapLead = (lead: RawLead): SavedLead => ({
    ...lead,
    name: lead.name || "",
    address: lead.address || "",
    phone: lead.phone || "",
    website: lead.website || "",
    category: lead.category || "",
    selected_service: lead.selected_service || null,
    emails: asArray<string>(lead.emails),
    whatsapp: asArray<string>(lead.whatsapp),
    contacts: asArray<DecisionMakerContact>(lead.contacts),
    linkedinUrl: lead.linkedin_url || lead.linkedinUrl || "",
    socialLinks: asArray<string>(lead.social_links),
    crm_status: normalizeCrmStatus(lead.crm_status),
    crm_priority: normalizeCrmPriority(lead.crm_priority),
    crm_notes: lead.crm_notes || "",
    next_follow_up_at: lead.next_follow_up_at || null,
    last_contacted_at: lead.last_contacted_at || null,
    crm_updated_at: lead.crm_updated_at || null,
  });

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
      setLeads((data || []).map(mapLead));
    } catch (err) {
      console.error("Error fetching leads:", err);
      toast({ title: "Error", description: "Failed to load opportunities", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchAllLeads();
    // Archive refreshes when the authenticated archive owner changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    setArchiveViewMode(mode === "pipeline" ? "board" : "list");
    setFilterDueOnly(mode === "follow-ups");
    setSortBy("follow_up");
    setShowAdvancedFilters(false);
  }, [mode]);

  const patchLead = async (leadId: string, patch: Partial<Pick<SavedLead, "crm_status" | "crm_priority" | "crm_notes" | "next_follow_up_at" | "last_contacted_at">>) => {
    const previous = leads;
    const crm_updated_at = new Date().toISOString();
    setLeads(current => current.map(lead => lead.id === leadId ? { ...lead, ...patch, crm_updated_at } : lead));

    setSavingLeadIds(prev => new Set(prev).add(leadId));
    const payload = {
      ...patch,
      crm_updated_at,
      next_follow_up_at: patch.next_follow_up_at === "" ? null : patch.next_follow_up_at,
    };

    const { error } = await supabase
      .from("saved_leads")
      .update(payload)
      .eq("id", leadId)
      .eq("user_id", userId);

    setSavingLeadIds(prev => {
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });

    if (error) {
      console.error("Error updating lead CRM:", error);
      setLeads(previous);
      toast({ title: "CRM update failed", description: "Could not save that prospect update.", variant: "destructive" });
    }
  };

  const moveLeadToStatus = (leadId: string, crm_status: CrmStatus) => {
    const lead = leads.find(item => item.id === leadId);
    if (!lead || lead.crm_status === crm_status) return;

    setSelectedLeadId(leadId);
    patchLead(leadId, { crm_status });
  };

  const handlePipelineDrop = (crm_status: CrmStatus) => {
    if (draggedLeadId) moveLeadToStatus(draggedLeadId, crm_status);
    setDraggedLeadId(null);
    setDragOverStatus(null);
  };

  const markContacted = (lead: SavedLead) => {
    patchLead(lead.id, {
      crm_status: lead.crm_status === "new" ? "contacted" : lead.crm_status,
      last_contacted_at: new Date().toISOString(),
    });
  };

  const handleCopyField = (key: string, text: string, label = "Copied") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKeys(prev => new Set(prev).add(key));
      setTimeout(() => setCopiedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }), 2000);
      toast({ title: label, description: text });
    });
  };

  const isDue = (lead: SavedLead) => {
    if (!lead.next_follow_up_at) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(lead.next_follow_up_at) <= today;
  };

  const hasPersonName = (lead: SavedLead) =>
    (lead.contacts || []).some(contact => Boolean(
      contact.fullName?.trim() ||
      contact.firstName?.trim() ||
      contact.lastName?.trim()
    ));

  const isContactedLead = (lead: SavedLead) =>
    Boolean(lead.last_contacted_at) || contactedStatuses.includes(lead.crm_status);

  const isWithinCreatedDateFilter = (lead: SavedLead) => {
    if (filterDate === "all") return true;
    const createdAt = new Date(lead.created_at);
    if (Number.isNaN(createdAt.getTime())) return false;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    if (filterDate === "today") return createdAt >= todayStart;
    if (filterDate === "7d") return createdAt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (filterDate === "30d") return createdAt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const start = customDateStart ? new Date(`${customDateStart}T00:00:00`) : null;
    const end = customDateEnd ? new Date(`${customDateEnd}T23:59:59`) : null;
    if (start && createdAt < start) return false;
    if (end && createdAt > end) return false;
    return true;
  };

  const categoryOptions = useMemo(
    () => [...new Set(leads.map(lead => lead.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [leads],
  );

  const filteredResults = leads.filter(lead => {
    if (filterCategory !== "all" && lead.category !== filterCategory) return false;
    if (!isWithinCreatedDateFilter(lead)) return false;
    if (filterContactState === "contacted" && !isContactedLead(lead)) return false;
    if (filterContactState === "not_contacted" && isContactedLead(lead)) return false;
    if (filterStatus !== "all" && lead.crm_status !== filterStatus) return false;
    if (filterPriority !== "all" && lead.crm_priority !== filterPriority) return false;
    if (filterByEmail && lead.emails.length === 0) return false;
    if (filterByPhone && !lead.phone) return false;
    if (filterByWebsite && !lead.website) return false;
    if (filterByLinkedIn && !lead.linkedinUrl) return false;
    if (filterByPersonName && !hasPersonName(lead)) return false;
    if (filterByIntelligence && !lead.intelligence) return false;
    if (filterDueOnly && !isDue(lead)) return false;
    if (filterScoreMin > 0 && (lead.intelligence?.opportunityScore ?? 0) < filterScoreMin) return false;

    const q = filterText.trim().toLowerCase();
    if (!q) return true;
    const contactNames = (lead.contacts || [])
      .flatMap(contact => [contact.fullName, contact.firstName, contact.lastName, contact.title, contact.email])
      .filter(Boolean)
      .join(" ");
    const haystack = [
      lead.name,
      lead.selected_service,
      lead.address,
      lead.category,
      lead.phone,
      lead.website,
      lead.emails.join(" "),
      contactNames,
      lead.crm_status,
      lead.crm_priority,
      lead.crm_notes,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "follow_up") {
      const aTime = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
    }
    const contactDelta = (getTopContact(b)?.decisionMakerScore || 0) - (getTopContact(a)?.decisionMakerScore || 0);
    if (contactDelta !== 0) return contactDelta;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "emails") return b.emails.length - a.emails.length;
    if (sortBy === "score") return (b.intelligence?.opportunityScore ?? -1) - (a.intelligence?.opportunityScore ?? -1);
    return 0;
  });

  useEffect(() => {
    if (sortedResults.length === 0) {
      setSelectedLeadId(null);
      return;
    }
    if (!selectedLeadId || !sortedResults.some(lead => lead.id === selectedLeadId)) {
      setSelectedLeadId(sortedResults[0].id);
    }
  }, [selectedLeadId, sortedResults]);

  const selectedLead = sortedResults.find(lead => lead.id === selectedLeadId) || sortedResults[0] || null;
  const selectedContact = selectedLead ? getTopContact(selectedLead) : null;
  const emailCount = sortedResults.reduce((acc, lead) => acc + lead.emails.length, 0);
  const linkedInCount = sortedResults.filter(lead => lead.linkedinUrl).length;
  const personNameCount = sortedResults.filter(hasPersonName).length;
  const contactedCount = sortedResults.filter(isContactedLead).length;
  const notContactedCount = sortedResults.length - contactedCount;
  const leadsByStatus = statusOptions.map(option => ({
    ...option,
    leads: sortedResults.filter(lead => lead.crm_status === option.value),
  }));
  const activeFilterCount = [
    filterText.trim() !== "",
    filterCategory !== "all",
    filterDate !== "all",
    filterContactState !== "all",
    filterStatus !== "all",
    filterPriority !== "all",
    filterByEmail,
    filterByPhone,
    filterByWebsite,
    filterByLinkedIn,
    filterByPersonName,
    filterByIntelligence,
    filterDueOnly,
    filterScoreMin > 0,
  ].filter(Boolean).length;

  const handleCopyEmails = () => {
    const emails = sortedResults.flatMap(lead => lead.emails).filter(Boolean);
    navigator.clipboard.writeText(emails.join("\n")).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 2000);
      toast({ title: "Copied", description: `${emails.length} email(s) copied.` });
    });
  };

  const handleDownload = () => {
    const headers = [
      "Business Name", "Service Sold", "CRM Status", "Priority", "Next Follow-Up", "Last Contacted", "Notes",
      "Category", "Address", "Phone", "Website", "Email", "WhatsApp", "LinkedIn",
      "Likely Decision Maker", "Decision Maker Title", "Decision Maker Email", "Decision Maker Source", "Contact Page",
    ];
    const rows = sortedResults.map(lead => {
      const contact = getTopContact(lead);
      return [
        lead.name,
        lead.selected_service || "",
        lead.crm_status,
        lead.crm_priority,
        lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : "",
        lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : "",
        lead.crm_notes,
        lead.category,
        lead.address,
        lead.phone,
        lead.website,
        lead.emails.join(", "),
        lead.whatsapp.join(", "),
        lead.linkedinUrl || "",
        contact?.fullName || "",
        contact?.title || "",
        contact?.email || "",
        contact?.source || "",
        lead.contact_page_found ? "Yes" : "No",
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map((header, index) => ({
      wch: Math.min(Math.max(header.length, ...rows.map(row => String(row[index] || "").length)) + 2, 56),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Opportunity CRM");
    XLSX.writeFile(wb, "GlobaLeads22-Opportunity-CRM.xlsx");
  };

  const clearFilters = () => {
    setFilterText("");
    setFilterCategory("all");
    setFilterDate("all");
    setCustomDateStart("");
    setCustomDateEnd("");
    setFilterContactState("all");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterByEmail(false);
    setFilterByPhone(false);
    setFilterByWebsite(false);
    setFilterByLinkedIn(false);
    setFilterByPersonName(false);
    setFilterByIntelligence(false);
    setFilterDueOnly(false);
    setFilterScoreMin(0);
  };

  const filterButtonClass = (active: boolean) =>
    `inline-flex h-8 items-center gap-1.5 border px-2.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${
      active
        ? "border-[#F5FF3D] bg-[#F5FF3D] text-black"
        : "border-[#EFEDE6]/10 text-[#A8A59C] hover:border-[#F5FF3D]/50 hover:text-[#EFEDE6]"
    }`;

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
      active ? "border-[#DDFB1F] bg-[#F5FF3D] text-[#102B2F]" : "border-slate-300 bg-slate-100 text-slate-500"
    }`;

  const renderFilterToggle = (key: string, label: string, Icon: ComponentType<{ className?: string }>, active: boolean, toggle: () => void) => (
    <button key={key} onClick={toggle} className={filterButtonClass(active)}>
      <Icon className="h-3 w-3" /> {label}
    </button>
  );

  const pageMeta = {
    inbox: {
      kicker: "Opportunity Inbox",
      title: "Review opportunities",
      empty: "No opportunities saved yet.",
      emptyDescription: "Run a search and saved prospects will appear here with public contact evidence.",
      noMatch: "No opportunities match these filters.",
    },
    pipeline: {
      kicker: "Pipeline",
      title: "Sales pipeline",
      empty: "No pipeline opportunities yet.",
      emptyDescription: "Run a search and saved prospects will appear by CRM status.",
      noMatch: "No pipeline opportunities match these filters.",
    },
    "follow-ups": {
      kicker: "Follow-ups",
      title: "Due follow-ups",
      empty: "No follow-ups yet.",
      emptyDescription: "Add follow-up dates to prospects and they will appear here.",
      noMatch: "No follow-ups are due for these filters.",
    },
  }[mode];
  const effectiveArchiveViewMode = mode === "pipeline" ? "board" : archiveViewMode;

  return (
    <section id="tool" className="flex flex-1 flex-col overflow-hidden bg-black text-[#EFEDE6]">
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
        <div className="mb-3 flex flex-col gap-3 border-b border-[#EFEDE6]/[0.14] pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {onBackToSearch && (
              <button
                onClick={onBackToSearch}
                className="flex h-8 shrink-0 items-center gap-1.5 border border-[#EFEDE6]/10 px-2.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#A8A59C] transition-colors hover:border-[#F5FF3D]/50 hover:text-[#F5FF3D]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#F5FF3D]">{pageMeta.kicker}</p>
              <h2 className="truncate font-display text-2xl font-black leading-none tracking-[-0.04em] text-[#EFEDE6]">
                {pageMeta.title}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-center">
            {[
              ["Visible", sortedResults.length],
              ["Contacted", contactedCount],
              ["Open", notContactedCount],
              ["Emails", emailCount],
              ["People", personNameCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex h-8 min-w-[86px] items-center justify-between gap-2 border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] px-2.5">
                <p className="font-mono text-sm font-black tabular-nums text-[#EFEDE6]">{value}</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-[#67645B]">{label}</p>
              </div>
            ))}
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
            <p className="font-display text-2xl font-bold text-[#EFEDE6]">{pageMeta.empty}</p>
            <p className="mt-2 text-sm text-[#A8A59C]">{pageMeta.emptyDescription}</p>
          </div>
        )}

        {!loading && leads.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-2.5">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
                <div className="relative min-w-[260px] flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#67645B]" />
                  <input
                    type="text"
                    placeholder="Search opportunities, businesses, people, emails, notes..."
                    value={filterText}
                    onChange={event => setFilterText(event.target.value)}
                    className="h-8 w-full border border-[#EFEDE6]/10 bg-black pl-8 pr-3 font-mono text-[11px] text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={event => setFilterCategory(event.target.value)}
                  className="h-8 min-w-[190px] border border-[#EFEDE6]/10 bg-black px-2.5 font-mono text-[9px] uppercase tracking-widest text-[#A8A59C] outline-none focus:border-[#F5FF3D]/70"
                >
                  <option value="all">All industries</option>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>{category.replace(/_/g, " ")}</option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-1.5">
                  {mode !== "pipeline" && (
                    <div className="inline-grid grid-cols-2 border border-[#EFEDE6]/10">
                      <button
                        onClick={() => setArchiveViewMode("list")}
                        className={`inline-flex h-8 items-center gap-1.5 px-2.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${archiveViewMode === "list" ? "bg-[#F5FF3D] text-black" : "text-[#A8A59C] hover:text-[#EFEDE6]"}`}
                      >
                        <List className="h-3 w-3" /> List
                      </button>
                      <button
                        onClick={() => setArchiveViewMode("board")}
                        className={`inline-flex h-8 items-center gap-1.5 px-2.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${archiveViewMode === "board" ? "bg-[#F5FF3D] text-black" : "text-[#A8A59C] hover:text-[#EFEDE6]"}`}
                      >
                        <LayoutGrid className="h-3 w-3" /> Board
                      </button>
                    </div>
                  )}
                  {renderFilterToggle("not-contacted", "Not contacted", Phone, filterContactState === "not_contacted", () => setFilterContactState(filterContactState === "not_contacted" ? "all" : "not_contacted"))}
                  {renderFilterToggle("phone", "Phone", Phone, filterByPhone, () => setFilterByPhone(value => !value))}
                  {renderFilterToggle("email", "Email", Mail, filterByEmail, () => setFilterByEmail(value => !value))}
                  {renderFilterToggle("person", "Person", UserRound, filterByPersonName, () => setFilterByPersonName(value => !value))}
                  <button onClick={() => setShowAdvancedFilters(value => !value)} className={filterButtonClass(showAdvancedFilters || activeFilterCount > 0)}>
                    <SlidersHorizontal className="h-3.5 w-3.5" /> More {activeFilterCount > 0 ? activeFilterCount : ""}
                  </button>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="inline-flex h-8 items-center gap-1.5 border border-red-400/30 px-2.5 font-mono text-[9px] uppercase tracking-widest text-red-300 hover:bg-red-400/10">
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {showAdvancedFilters && (
                <div className="mt-3 grid gap-3 border-t border-[#EFEDE6]/10 pt-3 lg:grid-cols-4">
                  <select value={filterDate} onChange={event => setFilterDate(event.target.value as DateFilter)} className="h-9 border border-[#EFEDE6]/10 bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] outline-none focus:border-[#F5FF3D]/70">
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="custom">Custom range</option>
                  </select>
                  <select value={filterContactState} onChange={event => setFilterContactState(event.target.value as ContactStateFilter)} className="h-9 border border-[#EFEDE6]/10 bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] outline-none focus:border-[#F5FF3D]/70">
                    <option value="all">All contact states</option>
                    <option value="contacted">Contacted</option>
                    <option value="not_contacted">Not contacted</option>
                  </select>
                  <select value={filterStatus} onChange={event => setFilterStatus(event.target.value as "all" | CrmStatus)} className="h-9 border border-[#EFEDE6]/10 bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] outline-none focus:border-[#F5FF3D]/70">
                    <option value="all">All pipeline statuses</option>
                    {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select value={filterPriority} onChange={event => setFilterPriority(event.target.value as "all" | CrmPriority)} className="h-9 border border-[#EFEDE6]/10 bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] outline-none focus:border-[#F5FF3D]/70">
                    <option value="all">All priorities</option>
                    {priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {filterDate === "custom" && (
                    <>
                      <input type="date" value={customDateStart} onChange={event => setCustomDateStart(event.target.value)} className="h-9 border border-[#EFEDE6]/10 bg-black px-3 font-mono text-[10px] text-[#A8A59C] outline-none focus:border-[#F5FF3D]/70" />
                      <input type="date" value={customDateEnd} onChange={event => setCustomDateEnd(event.target.value)} className="h-9 border border-[#EFEDE6]/10 bg-black px-3 font-mono text-[10px] text-[#A8A59C] outline-none focus:border-[#F5FF3D]/70" />
                    </>
                  )}
                  <div className="flex flex-wrap gap-2 lg:col-span-4">
                    {renderFilterToggle("site", "Website", Globe, filterByWebsite, () => setFilterByWebsite(value => !value))}
                    {renderFilterToggle("linkedin", "LinkedIn", Linkedin, filterByLinkedIn, () => setFilterByLinkedIn(value => !value))}
                    {renderFilterToggle("due", "Follow-up due", CalendarClock, filterDueOnly, () => setFilterDueOnly(value => !value))}
                    {userProfile && renderFilterToggle("intel", "Has intel", Zap, filterByIntelligence, () => setFilterByIntelligence(value => !value))}
                    {userProfile && (
                      <div className="flex items-center gap-1 border border-[#EFEDE6]/10 px-2 py-1">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Score</span>
                        {[0, 50, 75].map(value => (
                          <button key={value} onClick={() => setFilterScoreMin(value)} className={filterButtonClass(filterScoreMin === value)}>
                            {value === 0 ? "All" : value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={`grid min-h-0 flex-1 gap-4 ${mode === "pipeline" ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_420px]"}`}>
              <div className={`min-h-0 overflow-y-auto border border-[#EFEDE6]/[0.14] ${mode === "pipeline" ? "bg-[#F6F3EA]" : "bg-black"}`}>
                {sortedResults.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center">
                    <Search className="mb-4 h-9 w-9 text-[#67645B]" />
                    <p className="font-display text-xl font-bold text-[#EFEDE6]">{pageMeta.noMatch}</p>
                    <p className="mt-2 text-sm text-[#A8A59C]">Clear filters or widen the criteria.</p>
                    <button onClick={clearFilters} className="mt-5 border border-[#F5FF3D] bg-[#F5FF3D] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black">
                      Clear filters
                    </button>
                  </div>
                ) : effectiveArchiveViewMode === "board" ? (
                  <div className="flex h-full gap-4 overflow-x-auto p-4">
                    {leadsByStatus.map(column => {
                      const tone = boardColumnTone[column.value];

                      const isDropTarget = dragOverStatus === column.value;

                      return (
                      <section
                        key={column.value}
                        onDragOver={event => {
                          event.preventDefault();
                          if (dragOverStatus !== column.value) setDragOverStatus(column.value);
                        }}
                        onDragLeave={event => {
                          const nextTarget = event.relatedTarget as Node | null;
                          if (!nextTarget || !event.currentTarget.contains(nextTarget)) setDragOverStatus(null);
                        }}
                        onDrop={event => {
                          event.preventDefault();
                          handlePipelineDrop(column.value);
                        }}
                        className={`flex min-w-[286px] max-w-[320px] flex-1 overflow-hidden rounded-lg border shadow-sm transition-all ${tone.shell} ${isDropTarget ? "scale-[1.01] ring-2 ring-black/20" : ""}`}
                      >
                        <div className="flex min-h-0 w-full flex-col">
                          <div className={`sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-3 py-2.5 ${tone.header} ${tone.accent}`}>
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`inline-flex h-6 items-center gap-1 rounded-md px-2 font-display text-xs font-bold ${tone.badge}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                                {column.label}
                              </span>
                              <span className="font-mono text-xs font-bold tabular-nums opacity-70">{column.leads.length}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-70">
                              <MoreHorizontal className="h-4 w-4" />
                              <Plus className="h-4 w-4" />
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                          {column.leads.length === 0 ? (
                            <div className={`flex min-h-[120px] items-center justify-center rounded-md border border-dashed px-3 text-center transition-colors ${isDropTarget ? "border-black/25 bg-white/70" : "border-black/10 bg-white/35"}`}>
                              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{isDropTarget ? "Drop to move here" : "No opportunities"}</p>
                            </div>
                          ) : (
                            column.leads.map(lead => {
                              const personLabel = getLeadPersonLabel(lead);
                              const selected = lead.id === selectedLead?.id;
                              const isDragging = draggedLeadId === lead.id;
                              return (
                                <article
                                  key={lead.id}
                                  draggable
                                  onDragStart={event => {
                                    setDraggedLeadId(lead.id);
                                    event.dataTransfer.effectAllowed = "move";
                                    event.dataTransfer.setData("text/plain", lead.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedLeadId(null);
                                    setDragOverStatus(null);
                                  }}
                                  className={`rounded-md border bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.12)] ${selected ? `${tone.accent} ring-2 ring-black/10` : "border-slate-200"} ${isDragging ? "scale-[0.98] cursor-grabbing opacity-45" : "cursor-grab"}`}
                                >
                                  <button onClick={() => setSelectedLeadId(lead.id)} className="block w-full text-left">
                                    <p className="truncate font-display text-sm font-bold leading-snug text-slate-950">{personLabel}</p>
                                    <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest text-slate-500">{lead.category.replace(/_/g, " ") || "No industry"}</p>
                                    {lead.selected_service && <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest text-amber-600">{lead.selected_service}</p>}
                                    <p className="mt-2 truncate text-xs font-semibold text-slate-700">{lead.name || "No company name"}</p>
                                  </button>

                                  {savingLeadIds.has(lead.id) && (
                                    <div className="mt-2 flex justify-end">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                    </div>
                                  )}
                                </article>
                              );
                            })
                          )}
                          </div>
                        </div>
                      </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-[#EFEDE6]/10">
                    {sortedResults.map(lead => {
                      const topContact = getTopContact(lead);
                      const selected = lead.id === selectedLead?.id;
                      return (
                        <button
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={`block w-full px-4 py-4 text-left transition-colors ${selected ? "bg-[#F5FF3D]/[0.07]" : "hover:bg-[#EFEDE6]/[0.03]"}`}
                        >
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-display text-base font-semibold text-[#EFEDE6]">{lead.name}</p>
                                <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${statusTone[lead.crm_status]}`}>
                                  {lead.crm_status}
                                </span>
                                <span className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${priorityTone[lead.crm_priority]}`}>
                                  {lead.crm_priority}
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{lead.category.replace(/_/g, " ") || "No industry"}</p>
                              {lead.selected_service && <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">{lead.selected_service}</p>}
                              <p className="mt-2 truncate text-xs text-[#A8A59C]">{topContact?.fullName || topContact?.email || lead.address || "No person listed"}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-1.5">
                              <span className={chipClass(!!lead.phone)}><Phone className="h-3 w-3" /></span>
                              <span className={chipClass(lead.emails.length > 0)}><Mail className="h-3 w-3" /></span>
                              <span className={chipClass(!!lead.linkedinUrl)}><Linkedin className="h-3 w-3" /></span>
                              <span className={chipClass(hasPersonName(lead))}><UserRound className="h-3 w-3" /></span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {mode !== "pipeline" && (
              <aside className="min-h-0 overflow-y-auto border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
                {selectedLead ? (
                  <div className="flex min-h-full flex-col">
                    <div className="border-b border-[#EFEDE6]/10 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F5FF3D]">Selected opportunity</p>
                          <h3 className="mt-2 font-display text-2xl font-black leading-tight text-[#EFEDE6]">{selectedLead.name}</h3>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{selectedLead.category.replace(/_/g, " ") || "No industry"}</p>
                        </div>
                        <span className={`shrink-0 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${isContactedLead(selectedLead) ? "border-sky-300 bg-sky-100 text-sky-800" : "border-[#DDFB1F] bg-[#F5FF3D] text-[#102B2F]"}`}>
                          {isContactedLead(selectedLead) ? "Contacted" : "Not contacted"}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-2">
                        <button
                          onClick={() => selectedLead.phone && handleCopyField(`${selectedLead.id}-phone-primary`, selectedLead.phone, "Phone copied")}
                          disabled={!selectedLead.phone}
                          className="inline-flex h-12 items-center justify-center gap-2 border border-[#F5FF3D] bg-[#F5FF3D] px-4 font-display text-sm font-bold text-black transition-colors hover:bg-[#FFFE7A] disabled:cursor-not-allowed disabled:border-[#EFEDE6]/10 disabled:bg-[#EFEDE6]/10 disabled:text-[#67645B]"
                        >
                          {copiedKeys.has(`${selectedLead.id}-phone-primary`) ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {selectedLead.phone ? `Copy ${selectedLead.phone}` : "No phone number"}
                        </button>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => selectedLead.emails[0] && handleCopyField(`${selectedLead.id}-email`, selectedLead.emails[0], "Email copied")}
                            disabled={!selectedLead.emails[0]}
                            className="inline-flex h-10 items-center justify-center gap-1.5 border border-[#EFEDE6]/10 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] hover:border-[#F5FF3D] hover:text-[#F5FF3D] disabled:opacity-30"
                          >
                            <Mail className="h-3.5 w-3.5" /> Email
                          </button>
                          <a
                            href={selectedLead.website || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex h-10 items-center justify-center gap-1.5 border border-[#EFEDE6]/10 font-mono text-[10px] uppercase tracking-widest ${selectedLead.website ? "text-[#A8A59C] hover:border-[#F5FF3D] hover:text-[#F5FF3D]" : "pointer-events-none text-[#67645B] opacity-30"}`}
                          >
                            <Globe className="h-3.5 w-3.5" /> Site
                          </a>
                          <a
                            href={selectedLead.linkedinUrl || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex h-10 items-center justify-center gap-1.5 border border-[#EFEDE6]/10 font-mono text-[10px] uppercase tracking-widest ${selectedLead.linkedinUrl ? "text-[#A8A59C] hover:border-[#0A66C2] hover:text-[#4A9BE8]" : "pointer-events-none text-[#67645B] opacity-30"}`}
                          >
                            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 p-5">
                      <section className="border border-[#EFEDE6]/10 bg-black p-4">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Person</p>
                        <p className="mt-2 text-sm font-semibold text-[#EFEDE6]">{selectedContact?.fullName || selectedContact?.email || "No person listed"}</p>
                        {selectedContact?.title && <p className="mt-1 text-sm text-[#A8A59C]">{selectedContact.title}</p>}
                        {selectedContact?.email && <p className="mt-2 truncate font-mono text-[11px] text-[#F5FF3D]">{selectedContact.email}</p>}
                      </section>

                      <section className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <label>
                            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Status</span>
                            <select value={selectedLead.crm_status} onChange={event => patchLead(selectedLead.id, { crm_status: event.target.value as CrmStatus })} className={`h-10 w-full border bg-black px-3 font-mono text-[10px] uppercase tracking-widest outline-none ${statusTone[selectedLead.crm_status]}`}>
                              {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Priority</span>
                            <select value={selectedLead.crm_priority} onChange={event => patchLead(selectedLead.id, { crm_priority: event.target.value as CrmPriority })} className={`h-10 w-full border bg-black px-3 font-mono text-[10px] uppercase tracking-widest outline-none ${priorityTone[selectedLead.crm_priority]}`}>
                              {priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                        </div>

                        <label>
                          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Follow-up</span>
                          <input type="date" value={toDateInputValue(selectedLead.next_follow_up_at)} onChange={event => patchLead(selectedLead.id, { next_follow_up_at: event.target.value ? new Date(`${event.target.value}T09:00:00`).toISOString() : null })} className={`h-10 w-full border bg-black px-3 font-mono text-[11px] outline-none ${isDue(selectedLead) ? "border-[#F5FF3D] text-[#F5FF3D]" : "border-[#EFEDE6]/10 text-[#A8A59C]"}`} />
                        </label>

                        <button onClick={() => markContacted(selectedLead)} className="inline-flex h-10 w-full items-center justify-center gap-2 border border-[#EFEDE6]/10 font-mono text-[10px] uppercase tracking-widest text-[#A8A59C] hover:border-[#F5FF3D] hover:text-[#F5FF3D]">
                          <Send className="h-3.5 w-3.5" /> Mark contacted
                        </button>

                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                          Last contacted: {selectedLead.last_contacted_at ? new Date(selectedLead.last_contacted_at).toLocaleDateString() : "-"}
                        </p>
                      </section>

                      <section>
                        <label>
                          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Notes</span>
                          <textarea
                            value={selectedLead.crm_notes}
                            onChange={event => setLeads(current => current.map(item => item.id === selectedLead.id ? { ...item, crm_notes: event.target.value } : item))}
                            onBlur={event => patchLead(selectedLead.id, { crm_notes: event.target.value })}
                            placeholder="Add next step, objection, pitch angle..."
                            className="h-32 w-full resize-none border border-[#EFEDE6]/10 bg-black p-3 text-sm leading-6 text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70"
                          />
                        </label>
                      </section>

                      <section className="space-y-2 border-t border-[#EFEDE6]/10 pt-4">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Business</p>
                        <p className="text-sm text-[#A8A59C]">{selectedLead.address || "No address listed"}</p>
                        {selectedLead.intelligence?.positioning && <p className="text-sm leading-6 text-[#A8A59C]">{selectedLead.intelligence.positioning}</p>}
                        {selectedLead.selected_service && (
                          <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">Service sold: {selectedLead.selected_service}</p>
                        )}
                        {selectedLead.intelligence?.opportunityScore !== undefined && (
                          <div>
                            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D]">Opportunity score</p>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xl font-black text-[#F5FF3D]">{selectedLead.intelligence.opportunityScore}</span>
                              <div className="h-1.5 flex-1 bg-[#EFEDE6]/10">
                                <div className="h-full bg-[#F5FF3D]" style={{ width: `${selectedLead.intelligence.opportunityScore}%` }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                    <Archive className="mb-4 h-9 w-9 text-[#67645B]" />
                    <p className="font-display text-xl font-bold text-[#EFEDE6]">Select an opportunity</p>
                    <p className="mt-2 text-sm text-[#A8A59C]">Pick a prospect from the list to review public contact data and next steps.</p>
                  </div>
                )}
              </aside>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                {linkedInCount} with LinkedIn · {personNameCount} with person names
              </p>
              <div className="flex gap-2">
                <button onClick={handleCopyEmails} disabled={emailCount === 0} className="border border-[#EFEDE6]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6] hover:border-[#F5FF3D] disabled:opacity-30">
                  {emailsCopied ? "Copied emails" : "Copy visible emails"}
                </button>
                <button onClick={handleDownload} className="inline-flex items-center gap-2 border border-[#F5FF3D] bg-[#F5FF3D] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#FFFE7A]">
                  <Download className="h-3.5 w-3.5" /> Export opportunities
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ViewAllLeads;
