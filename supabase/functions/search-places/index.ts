const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, location, radius, maxResults, queryVariants } = await req.json();

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

        if (!response.ok) {
          console.error('Google Places API error:', JSON.stringify(data));
          // If we already have some results, return them instead of failing
          if (allPlaces.length > 0) break;
          return new Response(
            JSON.stringify({ success: false, error: data.error?.message || 'Google Places API error' }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
