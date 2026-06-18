import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const defaultFromEmail = Deno.env.get("OUTREACH_FROM_EMAIL") || "contact@globaleads22.com";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

interface SendCampaignRequest {
  campaignId: string;
  userId: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const renderTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{\s*(firstName|name|company|email)\s*\}\}/g, (_match, key) => values[key] || "");

const getFirstName = (name = "") => name.trim().split(/\s+/)[0] || "";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: caller, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || !caller.user) return json({ error: "Unauthorized" }, 401);

    const { campaignId, userId } = (await req.json()) as SendCampaignRequest;
    if (!campaignId || !userId || caller.user.id !== userId) {
      return json({ error: "Invalid campaign request" }, 400);
    }

    if (!resendApiKey) {
      return json({ error: "RESEND_API_KEY is not configured" }, 500);
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single();

    if (campaignError || !campaign) return json({ error: "Campaign not found" }, 404);
    if (!["draft", "scheduled", "failed"].includes(campaign.status)) {
      return json({ error: `Campaign cannot be sent from ${campaign.status}` }, 409);
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from("email_campaign_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .in("status", ["queued", "failed"]);

    if (recipientsError) return json({ error: "Failed to load recipients" }, 500);
    if (!recipients?.length) return json({ error: "No queued recipients" }, 400);

    await supabase.from("email_campaigns").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", campaignId).eq("user_id", userId);

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      await supabase.from("email_campaign_recipients").update({ status: "sending", error_message: null }).eq("id", recipient.id).eq("user_id", userId);

      const values = {
        name: recipient.recipient_name || "",
        firstName: getFirstName(recipient.recipient_name || ""),
        company: recipient.company_name || "",
        email: recipient.recipient_email,
      };
      const text = renderTemplate(campaign.body, values);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${campaign.from_name || "GlobaLeads22"} <${defaultFromEmail}>`,
          to: [recipient.recipient_email],
          reply_to: campaign.reply_to || caller.user.email,
          subject: renderTemplate(campaign.subject, values),
          text,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        sent += 1;
        await supabase
          .from("email_campaign_recipients")
          .update({ status: "sent", provider_message_id: result.id || null, sent_at: new Date().toISOString(), error_message: null })
          .eq("id", recipient.id)
          .eq("user_id", userId);
      } else {
        failed += 1;
        await supabase
          .from("email_campaign_recipients")
          .update({ status: "failed", error_message: result.message || `Resend error ${response.status}` })
          .eq("id", recipient.id)
          .eq("user_id", userId);
      }
    }

    const finalStatus = failed > 0 && sent === 0 ? "failed" : "sent";
    await supabase
      .from("email_campaigns")
      .update({ status: finalStatus, sent_at: sent > 0 ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("user_id", userId);

    return json({ sent, failed });
  } catch (error) {
    console.error("send-email-campaign error:", error);
    return json({ error: "Internal server error" }, 500);
  }
};

Deno.serve(handler);
