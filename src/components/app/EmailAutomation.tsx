import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Briefcase, CheckCheck, Flag, Image, KanbanSquare, Loader2, Mail, Search, Send, Sparkles, Type, Users, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { hasOutreachValueProp, parseOutreachProfile, serializeOutreachProfile, type OutreachCtaType, type OutreachTone } from "@/lib/outreachProfile";

interface EmailAutomationProps {
  userId: string | undefined;
  userEmail?: string;
  demoMode?: boolean;
  userProfile?: UserProfileRow | null;
  onProfileUpdated?: () => Promise<void> | void;
}

type SavedLeadRow = Tables<"saved_leads">;
type CampaignRow = Tables<"email_campaigns">;
type RecipientRow = Tables<"email_campaign_recipients">;
type UserProfileRow = Tables<"user_profiles">;

interface LeadContact {
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  decisionMakerScore?: number;
}

interface EmailLead {
  id: string;
  name: string;
  category: string;
  selectedService: string;
  crmStatus: string;
  crmPriority: string;
  createdAt: string;
  email: string;
  personName: string;
  score: number | null;
}

type SmartGroupType = "industry" | "pipeline" | "priority" | "service";

interface SmartGroup {
  id: string;
  type: SmartGroupType;
  label: string;
  value: string;
  count: number;
  selectedCount: number;
  criteria: string;
}

interface CampaignSummary extends CampaignRow {
  queuedCount: number;
  sentCount: number;
  failedCount: number;
}

const demoLeads: EmailLead[] = [
  { id: "demo-1", name: "BrightSmile Dental Clinic", category: "dental clinic", selectedService: "Web design", crmStatus: "new", crmPriority: "high", createdAt: "2026-06-16T12:00:00Z", email: "sofia@brightsmile.example", personName: "Dr. Sofia Almeida", score: 92 },
  { id: "demo-2", name: "Austin Cosmetic Dentistry", category: "cosmetic dentist", selectedService: "Web design", crmStatus: "contacted", crmPriority: "normal", createdAt: "2026-06-15T12:00:00Z", email: "mark@austincosmetic.example", personName: "Mark Collins", score: 81 },
  { id: "demo-3", name: "Zilker Dental Co", category: "dental clinic", selectedService: "Web design", crmStatus: "qualified", crmPriority: "high", createdAt: "2026-06-14T12:00:00Z", email: "elena@zilkerdental.example", personName: "Dr. Elena Cruz", score: 88 },
  { id: "demo-4", name: "Skyline Roofing", category: "roofing contractor", selectedService: "SEO", crmStatus: "new", crmPriority: "high", createdAt: "2026-06-13T12:00:00Z", email: "ryan@skylineroofing.example", personName: "Ryan Park", score: 86 },
  { id: "demo-5", name: "North Loop Roof Repair", category: "roofer", selectedService: "SEO", crmStatus: "proposal", crmPriority: "normal", createdAt: "2026-06-12T12:00:00Z", email: "maya@northlooproof.example", personName: "Maya Reeves", score: 79 },
  { id: "demo-6", name: "Willow Med Spa", category: "med spa", selectedService: "Paid ads", crmStatus: "contacted", crmPriority: "high", createdAt: "2026-06-11T12:00:00Z", email: "nina@willowmedspa.example", personName: "Nina Brooks", score: 84 },
];

const defaultSubject = "Quick idea for {{company}}";
const defaultBody = `Hi {{firstName}},

I came across {{company}} and noticed a few public signals that may be worth improving.

We help teams turn those gaps into clearer conversion paths and better local visibility.

Open to a quick look at what I found?`;

const defaultSignature = `Best,
{{name}}`;

const templateVariables = [
  { token: "{{firstName}}", label: "First name" },
  { token: "{{name}}", label: "Full name" },
  { token: "{{company}}", label: "Company" },
  { token: "{{email}}", label: "Email" },
];

const fontOptions = [
  { label: "Clean sans", value: "Arial, sans-serif" },
  { label: "Modern", value: "Inter, Arial, sans-serif" },
  { label: "Editorial", value: "Georgia, serif" },
  { label: "Mono", value: "'IBM Plex Mono', monospace" },
];

type ComposerField = "subject" | "body" | "signature";
type EmailIntent = "discovery" | "follow_up" | "audit_offer" | "re_engage" | "breakup";

const outreachCtaOptions: Array<{ value: OutreachCtaType; label: string }> = [
  { value: "reply", label: "Get a reply" },
  { value: "book_call", label: "Book a call" },
  { value: "send_audit", label: "Send an audit" },
  { value: "custom", label: "Custom ask" },
];

const outreachToneOptions: Array<{ value: OutreachTone; label: string }> = [
  { value: "direct", label: "Direct" },
  { value: "warm", label: "Warm" },
  { value: "premium", label: "Premium" },
];

