import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWorldCupMatches, parseMatch } from "../_shared/footballApi.ts";
import { buildPromoCode } from "../_shared/promoCode.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const footballApiKey = Deno.env.get("FOOTBALL_API_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();

// Fixed coupon ids — created automatically (see ensureCoupon) so no manual
// Stripe setup or coupon-id secrets are needed.
const WC_COUPON_FREE = "gl22-wc-free-month"; // 100% off, once
const WC_COUPON_HALF = "gl22-wc-half-off"; // 50% off, once
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

type PrizeTier = "free_month" | "half_off";

interface PredictionRow {
  bet_type: string | null;
  pred_outcome: string | null;
  pred_home: number | null;
  pred_away: number | null;
}

const outcomeOf = (h: number, a: number) => (h > a ? "home" : h < a ? "away" : "draw");

function mapStatus(apiStatus: string): "upcoming" | "locked" | "finished" {
  if (apiStatus === "FINISHED") return "finished";
  if (apiStatus === "IN_PLAY" || apiStatus === "PAUSED") return "locked";
  if (apiStatus === "SCHEDULED" || apiStatus === "TIMED") return "upcoming";
  return "locked"; // POSTPONED / SUSPENDED / CANCELLED / AWARDED — not predictable
}

// One bet per market: exact-score bet → free month only on the precise score;
// result bet → 50% off when the called Home/Draw/Away is correct.
// Inlined here (Deno function can't import the src/ scoring module).
function prizeForBet(p: PredictionRow, homeScore: number, awayScore: number): PrizeTier | null {
  if (p.bet_type === "exact" && p.pred_home !== null && p.pred_away !== null) {
    return p.pred_home === homeScore && p.pred_away === awayScore ? "free_month" : null;
  }
  if (p.bet_type === "result" && p.pred_outcome) {
    return p.pred_outcome === outcomeOf(homeScore, awayScore) ? "half_off" : null;
  }
  return null;
}

function couponForTier(tier: PrizeTier): { id: string; percentOff: number } {
  return tier === "free_month"
    ? { id: WC_COUPON_FREE, percentOff: 100 }
    : { id: WC_COUPON_HALF, percentOff: 50 };
}

