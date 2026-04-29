const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BusinessModel = "local" | "online" | "hybrid" | "any";
type CompanySize = "solo" | "small" | "mid" | "any";

interface PlanRequest {
  brief: string;
  currentKeyword?: string;
  currentLocation?: string;
  userProfile?: {
    service_type?: string;
    pricing_tier?: string;
  } | null;
}

interface SearchPlan {
  targetBusiness: string;
  location: string;
  businessModel: BusinessModel;
  companySize: CompanySize;
  intentSignals: string[];
  requiredChannels: string[];
  queryVariants: string[];
  maxResults: 20 | 40 | 60;
  radius?: number;
  summary: string;
}

const KNOWN_SIGNALS = [
  "weak website",
  "no booking",
  "low review count",
  "premium positioning",
  "active LinkedIn",
  "contact page present",
];

const KNOWN_CHANNELS = ["email", "phone", "WhatsApp", "LinkedIn", "website"];

function uniqueStrings(values: string[], limit = 8): string[] {
  return [...new Set(values.map(v => String(v || "").trim()).filter(Boolean))].slice(0, limit);
}

function inferLocation(brief: string, fallback = "") {
  const patterns = [
    /\bin\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|$)/i,
    /\bnear\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|$)/i,
    /\bfrom\s+([a-zA-ZÀ-ÿ\s,.-]{2,60})(?:\s+with|\s+that|\s+who|\s+only|$)/i,
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
    .replace(/\b(small|solo|mid-size|medium|online-only|online first|online-first|local|hybrid|premium|weak website|bad websites|visible emails|with email|with linkedin|with whatsapp)\b/gi, "")
    .replace(/\b(companies|businesses|leads)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (location) text = text.replace(new RegExp(`\\bin\\s+${location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), "").trim();
  text = text.split(/\bwith\b|\bthat\b|\bwho\b|\bonly\b/i)[0].trim();
  return text || fallback || "local businesses";
}

function heuristicPlan(req: PlanRequest): SearchPlan {
  const brief = req.brief || "";
  const lower = brief.toLowerCase();
  const location = inferLocation(brief, req.currentLocation || "");
  const targetBusiness = inferTarget(brief, location, req.currentKeyword || "");
  const businessModel: BusinessModel = lower.includes("online-only") || lower.includes("online only")
    ? "online"
    : lower.includes("online-first") || lower.includes("online first")
      ? "hybrid"
      : lower.includes("hybrid")
        ? "hybrid"
        : lower.includes("local")
          ? "local"
          : "any";
  const companySize: CompanySize = lower.includes("solo")
    ? "solo"
    : lower.includes("small")
      ? "small"
      : lower.includes("mid") || lower.includes("medium")
        ? "mid"
        : "any";

  const intentSignals = uniqueStrings([
    (lower.includes("weak website") || lower.includes("bad website") || lower.includes("bad websites")) ? "weak website" : "",
    lower.includes("booking") ? "no booking" : "",
    lower.includes("low review") ? "low review count" : "",
    lower.includes("premium") || lower.includes("luxury") ? "premium positioning" : "",
    lower.includes("linkedin") ? "active LinkedIn" : "",
    lower.includes("contact page") ? "contact page present" : "",
  ]);

  const requiredChannels = uniqueStrings([
    lower.includes("email") ? "email" : "",
    lower.includes("phone") ? "phone" : "",
    lower.includes("whatsapp") ? "WhatsApp" : "",
    lower.includes("linkedin") ? "LinkedIn" : "",
    lower.includes("website") || lower.includes("online") ? "website" : "",
  ]);

  const queryBase = `${targetBusiness} ${location}`.trim();
  const queryVariants = uniqueStrings([
    queryBase,
    `${targetBusiness} ${location} contact email`.trim(),
    `${targetBusiness} ${location} website`.trim(),
    intentSignals.includes("premium positioning") ? `premium ${targetBusiness} ${location}`.trim() : "",
    companySize === "small" ? `independent ${targetBusiness} ${location}`.trim() : "",
    businessModel === "online" || businessModel === "hybrid" ? `${targetBusiness} ${location} online booking`.trim() : "",
  ], 6);

  return {
    targetBusiness,
    location,
    businessModel,
    companySize,
    intentSignals,
    requiredChannels,
    queryVariants,
    maxResults: 40,
    radius: undefined,
    summary: `Search for ${targetBusiness}${location ? ` in ${location}` : ""}, prioritizing ${[businessModel !== "any" ? businessModel : "", companySize !== "any" ? companySize : "", ...intentSignals, ...requiredChannels].filter(Boolean).join(", ") || "broad fit signals"}.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: PlanRequest = { brief: "" };
  try {
    body = await req.json();
    if (!body.brief || body.brief.trim().length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: "Describe the lead you want in a little more detail." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: true, plan: heuristicPlan(body), source: "heuristic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        messages: [
          {
            role: "user",
            content: `Convert this B2B lead-search brief into ONLY valid JSON. No markdown.

Schema:
{"targetBusiness":"string","location":"string","businessModel":"local|online|hybrid|any","companySize":"solo|small|mid|any","intentSignals":["weak website|no booking|low review count|premium positioning|active LinkedIn|contact page present"],"requiredChannels":["email|phone|WhatsApp|LinkedIn|website"],"queryVariants":["string"],"maxResults":20|40|60,"radius":number|null,"summary":"one sentence"}

Rules:
- Use concrete business category terms in targetBusiness.
- queryVariants should be 3-6 search-engine-friendly queries, including location.
- Only use intentSignals from this list: ${KNOWN_SIGNALS.join(", ")}.
- Only use requiredChannels from this list: ${KNOWN_CHANNELS.join(", ")}.
- If location is unclear, use currentLocation if provided.
- If targetBusiness is unclear, use currentKeyword if provided.

Brief: ${body.brief}
Current keyword: ${body.currentKeyword || ""}
Current location: ${body.currentLocation || ""}
User service: ${body.userProfile?.service_type || ""}
User price tier: ${body.userProfile?.pricing_tier || ""}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: true, plan: heuristicPlan(body), source: "heuristic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Planner returned no JSON");
    const parsed = JSON.parse(jsonMatch[0]);
    const fallback = heuristicPlan(body);
    const plan: SearchPlan = {
      targetBusiness: String(parsed.targetBusiness || fallback.targetBusiness),
      location: String(parsed.location || fallback.location),
      businessModel: ["local", "online", "hybrid", "any"].includes(parsed.businessModel) ? parsed.businessModel : fallback.businessModel,
      companySize: ["solo", "small", "mid", "any"].includes(parsed.companySize) ? parsed.companySize : fallback.companySize,
      intentSignals: uniqueStrings((parsed.intentSignals || []).filter((s: string) => KNOWN_SIGNALS.includes(s))),
      requiredChannels: uniqueStrings((parsed.requiredChannels || []).filter((s: string) => KNOWN_CHANNELS.includes(s))),
      queryVariants: uniqueStrings(parsed.queryVariants || fallback.queryVariants, 6),
      maxResults: [20, 40, 60].includes(parsed.maxResults) ? parsed.maxResults : 40,
      radius: typeof parsed.radius === "number" ? parsed.radius : undefined,
      summary: String(parsed.summary || fallback.summary),
    };

    return new Response(
      JSON.stringify({ success: true, plan, source: "anthropic" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Planner error:", error);
    return new Response(
      JSON.stringify({ success: true, plan: heuristicPlan(body), source: "heuristic" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
