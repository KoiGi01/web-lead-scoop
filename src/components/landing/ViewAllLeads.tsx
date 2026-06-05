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
  demoMode?: boolean;
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
  new: "border-[#f3f5f8]/15 bg-[#f3f5f8]/[0.05] text-[#98a0af]",
  contacted: "border-[#57b9ff]/30 bg-[#57b9ff]/10 text-[#57b9ff]",
  qualified: "border-[#e8fb52]/40 bg-[#e8fb52]/10 text-[#e8fb52]",
  proposal: "border-[#ffb23e]/30 bg-[#ffb23e]/10 text-[#ffb23e]",
  won: "border-[#5fe3a1]/30 bg-[#5fe3a1]/10 text-[#5fe3a1]",
  lost: "border-[#ff5c49]/25 bg-[#ff5c49]/[0.08] text-[#ff7a68]",
};

const priorityTone: Record<CrmPriority, string> = {
  low: "border-[#f3f5f8]/15 bg-[#f3f5f8]/[0.05] text-[#98a0af]",
  normal: "border-[#57b9ff]/25 bg-[#57b9ff]/[0.08] text-[#7cc5ff]",
  high: "border-[#e8fb52]/40 bg-[#e8fb52]/10 text-[#e8fb52]",
};

const boardColumnTone: Record<CrmStatus, { shell: string; header: string; badge: string; accent: string }> = {
  new: { shell: "border-[#f3f5f8]/[0.08] bg-[#0f1115]", header: "text-[#98a0af]", badge: "bg-[#1c2029] text-[#cbd2dc]", accent: "border-[#f3f5f8]/30" },
  contacted: { shell: "border-[#f3f5f8]/[0.08] bg-[#0f1115]", header: "text-[#57b9ff]", badge: "bg-[#57b9ff]/15 text-[#57b9ff]", accent: "border-[#57b9ff]/45" },
  qualified: { shell: "border-[#f3f5f8]/[0.08] bg-[#0f1115]", header: "text-[#e8fb52]", badge: "bg-[#e8fb52]/15 text-[#e8fb52]", accent: "border-[#e8fb52]/45" },
  proposal: { shell: "border-[#f3f5f8]/[0.08] bg-[#0f1115]", header: "text-[#ffb23e]", badge: "bg-[#ffb23e]/15 text-[#ffb23e]", accent: "border-[#ffb23e]/45" },
  won: { shell: "border-[#f3f5f8]/[0.08] bg-[#0f1115]", header: "text-[#5fe3a1]", badge: "bg-[#5fe3a1]/15 text-[#5fe3a1]", accent: "border-[#5fe3a1]/45" },
  lost: { shell: "border-[#f3f5f8]/[0.08] bg-[#0f1115]", header: "text-[#ff7a68]", badge: "bg-[#ff5c49]/15 text-[#ff7a68]", accent: "border-[#ff5c49]/35" },
};

const contactedStatuses: CrmStatus[] = ["contacted", "qualified", "proposal", "won", "lost"];
const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);
const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : "");
const normalizeCrmStatus = (value: unknown): CrmStatus =>
  statusOptions.some(option => option.value === value) ? value as CrmStatus : "new";
const normalizeCrmPriority = (value: unknown): CrmPriority =>
  priorityOptions.some(option => option.value === value) ? value as CrmPriority : "normal";

const demoContact = (fullName: string, title: string, email: string, score: number, linkedinUrl?: string): DecisionMakerContact => ({
  fullName, title, email, linkedinUrl, source: "website", decisionMakerScore: score, decisionMakerReason: `${title} listed on team/about page.`,
});

