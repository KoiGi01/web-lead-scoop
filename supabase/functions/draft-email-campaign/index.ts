import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

interface DraftLead {
  name?: string;
  category?: string;
  selectedService?: string;
  crmStatus?: string;
  crmPriority?: string;
  personName?: string;
  email?: string;
}

interface DraftRequest {
  userId: string;
  campaignName?: string;
  service?: string;
  subject?: string;
  body?: string;
  signature?: string;
  leads?: DraftLead[];
  groupLabel?: string;
  groupType?: string;
  groupCriteria?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseGeminiJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
};

const fallbackDraft = (request: DraftRequest) => {
  const service = request.service || request.leads?.[0]?.selectedService || "your service";
  const audience = request.groupLabel ? ` for ${request.groupLabel}` : "";
  return {
    subject: "Quick idea for {{company}}",
    body: `Hi {{firstName}},

I came across {{company}} and noticed a few public signals that may be worth improving.

We help teams improve ${service.toLowerCase()}${audience} with clearer positioning and better conversion paths.

Open to a quick look at what I found?`,
    signature: request.signature || "Best,\n{{name}}",
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: caller, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || !caller.user) return json({ error: "Unauthorized" }, 401);

    const request = (await req.json()) as DraftRequest;
    if (!request.userId || request.userId !== caller.user.id) {
      return json({ error: "Invalid draft request" }, 400);
    }

    const leads = (request.leads || []).slice(0, 12).map(lead => ({
      company: String(lead.name || "").slice(0, 120),
      category: String(lead.category || "").slice(0, 80),
      service: String(lead.selectedService || "").slice(0, 80),
      pipelineStage: String(lead.crmStatus || "").slice(0, 80),
      priority: String(lead.crmPriority || "").slice(0, 80),
      contact: String(lead.personName || "").slice(0, 120),
      email: String(lead.email || "").slice(0, 160),
    }));

    const groupContext = request.groupLabel ? {
      label: String(request.groupLabel || "").slice(0, 120),
      type: String(request.groupType || "").slice(0, 80),
      criteria: String(request.groupCriteria || "").slice(0, 160),
    } : null;

    const fallback = fallbackDraft(request);
    if (!geminiApiKey || leads.length === 0) {
      return json({ success: true, source: "fallback", draft: fallback });
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "x-goog-api-key": geminiApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You write concise B2B prospecting emails for GlobaLeads22 users.

Return only JSON with subject, body, and signature.

Rules:
- Keep it specific but do not invent facts.
- Use only these variables when personalization is needed: {{firstName}}, {{name}}, {{company}}, {{email}}.
- Include {{firstName}} in the greeting when possible.
- Include {{company}} in the first two lines.
- Keep body under 130 words.
- No spammy claims, pressure, fake familiarity, or guarantees.
- Do not mention AI, scraping, private data, or provider/tool names.
- Keep signature short.

Campaign name: ${request.campaignName || ""}
Service being offered: ${request.service || leads[0]?.service || ""}
Active recipient group: ${groupContext ? JSON.stringify(groupContext, null, 2) : "None"}
Current subject: ${request.subject || ""}
Current body: ${request.body || ""}
Current signature: ${request.signature || ""}

Selected prospects:
${JSON.stringify(leads, null, 2)}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
              signature: { type: "string" },
            },
            required: ["subject", "body", "signature"],
          },
        },
      }),
    });

    if (!response.ok) return json({ success: true, source: "fallback", draft: fallback });

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = parseGeminiJson(content);

    return json({
      success: true,
      source: "gemini",
      draft: {
        subject: String(parsed.subject || fallback.subject).slice(0, 160),
        body: String(parsed.body || fallback.body).slice(0, 1600),
        signature: String(parsed.signature || fallback.signature).slice(0, 500),
      },
    });
  } catch (error) {
    console.error("draft-email-campaign error:", error);
    return json({ error: "Could not draft email campaign" }, 500);
  }
};

Deno.serve(handler);
