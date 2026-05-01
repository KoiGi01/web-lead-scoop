const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const WHATSAPP_REGEX = /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|whatsapp\.com\/send)\/?[^\s"'<>]*/gi;
const MAILTO_REGEX = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const LINKEDIN_PROFILE_REGEX = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/gi;
const LINKEDIN_COMPANY_REGEX = /https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9\-_%]+\/?/gi;

type ContactSource = "hunter" | "linkedin" | "website";

interface DecisionMakerContact {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  department?: string;
  seniority?: string;
  linkedinUrl?: string;
  confidence?: number;
  source: ContactSource;
  decisionMakerScore: number;
  decisionMakerReason: string;
}

function extractEmails(text: string): string[] {
  const emails = new Set<string>();
  for (const m of text.matchAll(MAILTO_REGEX)) emails.add(m[1].toLowerCase());
  for (const m of text.matchAll(EMAIL_REGEX)) {
    const email = m[0].toLowerCase();
    if (
      !email.endsWith(".png") &&
      !email.endsWith(".jpg") &&
      !email.endsWith(".gif") &&
      !email.endsWith(".svg") &&
      !email.includes("example.com") &&
      !email.includes("sentry.io") &&
      !email.includes("wixpress.com") &&
      !email.includes("squarespace.com")
    ) {
      emails.add(email);
    }
  }
  return [...emails];
}

function extractWhatsApp(text: string): string[] {
  return [...new Set([...text.matchAll(WHATSAPP_REGEX)].map(m => m[0]))];
}

function extractLinkedInProfiles(text: string, links: string[]): string[] {
  const urls = new Set<string>();
  for (const m of text.matchAll(LINKEDIN_PROFILE_REGEX)) urls.add(m[0]);
  links
    .filter(link => /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/i.test(link))
    .forEach(link => urls.add(link));
  return [...urls].slice(0, 5);
}

function extractLinkedInCompany(text: string, links: string[]): string | undefined {
  const htmlMatch = text.match(LINKEDIN_COMPANY_REGEX)?.[0];
  if (htmlMatch) return htmlMatch;
  return links.find(link => /https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9\-_%]+\/?/i.test(link));
}

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function titleIncludes(title: string, values: string[]) {
  const lower = title.toLowerCase();
  return values.some(value => lower.includes(value));
}

function inferIndustryGroup(industry: string): "agency" | "healthcare" | "ecommerce" | "local" | "general" {
  const text = industry.toLowerCase();
  if (/(agency|agencies|ai|software|saas|consult|studio|marketing|development|dev shop)/.test(text)) return "agency";
  if (/(clinic|clinics|doctor|dentist|dental|health|medical|medspa|therapy|physio|chiropractor)/.test(text)) return "healthcare";
  if (/(ecommerce|e-commerce|shop|store|retail|brand|fashion|consumer)/.test(text)) return "ecommerce";
  if (/(contractor|restaurant|hotel|salon|gym|law firm|lawyer|plumber|electrician|real estate|local)/.test(text)) return "local";
  return "general";
}

function scoreDecisionMaker(contact: Partial<DecisionMakerContact>, industry: string): { score: number; reason: string } {
  const title = contact.title || "";
  const group = inferIndustryGroup(industry);
  let score = Math.min(20, Math.max(0, contact.confidence || 0) / 5);
  const reasons: string[] = [];

  const universal = ["ceo", "chief executive", "founder", "co-founder", "owner", "partner", "managing director", "principal"];
  if (titleIncludes(title, universal)) {
    score += 70;
    reasons.push("senior owner/founder title");
  }

  const groupRules: Record<string, string[]> = {
    agency: ["growth", "marketing", "sales", "business development", "revenue", "commercial", "client acquisition"],
    healthcare: ["medical director", "practice manager", "office manager", "clinic director", "administrator"],
    ecommerce: ["ecommerce", "e-commerce", "growth", "marketing", "brand", "digital", "commercial"],
    local: ["general manager", "operations", "manager", "director"],
    general: ["growth", "marketing", "sales", "business development", "operations", "director"],
  };

  if (titleIncludes(title, groupRules[group])) {
    score += group === "agency" || group === "ecommerce" ? 55 : 45;
    reasons.push(`${group} title fit`);
  }

  if (contact.email) score += 10;
  if (contact.linkedinUrl) score += 8;
  if (!title && contact.linkedinUrl) {
    score += 18;
    reasons.push("public LinkedIn profile");
  }
  if (!reasons.length) reasons.push(contact.title ? "known contact title" : "available contact");

  return { score: Math.min(100, Math.round(score)), reason: reasons.join(", ") };
}

