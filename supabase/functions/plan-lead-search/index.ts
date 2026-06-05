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
                text: `You are planning a B2B lead search. Return only JSON that follows the schema.

Your job:
- Ask concise follow-up questions until the plan is complete.
- If more than one important detail is missing, include all missing fields in missingFields so the UI can ask them together.
- A complete plan needs target business/niche, location, location mode, quality strictness, depth, enrich mode, required channels, query variants, and summary.
- Do not spend credits or start the search.
- Do not mention provider names.
- Prefer practical contact-ready lead quality.

Allowed values:
- state: needs_clarification | ready
- locationMode: country | city
- depth: simple | normal | deep
- strictness: broad | balanced | strict
- requiredChannels: phone | website | email | linkedin | person

Guidance:
- Use strict only when the user asks for must-have channels or very qualified leads.
- Use enrichMode true when the user asks for owners, founders, managers, decision makers, LinkedIn, or likely people.
- Use normal depth by default, simple for quick/small searches, deep for thorough/larger searches.
- Query variants should be search-friendly and include the location.

Accumulated brief:
${brief}

Conversation:
${conversation}

Current keyword: ${body.currentKeyword || ""}
Current location: ${body.currentLocation || ""}
User service: ${body.userProfile?.service_type || ""}
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
