import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const GOOGLE_TEXT_SEARCH_ENTERPRISE_COST_USD = Number(Deno.env.get("GOOGLE_TEXT_SEARCH_ENTERPRISE_COST_USD") || "0.035");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function logUsage(event: Record<string, unknown>) {
  if (!supabase) return;
  const userId = typeof event.user_id === "string" && UUID_REGEX.test(event.user_id) ? event.user_id : null;
  const searchSessionId = typeof event.search_session_id === "string" && UUID_REGEX.test(event.search_session_id) ? event.search_session_id : null;
  const { error } = await supabase.from("api_usage_events").insert({
    ...event,
    user_id: userId,
    search_session_id: searchSessionId,
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      keyword,
      location,
      maxResults,
      queryVariants,
      userId,
      searchSessionId,
      depth,
      enrichMode = false,
      usageType = "customer",
      creditsChargedToUser = 0,
    } = await req.json();

    if (!await isAuthorizedUser(req, userId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyword || !location) {
      return new Response(
        JSON.stringify({ success: false, error: 'Keyword and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const limit = Math.min(maxResults || 20, 60); // cap at 60 (3 pages)
    const allPlaces: any[] = [];
    const seenPlaceIds = new Set<string>();
    const queries = Array.isArray(queryVariants) && queryVariants.length > 0
      ? queryVariants.map((q: string) => String(q).trim()).filter(Boolean).slice(0, 16)
      : [`${keyword} in ${location}`];

    for (const query of queries) {
      let pageToken: string | undefined;
      // Fetch pages until we have enough results or no more pages
      while (allPlaces.length < limit) {
        const remaining = limit - allPlaces.length;
        const searchUrl = `https://places.googleapis.com/v1/places:searchText`;

        const body: any = {
          textQuery: query,
          maxResultCount: Math.min(remaining, 20),
        };

        if (pageToken) {
          body.pageToken = pageToken;
        }

        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.location,nextPageToken',
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        await logUsage({
          user_id: userId,
          search_session_id: searchSessionId,
          depth,
          enrich_mode: Boolean(enrichMode),
          usage_type: usageType,
          provider: "google",
          operation: "text_search",
          endpoint: "places:searchText",
          status_code: response.status,
          success: response.ok,
          latency_ms: 0,
          billable_units: 1,
          estimated_cost_usd: GOOGLE_TEXT_SEARCH_ENTERPRISE_COST_USD,
          credits_charged_to_user: Number(creditsChargedToUser || 0),
          request_fingerprint: query,
          result_count: Array.isArray(data.places) ? data.places.length : 0,
          error_code: response.ok ? null : data.error?.status || "GOOGLE_ERROR",
          metadata: {
            sku_inferred: "Places API Text Search Enterprise",
            field_mask: "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.primaryType,places.types,places.location,nextPageToken",
            query,
            max_result_count: body.maxResultCount,
            page_token_used: Boolean(pageToken),
          },
        });

        if (!response.ok) {
          console.error('Google Places API error:', JSON.stringify(data));
          // If we already have some results, return them instead of failing
          if (allPlaces.length > 0) break;
          const upstreamMessage = String(data.error?.message || "");
          const isProviderConfigError =
            response.status === 403 ||
            /billing|permission|api key|referer|request_denied/i.test(upstreamMessage);
          return new Response(
            JSON.stringify({
              success: false,
              error: isProviderConfigError
                ? "Lead discovery is temporarily unavailable. Please try again later."
                : "Lead discovery failed. Please try again.",
              code: isProviderConfigError ? "DISCOVERY_PROVIDER_CONFIG" : "DISCOVERY_PROVIDER_ERROR",
              ...(usageType !== "customer" ? { providerStatus: response.status, providerError: data.error } : {}),
            }),
            { status: isProviderConfigError ? 503 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const places = data.places || [];
        for (const place of places) {
          if (!place.id || seenPlaceIds.has(place.id)) continue;
          seenPlaceIds.add(place.id);
          allPlaces.push(place);
          if (allPlaces.length >= limit) break;
        }

        pageToken = data.nextPageToken;
        if (!pageToken || places.length === 0) break;
      }
      if (allPlaces.length >= limit) break;
    }

    const businesses = allPlaces.map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      phone: place.nationalPhoneNumber || '',
      website: place.websiteUri || '',
      category: place.primaryType || place.types?.[0] || '',
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    }));

    console.log(`Found ${businesses.length} businesses for "${queries.join(' | ')}"`);

    return new Response(
      JSON.stringify({ success: true, businesses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
