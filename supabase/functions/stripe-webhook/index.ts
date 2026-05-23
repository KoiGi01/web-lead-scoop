import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!supabaseUrl || !supabaseServiceKey || !stripeWebhookSecret) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PLAN_CREDITS_MAP: Record<string, number> = {
  starter: 150,
  growth: 500,
  pro: 1500,
};

// Verify Stripe webhook signature
async function verifyStripeSignature(req: Request, body: string): Promise<boolean> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return false;

  // Parse signature header: t=timestamp,v1=signature
  const parts = signature.split(",");
  let timestamp = "";
  let receivedSignature = "";

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") receivedSignature = value;
  }

  if (!timestamp || !receivedSignature) return false;

  // Compute expected signature
  const signedContent = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(stripeWebhookSecret);
  const messageData = encoder.encode(signedContent);

  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature_bytes = await crypto.subtle.sign("HMAC", key, messageData);
  const computed = Array.from(new Uint8Array(signature_bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time comparison
  return computed === receivedSignature;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = await req.text();

    // Verify webhook signature
    const isValid = await verifyStripeSignature(req, body);
    if (!isValid) {
      console.warn("Invalid Stripe webhook signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const event = JSON.parse(body);

    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();

    if (existingEvent) {
      return new Response(JSON.stringify({ success: true, duplicate: true }), { status: 200 });
    }

    await supabase.from("stripe_events").insert({
      id: event.id,
      event_type: event.type,
      metadata: { livemode: event.livemode ?? null },
    });

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const {
        user_id: userId,
        bundle_key: bundleKey,
        plan_key: planKey,
        checkout_type: checkoutType,
        credits: creditsStr,
      } = session.metadata || {};
      const stripeCustomerId = session.customer;
      const stripeSubscriptionId = session.subscription || null;

      if (!userId || !creditsStr) {
        console.warn("Missing metadata in checkout session");
        return new Response(JSON.stringify({ error: "Invalid session metadata" }), { status: 400 });
      }

      const normalizedPlan = planKey || bundleKey || "free";
      const isSubscription = session.mode === "subscription" || checkoutType === "subscription";
      const credits = parseInt(creditsStr, 10);
      if (isNaN(credits)) {
        console.warn("Invalid credits in metadata");
        return new Response(JSON.stringify({ error: "Invalid credits" }), { status: 400 });
      }

      const { data: existingPayment } = await supabase
        .from("stripe_payments")
        .select("id")
        .eq("checkout_session_id", session.id)
        .maybeSingle();

      if (existingPayment) {
        return new Response(JSON.stringify({ success: true, duplicate: true }), { status: 200 });
      }

      const grossUsd = Number(session.amount_total || 0) / 100;
      const stripeFeeEstimatedUsd = grossUsd > 0 ? (grossUsd * 0.029) + 0.30 : 0;
      const netUsd = Math.max(0, grossUsd - stripeFeeEstimatedUsd);

      if (isSubscription) {
        const { error: updateError } = await supabase
          .from("user_credits")
          .upsert({
            user_id: userId,
            plan: normalizedPlan,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            subscription_status: "active",
            included_monthly_credits: PLAN_CREDITS_MAP[normalizedPlan] || credits,
            monthly_credits_reset_at: new Date().toISOString(),
            plan_source: "stripe",
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (updateError) {
          console.error("Error updating subscription:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update subscription" }), { status: 500 });
        }
      }

      let { data: newBalance, error: grantError } = await supabase.rpc("grant_user_credits", {
        p_user_id: userId,
        p_amount: credits,
        p_stripe_customer_id: stripeCustomerId,
      });

      if (grantError && /grant_user_credits|Could not find the function|schema cache/i.test(grantError.message || "")) {
        const { data: currentCredits, error: fetchError } = await supabase
          .from("user_credits")
          .select("balance, plan")
          .eq("user_id", userId)
          .single();

        if (fetchError) {
          console.error("Error fetching current credits:", fetchError);
          return new Response(JSON.stringify({ error: "Failed to fetch credits" }), { status: 500 });
        }

        const fallbackBalance = (currentCredits?.balance ?? 0) + credits;
        const { error: updateError } = await supabase
          .from("user_credits")
          .update({
            balance: fallbackBalance,
            stripe_customer_id: stripeCustomerId,
            plan: isSubscription ? normalizedPlan : currentCredits?.plan,
            stripe_subscription_id: isSubscription ? stripeSubscriptionId : undefined,
            subscription_status: isSubscription ? "active" : undefined,
            included_monthly_credits: isSubscription ? (PLAN_CREDITS_MAP[normalizedPlan] || credits) : undefined,
            monthly_credits_reset_at: isSubscription ? new Date().toISOString() : undefined,
            plan_source: isSubscription ? "stripe" : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating credits:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update credits" }), { status: 500 });
        }

        newBalance = fallbackBalance;
        grantError = null;
      }

      if (grantError || typeof newBalance !== "number") {
        console.error("Error granting credits:", grantError);
        return new Response(JSON.stringify({ error: "Failed to update credits" }), { status: 500 });
      }

      await supabase.from("stripe_payments").upsert({
        user_id: userId,
        checkout_session_id: session.id,
        payment_intent_id: session.payment_intent || null,
        stripe_customer_id: stripeCustomerId,
        bundle_key: normalizedPlan,
        gross_usd: grossUsd,
        stripe_fee_estimated_usd: stripeFeeEstimatedUsd,
        net_usd: netUsd,
        credits_granted: credits,
        currency: session.currency || "usd",
        metadata: {
          payment_status: session.payment_status,
          mode: session.mode,
          checkout_type: isSubscription ? "subscription" : "topup",
          stripe_subscription_id: stripeSubscriptionId,
        },
      }, { onConflict: "checkout_session_id" });

      await supabase.from("credit_transactions").insert({
        user_id: userId,
        type: isSubscription ? "subscription_grant" : "purchase",
        amount: credits,
        balance_after: newBalance,
        usage_type: "customer",
        description: isSubscription ? `Activated ${normalizedPlan} plan` : `Purchased ${normalizedPlan} credit top-up`,
        metadata: {
          checkout_session_id: session.id,
          gross_usd: grossUsd,
          stripe_fee_estimated_usd: stripeFeeEstimatedUsd,
          net_usd: netUsd,
          stripe_subscription_id: stripeSubscriptionId,
        },
      });

      console.log(`Credits added for user ${userId}: +${credits}`);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      const planKey = subscription.metadata?.plan_key;
      if (!userId || !planKey) {
        return new Response(JSON.stringify({ success: true, ignored: "missing metadata" }), { status: 200 });
      }

      const isDeleted = event.type === "customer.subscription.deleted";
      const status = isDeleted ? "canceled" : subscription.status || "unknown";
      const active = ["active", "trialing"].includes(status);
      const plan = active ? planKey : "free";

      await supabase
        .from("user_credits")
        .update({
          plan,
          subscription_status: status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          included_monthly_credits: active ? (PLAN_CREDITS_MAP[planKey] || 30) : 30,
          plan_source: active ? "stripe" : "stripe_canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (invoice.billing_reason === "subscription_create") {
        return new Response(JSON.stringify({ success: true, ignored: "initial invoice handled by checkout" }), { status: 200 });
      }
      if (!subscriptionId) {
        return new Response(JSON.stringify({ success: true, ignored: "no subscription" }), { status: 200 });
      }

      const { data: creditsRow } = await supabase
        .from("user_credits")
        .select("user_id, plan, stripe_customer_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      if (!creditsRow?.user_id) {
        return new Response(JSON.stringify({ success: true, ignored: "unknown subscription" }), { status: 200 });
      }

      const grantCredits = PLAN_CREDITS_MAP[creditsRow.plan] || 0;
      if (grantCredits <= 0) {
        return new Response(JSON.stringify({ success: true, ignored: "free plan" }), { status: 200 });
      }

      const { data: newBalance, error: grantError } = await supabase.rpc("grant_user_credits", {
        p_user_id: creditsRow.user_id,
        p_amount: grantCredits,
        p_stripe_customer_id: creditsRow.stripe_customer_id,
      });

      if (grantError || typeof newBalance !== "number") {
        console.error("Error granting renewal credits:", grantError);
        return new Response(JSON.stringify({ error: "Failed to grant renewal credits" }), { status: 500 });
      }

      await supabase
        .from("user_credits")
        .update({
          subscription_status: "active",
          monthly_credits_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", creditsRow.user_id);

      await supabase.from("credit_transactions").insert({
        user_id: creditsRow.user_id,
        type: "subscription_renewal",
        amount: grantCredits,
        balance_after: newBalance,
        usage_type: "customer",
        description: `Monthly ${creditsRow.plan} credits`,
        metadata: {
          invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
        },
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Ignore all other event types
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};

Deno.serve(handler);
