import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceKey) throw new Error("Missing required Supabase environment variables");

const supabase = createClient(supabaseUrl, serviceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const validOutcome = (o: unknown) => o === "home" || o === "draw" || o === "away";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Please sign in to predict." }, 401);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: caller, error: callerError } = await supabase.auth.getUser(token);
  if (callerError || !caller.user) return json({ error: "Please sign in to predict." }, 401);
  const uid = caller.user.id;

  let body: { matchId?: string; bet?: { type?: string; home?: number; away?: number; outcome?: string }; ref?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const { matchId, bet, ref } = body;
  if (!matchId || !bet || (bet.type !== "exact" && bet.type !== "result")) return json({ error: "Invalid prediction" }, 400);
  if (bet.type === "exact" && (typeof bet.home !== "number" || typeof bet.away !== "number")) return json({ error: "Invalid score" }, 400);
  if (bet.type === "result" && !validOutcome(bet.outcome)) return json({ error: "Invalid result" }, 400);

  // Match must still be open.
  const { data: match } = await supabase
    .from("worldcup_matches")
    .select("id, status, kickoff_at")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return json({ error: "Match not found" }, 404);
  if (match.status !== "upcoming" || Date.parse(match.kickoff_at) <= Date.now()) {
    return json({ error: "Predictions are closed for this match." }, 409);
  }

  // Ensure the entrant row exists; attribute the referral on first entry only.
  const { data: entrant } = await supabase.from("worldcup_entrants").select("user_id").eq("user_id", uid).maybeSingle();
  if (!entrant) {
    let referredBy: string | null = null;
    if (ref && typeof ref === "string" && ref !== uid) {
      // Only credit a referrer who is themselves an entrant (has predicted).
      const { data: refRow } = await supabase.from("worldcup_entrants").select("user_id").eq("user_id", ref).maybeSingle();
      if (refRow) referredBy = ref;
    }
    await supabase.from("worldcup_entrants").insert({ user_id: uid, referred_by: referredBy });
  }

  // Allowance: 1 base entry + 1 per person you referred who has predicted.
  const { count: refCount } = await supabase
    .from("worldcup_entrants")
    .select("user_id", { count: "exact", head: true })
    .eq("referred_by", uid);
  const { count: usedCount } = await supabase
    .from("worldcup_predictions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid);
  const allowed = 1 + (refCount ?? 0);
  const used = usedCount ?? 0;
  if (used >= allowed) {
    return json({ error: "You're out of predictions. Invite a friend to earn another.", code: "NO_ENTRIES", remaining: 0 }, 403);
  }

  const row =
    bet.type === "exact"
      ? { user_id: uid, match_id: matchId, bet_type: "exact", pred_home: bet.home, pred_away: bet.away }
      : { user_id: uid, match_id: matchId, bet_type: "result", pred_outcome: bet.outcome };
  const { error: insErr } = await supabase.from("worldcup_predictions").insert(row);
  if (insErr) {
    if (insErr.code === "23505") return json({ error: "You already predicted this match." }, 409);
    return json({ error: insErr.message }, 500);
  }

  return json({ ok: true, remaining: allowed - used - 1 });
};

Deno.serve(handler);
