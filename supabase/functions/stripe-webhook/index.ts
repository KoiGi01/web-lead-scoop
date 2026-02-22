import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!supabaseUrl || !supabaseServiceKey || !stripeWebhookSecret) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CREDITS_MAP: Record<string, number> = {
  starter: 100,
  growth: 300,
  pro: 700,
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

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const { user_id: userId, bundle_key: bundleKey, credits: creditsStr } = session.metadata;
      const stripeCustomerId = session.customer;

      if (!userId || !bundleKey || !creditsStr) {
        console.warn("Missing metadata in checkout session");
        return new Response(JSON.stringify({ error: "Invalid session metadata" }), { status: 400 });
      }

      const credits = parseInt(creditsStr, 10);
      if (isNaN(credits)) {
        console.warn("Invalid credits in metadata");
        return new Response(JSON.stringify({ error: "Invalid credits" }), { status: 400 });
      }

      // Fetch current balance and update
      const { data: currentCredits, error: fetchError } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        console.error("Error fetching current credits:", fetchError);
        return new Response(JSON.stringify({ error: "Failed to fetch credits" }), { status: 500 });
      }

      const newBalance = (currentCredits?.balance ?? 0) + credits;

      const { error: updateError } = await supabase
        .from("user_credits")
        .update({
          balance: newBalance,
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating credits:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update credits" }), { status: 500 });
      }

      console.log(`Credits added for user ${userId}: +${credits}`);
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