const emailIntentOptions: Array<{ value: EmailIntent; label: string; description: string }> = [
  { value: "discovery", label: "Discovery", description: "First-touch email that opens a useful conversation." },
  { value: "follow_up", label: "Follow-up", description: "Polite continuation after a prior touch or saved pipeline note." },
  { value: "audit_offer", label: "Quick audit", description: "Offer to send a few specific gaps or opportunities." },
  { value: "re_engage", label: "Re-engage", description: "Restart a quiet conversation without sounding pushy." },
  { value: "breakup", label: "Last check", description: "Short final nudge that makes it easy to say no." },
];

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

const stageLabels: Record<string, string> = {
  new: "New leads",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const priorityLabels: Record<string, string> = {
  high: "High priority",
  normal: "Normal priority",
  low: "Low priority",
};

const smartGroupTypeLabels: Record<SmartGroupType, string> = {
  industry: "Industry",
  pipeline: "Pipeline",
  priority: "Priority",
  service: "Service",
};

const smartGroupSections: Array<{ type: SmartGroupType; label: string }> = [
  { type: "industry", label: "Industry" },
  { type: "pipeline", label: "Stage" },
  { type: "priority", label: "Priority" },
  { type: "service", label: "Service" },
];

const smartGroupIcons: Record<SmartGroupType, typeof Users> = {
  industry: Users,
  pipeline: KanbanSquare,
  priority: Flag,
  service: Briefcase,
};

const titleCase = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());

const normalizeGroupValue = (value: string | null | undefined, fallback: string) => value?.trim() || fallback;

const getStageLabel = (value: string) => stageLabels[value.toLowerCase()] || titleCase(value);

const getPriorityLabel = (value: string) => priorityLabels[value.toLowerCase()] || titleCase(value);

const matchesSmartGroup = (lead: EmailLead, group: SmartGroup | null) => {
  if (!group) return true;
  if (group.type === "industry") return lead.category === group.value;
  if (group.type === "pipeline") return lead.crmStatus === group.value;
  if (group.type === "priority") return lead.crmPriority === group.value;
  return lead.selectedService === group.value;
};

const matchesSearch = (lead: EmailLead, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    lead.name,
    lead.personName,
    lead.email,
    lead.category,
    lead.selectedService,
    getStageLabel(lead.crmStatus),
    getPriorityLabel(lead.crmPriority),
  ].some(value => value.toLowerCase().includes(normalized));
};

const renderTemplate = (template: string, lead: EmailLead | null) => {
  const personName = lead?.personName || "";
  const values: Record<string, string> = {
    firstName: personName.trim().split(/\s+/)[0] || "",
    name: personName || lead?.name || "",
    company: lead?.name || "",
    email: lead?.email || "",
  };
  return template.replace(/\{\{\s*(firstName|name|company|email)\s*\}\}/g, (_match, key) => values[key] || "");
};

const getTopContact = (lead: SavedLeadRow): LeadContact | null =>
  asArray<LeadContact>(lead.contacts)
    .sort((a, b) => (b.decisionMakerScore || 0) - (a.decisionMakerScore || 0))[0] || null;

