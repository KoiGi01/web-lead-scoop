import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripePriceStarter = Deno.env.get("STRIPE_PRICE_STARTER");
const stripePriceGrowth = Deno.env.get("STRIPE_PRICE_GROWTH");
const stripePricePro = Deno.env.get("STRIPE_PRICE_PRO");
const stripeSubscriptionPriceStarter = Deno.env.get("STRIPE_SUBSCRIPTION_PRICE_STARTER") || stripePriceStarter;
const stripeSubscriptionPriceGrowth = Deno.env.get("STRIPE_SUBSCRIPTION_PRICE_GROWTH") || stripePriceGrowth;
const stripeSubscriptionPricePro = Deno.env.get("STRIPE_SUBSCRIPTION_PRICE_PRO") || stripePricePro;
const stripeTopupPriceStarter = Deno.env.get("STRIPE_TOPUP_PRICE_STARTER") || stripePriceStarter;
const stripeTopupPriceGrowth = Deno.env.get("STRIPE_TOPUP_PRICE_GROWTH") || stripePriceGrowth;
const stripeTopupPricePro = Deno.env.get("STRIPE_TOPUP_PRICE_PRO") || stripePricePro;
const stripeFounderCouponId = Deno.env.get("STRIPE_FOUNDER_COUPON_ID");

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !stripePriceStarter || !stripePriceGrowth || !stripePricePro) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PLAN_CREDITS_MAP: Record<string, number> = {
  starter: 150,
  growth: 500,
  pro: 1500,
};

const TOPUP_CREDITS_MAP: Record<string, number> = {
  starter: 100,
  growth: 300,
  pro: 800,
};

const SUBSCRIPTION_PRICE_MAP: Record<string, string> = {
  starter: stripeSubscriptionPriceStarter!,
  growth: stripeSubscriptionPriceGrowth!,
  pro: stripeSubscriptionPricePro!,
};

const TOPUP_PRICE_MAP: Record<string, string> = {
  starter: stripeTopupPriceStarter!,
  growth: stripeTopupPriceGrowth!,
  pro: stripeTopupPricePro!,
};

interface CheckoutRequest {
  bundleKey?: string;
  planKey?: string;
  checkoutType?: "subscription" | "topup";
  userId: string;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
};

const handler = async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { bundleKey, planKey, checkoutType = "topup", userId } = (await req.json()) as CheckoutRequest;
    const key = planKey || bundleKey;

    if (!key || !userId) {
      return new Response(JSON.stringify({ error: "Missing plan/bundle key or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSubscription = checkoutType === "subscription";
    const credits = isSubscription ? PLAN_CREDITS_MAP[key] : TOPUP_CREDITS_MAP[key];
    const priceId = isSubscription ? SUBSCRIPTION_PRICE_MAP[key] : TOPUP_PRICE_MAP[key];

    if (!credits || !priceId) {
      return new Response(JSON.stringify({ error: "Invalid checkout key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: caller, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || caller.user?.id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser?.user?.email) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has existing stripe_customer_id
    const { data: creditsData, error: creditsError } = await supabase
      .from("user_credits")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (creditsError && creditsError.code !== "PGRST116") {
      console.error("Error fetching credits:", creditsError);
      return new Response(JSON.stringify({ error: "Failed to fetch user credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingCustomerId = creditsData?.stripe_customer_id || null;

    const applyFounderCoupon = isSubscription && (key === "starter" || key === "growth")
      ? await hasFounderCouponRedemptions()
      : false;

    // Create Stripe Checkout Session
    const checkoutData: Record<string, unknown> = {
      mode: isSubscription ? "subscription" : "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `https://app.globaleads22.com/?checkout=${isSubscription ? "subscription_success" : "success"}`,
      cancel_url: "https://globaleads22.com/#pricing",
      metadata: {
        user_id: userId,
        checkout_type: checkoutType,
        plan_key: key,
        bundle_key: key,
        credits: credits.toString(),
        founder_discount: applyFounderCoupon ? "true" : "false",
      },
      discounts: applyFounderCoupon ? [{ coupon: stripeFounderCouponId }] : undefined,
      subscription_data: isSubscription ? {
        metadata: {
          user_id: userId,
          plan_key: key,
          included_credits: credits.toString(),
          founder_discount: applyFounderCoupon ? "true" : "false",
        },
      } : undefined,
    };

    // Use existing customer if available, otherwise create one
    if (existingCustomerId) {
      checkoutData.customer = existingCustomerId;
    } else {
      checkoutData.customer_email = authUser.user.email;
      checkoutData.customer_creation = "always";
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(flattenObject(checkoutData)).toString(),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.text();
      console.error("Stripe API error:", stripeResponse.status, error);
      return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripeResponse.json();

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

async function hasFounderCouponRedemptions(): Promise<boolean> {
  if (!stripeFounderCouponId) return false;

  try {
    const response = await fetch(`https://api.stripe.com/v1/coupons/${stripeFounderCouponId}`, {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
    });
    if (!response.ok) return false;

    const coupon = await response.json();
    if (!coupon.valid) return false;
    if (typeof coupon.max_redemptions !== "number") return true;
    return (coupon.times_redeemed || 0) < coupon.max_redemptions;
  } catch (error) {
    console.error("Founder coupon lookup failed:", error);
    return false;
  }
}

// Helper to flatten nested objects for URLSearchParams
function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const key in obj) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    const newKey = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(result, flattenObject(item as Record<string, unknown>, `${newKey}[${index}]`));
        } else {
          result[`${newKey}[${index}]`] = String(item);
        }
      });
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

Deno.serve(handler);
