const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_REGEX = /(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const WHATSAPP_REGEX = /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)\/?[^\s"'<>]*/gi;
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

function extractEmails(text: string): string[] {
  const emails = new Set<string>();
  let match;

  // mailto links
  const mailtoMatches = text.matchAll(MAILTO_REGEX);
  for (const m of mailtoMatches) {
    emails.add(m[1].toLowerCase());
  }

  // visible emails
  const emailMatches = text.matchAll(EMAIL_REGEX);
  for (const m of emailMatches) {
    const email = m[0].toLowerCase();
    // filter out common false positives
    if (!email.endsWith('.png') && !email.endsWith('.jpg') && !email.endsWith('.gif') && !email.endsWith('.svg') && !email.includes('example.com') && !email.includes('sentry.io')) {
      emails.add(email);
    }
  }

  return [...emails];
}

function extractWhatsApp(text: string): string[] {
  const links = new Set<string>();
  const matches = text.matchAll(WHATSAPP_REGEX);
  for (const m of matches) {
    links.add(m[0]);
  }
  return [...links];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log(`Scraping: ${formattedUrl}`);

    // Scrape the site using Firecrawl with multiple pages
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['html', 'links'],
        onlyMainContent: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: true, emails: [], whatsapp: [], contactPageFound: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = data.data?.html || data.html || '';
    const links: string[] = data.data?.links || data.links || [];

    let allEmails = extractEmails(html);
    let allWhatsApp = extractWhatsApp(html);
    let contactPageFound = false;

    // Find contact/about pages from links
    const contactPaths = ['/contact', '/about', '/kontakt', '/contacto', '/sobre'];
    const contactLinks = links.filter((link: string) =>
      contactPaths.some(path => link.toLowerCase().includes(path))
    ).slice(0, 4); // max 4 additional pages (5 total with homepage)

    if (contactLinks.length > 0) {
      contactPageFound = true;
    }

    // Scrape contact pages
    for (const contactUrl of contactLinks) {
      try {
        const cResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: contactUrl,
            formats: ['html'],
            onlyMainContent: false,
          }),
        });

        if (cResponse.ok) {
          const cData = await cResponse.json();
          const cHtml = cData.data?.html || cData.html || '';
          allEmails = [...new Set([...allEmails, ...extractEmails(cHtml)])];
          allWhatsApp = [...new Set([...allWhatsApp, ...extractWhatsApp(cHtml)])];
        } else {
          await cResponse.text(); // consume body
        }
      } catch (e) {
        console.error(`Error scraping ${contactUrl}:`, e);
      }
    }

    console.log(`Extracted ${allEmails.length} emails, ${allWhatsApp.length} whatsapp from ${formattedUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        emails: allEmails,
        whatsapp: allWhatsApp,
        contactPageFound,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    // Don't crash — return empty results
    return new Response(
      JSON.stringify({ success: true, emails: [], whatsapp: [], contactPageFound: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
