import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCheck, ExternalLink, Globe, Loader2, Mail, Phone, Plus, UserRound } from "lucide-react";

import AuthModal from "@/components/auth/AuthModal";
import GlobaLeadsLogo from "@/components/brand/GlobaLeadsLogo";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface PreviewContact {
  email?: string;
  fullName?: string;
  title?: string;
  linkedinUrl?: string;
  source?: string;
  decisionMakerScore?: number;
}

interface PreviewLead {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  category?: string;
  selected_service?: string | null;
  emails?: string[];
  whatsapp?: string[];
  contacts?: PreviewContact[];
  linkedin_url?: string | null;
  social_links?: string[];
  contact_page_found?: boolean;
  intelligence?: unknown;
  quality_score?: number | null;
  quality_label?: string | null;
  quality_reason?: string | null;
}

interface PreviewConfig {
  industry?: string;
  location?: string;
  selectedService?: string;
  opportunitySignals?: string[];
  depth?: string;
  enrichMode?: boolean;
}

interface LeadListPreviewRow {
  id: string;
  token: string;
  title: string;
  description: string;
  search_config: PreviewConfig;
  leads: PreviewLead[];
  lead_count: number;
  created_at: string;
}

const appUrl = "https://app.globaleads22.com";

const getPendingImportKey = (token: string) => `gl22:pending-preview-import:${token}`;

const asPreviewLeads = (value: unknown): PreviewLead[] => (Array.isArray(value) ? value as PreviewLead[] : []);

const compactUrl = (url = "") => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

const getTopContact = (lead: PreviewLead) =>
  [...(lead.contacts || [])].sort((a, b) => (b.decisionMakerScore || 0) - (a.decisionMakerScore || 0))[0];

