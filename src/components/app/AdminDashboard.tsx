import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type UsageEvent = Tables<"api_usage_events">;
type CreditTransaction = Tables<"credit_transactions">;
type SearchSession = Tables<"search_sessions">;
type StripePayment = Tables<"stripe_payments">;

interface AdminDashboardProps {
  onBackToSearch: () => void;
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const sum = <T,>(items: T[], getValue: (item: T) => number | null | undefined) =>
  items.reduce((acc, item) => acc + Number(getValue(item) || 0), 0);

const AdminDashboard = ({ onBackToSearch }: AdminDashboardProps) => {
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [searchSessions, setSearchSessions] = useState<SearchSession[]>([]);
  const [stripePayments, setStripePayments] = useState<StripePayment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usage, credits, sessions, payments] = await Promise.all([
      supabase.from("api_usage_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("credit_transactions").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("search_sessions").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.from("stripe_payments").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
    ]);

    if (!usage.error) setUsageEvents(usage.data || []);
    if (!credits.error) setCreditTransactions(credits.data || []);
    if (!sessions.error) setSearchSessions(sessions.data || []);
    if (!payments.error) setStripePayments(payments.data || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const revenue = sum(stripePayments, payment => payment.net_usd);
    const grossRevenue = sum(stripePayments, payment => payment.gross_usd);
    const vendorCost = sum(usageEvents, event => event.estimated_cost_usd);
    const creditsSold = sum(creditTransactions.filter(tx => tx.type === "purchase"), tx => tx.amount);
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
    };
  }, [creditTransactions, searchSessions, stripePayments, usageEvents]);

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

  return (
    <section className="h-full w-full overflow-auto bg-black text-[#EFEDE6]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#F5FF3D]" />
              <h1 className="font-display text-2xl font-black tracking-[-0.03em]">Admin usage</h1>
            </div>
            <p className="mt-1 text-sm text-[#A8A59C]">Last 30 days. Estimates are directional until reconciled with provider invoices.</p>
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Net revenue", currency.format(metrics.revenue)],
            ["Vendor COGS", currency.format(metrics.vendorCost)],
            ["Est. margin", currency.format(metrics.margin)],
            ["Gross revenue", currency.format(metrics.grossRevenue)],
            ["Customer searches", metrics.customerSearches],
            ["Internal searches", metrics.internalSearches],
            ["Credits sold", metrics.creditsSold],
            ["Credits spent", metrics.creditsSpent - metrics.creditsRefunded],
          ].map(([label, value]) => (
            <div key={String(label)} className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A] p-4">
              <p className="font-mono text-2xl font-black text-[#EFEDE6]">{value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#67645B]">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
            <div className="border-b border-[#EFEDE6]/10 p-4">
              <h2 className="font-display text-lg font-bold">Provider usage</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                  <tr>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Events</th>
                    <th className="px-4 py-3">Units</th>
                    <th className="px-4 py-3">Success</th>
                    <th className="px-4 py-3">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEDE6]/10 font-mono text-xs">
                  {providerRows.map(row => (
                    <tr key={row.provider}>
                      <td className="px-4 py-3 uppercase text-[#EFEDE6]">{row.provider}</td>
                      <td className="px-4 py-3 text-[#A8A59C]">{row.events}</td>
                      <td className="px-4 py-3 text-[#A8A59C]">{row.units}</td>
                      <td className="px-4 py-3 text-[#A8A59C]">{row.successes}</td>
                      <td className="px-4 py-3 text-[#F5FF3D]">{currency.format(row.cost)}</td>
                    </tr>
                  ))}
                  {!providerRows.length && (
                    <tr><td className="px-4 py-6 text-[#67645B]" colSpan={5}>No provider usage logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-[#EFEDE6]/[0.14] bg-[#0A0A0A]">
            <div className="border-b border-[#EFEDE6]/10 p-4">
              <h2 className="font-display text-lg font-bold">Search economics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="font-mono text-[10px] uppercase tracking-widest text-[#67645B]">
                  <tr>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Searches</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3">Credits</th>
                    <th className="px-4 py-3">Est. COGS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEDE6]/10 font-mono text-xs">
                  {searchRows.map(row => (
                    <tr key={row.key}>
                      <td className="px-4 py-3 uppercase text-[#EFEDE6]">{row.key}</td>
                      <td className="px-4 py-3 text-[#A8A59C]">{row.searches}</td>
                      <td className="px-4 py-3 text-[#A8A59C]">{row.leads}</td>
                      <td className="px-4 py-3 text-[#A8A59C]">{row.credits}</td>
                      <td className="px-4 py-3 text-[#F5FF3D]">{currency.format(row.cost)}</td>
                    </tr>
                  ))}
                  {!searchRows.length && (
                    <tr><td className="px-4 py-6 text-[#67645B]" colSpan={5}>No searches logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;
