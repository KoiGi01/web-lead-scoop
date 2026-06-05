# Landing Redesign Brief — Context for Design Discussion

This is a context pack for a design discussion (Claude Design) about **redirecting the GlobaLeads22 landing page** to match a product rework. It is a discussion starter, not a finished spec. Read it alongside the attached **main-UI screenshots** and **logo** before proposing directions.

---

## 1. What you're being asked to do

We are reworking GlobaLeads22 from a *lead research tool* into an *opportunity-based prospecting agent*. The product, the app UI, and the in-product copy have already started moving in this direction. **The landing page has not caught up.** We want to discuss how the landing should be redesigned — structure, narrative, hero, visuals, and how hard to lean into the "agent" framing — so it sells the new product instead of the old one.

We are **not** rebranding the visual identity (black/electric-yellow operator aesthetic stays). We *are* potentially re-architecting the page narrative and refreshing how that identity is expressed for the new positioning.

---

## 2. The product shift (old → new)

**Old product:** Enter a niche + location → get a ranked list of businesses, people, public emails, phones, websites, likely decision makers. "Person-first lead lists in minutes." The value was *speed of research*.

**New product:** An opportunity-based prospecting agent. The value is *a reason to reach out*. The user tells the app **what they sell**, and the app finds local businesses that show **visible signs they need it**, scores them, and hands over an evidence-backed outreach angle.

**Core promise (new):**
> Find prospects with a visible reason to buy.

**New workflow the landing should communicate:**
1. Choose **what you sell** (web design, SEO, AI automation, booking automation, social media, reputation, paid ads, CRM setup, lead gen).
2. Choose the **target market** (dentists, med spas, real estate, roofers, restaurants, clinics, law firms, gyms, salons…).
3. Choose the **location**.
4. The agent discovers businesses and analyzes their public footprint (website, contact/booking paths, social, reviews).
5. It detects **opportunity signals** (outdated site, no online booking, weak local visibility, low reviews, no clear CTA, no contact form, generic inbox, no social links).
6. It **scores** each prospect by relevance to what the user sells + evidence strength.
7. It generates a **why-this-prospect** explanation, an **outreach angle**, and an optional first-message idea.
8. Results are shown as **opportunities**, not raw lead rows.

This is being implemented in phases (see `REWORK_PLAN.md`). The landing should sell the *destination*, but copy shouldn't over-promise capabilities that aren't live yet — a discussion point below.

---

## 3. Who it's for

Freelancers, consultants, small agencies, web designers, SEO freelancers, AI automation agencies, paid-ads/social shops, and B2B service providers doing local outbound. They are operators who sell a service and need a reason to start a conversation — not enterprise sales teams who want a giant database.

The emotional pull: *"Stop cold-pitching random businesses. Reach out to the ones who visibly need what you sell, with proof in hand."*

---

## 4. The messaging shift (this is the heart of the redesign)

The current landing/positioning still leans on the *old* story. Note: `project_docs/02_Positioning_and_Messaging.md` is **outdated** (lead-centric) and should be treated as legacy, not a constraint.

| From (old) | To (new) |
|---|---|
| "Find leads, not just companies." | "Find prospects with a reason to buy." |
| Person-first lead lists | Opportunity-first, evidence-backed prospects |
| Speed of research is the hero | The *reason to reach out* is the hero |
| Raw ranked contacts | Scored opportunities + outreach angle |
| Tool you operate | Agent that does the analysis for you |

**Narrative beats worth discussing for the new page:**
- Hero on the core promise + the what-you-sell → who-needs-it → proof loop.
- "Company names aren't enough" problem framing (already resonates — keep/sharpen).
- Show an **opportunity card** as the product proof: signals + score + outreach angle, not a contact dump.
- The agent doing the work (analysis, signal detection, angle writing) as a differentiator vs. databases/scrapers.

---

## 5. Current brand system (keep this — it's working)

