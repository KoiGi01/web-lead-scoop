import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Plus, Search, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import type { SearchHistoryEntry } from "@/hooks/useSearchHistory";

/**
 * HomeDashboard — the workspace landing surface (redesign Section 2).
 * Wired to real data today: saved_leads (prospects, pipeline, email-ready
 * leads) + search history + credits. In demo mode it shows sample data so the
 * layout can be reviewed fully populated.
 */

interface HomeDashboardProps {
  userId: string | undefined;
  demoMode?: boolean;
  userName?: string;
  searchHistory: SearchHistoryEntry[];
  creditsRemaining: number;
  creditsTotal: number;
  onNewScan: () => void;
  onResumeScan?: () => void;
  onViewScans: () => void;
  onViewFollowups: () => void;
}

interface DashLead {
  emailed: boolean;
  created: number;
  stage: string;
  name: string;
  category: string;
}

const DAY = 86400000;
const WEEK = 7 * DAY;

/* ---------- count-up (respects reduced motion) ---------- */
function useCountUp(target: number, enabled: boolean, duration = 1000) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const raf = useRef<number>();
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || reduce || target === 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, enabled, duration]);
  return value;
}

/* ---------- inline sparkline ---------- */
function Spark({ data, accent }: { data: number[]; accent?: boolean }) {
  if (data.length < 2) return <div className="h-[34px]" />;
  const w = 100, h = 34, mx = Math.max(...data), mn = Math.min(...data), rg = mx - mn || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - mn) / rg) * (h - 6)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="34">
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={accent ? "rgba(232,251,82,.14)" : "rgba(152,160,175,.08)"} />
      <polyline points={pts.join(" ")} fill="none" stroke={accent ? "#e8fb52" : "#98a0af"} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface Kpi { label: string; value: number; delta?: string; deltaUp?: boolean; accent?: boolean; spark: number[]; icon: typeof Users; }

function KpiCard({ kpi, animate }: { kpi: Kpi; animate: boolean }) {
  const v = useCountUp(kpi.value, animate);
  const Icon = kpi.icon;
  return (
    <div className="rounded-[15px] border border-[#f3f5f8]/[0.07] bg-[#0f1115] p-[16px_18px] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#f3f5f8]/[0.13]">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#5b6472]">
        <Icon className="h-[13px] w-[13px]" /> {kpi.label}
      </div>
      <div className="mt-[11px] flex items-baseline gap-2.5">
        <span className={`font-display text-[31px] font-bold leading-none tracking-[-0.03em] ${kpi.accent ? "text-[#e8fb52]" : "text-[#f3f5f8]"}`}>
          {Math.round(v).toLocaleString()}
        </span>
        {kpi.delta && (
          <span className={`font-mono text-[11px] font-medium ${kpi.deltaUp ? "text-[#5fe3a1]" : "text-[#ff5c49]"}`}>
            {kpi.deltaUp ? "▲" : "▼"} {kpi.delta}
          </span>
        )}
      </div>
      <div className="mt-3"><Spark data={kpi.spark} accent={kpi.accent} /></div>
    </div>
  );
}

const STAGES = [
  { key: "new", label: "New", color: "#e8fb52" },
  { key: "contacted", label: "Contacted", color: "#57b9ff" },
  { key: "qualified", label: "Qualified", color: "#5fe3a1" },
  { key: "won", label: "Won", color: "#98a0af" },
] as const;

const SAMPLE = {
  leadsTotal: 312,
  scansMonth: 24,
  newWeek: 46,
  followDue: 7,
  sparks: {
    leads: [120, 150, 170, 190, 210, 250, 280, 312],
    scans: [2, 4, 3, 6, 8, 7, 10, 12],
    week: [4, 7, 5, 9, 8, 12, 10, 14],
    follow: [3, 5, 4, 6, 5, 7, 6, 7],
  },
  weeks: [[14, 8], [18, 7], [16, 10], [22, 9], [20, 12], [28, 8], [26, 11], [31, 9]],
  pipeline: { new: 142, contacted: 86, qualified: 52, won: 21 },
  scansList: [
    { title: "Dentists · Austin, TX", sub: "Web design · 38 prospects", when: "2h ago" },
    { title: "Roofers · Dallas, TX", sub: "SEO · 51 prospects", when: "Yesterday" },
    { title: "Med spas · Miami, FL", sub: "Paid ads · 29 prospects", when: "2d ago" },
  ],
  dueList: [
    { name: "Bright Smile Dental", sub: "Call · follow-up #2", tag: "Due 2pm", kind: "due" },
    { name: "Lakeway Dental Studio", sub: "Email · intro", tag: "Overdue", kind: "due" },
    { name: "Cedar Park Family", sub: "Proposal sent", tag: "Won", kind: "won" },
  ],
};