const DEMO_LEADS: SavedLead[] = [
  {
    id: "demo-1", name: "BrightSmile Dental Clinic", address: "Austin, TX", phone: "(512) 555-0184",
    website: "https://brightsmile.example", category: "dental clinic", selected_service: "Web design",
    emails: ["hello@brightsmile.example"], whatsapp: [], contacts: [demoContact("Dr. Sofia Almeida", "Clinic Director", "sofia@brightsmile.example", 94, "https://linkedin.com/in/sofia-demo")],
    linkedinUrl: "https://linkedin.com/in/sofia-demo", socialLinks: ["https://instagram.com/brightsmile"], contact_page_found: true,
    intelligence: { opportunityScore: 92, positioning: "Established practice on an outdated one-page site with no online booking.", detectedIssues: ["Outdated website", "No online booking"] },
    crm_status: "new", crm_priority: "high", crm_notes: "", next_follow_up_at: null, last_contacted_at: null, crm_updated_at: null, created_at: "2026-05-28T10:00:00Z",
  },
  {
    id: "demo-2", name: "Austin Cosmetic Dentistry", address: "Austin, TX", phone: "(512) 555-0138",
    website: "https://austincosmetic.example", category: "cosmetic dentist", selected_service: "Web design",
    emails: ["contact@austincosmetic.example"], whatsapp: [], contacts: [demoContact("Mark Collins", "Owner", "mark@austincosmetic.example", 86)],
    linkedinUrl: "", socialLinks: [], contact_page_found: true,
    intelligence: { opportunityScore: 81, positioning: "No clear consultation CTA above the fold." },
    crm_status: "new", crm_priority: "normal", crm_notes: "", next_follow_up_at: null, last_contacted_at: null, crm_updated_at: null, created_at: "2026-05-27T10:00:00Z",
  },
  {
    id: "demo-3", name: "Westside Dental Studio", address: "Austin, TX", phone: "(512) 555-0172",
    website: "https://westside.example", category: "dental studio", selected_service: "SEO",
    emails: ["info@westside.example"], whatsapp: [], contacts: [demoContact("Sarah Nguyen", "Practice Manager", "", 78)],
    linkedinUrl: "", socialLinks: ["https://facebook.com/westside"], contact_page_found: true,
    intelligence: { opportunityScore: 74, positioning: "Weak local visibility and low review count." },
    crm_status: "new", crm_priority: "normal", crm_notes: "", next_follow_up_at: null, last_contacted_at: null, crm_updated_at: null, created_at: "2026-05-26T10:00:00Z",
  },
  {
    id: "demo-4", name: "Lakeline Family Dental", address: "Cedar Park, TX", phone: "(512) 555-0119",
    website: "https://lakelinefamily.example", category: "family dentist", selected_service: "Web design",
    emails: ["frontdesk@lakelinefamily.example"], whatsapp: [], contacts: [demoContact("Dr. Priya Patel", "Founder", "priya@lakelinefamily.example", 90, "https://linkedin.com/in/priya-demo")],
    linkedinUrl: "https://linkedin.com/in/priya-demo", socialLinks: [], contact_page_found: true,
    intelligence: { opportunityScore: 85, positioning: "Strong reputation but slow, non-mobile site." },
    crm_status: "contacted", crm_priority: "high", crm_notes: "Sent intro email, waiting on reply.", next_follow_up_at: "2026-06-05T09:00:00Z", last_contacted_at: "2026-06-02T15:00:00Z", crm_updated_at: "2026-06-02T15:00:00Z", created_at: "2026-05-24T10:00:00Z",
  },
  {
    id: "demo-5", name: "Hill Country Orthodontics", address: "Austin, TX", phone: "(512) 555-0156",
    website: "https://hillcountryortho.example", category: "orthodontist", selected_service: "Paid ads",
    emails: ["team@hillcountryortho.example"], whatsapp: [], contacts: [demoContact("Dr. James Reed", "Orthodontist", "james@hillcountryortho.example", 83)],
    linkedinUrl: "", socialLinks: ["https://instagram.com/hillcountryortho"], contact_page_found: true,
    intelligence: { opportunityScore: 79, positioning: "Running no paid acquisition; strong margins." },
    crm_status: "contacted", crm_priority: "normal", crm_notes: "", next_follow_up_at: "2026-06-08T09:00:00Z", last_contacted_at: "2026-06-01T12:00:00Z", crm_updated_at: "2026-06-01T12:00:00Z", created_at: "2026-05-22T10:00:00Z",
  },
  {
    id: "demo-6", name: "Zilker Dental Co", address: "Austin, TX", phone: "(512) 555-0143",
    website: "https://zilkerdental.example", category: "dental clinic", selected_service: "Web design",
    emails: ["hello@zilkerdental.example"], whatsapp: [], contacts: [demoContact("Dr. Elena Cruz", "Owner", "elena@zilkerdental.example", 91, "https://linkedin.com/in/elena-demo")],
    linkedinUrl: "https://linkedin.com/in/elena-demo", socialLinks: ["https://instagram.com/zilkerdental"], contact_page_found: true,
    intelligence: { opportunityScore: 88, positioning: "Booking buried; clear redesign opportunity." },
    crm_status: "qualified", crm_priority: "high", crm_notes: "Interested — scheduling a call.", next_follow_up_at: "2026-06-05T09:00:00Z", last_contacted_at: "2026-06-03T11:00:00Z", crm_updated_at: "2026-06-03T11:00:00Z", created_at: "2026-05-20T10:00:00Z",
  },
  {
    id: "demo-7", name: "Mueller Dental Group", address: "Austin, TX", phone: "(512) 555-0167",
    website: "https://muellerdental.example", category: "dental group", selected_service: "Web design",
    emails: ["office@muellerdental.example"], whatsapp: [], contacts: [demoContact("Dr. Aaron Webb", "Managing Partner", "aaron@muellerdental.example", 93, "https://linkedin.com/in/aaron-demo")],
    linkedinUrl: "https://linkedin.com/in/aaron-demo", socialLinks: [], contact_page_found: true,
    intelligence: { opportunityScore: 90, positioning: "Proposal sent for full site + booking flow." },
    crm_status: "proposal", crm_priority: "high", crm_notes: "Proposal sent — $6k site rebuild.", next_follow_up_at: "2026-06-09T09:00:00Z", last_contacted_at: "2026-06-04T10:00:00Z", crm_updated_at: "2026-06-04T10:00:00Z", created_at: "2026-05-18T10:00:00Z",
  },
  {
    id: "demo-8", name: "South Congress Smiles", address: "Austin, TX", phone: "(512) 555-0190",
    website: "https://socosmiles.example", category: "dental clinic", selected_service: "Web design",
    emails: ["hello@socosmiles.example"], whatsapp: [], contacts: [demoContact("Dr. Maya Brooks", "Owner", "maya@socosmiles.example", 89)],
    linkedinUrl: "", socialLinks: ["https://instagram.com/socosmiles"], contact_page_found: true,
    intelligence: { opportunityScore: 87, positioning: "Closed — new site live." },
    crm_status: "won", crm_priority: "normal", crm_notes: "Won — project kicked off.", next_follow_up_at: null, last_contacted_at: "2026-05-30T10:00:00Z", crm_updated_at: "2026-05-30T10:00:00Z", created_at: "2026-05-12T10:00:00Z",
  },
];

