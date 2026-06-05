# Design

Visual system for the GlobaLeads22 app — **"Refined Electric."** Near-black instrument surfaces, one citron accent used with restraint, cool-grey text, hairline borders, generous space. Dark-only (v1).

> Source of truth for the redesign. Components in `src/components/app/` (HomeDashboard, AppSidebar) and the `design-mocks/*.html` reflect these values. The global `index.css` / `tailwind.config.ts` tokens are being aligned to this set.

## Theme

- Mode: **dark only**. Mood: precise, electric, operator-grade.
- One hot accent (citron) reserved for primary actions, the single highlighted metric/series, active nav, and the brand mark. Never decorative.
- Semantic colors (hot/warm/cool/mint) appear **only inside data** (charts, status, intent) — paired with a label, never color-alone.

## Color

```
/* surfaces */
--bg:#08090c  --bg-1:#0b0d11  --surf:#0f1115  --surf-2:#14171d  --surf-3:#1c2029
/* hairlines */
--line:rgba(233,238,247,.07)  --line-2:rgba(233,238,247,.13)  --line-3:rgba(233,238,247,.20)
/* text */
--text:#f3f5f8  --muted:#98a0af  --dim:#5b6472  --faint:#3a414e
/* accent (citron) */
--acc:#e8fb52  --acc-deep:#cfe935  --acc-soft:rgba(232,251,82,.10)
/* semantic — data viz only */
--hot:#ff5c49 (high/negative)  --warm:#ffb23e (medium)  --cool:#57b9ff (info)  --mint:#5fe3a1 (positive)
```

Contrast: `--text` on `--surf` passes AA comfortably. `--muted` is the floor for body text; `--dim` is for labels/captions only, never sustained reading. On citron (`--acc`), text/icons are near-black `#08090c`.

## Typography

- **Display** — Space Grotesk (600/700), headings, KPI numbers, business names, prices. Tracking −0.02 to −0.03em.
- **Body / UI** — Inter (400–600), paragraphs, inputs, table text, buttons.
- **Mono** — JetBrains Mono (400–600), eyebrows, metric captions, breadcrumbs, tags, axis labels, credit counts. Uppercase, tracking .06–.16em.
- Three families max. Hierarchy via scale + weight, not color.

## Spacing & Radii

- Page padding 26px. Gaps between major blocks 14px. Inside cards 16–22px.
- Radii: inputs/buttons `9–11px`, cards `14–18px`, pills `999px`, brand mark `8px`.

## Components

- **Buttons** — primary: citron fill, near-black text, soft citron shadow, hover→white. Secondary: transparent + `--line-2` border. Mono uppercase only for small control labels.
- **Cards / panels** — `--surf` bg, 1px `--line` border, 14–18px radius. Hover lifts border to `--line-2` (and a 2px translate on interactive tiles). No glow-heavy borders.
- **KPI card** — mono label (+icon), big Space-Grotesk value with optional mint/hot delta, sparkline beneath. One KPI per screen may use the citron value.
- **Sidebar** — 248px (collapses to ~68px icon rail), `--bg-1`, grouped nav (Workspace / Library). Active item = `--surf-2` + inset hairline + citron icon. "New scan" is the one accent item (citron outline → fills on hover). Pinned credits card + user row at bottom.
- **Charts** — recharts. Bars: citron = primary series, `--surf-3` = secondary, 4px top radius. Sparklines: 1.6px stroke + faint fill. Pipeline as a **funnel** (labeled bars), not a multi-arc donut. Score/stat rings: SVG, `--line-2` track + citron progress, rounded cap.
- **Inputs / chips / segmented / toggles** — `--bg` fill, `--line-2` border, focus → citron border. Selected chip/size = citron text on `--acc-soft` with citron border. Toggle "on" = citron track.
- **Tables / lists** — hairline row dividers, `--surf-2` hover, mono uppercase column headers, featured row = subtle citron wash.

## Layout

- App shell: CSS grid `248px 1fr`, `height:100vh`. Shell (sidebar + topbar) is **fixed**; only the main content column scrolls — no page-level scrollbar.
- Topbar ~64px: mono breadcrumb · primary New-scan · account menu.
- Content max-widths: dashboards full-width with 4-col KPI / `1.55fr 1fr` chart rows; focused flows (New scan) centered ~680px single column.
- Breakpoints: KPI 4→2 cols ≤1080px; chart rows →1 col ≤1080px; sidebar hidden ≤720px (mobile drawer is a known gap).

## Motion

- Count-up KPI numbers and ring/funnel fills on mount (~1s ease-out cubic). Sparkline + chart draw on first paint.
- Transitions 150–200ms on hover/border/background.
- Tabular-nums on all animating figures so columns don't jitter.
- All of the above gated on `prefers-reduced-motion: reduce`.

## Iconography

Lucide, ~1.8px stroke, 14–17px. Reuse the app's existing set; don't hand-roll SVG icons.
