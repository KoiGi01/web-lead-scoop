const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_REGEX = /(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const WHATSAPP_REGEX = /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)\/?[^\s"'<>]*/gi;
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const PHONE_REGEX = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

function extractEmails(text: string): string[] {
    const emails = new Set<string>();
    for (const m of text.matchAll(MAILTO_REGEX)) emails.add(m[1].toLowerCase());
    for (const m of text.matchAll(EMAIL_REGEX)) {
        const e = m[0].toLowerCase();
        if (
            !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif') &&
            !e.endsWith('.svg') && !e.includes('example.com') && !e.includes('sentry.io') &&
            !e.includes('wixpress.com') && !e.includes('squarespace.com')
        ) {
            emails.add(e);
        }
    }
    return [...emails];
}

function extractWhatsApp(text: string): string[] {
    const links = new Set<string>();
    for (const m of text.matchAll(WHATSAPP_REGEX)) links.add(m[0]);
    return [...links];
}

function extractPhone(text: string): string {
    const match = text.match(PHONE_REGEX);
    return match ? match[0].trim() : '';
}

function extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
        // Clean up common suffixes like " | Company Name" or " - Home"
        return titleMatch[1]
            .split(/[|–\-]/)[0]
            .trim()
            .slice(0, 80);
    }
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    return h1Match ? h1Match[1].trim().slice(0, 80) : '';
}

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

function extractLinkedInUrl(html: string, links: string[]): string | null {
    // Check for LinkedIn links in the HTML
    const linkedinRegex = /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9\-]+\/?/gi;
    const matches = html.match(linkedinRegex);
    if (matches && matches.length > 0) {
        return matches[0];
    }
    // Also check in discovered links
    const linkedinLink = links.find(l => l.toLowerCase().includes('linkedin.com'));
    return linkedinLink || null;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { keyword, location, maxResults, queryVariants } = await req.json();

        if (!keyword || !location) {
            return new Response(
                JSON.stringify({ success: false, error: 'Keyword and location are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
        if (!apiKey) {
            return new Response(
                JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const limit = Math.min(maxResults || 20, 60);
        // Search for businesses via Firecrawl web search
        // We use multiple queries to find directory-style pages and individual businesses
        const queries = Array.isArray(queryVariants) && queryVariants.length > 0
            ? [
                ...queryVariants.map((q: string) => `${String(q).trim()} contact email phone`),
                ...queryVariants.map((q: string) => `${String(q).trim()} LinkedIn WhatsApp`),
            ].filter(Boolean).slice(0, 8)
            : [
                `${keyword} ${location} contact email phone`,
                `best ${keyword} in ${location} email`,
            ];

        const seenDomains = new Set<string>();
        const urlsToScrape: string[] = [];

        for (const query of queries) {
            if (urlsToScrape.length >= limit) break;

            try {
                const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query,
                        limit: Math.min(limit, 10), // Firecrawl search returns up to 10 per call
                        scrapeOptions: { formats: [] }, // don't auto-scrape, we'll do it ourselves selectively
                    }),
                });

                if (!searchResp.ok) {
                    console.error('Firecrawl search error:', await searchResp.text());
                    continue;
                }

                const searchData = await searchResp.json();
                const results: Array<{ url: string }> = searchData.data || [];

                for (const r of results) {
                    const domain = getDomain(r.url);
                    // Skip aggregators / social platforms that won't have individual business contact info
                    const skip = ['yelp.com', 'yellowpages.com', 'facebook.com', 'instagram.com',
                        'twitter.com', 'linkedin.com', 'google.com', 'wikipedia.org',
                        'bbb.org', 'angi.com', 'thumbtack.com', 'houzz.com'];
                    if (skip.some(s => domain.includes(s))) continue;
                    if (seenDomains.has(domain)) continue;
                    seenDomains.add(domain);
                    urlsToScrape.push(r.url);
                    if (urlsToScrape.length >= limit) break;
                }
            } catch (e) {
                console.error('Search query failed:', e);
            }
        }

        console.log(`Web search found ${urlsToScrape.length} URLs to scrape for "${keyword} ${location}"`);

        // Scrape each URL for contact info
        const leads: any[] = [];

        for (const url of urlsToScrape) {
            try {
                const scrapeResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url,
                        formats: ['html', 'links'],
                        onlyMainContent: false,
                    }),
                });

                if (!scrapeResp.ok) continue;

                const scrapeData = await scrapeResp.json();
                const html: string = scrapeData.data?.html || scrapeData.html || '';
                const links: string[] = scrapeData.data?.links || scrapeData.links || [];

                let emails = extractEmails(html);
                let whatsapp = extractWhatsApp(html);
                const phone = extractPhone(html);
                const name = extractTitle(html);
                let linkedinUrl = extractLinkedInUrl(html, links);

                // Also check contact pages for more emails
                const contactPaths = ['/contact', '/about', '/kontakt', '/contacto'];
                const contactLinks = links
                    .filter((l: string) => contactPaths.some(p => l.toLowerCase().includes(p)))
                    .slice(0, 2);

                for (const contactUrl of contactLinks) {
                    try {
                        const cr = await fetch('https://api.firecrawl.dev/v1/scrape', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ url: contactUrl, formats: ['html'], onlyMainContent: false }),
                        });
                        if (cr.ok) {
                            const cd = await cr.json();
                            const cHtml = cd.data?.html || cd.html || '';
                            emails = [...new Set([...emails, ...extractEmails(cHtml)])];
                            whatsapp = [...new Set([...whatsapp, ...extractWhatsApp(cHtml)])];
                            // Also check contact page for LinkedIn
                            if (!linkedinUrl) {
                                linkedinUrl = extractLinkedInUrl(cHtml, []) || linkedinUrl;
                            }
                        }
                    } catch { /* skip */ }
                }

                leads.push({
                    placeId: `web-${getDomain(url)}`,
                    name: name || getDomain(url),
                    address: '',
                    phone,
                    website: url,
                    category: keyword.toLowerCase(),
                    emails,
                    whatsapp,
                    linkedinUrl: linkedinUrl || undefined,
                    contactPageFound: contactLinks.length > 0,
                });
            } catch (e) {
                console.error(`Error scraping ${url}:`, e);
            }
        }

        console.log(`Web search produced ${leads.length} leads`);

        return new Response(
            JSON.stringify({ success: true, leads }),
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
