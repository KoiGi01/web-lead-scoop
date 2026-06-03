# Extraction Audit For Opportunity Rework

Date: 2026-06-03

## Scope

This audit covers the current contact extraction path before building rule-based opportunity signal detection.

Relevant files:

- `src/components/landing/LeadGeneratorSection.tsx`
- `supabase/functions/extract-contacts/index.ts`
- `supabase/functions/extract-contacts-v2/index.ts`
- `supabase/functions/analyze-lead/index.ts`

## Current Call Path

The live search UI currently calls `extract-contacts` from `LeadGeneratorSection`.

Request payload includes:

- `url`
- `businessName`
- `location`
- `enrichMode`
- `industry`
- `depth`
- `userId`
- `searchSessionId`
- `usageType`
- `creditsChargedToUser`

`extract-contacts-v2` exists and has a `/ping` version response, but the main UI is not currently invoking it.

## Current Extractor Output

`extract-contacts` returns:

- `success`
- `emails`
- `whatsapp`
- `contactPageFound`
- `linkedinUrl`
- `socialLinks`
- `contacts`
- `emailSource`
- optional non-customer debug fields

The contacts are built from:

- LinkedIn `/in/` profile URLs
- website text name/title extraction
- Hunter domain search when `enrichMode` is enabled

The function logs provider usage to `api_usage_events`.

## What It Can Already Support

These opportunity-adjacent signals can be derived with low extra work:

- Public email found
- Generic inbox vs person-like email
- Phone found
- Website found
- Contact page found
- Social/professional links found
- Person/contact found
- LinkedIn person profile found

## Missing Data For Opportunity Signals

The extractor does not currently return enough structured evidence for the main opportunity-agent rework.

Missing fields:

- Booking or appointment links
- Contact form presence
- CTA/button text
- Homepage title and meta description
- Homepage body length or copy quality hints
- Evidence snippets with source URL
- Website structure hints, such as team/about/contact page URLs found
- Review count/rating evidence
- SSL or broken-site status
- Basic performance/page speed signals
- Service-specific signal confidence

## Analyze-Lead Reuse

`analyze-lead` is a good candidate for reuse or refactor. It already contains:

- Rule-based opportunity score
- Claude-backed business analysis
- `domain_intelligence` caching
- Detected issues
- Opportunity summary
- Pitch angle and outreach hook generation

Current limitation: it expects homepage text and enrichment input, and it is not wired into the live result-generation loop.

## Recommended Next Step

Before adding detectors, extend the extraction layer to return a structured `websiteSignals` object.

Suggested MVP shape:

```ts
interface WebsiteSignals {
  pagesScanned: string[];
  contactPageFound: boolean;
  contactFormFound: boolean;
  bookingLinks: string[];
  ctaTexts: string[];
  socialLinks: string[];
  title?: string;
  metaDescription?: string;
  homepageTextLength?: number;
  evidence: Array<{
    signal: string;
    sourceUrl: string;
    snippet: string;
  }>;
}
```

Store the initial opportunity fields inside the existing `saved_leads.intelligence` JSON for the MVP. Add dedicated columns only after the signal shape stabilizes.

## Rollback Gate

Opportunity-mode work is now gated through:

- `VITE_ENABLE_OPPORTUNITY_MODE=true`
- `?opportunity=1`
- `?opportunityMode=1`
- `localStorage.setItem("globaleads-opportunity-mode", "true")`

The local demo preview also enables opportunity mode automatically.