const HomeDashboard = ({
  userId, demoMode, userName, searchHistory, creditsRemaining, creditsTotal,
  onNewScan, onResumeScan, onViewScans, onViewFollowups,
}: HomeDashboardProps) => {
  const [leads, setLeads] = useState<DashLead[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (demoMode || !userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("saved_leads").select("*").eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        setLeads((data || []).map((r: Record<string, unknown>) => {
          const emails = Array.isArray(r.emails) ? r.emails : [];
          return {
            emailed: emails.length > 0,
            created: new Date((r.created_at as string) || Date.now()).getTime(),
            stage: String(r.crm_status || "new"),
            name: String(r.name || "Unknown business"),
            category: String(r.category || ""),
          };
        }));
      } catch (e) { console.error("Home dashboard load:", e); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId, demoMode]);

  useEffect(() => { if (!loading) { const id = requestAnimationFrame(() => setAnimate(true)); return () => cancelAnimationFrame(id); } }, [loading]);

  const now = Date.now();
  const real = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const scansMonth = searchHistory.filter(s => s.timestamp >= monthStart.getTime()).length;
    const newWeek = leads.filter(l => l.created >= now - WEEK).length;
    const emailReadyLeads = leads.filter(l => l.emailed);
    // 8 week buckets
    const weeks: [number, number][] = Array.from({ length: 8 }, () => [0, 0]);
    leads.forEach(l => {
      const wk = Math.floor((now - l.created) / WEEK);
      if (wk >= 0 && wk < 8) { const idx = 7 - wk; if (l.emailed) weeks[idx][0]++; else weeks[idx][1]++; }
    });
    const pipeline = { new: 0, contacted: 0, qualified: 0, won: 0 };
    leads.forEach(l => {
      if (l.stage === "won") pipeline.won++;
      else if (l.stage === "qualified" || l.stage === "proposal") pipeline.qualified++;
      else if (l.stage === "contacted") pipeline.contacted++;
      else if (l.stage !== "lost") pipeline.new++;
    });
    return {
      leadsTotal: leads.length, scansMonth, newWeek, followDue: emailReadyLeads.length,
      weeks, pipeline,
      scansList: searchHistory.slice(0, 3).map(s => ({
        title: `${s.keyword}${s.location ? ` · ${s.location}` : ""}`,
        sub: `${s.leadCount} prospects · ${s.emailCount} emails`,
        when: relTime(s.timestamp),
      })),
      dueList: emailReadyLeads.slice(0, 3).map(l => ({
        name: l.name, sub: l.category || "Email-ready prospect", tag: l.stage === "won" ? "Won" : "Ready", kind: l.stage === "won" ? "won" as const : "due" as const,
      })),
    };
  }, [leads, searchHistory, now]);

  const d = demoMode ? {
    ...SAMPLE,
    dueList: [
      { name: "Bright Smile Dental", sub: "Dr. Sofia Almeida", tag: "Ready", kind: "due" as const },
      { name: "Lakeway Dental Studio", sub: "Owner contact found", tag: "Ready", kind: "due" as const },
      { name: "Cedar Park Family", sub: "Proposal sent", tag: "Won", kind: "won" as const },
    ],
  } : real;
  const pipelineMax = Math.max(1, d.pipeline.new, d.pipeline.contacted, d.pipeline.qualified, d.pipeline.won);
  const pipelineTotal = d.pipeline.new + d.pipeline.contacted + d.pipeline.qualified + d.pipeline.won;
  const weekMax = Math.max(1, ...d.weeks.map(w => w[0] + w[1]));
  const barData = d.weeks.map((w, i) => ({ i, hi: w[0], lo: w[1] }));
  const hasWeeks = d.weeks.some(w => w[0] + w[1] > 0);

  const sparks = demoMode ? SAMPLE.sparks : {
    leads: cumulativeFromWeeks(real.weeks, real.leadsTotal),
    scans: [0, 0, 0, 0, 0, 0, 0, real.scansMonth],
    week: real.weeks.map(w => w[0] + w[1]),
    follow: [0, 0, 0, 0, 0, 0, 0, real.followDue],
  };

  const kpis: Kpi[] = [
    { label: "Prospects saved", value: d.leadsTotal, spark: sparks.leads, icon: Users, delta: demoMode ? "18" : undefined, deltaUp: true },
    { label: "Scans this month", value: d.scansMonth, accent: true, spark: sparks.scans, icon: Search, delta: demoMode ? "9" : undefined, deltaUp: true },
    { label: "New this week", value: d.newWeek, spark: sparks.week, icon: TrendingUp, delta: demoMode ? "12" : undefined, deltaUp: true },
    { label: "Email-ready leads", value: d.followDue, spark: sparks.follow, icon: Mail, delta: demoMode ? "3" : undefined, deltaUp: true },
  ];

  const firstName = (userName || "there").split(" ")[0];
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-full bg-[#08090c] p-[26px] font-sans text-[#f3f5f8]">
      {/* welcome */}
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[18px] border border-[#f3f5f8]/[0.07] bg-[#0f1115] p-[24px_26px]"
        style={{ backgroundImage: "radial-gradient(120% 180% at 100% 0%, rgba(232,251,82,.10), transparent 42%)" }}>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#e8fb52]">{today}</div>
          <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.025em]">Welcome back, {firstName}</h1>
          <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-[#98a0af]">
            You have <b className="text-[#f3f5f8]">{d.followDue} email-ready lead{d.followDue === 1 ? "" : "s"}</b> and{" "}
            <b className="text-[#f3f5f8]">{d.newWeek} new prospect{d.newWeek === 1 ? "" : "s"}</b> this week. Ready to find the next one?
          </p>
        </div>
        <div className="flex gap-2.5">
          {onResumeScan && (
            <button type="button" onClick={onResumeScan} className="rounded-[10px] border border-[#f3f5f8]/[0.13] px-4 py-2.5 text-[13px] font-semibold text-[#f3f5f8] hover:border-[#f3f5f8]/30">
              Resume last scan
            </button>
          )}
          <button type="button" onClick={onNewScan} className="inline-flex items-center gap-2 rounded-[10px] bg-[#e8fb52] px-4 py-2.5 text-[13px] font-semibold text-[#08090c] shadow-[0_6px_18px_rgba(232,251,82,0.16)] hover:bg-white">
            <Plus className="h-4 w-4" /> New scan
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(k => <KpiCard key={k.label} kpi={k} animate={animate} />)}
      </div>

      {/* charts */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-[16px] border border-[#f3f5f8]/[0.07] bg-[#0f1115] p-[18px_20px]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em]">Prospects added · last 8 weeks</h3>
            <div className="flex gap-3.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#5b6472]"><i className="h-2 w-2 rounded-[2px] bg-[#e8fb52]" />With email</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.05em] text-[#5b6472]"><i className="h-2 w-2 rounded-[2px] bg-[#1c2029]" />No email</span>
            </div>
          </div>
          {hasWeeks ? (
            <div className="h-[168px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barCategoryGap="32%" margin={{ top: 6, bottom: 0, left: 0, right: 0 }}>
                  <Bar dataKey="lo" stackId="a" fill="#1c2029" radius={[0, 0, 4, 4]} maxBarSize={30} isAnimationActive={animate} />
                  <Bar dataKey="hi" stackId="a" fill="#e8fb52" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={animate} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyHint text="No prospects added in the last 8 weeks yet." />}
        </div>

        <div className="rounded-[16px] border border-[#f3f5f8]/[0.07] bg-[#0f1115] p-[18px_20px]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em]">Pipeline</h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[#5b6472]">{pipelineTotal} total</span>
          </div>
          {pipelineTotal > 0 ? (
            <>
              <div className="flex flex-col gap-[15px] pt-1">
                {STAGES.map(s => {
                  const val = d.pipeline[s.key];
                  return (
                    <div key={s.key} className="grid grid-cols-[84px_1fr_36px] items-center gap-3">
                      <div className="flex items-center gap-2 text-[13px] text-[#98a0af]"><i className="h-[9px] w-[9px] flex-shrink-0 rounded-[3px]" style={{ background: s.color }} />{s.label}</div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#1c2029]"><div className="h-full rounded-full" style={{ width: `${(val / pipelineMax) * 100}%`, background: s.color }} /></div>
                      <div className="text-right font-mono text-[13px] text-[#f3f5f8]">{val}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-[18px] flex justify-between border-t border-[#f3f5f8]/[0.07] pt-3.5 text-[12.5px] text-[#98a0af]">
                <span>Won <b className="font-display text-[#f3f5f8]">{pct(d.pipeline.won, pipelineTotal)}%</b> of pipeline</span>
              </div>
            </>
          ) : <EmptyHint text="No pipeline activity yet. Saved prospects start in New." />}
        </div>
      </div>

      {/* lower */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <ListPanel title="Recent scans" items={d.scansList.map(s => ({ icon: <Search className="h-4 w-4" />, title: s.title, sub: s.sub, right: <Tag>{s.when}</Tag> }))}
          empty="No scans yet — run your first one." cta="View all scans →" onCta={onViewScans} />
        <ListPanel title="Email-ready prospects" items={d.dueList.map(s => ({ icon: <Mail className="h-4 w-4" />, title: s.name, sub: s.sub, right: <Tag kind={s.kind}>{s.tag}</Tag> }))}
          empty="No email-ready prospects yet." cta="Open email automations ->" onCta={onViewFollowups} />
      </div>
    </div>
  );
};

function EmptyHint({ text }: { text: string }) {
  return <div className="grid h-[140px] place-items-center px-6 text-center font-mono text-[12px] tracking-[0.03em] text-[#5b6472]">{text}</div>;
}
function Tag({ children, kind }: { children: React.ReactNode; kind?: "due" | "won" }) {
  const cls = kind === "due" ? "text-[#ffb23e] border-[#ffb23e]/30" : kind === "won" ? "text-[#5fe3a1] border-[#5fe3a1]/30" : "text-[#98a0af] border-[#f3f5f8]/[0.13]";
  return <span className={`rounded-[6px] border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.04em] ${cls}`}>{children}</span>;
}
interface ListItem { icon: React.ReactNode; title: string; sub: string; right: React.ReactNode; }
function ListPanel({ title, items, empty, cta, onCta }: { title: string; items: ListItem[]; empty: string; cta: string; onCta: () => void }) {
  const isEmailPanel = title === "Email-ready prospects";
  const emptyText = isEmailPanel ? "No email-ready prospects yet." : empty;
  const ctaText = isEmailPanel ? "Open email automations ->" : cta;
  return (
    <div className="rounded-[16px] border border-[#f3f5f8]/[0.07] bg-[#0f1115] p-[18px_20px]">
      <h3 className="mb-4 font-display text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
      {items.length === 0 ? <EmptyHint text={emptyText} /> : items.map((it, i) => (
        <div key={i} className="flex items-center gap-3.5 border-b border-[#f3f5f8]/[0.07] py-3 last:border-0">
          <span className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] bg-[#14171d] text-[#98a0af] shadow-[inset_0_0_0_1px_rgba(233,238,247,0.07)]">{it.icon}</span>
          <div className="min-w-0">
            <b className="block truncate text-[13.5px] font-semibold text-[#f3f5f8]">{it.title}</b>
            <span className="font-mono text-[10.5px] text-[#5b6472]">{it.sub}</span>
          </div>
          <div className="ml-auto">{it.right}</div>
        </div>
      ))}
      <button type="button" onClick={onCta} className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#5b6472] transition-colors hover:text-[#e8fb52]">{ctaText}</button>
    </div>
  );
}

function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function cumulativeFromWeeks(weeks: [number, number][], total: number): number[] {
  const perWeek = weeks.map(w => w[0] + w[1]);
  const sum = perWeek.reduce((a, b) => a + b, 0);
  let acc = Math.max(0, total - sum);
  return perWeek.map(v => (acc += v));
}
function relTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
  if (diff < DAY) return `${Math.round(diff / 3600000)}h ago`;
  if (diff < 2 * DAY) return "Yesterday";
  return `${Math.round(diff / DAY)}d ago`;
}

export default HomeDashboard;
