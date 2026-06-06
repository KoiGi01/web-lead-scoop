// Pure, dependency-free website-signal fact gathering.
// Imported by supabase/functions/extract-contacts (Deno) and by Vitest in src/.
// MUST NOT import Deno globals or any runtime-specific module.

export interface ScrapedPage {
  url: string;
  html: string;
  links: string[];
}

export interface BuildWebsiteSignalsInput {
  pages: ScrapedPage[];        // homepage first, then any contact/about pages
  emails: string[];            // already-extracted emails
  socialLinks: string[];       // already-extracted social links
  contactPageFound: boolean;
}

export interface WebsiteSignals {
  pagesScanned: string[];
  title?: string;
  metaDescription?: string;
  homepageTextLength: number;
  contactFormFound: boolean;
  bookingLinks: string[];
  ctaTexts: string[];
  socialLinks: string[];
  hasGenericInboxOnly: boolean;
  techStack: string[];
  ssl: { valid: boolean; httpsRedirect: boolean };
  evidence: Array<{ signal: string; sourceUrl: string; snippet: string }>;
}

const GENERIC_LOCAL_PARTS = new Set([
  "admin", "contact", "contacto", "hello", "hola", "info", "mail",
  "office", "recepcion", "reception", "sales", "soporte", "support", "ventas",
]);

const BOOKING_HOST_RE = /(calendly\.com|acuityscheduling\.com|booksy\.com|squareup\.com\/appointments|setmore\.com|simplybook\.me|youcanbook\.me|cal\.com|appointlet\.com|vagaro\.com)/i;
const BOOKING_PATH_RE = /(\/book|\/booking|\/appointment|\/appointments|\/schedule|\/reserva|\/agendar)/i;
const ACTION_CTA_RE = /\b(book|quote|call|contact|get started|sign up|schedule|request|buy|order|subscribe|consult|free estimate|get a quote)\b/i;

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() || undefined : undefined;
}

function extractMetaDescription(html: string): string | undefined {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return m ? m[1].replace(/\s+/g, " ").trim() || undefined : undefined;
}

function extractCtaTexts(html: string): string[] {
  const texts = new Set<string>();
  const tagRe = /<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi;
  for (const m of html.matchAll(tagRe)) {
    const text = stripHtmlToText(m[1]);
    if (text && text.length <= 60) texts.add(text);
  }
  return [...texts].slice(0, 40);
}

function detectContactForm(html: string): boolean {
  if (!/<form\b/i.test(html)) return false;
  return /<input[^>]+type=["'](?:email|text|tel)["']/i.test(html) || /<textarea\b/i.test(html);
}

function detectBookingLinks(links: string[]): string[] {
  const found = new Set<string>();
  for (const link of links) {
    if (BOOKING_HOST_RE.test(link) || BOOKING_PATH_RE.test(link)) found.add(link);
  }
  return [...found].slice(0, 8);
}

function detectTechStack(html: string): string[] {
  const stack = new Set<string>();
  const checks: Array<[RegExp, string]> = [
    [/wp-content|wp-includes|name=["']generator["'][^>]*wordpress/i, "wordpress"],
    [/elementor/i, "elementor"],
    [/(static\.wixstatic\.com|name=["']generator["'][^>]*wix)/i, "wix"],
    [/squarespace/i, "squarespace"],
    [/cdn\.shopify\.com|shopify/i, "shopify"],
    [/webflow/i, "webflow"],
    [/godaddy|websitebuilder/i, "godaddy"],
    [/weebly/i, "weebly"],
    [/jquery[.-]1\.[0-9]/i, "legacy-jquery"],
  ];
  for (const [re, name] of checks) if (re.test(html)) stack.add(name);
  return [...stack];
}

export function buildWebsiteSignals(input: BuildWebsiteSignalsInput): WebsiteSignals {
  const pages = input.pages.filter(p => p && typeof p.html === "string");
  const homepage = pages[0] || { url: "", html: "", links: [] };
  const allLinks = pages.flatMap(p => p.links || []);
  const allHtml = pages.map(p => p.html).join(" ");

  const ctaTexts = extractCtaTexts(allHtml);
  const bookingLinks = detectBookingLinks(allLinks);
  const contactFormFound = pages.some(p => detectContactForm(p.html));

  const localParts = input.emails
    .map(e => (e.split("@")[0] || "").toLowerCase())
    .filter(Boolean);
  const hasGenericInboxOnly =
    localParts.length > 0 && localParts.every(part => GENERIC_LOCAL_PARTS.has(part));

  const evidence: WebsiteSignals["evidence"] = [];
  if (bookingLinks.length) evidence.push({ signal: "booking_link", sourceUrl: homepage.url, snippet: bookingLinks[0] });
  if (contactFormFound) evidence.push({ signal: "contact_form", sourceUrl: homepage.url, snippet: "contact form present" });
  if (input.socialLinks.length) evidence.push({ signal: "social_link", sourceUrl: homepage.url, snippet: input.socialLinks[0] });

  return {
    pagesScanned: pages.map(p => p.url).filter(Boolean),
    title: extractTitle(homepage.html),
    metaDescription: extractMetaDescription(homepage.html),
    homepageTextLength: stripHtmlToText(homepage.html).length,
    contactFormFound,
    bookingLinks,
    ctaTexts,
    socialLinks: input.socialLinks,
    hasGenericInboxOnly,
    techStack: detectTechStack(allHtml),
    ssl: { valid: homepage.url.startsWith("https://"), httpsRedirect: homepage.url.startsWith("https://") },
    evidence,
  };
}