const getEmailLead = (lead: SavedLeadRow): EmailLead | null => {
  const contact = getTopContact(lead);
  const emails = asArray<string>(lead.emails);
  const email = emails[0] || contact?.email || "";
  if (!email) return null;

  const intelligence = (lead.intelligence || {}) as { opportunityScore?: number };
  const personName = contact?.fullName || [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || "";
  return {
    id: lead.id,
    name: lead.name || "Unnamed company",
    category: lead.category || "Uncategorized",
    selectedService: lead.selected_service || "",
    crmStatus: normalizeGroupValue(lead.crm_status, "new"),
    crmPriority: normalizeGroupValue(lead.crm_priority, "normal"),
    createdAt: lead.created_at || "",
    email,
    personName,
    score: typeof intelligence.opportunityScore === "number" ? intelligence.opportunityScore : null,
  };
};

const EmailAutomation = ({ userId, userEmail, demoMode = false, userProfile, onProfileUpdated }: EmailAutomationProps) => {
  const [leads, setLeads] = useState<EmailLead[]>(demoMode ? demoLeads : []);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(demoMode ? demoLeads.map(lead => lead.id) : []));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [setupError, setSetupError] = useState("");
  const [name, setName] = useState("Opportunity intro");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [replyTo, setReplyTo] = useState(userEmail || "");
  const [signature, setSignature] = useState(defaultSignature);
  const [emailIntent, setEmailIntent] = useState<EmailIntent>("discovery");
  const [imageUrl, setImageUrl] = useState("");
  const [fontFamily, setFontFamily] = useState(fontOptions[0].value);
  const [activeField, setActiveField] = useState<ComposerField>("body");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOutreachSetup, setShowOutreachSetup] = useState(false);
  const [savingOutreachSetup, setSavingOutreachSetup] = useState(false);
  const [outreachValueProp, setOutreachValueProp] = useState("");
  const [outreachProofPoint, setOutreachProofPoint] = useState("");
  const [outreachCtaType, setOutreachCtaType] = useState<OutreachCtaType>("reply");
  const [outreachCtaDetail, setOutreachCtaDetail] = useState("");
  const [outreachTone, setOutreachTone] = useState<OutreachTone>("direct");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const signatureRef = useRef<HTMLTextAreaElement>(null);

  const selectedLeads = useMemo(() => leads.filter(lead => selectedIds.has(lead.id)), [leads, selectedIds]);
  const previewLead = selectedLeads[0] || leads[0] || null;
  const previewBody = renderTemplate(body, previewLead);
  const previewSignature = renderTemplate(signature, previewLead);
  const sortedCampaigns = useMemo(() => [...campaigns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [campaigns]);
  const outreachProfile = useMemo(() => parseOutreachProfile(userProfile?.outreach_profile), [userProfile]);
  const smartGroups = useMemo(() => {
    const groups = new Map<string, SmartGroup>();
    const addGroup = (type: SmartGroupType, value: string, label: string, criteria: string) => {
      const key = `${type}:${value}`;
      const existing = groups.get(key);
      groups.set(key, {
        id: key,
        type,
        label,
        value,
        count: (existing?.count || 0) + 1,
        selectedCount: existing?.selectedCount || 0,
        criteria,
      });
    };

    leads.forEach(lead => {
      addGroup("industry", normalizeGroupValue(lead.category, "Uncategorized"), titleCase(normalizeGroupValue(lead.category, "Uncategorized")), `Industry is ${titleCase(normalizeGroupValue(lead.category, "Uncategorized"))}`);
      addGroup("pipeline", normalizeGroupValue(lead.crmStatus, "new"), getStageLabel(normalizeGroupValue(lead.crmStatus, "new")), `Pipeline stage is ${getStageLabel(normalizeGroupValue(lead.crmStatus, "new"))}`);
      addGroup("priority", normalizeGroupValue(lead.crmPriority, "normal"), getPriorityLabel(normalizeGroupValue(lead.crmPriority, "normal")), `Priority is ${getPriorityLabel(normalizeGroupValue(lead.crmPriority, "normal"))}`);
      if (lead.selectedService) addGroup("service", lead.selectedService, titleCase(lead.selectedService), `Service is ${titleCase(lead.selectedService)}`);
    });

    groups.forEach(group => {
      group.selectedCount = leads.filter(lead => selectedIds.has(lead.id) && matchesSmartGroup(lead, group)).length;
    });

    const typeOrder: Record<SmartGroupType, number> = { industry: 0, pipeline: 1, priority: 2, service: 3 };
    return [...groups.values()].sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || b.count - a.count || a.label.localeCompare(b.label));
  }, [leads, selectedIds]);
  const activeGroup = useMemo(() => smartGroups.find(group => group.id === activeGroupId) || null, [activeGroupId, smartGroups]);
  const visibleLeads = useMemo(
    () => leads.filter(lead => matchesSmartGroup(lead, activeGroup) && matchesSearch(lead, searchQuery)),
    [activeGroup, leads, searchQuery],
  );
  const visibleSelectedCount = useMemo(() => visibleLeads.filter(lead => selectedIds.has(lead.id)).length, [selectedIds, visibleLeads]);

  useEffect(() => {
    if (userEmail && !replyTo) setReplyTo(userEmail);
  }, [replyTo, userEmail]);

  useEffect(() => {
    setOutreachValueProp(outreachProfile.valueProp);
    setOutreachProofPoint(outreachProfile.proofPoint || "");
    setOutreachCtaType(outreachProfile.ctaType);
    setOutreachCtaDetail(outreachProfile.ctaDetail || "");
    setOutreachTone(outreachProfile.tone);
  }, [outreachProfile]);

  const summarizeCampaigns = (rows: CampaignRow[], recipients: RecipientRow[]): CampaignSummary[] => {
    const counts = new Map<string, Pick<CampaignSummary, "queuedCount" | "sentCount" | "failedCount">>();
    recipients.forEach(recipient => {
      const current = counts.get(recipient.campaign_id) || { queuedCount: 0, sentCount: 0, failedCount: 0 };
      if (["queued", "sending"].includes(recipient.status)) current.queuedCount += 1;
      if (recipient.status === "sent") current.sentCount += 1;
      if (recipient.status === "failed") current.failedCount += 1;
      counts.set(recipient.campaign_id, current);
    });
    return rows.map(row => ({ ...row, ...(counts.get(row.id) || { queuedCount: 0, sentCount: 0, failedCount: 0 }) }));
  };

  const loadData = async () => {
    if (demoMode || !userId) return;
    setLoading(true);
    try {
      const [{ data: leadRows, error: leadError }, { data: campaignRows, error: campaignError }, { data: recipientRows, error: recipientError }] = await Promise.all([
        supabase.from("saved_leads").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("email_campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("email_campaign_recipients").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (leadError) throw leadError;
      if (campaignError) throw campaignError;
      if (recipientError) throw recipientError;
      setLeads((leadRows || []).map(getEmailLead).filter((lead): lead is EmailLead => Boolean(lead)));
      setCampaigns(summarizeCampaigns(campaignRows || [], recipientRows || []));
    } catch (error) {
      console.error("Error loading email automation data:", error);
      toast({ title: "Could not load email automation", description: "Try refreshing the workspace.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, demoMode]);

  const toggleLead = (id: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectVisibleLeads = () => {
    setSelectedIds(current => {
      const next = new Set(current);
      visibleLeads.forEach(lead => next.add(lead.id));
      return next;
    });
  };

  const insertAtCursor = (
    value: string,
    current: string,
    setter: (next: string) => void,
    ref: RefObject<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const element = ref.current;
    if (!element) {
      setter(`${current}${value}`);
      return;
    }
    const start = element.selectionStart ?? current.length;
    const end = element.selectionEnd ?? start;
    const next = `${current.slice(0, start)}${value}${current.slice(end)}`;
    setter(next);
    window.requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + value.length, start + value.length);
    });
  };

  const insertVariable = (token: string) => {
    const value = `${token}`;
    if (activeField === "subject") {
      insertAtCursor(value, subject, setSubject, subjectRef);
      return;
    }
    if (activeField === "signature") {
      insertAtCursor(value, signature, setSignature, signatureRef);
      return;
    }
    insertAtCursor(value, body, setBody, bodyRef);
  };

  const saveCampaign = async (status: "draft" | "scheduled" = "draft") => {
    if (selectedLeads.length === 0) {
      toast({ title: "Select recipients", description: "Choose at least one prospect with an email.", variant: "destructive" });
      return null;
    }
    if (demoMode || !userId) {
      toast({ title: "Demo mode", description: "Email sending is disabled in demo." });
      return null;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { data: campaign, error: campaignError } = await supabase
        .from("email_campaigns")
        .insert({
          user_id: userId,
          name,
          subject,
          body,
          signature,
          image_url: imageUrl || null,
          font_family: fontFamily,
          reply_to: replyTo || userEmail || null,
          status,
          updated_at: now,
        })
        .select("*")
        .single();

      if (campaignError) throw campaignError;

      const recipients = selectedLeads.map(lead => ({
        campaign_id: campaign.id,
        user_id: userId,
        lead_id: lead.id,
        recipient_email: lead.email,
        recipient_name: lead.personName || null,
        company_name: lead.name,
      }));

      const { error: recipientError } = await supabase.from("email_campaign_recipients").insert(recipients);
      if (recipientError) throw recipientError;

      setCampaigns(current => [{ ...campaign, queuedCount: recipients.length, sentCount: 0, failedCount: 0 }, ...current]);
      toast({ title: "Campaign saved", description: `${selectedLeads.length} recipient(s) queued.` });
      return campaign;
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast({ title: "Campaign failed", description: "Could not save the email campaign.", variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const getFunctionErrorMessage = async (error: unknown) => {
    const response = typeof error === "object" && error && "context" in error ? (error as { context?: Response }).context : null;
    if (response) {
      try {
        const payload = await response.clone().json();
        if (payload?.error) {
          const providerErrors = Array.isArray(payload.providerErrors) && payload.providerErrors.length
            ? ` Provider: ${payload.providerErrors.join("; ")}`
            : "";
          return `${String(payload.error)}${providerErrors}`;
        }
      } catch {
        // Fall through to the regular error message.
      }
    }
    return error instanceof Error ? error.message : "Could not send campaign.";
  };

  const sendCampaign = async (campaign: CampaignRow) => {
    if (!userId || demoMode) {
      toast({ title: "Demo mode", description: "Email sending is disabled in demo." });
      return;
    }

    setSendingCampaignId(campaign.id);
    setSetupError("");
    try {
      const { data, error } = await supabase.functions.invoke("send-email-campaign", {
        body: { campaignId: campaign.id, userId },
      });
      if (error) throw error;
      const result = data as { sent?: number; failed?: number; error?: string };
      if (result.error) throw new Error(result.error);
      if ((result.sent || 0) === 0 && (result.failed || 0) > 0) {
        throw new Error(`${result.failed || 0} recipient(s) failed to send.`);
      }
      toast({
        title: (result.failed || 0) > 0 ? "Campaign partially sent" : "Campaign sent",
        description: `${result.sent || 0} sent / ${result.failed || 0} failed.`,
      });
      await loadData();
    } catch (error) {
      console.error("Error sending campaign:", error);
      const message = await getFunctionErrorMessage(error);
      if (message.includes("RESEND_API_KEY")) {
        setSetupError("Email delivery is not connected yet. Add RESEND_API_KEY in Supabase secrets, then send again.");
      } else if (message.toLowerCase().includes("domain") || message.toLowerCase().includes("from")) {
        setSetupError(`Email delivery rejected the sender address. Current sender is configured in OUTREACH_FROM_EMAIL. ${message}`);
      }
      toast({ title: "Send failed", description: message, variant: "destructive" });
      await loadData();
    } finally {
      setSendingCampaignId(null);
    }
  };

  const runAiDraft = async () => {
    if (demoMode || !userId) {
      toast({ title: "Demo mode", description: "AI drafting is available after signing in." });
      return;
    }
    if (selectedLeads.length === 0) {
      toast({ title: "Select recipients", description: "Choose at least one prospect so AI can use real context.", variant: "destructive" });
      return;
    }

    setDrafting(true);
    try {
      const service = selectedLeads.find(lead => lead.selectedService)?.selectedService || "";
      const { data, error } = await supabase.functions.invoke("draft-email-campaign", {
        body: {
          userId,
          campaignName: name,
          service,
          subject,
          body,
          signature,
          emailIntent,
          emailIntentLabel: emailIntentOptions.find(option => option.value === emailIntent)?.label || "Discovery",
          emailIntentGuidance: emailIntentOptions.find(option => option.value === emailIntent)?.description || "",
          leads: selectedLeads.slice(0, 12).map(lead => ({
            name: lead.name,
            category: lead.category,
            selectedService: lead.selectedService,
            crmStatus: lead.crmStatus,
            crmPriority: lead.crmPriority,
            personName: lead.personName,
            email: lead.email,
          })),
          groupLabel: activeGroup?.label,
          groupType: activeGroup?.type,
          groupCriteria: activeGroup?.criteria,
        },
      });
      if (error) throw error;
      const result = data as { success?: boolean; source?: string; draft?: { subject?: string; body?: string; signature?: string }; error?: string };
      if (result.error || !result.draft) throw new Error(result.error || "No draft returned");
      if (result.draft.subject) setSubject(result.draft.subject);
      if (result.draft.body) setBody(result.draft.body);
      if (result.draft.signature) setSignature(result.draft.signature);
      setActiveField("body");
      toast({ title: "AI draft ready", description: result.source === "gemini" ? "Subject, message, and signature were drafted from selected recipients." : "Used a fallback draft because AI was unavailable." });
    } catch (error) {
      console.error("Error drafting email campaign:", error);
      toast({ title: "AI draft failed", description: error instanceof Error ? error.message : "Could not generate a draft.", variant: "destructive" });
    } finally {
      setDrafting(false);
    }
  };

  const draftWithAi = async () => {
    if (!hasOutreachValueProp(outreachProfile)) {
      setShowOutreachSetup(true);
      toast({ title: "Add your email context", description: "Tell AI the outcome you help clients get before drafting." });
      return;
    }
    await runAiDraft();
  };

  const saveOutreachSetup = async () => {
    if (!userId || demoMode) return;
    if (!outreachValueProp.trim()) {
      toast({ title: "Add an outcome", description: "Tell AI what result your offer creates.", variant: "destructive" });
      return;
    }

    setSavingOutreachSetup(true);
    try {
      const outreach_profile = serializeOutreachProfile({
        valueProp: outreachValueProp,
        proofPoint: outreachProofPoint,
        ctaType: outreachCtaType,
        ctaDetail: outreachCtaDetail,
        tone: outreachTone,
      });

      const { error } = await supabase.from("user_profiles").upsert({
        id: userId,
        service_type: userProfile?.service_type || "Lead research",
        service_other: userProfile?.service_other || null,
        client_type: userProfile?.client_type || "any",
        pricing_tier: userProfile?.pricing_tier || "mid_tier",
        location: userProfile?.location || null,
        sells_online: userProfile?.sells_online ?? true,
        full_name: userProfile?.full_name || null,
        company_name: userProfile?.company_name || null,
        role_title: userProfile?.role_title || null,
        company_website: userProfile?.company_website || null,
        phone: userProfile?.phone || null,
        pipeline_stage_prefs: userProfile?.pipeline_stage_prefs || null,
        outreach_profile,
      });
      if (error) throw error;

      await onProfileUpdated?.();
      setShowOutreachSetup(false);
      toast({ title: "Email context saved", description: "AI drafting will use this for future campaigns." });
      await runAiDraft();
    } catch (error) {
      console.error("Error saving outreach profile:", error);
      toast({ title: "Could not save context", description: error instanceof Error ? error.message : "Try again before drafting.", variant: "destructive" });
    } finally {
      setSavingOutreachSetup(false);
    }
  };

  const handleSendNow = async () => {
    const campaign = await saveCampaign("draft");
    if (campaign) await sendCampaign(campaign);
  };

  return (
    <section className="flex h-full flex-col overflow-hidden bg-black text-[#f3f5f8]">
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="border-b border-[#f3f5f8]/[0.14] pb-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#e8fb52]">Email automations</p>
          <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-2xl font-black tracking-[-0.04em]">Send prospect emails</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9aa3b2]">
                Build a focused outreach batch from prospects with public emails. Every send uses your selected recipients and campaign copy.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-widest text-[#5d6675] sm:min-w-[330px]">
              <span className="rounded-[9px] border border-[#f3f5f8]/10 bg-[#111319] p-3"><b className="block text-xl text-[#f3f5f8]">{leads.length}</b>Email leads</span>
              <span className="rounded-[9px] border border-[#f3f5f8]/10 bg-[#111319] p-3"><b className="block text-xl text-[#f3f5f8]">{selectedLeads.length}</b>Selected</span>
              <span className="rounded-[9px] border border-[#f3f5f8]/10 bg-[#111319] p-3"><b className="block text-xl text-[#f3f5f8]">{campaigns.length}</b>Campaigns</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid flex-1 place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#e8fb52]" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_430px]">
            <div className="min-h-0 overflow-hidden rounded-[14px] border border-[#f3f5f8]/[0.1] bg-[#0b0d11]">
              <div className="border-b border-[#f3f5f8]/[0.08] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-sm font-bold">Audience filters</p>
                  {activeGroup && (
                    <button type="button" onClick={() => setActiveGroupId(null)} className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-[#f3f5f8]/10 px-2 font-mono text-[9px] uppercase tracking-widest text-[#9aa3b2] hover:border-[#e8fb52]/50 hover:text-[#f3f5f8]">
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-2 max-h-28 space-y-1.5 overflow-y-auto pr-1">
                  {smartGroupSections.map(section => {
                    const groups = smartGroups.filter(group => group.type === section.type);
                    if (groups.length === 0) return null;
                    return (
                      <div key={section.type} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">{section.label}</span>
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                          {groups.map(group => {
                            const Icon = smartGroupIcons[group.type];
                            const active = activeGroupId === group.id;
                            return (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() => setActiveGroupId(group.id)}
                                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border px-2.5 text-xs transition-all hover:border-[#e8fb52]/45 hover:bg-[#f3f5f8]/[0.035] ${active ? "border-[#e8fb52]/70 bg-[#e8fb52] font-bold text-black" : "border-[#f3f5f8]/10 bg-black/25 text-[#d7dde8]"}`}
                                title={`${smartGroupTypeLabels[group.type]}: ${group.label}`}
                              >
                                <Icon className={`h-3.5 w-3.5 ${active ? "text-black" : "text-[#e8fb52]"}`} />
                                <span className="max-w-36 truncate">{group.label}</span>
                                <span className={`font-mono text-[10px] ${active ? "text-black/70" : "text-[#9aa3b2]"}`}>{group.count}</span>
                                {group.selectedCount > 0 && <span className={`font-mono text-[10px] ${active ? "text-black" : "text-[#e8fb52]"}`}>{group.selectedCount} sel</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-b border-[#f3f5f8]/[0.08] p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold">{activeGroup?.label || "All email-ready leads"}</p>
                    <p className="mt-0.5 text-xs text-[#5d6675]">
                      {visibleLeads.length} recipients visible / {visibleSelectedCount} visible selected / {selectedLeads.length} total selected
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={selectVisibleLeads} disabled={visibleLeads.length === 0} className="rounded-[8px] border border-[#e8fb52]/45 bg-[#e8fb52]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52] hover:bg-[#e8fb52] hover:text-black disabled:opacity-40">
                      {activeGroup ? "Select all in this group" : "Select visible"}
                    </button>
                    <button type="button" onClick={() => setSelectedIds(new Set())} disabled={selectedLeads.length === 0} className="rounded-[8px] border border-[#f3f5f8]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] hover:border-[#ff5c49]/50 hover:text-[#ff7a68] disabled:opacity-40">
                      Clear selected
                    </button>
                  </div>
                </div>
                <label className="relative mt-3 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6675]" />
                  <input
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder="Search company, person, email, industry, service, or stage"
                    className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black pl-9 pr-3 text-sm text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60"
                  />
                </label>
              </div>

              <div className="h-full max-h-[calc(100vh-320px)] overflow-y-auto">
                {leads.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                    <Mail className="mb-4 h-9 w-9 text-[#5d6675]" />
                    <p className="font-display text-xl font-bold">No email-ready prospects yet.</p>
                    <p className="mt-2 text-sm text-[#9aa3b2]">Run a search with public emails or enrich contacts first.</p>
                  </div>
                ) : visibleLeads.length === 0 ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                    <Search className="mb-4 h-9 w-9 text-[#5d6675]" />
                    <p className="font-display text-xl font-bold">No matching recipients.</p>
                    <p className="mt-2 text-sm text-[#9aa3b2]">Clear the group or search to return to all email-ready leads.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f3f5f8]/[0.06]">
                    {visibleLeads.map(lead => {
                      const selected = selectedIds.has(lead.id);
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => toggleLead(lead.id)}
                          className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-all hover:bg-[#f3f5f8]/[0.025] ${selected ? "bg-[#e8fb52]/[0.05]" : ""}`}
                        >
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border ${selected ? "border-[#e8fb52] bg-[#e8fb52] text-black" : "border-[#f3f5f8]/15 text-transparent"}`}>
                            <CheckCheck className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-display text-sm font-bold text-[#f3f5f8]">{lead.personName || lead.name}</p>
                              {lead.score !== null && <span className="rounded-[6px] border border-[#e8fb52]/30 bg-[#e8fb52]/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-[#e8fb52]">{lead.score}</span>}
                            </div>
                            <p className="mt-1 truncate text-xs text-[#9aa3b2]">{lead.name}</p>
                            <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
                              <Mail className="h-3 w-3 text-[#e8fb52]" />
                              {lead.email}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-[6px] border border-[#f3f5f8]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#9aa3b2]">{titleCase(lead.category)}</span>
                              <span className="rounded-[6px] border border-[#f3f5f8]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#9aa3b2]">{getStageLabel(lead.crmStatus)}</span>
                              <span className={`rounded-[6px] border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${lead.crmPriority.toLowerCase() === "high" ? "border-[#e8fb52]/30 text-[#e8fb52]" : "border-[#f3f5f8]/10 text-[#9aa3b2]"}`}>{getPriorityLabel(lead.crmPriority)}</span>
                              {lead.selectedService && <span className="rounded-[6px] border border-[#5fe3a1]/20 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#5fe3a1]">{lead.selectedService}</span>}
                            </div>
                          </div>
                          <div className="hidden text-right sm:block">
                            <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">{getStageLabel(lead.crmStatus)}</p>
                            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">{getPriorityLabel(lead.crmPriority)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <aside className="min-h-0 overflow-y-auto rounded-[14px] border border-[#f3f5f8]/[0.1] bg-[#111319]">
              <div className="border-b border-[#f3f5f8]/[0.08] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#e8fb52]">Campaign</p>
                  <button
                    type="button"
                    onClick={() => void draftWithAi()}
                    disabled={drafting || selectedLeads.length === 0}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e8fb52]/40 bg-[#e8fb52]/10 px-2.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#e8fb52] hover:bg-[#e8fb52] hover:text-black disabled:opacity-40"
                  >
                    {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    AI draft
                  </button>
                </div>
                <input value={name} onChange={event => setName(event.target.value)} className="mt-3 h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60" />
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Email type</span>
                    <span className="text-xs text-[#5d6675]">Guides AI draft</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {emailIntentOptions.map(option => {
                      const selected = emailIntent === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setEmailIntent(option.value)}
                          className={`rounded-[9px] border p-2.5 text-left transition-colors ${selected ? "border-[#e8fb52]/70 bg-[#e8fb52]/10" : "border-[#f3f5f8]/10 bg-black/35 hover:border-[#f3f5f8]/25"}`}
                        >
                          <span className={`block font-display text-sm font-bold ${selected ? "text-[#e8fb52]" : "text-[#f3f5f8]"}`}>{option.label}</span>
                          <span className="mt-1 block text-xs leading-4 text-[#9aa3b2]">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {showOutreachSetup && (
                  <div className="rounded-[10px] border border-[#e8fb52]/25 bg-[#e8fb52]/[0.06] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-bold text-[#f3f5f8]">Email writing context</p>
                        <p className="mt-1 text-xs leading-5 text-[#9aa3b2]">Add the outcome you create so AI can write specific, human outreach.</p>
                      </div>
                      <button type="button" onClick={() => setShowOutreachSetup(false)} className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] border border-[#f3f5f8]/10 text-[#9aa3b2] hover:text-[#f3f5f8]">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 space-y-3">
                      <textarea
                        value={outreachValueProp}
                        onChange={event => setOutreachValueProp(event.target.value)}
                        placeholder="Example: We help local clinics turn outdated websites into booking-focused pages that bring in more patient inquiries."
                        className="h-20 w-full resize-none rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black p-3 text-sm leading-5 text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60"
                      />
                      <input
                        value={outreachProofPoint}
                        onChange={event => setOutreachProofPoint(event.target.value)}
                        placeholder="Proof point, optional"
                        className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select value={outreachCtaType} onChange={event => setOutreachCtaType(event.target.value as OutreachCtaType)} className="h-10 rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60">
                          {outreachCtaOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <select value={outreachTone} onChange={event => setOutreachTone(event.target.value as OutreachTone)} className="h-10 rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60">
                          {outreachToneOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                      {(outreachCtaType === "book_call" || outreachCtaType === "custom") && (
                        <input
                          value={outreachCtaDetail}
                          onChange={event => setOutreachCtaDetail(event.target.value)}
                          placeholder={outreachCtaType === "book_call" ? "Booking link" : "Custom ask"}
                          className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60"
                        />
                      )}
                      <button type="button" onClick={() => void saveOutreachSetup()} disabled={savingOutreachSetup || !outreachValueProp.trim()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[9px] border border-[#e8fb52] bg-[#e8fb52] font-display text-sm font-bold text-black hover:bg-[#f3ff8a] disabled:opacity-40">
                        {savingOutreachSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Save and draft
                      </button>
                    </div>
                  </div>
                )}
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Subject</span>
                  <input ref={subjectRef} value={subject} onFocus={() => setActiveField("subject")} onChange={event => setSubject(event.target.value)} className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Reply-to</span>
                  <input value={replyTo} onChange={event => setReplyTo(event.target.value)} placeholder={userEmail || "you@example.com"} className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]"><Type className="h-3 w-3" /> Font</span>
                    <select value={fontFamily} onChange={event => setFontFamily(event.target.value)} className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60">
                      {fontOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]"><Image className="h-3 w-3" /> Image URL</span>
                    <input value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://..." className="h-10 w-full rounded-[9px] border border-[#f3f5f8]/[0.13] bg-black px-3 text-sm text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/60" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Message</span>
                  <textarea ref={bodyRef} value={body} onFocus={() => setActiveField("body")} onChange={event => setBody(event.target.value)} className="h-44 w-full resize-none rounded-[10px] border border-[#f3f5f8]/[0.13] bg-black p-3 text-sm leading-6 text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Signature</span>
                  <textarea ref={signatureRef} value={signature} onFocus={() => setActiveField("signature")} onChange={event => setSignature(event.target.value)} className="h-24 w-full resize-none rounded-[10px] border border-[#f3f5f8]/[0.13] bg-black p-3 text-sm leading-6 text-[#f3f5f8] outline-none focus:border-[#e8fb52]/60" />
                </label>

                <div className="rounded-[10px] border border-[#f3f5f8]/10 bg-black/45 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Variables</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">Insert into {activeField}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {templateVariables.map(variable => (
                      <button
                        key={variable.token}
                        type="button"
                        onClick={() => insertVariable(variable.token)}
                        className="rounded-[7px] border border-[#e8fb52]/35 bg-[#e8fb52]/10 px-2 py-1 font-mono text-[10px] font-bold text-[#e8fb52] transition-colors hover:bg-[#e8fb52] hover:text-black"
                      >
                        {variable.token}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#f3f5f8]/10 bg-black/45 p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Preview</p>
                  <div className="mt-3 rounded-[8px] bg-white p-4 text-[#111827]" style={{ fontFamily }}>
                    {imageUrl && <img src={imageUrl} alt="" className="mb-3 max-h-32 w-full rounded-[6px] object-cover" />}
                    <p className="text-sm font-bold">{renderTemplate(subject, previewLead)}</p>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-6">{previewBody}</div>
                    {previewSignature && <div className="mt-4 whitespace-pre-wrap border-t border-[#e5e7eb] pt-3 text-sm leading-6">{previewSignature}</div>}
                  </div>
                </div>
                {setupError && (
                  <div className="rounded-[10px] border border-[#ffb23e]/30 bg-[#ffb23e]/10 p-3 text-xs leading-5 text-[#ffd39a]">
                    {setupError}
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => void saveCampaign("draft")} disabled={saving || selectedLeads.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-[9px] border border-[#f3f5f8]/15 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] hover:border-[#e8fb52]/50 hover:text-[#f3f5f8] disabled:opacity-40">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Save draft
                  </button>
                  <button type="button" onClick={() => void handleSendNow()} disabled={saving || Boolean(sendingCampaignId) || selectedLeads.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-[9px] border border-[#e8fb52] bg-[#e8fb52] font-display text-sm font-bold text-black hover:bg-[#f3ff8a] disabled:opacity-40">
                    {saving || sendingCampaignId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send now
                  </button>
                </div>
              </div>

              <div className="border-t border-[#f3f5f8]/[0.08] p-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#5d6675]">Recent campaigns</p>
                <div className="space-y-2">
                  {sortedCampaigns.length === 0 ? (
                    <p className="text-sm text-[#5d6675]">No campaigns yet.</p>
                  ) : sortedCampaigns.map(campaign => (
                    <div key={campaign.id} className="rounded-[10px] border border-[#f3f5f8]/10 bg-black/45 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-bold text-[#f3f5f8]">{campaign.name}</p>
                          <p className="mt-1 truncate text-xs text-[#9aa3b2]">{campaign.subject}</p>
                        </div>
                        <span className="rounded-[6px] border border-[#f3f5f8]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">{campaign.status}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                        <span className="rounded-[6px] border border-[#f3f5f8]/10 px-2 py-1">{campaign.queuedCount} queued</span>
                        <span className="rounded-[6px] border border-[#5fe3a1]/20 px-2 py-1 text-[#5fe3a1]">{campaign.sentCount} sent</span>
                        <span className="rounded-[6px] border border-[#ff5c49]/20 px-2 py-1 text-[#ff7a68]">{campaign.failedCount} failed</span>
                      </div>
                      {["draft", "failed"].includes(campaign.status) && campaign.queuedCount + campaign.failedCount > 0 && (
                        <button type="button" onClick={() => void sendCampaign(campaign)} disabled={sendingCampaignId === campaign.id} className="mt-3 inline-flex h-9 items-center gap-2 rounded-[8px] border border-[#e8fb52]/40 px-3 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52] hover:bg-[#e8fb52]/10">
                          {sendingCampaignId === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Send
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
};

export default EmailAutomation;