function normalizeHunterContact(raw: any, industry: string): DecisionMakerContact | null {
  const email = String(raw?.value || raw?.email || "").toLowerCase();
  const firstName = raw?.first_name || raw?.firstName || "";
  const lastName = raw?.last_name || raw?.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || raw?.full_name || raw?.name || email;
  const title = raw?.position || raw?.title || "";
  const confidence = typeof raw?.confidence === "number" ? raw.confidence : undefined;
  if (!email && !fullName) return null;
  const base: Partial<DecisionMakerContact> = {
    email,
    firstName,
    lastName,
    fullName,
    title,
    department: raw?.department || "",
    seniority: raw?.seniority || "",
    linkedinUrl: raw?.linkedin || raw?.linkedin_url || "",
    confidence,
  };
  const ranked = scoreDecisionMaker(base, industry);
  return {
    ...base,
    source: "hunter",
    decisionMakerScore: ranked.score,
    decisionMakerReason: ranked.reason,
  };
}

function linkedinContact(url: string, industry: string): DecisionMakerContact {
  const slug = decodeURIComponent(url.split("/in/")[1]?.replace(/\/$/, "") || "LinkedIn profile")
    .replace(/[-_]+/g, " ")
    .trim();
  const base = { fullName: slug, linkedinUrl: url };
  const ranked = scoreDecisionMaker(base, industry);
  return {
    ...base,
    source: "linkedin",
    decisionMakerScore: ranked.score,
    decisionMakerReason: ranked.reason,
  };
}

function mergeContacts(contacts: DecisionMakerContact[]): DecisionMakerContact[] {
  const seen = new Set<string>();
  return contacts
    .filter(contact => {
      const key = (contact.email || contact.linkedinUrl || contact.fullName || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.decisionMakerScore - a.decisionMakerScore)
    .slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, enrichMode = false, industry = "" } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let formattedUrl = String(url).trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["html", "links"],
        onlyMainContent: false,
      }),
    });

    if (!scrapeResp.ok) {
      console.error("Firecrawl error:", await scrapeResp.text());
      return new Response(
        JSON.stringify({ success: true, emails: [], whatsapp: [], contactPageFound: false, contacts: [], emailSource: "none" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const scrapeData = await scrapeResp.json();
    const html = scrapeData.data?.html || scrapeData.html || "";
    const links: string[] = scrapeData.data?.links || scrapeData.links || [];

    let allEmails = extractEmails(html);
    let allWhatsApp = extractWhatsApp(html);
    let linkedInProfiles = extractLinkedInProfiles(html, links);
    let linkedinUrl = extractLinkedInCompany(html, links);

    const contactPaths = ["/contact", "/about", "/team", "/people", "/leadership", "/kontakt", "/contacto", "/sobre"];
    const contactLinks = links
      .filter(link => contactPaths.some(path => link.toLowerCase().includes(path)))
      .slice(0, 4);

    for (const contactUrl of contactLinks) {
      try {
        const contactResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: contactUrl, formats: ["html", "links"], onlyMainContent: false }),
        });
        if (!contactResp.ok) continue;
        const contactData = await contactResp.json();
        const contactHtml = contactData.data?.html || contactData.html || "";
        const contactPageLinks: string[] = contactData.data?.links || contactData.links || [];
        allEmails = [...new Set([...allEmails, ...extractEmails(contactHtml)])];
        allWhatsApp = [...new Set([...allWhatsApp, ...extractWhatsApp(contactHtml)])];
        linkedInProfiles = [...new Set([...linkedInProfiles, ...extractLinkedInProfiles(contactHtml, contactPageLinks)])].slice(0, 5);
        linkedinUrl = linkedinUrl || extractLinkedInCompany(contactHtml, contactPageLinks);
      } catch (error) {
        console.error(`Error scraping contact page ${contactUrl}:`, error);
      }
    }

    const contacts: DecisionMakerContact[] = linkedInProfiles.map(profile => linkedinContact(profile, industry));
    let emailSource: "firecrawl" | "hunter" | "both" | "none" = allEmails.length > 0 ? "firecrawl" : "none";

    if (enrichMode) {
      const hunterApiKey = Deno.env.get("HUNTER_API_KEY");
      const domain = getDomain(formattedUrl);
      if (hunterApiKey && domain) {
        try {
          const hunterResp = await fetch(
            `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterApiKey}`,
          );
          if (hunterResp.ok) {
            const hunterData = await hunterResp.json();
            const hunterContacts = (hunterData?.data?.emails || [])
              .map((entry: any) => normalizeHunterContact(entry, industry))
              .filter((entry: DecisionMakerContact | null): entry is DecisionMakerContact => !!entry);
            const hunterEmails = hunterContacts.map(contact => contact.email).filter((email): email is string => !!email);
            if (hunterEmails.length > 0) {
              allEmails = [...new Set([...allEmails, ...hunterEmails])];
              emailSource = emailSource === "firecrawl" ? "both" : "hunter";
            }
            contacts.push(...hunterContacts);
          } else {
            console.error(`Hunter.io error (${hunterResp.status}):`, await hunterResp.text());
          }
        } catch (error) {
          console.error("Hunter.io enrichment error:", error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emails: allEmails,
        whatsapp: allWhatsApp,
        contactPageFound: contactLinks.length > 0,
        linkedinUrl,
        contacts: mergeContacts(contacts),
        emailSource,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: true, emails: [], whatsapp: [], contactPageFound: false, contacts: [], emailSource: "none" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
