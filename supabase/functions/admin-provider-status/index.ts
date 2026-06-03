import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

type ProviderKey = "google" | "firecrawl" | "hunter";
type ProviderStatus = "ok" | "warning" | "error" | "not_configured" | "unsupported";

interface ProviderInternalUsage {
  events_24h: number;
  units_24h: number;
  estimated_cost_24h_usd: number;
  failures_24h: number;
  events_30d: number;
  units_30d: number;
  estimated_cost_30d_usd: number;
}

interface ProviderAccountStatus {
  provider: ProviderKey;
  label: string;
  status: ProviderStatus;
  remaining: number | null;
  limit: number | null;
  used: number | null;
  reset_at: string | null;
  balance_label: string;
  note: string;
  checked_at: string;
  internal_usage: ProviderInternalUsage;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getCaller = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { user: null, isAdmin: false };

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { user: null, isAdmin: false };

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const isOperatorEmail = data.user.email?.toLowerCase() === "contact@globaleads22.com";
  return { user: data.user, isAdmin: Boolean(adminRow && isOperatorEmail) };
};

const emptyUsage = (): ProviderInternalUsage => ({
  events_24h: 0,
  units_24h: 0,
  estimated_cost_24h_usd: 0,
  failures_24h: 0,
  events_30d: 0,
  units_30d: 0,
  estimated_cost_30d_usd: 0,
});

const getInternalUsage = async () => {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("api_usage_events")
    .select("provider, billable_units, estimated_cost_usd, success, created_at")
    .gte("created_at", since30d)
    .in("provider", ["google", "firecrawl", "hunter"]);

  if (error) throw error;

  const usage = new Map<ProviderKey, ProviderInternalUsage>([
    ["google", emptyUsage()],
    ["firecrawl", emptyUsage()],
    ["hunter", emptyUsage()],
  ]);

  (data || []).forEach((event) => {
    const provider = String(event.provider || "") as ProviderKey;
    if (!usage.has(provider)) return;
    const row = usage.get(provider)!;
    const units = Number(event.billable_units || 0);
    const cost = Number(event.estimated_cost_usd || 0);
    row.events_30d += 1;
    row.units_30d += units;
    row.estimated_cost_30d_usd += cost;

    if (String(event.created_at || "") >= since24h) {
      row.events_24h += 1;
      row.units_24h += units;
      row.estimated_cost_24h_usd += cost;
      if (!event.success) row.failures_24h += 1;
    }
  });

  return usage;
};

const numericOrNull = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const statusFromRemaining = (remaining: number | null, limit: number | null): ProviderStatus => {
  if (remaining === null) return "ok";
  if (remaining <= 0) return "error";
  if (limit && remaining / limit <= 0.1) return "warning";
  return "ok";
};

const fetchFirecrawlStatus = async (checkedAt: string, internalUsage: ProviderInternalUsage): Promise<ProviderAccountStatus> => {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    return {
      provider: "firecrawl",
      label: "Firecrawl",
      status: "not_configured",
      remaining: null,
      limit: null,
      used: null,
      reset_at: null,
      balance_label: "No key",
      note: "FIRECRAWL_API_KEY is not configured.",
      checked_at: checkedAt,
      internal_usage: internalUsage,
    };
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v2/team/credit-usage", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json().catch(() => null);
    const payload = data?.data || {};
    const remaining = numericOrNull(payload.remainingCredits);
    const limit = numericOrNull(payload.planCredits);
    return {
      provider: "firecrawl",
      label: "Firecrawl",
      status: response.ok ? statusFromRemaining(remaining, limit) : "error",
      remaining,
      limit,
      used: remaining !== null && limit !== null ? Math.max(0, limit - remaining) : null,
      reset_at: payload.billingPeriodEnd || null,
      balance_label: remaining === null ? "Unknown" : `${remaining.toLocaleString()} credits`,
      note: response.ok ? "Live team credit balance." : `Firecrawl returned ${response.status}.`,
      checked_at: checkedAt,
      internal_usage: internalUsage,
    };
  } catch (error) {
    return {
      provider: "firecrawl",
      label: "Firecrawl",
      status: "error",
      remaining: null,
      limit: null,
      used: null,
      reset_at: null,
      balance_label: "Error",
      note: error instanceof Error ? error.message : "Could not fetch Firecrawl usage.",
      checked_at: checkedAt,
      internal_usage: internalUsage,
    };
  }
};

