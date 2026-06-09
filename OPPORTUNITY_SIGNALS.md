# How Opportunity Signals Are Obtained

This documents exactly where each opportunity signal comes from, what data feeds
it, and — importantly for cost — **which Firecrawl spend is needed for signals and
which is not.**

TL;DR: **Opportunity signals are free.** They are derived from data we already
fetch (the Google Places result + the website HTML we already scrape). Detecting
them costs **$0 of extra API spend**. The expensive part of a search (the 5
discovery searches per business in Enrich mode) feeds **decision-maker contacts,
not signals** — so turning Enrich off does not reduce signal quality.

---

## The data we feed into signal detection

There are only **three** inputs, and we pay for two of them anyway (we'd fetch
them with or without signals):

| Input | Source | Firecrawl/Google cost | Used for signals? |
|-------|--------|-----------------------|-------------------|
| `rating`, `reviewCount` | Google Places (`search-places`) | Already in the Places field mask — **$0 extra** | ✅ reviews / local presence |
| Homepage HTML + links | Firecrawl `/v1/scrape` of the website | 1 credit (we scrape it anyway for contacts) | ✅ most signals |
| Contact/about/team HTML | Firecrawl `/v1/scrape` of up to N sub-pages | 1 credit each (we scrape them anyway for contacts) | ✅ contact-form / generic-inbox |

No signal makes its own API call. No PageSpeed/SEMrush/Lighthouse call is made.
The detector is a **pure function** over data already in hand.