Pulled from `project_docs/04_Brand_and_UI_Guide.md` and the live landing. This is the visual starting point; the discussion is how to *evolve the expression*, not replace it.

- **Feel:** premium, sharp, tactical, operator-focused. Futuristic without gimmicks. Dense but readable. High contrast.
- **Palette:** black `#000000`, near-black `#0A0A0A`, dark surface `#11110E`; electric yellow `#F5FF3D`, brand/logo yellow `#FBEE03`; warm text `#EFEDE6`, muted `#A8A59C`, dim `#67645B`. Green/red only for state.
- **Type:** `Archivo` (heavy, tight) for display headings; `IBM Plex Mono` for labels, controls, metadata, and technical surfaces. All-caps mono labels are a signature.
- **Motifs:** faint grid overlay, geometric square/lightly-rounded components, yellow border/glow reserved for focus, eyebrow labels above headings.
- **Logo:** yellow square mark, used prominently with padding; never recolored to generic blue/purple; never on busy backgrounds. (Logo attached separately.)

**Avoid:** generic SaaS templates, white card grids, soft pastels, washed-out beige, marketing fluff, boring dashboards.

---

## 6. Hard constraints

- **Tech:** the landing is a single static file, `public/landing.html` (inline `<style>`, Google Fonts: Archivo + IBM Plex Mono). The marketing site and the React app are split by domain — `globaleads22.com` is the landing; `app.globaleads22.com` is the product. The redesign must stay a self-contained static page and must not affect the app.
- **Copy hygiene (non-negotiable, applies to all customer-facing text):**
  - **Use:** opportunity signals, public contact data, likely decision maker, ranked prospects, outreach angle, prospecting workspace, visible reasons to buy, evidence-based.
  - **Never use:** scraper / scraping, harvesting, guaranteed emails, guaranteed decision makers, private/hidden data extraction, spam tool, or any provider/tool names (Google, Firecrawl, Hunter, Stripe, etc.) in normal customer copy.
- **Don't over-promise unshipped phases.** AI scoring, outreach-angle generation, and signal detection are phased (some not live yet). The page can sell the vision but should be discussed for honesty vs. aspiration.
- **Preserve conversion mechanics** already on the page: founder offer ("first 20 founder seats, 50% off for 3 months"), pricing/credits framing, FAQ, primary CTA into the app.

---

## 7. Open questions to discuss (the agenda)

1. **How "agent" do we go?** Lean fully into "AI prospecting agent that does the analysis," or keep it as a powerful search tool with smarter results? Affects hero, voice, and how much we anthropomorphize.
2. **Hero concept.** What single image/animation best shows "what you sell → who visibly needs it → proof"? An animated opportunity card? A three-input → scored-result flow?
3. **Page architecture.** Does the current section order (problem → signals → how-it-works → features → use cases → proof → comparison → pricing → FAQ → CTA) still serve the new story, or do we re-sequence around the workflow?
4. **The product-proof moment.** What does the hero/proof "opportunity card" show, and how do we render it on a static page in a way that feels live (matching the real app UI in the screenshots)?
5. **Evolving the look without rebranding.** Within black/electric-yellow + mono, how do we make the page feel more "intelligent agent" and less "scraper utility"? More motion? Data-viz of signals? Restraint?
6. **Honesty line.** How do we phrase capabilities that are phased-in so we're compelling but not misleading?
7. **Comparison framing.** How to position against bloated sales databases *and* against cheap scrapers, given the new opportunity angle?

---

## 8. Attached separately

- **Main UI screenshots** — the real product surface (manual search setup + live preview, AI/chat search, result cards, pipeline, inbox). The landing's product-proof visuals should feel continuous with these.
- **Logo** — the yellow square mark.

For deeper context the designer can reference in-repo: `CLAUDE.md` (product direction), `REWORK_PLAN.md` (phased rollout), `project_docs/01_Product_Spec` and `04_Brand_and_UI_Guide`. Treat `02_Positioning_and_Messaging` as legacy/lead-era.
