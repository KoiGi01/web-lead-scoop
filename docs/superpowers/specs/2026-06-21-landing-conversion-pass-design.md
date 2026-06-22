# Landing page conversion pass — design

Date: 2026-06-21

## Goal

Increase sign-ups from the existing landing page (`public/landing.html`, served
at `/`). The diagnosed problem: cold Instagram traffic **scrolls but doesn't
click** — interested enough to read, not convinced enough to act. Root causes:
no social proof, no risk reversal, CTA only at the very top and very bottom, and
the page is "too boring" / too text-heavy for an audience that prefers visuals.

Strategy: a **targeted, motion-first conversion pass** layered onto the existing
page (not a redesign). Add the missing proof + conversion machinery, and make it
land **visually** (animation, brand-native motion, faithful UI replicas) rather
than as prose. Keep the existing hero animation, brand identity, and the
"powered by" vendor marquee.

## Constraints & inputs

- **Real proof to use (honest, approved by owner):** 34 paying users across
  different industries; 10,000+ leads generated. These are the only quantitative
  claims permitted. Do not fabricate testimonials or other numbers.
- **CTA copy:** the "no credit card" and "~60 second" claims are NOT confirmed.
  Use safe wording that promises nothing unverified; lean on the proof numbers
  instead. (Owner can add "no card required" later if true.)
- **No image assets / no screenshots.** Product visuals are built as faithful
  HTML/CSS **carbon copies** of the real app UI (see below).
- Keep everything in the existing static stack: `public/landing.html` +
  `public/hero-v2.css` + `public/hero-v2.js`. No framework, no build step.
- Respect `prefers-reduced-motion` for every animation added.

## Current page structure (for reference)

nav → hero (headline, subhead, CTA row, powered-by marquee) → stage product
visual (animated "Opportunity inbox") → how it works (3 steps) → lead anatomy →
who it's for (4 cards) → data & trust (prose) → final CTA → footer.

## Design — the changes

### 1. Hero: animated proof strip + risk-reversal
- Below the CTA row, add a proof line that **counts up when scrolled into view**:
  `34 paying businesses · 10,000+ leads generated · across industries`.
- Add short risk-reversal microcopy near the primary CTA using safe wording
  (e.g. "Start with 20 free leads — keep what you export"). No unverified claims.

### 2. Social-proof stat band (new section, after the stage visual)
- The centerpiece trust moment: two large **count-up counters** that animate on
  scroll — `34` paying users and `10,000+` leads generated — plus a third,
  **non-numeric** tile reading "across industries" (no fabricated industry
  count; ties visually to the industry tiles in #3).
- Minimal text, maximal impact. Brand-styled (dark, neon accent, mono labels).

### 3. "Across industries" moving tiles
- A brand-styled marquee/row of industry tiles (dentists, gyms, law firms,
  roofers, salons, real estate, clinics, restaurants…) drifting horizontally,
  reusing the existing marquee technique from the powered-by row.
- Communicates breadth visually; supports the "across industries" claim.

### 4. Real-UI carbon copies (the primary "boring → visual" upgrade)
Rebuild the actual product UI as static HTML/CSS in the landing page, framed in
the existing `app-window` style and revealed with motion. Sources to replicate
faithfully (lift structure + styling, translate Tailwind → vanilla CSS in
`hero-v2.css`):
- **Search input** — from `src/components/landing/LeadGeneratorSection.tsx`:
  niche + city fields, depth selector (Simple / Normal / Deep), "Find
  opportunities" button.
- **Ranked results inbox** — the list of ranked opportunities.
- **Opportunity card with fit score** — from
  `src/components/app/OpportunitiesDashboard.tsx` (note its animated SVG
  `ScoreRing`) and `src/components/landing/ViewAllLeads.tsx`: business, likely
  decision maker, public contact fields, signal tags, and the fit score.
- Use realistic but clearly-sample data; redact nothing real (it's invented).
- **Accent harmonization:** app uses `#e8fb52`, landing uses `#F2E500`. Render
  the replicas in the landing's accent so the page reads as one brand.

### 5. Mid-page CTA
- Insert a CTA block right after the replicas (peak conviction). Today the CTA
  exists only at the top and the very bottom.

### 6. Objections as visual cards (replaces the data & trust prose)
- 3–4 scannable cards with icons + micro-motion answering the unspoken
  cold-traffic objections:
  - *Is this spammy?* — public business data, you own/export your lists.
  - *Is the data real?* — public websites, listings, contact pages.
  - *Will it work for my niche?* — works across industries (ties to #3).
- Keeps the trust content but removes the wall of text.

### 7. Scroll-reveal motion + trimmed copy (global)
- Lightweight `IntersectionObserver` reveal-on-scroll for each section (fade/rise),
  added in `hero-v2.js`, gated by `prefers-reduced-motion`.
- Tighten paragraphs in how-it-works / who-it's-for into shorter, punchier lines.

## Technical implementation

- **`public/landing.html`** — new/edited markup for sections 1–6; preserve
  existing IDs/anchors (`#product`, `#how-it-works`, `#data`) used by nav.
- **`public/hero-v2.css`** — styles for the proof strip, stat band, industry
  tiles, UI replicas, mid CTA, objection cards, and reveal states. Reuse
  existing tokens/utilities; match the current dark + neon system.
- **`public/hero-v2.js`** — two small additions behind one `IntersectionObserver`:
  (a) count-up animation for stat numbers when in view; (b) reveal-on-scroll.
  Both no-op when `prefers-reduced-motion: reduce`.
- **Analytics:** keep the existing `landing_cta_click` PostHog capture; ensure the
  new mid-page CTA is covered by the existing `a[href^="https://app..."]` handler.

## Out of scope

- No A/B test harness (option C) — single improved page.
- No backend, no new app functionality; replicas are presentational only.
- No new fonts or brand changes; no vendor-marquee removal.
- No fabricated testimonials or metrics.

## Verification

- `npm.cmd run build` succeeds (static assets unaffected).
- Visual check of `/landing.html` at mobile + desktop widths: replicas read as
  the real product; counters animate once; sections reveal on scroll; reduced-
  motion disables animation.
- All CTAs still route to `https://app.globaleads22.com` via `window.top` and
  fire `landing_cta_click`.
- No unverified claims present in copy; only the 34-users / 10,000+-leads proof.
