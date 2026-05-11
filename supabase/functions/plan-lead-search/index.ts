const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LocationMode = "country" | "city";
type Depth = "simple" | "normal" | "deep";
type Strictness = "broad" | "balanced" | "strict";
type RequiredChannel = "phone" | "website" | "email" | "linkedin" | "person";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface PlanRequest {
  brief: string;
  messages?: ChatMessage[];
  currentKeyword?: string;
  currentLocation?: string;
  userProfile?: {
    service_type?: string;
    pricing_tier?: string;
  } | null;
}

interface KnownFields {
  targetBusiness?: string;
  location?: string;
  locationMode?: LocationMode;
  requiredChannels?: RequiredChannel[];
}

interface SearchPlan {
  targetBusiness: string;
  location: string;
  locationMode: LocationMode;
  depth: Depth;
  enrichMode: boolean;
  strictness: Strictness;
  requiredChannels: RequiredChannel[];
  queryVariants: string[];
  maxResults: 20 | 40 | 60;
  summary: string;
}

const allowedDepths: Depth[] = ["simple", "normal", "deep"];
const allowedStrictness: Strictness[] = ["broad", "balanced", "strict"];
const allowedLocationModes: LocationMode[] = ["country", "city"];
const allowedChannels: RequiredChannel[] = ["phone", "website", "email", "linkedin", "person"];

function uniqueStrings(values: unknown[], limit = 8): string[] {
  return [...new Set(values.map(v => String(v || "").trim()).filter(Boolean))].slice(0, limit);
}

function clampEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function normalizeChannel(channel: unknown): RequiredChannel | "" {
  const value = String(channel || "").trim().toLowerCase();
  if (value === "whatsapp") return "phone";
  if (value === "linkedin" || value === "linkedIn".toLowerCase()) return "linkedin";
  return allowedChannels.includes(value as RequiredChannel) ? value as RequiredChannel : "";
}

function inferLocation(brief: string, fallback = "") {
  const patterns = [
    /\bin\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|\s+and|$)/i,
    /\bnear\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|\s+and|$)/i,
    /\bfrom\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|\s+and|$)/i,
  ];
  for (const p of patterns) {
    const match = brief.match(p);
    if (match?.[1]) return match[1].trim().replace(/[.!,;:]$/, "");
  }
  return fallback || "";
}

