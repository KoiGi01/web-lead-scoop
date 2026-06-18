import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CheckCheck, Image, Loader2, Mail, Send, Sparkles, Type } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

interface EmailAutomationProps {
  userId: string | undefined;
  userEmail?: string;
  demoMode?: boolean;
}

type SavedLeadRow = Tables<"saved_leads">;
type CampaignRow = Tables<"email_campaigns">;
type RecipientRow = Tables<"email_campaign_recipients">;

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
  email: string;
  personName: string;
  score: number | null;
}

interface CampaignSummary extends CampaignRow {
  queuedCount: number;
  sentCount: number;
  failedCount: number;
}

const demoLeads: EmailLead[] = [
  { id: "demo-1", name: "BrightSmile Dental Clinic", category: "dental clinic", selectedService: "Web design", email: "sofia@brightsmile.example", personName: "Dr. Sofia Almeida", score: 92 },
  { id: "demo-2", name: "Austin Cosmetic Dentistry", category: "cosmetic dentist", selectedService: "Web design", email: "mark@austincosmetic.example", personName: "Mark Collins", score: 81 },
  { id: "demo-3", name: "Zilker Dental Co", category: "dental clinic", selectedService: "Web design", email: "elena@zilkerdental.example", personName: "Dr. Elena Cruz", score: 88 },
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

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

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
  const email = contact?.email || emails[0] || "";
  if (!email) return null;

  const intelligence = (lead.intelligence || {}) as { opportunityScore?: number };
  const personName = contact?.fullName || [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || "";
  return {
    id: lead.id,
    name: lead.name || "Unnamed company",
    category: lead.category || "Uncategorized",
    selectedService: lead.selected_service || "",
    email,
    personName,
    score: typeof intelligence.opportunityScore === "number" ? intelligence.opportunityScore : null,
  };
};

const EmailAutomation = ({ userId, userEmail, demoMode = false }: EmailAutomationProps) => {
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
  const [imageUrl, setImageUrl] = useState("");
  const [fontFamily, setFontFamily] = useState(fontOptions[0].value);
  const [activeField, setActiveField] = useState<ComposerField>("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const signatureRef = useRef<HTMLTextAreaElement>(null);

  const selectedLeads = useMemo(() => leads.filter(lead => selectedIds.has(lead.id)), [leads, selectedIds]);
  const previewLead = selectedLeads[0] || leads[0] || null;
  const previewBody = renderTemplate(body, previewLead);
  const previewSignature = renderTemplate(signature, previewLead);
  const sortedCampaigns = useMemo(() => [...campaigns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [campaigns]);

  useEffect(() => {
    if (userEmail && !replyTo) setReplyTo(userEmail);
  }, [replyTo, userEmail]);

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
        const payload = await response.json();
        if (payload?.error) return String(payload.error);
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
      toast({ title: "Campaign sent", description: `${result.sent || 0} sent · ${result.failed || 0} failed.` });
      await loadData();
    } catch (error) {
      console.error("Error sending campaign:", error);
      const message = await getFunctionErrorMessage(error);
      if (message.includes("RESEND_API_KEY")) {
        setSetupError("Email delivery is not connected yet. Add RESEND_API_KEY in Supabase secrets, then send again.");
      }
      toast({ title: "Send failed", description: message, variant: "destructive" });
    } finally {
      setSendingCampaignId(null);
    }
  };

  const draftWithAi = async () => {
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
          leads: selectedLeads.slice(0, 12).map(lead => ({
            name: lead.name,
            category: lead.category,
            selectedService: lead.selectedService,
            personName: lead.personName,
            email: lead.email,
          })),
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
              <div className="flex items-center justify-between gap-3 border-b border-[#f3f5f8]/[0.08] p-3">
                <div>
                  <p className="font-display text-sm font-bold">Recipients</p>
                  <p className="mt-0.5 text-xs text-[#5d6675]">Prospects with at least one email address.</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedIds(new Set(leads.map(lead => lead.id)))} className="rounded-[8px] border border-[#f3f5f8]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] hover:border-[#e8fb52]/50 hover:text-[#f3f5f8]">
                    Select all
                  </button>
                  <button type="button" onClick={() => setSelectedIds(new Set())} className="rounded-[8px] border border-[#f3f5f8]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2] hover:border-[#ff5c49]/50 hover:text-[#ff7a68]">
                    Clear
                  </button>
                </div>
              </div>

              <div className="h-full max-h-[calc(100vh-230px)] overflow-y-auto">
                {leads.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                    <Mail className="mb-4 h-9 w-9 text-[#5d6675]" />
                    <p className="font-display text-xl font-bold">No email-ready prospects yet.</p>
                    <p className="mt-2 text-sm text-[#9aa3b2]">Run a search with public emails or enrich contacts first.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f3f5f8]/[0.06]">
                    {leads.map(lead => {
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
                          </div>
                          <div className="hidden text-right sm:block">
                            <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">{lead.category.replace(/_/g, " ")}</p>
                            {lead.selectedService && <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">{lead.selectedService}</p>}
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