const fetchHunterStatus = async (checkedAt: string, internalUsage: ProviderInternalUsage): Promise<ProviderAccountStatus> => {
  const apiKey = Deno.env.get("HUNTER_API_KEY");
  if (!apiKey) {
    return {
      provider: "hunter",
      label: "Hunter.io",
      status: "not_configured",
      remaining: null,
      limit: null,
      used: null,
      reset_at: null,
      balance_label: "No key",
      note: "HUNTER_API_KEY is not configured.",
      checked_at: checkedAt,
      internal_usage: internalUsage,
    };
  }

  try {
    const response = await fetch(`https://api.hunter.io/v2/account?api_key=${encodeURIComponent(apiKey)}`);
    const data = await response.json().catch(() => null);
    const account = data?.data || {};
    const credits = account?.requests?.credits || account?.calls || {};
    const remaining = numericOrNull(credits.available);
    const used = numericOrNull(credits.used);
    const limit = remaining !== null && used !== null ? remaining + used : null;
    return {
      provider: "hunter",
      label: "Hunter.io",
      status: response.ok ? statusFromRemaining(remaining, limit) : "error",
      remaining,
      limit,
      used,
      reset_at: account.reset_date || null,
      balance_label: remaining === null ? "Unknown" : `${remaining.toLocaleString()} credits`,
      note: response.ok ? `${account.plan_name || "Hunter"} account usage.` : `Hunter returned ${response.status}.`,
      checked_at: checkedAt,
      internal_usage: internalUsage,
    };
  } catch (error) {
    return {
      provider: "hunter",
      label: "Hunter.io",
      status: "error",
      remaining: null,
      limit: null,
      used: null,
      reset_at: null,
      balance_label: "Error",
      note: error instanceof Error ? error.message : "Could not fetch Hunter account usage.",
      checked_at: checkedAt,
      internal_usage: internalUsage,
    };
  }
};

const getGoogleStatus = (checkedAt: string, internalUsage: ProviderInternalUsage): ProviderAccountStatus => {
  const configuredLimit = numericOrNull(Deno.env.get("GOOGLE_PLACES_DAILY_REQUEST_LIMIT"));
  const remaining = configuredLimit !== null ? Math.max(0, configuredLimit - internalUsage.units_24h) : null;
  return {
    provider: "google",
    label: "Google Maps",
    status: configuredLimit !== null ? statusFromRemaining(remaining, configuredLimit) : "unsupported",
    remaining,
    limit: configuredLimit,
    used: configuredLimit !== null ? internalUsage.units_24h : null,
    reset_at: null,
    balance_label: configuredLimit !== null ? `${remaining?.toLocaleString() || 0} requests today` : "Console only",
    note: configuredLimit !== null
      ? "Estimated from internal Places request logs and GOOGLE_PLACES_DAILY_REQUEST_LIMIT."
      : "Maps quota/billing balance is not available from the Maps API key. Use Google Cloud quota/billing APIs or set GOOGLE_PLACES_DAILY_REQUEST_LIMIT for an internal estimate.",
    checked_at: checkedAt,
    internal_usage: internalUsage,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { user, isAdmin } = await getCaller(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const checkedAt = new Date().toISOString();
    const usage = await getInternalUsage();
    const [firecrawl, hunter] = await Promise.all([
      fetchFirecrawlStatus(checkedAt, usage.get("firecrawl") || emptyUsage()),
      fetchHunterStatus(checkedAt, usage.get("hunter") || emptyUsage()),
    ]);

    return json({
      providers: [
        getGoogleStatus(checkedAt, usage.get("google") || emptyUsage()),
        firecrawl,
        hunter,
      ],
    });
  } catch (error) {
    console.error("admin-provider-status error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