function inferTarget(brief: string, location: string, fallback = "") {
  let text = brief
    .replace(/^find\s+/i, "")
    .replace(/^search\s+for\s+/i, "")
    .replace(/^show\s+me\s+/i, "")
    .replace(/\b(Business type|Location|Lead quality|Search depth|Starting point)\s*:\s*/gi, "")
    .replace(/\b(leads|businesses|companies|prospects)\b/gi, "")
    .replace(/\b(with email|with emails|with phone|with linkedin|with website|with managers|with founders|with owners|premium|local|small|good|best)\b/gi, "")
    .replace(/\bfor\s+(my|our)\s+(agency|business|company|service|services)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (location) text = text.replace(new RegExp(`\\bin\\s+${location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), "").trim();
  text = text.split(/\bwith\b|\bthat\b|\bwho\b|\bonly\b/i)[0].trim();
  return text.length >= 3 ? text : fallback || "";
}

function inferRequiredChannels(brief: string): RequiredChannel[] {
  const lower = brief.toLowerCase();
  return uniqueStrings([
    lower.includes("phone") || lower.includes("call") || lower.includes("whatsapp") ? "phone" : "",
    lower.includes("website") || lower.includes("site") ? "website" : "",
    lower.includes("email") ? "email" : "",
    lower.includes("linkedin") ? "linkedin" : "",
    /owner|manager|founder|ceo|director|decision|person|people|contact/i.test(brief) ? "person" : "",
  ]).map(normalizeChannel).filter(Boolean) as RequiredChannel[];
}

function makeQuestion(missingFields: string[], knownFields: KnownFields) {
  if (missingFields.includes("targetBusiness")) {
    return "What industry, niche, or type of business should I search for?";
  }
  if (missingFields.includes("location")) {
    return `Where should I search${knownFields.targetBusiness ? ` for ${knownFields.targetBusiness}` : ""}? Give me a city, area, or country.`;
  }
  if (missingFields.includes("quality")) {
    return "What makes a lead good for this search: email, phone, website, LinkedIn, or a likely person?";
  }
  return "What else should I know before building the search plan?";
}

function clarificationResponse(req: PlanRequest, missingFields?: string[]) {
  const brief = req.brief || "";
  const location = inferLocation(brief, req.currentLocation || "");
  const targetBusiness = inferTarget(brief, location, req.currentKeyword || "");
  const missing = missingFields?.length
    ? missingFields
    : [
      targetBusiness ? "" : "targetBusiness",
      location ? "" : "location",
    ].filter(Boolean);
  const knownFields: KnownFields = {
    targetBusiness: targetBusiness || undefined,
    location: location || undefined,
    locationMode: location && /,|city|area|near/i.test(location) ? "city" : undefined,
    requiredChannels: inferRequiredChannels(brief),
  };
  return {
    success: true,
    state: "needs_clarification",
    question: makeQuestion(missing, knownFields),
    missingFields: missing,
    knownFields,
    source: "heuristic",
  };
}

function heuristicPlan(req: PlanRequest): SearchPlan | null {
  const brief = req.brief || "";
  const lower = brief.toLowerCase();
  const location = inferLocation(brief, req.currentLocation || "");
  const targetBusiness = inferTarget(brief, location, req.currentKeyword || "");
  if (!targetBusiness || !location) return null;

  const requiredChannels = inferRequiredChannels(brief);
  const wantsPerson = requiredChannels.includes("person");
  const wantsStrict = /\bonly|required|must have|must-have\b/i.test(brief) || requiredChannels.length >= 2;
  const wantsDeep = /\bdeep|more|many|large list|thorough\b/i.test(brief);
  const wantsSimple = /\bquick|small list|simple|few\b/i.test(brief);
  const depth: Depth = wantsDeep ? "deep" : wantsSimple ? "simple" : "normal";
  const locationMode: LocationMode = /\b(country|nationwide|all over|across)\b/i.test(brief) ? "country" : "city";
  const maxResults: 20 | 40 | 60 = depth === "deep" ? 60 : depth === "simple" ? 20 : 40;

  const queryBase = `${targetBusiness} ${location}`.trim();
  const queryVariants = uniqueStrings([
    queryBase,
    `${targetBusiness} ${location} contact`,
    `${targetBusiness} ${location} email`,
    `${targetBusiness} ${location} official website`,
    lower.includes("premium") ? `premium ${targetBusiness} ${location}` : "",
    wantsPerson ? `${targetBusiness} ${location} owner manager` : "",
  ], 6);

  return {
    targetBusiness,
    location,
    locationMode,
    depth,
    enrichMode: wantsPerson || requiredChannels.includes("linkedin"),
    strictness: wantsStrict ? "strict" : "balanced",
    requiredChannels,
    queryVariants,
    maxResults,
    summary: `Search for ${targetBusiness} in ${location}, prioritizing contact-ready leads${requiredChannels.length ? ` with ${requiredChannels.join(", ")}` : ""}.`,
  };
}

function validatePlan(raw: Record<string, unknown>, fallback: SearchPlan | null): SearchPlan | null {
  const targetBusiness = String(raw.targetBusiness || fallback?.targetBusiness || "").trim();
  const location = String(raw.location || fallback?.location || "").trim();
  if (!targetBusiness || !location) return null;

  const depth = clampEnum(raw.depth, allowedDepths, fallback?.depth || "normal");
  const maxResults: 20 | 40 | 60 = depth === "deep" ? 60 : depth === "simple" ? 20 : 40;
  const requiredChannels = uniqueStrings(raw.requiredChannels as unknown[] || fallback?.requiredChannels || [], 5)
    .map(normalizeChannel)
    .filter(Boolean) as RequiredChannel[];
  const queryVariants = uniqueStrings(raw.queryVariants as unknown[] || fallback?.queryVariants || [], 6);

  return {
    targetBusiness,
    location,
    locationMode: clampEnum(raw.locationMode, allowedLocationModes, fallback?.locationMode || "city"),
    depth,
    enrichMode: typeof raw.enrichMode === "boolean" ? raw.enrichMode : Boolean(fallback?.enrichMode || requiredChannels.includes("person") || requiredChannels.includes("linkedin")),
    strictness: clampEnum(raw.strictness, allowedStrictness, fallback?.strictness || "balanced"),
    requiredChannels,
    queryVariants: queryVariants.length ? queryVariants : uniqueStrings([
      `${targetBusiness} ${location}`,
      `${targetBusiness} ${location} contact`,
      `${targetBusiness} ${location} official website`,
    ], 6),
    maxResults,
    summary: String(raw.summary || fallback?.summary || `Search for ${targetBusiness} in ${location}, prioritizing contact-ready leads.`),
  };
}

function parseGeminiJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Planner returned no JSON");
    return JSON.parse(match[0]);
  }
}

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
