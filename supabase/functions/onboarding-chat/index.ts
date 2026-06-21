import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateGeminiCost,
  enforceBounds,
  normalizeSlots,
  nextQuestion,
  type ChatMessage,
  type GeminiUsageMetadata,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GEMINI_FLASH_INPUT_COST_USD = Number(Deno.env.get("GEMINI_FLASH_INPUT_COST_USD") || "0.30");
const GEMINI_FLASH_OUTPUT_COST_USD = Number(Deno.env.get("GEMINI_FLASH_OUTPUT_COST_USD") || "2.50");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function logUsage(event: Record<string, unknown>) {
  if (!supabase) return;
  const userId = typeof event.user_id === "string" && UUID_REGEX.test(event.user_id) ? event.user_id : null;
  const { error } = await supabase.from("api_usage_events").insert({
    ...event,
    user_id: userId,
    search_session_id: null,
  });
  if (error) console.error("Usage logging error:", error);
}

async function isAuthorizedUser(req: Request, userId: unknown) {
  if (!supabase || typeof userId !== "string" || !UUID_REGEX.test(userId)) return false;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data, error } = await supabase.auth.getUser(token);
  return !error && data.user?.id === userId;
}

const parseGeminiJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Malformed model response");
    return JSON.parse(match[0]);
  }
};

const normalizeMessages = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(-24).flatMap((message) => {
    if (!message || typeof message !== "object") return [];
    const record = message as Record<string, unknown>;
    const role = record.role === "user" || record.role === "model" ? record.role : null;
    const content = typeof record.content === "string" ? record.content.trim().slice(0, 1200) : "";
    return role && content ? [{ role, content }] : [];
  });
};

const systemInstruction = `You conduct a short setup interview for GlobaLeads22.

Return only JSON. Do not mention provider names, internal tooling, or "AI".

Collect these topics in order:
1. offer: what the user sells and who it is for.
2. market: where to find customers.
3. problem: the problem the user solves.
4. emailAsk: what the first email should ask for.
5. fullName and companyName: who emails come from.

Rules:
- Ask one compact question at a time.
- If an answer is vague, ask one brief clarifying follow-up for that topic.
- After one follow-up, extract the best usable value and move on.
- Keep the tone precise, calm, and practical.
- Never invent credentials, customers, proof, or guarantees.
- Keep assistant_message under 45 words.
- Set done true only when the setup is ready to save.`;

const responseJsonSchema = {
  type: "object",
  properties: {
    assistant_message: { type: "string" },
    slots: {
      type: "object",
      properties: {
        offer: { type: "string" },
        market: { type: "string" },
        problem: { type: "string" },
        emailAsk: { type: "string" },
        fullName: { type: "string" },
        companyName: { type: "string" },
      },
    },
    done: { type: "boolean" },
  },
  required: ["assistant_message", "slots", "done"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const startedAt = Date.now();
  let userId: unknown = null;

  try {
    const body = await req.json();
    userId = body?.userId;

    if (!await isAuthorizedUser(req, userId)) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (!geminiApiKey) {
      return json({ error: "Setup chat is unavailable" }, 503);
    }

    const messages = normalizeMessages(body?.messages);
    const incomingSlots = normalizeSlots(body?.slots);

    const contents = [
      {
        role: "user",
        parts: [{
          text: `Current saved slots: ${JSON.stringify(incomingSlots)}. Continue the fixed setup interview from the next missing topic.`,
        }],
      },
      ...messages.map((message) => ({
        role: message.role,
        parts: [{ text: message.content }],
      })),
    ];

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "x-goog-api-key": geminiApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    const usage = data?.usageMetadata as GeminiUsageMetadata | undefined;
    const cost = calculateGeminiCost(usage, GEMINI_FLASH_INPUT_COST_USD, GEMINI_FLASH_OUTPUT_COST_USD);

    await logUsage({
      user_id: userId,
      depth: null,
      enrich_mode: false,
      usage_type: "customer",
      provider: "gemini",
      operation: "onboarding-chat",
      endpoint: "models/gemini-2.5-flash:generateContent",
      status_code: response.status,
      success: response.ok,
      latency_ms: Date.now() - startedAt,
      billable_units: cost.totalTokens,
      estimated_cost_usd: cost.estimatedCostUsd,
      credits_charged_to_user: 0,
      request_fingerprint: null,
      result_count: response.ok ? 1 : 0,
      error_code: response.ok ? null : "GEMINI_ERROR",
      metadata: {
        prompt_tokens: cost.promptTokens,
        output_tokens: cost.outputTokens,
        total_tokens: cost.totalTokens,
      },
    });

    if (!response.ok) return json({ error: "Setup chat is unavailable" }, 502);

    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = parseGeminiJson(content);
    const bounded = enforceBounds(messages, incomingSlots, normalizeSlots(parsed?.slots), Boolean(parsed?.done));
    const assistantMessage = String(parsed?.assistant_message || nextQuestion(bounded.slots)).trim().slice(0, 400) || nextQuestion(bounded.slots);

    return json({
      assistant_message: bounded.done ? "You're set. I'll save this and open your workspace." : assistantMessage,
      slots: bounded.slots,
      done: bounded.done,
    });
  } catch (error) {
    console.error("onboarding-chat error:", error);
    await logUsage({
      user_id: userId,
      depth: null,
      enrich_mode: false,
      usage_type: "customer",
      provider: "gemini",
      operation: "onboarding-chat",
      endpoint: "models/gemini-2.5-flash:generateContent",
      status_code: 500,
      success: false,
      latency_ms: Date.now() - startedAt,
      billable_units: 0,
      estimated_cost_usd: 0,
      credits_charged_to_user: 0,
      request_fingerprint: null,
      result_count: 0,
      error_code: "ONBOARDING_CHAT_ERROR",
      metadata: {},
    });
    return json({ error: "Setup chat is unavailable" }, 500);
  }
});
