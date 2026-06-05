import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Building2, RefreshCw, Save, Search, ShieldCheck, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { PLAN_LABELS, type PlanKey } from "@/lib/entitlements";

type UsageEvent = Tables<"api_usage_events">;
type CreditTransaction = Tables<"credit_transactions">;
type SearchSession = Tables<"search_sessions">;
type StripePayment = Tables<"stripe_payments">;

interface AdminDashboardProps {
  onBackToSearch: () => void;
  onUserCreditsChanged?: () => void;
}

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role_title: string | null;
  company_name: string | null;
  company_website: string | null;
  phone: string | null;
  date_joined: string | null;
  last_sign_in_at: string | null;
  last_activity_at: string | null;
  credits_left: number;
  plan: PlanKey;
  role: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  included_monthly_credits: number;
  leads_generated: number;
  searches_run: number;
  organization_id: string | null;
  organization_name: string | null;
  organization_role: string | null;
  payment_count: number;
  gross_revenue_usd: number;
  net_revenue_usd: number;
  credits_purchased: number;
  last_payment_at: string | null;
}

interface OrganizationRow {
  id: string;
  name: string;
  owner_user_id: string;
  plan: string;
  seat_limit: number;
}

interface ProviderAccountStatus {
  provider: "google" | "firecrawl" | "hunter";
  label: string;
  status: "ok" | "warning" | "error" | "not_configured" | "unsupported";
  remaining: number | null;
  limit: number | null;
  used: number | null;
  reset_at: string | null;
  balance_label: string;
  note: string;
  checked_at: string;
  internal_usage: {
    events_24h: number;
    units_24h: number;
    estimated_cost_24h_usd: number;
    failures_24h: number;
    events_30d: number;
    units_30d: number;
    estimated_cost_30d_usd: number;
  };
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "2-digit" });
const compactNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const sum = <T,>(items: T[], getValue: (item: T) => number | null | undefined) =>
  items.reduce((acc, item) => acc + Number(getValue(item) || 0), 0);

const formatDate = (value: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Never" : dateFmt.format(date);
};

