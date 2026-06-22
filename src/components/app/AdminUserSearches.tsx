import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Search as SearchIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type SearchSession = Tables<"search_sessions">;

interface SessionLead {
  id: string;
  name: string | null;
  website: string | null;
  category: string | null;
  selected_service: string | null;
  emails: unknown;
  phone: string | null;
  contacts: unknown;
  crm_status: string;
  created_at: string;
}

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateTimeFmt.format(date);
};

const countArray = (value: unknown) => (Array.isArray(value) ? value.length : 0);

const modeBadge = (session: SearchSession) => {
  const depth = session.depth ? session.depth[0].toUpperCase() + session.depth.slice(1) : "Search";
  return `${depth} · ${session.enrich_mode ? "Enrich" : "Normal"}`;
};

interface LeadsState {
  loading: boolean;
  error: string | null;
  leads: SessionLead[] | null;
}

const AdminUserSearches = ({ userId, userEmail }: { userId: string; userEmail: string }) => {
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [leadsBySession, setLeadsBySession] = useState<Record<string, LeadsState>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExpandedId(null);
    setLeadsBySession({});

    void (async () => {
      const { data, error } = await supabase
        .from("search_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) {
        console.error("Failed to load user searches:", error);
        setSessions([]);
      } else {
        setSessions(data || []);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = async (session: SearchSession) => {
    if (expandedId === session.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(session.id);
    if (leadsBySession[session.id]?.leads || leadsBySession[session.id]?.loading) return;

    setLeadsBySession(current => ({ ...current, [session.id]: { loading: true, error: null, leads: null } }));
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "get_session_leads", sessionId: session.id },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Failed to load leads");
      setLeadsBySession(current => ({
        ...current,
        [session.id]: { loading: false, error: null, leads: (data?.leads || []) as SessionLead[] },
      }));
    } catch (err) {
      setLeadsBySession(current => ({
        ...current,
        [session.id]: {
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load leads",
          leads: null,
        },
      }));
    }
  };

  return (
    <div className="border border-[#f3f5f8]/10 bg-black p-3">
      <div className="mb-3 flex items-center gap-2">
        <SearchIcon className="h-4 w-4 text-[#e8fb52]" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Searches</p>
        {!loading && <span className="font-mono text-[10px] text-[#5d6675]">({sessions.length})</span>}
      </div>

      {loading ? (
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Loading searches...</p>
      ) : !sessions.length ? (
        <p className="text-sm text-[#9aa3b2]">{userEmail} has not run any searches.</p>
      ) : (
        <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {sessions.map(session => {
            const isOpen = expandedId === session.id;
            const leadState = leadsBySession[session.id];
            return (
              <div key={session.id} className="border border-[#f3f5f8]/10 bg-[#0d0f13]">
                <button
                  onClick={() => toggle(session)}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-[#f3f5f8]/5"
                >
                  {isOpen ? (
                    <ChevronDown className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#e8fb52]" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#5d6675]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm text-[#f3f5f8]" title={session.keyword}>
                        {session.keyword || "(no keyword)"}
                      </p>
                      <span className="flex-shrink-0 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                        {formatDateTime(session.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[#9aa3b2]" title={session.location}>
                      {session.location || "(no location)"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                      <span className="text-[#e8fb52]">{modeBadge(session)}</span>
                      {session.selected_service && <span>{session.selected_service}</span>}
                      <span className="text-[#f3f5f8]">{session.lead_count} leads</span>
                      <span>{session.email_count} email</span>
                      <span>{session.whatsapp_count} wa</span>
                      <span>{session.credits_used} cr</span>
                      {session.usage_type !== "customer" && <span className="text-[#e8fb52]">{session.usage_type}</span>}
                      {session.status && session.status !== "completed" && (
                        <span className="text-[#ff8a7c]">{session.status}</span>
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[#f3f5f8]/10 px-3 py-2">
                    {leadState?.loading ? (
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Loading leads...</p>
                    ) : leadState?.error ? (
                      <p className="font-mono text-[10px] uppercase tracking-widest text-[#ff8a7c]">{leadState.error}</p>
                    ) : leadState?.leads && leadState.leads.length ? (
                      <div className="space-y-1.5">
                        {leadState.leads.map(lead => (
                          <div key={lead.id} className="flex items-start justify-between gap-2 border-b border-[#f3f5f8]/[0.06] pb-1.5 last:border-0 last:pb-0">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs text-[#f3f5f8]" title={lead.name || ""}>
                                {lead.name || "(unnamed)"}
                              </p>
                              <p className="truncate text-[10px] text-[#5d6675]" title={lead.website || ""}>
                                {lead.website || lead.category || "-"}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
                              <p className="text-[#9aa3b2]">{countArray(lead.emails)} email</p>
                              <p>{lead.crm_status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#9aa3b2]">This search saved no leads.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminUserSearches;
