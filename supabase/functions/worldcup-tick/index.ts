import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWorldCupMatches, pickNextUpcoming, parseMatch } from "../_shared/footballApi.ts";
import { buildPromoCode } from "../_shared/promoCode.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const footballApiKey = Deno.env.get("FOOTBALL_API_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWcCouponId = Deno.env.get("STRIPE_WC_COUPON_ID");
const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const fromEmail = Deno.env.get("OUTREACH_FROM_EMAIL")?.trim() || "contact@globaleads22.com";
const tickSecret = Deno.env.get("WORLDCUP_TICK_SECRET");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, x-tick-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function createStripePromotionCode(code: string): Promise<boolean> {
  if (!stripeSecretKey || !stripeWcCouponId) return false;
  const res = await fetch("https://api.stripe.com/v1/promotion_codes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ coupon: stripeWcCouponId, code, "max_redemptions": "1" }).toString(),
  });
  return res.ok;
}

async function emailWinner(to: string, code: string, home: string, away: string): Promise<boolean> {
  if (!resendApiKey) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `GlobaLeads22 <${fromEmail}>`,
      to: [to],
      subject: "You nailed the score — here's your free month ⚽",
      text: `You predicted ${home} vs ${away} exactly right!\n\nUse this code at checkout for your first month free:\n\n${code}\n\nRedeem at https://app.globaleads22.com\n\n— GlobaLeads22`,
    }),
  });
  return res.ok;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (tickSecret && req.headers.get("x-tick-secret") !== tickSecret) {
    return json({ error: "Forbidden" }, 403);
  }
  if (!footballApiKey) return json({ error: "FOOTBALL_API_KEY not configured" }, 500);

  const summary = { synced: false, locked: false, resolved: false, winners: 0, codesIssued: 0 };

  try {
    const matches = await fetchWorldCupMatches(footballApiKey);
    const nowIso = new Date().toISOString();

    // ---- 1. Featured match lifecycle: lock at kickoff, mark finished (display state) ----
    const { data: featured } = await supabase
      .from("worldcup_matches")
      .select("*")
      .eq("is_featured", true)
      .maybeSingle();

    if (featured) {
      const apiMatch = matches.find((m) => String(m.id) === featured.external_id);
      const parsed = apiMatch ? parseMatch(apiMatch) : null;

      // Lock once kickoff passes.
      if (featured.status === "upcoming" && Date.parse(featured.kickoff_at) <= Date.now()) {
        await supabase.from("worldcup_matches").update({ status: "locked", updated_at: nowIso }).eq("id", featured.id);
        summary.locked = true;
      }

      if (parsed?.isFinished && parsed.homeScore !== null && parsed.awayScore !== null) {
        await supabase
          .from("worldcup_matches")
          .update({ status: "finished", home_score: parsed.homeScore, away_score: parsed.awayScore, is_featured: false, updated_at: nowIso })
          .eq("id", featured.id);
        summary.resolved = true;
      }
    }

    // ---- 2. Reward payout pass — independent of is_featured, so failures retry every tick ----
    // Find ALL finished matches with a recorded score, then pay any unrewarded exact-score
    // winners. The `rewarded_at is null` guard keeps this idempotent: a winner who already
    // has a code is skipped; a winner whose Stripe call failed last tick (rewarded_at still
    // null) is retried now.
    const { data: finishedMatches } = await supabase
      .from("worldcup_matches")
      .select("id, home_team, away_team, home_score, away_score")
      .eq("status", "finished")
      .not("home_score", "is", null)
      .not("away_score", "is", null);

    for (const fm of finishedMatches ?? []) {
      const { data: winners } = await supabase
        .from("worldcup_predictions")
        .select("id, user_id")
        .eq("match_id", fm.id)
        .eq("pred_home", fm.home_score)
        .eq("pred_away", fm.away_score)
        .is("rewarded_at", null);

      for (const w of winners ?? []) {
        summary.winners += 1;
        const code = buildPromoCode();
        const created = await createStripePromotionCode(code);
        if (!created) {
          // Stripe failed — leave the row untouched (rewarded_at stays null) so the next
          // tick retries. Do NOT mark is_winner yet: a winner is only confirmed once they
          // actually have a redeemable code.
          continue;
        }
        const { data: authUser } = await supabase.auth.admin.getUserById(w.user_id);
        const email = authUser?.user?.email;
        const emailed = email ? await emailWinner(email, code, fm.home_team, fm.away_team) : false;
        await supabase
          .from("worldcup_predictions")
          .update({ is_winner: true, promo_code: code, rewarded_at: nowIso, email_sent_at: emailed ? nowIso : null })
          .eq("id", w.id);
        summary.codesIssued += 1;
      }
    }

    // ---- 3. Sync: ensure a featured upcoming match exists ----
    const { data: stillFeatured } = await supabase
      .from("worldcup_matches")
      .select("id")
      .eq("is_featured", true)
      .maybeSingle();

    if (!stillFeatured) {
      const next = pickNextUpcoming(matches, nowIso);
      if (next) {
        // Upsert by external_id, then feature it.
        await supabase.from("worldcup_matches").upsert(
          {
            external_id: next.externalId,
            home_team: next.homeTeam,
            away_team: next.awayTeam,
            kickoff_at: next.kickoffAt,
            status: "upcoming",
            is_featured: true,
            updated_at: nowIso,
          },
          { onConflict: "external_id" },
        );
        summary.synced = true;
      }
    }

    return json(summary);
  } catch (error) {
    console.error("worldcup-tick error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal error", summary }, 500);
  }
};

Deno.serve(handler);