const AdminDashboard = ({ onBackToSearch, onUserCreditsChanged }: AdminDashboardProps) => {
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [searchSessions, setSearchSessions] = useState<SearchSession[]>([]);
  const [stripePayments, setStripePayments] = useState<StripePayment[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<ProviderAccountStatus[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");

  const selectedUser = users.find(user => user.id === selectedUserId) || users[0] || null;

  const loadDashboard = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usage, credits, sessions, payments, adminUsers, providerStatus] = await Promise.all([
      supabase.from("api_usage_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("credit_transactions").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("search_sessions").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.from("stripe_payments").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.functions.invoke("admin-users", { body: { action: "list_users" } }),
      supabase.functions.invoke("admin-provider-status", { body: {} }),
    ]);

    if (!usage.error) setUsageEvents(usage.data || []);
    if (!credits.error) setCreditTransactions(credits.data || []);
    if (!sessions.error) setSearchSessions(sessions.data || []);
    if (!payments.error) setStripePayments(payments.data || []);
    if (!adminUsers.error && adminUsers.data) {
      setUsers(adminUsers.data.users || []);
      setOrganizations(adminUsers.data.organizations || []);
      setSelectedUserId(current => current || adminUsers.data.users?.[0]?.id || null);
    } else if (adminUsers.error) {
      toast({ title: "Admin users failed", description: adminUsers.error.message, variant: "destructive" });
    }
    if (!providerStatus.error && providerStatus.data) {
      setProviderStatuses(providerStatus.data.providers || []);
    } else if (providerStatus.error) {
      toast({ title: "Provider status failed", description: providerStatus.error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const revenue = sum(stripePayments, payment => payment.net_usd);
    const grossRevenue = sum(stripePayments, payment => payment.gross_usd);
    const vendorCost = sum(usageEvents, event => event.estimated_cost_usd);
    const creditsSold = sum(creditTransactions.filter(tx => tx.type === "purchase" || tx.type === "subscription_grant"), tx => tx.amount);
    const creditsSpent = Math.abs(sum(creditTransactions.filter(tx => tx.type === "spend"), tx => tx.amount));
    const creditsRefunded = sum(creditTransactions.filter(tx => tx.type === "refund"), tx => tx.amount);
    const internalSearches = searchSessions.filter(session => session.usage_type !== "customer").length;
    const customerSearches = searchSessions.filter(session => session.usage_type === "customer").length;

    return {
      grossRevenue,
      revenue,
      vendorCost,
      margin: revenue - vendorCost,
      creditsSold,
      creditsSpent,
      creditsRefunded,
      internalSearches,
      customerSearches,
      totalUsers: users.length,
      paidUsers: users.filter(user => user.plan !== "free").length,
    };
  }, [creditTransactions, searchSessions, stripePayments, usageEvents, users]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(user => [
      user.email,
      user.full_name,
      user.company_name,
      user.role_title,
      user.company_website,
      user.phone,
      user.plan,
      user.role,
      user.organization_name,
      user.organization_id,
    ].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [query, users]);

  const providerRows = useMemo(() => {
    const rows = new Map<string, { provider: string; events: number; units: number; cost: number; successes: number }>();
    ["google", "firecrawl", "hunter"].forEach(provider => {
      rows.set(provider, { provider, events: 0, units: 0, cost: 0, successes: 0 });
    });
    usageEvents.forEach(event => {
      const provider = event.provider || "unknown";
      const row = rows.get(provider) || { provider, events: 0, units: 0, cost: 0, successes: 0 };
      row.events += 1;
      row.units += Number(event.billable_units || 0);
      row.cost += Number(event.estimated_cost_usd || 0);
      row.successes += event.success ? 1 : 0;
      rows.set(provider, row);
    });
    return [...rows.values()].sort((a, b) => b.cost - a.cost || b.events - a.events);
  }, [usageEvents]);

  const searchRows = useMemo(() => {
    const rows = new Map<string, { key: string; searches: number; leads: number; credits: number; cost: number }>();
    searchSessions.forEach(session => {
      const key = `${session.depth || "unknown"} ${session.enrich_mode ? "+ enrich" : "normal"} / ${session.usage_type}`;
      const row = rows.get(key) || { key, searches: 0, leads: 0, credits: 0, cost: 0 };
      row.searches += 1;
      row.leads += session.lead_count || 0;
      row.credits += session.credits_used || 0;
      row.cost += Number(session.estimated_cost_usd || 0);
      rows.set(key, row);
    });
    return [...rows.values()].sort((a, b) => b.searches - a.searches);
  }, [searchSessions]);

  const updateSelectedUser = async (patch: Record<string, unknown>) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_user", targetUserId: selectedUser.id, ...patch },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Update failed");
      toast({ title: "User updated", description: selectedUser.email });
      await loadDashboard();
      onUserCreditsChanged?.();
    } catch (error) {
      toast({
        title: "Admin update failed",
        description: error instanceof Error ? error.message : "Could not update user.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createOrgForSelectedUser = async () => {
    if (!selectedUser || !orgName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "create_organization", ownerUserId: selectedUser.id, name: orgName.trim(), seatLimit: 3 },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Organization failed");
      setOrgName("");
      toast({ title: "Organization created", description: orgName.trim() });
      await loadDashboard();
    } catch (error) {
      toast({
        title: "Organization failed",
        description: error instanceof Error ? error.message : "Could not create organization.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="h-full w-full overflow-auto bg-black text-[#f3f5f8]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 border border-[#f3f5f8]/[0.14] bg-[#111319] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#e8fb52]" />
              <h1 className="font-display text-2xl font-black tracking-[-0.03em]">Admin dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-[#9aa3b2]">Users, plans, credits, organizations, and usage economics.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onBackToSearch} className="inline-flex items-center gap-2 border border-[#f3f5f8]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#f3f5f8] hover:border-[#e8fb52]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Search
            </button>
            <button onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-2 border border-[#e8fb52] bg-[#e8fb52] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#f3ff8a] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Users", metrics.totalUsers],
            ["Paid users", metrics.paidUsers],
            ["Net revenue", currency.format(metrics.revenue)],
            ["Vendor COGS", currency.format(metrics.vendorCost)],
            ["Est. margin", currency.format(metrics.margin)],
            ["Customer searches", metrics.customerSearches],
            ["Internal searches", metrics.internalSearches],
            ["Credits granted", metrics.creditsSold],
            ["Credits spent", metrics.creditsSpent - metrics.creditsRefunded],
            ["Gross revenue", currency.format(metrics.grossRevenue)],
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-[#f3f5f8]/[0.14] bg-[#111319] p-4">
              <p className="font-mono text-2xl font-black text-[#f3f5f8]">{value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">{label}</p>
            </div>
          ))}
        </div>

        <div className="border border-[#f3f5f8]/[0.14] bg-[#111319] p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Provider balances</h2>
              <p className="mt-1 text-sm text-[#9aa3b2]">Live balances where available, plus internal request/cost accounting.</p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
              Server-side admin only
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {providerStatuses.map(provider => (
              <ProviderStatusCard key={provider.provider} provider={provider} />
            ))}
            {!providerStatuses.length && (
              <div className="border border-[#f3f5f8]/10 bg-black p-4 text-sm text-[#9aa3b2] md:col-span-3">
                Provider balances have not loaded yet.
              </div>
            )}
          </div>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="self-start overflow-hidden border border-[#f3f5f8]/[0.14] bg-[#111319]">
            <div className="flex flex-col gap-3 border-b border-[#f3f5f8]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#e8fb52]" />
                <h2 className="font-display text-lg font-bold">Users</h2>
              </div>
              <label className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5d6675]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search users, plans, orgs..."
                  className="h-9 w-full border border-[#f3f5f8]/10 bg-black pl-9 pr-3 font-mono text-xs text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]/70"
                />
              </label>
            </div>
            <div className="max-h-[calc(100vh-360px)] overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[13%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="sticky top-0 bg-[#111319] font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
                  <tr>
                    <th className="min-w-0 px-3 py-3">User</th>
                    <th className="min-w-0 px-3 py-3">Company</th>
                    <th className="min-w-0 px-3 py-3">Plan</th>
                    <th className="min-w-0 px-3 py-3">Credits</th>
                    <th className="min-w-0 px-3 py-3">Joined</th>
                    <th className="min-w-0 px-3 py-3">Searches</th>
                    <th className="min-w-0 px-3 py-3">Leads</th>
                    <th className="min-w-0 px-3 py-3">Org</th>
                    <th className="min-w-0 px-3 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f5f8]/10 font-mono text-xs">
                  {filteredUsers.map(user => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`cursor-pointer transition-colors hover:bg-[#f3f5f8]/5 ${selectedUser?.id === user.id ? "bg-[#e8fb52]/10" : ""}`}
                    >
                      <td className="min-w-0 px-3 py-3">
                        <p title={user.full_name || user.email} className="w-full truncate text-[#f3f5f8]">{user.full_name || user.email}</p>
                        <p title={user.email} className="mt-1 truncate text-[10px] text-[#5d6675]">{user.email}</p>
                      </td>
                      <td className="min-w-0 px-3 py-3 text-[#9aa3b2]"><span className="block truncate">{user.company_name || "-"}</span></td>
                      <td className="min-w-0 px-3 py-3 text-[#e8fb52]"><span className="block truncate">{PLAN_LABELS[user.plan] || user.plan}</span></td>
                      <td className="min-w-0 px-3 py-3 text-[#9aa3b2]">{user.credits_left}</td>
                      <td className="min-w-0 px-3 py-3 text-[#9aa3b2]"><span className="block truncate">{formatDate(user.date_joined)}</span></td>
                      <td className="min-w-0 px-3 py-3 text-[#9aa3b2]">{user.searches_run}</td>
                      <td className="min-w-0 px-3 py-3 text-[#9aa3b2]">{user.leads_generated}</td>
                      <td className="min-w-0 px-3 py-3 text-[#9aa3b2]"><span className="block truncate">{user.organization_name || "-"}</span></td>
                      <td className="min-w-0 px-3 py-3 text-[#e8fb52]"><span className="block truncate">{currency.format(user.net_revenue_usd || 0)}</span></td>
                    </tr>
                  ))}
                  {!filteredUsers.length && (
                    <tr><td className="px-4 py-6 text-[#5d6675]" colSpan={9}>No users match that search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="border border-[#f3f5f8]/[0.14] bg-[#111319] p-4">
            {selectedUser ? (
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Selected user</p>
                  <h3 className="mt-1 truncate font-display text-xl font-black text-[#f3f5f8]">{selectedUser.email}</h3>
                  {selectedUser.full_name && <p className="mt-1 text-sm text-[#9aa3b2]">{selectedUser.full_name}</p>}
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">{selectedUser.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Info label="Credits" value={selectedUser.credits_left} />
                  <Info label="Leads" value={selectedUser.leads_generated} />
                  <Info label="Searches" value={selectedUser.searches_run} />
                  <Info label="Payments" value={selectedUser.payment_count} />
                </div>

                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Plan</span>
                  <select
                    value={selectedUser.plan}
                    onChange={event => updateSelectedUser({ plan: event.target.value })}
                    disabled={saving}
                    className="h-10 border border-[#f3f5f8]/10 bg-black px-3 font-mono text-xs uppercase tracking-widest text-[#f3f5f8] outline-none focus:border-[#e8fb52]"
                  >
                    {Object.entries(PLAN_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Full name</span>
                  <input
                    defaultValue={selectedUser.full_name || ""}
                    onBlur={event => updateSelectedUser({ fullName: event.target.value })}
                    disabled={saving}
                    className="h-10 border border-[#f3f5f8]/10 bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Company name</span>
                  <input
                    defaultValue={selectedUser.company_name || ""}
                    onBlur={event => updateSelectedUser({ companyName: event.target.value })}
                    disabled={saving}
                    className="h-10 border border-[#f3f5f8]/10 bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Role/title</span>
                    <input
                      defaultValue={selectedUser.role_title || ""}
                      onBlur={event => updateSelectedUser({ roleTitle: event.target.value })}
                      disabled={saving}
                      className="h-10 border border-[#f3f5f8]/10 bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Phone</span>
                    <input
                      defaultValue={selectedUser.phone || ""}
                      onBlur={event => updateSelectedUser({ phone: event.target.value })}
                      disabled={saving}
                      className="h-10 border border-[#f3f5f8]/10 bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]"
                    />
                  </label>
                </div>

                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Company website</span>
                  <input
                    defaultValue={selectedUser.company_website || ""}
                    onBlur={event => updateSelectedUser({ companyWebsite: event.target.value })}
                    disabled={saving}
                    className="h-10 border border-[#f3f5f8]/10 bg-black px-3 text-sm text-[#f3f5f8] outline-none focus:border-[#e8fb52]"
                  />
                </label>

                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <button onClick={() => updateSelectedUser({ creditDelta: 10 })} disabled={saving} className="h-10 border border-[#e8fb52]/50 px-3 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52] disabled:opacity-40">+10 credits</button>
                  <button onClick={() => updateSelectedUser({ creditDelta: 100 })} disabled={saving} className="h-10 border border-[#e8fb52]/50 px-3 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52] disabled:opacity-40">+100</button>
                  <button onClick={() => updateSelectedUser({ creditDelta: -10 })} disabled={saving} className="h-10 border border-red-400/40 px-3 font-mono text-[10px] uppercase tracking-widest text-red-300 disabled:opacity-40">-10</button>
                </div>

                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Role</span>
                  <select
                    value={selectedUser.role}
                    onChange={event => updateSelectedUser({ role: event.target.value })}
                    disabled={saving}
                    className="h-10 border border-[#f3f5f8]/10 bg-black px-3 font-mono text-xs uppercase tracking-widest text-[#f3f5f8] outline-none focus:border-[#e8fb52]"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </label>

                <div className="border border-[#f3f5f8]/10 bg-black p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#e8fb52]" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">Organization</p>
                  </div>
                  <p className="mb-2 text-sm text-[#f3f5f8]">{selectedUser.organization_name || "No organization"}</p>
                  <select
                    value={selectedUser.organization_id || ""}
                    onChange={event => updateSelectedUser({ organizationId: event.target.value || null, organizationRole: "member" })}
                    disabled={saving}
                    className="mb-2 h-10 w-full border border-[#f3f5f8]/10 bg-[#0d0f13] px-3 font-mono text-xs uppercase tracking-widest text-[#f3f5f8] outline-none focus:border-[#e8fb52]"
                  >
                    <option value="">No organization</option>
                    {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input
                      value={orgName}
                      onChange={event => setOrgName(event.target.value)}
                      placeholder="New org name"
                      className="h-10 min-w-0 flex-1 border border-[#f3f5f8]/10 bg-[#0d0f13] px-3 text-sm text-[#f3f5f8] outline-none placeholder:text-[#5d6675] focus:border-[#e8fb52]"
                    />
                    <button onClick={createOrgForSelectedUser} disabled={saving || !orgName.trim()} className="inline-flex h-10 items-center gap-2 border border-[#e8fb52] px-3 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52] disabled:opacity-40">
                      <Save className="h-3.5 w-3.5" /> Org
                    </button>
                  </div>
                </div>

                <div className="space-y-1 border border-[#f3f5f8]/10 bg-black p-3 font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
                  <p>Status: <span className="text-[#f3f5f8]">{selectedUser.subscription_status}</span></p>
                  <p>Stripe customer: <span className="text-[#f3f5f8]">{selectedUser.stripe_customer_id || "-"}</span></p>
                  <p>Stripe sub: <span className="text-[#f3f5f8]">{selectedUser.stripe_subscription_id || "-"}</span></p>
                  <p>Last active: <span className="text-[#f3f5f8]">{formatDate(selectedUser.last_activity_at || selectedUser.last_sign_in_at)}</span></p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#9aa3b2]">Select a user.</p>
            )}
          </aside>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <MetricsTable title="Provider usage" columns={["Provider", "Events", "Units", "Success", "Est. cost"]}>
            {providerRows.map(row => (
              <tr key={row.provider}>
                <td className="px-4 py-3 uppercase text-[#f3f5f8]">{row.provider}</td>
                <td className="px-4 py-3 text-[#9aa3b2]">{row.events}</td>
                <td className="px-4 py-3 text-[#9aa3b2]">{row.units}</td>
                <td className="px-4 py-3 text-[#9aa3b2]">{row.successes}</td>
                <td className="px-4 py-3 text-[#e8fb52]">{currency.format(row.cost)}</td>
              </tr>
            ))}
          </MetricsTable>

          <MetricsTable title="Search economics" columns={["Mode", "Searches", "Leads", "Credits", "Est. COGS"]}>
            {searchRows.map(row => (
              <tr key={row.key}>
                <td className="px-4 py-3 uppercase text-[#f3f5f8]">{row.key}</td>
                <td className="px-4 py-3 text-[#9aa3b2]">{row.searches}</td>
                <td className="px-4 py-3 text-[#9aa3b2]">{row.leads}</td>
                <td className="px-4 py-3 text-[#9aa3b2]">{row.credits}</td>
                <td className="px-4 py-3 text-[#e8fb52]">{currency.format(row.cost)}</td>
              </tr>
            ))}
          </MetricsTable>
        </div>
      </div>
    </section>
  );
};

const Info = ({ label, value }: { label: string; value: string | number }) => (
  <div className="border border-[#f3f5f8]/10 bg-black p-3">
    <p className="font-mono text-lg font-black text-[#f3f5f8]">{value}</p>
    <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">{label}</p>
  </div>
);

const providerStatusTone = (status: ProviderAccountStatus["status"]) => {
  if (status === "ok") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "warning") return "border-[#e8fb52]/40 bg-[#e8fb52]/10 text-[#e8fb52]";
  if (status === "error") return "border-red-400/40 bg-red-500/10 text-red-200";
  return "border-[#f3f5f8]/10 bg-black text-[#9aa3b2]";
};

const formatReset = (value: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFmt.format(date);
};

const ProviderStatusCard = ({ provider }: { provider: ProviderAccountStatus }) => (
  <div className="border border-[#f3f5f8]/10 bg-black p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-display text-base font-black text-[#f3f5f8]">{provider.label}</p>
        <span className={`mt-2 inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${providerStatusTone(provider.status)}`}>
          {provider.status !== "ok" && <AlertTriangle className="h-3 w-3" />}
          {provider.status.replace("_", " ")}
        </span>
      </div>
      <div className="text-right">
        <p className="font-mono text-xl font-black text-[#e8fb52]">{provider.balance_label}</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">Remaining</p>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[#f3f5f8]/10 py-3">
      <div>
        <p className="font-mono text-sm font-bold text-[#f3f5f8]">{compactNumber.format(provider.internal_usage.units_24h)}</p>
        <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-[#5d6675]">Units 24h</p>
      </div>
      <div>
        <p className="font-mono text-sm font-bold text-[#f3f5f8]">{currency.format(provider.internal_usage.estimated_cost_24h_usd)}</p>
        <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-[#5d6675]">Cost 24h</p>
      </div>
      <div>
        <p className="font-mono text-sm font-bold text-[#f3f5f8]">{currency.format(provider.internal_usage.estimated_cost_30d_usd)}</p>
        <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-[#5d6675]">Cost 30d</p>
      </div>
    </div>

    <div className="mt-3 space-y-1 font-mono text-[9px] uppercase tracking-widest text-[#5d6675]">
      <p>Used: <span className="text-[#f3f5f8]">{provider.used === null ? "Unknown" : compactNumber.format(provider.used)}</span></p>
      <p>Limit: <span className="text-[#f3f5f8]">{provider.limit === null ? "Unknown" : compactNumber.format(provider.limit)}</span></p>
      <p>Reset: <span className="text-[#f3f5f8]">{formatReset(provider.reset_at)}</span></p>
    </div>
    <p className="mt-3 text-xs leading-5 text-[#9aa3b2]">{provider.note}</p>
  </div>
);

const MetricsTable = ({ title, columns, children }: { title: string; columns: string[]; children: ReactNode }) => (
  <div className="border border-[#f3f5f8]/[0.14] bg-[#111319]">
    <div className="border-b border-[#f3f5f8]/10 p-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead className="font-mono text-[10px] uppercase tracking-widest text-[#5d6675]">
          <tr>{columns.map(column => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#f3f5f8]/10 font-mono text-xs">{children}</tbody>
      </table>
    </div>
  </div>
);

export default AdminDashboard;
