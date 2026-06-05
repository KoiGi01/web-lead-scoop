import {
  PlanRequest,
  uniqueStrings,
  heuristicPlan,
  validatePlan,
  clarificationResponse,
  makeQuestion,
  parseGeminiJson,
} from "./planner-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: PlanRequest = { brief: "" };
  try {
    body = await req.json();
    const brief = String(body.brief || "").trim();
    if (brief.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: "Describe the lead you want in a little more detail." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fallback = heuristicPlan(body);
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      if (!fallback) {
        return new Response(
          JSON.stringify(clarificationResponse(body)),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ success: true, state: "ready", plan: fallback, source: "heuristic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const conversation = (body.messages || [])
      .slice(-10)
      .map(message => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.text}`)
      .join("\n");

    const service = String(body.service || "").trim();

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
                text: `You are a prospecting analyst for a service provider. The user SELLS a service and wants local businesses worth pitching. Return only JSON that follows the schema.

What the user sells: ${service || "(infer it from the brief)"}

Your job:
- Identify the user's service, the target market/niche, and the location.
- Design search queries likely to surface businesses in that niche + location that plausibly have the weaknesses this service fixes. Always include the location in each query.
- Choose the opportunity signals to look for, tied to the service (e.g. web design -> weak_website, no_booking, no_clear_cta).
- Choose which pages to read (scanTargets) for evidence.
- Write a 1-2 sentence strategy explaining why these prospects are good for this service.
- Ask a concise clarification (state=needs_clarification) only when target business, location, or service is missing. Put every missing field in missingFields.
- Do not start the search. Do not mention provider/tool names.

Allowed values:
- state: needs_clarification | ready
- locationMode: country | city
- depth: simple | normal | deep
- strictness: broad | balanced | strict
- requiredChannels: phone | website | email | linkedin | person
- opportunitySignals: weak_website | no_booking | no_clear_cta | generic_inbox | low_reviews | no_social_links | no_contact_form | weak_local_presence
- scanTargets: homepage | contact | about | team | booking | services | pricing | social

Guidance:
- Use normal depth by default, simple for quick/small, deep for thorough/large.
- enrichMode is always effectively on; set it true.

Accumulated brief:
${brief}

Conversation:
${conversation}

Current keyword: ${body.currentKeyword || ""}
Current location: ${body.currentLocation || ""}
User price tier: ${body.userProfile?.pricing_tier || ""}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              state: { type: "string", enum: ["needs_clarification", "ready"] },
              question: { type: "string" },
              missingFields: { type: "array", items: { type: "string" } },
              knownFields: {
                type: "object",
                properties: {
                  targetBusiness: { type: "string" },
                  location: { type: "string" },
                  locationMode: { type: "string", enum: ["country", "city"] },
                  requiredChannels: { type: "array", items: { type: "string", enum: ["phone", "website", "email", "linkedin", "person"] } },
                },
              },
              plan: {
                type: "object",
                properties: {
                  targetBusiness: { type: "string" },
                  location: { type: "string" },
                  locationMode: { type: "string", enum: ["country", "city"] },
                  depth: { type: "string", enum: ["simple", "normal", "deep"] },
                  enrichMode: { type: "boolean" },
                  strictness: { type: "string", enum: ["broad", "balanced", "strict"] },
                  requiredChannels: { type: "array", items: { type: "string", enum: ["phone", "website", "email", "linkedin", "person"] } },
                  queryVariants: { type: "array", items: { type: "string" } },
                  maxResults: { type: "integer", enum: [20, 40, 60] },
                  summary: { type: "string" },
                  service: { type: "string" },
                  strategy: { type: "string" },
                  opportunitySignals: { type: "array", items: { type: "string", enum: ["weak_website","no_booking","no_clear_cta","generic_inbox","low_reviews","no_social_links","no_contact_form","weak_local_presence"] } },
                  scanTargets: { type: "array", items: { type: "string", enum: ["homepage","contact","about","team","booking","services","pricing","social"] } },
                },
              },
            },
            required: ["state"],
          },
        },
      }),
    });

    if (!response.ok) {
      if (!fallback) {
        return new Response(
          JSON.stringify(clarificationResponse(body)),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ success: true, state: "ready", plan: fallback, source: "heuristic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = parseGeminiJson(content);

    if (parsed.state === "needs_clarification") {
      const missingFields = Array.isArray(parsed.missingFields) ? uniqueStrings(parsed.missingFields, 4) : [];
      const knownFields = parsed.knownFields || {};
      return new Response(
        JSON.stringify({
          success: true,
          state: "needs_clarification",
          question: String(parsed.question || makeQuestion(missingFields, knownFields)),
          missingFields,
          knownFields,
          source: "gemini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const plan = validatePlan(parsed.plan || parsed, fallback);
    if (!plan) {
      return new Response(
        JSON.stringify(clarificationResponse(body)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, state: "ready", plan, source: "gemini" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Planner error:", error);
    const fallback = heuristicPlan(body);
    return new Response(
      JSON.stringify(fallback
        ? { success: true, state: "ready", plan: fallback, source: "heuristic" }
        : clarificationResponse(body)),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
