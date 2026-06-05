# GlobaLeads22 App Redesign — Design Spec

Date: 2026-06-04
Status: Approved at alpha level (Home mock signed off); building section-by-section.

## Goal

A full visual + structural redesign of the authenticated app (`app.globaleads22.com` / `AppPage`) into a modern-SaaS look. Scope is **option B — redesign today's working functionality** (search, prospects, pipeline, follow-ups, saved scans, settings, admin). No dependence on unbuilt opportunity-agent features (REWORK_PLAN phases 3–6). The landing page is out of scope here.

## Design Direction — "Refined Electric" (D, disciplined)

Near-black canvas + citron accent, executed with restraint (the user liked direction D but flirted with the Linear/Vercel minimalism of A — so: D's energy, A's discipline). Reference mock: `design-mocks/home-v2.html`.

### Tokens (dark, v1)
```
--bg #08090c · --bg-1 #0b0d11 · --surf #0f1115 · --surf-2 #14171d · --surf-3 #1c2029
--line rgba(233,238,247,.07) · --line-2 .13 · --line-3 .20
--text #f3f5f8 · --muted #98a0af · --dim #5b6472 · --faint #3a414e
--acc #e8fb52 (citron) · --acc-deep #cfe935 · --acc-soft rgba(232,251,82,.13)
--hot #ff5c49 · --warm #ffb23e · --cool #57b9ff · --mint #5fe3a1
radii: sm 9 · md 10 · lg 15–18 · pill 999
```
Accent discipline: citron is reserved for primary actions, one highlighted KPI/data series, and active/brand marks — never decorative.

### Type
- Display / headings / big numbers: **Space Grotesk** (600/700, tight tracking).
- Body / UI: **Inter** (400–600).
- Labels / metrics / breadcrumbs / tags: **JetBrains Mono** (uppercase, .06–.14em).

### Theme
- **Dark-only for v1.** Light mode deferred (the current `.app-light` bridge is not migrated). Reversible later.

## App Shell (Section 1)

- **Layout:** CSS grid `248px 1fr`, `height:100vh`. The shell (sidebar + topbar) is **fixed full-height**; **only the main content column scrolls**. No page-level scrollbar.
- **Collapsible sidebar:** a collapse/expand toggle. Collapsed = icon-rail (~64px); expanded = 248px. Preserve current collapse behavior/state.
- **Sidebar contents:**
  - Brand lockup (citron square mark + `GlobaLeads22` wordmark, mono `22`).
  - Nav, grouped:
    - WORKSPACE: Home · New scan (citron accent item) · Prospects (count badge) · Pipeline · Follow-ups (count badge)
    - LIBRARY: Saved scans · Settings
    - (Admin Usage appended for admins.)
  - Credits card pinned bottom (label, value `used / total`, progress bar, Buy link).
  - User row (avatar, name, plan).
- **Topbar (~64px, fixed):** breadcrumb (mono), global search pill, right actions = theme toggle + notifications + primary "New scan" button. Avatar/account menu retained.

## Sections & Build Order

Each section is built in the real app, tested live by the user, and green-lit before the next.

1. **Design system + app shell** — tokens, type, collapsible fixed sidebar + topbar, content-only scroll.
2. **Home dashboard** (NEW landing) — welcome band; KPIs (Prospects saved · Scans this month · New this week · Follow-ups due); "Prospects added · last 8 weeks" stacked bars (with-email vs no-email); **Pipeline funnel** (New→Contacted→Qualified→Won + win-rate line); Recent scans + Due-today lists. All from existing data.
3. **New Scan** — search setup + AI/chat flow.
4. **Prospects** (Lead Inbox) — table/cards + detail panel.
5. **Pipeline** — kanban board.
6. **Follow-ups**.
7. **Saved scans**.
8. **Settings & Credits**.
9. **Admin dashboard**.
10. **Modals + states** — Auth, Credits, Onboarding, Edit Profile; empty/loading/error states.

## Data Sources (today)

- `saved_leads` → prospects, pipeline stages (`crm_status`), follow-ups (`next_follow_up_at`), email presence, `intelligence.opportunityScore`/`leadQualityScore` where present.
- `search_sessions` / search history → scans, recent activity.
- `user_credits` / entitlements → credits card, plan.
- Admin accounting tables → admin dashboard.

## Constraints

- Do not break `app.globaleads22.com` rendering `AppPage`, or existing search / credits / save / export / CRM behavior.
- Keep edge-function calls and data flow unchanged — presentation layer only.
- Per section: `npm.cmd run build` green before claiming done; user live-tests and green-lights before next.

## Section 3 — New Scan (finalized: quality-always-on)

Product decision: a lead is only valuable if it's high quality, so **enrichment (decision-maker contacts via Hunter) is always on**. Quality is never a user choice; the only thing the user tunes is what / who / where / how many.

**Config model — removed vs kept**
- Removed: Normal/Enrich toggle (always enrich), Strictness (default balanced; offer Broaden/Narrow *after* results later), per-signal priority filters, the standalone "prefer public email" toggle (always rank email higher).
- Kept: service ("what you sell"), market/niche, location (country/city), **scan size**.
- Advanced (collapsed): language, "only businesses with a website", "skip prospects I've already saved".

**Scan sizes** (outcome-framed): Quick ~20 · Standard ~40 · Deep ~60.

**Implementation:** force `enrichMode = true` in `LeadGeneratorSection`; drop the toggle/strictness/filter UI; keep `search-places` + `extract-contacts` calls unchanged otherwise.

## Pricing / Credits (recalculated — always-enriched)

Per-scan cost: **Quick 10 · Standard 25 · Deep 40 credits** (Standard moved 20→25 to equalize margin).
Credit value target **~$0.12** (floor ~$0.11). Plans: **Free $0 / 10 cr (one Quick scan, email-verified)** · Starter $19 / 150 · Growth $49 / 420 · Pro $99 / 900. Top-ups: $10/80 · $25/210 · $59/520.

COGS/scan (default repo cost envs, ~60% domain hit): Quick ~$0.42 · Standard ~$1.02 · Deep ~$1.64. Margin ~63–67% day-1 → ~80% steady-state. Confirm real Hunter/Google rates before launch.

**Margin protection (in scope for this rework):**
- Cache enrichment by domain in `domain_intelligence` — re-enriching a known domain costs $0 (biggest lever).
- "Skip prospects I've already saved" dedupe.
- Enrich only businesses with a real domain (already done).
- Tune Google shard count + cache place discovery by niche×location.

Touches: depth credit-cost config, `entitlements` included credits, Stripe price/credit mapping, free-tier grant (10 cr + email verification). Treat pricing/credit changes as their own reviewed sub-step — do not silently alter the live revenue flow.

## Open / Deferred

- Light mode (v2).
- Logo mark color (currently citron after earlier recolor; revertible to brand yellow).
- Opportunity-agent screens (signals/scoring/outreach) — out of scope until backend phases land.