// Ensures a fixed-id coupon exists in Stripe, creating it once if missing.
// Cached per warm instance so we don't re-check every payout.
const ensuredCoupons = new Set<string>();
async function ensureCoupon(id: string, percentOff: number): Promise<boolean> {
  if (ensuredCoupons.has(id)) return true;
  if (!stripeSecretKey) return false;

  const getRes = await fetch(`https://api.stripe.com/v1/coupons/${id}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  if (getRes.ok) {
    ensuredCoupons.add(id);
    return true;
  }
  if (getRes.status !== 404) return false;

  const createRes = await fetch("https://api.stripe.com/v1/coupons", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id,
      percent_off: String(percentOff),
      duration: "once",
      name: percentOff === 100 ? "World Cup — free month" : "World Cup — 50% off",
    }).toString(),
  });
  if (createRes.ok) {
    ensuredCoupons.add(id);
    return true;
  }
  // Handle a race where another tick created it first.
  const body = await createRes.json().catch(() => ({}));
  if (body?.error?.code === "resource_already_exists") {
    ensuredCoupons.add(id);
    return true;
  }
  return false;
}

async function createStripePromotionCode(code: string, couponId: string): Promise<boolean> {
  if (!stripeSecretKey || !couponId) return false;
  const res = await fetch("https://api.stripe.com/v1/promotion_codes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ coupon: couponId, code, "max_redemptions": "1" }).toString(),
  });
  return res.ok;
}

async function emailWinner(to: string, code: string, home: string, away: string, tier: PrizeTier): Promise<boolean> {
  if (!resendApiKey) return false;
  const isFree = tier === "free_month";
  const subject = isFree
    ? "You nailed the score — here's your free month ⚽"
    : "Nice call! Here's 50% off your first month ⚽";
  const intro = isFree
    ? `You predicted ${home} vs ${away} exactly right!`
    : `You called the result of ${home} vs ${away}!`;
  const perk = isFree
    ? "Use this code at checkout for your first month free:"
    : "Use this code at checkout for 50% off your first month:";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `GlobaLeads22 <${fromEmail}>`,
      to: [to],
      subject,
      text: `${intro}\n\n${perk}\n\n${code}\n\nRedeem at https://app.globaleads22.com\n\n— GlobaLeads22`,
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

  const summary = { matches: 0, winners: 0, codesIssued: 0, featured: null as string | null };

  try {
    const matches = await fetchWorldCupMatches(footballApiKey);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    // ---- 1. Sync ALL matches: upsert every WC match with fresh status + score ----
    const rows = matches.map((m) => {
      const p = parseMatch(m);
      return {
        external_id: p.externalId,
        home_team: p.homeTeam,
        away_team: p.awayTeam,
        home_flag: p.homeFlag,
        away_flag: p.awayFlag,
        kickoff_at: p.kickoffAt,
        status: mapStatus(m.status),
        home_score: p.homeScore,
        away_score: p.awayScore,
        updated_at: nowIso,
      };
    });
    if (rows.length) {
      await supabase.from("worldcup_matches").upsert(rows, { onConflict: "external_id" });
      summary.matches = rows.length;
    }

    // ---- 2. Feature the soonest upcoming match (the big hero poster) ----
    const upcoming = matches
      .map(parseMatch)
      .filter((p) => !p.isFinished && Date.parse(p.kickoffAt) > nowMs)
      .sort((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt));
    const featuredExternalId = upcoming.length ? upcoming[0].externalId : null;
    summary.featured = featuredExternalId;
    if (featuredExternalId) {
      await supabase.from("worldcup_matches").update({ is_featured: false }).eq("is_featured", true).neq("external_id", featuredExternalId);
      await supabase.from("worldcup_matches").update({ is_featured: true }).eq("external_id", featuredExternalId);
    } else {
      await supabase.from("worldcup_matches").update({ is_featured: false }).eq("is_featured", true);
    }

    // ---- 3. Reward payout pass — scan ALL finished matches; idempotent + retries failures ----
    const { data: finishedMatches } = await supabase
      .from("worldcup_matches")
      .select("id, home_team, away_team, home_score, away_score")
      .eq("status", "finished")
      .not("home_score", "is", null)
      .not("away_score", "is", null);

    for (const fm of finishedMatches ?? []) {
      const { data: predictions } = await supabase
        .from("worldcup_predictions")
        .select("id, user_id, bet_type, pred_outcome, pred_home, pred_away")
        .eq("match_id", fm.id)
        .is("rewarded_at", null);

      for (const p of predictions ?? []) {
        const tier = prizeForBet(p, fm.home_score, fm.away_score);

        if (!tier) {
          // No prize — mark processed so we don't re-evaluate this row every tick.
          await supabase.from("worldcup_predictions").update({ rewarded_at: nowIso }).eq("id", p.id);
          continue;
        }

        summary.winners += 1;
        const coupon = couponForTier(tier);
        const couponOk = await ensureCoupon(coupon.id, coupon.percentOff);
        const code = buildPromoCode();
        const created = couponOk ? await createStripePromotionCode(code, coupon.id) : false;
        if (!created) {
          // Coupon unavailable or Stripe failed — leave rewarded_at null so the next
          // tick retries. Do NOT mark is_winner until a redeemable code actually exists.
          continue;
        }
        const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
        const email = authUser?.user?.email;
        const emailed = email ? await emailWinner(email, code, fm.home_team, fm.away_team, tier) : false;
        await supabase
          .from("worldcup_predictions")
          .update({ is_winner: true, prize: tier, promo_code: code, rewarded_at: nowIso, email_sent_at: emailed ? nowIso : null })
          .eq("id", p.id);
        summary.codesIssued += 1;
      }
    }

    return json(summary);
  } catch (error) {
    console.error("worldcup-tick error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal error", summary }, 500);
  }
};

Deno.serve(handler);