> **What is NOT used for signals:** the `discoverPublicProfiles` step in Enrich
> mode (5 Firecrawl `/v1/search` queries per business, ~10 credits). That step
> hunts for LinkedIn / decision-maker profiles. It feeds the **contacts** list,
> never the signals. See [Cost implications](#cost-implications).

---

## The pipeline (4 stages)

```
 search-places            extract-contacts                src/lib                       src/lib
 (edge fn)                (edge fn)                        (browser)                     (browser)
┌──────────────┐  rating ┌───────────────────────┐ html  ┌────────────────────────┐   ┌──────────────────────┐
│ Google Places │───────▶│ Firecrawl /v1/scrape   │──────▶│ buildWebsiteSignals    │──▶│ detectOpportunitySignals│
│ rating +      │ review │ homepage + contact pgs │ links │ (raw FACTS from HTML)  │   │ (FACTS → 8 signals)    │
│ reviewCount   │ Count  └───────────────────────┘       └────────────────────────┘   └──────────┬───────────┘
└──────────────┘                                                                                  │ DetectedSignal[]
                                                                                                  ▼
                                                                                       ┌──────────────────────┐
                                                                                       │ buildLeadIntelligence │
                                                                                       │ → saved_leads.intel    │
                                                                                       └──────────────────────┘
```

### Stage 1 — Scrape the page (the only paid part)
`supabase/functions/extract-contacts/index.ts` scrapes the homepage and up to a
few contact-type sub-pages (`/contact`, `/about`, `/team`, …) with Firecrawl
`/v1/scrape`, asking for `formats: ["html", "links"]`. This is done **for contact
extraction regardless of signals**; signals just reuse the same HTML.

### Stage 2 — Turn HTML into raw facts (`buildWebsiteSignals`)
`supabase/functions/_shared/websiteSignals.ts` is a pure, dependency-free parser.
It reads the scraped HTML/links and emits a `WebsiteSignals` object of **observed
facts** (not yet judgments):

- `title`, `metaDescription` — from `<title>` / `<meta name="description">`
- `homepageTextLength` — character count of stripped homepage text
- `contactFormFound` — a `<form>` containing an email/text/tel input or textarea
- `contactPageFound` — whether a contact sub-page was reached
- `bookingLinks` — links matching booking hosts (Calendly, Acuity, Booksy, Cal.com…) or paths (`/book`, `/appointment`, `/reserva`…)
- `ctaTexts` — text of every `<a>`/`<button>` (≤60 chars)
- `socialLinks` — already-extracted social profile links
- `hasGenericInboxOnly` — true if **every** found email is a generic local-part (`info@`, `contact@`, `sales@`, `support@`, …)
- `techStack` — fingerprinted from HTML (WordPress, Wix, Squarespace, Shopify, Webflow, GoDaddy, Weebly, legacy jQuery…)
- `ssl` — derived from whether the final URL is `https://`
- `evidence` — sample snippets for booking/form/social

### Stage 3 — Interpret facts into signals (`detectOpportunitySignals`)
`src/lib/detectOpportunitySignals.ts` maps the facts + Places context into the 8
signals. **It only emits the keys the user selected** (`selectedKeys`) — if no
signals are selected, it emits nothing. Each emitted signal carries `present`,
a `confidence` (0–100), and an `evidence` snippet. Thresholds are named constants:

- `THIN_SITE_TEXT_LENGTH = 1200`
- `LOW_REVIEW_COUNT = 18`
- `WEAK_RATING = 4.0`

### Stage 4 — Persist (`buildLeadIntelligence`)
`src/lib/leadIntelligence.ts` maps the detected signals + a website-facts summary
into the `saved_leads.intelligence` JSON shape (`{ detectedIssues, signals: {
version, service, detected[], website } }`). Returns `null` if there are no
signals (which is why saves can show `intelligence: null` — see the known gap in
CLAUDE.md).

---

## The 8 signals, and exactly what each one looks at

| Signal key | "Present" when… | Threshold / rule | Inputs |
|------------|-----------------|------------------|--------|
| `weak_website` | thin content, missing title/meta, no HTTPS, or a low-end builder | `homepageTextLength < 1200`, no `<title>`/meta, `ssl.valid === false`, or techStack ∈ {wix, godaddy, weebly, legacy-jquery} | homepage HTML |
| `no_booking` | no booking link **and** no booking-style CTA | `bookingLinks` empty & no CTA matching book/appointment/schedule/reserve | homepage + contact HTML, links |
| `no_clear_cta` | no action CTA anywhere | no CTA text matching book/quote/call/contact/get-started/sign-up/schedule/request/buy/order/subscribe/consult/estimate | CTA texts |
| `generic_inbox` | only generic mailboxes found | every extracted email local-part is generic (`info@`, `contact@`, `sales@`…) | extracted emails |
| `no_contact_form` | no form **and** no contact page | `!contactFormFound && !contactPageFound` | homepage + contact HTML |
| `no_social_links` | no social profiles found | `socialLinks.length === 0` | extracted social links |
| `low_reviews` | few public reviews | `reviewCount < 18` (needs Places data) | Google Places |
| `weak_local_presence` | few reviews **and** weak rating | `reviewCount < 18` && `rating < 4.0` | Google Places |

Notes:
- `low_reviews` / `weak_local_presence` need **Google Places** data only — they
  work even for businesses with no website.
- All website signals get **more pages = better evidence** (contact/about pages
  reduce false positives like "no contact form"), but the homepage alone is
  enough to emit every website signal.
- Confidence is a fixed heuristic per detector (e.g. present booking-gap = 70),
  not a model score. Phase 6 AI scoring is separate and not written by this
  rule-based path.

---

## Which signals show for which service

Signals are not all shown at once. The service the user sells maps to a relevant
subset (`src/lib/opportunitySignals.ts`):

- **Web design** → weak_website, no_clear_cta, no_booking, no_contact_form
- **SEO** → weak_local_presence, low_reviews, weak_website, no_social_links
- **Booking automation** → no_booking, no_clear_cta, no_contact_form
- **AI automation / CRM** → no_booking, no_contact_form, generic_inbox
- **Social media marketing** → no_social_links, low_reviews, weak_website
- **Reputation management** → low_reviews, weak_local_presence
- Unknown/custom service → keyword match, else default {weak_website, no_clear_cta, generic_inbox}

---

## Cost implications

### How Firecrawl actually bills (verified June 2026)
Firecrawl charges **per page (per URL), a flat 1 credit** — **not per word and not
per domain.** A 50-word page and a 5,000-word page both cost 1 credit. Specifics:

- **`/v1/scrape`**: **1 credit per page.** Cached results still cost 1. (Our calls
  use `formats: ["html","links"]`, so no surcharge.)
- **`/v1/search`**: **2 credits per 10 results.** Any single call returning 1–10
  results = 2 credits. Our discovery uses `limit: 4`, so each query = 2 credits.
- Surcharges we do **not** trigger: JSON/LLM-extract mode (+4 = 5/page), stealth
  proxy (5/page), PDF parsing (+1/PDF page).

### Per-business Firecrawl cost in our flow
| Step | Calls | Credits | Needed for signals? |
|------|-------|---------|---------------------|
| Discovery searches (Enrich only) | 5 × `/v1/search` | **~10** | ❌ no — contacts only |
| Homepage scrape | 1 × `/v1/scrape` | 1 | ✅ yes |
| Contact sub-pages | 2 (simple) / 3 (normal) / 4 (deep) × `/v1/scrape` | 2–4 | ✅ helps |

So a **Normal + Enrich** business ≈ `10 + 1 + 3 = ~14` credits, of which **~10 (70%)
is the Enrich discovery search that signals never use.**

### The lever
Turning **Enrich off** removes the ~10-credit discovery step per business while
keeping **every opportunity signal intact** (signals come from the scrape, which
still happens). Enrich should therefore be **optional**, used only when the user
specifically wants named decision-maker contacts.

Rough effect: a Normal search of ~18–24 businesses drops from ~250 Firecrawl
credits to **~70–100** with Enrich off — same signals, same scraped pages, just
no per-business profile hunting.

---

## Source files

- `supabase/functions/search-places/index.ts` — returns `rating` / `reviewCount` (free).
- `supabase/functions/extract-contacts/index.ts` — scrapes pages; builds `websiteSignals`; (Enrich) runs `discoverPublicProfiles`.
- `supabase/functions/_shared/websiteSignals.ts` — `buildWebsiteSignals` (facts).
- `src/lib/detectOpportunitySignals.ts` — facts → 8 signals (pure, deterministic).
- `src/lib/opportunitySignals.ts` — signal keys, labels, service→signal mapping.
- `src/lib/leadIntelligence.ts` — persistence shape for `saved_leads.intelligence`.
