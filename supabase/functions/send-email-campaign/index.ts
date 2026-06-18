import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const defaultFromEmail = Deno.env.get("OUTREACH_FROM_EMAIL")?.trim() || "contact@globaleads22.com";

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

const errorJson = (error: string, status: number, details?: Record<string, unknown>) =>
  json({ error, status, ...details }, status);

const renderTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{\s*(firstName|name|company|email)\s*\}\}/g, (_match, key) => values[key] || "");

const getFirstName = (name = "") => name.trim().split(/\s+/)[0] || "";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isSafeImageUrl = (value: string | null | undefined) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const renderParagraphs = (text: string) =>
  escapeHtml(text)
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");

const renderHtml = (bodyText: string, signatureText: string, fontFamily: string, imageUrl: string | null) => {
  const safeFont = fontFamily || "Arial, sans-serif";
  const image = isSafeImageUrl(imageUrl)
    ? `<img src="${escapeHtml(imageUrl || "")}" alt="" style="display:block;width:100%;max-height:280px;object-fit:cover;border-radius:10px;margin:0 0 18px;" />`
    : "";
  const signature = signatureText
    ? `<div style="margin-top:22px;padding-top:14px;border-top:1px solid #e5e7eb;color:#374151;">${renderParagraphs(signatureText)}</div>`
    : "";
  return `<div style="font-family:${escapeHtml(safeFont)};font-size:15px;line-height:1.6;color:#111827;">${image}${renderParagraphs(bodyText)}${signature}</div>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorJson("Method not allowed", 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorJson("Unauthorized", 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: caller, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || !caller.user) return errorJson("Unauthorized", 401);

    const { campaignId, userId } = (await req.json()) as SendCampaignRequest;
    if (!campaignId || !userId || caller.user.id !== userId) {
      return errorJson("Invalid campaign request", 400);
    }

    if (!resendApiKey) {
      return errorJson("RESEND_API_KEY is not configured", 500);
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single();

    if (campaignError || !campaign) return errorJson("Campaign not found", 404);
    if (!["draft", "scheduled", "failed"].includes(campaign.status)) {
      return errorJson(`Campaign cannot be sent from ${campaign.status}`, 409, { campaignStatus: campaign.status });
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from("email_campaign_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .in("status", ["queued", "failed"]);

    if (recipientsError) return errorJson("Failed to load recipients", 500, { details: recipientsError.message });
    if (!recipients?.length) return errorJson("No queued recipients", 400, { campaignStatus: campaign.status });

    await supabase.from("email_campaigns").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", campaignId).eq("user_id", userId);

    let sent = 0;
    let failed = 0;
    const providerErrors: string[] = [];

    for (const recipient of recipients) {
      await supabase.from("email_campaign_recipients").update({ status: "sending", error_message: null }).eq("id", recipient.id).eq("user_id", userId);

      const values = {
        name: recipient.recipient_name || "",
        firstName: getFirstName(recipient.recipient_name || ""),
        company: recipient.company_name || "",
        email: recipient.recipient_email,
      };
      const bodyText = renderTemplate(campaign.body, values);
      const signatureText = renderTemplate(campaign.signature || "", values);
      const text = signatureText ? `${bodyText}\n\n${signatureText}` : bodyText;
      const subject = renderTemplate(campaign.subject, values);

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
          subject,
          text,
          html: renderHtml(bodyText, signatureText, campaign.font_family || "Arial, sans-serif", campaign.image_url || null),
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
        const providerError = result.message || result.error || result.name || `Resend error ${response.status}`;
        providerErrors.push(String(providerError));
        await supabase
          .from("email_campaign_recipients")
          .update({ status: "failed", error_message: providerError })
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

    if (sent === 0 && failed > 0) {
      return errorJson(providerErrors[0] || "All recipients failed to send", 502, {
        sent,
        failed,
        providerErrors: [...new Set(providerErrors)].slice(0, 5),
        from: defaultFromEmail,
      });
    }

    return json({ sent, failed });
  } catch (error) {
    console.error("send-email-campaign error:", error);
    return errorJson(error instanceof Error ? error.message : "Internal server error", 500);
  }
};

Deno.serve(handler);
