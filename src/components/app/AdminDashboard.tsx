import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Building2, RefreshCw, Save, Search, ShieldCheck, Users } from "lucide-react";

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
  company_name: string | null;
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

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "2-digit" });

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");

  const selectedUser = users.find(user => user.id === selectedUserId) || users[0] || null;

  const loadDashboard = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usage, credits, sessions, payments, adminUsers] = await Promise.all([
      supabase.from("api_usage_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("credit_transactions").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("search_sessions").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.from("stripe_payments").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.functions.invoke("admin-users", { body: { action: "list_users" } }),
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
      user.company_name,
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
    <section className="h-full w-full overflow-auto bg-black text-[#EFEDE6]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#F5FF3D]" />
              <h1 className="font-display text-2xl font-black tracking-[-0.03em]">Admin dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-[#A8A59C]">Users, plans, credits, organizations, and usage economics.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onBackToSearch} className="inline-flex items-center gap-2 border border-[#EFEDE6]/20 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#EFEDE6] hover:border-[#F5FF3D]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Search
            </button>
            <button onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-2 border border-[#F5FF3D] bg-[#F5FF3D] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#FFFE7A] disabled:opacity-50">
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
            <div key={String(label)} className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4">
              <p className="font-mono text-2xl font-black text-[#EFEDE6]">{value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="self-start overflow-hidden border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
            <div className="flex flex-col gap-3 border-b border-[#EFEDE6]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#F5FF3D]" />
                <h2 className="font-display text-lg font-bold">Users</h2>
              </div>
              <label className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#67645B]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search users, plans, orgs..."
                  className="h-9 w-full border border-[#EFEDE6]/10 bg-black pl-9 pr-3 font-mono text-xs text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]/70"
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
                <thead className="sticky top-0 bg-[#0A0A0A] font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
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
                <tbody className="divide-y divide-[#EFEDE6]/10 font-mono text-xs">
                  {filteredUsers.map(user => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`cursor-pointer transition-colors hover:bg-[#EFEDE6]/5 ${selectedUser?.id === user.id ? "bg-[#F5FF3D]/10" : ""}`}
                    >
                      <td className="min-w-0 px-3 py-3">
                        <p title={user.email} className="w-full truncate text-[#EFEDE6]">{user.email}</p>
                        <p className="mt-1 text-[10px] uppercase text-[#67645B]">{user.role}</p>
                      </td>
                      <td className="min-w-0 px-3 py-3 text-[#A8A59C]"><span className="block truncate">{user.company_name || "-"}</span></td>
                      <td className="min-w-0 px-3 py-3 text-[#F5FF3D]"><span className="block truncate">{PLAN_LABELS[user.plan] || user.plan}</span></td>
                      <td className="min-w-0 px-3 py-3 text-[#A8A59C]">{user.credits_left}</td>
                      <td className="min-w-0 px-3 py-3 text-[#A8A59C]"><span className="block truncate">{formatDate(user.date_joined)}</span></td>
                      <td className="min-w-0 px-3 py-3 text-[#A8A59C]">{user.searches_run}</td>
                      <td className="min-w-0 px-3 py-3 text-[#A8A59C]">{user.leads_generated}</td>
                      <td className="min-w-0 px-3 py-3 text-[#A8A59C]"><span className="block truncate">{user.organization_name || "-"}</span></td>
                      <td className="min-w-0 px-3 py-3 text-[#F5FF3D]"><span className="block truncate">{currency.format(user.net_revenue_usd || 0)}</span></td>
                    </tr>
                  ))}
                  {!filteredUsers.length && (
                    <tr><td className="px-4 py-6 text-[#67645B]" colSpan={9}>No users match that search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4">
            {selectedUser ? (
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Selected user</p>
                  <h3 className="mt-1 truncate font-display text-xl font-black text-[#EFEDE6]">{selectedUser.email}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{selectedUser.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Info label="Credits" value={selectedUser.credits_left} />
                  <Info label="Leads" value={selectedUser.leads_generated} />
                  <Info label="Searches" value={selectedUser.searches_run} />
                  <Info label="Payments" value={selectedUser.payment_count} />
                </div>

                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Plan</span>
                  <select
                    value={selectedUser.plan}
                    onChange={event => updateSelectedUser({ plan: event.target.value })}
                    disabled={saving}
                    className="h-10 border border-[#EFEDE6]/10 bg-black px-3 font-mono text-xs uppercase tracking-widest text-[#EFEDE6] outline-none focus:border-[#F5FF3D]"
                  >
                    {Object.entries(PLAN_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Company name</span>
                  <input
                    defaultValue={selectedUser.company_name || ""}
                    onBlur={event => updateSelectedUser({ companyName: event.target.value })}
                    disabled={saving}
                    className="h-10 border border-[#EFEDE6]/10 bg-black px-3 text-sm text-[#EFEDE6] outline-none focus:border-[#F5FF3D]"
                  />
                </label>

                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <button onClick={() => updateSelectedUser({ creditDelta: 10 })} disabled={saving} className="h-10 border border-[#F5FF3D]/50 px-3 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D] disabled:opacity-40">+10 credits</button>
                  <button onClick={() => updateSelectedUser({ creditDelta: 100 })} disabled={saving} className="h-10 border border-[#F5FF3D]/50 px-3 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D] disabled:opacity-40">+100</button>
                  <button onClick={() => updateSelectedUser({ creditDelta: -10 })} disabled={saving} className="h-10 border border-red-400/40 px-3 font-mono text-[10px] uppercase tracking-widest text-red-300 disabled:opacity-40">-10</button>
                </div>

                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Role</span>
                  <select
                    value={selectedUser.role}
                    onChange={event => updateSelectedUser({ role: event.target.value })}
                    disabled={saving}
                    className="h-10 border border-[#EFEDE6]/10 bg-black px-3 font-mono text-xs uppercase tracking-widest text-[#EFEDE6] outline-none focus:border-[#F5FF3D]"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </label>

                <div className="border border-[#EFEDE6]/10 bg-black p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#F5FF3D]" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">Organization</p>
                  </div>
                  <p className="mb-2 text-sm text-[#EFEDE6]">{selectedUser.organization_name || "No organization"}</p>
                  <select
                    value={selectedUser.organization_id || ""}
                    onChange={event => updateSelectedUser({ organizationId: event.target.value || null, organizationRole: "member" })}
                    disabled={saving}
                    className="mb-2 h-10 w-full border border-[#EFEDE6]/10 bg-[#050505] px-3 font-mono text-xs uppercase tracking-widest text-[#EFEDE6] outline-none focus:border-[#F5FF3D]"
                  >
                    <option value="">No organization</option>
                    {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input
                      value={orgName}
                      onChange={event => setOrgName(event.target.value)}
                      placeholder="New org name"
                      className="h-10 min-w-0 flex-1 border border-[#EFEDE6]/10 bg-[#050505] px-3 text-sm text-[#EFEDE6] outline-none placeholder:text-[#67645B] focus:border-[#F5FF3D]"
                    />
                    <button onClick={createOrgForSelectedUser} disabled={saving || !orgName.trim()} className="inline-flex h-10 items-center gap-2 border border-[#F5FF3D] px-3 font-mono text-[10px] uppercase tracking-widest text-[#F5FF3D] disabled:opacity-40">
                      <Save className="h-3.5 w-3.5" /> Org
                    </button>
                  </div>
                </div>

                <div className="space-y-1 border border-[#EFEDE6]/10 bg-black p-3 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                  <p>Status: <span className="text-[#EFEDE6]">{selectedUser.subscription_status}</span></p>
                  <p>Stripe customer: <span className="text-[#EFEDE6]">{selectedUser.stripe_customer_id || "-"}</span></p>
                  <p>Stripe sub: <span className="text-[#EFEDE6]">{selectedUser.stripe_subscription_id || "-"}</span></p>
                  <p>Last active: <span className="text-[#EFEDE6]">{formatDate(selectedUser.last_activity_at || selectedUser.last_sign_in_at)}</span></p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#A8A59C]">Select a user.</p>
            )}
          </aside>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <MetricsTable title="Provider usage" columns={["Provider", "Events", "Units", "Success", "Est. cost"]}>
            {providerRows.map(row => (
              <tr key={row.provider}>
                <td className="px-4 py-3 uppercase text-[#EFEDE6]">{row.provider}</td>
                <td className="px-4 py-3 text-[#A8A59C]">{row.events}</td>
                <td className="px-4 py-3 text-[#A8A59C]">{row.units}</td>
                <td className="px-4 py-3 text-[#A8A59C]">{row.successes}</td>
                <td className="px-4 py-3 text-[#F5FF3D]">{currency.format(row.cost)}</td>
              </tr>
            ))}
          </MetricsTable>

          <MetricsTable title="Search economics" columns={["Mode", "Searches", "Leads", "Credits", "Est. COGS"]}>
            {searchRows.map(row => (
              <tr key={row.key}>
                <td className="px-4 py-3 uppercase text-[#EFEDE6]">{row.key}</td>
                <td className="px-4 py-3 text-[#A8A59C]">{row.searches}</td>
                <td className="px-4 py-3 text-[#A8A59C]">{row.leads}</td>
                <td className="px-4 py-3 text-[#A8A59C]">{row.credits}</td>
                <td className="px-4 py-3 text-[#F5FF3D]">{currency.format(row.cost)}</td>
              </tr>
            ))}
          </MetricsTable>
        </div>
      </div>
    </section>
  );
};

const Info = ({ label, value }: { label: string; value: string | number }) => (
  <div className="border border-[#EFEDE6]/10 bg-black p-3">
    <p className="font-mono text-lg font-black text-[#EFEDE6]">{value}</p>
    <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#67645B]">{label}</p>
  </div>
);

const MetricsTable = ({ title, columns, children }: { title: string; columns: string[]; children: ReactNode }) => (
  <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
    <div className="border-b border-[#EFEDE6]/10 p-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
          <tr>{columns.map(column => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#EFEDE6]/10 font-mono text-xs">{children}</tbody>
      </table>
    </div>
  </div>
);

export default AdminDashboard;
