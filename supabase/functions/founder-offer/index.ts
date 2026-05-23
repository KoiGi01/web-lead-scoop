const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeFounderCouponId = Deno.env.get("STRIPE_FOUNDER_COUPON_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!stripeSecretKey || !stripeFounderCouponId) {
    return json({ enabled: false, remaining: 0, total: 0, reason: "missing_config" });
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/coupons/${stripeFounderCouponId}`, {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });

    if (!response.ok) {
      console.error("Founder coupon fetch failed:", response.status, await response.text());
      return json({ enabled: false, remaining: 0, total: 0, reason: "stripe_fetch_failed" });
    }

    const coupon = await response.json();
    const total = typeof coupon.max_redemptions === "number" ? coupon.max_redemptions : 0;
    const redeemed = coupon.times_redeemed || 0;
    const remaining = total > 0 ? Math.max(0, total - redeemed) : 0;

    return json({
      enabled: Boolean(coupon.valid && remaining > 0),
      remaining,
      total,
    });
  } catch (error) {
    console.error("Founder offer error:", error);
    return json({ enabled: false, remaining: 0, total: 0, reason: "exception" });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
