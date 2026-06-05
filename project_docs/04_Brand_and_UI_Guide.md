# Brand And UI Guide

## Brand Direction

GlobaLeads22 should feel like a premium, sharp, black/yellow SaaS product built for operators who want speed and control.

Preferred style:

- Premium SaaS.
- Black and electric yellow.
- Geometric.
- High contrast.
- Dense but readable.
- Tactical and work-focused.
- Futuristic without becoming gimmicky.

Avoid:

- Generic SaaS templates.
- Plain white card grids.
- Boring dashboards.
- Soft pastel startup visuals.
- Overly beige or washed-out UI.
- Too much plainness.
- Marketing fluff.

## Colors

Primary palette:

- Black: `#000000`
- Near black surface: `#0A0A0A`
- Dark surface: `#11110E`
- Electric yellow: `#F5FF3D`
- Brand yellow / logo yellow: `#FBEE03`
- Warm text: `#EFEDE6`
- Muted text: `#A8A59C`
- Secondary muted text: `#67645B`

Support colors:

- Success green: use sparingly for active/confirmed states.
- Red: use only for destructive actions or serious warnings.
- Soft tinted column backgrounds are acceptable in pipeline, but they should not overpower the black/yellow brand.

## Typography

Preferred font:

- IBM Plex Mono for labels, controls, small UI text, and technical/product surfaces.

Current UI also uses a bold display face for large product headings. Keep large headings heavy, tight, and confident.

Rules:

- Keep all-caps mono labels for navigation, filters, and metadata.
- Use strong display headings for major view titles.
- Avoid tiny low-contrast text in light mode.
- Avoid negative letter spacing in compact controls.

## Logo Usage

Logo direction:

- Use the yellow square mark prominently in app chrome.
- Keep enough padding around the logo.
- Do not place the logo on busy backgrounds.
- Do not recolor the mark into generic blue/purple SaaS colors.
- In the app, the logo should be a strong first-viewport brand signal.

## UI Screenshots

Current local screenshot references:

- Manual search dark preview: `output/playwright/manual-search-preview-dark.png`
- Manual search preview: `output/playwright/manual-search-preview.png`
- Light mode search: `output/playwright/light-mode/01-search.png`
- Buy credits modal: `output/playwright/light-mode/02-buy-credits-modal.png`
- Lead inbox: `output/playwright/light-mode/03-lead-inbox.png`
- Pipeline: `output/playwright/light-mode/04-pipeline.png`
- Follow-ups: `output/playwright/light-mode/05-follow-ups.png`
- Saved searches: `output/playwright/light-mode/06-saved-searches.png`
- Settings and credits: `output/playwright/light-mode/07-settings-credits.png`
- Admin usage: `output/playwright/light-mode/08-admin-usage.png`
- Onboarding modal: `output/playwright/light-mode/09-onboarding-modal.png`

If these docs are shared outside the repo, export or attach the images separately.

## Component Style

Buttons:

- Square or lightly rounded geometric buttons.
- Yellow primary actions.
- Mono uppercase labels for app controls.
- Icons from Lucide where possible.

Cards:

- Use cards for repeated lead items, modals, and contained tools.
- Avoid putting cards inside cards.
- Keep dark cards high contrast.
- Use yellow border/glow only for important focus states.

Navigation:

- Sidebar should feel like an operator workspace.
- Active item should be obvious.
- Keep gated items visible for Free users, but show upgrade modal on click.

Pipeline:

- Soft tinted columns.
- Compact cards.
- Person-first card display.
- Drag/drop stage changes.

Search:

- Manual search should feel like a guided setup surface with a live preview.
- AI search should feel like a chat workspace with a lead-profile preview panel.
- Loader should feel active and staged, not stuck.

