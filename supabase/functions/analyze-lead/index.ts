import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

if (!supabaseUrl || !supabaseServiceKey || !anthropicApiKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EnrichmentData {
  emails: string[];
  whatsapp: string[];
  contact_page_found: boolean;
  rating?: number;
  review_count?: number;
  website_present: boolean;
}

interface UserProfile {
  service_type: string;
  pricing_tier: string;
}

interface AnalysisRequest {
  domain: string;
  homepage_text: string;
  enrichment: EnrichmentData;
  user_profile: UserProfile;
}

interface IntelligenceData {
  business_maturity: string;
  positioning: string;
  detected_issues: string[];
  opportunity_summary: string;
}

interface PitchData {
  suggested_pitch_angle: string;
  outreach_hook: string;
}

interface AnalysisResponse {
  opportunityScore: number;
  businessMaturity: string;
  positioning: string;
  detectedIssues: string[];
  opportunitySummary: string;
  suggestedPitchAngle: string;
  outreachHook: string;
}

// Rule-based opportunity score
function calculateOpportunityScore(enrichment: EnrichmentData, homepageText: string): number {
  let score = 0;

  // Website presence
  if (enrichment.website_present) score += 15;

  // Email found
  if (enrichment.emails.length > 0) score += 20;

  // Contact page found
  if (enrichment.contact_page_found) score += 10;

  // Rating
  if (enrichment.rating !== undefined) {
    if (enrichment.rating >= 4.5) score += 15;
    else if (enrichment.rating >= 4.0) score += 10;
  }

  // Review count
  if (enrichment.review_count !== undefined) {
    if (enrichment.review_count >= 50) score += 10;
    else if (enrichment.review_count >= 20) score += 5;
  }

  // WhatsApp found
  if (enrichment.whatsapp.length > 0) score += 5;

  // Homepage content quality
  const textLength = homepageText.length;
  if (textLength < 300) score -= 10; // Thin content penalty
  else if (textLength > 2000) score += 10; // Rich content bonus

  // Cap at 100
  return Math.min(100, Math.max(0, score));
}

// Call Claude Haiku to analyze business
async function analyzeWithClaude(
  domain: string,
  homepageText: string,
  enrichment: EnrichmentData
): Promise<IntelligenceData | null> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Analyze this business website and output ONLY valid JSON with this exact schema, no markdown or explanation:
{"business_maturity":"Weak|Decent|Strong|Premium","positioning":"Budget|Mid-tier|Premium|Luxury","detected_issues":["string"],"opportunity_summary":"one sentence max"}

Domain: ${domain}
Has emails: ${enrichment.emails.length > 0}
Has WhatsApp: ${enrichment.whatsapp.length > 0}
Has contact page: ${enrichment.contact_page_found}
Rating: ${enrichment.rating ?? "N/A"}
Review count: ${enrichment.review_count ?? "N/A"}

Website text (first 2000 chars):
${homepageText.substring(0, 2000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Claude API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Claude response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (
      !parsed.business_maturity ||
      !parsed.positioning ||
      !Array.isArray(parsed.detected_issues) ||
      !parsed.opportunity_summary
    ) {
      console.error("Invalid Claude response structure");
      return null;
    }

    return {
      business_maturity: parsed.business_maturity,
      positioning: parsed.positioning,
      detected_issues: parsed.detected_issues.slice(0, 5), // Max 5 issues
      opportunity_summary: parsed.opportunity_summary,
    };
  } catch (err) {
    console.error("Error calling Claude:", err);
    return null;
  }
}

// Generate personalized pitch
async function generatePitch(
  intelligence: IntelligenceData,
  userProfile: UserProfile
): Promise<PitchData | null> {
  try {
    const issuesText = intelligence.detected_issues
      .map((i) => `• ${i}`)
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Generate a pitch for a freelancer. Output ONLY valid JSON with this exact schema, no markdown:
{"suggested_pitch_angle":"string (one short phrase)","outreach_hook":"2-3 sentences max"}

Freelancer profile:
- Service: ${userProfile.service_type}
- Pricing tier: ${userProfile.pricing_tier}

Business analysis:
- Maturity: ${intelligence.business_maturity}
- Positioning: ${intelligence.positioning}
- Issues detected:
${issuesText}

Generate a specific, actionable pitch angle and cold outreach message that addresses the detected issues.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Claude API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in pitch response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.suggested_pitch_angle || !parsed.outreach_hook) {
      console.error("Invalid pitch response structure");
      return null;
    }

    return {
      suggested_pitch_angle: parsed.suggested_pitch_angle,
      outreach_hook: parsed.outreach_hook,
    };
  } catch (err) {
    console.error("Error generating pitch:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body: AnalysisRequest = await req.json();

    const { domain, homepage_text, enrichment, user_profile } = body;

    if (!domain || !enrichment || !user_profile || homepage_text === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          },
        }
      );
    }

    // Step 1: Calculate rule-based score (always)
    const opportunityScore = calculateOpportunityScore(enrichment, homepage_text);

    // Step 2: Check cache for intelligence
    const { data: cachedData, error: cacheError } = await supabase
      .from("domain_intelligence")
      .select("*")
      .eq("domain", domain)
      .single();

    let intelligence: IntelligenceData | null = null;

    if (!cacheError && cachedData) {
      // Cache hit
      intelligence = {
        business_maturity: cachedData.business_maturity || "Unknown",
        positioning: cachedData.positioning || "Unknown",
        detected_issues: (cachedData.detected_issues as string[]) || [],
        opportunity_summary: cachedData.opportunity_summary || "",
      };
      console.log(`Cache hit for domain: ${domain}`);
    } else {
      // Cache miss - call Claude
      console.log(`Cache miss for domain: ${domain}, calling Claude...`);
      intelligence = await analyzeWithClaude(domain, homepage_text, enrichment);

      if (intelligence) {
        // Save to cache
        const { error: insertError } = await supabase
          .from("domain_intelligence")
          .upsert({
            domain,
            opportunity_score: opportunityScore,
            business_maturity: intelligence.business_maturity,
            positioning: intelligence.positioning,
            detected_issues: intelligence.detected_issues,
            opportunity_summary: intelligence.opportunity_summary,
            analyzed_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error caching intelligence:", insertError);
        }
      }
    }

    // Default intelligence if Claude failed
    if (!intelligence) {
      intelligence = {
        business_maturity: "Unknown",
        positioning: "Unknown",
        detected_issues: [],
        opportunity_summary: "Unable to analyze at this time",
      };
    }

    // Step 3: Generate personalized pitch (always fresh, not cached)
    const pitch = await generatePitch(intelligence, user_profile);

    const response: AnalysisResponse = {
      opportunityScore,
      businessMaturity: intelligence.business_maturity,
      positioning: intelligence.positioning,
      detectedIssues: intelligence.detected_issues,
      opportunitySummary: intelligence.opportunity_summary,
      suggestedPitchAngle: pitch?.suggested_pitch_angle || "General outreach",
      outreachHook:
        pitch?.outreach_hook ||
        `I noticed your business and think we could help. Let's talk.`,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
      status: 200,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      }
    );
  }
});
