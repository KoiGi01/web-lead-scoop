import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Plus, Search } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * OpportunitiesDashboard
 *
 * Presentation-layer dashboard for the "Opportunities" workspace, built to the
 * design handoff in Claude-Design-Handoff/design_handoff_app_workspace.
 *
 * It is wired to REAL saved_leads data. The opportunity score, signal tags, and
 * intent come from `intelligence` (opportunityScore / detectedIssues), which is
 * populated by opportunity analysis (REWORK_PLAN phases 3-6). Until those phases
 * land for a given lead, the score-dependent UI degrades to graceful states
 * instead of showing fabricated numbers.
 *
 * Scope note: this renders the CONTENT column only (page header -> KPIs ->
 * charts -> table). The sidebar/top-bar reskin is the last step in the handoff's
 * ordering and is intentionally not done here.
 */

/* ---- design tokens (scoped under .gl-opps; mirror SPEC.md) ---- */
const C = {
  bg: "#0a0b0e",
  surf: "#111319",
  surf2: "#161922",
  surf3: "#1d212c",
  line: "rgba(233,238,247,.08)",
  line2: "rgba(233,238,247,.14)",
  text: "#f3f5f8",
  muted: "#9aa3b2",
  dim: "#5d6675",
  acc: "#e8fb52",
  accSoft: "rgba(232,251,82,.16)",
  hot: "#ff5c49",
  warm: "#ffb23e",
  mint: "#5fe3a1",
};

interface LeadIntelligence {
  opportunityScore?: number;
  detectedIssues?: string[];
  outreachHook?: string;
}

interface DashLead {
  id: string;
  name: string;
  category: string;
  selected_service: string | null;
  created_at: string;
  score: number | null;
  signals: string[];
}

interface OpportunitiesDashboardProps {
  userId: string | undefined;
  /** Optional context line under the H1, e.g. "Web design · Dentists · Austin, TX". */
  scopeLabel?: string;
  /** Opens the existing scan-creation flow. */
  onNewScan?: () => void;
}

const SIGNAL_LABELS: Record<string, string> = {
  outdated_website: "Outdated site",
  no_online_booking: "No booking",
  no_clear_cta: "No CTA",
  no_contact_form: "No form",
  generic_inbox: "Generic inbox",
  low_review_count: "Thin reviews",
  no_social_links: "No socials",
  weak_local_visibility: "Weak visibility",
  not_mobile_friendly: "Not mobile",
  slow_site: "Slow site",
};

const prettySignal = (raw: string) =>
  SIGNAL_LABELS[raw] ??
  raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const fmt = (n: number) => n.toLocaleString("en-US");

/* ---------- small count-up hook (respects reduced motion) ---------- */
function useCountUp(target: number, enabled = true, duration = 1100) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const rafRef = useRef<number>();

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || reduce || target === 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(target * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, enabled, duration]);

  return value;
}

/* ---------- KPI card ---------- */
interface KpiProps {
  label: string;
  value: number | null;
  delta?: { dir: "up" | "down"; text: string };
  accent?: boolean;
  spark: number[];
  ready: boolean;
}

