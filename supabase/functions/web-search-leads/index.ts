const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_REGEX = /(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const WHATSAPP_REGEX = /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)\/?[^\s"'<>]*/gi;
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const PHONE_REGEX = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

// Domains that are directories, aggregators, social, media, or SEO content — not individual businesses
const BLOCKED_DOMAINS = new Set([
    'yelp.com', 'yellowpages.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
    'linkedin.com', 'google.com', 'wikipedia.org', 'bbb.org', 'angi.com', 'thumbtack.com',
    'houzz.com', 'youtube.com', 'reddit.com', 'quora.com', 'medium.com', 'substack.com',
    'pinterest.com', 'tiktok.com', 'trustpilot.com', 'g2.com', 'capterra.com', 'getapp.com',
    'softwareadvice.com', 'producthunt.com', 'techradar.com', 'techcrunch.com', 'wired.com',
    'forbes.com', 'inc.com', 'entrepreneur.com', 'businessinsider.com', 'mashable.com',
    'cnet.com', 'pcmag.com', 'tomsguide.com', 'theverge.com', 'zdnet.com', 'engadget.com',
    'getresponse.com', 'mysignature.io', 'mailchimp.com', 'justanswer.com', 'fiverr.com',
    'upwork.com', 'freelancer.com', 'clutch.co', 'goodfirms.co', 'bark.com', 'bark.com',
    'angieslist.com', 'homeadvisor.com', 'nextdoor.com', 'tripadvisor.com', 'yelp.ca',
    'glassdoor.com', 'indeed.com', 'linkedin.com', 'crunchbase.com', 'owler.com',
    'manta.com', 'mapquest.com', 'whitepages.com', 'peoplefinders.com', 'spokeo.com',
    'dnb.com', 'moz.com', 'semrush.com', 'ahrefs.com', 'hubspot.com', 'salesforce.com',
    'amazon.com', 'ebay.com', 'walmart.com', 'etsy.com', 'shopify.com',
]);

// URL path patterns that indicate article/blog/list content — not company homepages
const BLOCKED_PATH_PATTERNS = [
    /\/blog\//i, /\/news\//i, /\/article/i, /\/articles\//i, /\/post\//i, /\/posts\//i,
    /\/guide\//i, /\/guides\//i, /\/review\//i, /\/reviews\//i, /\/tips\//i,
    /\/resources\//i, /\/learn\//i, /\/education\//i, /\/magazine\//i,
    /\/top-\d+/i, /\/best-\d*/i, /\/\d+-best/i, /\/\d+-top/i,
    /\/list-of/i, /\/lists\//i, /\/roundup/i, /\/comparison/i, /\/vs-/i,
    /\/how-to/i, /\/what-is/i, /\/why-/i, /\/when-/i,
    /\/press\//i, /\/press-release/i, /\/case-stud/i,
    /watch\?v=/i, // YouTube
    /\/wiki\//i,
];

// Placeholder/example email patterns that appear in blog content
const FAKE_EMAIL_PATTERNS = [
    /^name@/i, /^yourname@/i, /^you@your/i, /^hello@your/i, /^info@your/i,
    /^user@/i, /^email@/i, /^test@/i, /^admin@test/i, /^demo@/i,
    /@companyname\./i, /@yourcompany\./i, /@yourdomain\./i, /@example\./i,
    /@domain\./i, /@company\.com$/i, /@business\.com$/i, /@email\.com$/i,
    /\.co\.site$/i, /normail\.co$/i,
];

// Title patterns that indicate this is a list/article page, not a business
const ARTICLE_TITLE_PATTERNS = [
    /^top \d+/i, /^\d+ best/i, /^best \d+/i, /^a list of/i, /^the \d+ best/i,
    /^how to/i, /^what is/i, /^guide to/i, /^ultimate guide/i, /^everything you/i,
    /^error \d+/i, /^403 /i, /^404 /i, /recaptcha/i, /trustpilot/i,
    /widget|snippet|embed/i, /sales nav extract/i,
];

function isBlockedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const domain = parsed.hostname.replace(/^www\./, '');
        // Check domain blocklist
        if (BLOCKED_DOMAINS.has(domain)) return true;
        // Check if any known blocked domain is a suffix (e.g. blog.techradar.com)
        if ([...BLOCKED_DOMAINS].some(d => domain.endsWith('.' + d) || domain === d)) return true;
        // Check URL path patterns
        if (BLOCKED_PATH_PATTERNS.some(p => p.test(parsed.pathname + parsed.search))) return true;
        return false;
    } catch {
        return true; // malformed URL — skip
    }
}

function isArticleTitle(title: string): boolean {
    return ARTICLE_TITLE_PATTERNS.some(p => p.test(title.trim()));
}

function extractEmails(text: string): string[] {
    const emails = new Set<string>();
    for (const m of text.matchAll(MAILTO_REGEX)) emails.add(m[1].toLowerCase());
    for (const m of text.matchAll(EMAIL_REGEX)) {
        const e = m[0].toLowerCase();
        if (
            !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif') &&
            !e.endsWith('.svg') && !e.includes('sentry.io') &&
            !e.includes('wixpress.com') && !e.includes('squarespace.com') &&
            !FAKE_EMAIL_PATTERNS.some(p => p.test(e))
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
    const matches = text.match(PHONE_REGEX);
    if (!matches) return '';
    // Validate: strip non-digits and check length (10 or 11 digits for US/international)
    for (const m of matches) {
        const digits = m.replace(/\D/g, '');
        if (digits.length === 10 || (digits.length === 11 && digits[0] === '1')) {
            return m.trim();
        }
    }
    return '';
}

function extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
        return titleMatch[1].split(/[|–\-]/)[0].trim().slice(0, 80);
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
    const linkedinRegex = /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9\-]+\/?/gi;
    const matches = html.match(linkedinRegex);
    if (matches?.length) return matches[0];
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

        // Build search queries that target actual business websites, not SEO articles.
        // Do NOT append "contact email phone" — that attracts blog content.
        const queries = Array.isArray(queryVariants) && queryVariants.length > 0
            ? queryVariants.map((q: string) => String(q).trim()).filter(Boolean).slice(0, 6)
            : [
                `${keyword} ${location}`,
                `${keyword} company ${location}`,
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
                        limit: Math.min(limit, 10),
                        scrapeOptions: { formats: [] },
                    }),
                });

                if (!searchResp.ok) {
                    console.error('Firecrawl search error:', await searchResp.text());
                    continue;
                }

                const searchData = await searchResp.json();
                const results: Array<{ url: string }> = searchData.data || [];

                for (const r of results) {
                    if (isBlockedUrl(r.url)) continue;
                    const domain = getDomain(r.url);
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

                const name = extractTitle(html);

                // Skip pages that are clearly articles or error pages
                if (!name || isArticleTitle(name)) {
                    console.log(`Skipping article/error page: "${name}" at ${url}`);
                    continue;
                }

                let emails = extractEmails(html);
                let whatsapp = extractWhatsApp(html);
                const phone = extractPhone(html);
                let linkedinUrl = extractLinkedInUrl(html, links);

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
                            if (!linkedinUrl) linkedinUrl = extractLinkedInUrl(cHtml, []) || linkedinUrl;
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