const LeadListPreview = () => {
  const { token = "" } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<LeadListPreviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const leads = useMemo(() => asPreviewLeads(preview?.leads), [preview?.leads]);
  const emailCount = useMemo(() => leads.reduce((acc, lead) => acc + (lead.emails?.length || 0), 0), [leads]);
  const contactCount = useMemo(() => leads.reduce((acc, lead) => acc + (lead.contacts?.length || 0), 0), [leads]);

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("lead_list_previews")
        .select("id, token, title, description, search_config, leads, lead_count, created_at")
        .eq("token", token)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Error loading lead list preview:", error);
        toast({ title: "Preview unavailable", description: "This shared list could not be loaded.", variant: "destructive" });
      }

      setPreview(data as LeadListPreviewRow | null);
      setLoading(false);
    };

    if (token) void loadPreview();
    return () => {
      active = false;
    };
  }, [token]);

  const importPreview = async () => {
    if (!preview || !user?.id || importing || imported) return;

    setImporting(true);
    try {
      const config = preview.search_config || {};
      const { data: session, error: sessionError } = await supabase
        .from("search_sessions")
        .insert({
          user_id: user.id,
          keyword: config.industry || preview.title,
          location: config.location || "",
          selected_service: config.selectedService || null,
          opportunity_signals: config.opportunitySignals || [],
          depth: config.depth || "preview",
          enrich_mode: Boolean(config.enrichMode),
          usage_type: "preview_import",
          status: "completed",
          lead_count: leads.length,
          email_count: emailCount,
          whatsapp_count: leads.reduce((acc, lead) => acc + (lead.whatsapp?.length || 0), 0),
          credits_used: 0,
          estimated_cost_usd: 0,
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;

      const payload = leads.map(lead => ({
        user_id: user.id,
        session_id: session.id,
        selected_service: lead.selected_service || config.selectedService || null,
        name: lead.name || "",
        address: lead.address || "",
        phone: lead.phone || "",
        website: lead.website || "",
        category: lead.category || "",
        emails: lead.emails || [],
        whatsapp: lead.whatsapp || [],
        contact_page_found: Boolean(lead.contact_page_found),
        contacts: lead.contacts || [],
        linkedin_url: lead.linkedin_url || null,
        social_links: lead.social_links || [],
        intelligence: lead.intelligence || null,
      }));

      const { error: leadsError } = await supabase.from("saved_leads").insert(payload);
      if (leadsError) throw leadsError;

      window.localStorage.removeItem(getPendingImportKey(token));
      setImported(true);
      toast({ title: "Added to pipeline", description: `${leads.length} lead(s) were added to your workspace.` });
    } catch (error) {
      console.error("Error importing preview list:", error);
      toast({ title: "Import failed", description: "Could not add this list to your pipeline.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleAddToPipeline = () => {
    if (!user) {
      window.localStorage.setItem(getPendingImportKey(token), "1");
      setAuthOpen(true);
      return;
    }

    void importPreview();
  };

  useEffect(() => {
    if (!authLoading && user && preview && window.localStorage.getItem(getPendingImportKey(token)) === "1") {
      void importPreview();
    }
    // importPreview intentionally stays out of deps; it uses current component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, preview?.id, token]);

  if (loading || authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#08090c] text-[#f3f5f8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#e8fb52]" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#08090c] px-6 text-center text-[#f3f5f8]">
        <div>
          <GlobaLeadsLogo size="md" theme="dark" />
          <h1 className="mt-8 font-display text-3xl font-black">Preview not found</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#9aa3b2]">This shared lead list may have expired or the link may be incorrect.</p>
          <Link to="/" className="mt-6 inline-flex border border-[#e8fb52] bg-[#e8fb52] px-4 py-2 font-display text-sm font-bold text-black">
            Back to GlobaLeads22
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090c] text-[#f3f5f8]">
      <header className="sticky top-0 z-20 border-b border-[#f3f5f8]/[0.08] bg-[#08090c]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <GlobaLeadsLogo size="sm" theme="dark" />
          <div className="ml-auto flex items-center gap-2">
            {user && <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[#5d6675] sm:inline">{user.email}</span>}
            <Button
              type="button"
              onClick={handleAddToPipeline}
              disabled={importing || imported || leads.length === 0}
              className="h-10 rounded-none border border-[#e8fb52] bg-[#e8fb52] px-4 font-display text-sm font-bold text-black hover:bg-[#f3ff8a] hover:text-black disabled:opacity-50"
            >
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : imported ? <CheckCheck className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {imported ? "Added" : "Add to pipeline"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="border border-[#f3f5f8]/[0.12] bg-[#111319] p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#e8fb52]">Shared lead list</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-3xl font-black leading-tight tracking-[-0.04em] text-[#f3f5f8] sm:text-4xl">{preview.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9aa3b2]">
                {preview.description || "A curated GlobaLeads22 preview list with public business signals and outreach context."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-widest text-[#5d6675] sm:min-w-[320px]">
              <span className="border border-[#f3f5f8]/10 bg-black/40 p-3"><b className="block text-xl text-[#f3f5f8]">{leads.length}</b>Leads</span>
              <span className="border border-[#f3f5f8]/10 bg-black/40 p-3"><b className="block text-xl text-[#f3f5f8]">{emailCount}</b>Emails</span>
              <span className="border border-[#f3f5f8]/10 bg-black/40 p-3"><b className="block text-xl text-[#f3f5f8]">{contactCount}</b>People</span>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-2">
          {leads.map((lead, index) => {
            const contact = getTopContact(lead);
            const score = lead.quality_score ?? (typeof (lead.intelligence as { opportunityScore?: unknown } | null)?.opportunityScore === "number" ? (lead.intelligence as { opportunityScore: number }).opportunityScore : null);
            return (
              <article key={`${lead.name || "lead"}-${index}`} className="border border-[#f3f5f8]/[0.12] bg-[#111319] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-bold text-[#f3f5f8]">{lead.name || "Unnamed business"}</h2>
                    <p className="mt-1 line-clamp-1 text-xs text-[#5d6675]">{lead.address || lead.category || "No location listed"}</p>
                  </div>
                  {score !== null && (
                    <span className="shrink-0 border border-[#e8fb52]/35 bg-[#e8fb52]/10 px-2 py-1 font-mono text-[10px] font-bold text-[#e8fb52]">
                      {score}
                    </span>
                  )}
                </div>

                <div className="mt-3 border border-[#f3f5f8]/10 bg-black/35 p-3">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#e8fb52]">Why this prospect</p>
                  <p className="mt-1 text-xs leading-5 text-[#9aa3b2]">{lead.quality_reason || "Public business signals indicate a possible outreach opportunity."}</p>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Contact path</p>
                    <div className="mt-2 space-y-2">
                      {lead.emails?.[0] && <p className="flex min-w-0 items-center gap-2 truncate font-mono text-xs text-[#e8fb52]"><Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{lead.emails[0]}</span></p>}
                      {lead.phone && <p className="flex items-center gap-2 font-mono text-xs text-[#9aa3b2]"><Phone className="h-3.5 w-3.5" /> {lead.phone}</p>}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 truncate font-mono text-xs text-[#9aa3b2] hover:text-[#f3f5f8]">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{compactUrl(lead.website)}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="border border-[#f3f5f8]/10 bg-black p-3">
                    <p className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                      <UserRound className="h-3.5 w-3.5" />
                      Likely decision maker
                    </p>
                    {contact ? (
                      <>
                        <p className="font-display text-sm font-bold text-[#f3f5f8]">{contact.fullName || contact.email || "Contact found"}</p>
                        {contact.title && <p className="mt-1 text-xs text-[#9aa3b2]">{contact.title}</p>}
                      </>
                    ) : (
                      <p className="text-xs text-[#5d6675]">No named contact in this preview.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} redirectTo={window.location.href} />
    </div>
  );
};

export default LeadListPreview;