const Kpi = ({ label, value, delta, accent, spark, ready }: KpiProps) => {
  const animated = useCountUp(value ?? 0, ready && value !== null);
  const sparkData = spark.map((v, i) => ({ i, v }));
  const stroke = accent ? C.acc : C.muted;
  const fill = accent ? "rgba(232,251,82,.18)" : "rgba(154,163,178,.10)";

  return (
    <div className="kpi">
      <div className="k">{label}</div>
      <div className="vrow">
        <span className={`v${accent ? " acc" : ""}`}>
          {value === null ? "—" : fmt(Math.round(animated))}
        </span>
        {delta && (
          <span className={`delta ${delta.dir}`}>
            {delta.dir === "up" ? "▲" : "▼"} {delta.text}
          </span>
        )}
      </div>
      <div className="spark">
        {spark.length > 1 && (
          <ResponsiveContainer width="100%" height={38}>
            <AreaChart data={sparkData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={stroke}
                strokeWidth={1.6}
                fill={fill}
                isAnimationActive={ready}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

/* ---------- score ring (SVG per SPEC) ---------- */
const ScoreRing = ({ score, ready }: { score: number; ready: boolean }) => {
  const animated = useCountUp(score, ready);
  const dash = 94.2;
  const offset = dash * (1 - Math.max(0, Math.min(100, animated)) / 100);
  return (
    <div className="score">
      <svg className="ring" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke={C.line2} strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={C.acc}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={offset}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <b>{Math.round(animated)}</b>
    </div>
  );
};

const OpportunitiesDashboard = ({ userId, scopeLabel, onNewScan }: OpportunitiesDashboardProps) => {
  const [leads, setLeads] = useState<DashLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("saved_leads")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        const mapped: DashLead[] = (data || []).map((row: Record<string, unknown>) => {
          const intel = (row.intelligence ?? null) as LeadIntelligence | null;
          const rawScore = intel?.opportunityScore;
          const issues = Array.isArray(intel?.detectedIssues) ? intel!.detectedIssues! : [];
          return {
            id: String(row.id ?? ""),
            name: (row.name as string) || "Unknown business",
            category: (row.category as string) || "",
            selected_service: (row.selected_service as string) || null,
            created_at: (row.created_at as string) || new Date().toISOString(),
            score: typeof rawScore === "number" ? rawScore : null,
            signals: issues.map(prettySignal),
          };
        });
        setLeads(mapped);
      } catch (err) {
        console.error("Error loading opportunities dashboard:", err);
        toast({ title: "Error", description: "Failed to load opportunities", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // trigger mount animations once data has loaded
  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [loading]);

  const scored = useMemo(() => leads.filter((l) => l.score !== null), [leads]);

  /* ----- KPI metrics from real data ----- */
  const metrics = useMemo(() => {
    const total = leads.length;
    const opportunities = scored.filter((l) => (l.score ?? 0) >= 70).length;
    const highIntent = scored.filter((l) => (l.score ?? 0) >= 80).length;
    const avg = scored.length
      ? Math.round(scored.reduce((s, l) => s + (l.score ?? 0), 0) / scored.length)
      : null;
    return { total, opportunities, highIntent, avg };
  }, [leads, scored]);

  /* ----- time buckets (last 8 days) for sparklines + bar chart ----- */
  const buckets = useMemo(() => {
    const days = 8;
    const now = new Date();
    const out = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      d.setHours(0, 0, 0, 0);
      return { label: i === days - 1 ? "now" : `d${i + 1}`, start: d.getTime(), total: 0, opp: 0, scoreSum: 0, scoreN: 0, high: 0 };
    });
    const startOf = out[0].start;
    leads.forEach((l) => {
      const t = new Date(l.created_at).getTime();
      if (isNaN(t) || t < startOf) return;
      let idx = out.length - 1;
      for (let i = 0; i < out.length; i++) {
        const next = out[i + 1]?.start ?? Infinity;
        if (t >= out[i].start && t < next) {
          idx = i;
          break;
        }
      }
      const b = out[idx];
      b.total += 1;
      if (l.score !== null) {
        b.scoreSum += l.score;
        b.scoreN += 1;
        if (l.score >= 70) b.opp += 1;
        if (l.score >= 80) b.high += 1;
      }
    });
    return out;
  }, [leads]);

  const sparks = useMemo(() => {
    const cum = (key: "total" | "opp" | "high") => {
      let acc = 0;
      return buckets.map((b) => (acc += b[key]));
    };
    return {
      analyzed: cum("total"),
      opportunities: cum("opp"),
      avg: buckets.map((b) => (b.scoreN ? Math.round(b.scoreSum / b.scoreN) : 0)),
      high: cum("high"),
    };
  }, [buckets]);

  const barData = useMemo(
    () => buckets.map((b) => ({ label: b.label, opp: b.opp, low: Math.max(0, b.total - b.opp) })),
    [buckets]
  );
  const hasBarData = barData.some((b) => b.opp + b.low > 0);

  /* ----- donut score distribution ----- */
  const dist = useMemo(() => {
    const top = scored.filter((l) => (l.score ?? 0) >= 80).length;
    const mid = scored.filter((l) => (l.score ?? 0) >= 60 && (l.score ?? 0) < 80).length;
    const low = scored.filter((l) => (l.score ?? 0) < 60).length;
    return { top, mid, low, total: scored.length };
  }, [scored]);
  const donutData = [
    { name: "80+", value: dist.top, color: C.acc },
    { name: "60–79", value: dist.mid, color: C.warm },
    { name: "Below 60", value: dist.low, color: C.surf3 },
  ].filter((d) => d.value > 0);

  /* ----- table rows ----- */
  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return leads
      .filter((l) => !q || l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .slice(0, 12);
  }, [leads, filter]);

  const intentOf = (score: number | null): { cls: string; label: string } | null => {
    if (score === null) return null;
    if (score >= 80) return { cls: "high", label: "High" };
    if (score >= 60) return { cls: "med", label: "Med" };
    return { cls: "med", label: "Low" };
  };

  return (
    <div className="gl-opps">
      <ScopedStyles />

      <div className="content">
        {/* page header */}
        <div className="page-hd">
          <div>
            <h1>Opportunities</h1>
            <div className="sub">
              {scopeLabel || "All saved prospects"}
              {!loading && ` · ${fmt(leads.length)} loaded`}
            </div>
          </div>
          <div className="hd-actions">
            <div className="search">
              <Search size={15} />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter opportunities…"
              />
            </div>
            <button className="icon-btn" type="button" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <button className="btn" type="button" onClick={onNewScan}>
              <Plus size={15} /> New scan
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="kpis">
          <Kpi
            label="Businesses analyzed"
            value={loading ? null : metrics.total}
            spark={sparks.analyzed}
            ready={ready}
          />
          <Kpi
            label="Opportunities"
            value={loading ? null : metrics.opportunities}
            accent
            spark={sparks.opportunities}
            ready={ready}
          />
          <Kpi
            label="Avg. match score"
            value={loading ? null : metrics.avg}
            spark={sparks.avg}
            ready={ready}
          />
          <Kpi
            label="High intent"
            value={loading ? null : metrics.highIntent}
            spark={sparks.high}
            ready={ready}
          />
        </div>

        {/* chart panels */}
        <div className="panels">
          <div className="panel">
            <div className="panel-hd">
              <h3>Opportunities found · last 8 days</h3>
              <div className="legend">
                <span><i style={{ background: C.acc }} />Opportunity</span>
                <span><i style={{ background: C.surf3 }} />Low fit</span>
              </div>
            </div>
            {hasBarData ? (
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barCategoryGap="28%" margin={{ top: 8, bottom: 0, left: 0, right: 0 }}>
                    <Bar dataKey="low" stackId="a" fill={C.surf3} radius={[0, 0, 3, 3]} isAnimationActive={ready} maxBarSize={34} />
                    <Bar dataKey="opp" stackId="a" fill={C.acc} radius={[3, 3, 0, 0]} isAnimationActive={ready} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyPanel text="No scans in the last 8 days." />
            )}
          </div>

          <div className="panel">
            <div className="panel-hd"><h3>Score distribution</h3></div>
            {dist.total > 0 ? (
              <div className="donut-wrap">
                <div className="donut">
                  <ResponsiveContainer width={128} height={128}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        innerRadius={48}
                        outerRadius={64}
                        paddingAngle={3}
                        cornerRadius={5}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        isAnimationActive={ready}
                      >
                        {donutData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="center">
                    <b>{fmt(dist.total)}</b>
                    <span>opps</span>
                  </div>
                </div>
                <div className="dist-legend">
                  <div className="row"><i style={{ background: C.acc }} /><span className="rl">Score 80+</span><span className="rv">{dist.top}</span></div>
                  <div className="row"><i style={{ background: C.warm }} /><span className="rl">60–79</span><span className="rv">{dist.mid}</span></div>
                  <div className="row"><i style={{ background: C.surf3 }} /><span className="rl">Below 60</span><span className="rv">{dist.low}</span></div>
                </div>
              </div>
            ) : (
              <EmptyPanel text="No scored opportunities yet. Scores appear once opportunity analysis runs." />
            )}
          </div>
        </div>

        {/* table */}
        <div className="table-wrap">
          <div className="trow head">
            <span>Business</span>
            <span>Signals</span>
            <span>Intent</span>
            <span>Match</span>
            <span />
          </div>
          {loading ? (
            <div className="empty-row">Loading opportunities…</div>
          ) : rows.length === 0 ? (
            <div className="empty-row">
              No opportunities yet. Run a scan to start finding prospects with a reason to buy.
            </div>
          ) : (
            rows.map((l, i) => {
              const intent = intentOf(l.score);
              const featured = i === 0 && (l.score ?? 0) >= 80;
              return (
                <div key={l.id} className={`trow${featured ? " feat" : ""}`}>
                  <div className="biz">
                    <b>{l.name}</b>
                    <span>{[l.category, l.selected_service].filter(Boolean).join(" · ") || "—"}</span>
                  </div>
                  <div className="sigs">
                    {l.signals.length === 0 ? (
                      <span className="sig-empty">Not scored yet</span>
                    ) : (
                      <>
                        {l.signals.slice(0, 2).map((s) => (
                          <span key={s}>{s}</span>
                        ))}
                        {l.signals.length > 2 && <span>+{l.signals.length - 2}</span>}
                      </>
                    )}
                  </div>
                  {intent ? (
                    <span className={`intent ${intent.cls}`}><i />{intent.label}</span>
                  ) : (
                    <span className="intent na"><i />—</span>
                  )}
                  {l.score !== null ? (
                    <ScoreRing score={l.score} ready={ready} />
                  ) : (
                    <span className="score-na">—</span>
                  )}
                  <span className={`go${featured ? "" : " ghost"}`} role="button">Open</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyPanel = ({ text }: { text: string }) => (
  <div className="empty-panel">{text}</div>
);

/* ---------- scoped styles + fonts ---------- */
const ScopedStyles = () => {
  useEffect(() => {
    const id = "gl-opps-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <style>{`
.gl-opps{
  --bg:#0a0b0e;--surf:#111319;--surf-2:#161922;--surf-3:#1d212c;
  --line:rgba(233,238,247,.08);--line-2:rgba(233,238,247,.14);
  --text:#f3f5f8;--muted:#9aa3b2;--dim:#5d6675;
  --acc:#e8fb52;--acc-soft:rgba(232,251,82,.16);--hot:#ff5c49;--warm:#ffb23e;--mint:#5fe3a1;
  --disp:"Bricolage Grotesque",system-ui,sans-serif;
  --sans:"Hanken Grotesk",system-ui,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,monospace;
  background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100%;
}
.gl-opps *{box-sizing:border-box;}
.gl-opps ::selection{background:var(--acc);color:#0a0b0e;}
.gl-opps .content{padding:28px;}

.gl-opps .page-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:24px;}
.gl-opps .page-hd h1{font-family:var(--disp);font-weight:700;font-size:30px;letter-spacing:-.025em;margin:0;}
.gl-opps .page-hd .sub{font-family:var(--mono);font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--dim);margin-top:8px;}
.gl-opps .hd-actions{display:flex;align-items:center;gap:10px;}
.gl-opps .search{display:flex;align-items:center;gap:9px;background:var(--surf);border:1px solid var(--line);border-radius:999px;padding:8px 16px;min-width:240px;}
.gl-opps .search svg{color:var(--dim);}
.gl-opps .search input{background:none;border:0;outline:none;color:var(--text);font-family:var(--sans);font-size:13px;width:100%;}
.gl-opps .search input::placeholder{color:var(--dim);}
.gl-opps .icon-btn{width:36px;height:36px;border-radius:9px;border:1px solid var(--line);background:var(--surf);display:grid;place-items:center;color:var(--muted);cursor:pointer;transition:color .15s,border-color .15s;}
.gl-opps .icon-btn:hover{color:var(--text);border-color:var(--line-2);}
.gl-opps .btn{font-family:var(--sans);font-weight:600;font-size:13.5px;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;border:0;cursor:pointer;background:var(--acc);color:#0a0b0e;transition:background .15s;}
.gl-opps .btn:hover{background:#fff;}

.gl-opps .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px;}
.gl-opps .kpi{border:1px solid var(--line);border-radius:16px;padding:18px 20px;background:var(--surf);transition:border-color .2s;}
.gl-opps .kpi:hover{border-color:var(--line-2);}
.gl-opps .kpi .k{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);}
.gl-opps .kpi .vrow{display:flex;align-items:baseline;gap:10px;margin-top:10px;}
.gl-opps .kpi .v{font-family:var(--disp);font-weight:700;font-size:34px;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums;}
.gl-opps .kpi .v.acc{color:var(--acc);}
.gl-opps .kpi .delta{font-family:var(--mono);font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:3px;}
.gl-opps .kpi .delta.up{color:var(--mint);}
.gl-opps .kpi .delta.down{color:var(--hot);}
.gl-opps .kpi .spark{margin-top:14px;height:38px;}

.gl-opps .panels{display:grid;grid-template-columns:1.6fr 1fr;gap:14px;margin-bottom:14px;}
.gl-opps .panel{border:1px solid var(--line);border-radius:16px;background:var(--surf);padding:20px 22px;}
.gl-opps .panel-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.gl-opps .panel-hd h3{font-family:var(--disp);font-weight:600;font-size:16px;letter-spacing:-.01em;margin:0;}
.gl-opps .panel-hd .legend{display:flex;gap:14px;}
.gl-opps .panel-hd .legend span{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);display:inline-flex;align-items:center;gap:6px;}
.gl-opps .panel-hd .legend i{width:8px;height:8px;border-radius:2px;}

.gl-opps .donut-wrap{display:flex;align-items:center;gap:22px;}
.gl-opps .donut{position:relative;width:128px;height:128px;flex-shrink:0;}
.gl-opps .donut .center{position:absolute;inset:0;display:grid;place-items:center;text-align:center;pointer-events:none;}
.gl-opps .donut .center b{font-family:var(--disp);font-weight:700;font-size:30px;letter-spacing:-.03em;display:block;line-height:1;}
.gl-opps .donut .center span{font-family:var(--mono);font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);}
.gl-opps .dist-legend{display:flex;flex-direction:column;gap:12px;flex:1;}
.gl-opps .dist-legend .row{display:flex;align-items:center;gap:10px;}
.gl-opps .dist-legend .row i{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
.gl-opps .dist-legend .row .rl{font-size:13px;color:var(--muted);}
.gl-opps .dist-legend .row .rv{margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--text);}

.gl-opps .empty-panel{display:grid;place-items:center;height:140px;text-align:center;color:var(--dim);font-size:13px;padding:0 24px;font-family:var(--mono);letter-spacing:.03em;}

.gl-opps .table-wrap{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--surf);}
.gl-opps .trow{display:grid;grid-template-columns:1.7fr 1.5fr .8fr .7fr 92px;gap:18px;align-items:center;padding:16px 22px;border-bottom:1px solid var(--line);transition:background .15s;}
.gl-opps .trow:last-child{border-bottom:0;}
.gl-opps .trow.head{background:var(--surf-2);}
.gl-opps .trow.head span{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);}
.gl-opps .trow:not(.head):hover{background:var(--surf-2);}
.gl-opps .trow.feat{background:rgba(232,251,82,.06);}
.gl-opps .biz b{font-family:var(--disp);font-weight:600;font-size:16px;display:block;letter-spacing:-.01em;}
.gl-opps .biz span{font-family:var(--mono);font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--dim);}
.gl-opps .sigs{display:flex;gap:6px;flex-wrap:wrap;}
.gl-opps .sigs span{font-family:var(--mono);font-size:9.5px;letter-spacing:.03em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:4px 7px;}
.gl-opps .sigs .sig-empty{color:var(--dim);border-style:dashed;}
.gl-opps .intent{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:11px;letter-spacing:.04em;text-transform:uppercase;}
.gl-opps .intent i{width:7px;height:7px;border-radius:50%;}
.gl-opps .intent.high{color:var(--hot);}
.gl-opps .intent.high i{background:var(--hot);}
.gl-opps .intent.med{color:var(--warm);}
.gl-opps .intent.med i{background:var(--warm);}
.gl-opps .intent.na{color:var(--dim);}
.gl-opps .intent.na i{background:var(--dim);}
.gl-opps .score{display:flex;align-items:center;gap:10px;}
.gl-opps .score .ring{width:38px;height:38px;flex-shrink:0;}
.gl-opps .score b{font-family:var(--disp);font-weight:700;font-size:19px;color:var(--acc);font-variant-numeric:tabular-nums;}
.gl-opps .score-na{font-family:var(--disp);font-size:19px;color:var(--dim);}
.gl-opps .go{justify-self:end;font-family:var(--sans);font-weight:600;font-size:12.5px;color:#0a0b0e;background:var(--acc);border-radius:999px;padding:8px 15px;cursor:pointer;}
.gl-opps .go.ghost{background:transparent;color:var(--text);border:1px solid var(--line-2);}
.gl-opps .trow:hover .go.ghost{border-color:var(--acc);color:var(--acc);}
.gl-opps .empty-row{padding:40px 22px;text-align:center;color:var(--dim);font-size:13px;}

@media (max-width:1080px){
  .gl-opps .kpis{grid-template-columns:1fr 1fr;}
  .gl-opps .panels{grid-template-columns:1fr;}
}
@media (max-width:720px){
  .gl-opps .trow{grid-template-columns:1fr auto;}
  .gl-opps .sigs,.gl-opps .intent{display:none;}
  .gl-opps .hd-actions .search{display:none;}
}
@media (prefers-reduced-motion: reduce){
  .gl-opps *{animation:none!important;transition:none!important;}
}
`}</style>
  );
};

export default OpportunitiesDashboard;