const ViewAllLeads = ({ userId, onBackToSearch, mode = "inbox", demoMode = false }: ViewAllLeadsProps) => {
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
    if (demoMode) {
      setLeads(DEMO_LEADS);
      setLoading(false);
      return;
    }
    if (userId) fetchAllLeads();
    // Archive refreshes when the authenticated archive owner changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, demoMode]);

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
        ? "border-[#e8fb52] bg-[#e8fb52] text-black"
        : "border-[#f3f5f8]/10 text-[#9aa3b2] hover:border-[#e8fb52]/50 hover:text-[#f3f5f8]"
    }`;

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
      active ? "border-[#e8fb52] bg-[#e8fb52] text-black" : "border-[#f3f5f8]/15 bg-[#f3f5f8]/[0.04] text-[#9aa3b2] hover:text-[#f3f5f8]"
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
    <section id="tool" className="flex flex-1 flex-col overflow-hidden bg-black text-[#f3f5f8]">
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
        <div className="mb-3 flex flex-col gap-3 border-b border-[#f3f5f8]/[0.14] pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {onBackToSearch && (
              <button
                onClick={onBackToSearch}
                className="flex h-8 shrink-0 items-center gap-1.5 border border-[#f3f5f8]/10 px-2.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#9aa3b2] transition-colors hover:border-[#e8fb52]/50 hover:text-[#e8fb52]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#e8fb52]">{pageMeta.kicker}</p>
              <h2 className="truncate font-display text-2xl font-black leading-none tracking-[-0.04em] text-[#f3f5f8]">
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
              <div key={String(label)} className="flex h-8 min-w-[86px] items-center justify-between gap-2 rounded-[8px] border border-[#f3f5f8]/[0.1] bg-[#111319] px-2.5">
                <p className="font-mono text-sm font-black tabular-nums text-[#f3f5f8]">{value}</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-[#5d6675]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#e8fb52]" />
          </div>
        )}

        {!loading && leads.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-[14px] border border-[#f3f5f8]/[0.1] bg-[#111319] py-20 text-center">
            <Archive className="mb-4 h-10 w-10 text-[#5d6675]" />
            <p className="font-display text-2xl font-bold text-[#f3f5f8]">{pageMeta.empty}</p>
            <p className="mt-2 text-sm text-[#9aa3b2]">{pageMeta.emptyDescription}</p>
          </div>
        )}

        {!loading && leads.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="rounded-[12px] border border-[#f3f5f8]/[0.1] bg-[#111319] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6675]" />
                  <input
                    type="text"
                    placeholder="Search prospects, companies, people, emails…"
                    value={filterText}
                    onChange={event => setFilterText(event.target.value)}
                    className="h-9 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black pl-9 pr-3 text-[13px] text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60"
                  />
                </div>

                <select
                  value={filterCategory}
                  onChange={event => setFilterCategory(event.target.value)}
                  className="h-9 rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] outline-none focus:border-[#e8fb52]/60 sm:min-w-[160px]"
                >
                  <option value="all">All industries</option>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>{category.replace(/_/g, " ")}</option>
                  ))}
                </select>

                <button onClick={() => setShowAdvancedFilters(value => !value)} className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] border px-3.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${showAdvancedFilters || activeFilterCount > 0 ? "border-[#e8fb52] bg-[#e8fb52]/10 text-[#e8fb52]" : "border-[#f3f5f8]/[0.13] text-[#9aa3b2] hover:text-[#f3f5f8]"}`}>
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
                </button>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] border border-[#ff5c49]/30 px-3 font-mono text-[10px] uppercase tracking-widest text-[#ff7a68] hover:bg-[#ff5c49]/10">
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {showAdvancedFilters && (
                <div className="mt-3 grid gap-3 border-t border-[#f3f5f8]/10 pt-3 lg:grid-cols-4">
                  <select value={filterDate} onChange={event => setFilterDate(event.target.value as DateFilter)} className="h-9 border border-[#f3f5f8]/10 bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] outline-none focus:border-[#e8fb52]/70">
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="custom">Custom range</option>
                  </select>
                  <select value={filterContactState} onChange={event => setFilterContactState(event.target.value as ContactStateFilter)} className="h-9 border border-[#f3f5f8]/10 bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] outline-none focus:border-[#e8fb52]/70">
                    <option value="all">All contact states</option>
                    <option value="contacted">Contacted</option>
                    <option value="not_contacted">Not contacted</option>
                  </select>
                  <select value={filterStatus} onChange={event => setFilterStatus(event.target.value as "all" | CrmStatus)} className="h-9 border border-[#f3f5f8]/10 bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] outline-none focus:border-[#e8fb52]/70">
                    <option value="all">All pipeline statuses</option>
                    {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select value={filterPriority} onChange={event => setFilterPriority(event.target.value as "all" | CrmPriority)} className="h-9 border border-[#f3f5f8]/10 bg-black px-3 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] outline-none focus:border-[#e8fb52]/70">
                    <option value="all">All priorities</option>
                    {priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {filterDate === "custom" && (
                    <>
                      <input type="date" value={customDateStart} onChange={event => setCustomDateStart(event.target.value)} className="h-9 border border-[#f3f5f8]/10 bg-black px-3 font-mono text-[10px] text-[#9aa3b2] outline-none focus:border-[#e8fb52]/70" />
                      <input type="date" value={customDateEnd} onChange={event => setCustomDateEnd(event.target.value)} className="h-9 border border-[#f3f5f8]/10 bg-black px-3 font-mono text-[10px] text-[#9aa3b2] outline-none focus:border-[#e8fb52]/70" />
                    </>
                  )}
                  <div className="flex flex-wrap gap-2 lg:col-span-4">
                    {renderFilterToggle("not-contacted", "Not contacted", Phone, filterContactState === "not_contacted", () => setFilterContactState(filterContactState === "not_contacted" ? "all" : "not_contacted"))}
                    {renderFilterToggle("phone", "Phone", Phone, filterByPhone, () => setFilterByPhone(value => !value))}
                    {renderFilterToggle("email", "Email", Mail, filterByEmail, () => setFilterByEmail(value => !value))}
                    {renderFilterToggle("person", "Person", UserRound, filterByPersonName, () => setFilterByPersonName(value => !value))}
                    {renderFilterToggle("site", "Website", Globe, filterByWebsite, () => setFilterByWebsite(value => !value))}
                    {renderFilterToggle("linkedin", "LinkedIn", Linkedin, filterByLinkedIn, () => setFilterByLinkedIn(value => !value))}
                    {renderFilterToggle("due", "Follow-up due", CalendarClock, filterDueOnly, () => setFilterDueOnly(value => !value))}
                    {userProfile && renderFilterToggle("intel", "Has intel", Zap, filterByIntelligence, () => setFilterByIntelligence(value => !value))}
                    {userProfile && (
                      <div className="flex items-center gap-1 border border-[#f3f5f8]/10 px-2 py-1">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Score</span>
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

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className={`min-h-0 overflow-y-auto rounded-[14px] border border-[#f3f5f8]/[0.1] ${mode === "pipeline" ? "bg-[#0b0d11]" : "bg-[#0b0d11]"}`}>
                {sortedResults.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center">
                    <Search className="mb-4 h-9 w-9 text-[#5d6675]" />
                    <p className="font-display text-xl font-bold text-[#f3f5f8]">{pageMeta.noMatch}</p>
                    <p className="mt-2 text-sm text-[#9aa3b2]">Clear filters or widen the criteria.</p>
                    <button onClick={clearFilters} className="mt-5 border border-[#e8fb52] bg-[#e8fb52] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black">
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
                        className={`flex min-w-[286px] max-w-[320px] flex-1 overflow-hidden rounded-[12px] border transition-all ${tone.shell} ${isDropTarget ? "ring-1 ring-[#e8fb52]/40" : ""}`}
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
                          </div>

                          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                          {column.leads.length === 0 ? (
                            <div className={`flex min-h-[120px] items-center justify-center rounded-[10px] border border-dashed px-3 text-center transition-colors ${isDropTarget ? "border-[#e8fb52]/40 bg-[#e8fb52]/[0.06]" : "border-[#f3f5f8]/10 bg-[#f3f5f8]/[0.02]"}`}>
                              <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">{isDropTarget ? "Drop to move here" : "No opportunities"}</p>
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
                                  className={`rounded-[10px] border bg-[#14171d] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#f3f5f8]/20 ${selected ? `${tone.accent} ring-1 ring-[#e8fb52]/20` : "border-[#f3f5f8]/[0.08]"} ${isDragging ? "scale-[0.98] cursor-grabbing opacity-45" : "cursor-grab"}`}
                                >
                                  <button onClick={() => setSelectedLeadId(lead.id)} className="block w-full text-left">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="truncate font-display text-sm font-semibold leading-snug text-[#f3f5f8]">{personLabel}</p>
                                      {lead.intelligence?.opportunityScore !== undefined && (
                                        <span className="shrink-0 rounded-[6px] border border-[#e8fb52]/30 bg-[#e8fb52]/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-[#e8fb52]">{lead.intelligence.opportunityScore}</span>
                                      )}
                                    </div>
                                    <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">{lead.category.replace(/_/g, " ") || "No industry"}</p>
                                    <p className="mt-1.5 truncate text-xs font-medium text-[#9aa3b2]">{lead.name || "No company name"}</p>
                                    <div className="mt-2.5 flex items-center gap-2">
                                      {lead.selected_service && <span className="truncate font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">{lead.selected_service}</span>}
                                      <span className="ml-auto flex shrink-0 items-center gap-1">
                                        {!!lead.phone && <Phone className="h-3 w-3 text-[#5d6675]" />}
                                        {lead.emails.length > 0 && <Mail className="h-3 w-3 text-[#5d6675]" />}
                                        {!!lead.linkedinUrl && <Linkedin className="h-3 w-3 text-[#5d6675]" />}
                                      </span>
                                    </div>
                                  </button>

                                  {savingLeadIds.has(lead.id) && (
                                    <div className="mt-2 flex justify-end">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5d6675]" />
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
                  <div className="divide-y divide-[#f3f5f8]/[0.06]">
                    {sortedResults.map(lead => {
                      const topContact = getTopContact(lead);
                      const selected = lead.id === selectedLead?.id;
                      const person = topContact?.fullName || topContact?.email || "Named contact pending";
                      const score = lead.intelligence?.opportunityScore;
                      return (
                        <button
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={`group relative block w-full py-3.5 pl-5 pr-4 text-left transition-colors ${selected ? "bg-[#e8fb52]/[0.06]" : "hover:bg-[#f3f5f8]/[0.025]"}`}
                        >
                          <span className={`absolute inset-y-0 left-0 w-[3px] transition-colors ${selected ? "bg-[#e8fb52]" : "bg-transparent group-hover:bg-[#f3f5f8]/15"}`} />
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-display text-[15px] font-semibold text-[#f3f5f8]">{person}</p>
                                {topContact?.title && <span className="hidden shrink-0 truncate text-[11px] text-[#5d6675] sm:inline">· {topContact.title}</span>}
                              </div>
                              <p className="mt-0.5 truncate text-[13px] text-[#9aa3b2]">{lead.name || "No company name"}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5d6675]">
                                <span className="truncate">{lead.category.replace(/_/g, " ") || "No industry"}</span>
                                {lead.selected_service && (
                                  <>
                                    <span className="text-[#f3f5f8]/15">·</span>
                                    <span className="text-[#e8fb52]">{lead.selected_service}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                {score !== undefined && (
                                  <span className="rounded-[6px] border border-[#e8fb52]/30 bg-[#e8fb52]/[0.08] px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#e8fb52]">{score}</span>
                                )}
                                <span className={`rounded-[5px] border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${statusTone[lead.crm_status]}`}>
                                  {lead.crm_status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {!!lead.phone && <Phone className="h-3.5 w-3.5 text-[#5d6675]" />}
                                {lead.emails.length > 0 && <Mail className="h-3.5 w-3.5 text-[#e8fb52]" />}
                                {!!lead.linkedinUrl && <Linkedin className="h-3.5 w-3.5 text-[#5d6675]" />}
                                {hasPersonName(lead) && <UserRound className="h-3.5 w-3.5 text-[#5d6675]" />}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <aside className="min-h-0 overflow-y-auto rounded-[14px] border border-[#f3f5f8]/[0.1] bg-[#111319]">
                {selectedLead ? (
                  <div className="flex min-h-full flex-col">
                    <div className="border-b border-[#f3f5f8]/[0.07] p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e8fb52]">Selected opportunity</p>
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#f3f5f8]">{selectedContact?.fullName || selectedLead.name || "Named contact pending"}</h3>
                          <p className="mt-1 truncate text-[13px] text-[#9aa3b2]">{selectedContact?.title ? `${selectedContact.title} · ` : ""}{selectedLead.name || "No company"}</p>
                          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                            {selectedLead.category.replace(/_/g, " ") || "No industry"}
                            {selectedLead.selected_service && <> · <span className="text-[#e8fb52]">{selectedLead.selected_service}</span></>}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {selectedLead.intelligence?.opportunityScore !== undefined && (
                            <span className="rounded-[7px] border border-[#e8fb52]/30 bg-[#e8fb52]/[0.08] px-2 py-1 font-mono text-[13px] font-semibold tabular-nums text-[#e8fb52]">{selectedLead.intelligence.opportunityScore}</span>
                          )}
                          <span className={`rounded-[6px] border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${isContactedLead(selectedLead) ? "border-[#57b9ff]/30 bg-[#57b9ff]/10 text-[#57b9ff]" : "border-[#e8fb52]/40 bg-[#e8fb52]/10 text-[#e8fb52]"}`}>
                            {isContactedLead(selectedLead) ? "Contacted" : "Not contacted"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => selectedLead.phone && handleCopyField(`${selectedLead.id}-phone-primary`, selectedLead.phone, "Phone copied")}
                        disabled={!selectedLead.phone}
                        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#e8fb52] bg-[#e8fb52] px-4 font-display text-sm font-bold text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:border-[#f3f5f8]/10 disabled:bg-[#f3f5f8]/10 disabled:text-[#5d6675]"
                      >
                        {copiedKeys.has(`${selectedLead.id}-phone-primary`) ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {selectedLead.phone ? `Copy ${selectedLead.phone}` : "No phone number"}
                      </button>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="overflow-hidden rounded-[10px] border border-[#f3f5f8]/[0.08] bg-black">
                        <p className="border-b border-[#f3f5f8]/[0.06] px-3.5 pb-2 pt-3 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Contact</p>
                        <div className="divide-y divide-[#f3f5f8]/[0.06]">
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-[#5d6675]" />
                              <span className="truncate font-mono text-[12px] text-[#f3f5f8]">{selectedLead.emails[0] || selectedContact?.email || "No email"}</span>
                            </div>
                            {(selectedLead.emails[0] || selectedContact?.email) && (
                              <button onClick={() => handleCopyField(`${selectedLead.id}-email`, selectedLead.emails[0] || selectedContact?.email || "", "Email copied")} aria-label="Copy email" className="shrink-0 text-[#5d6675] transition-colors hover:text-[#e8fb52]">
                                {copiedKeys.has(`${selectedLead.id}-email`) ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Globe className="h-3.5 w-3.5 shrink-0 text-[#5d6675]" />
                              <span className="truncate font-mono text-[12px] text-[#9aa3b2]">{selectedLead.website ? selectedLead.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "No website"}</span>
                            </div>
                            {selectedLead.website && (
                              <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" aria-label="Open website" className="shrink-0 text-[#5d6675] transition-colors hover:text-[#e8fb52]"><ExternalLink className="h-3.5 w-3.5" /></a>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Linkedin className="h-3.5 w-3.5 shrink-0 text-[#5d6675]" />
                              <span className="truncate font-mono text-[12px] text-[#9aa3b2]">{selectedLead.linkedinUrl ? "LinkedIn profile" : "No LinkedIn"}</span>
                            </div>
                            {selectedLead.linkedinUrl && (
                              <a href={selectedLead.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Open LinkedIn" className="shrink-0 text-[#5d6675] transition-colors hover:text-[#4A9BE8]"><ExternalLink className="h-3.5 w-3.5" /></a>
                            )}
                          </div>
                        </div>
                      </div>

                      {(selectedLead.intelligence?.positioning || !!selectedLead.intelligence?.detectedIssues?.length) && (
                        <div className="rounded-[10px] border border-[#f3f5f8]/[0.08] bg-black p-3.5">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Why this prospect</p>
                          {selectedLead.intelligence?.positioning && <p className="mt-1.5 text-[13px] leading-[1.5] text-[#9aa3b2]">{selectedLead.intelligence.positioning}</p>}
                          {!!selectedLead.intelligence?.detectedIssues?.length && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {selectedLead.intelligence.detectedIssues.map(issue => (
                                <span key={issue} className="rounded-[6px] border border-[#ffb23e]/25 bg-[#ffb23e]/[0.08] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#ffb23e]">{issue}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-3 rounded-[10px] border border-[#f3f5f8]/[0.08] bg-black p-3.5">
                        <div className="grid grid-cols-2 gap-3">
                          <label>
                            <span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Status</span>
                            <select value={selectedLead.crm_status} onChange={event => patchLead(selectedLead.id, { crm_status: event.target.value as CrmStatus })} className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-[#0b0d11] px-3 font-mono text-[10px] uppercase tracking-widest text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60">
                              {statusOptions.map(option => <option key={option.value} value={option.value} className="bg-[#14171d] text-[#f3f5f8]">{option.label}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Priority</span>
                            <select value={selectedLead.crm_priority} onChange={event => patchLead(selectedLead.id, { crm_priority: event.target.value as CrmPriority })} className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-[#0b0d11] px-3 font-mono text-[10px] uppercase tracking-widest text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60">
                              {priorityOptions.map(option => <option key={option.value} value={option.value} className="bg-[#14171d] text-[#f3f5f8]">{option.label}</option>)}
                            </select>
                          </label>
                        </div>

                        <label>
                          <span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Follow-up</span>
                          <input type="date" value={toDateInputValue(selectedLead.next_follow_up_at)} onChange={event => patchLead(selectedLead.id, { next_follow_up_at: event.target.value ? new Date(`${event.target.value}T09:00:00`).toISOString() : null })} className={`h-10 w-full rounded-[9px] border bg-[#0b0d11] px-3 font-mono text-[11px] outline-none ${isDue(selectedLead) ? "border-[#e8fb52] text-[#e8fb52]" : "border-[#f3f5f8]/[0.13] text-[#9aa3b2]"}`} />
                        </label>

                        <button onClick={() => markContacted(selectedLead)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[9px] border border-[#f3f5f8]/[0.13] font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] hover:border-[#e8fb52] hover:text-[#e8fb52]">
                          <Send className="h-3.5 w-3.5" /> Mark contacted
                        </button>

                        <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                          Last contacted: {selectedLead.last_contacted_at ? new Date(selectedLead.last_contacted_at).toLocaleDateString() : "—"}
                        </p>
                      </div>

                      <label className="block">
                        <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Notes</span>
                        <textarea
                          value={selectedLead.crm_notes}
                          onChange={event => setLeads(current => current.map(item => item.id === selectedLead.id ? { ...item, crm_notes: event.target.value } : item))}
                          onBlur={event => patchLead(selectedLead.id, { crm_notes: event.target.value })}
                          placeholder="Add next step, objection, pitch angle…"
                          className="h-28 w-full resize-none rounded-[10px] border border-[#f3f5f8]/[0.13] bg-black p-3 text-sm leading-6 text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60"
                        />
                      </label>

                      <div className="border-t border-[#f3f5f8]/[0.07] pt-4">
                        <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Business</p>
                        <p className="mt-1.5 text-[13px] text-[#9aa3b2]">{selectedLead.address || "No address listed"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                    <Archive className="mb-4 h-9 w-9 text-[#5d6675]" />
                    <p className="font-display text-xl font-bold text-[#f3f5f8]">Select an opportunity</p>
                    <p className="mt-2 text-sm text-[#9aa3b2]">Pick a prospect from the list to review public contact data and next steps.</p>
                  </div>
                )}
              </aside>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
                {linkedInCount} with LinkedIn · {personNameCount} with person names
              </p>
              <div className="flex gap-2">
                <button onClick={handleCopyEmails} disabled={emailCount === 0} className="border border-[#f3f5f8]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#f3f5f8] hover:border-[#e8fb52] disabled:opacity-30">
                  {emailsCopied ? "Copied emails" : "Copy visible emails"}
                </button>
                <button onClick={handleDownload} className="inline-flex items-center gap-2 border border-[#e8fb52] bg-[#e8fb52] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#f3ff8a]">
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
