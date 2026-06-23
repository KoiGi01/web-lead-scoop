# Landing Page Conversion Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift sign-up conversion on the landing page by adding motion-first social proof, faithful in-page replicas of the real product UI (search → ranked inbox → opportunity card → outreach composer), a mid-page CTA, and visual objection-handling — without redesigning the page.

**Architecture:** The landing page is a single static HTML file (`public/landing.html`) styled by `public/hero-v2.css` and animated by a vanilla IIFE in `public/hero-v2.js`. All work stays in those three served files. A small reveal/count-up engine is added to the existing IIFE; every new section reuses the established light-theme design tokens and class idiom (`.app-window`, `.lead-card`, `.sec`, the `.powered-marquee` scroll technique).

**Tech Stack:** Static HTML, vanilla CSS (custom-property design system), vanilla JS (IntersectionObserver + requestAnimationFrame). Build/serve via Vite (`npm.cmd run build`, `npm.cmd run dev`). No framework, no new dependencies.

## Global Constraints

- Edit only the **served** copies under `public/`: `public/landing.html`, `public/hero-v2.css`, `public/hero-v2.js`. (Root-level `hero-v2.css`/`hero-v2.js` are stale duplicates — do NOT edit them.)
- Only permitted quantitative proof claims: **34** paying users, **10,000+** leads generated, "across industries". No other numbers, no fabricated testimonials.
- CTA copy must NOT claim "no credit card" or any specific speed (unverified). Use safe wording.
- Every animation must no-op under `html.no-motion` AND `@media (prefers-reduced-motion: reduce)`. Reuse the existing `motionOff()` helper in `hero-v2.js`.
- Replicas are rendered in the landing's **light** theme using existing tokens (`--yellow` `#e8fb52`, `--yellow-true` `#f2e500`, `--ink`, `--mono`, `--display`, `--surface`, etc.) so the page reads as one brand. Do not paste the app's dark panels.
- Preserve existing anchor IDs used by the nav: `#product`, `#how-it-works`, `#data`.
- All `https://app.globaleads22.com` links keep `target="_top"`; the existing bottom-of-page script already attaches `landing_cta_click` to every such link — new CTAs inherit it automatically, so no per-link JS needed.
- Sample data in replicas is invented (not real customers).

**Verification model:** This is static-asset work with no unit-test harness (vitest covers only `src/`). Each task is verified by (a) `npm.cmd run build` succeeding and (b) a visual check at `npm.cmd run dev` → `http://localhost:5173/landing.html`, at desktop (~1280px) and mobile (~390px) widths, plus a reduced-motion check.

---

### Task 1: Reveal + count-up engine, hero proof strip, CTA risk-reversal

Adds the reusable scroll-reveal + number count-up engine (used by later tasks) and its first consumer: an animated proof line + safe risk-reversal microcopy in the hero.

**Files:**
- Modify: `public/hero-v2.js` (append inside the existing IIFE, before its closing `})();`)
- Modify: `public/hero-v2.css` (append new rules at end of file)
- Modify: `public/landing.html` (hero section)

**Interfaces:**
- Produces (CSS/DOM contract used by all later tasks):
  - Attribute `data-reveal` on any element → starts hidden, gets class `is-in` when scrolled into view (fade+rise).
  - Attribute `data-count="<number>"` with optional `data-suffix="<string>"` on a text element → animates 0→number (locale-formatted) when its containing `[data-reveal]` enters view. Count elements MUST live inside a `[data-reveal]` ancestor.

- [ ] **Step 1: Add the reveal + count-up engine to `public/hero-v2.js`**

Insert immediately before the final `})();` (the IIFE close at the end of the file):

```javascript
  /* ---------------- reveal-on-scroll + count-up engine ---------------- */
  function fmtNumber(n) { return n.toLocaleString("en-US"); }

  function runCountUp(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (motionOff()) { el.textContent = fmtNumber(target) + suffix; return; }
    var dur = 1400, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
      el.textContent = fmtNumber(Math.floor(eased * target)) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmtNumber(target) + suffix;
    }
    requestAnimationFrame(step);
  }

  function revealEl(el) {
    el.classList.add("is-in");
    var counts = el.querySelectorAll("[data-count]");
    for (var k = 0; k < counts.length; k++) runCountUp(counts[k]);
    if (el.hasAttribute("data-count")) runCountUp(el);
  }

  var revealTargets = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    for (var r = 0; r < revealTargets.length; r++) revealEl(revealTargets[r]);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealEl(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    for (var t = 0; t < revealTargets.length; t++) io.observe(revealTargets[t]);
  }
```

- [ ] **Step 2: Add reveal + hero-proof styles to `public/hero-v2.css`**

Append at the end of the file:

```css
/* ---------------- reveal-on-scroll ---------------- */
[data-reveal] {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}
[data-reveal].is-in { opacity: 1; transform: none; }
html.no-motion [data-reveal] { opacity: 1; transform: none; transition: none; }
@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1; transform: none; transition: none; }
}

/* ---------------- hero proof strip + risk reversal ---------------- */
.hero-proof {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 4px 0 14px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.hero-proof .hp {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}
.hero-proof .hp b { color: var(--ink); font-weight: 700; }
.hero-proof .hp::before {
  content: "";
  width: 7px; height: 7px;
  border-radius: 2px;
  background: var(--yellow);
  outline: 1px solid rgba(21, 20, 15, 0.4);
}
.hero-risk {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: 0.03em;
  color: var(--muted);
  margin-bottom: 8px;
}
```

- [ ] **Step 3: Add the proof strip + risk-reversal markup to `public/landing.html`**

In the hero, replace the existing `.cta-row` block (the `<div class="cta-row"> … </div>`) with the same block followed by the proof strip and risk line:

```html
  <div class="cta-row">
    <a class="btn-primary" href="https://app.globaleads22.com" target="_top">Get 20 free leads <span class="btn-arrow">&rarr;</span></a>
    <a class="btn-secondary" href="#how-it-works"><span class="play-glyph"></span>See the workflow</a>
  </div>

  <p class="hero-risk">Start free &middot; 20 leads on us &middot; keep what you export</p>

  <div class="hero-proof" data-reveal>
    <span class="hp"><b data-count="34">0</b>&nbsp;paying businesses</span>
    <span class="hp"><b data-count="10000" data-suffix="+">0</b>&nbsp;leads generated</span>
    <span class="hp">across industries</span>
  </div>
```

- [ ] **Step 4: Build**

Run: `npm.cmd run build`
Expected: build completes with no errors; `dist/landing.html` emitted.

- [ ] **Step 5: Visual check**

Run: `npm.cmd run dev`, open `http://localhost:5173/landing.html`.
Expected: under the hero CTAs, the risk line shows; the proof strip counts up to "34 paying businesses" and "10,000+ leads generated" once. Toggle OS reduced-motion → numbers appear instantly at final values, no fade.

- [ ] **Step 6: Commit**

```bash
git add public/hero-v2.js public/hero-v2.css public/landing.html
git commit -m "feat(landing): reveal/count-up engine + hero proof strip"
```

---

### Task 2: Social-proof stat band

A standalone band of three large count-up tiles after the product visual — the centerpiece trust moment.

**Files:**
- Modify: `public/landing.html` (insert between the `.stage-wrap` block and `<section class="sec" id="how-it-works">`)
- Modify: `public/hero-v2.css` (append)

**Interfaces:**
- Consumes: `data-reveal` / `data-count` engine from Task 1.

- [ ] **Step 1: Add the stat-band markup to `public/landing.html`**

Immediately before `<section class="sec" id="how-it-works" data-screen-label="How it works">`, insert:

```html
<section class="proof-band" data-screen-label="Proof" data-reveal>
  <div class="proof-band-inner">
    <div class="pb-stat">
      <span class="pb-num"><b data-count="34">0</b></span>
      <span class="pb-label">Paying businesses</span>
    </div>
    <div class="pb-stat">
      <span class="pb-num"><b data-count="10000" data-suffix="+">0</b></span>
      <span class="pb-label">Leads generated</span>
    </div>
    <div class="pb-stat">
      <span class="pb-num pb-num-text">All<span class="pb-cap">&nbsp;kinds</span></span>
      <span class="pb-label">Across industries</span>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add the stat-band styles to `public/hero-v2.css`**

Append:

```css
/* ---------------- social proof stat band ---------------- */
.proof-band {
  max-width: 1140px;
  margin: 96px auto 0;
  padding: 0 48px;
}
.proof-band-inner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: 8px 10px 0 rgba(21, 20, 15, 0.06);
  overflow: hidden;
}
.pb-stat {
  padding: 38px 30px;
  text-align: center;
  border-left: 1px solid var(--hairline);
}
.pb-stat:first-child { border-left: none; }
.pb-num {
  display: block;
  font-family: var(--display);
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--ink);
}
.pb-num b { font-weight: 800; }
.pb-num-text .pb-cap { color: var(--muted); }
.pb-label {
  display: block;
  margin-top: 12px;
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
@media (max-width: 760px) {
  .proof-band { padding: 0 24px; margin-top: 64px; }
  .proof-band-inner { grid-template-columns: 1fr; }
  .pb-stat { border-left: none; border-top: 1px solid var(--hairline); padding: 28px 20px; }
  .pb-stat:first-child { border-top: none; }
}
```

- [ ] **Step 3: Build**

Run: `npm.cmd run build`
Expected: no errors.

- [ ] **Step 4: Visual check**

At `http://localhost:5173/landing.html`, scroll past the app-window visual: a 3-up band shows 34 / 10,000+ / "All kinds", numbers counting up once on entry. Stacks to one column at 390px.

- [ ] **Step 5: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat(landing): social-proof stat band"
```

---

### Task 3: "Across industries" moving tiles

A brand-styled marquee of industry tiles reusing the existing `.powered-marquee` scroll technique.

**Files:**
- Modify: `public/landing.html` (insert right after the `.proof-band` section from Task 2)
- Modify: `public/hero-v2.css` (append)

**Interfaces:**
- Consumes: `data-reveal` from Task 1; the existing `@keyframes powered-scroll` animation.

- [ ] **Step 1: Add the industry-tiles markup to `public/landing.html`**

Immediately after the closing `</section>` of `.proof-band`, insert:

```html
<section class="industries" data-screen-label="Industries" data-reveal>
  <span class="industries-label">Used across</span>
  <div class="industries-marquee">
    <ul class="industries-track">
      <li class="ind-tile">Dentists</li>
      <li class="ind-tile">Med spas</li>
      <li class="ind-tile">Real estate</li>
      <li class="ind-tile">Roofers</li>
      <li class="ind-tile">Restaurants</li>
      <li class="ind-tile">Clinics</li>
      <li class="ind-tile">Law firms</li>
      <li class="ind-tile">Gyms</li>
      <li class="ind-tile">Salons</li>
      <li class="ind-tile" aria-hidden="true">Dentists</li>
      <li class="ind-tile" aria-hidden="true">Med spas</li>
      <li class="ind-tile" aria-hidden="true">Real estate</li>
      <li class="ind-tile" aria-hidden="true">Roofers</li>
      <li class="ind-tile" aria-hidden="true">Restaurants</li>
      <li class="ind-tile" aria-hidden="true">Clinics</li>
      <li class="ind-tile" aria-hidden="true">Law firms</li>
      <li class="ind-tile" aria-hidden="true">Gyms</li>
      <li class="ind-tile" aria-hidden="true">Salons</li>
    </ul>
  </div>
</section>
```

- [ ] **Step 2: Add the industry-tiles styles to `public/hero-v2.css`**

Append:

```css
/* ---------------- industries marquee ---------------- */
.industries {
  max-width: 1380px;
  margin: 40px auto 0;
  padding: 0 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.industries-label {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}
.industries-marquee {
  width: 100%;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
.industries-track {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 14px;
  width: max-content;
  animation: powered-scroll 36s linear infinite;
}
.industries-marquee:hover .industries-track { animation-play-state: paused; }
.ind-tile {
  flex: 0 0 auto;
  font-family: var(--display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 10px 20px;
  box-shadow: 2px 2px 0 var(--yellow-soft);
}
@media (prefers-reduced-motion: reduce) {
  .industries-track { animation: none; flex-wrap: wrap; justify-content: center; }
}
html.no-motion .industries-track { animation: none; flex-wrap: wrap; justify-content: center; }
@media (max-width: 760px) { .industries { padding: 0 24px; } }
```

- [ ] **Step 3: Build**

Run: `npm.cmd run build`
Expected: no errors.

- [ ] **Step 4: Visual check**

Industry pills drift horizontally below the stat band; hover pauses; reduced-motion wraps them static and centered.

- [ ] **Step 5: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat(landing): across-industries marquee"
```

---

### Task 4: Live-workflow section shell + search ("New scan") replica

Opens the "show, don't tell" section and adds the first replica: the real search input, reskinned in the landing's window idiom. Mirrors `src/components/landing/LeadGeneratorSection.tsx` fields (industry/niche, location, depth Simple/Normal/Deep with credit costs 5/10/20, mode Normal/Enrich) and `CLAUDE.md` depth config.

**Files:**
- Modify: `public/landing.html` (insert after the `.industries` section from Task 3)
- Modify: `public/hero-v2.css` (append)

**Interfaces:**
- Consumes: `data-reveal` from Task 1; existing `.app-window`, `.win-head`, `.win-dots`, `.win-title` styles.
- Produces: a `<section class="flow" id="workflow">` whose `.flow-stack` later tasks append replicas into.

- [ ] **Step 1: Add the section shell + search replica to `public/landing.html`**

After the closing `</section>` of `.industries`, insert:

```html
<section class="sec flow" id="workflow" data-screen-label="Live workflow">
  <header class="sec-head" data-reveal>
    <span class="sec-kicker">See it work</span>
    <h2 class="sec-title">From a search to a sent message.</h2>
  </header>

  <div class="flow-stack">
    <div class="flow-step" data-reveal>
      <span class="flow-tag">01 &middot; Search</span>
      <div class="app-window flow-window">
        <div class="win-head">
          <span class="win-dots"><i></i><i></i><i></i></span>
          <span class="win-title">New scan</span>
        </div>
        <div class="scan-body">
          <label class="scan-field">
            <span class="scan-label">Industry / niche</span>
            <span class="scan-input">dental clinics</span>
          </label>
          <label class="scan-field">
            <span class="scan-label">Location</span>
            <span class="scan-input">Austin, TX</span>
          </label>
          <div class="scan-row">
            <span class="scan-label">Depth</span>
            <div class="scan-seg">
              <span class="seg">Simple <em>5</em></span>
              <span class="seg seg-on">Normal <em>10</em></span>
              <span class="seg">Deep <em>20</em></span>
            </div>
          </div>
          <div class="scan-row">
            <span class="scan-label">Mode</span>
            <div class="scan-seg">
              <span class="seg seg-on">Normal</span>
              <span class="seg">Enrich</span>
            </div>
          </div>
          <span class="scan-go">Find opportunities <span class="btn-arrow">&rarr;</span></span>
        </div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add the flow + search-replica styles to `public/hero-v2.css`**

Append:

```css
/* ---------------- live workflow replicas ---------------- */
.flow .flow-stack {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 760px;
  margin: 0 auto;
}
.flow-step { position: relative; }
.flow-tag {
  display: block;
  margin-bottom: 12px;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.flow-window { position: static; left: auto; top: auto; width: 100%; transform: none; animation: none; }

/* search replica */
.scan-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.scan-field { display: flex; flex-direction: column; gap: 7px; }
.scan-label {
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.scan-input {
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 12px 14px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--ink);
  background: var(--surface);
}
.scan-row { display: flex; align-items: center; gap: 16px; }
.scan-row .scan-label { min-width: 64px; }
.scan-seg { display: inline-flex; border: 1px solid var(--line); border-radius: 9px; overflow: hidden; }
.scan-seg .seg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  border-left: 1px solid var(--hairline);
}
.scan-seg .seg:first-child { border-left: none; }
.scan-seg .seg em { font-style: normal; color: var(--muted); }
.scan-seg .seg-on { background: var(--yellow); color: var(--ink); }
.scan-seg .seg-on em { color: var(--ink); }
.scan-go {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--ink);
  color: #fff;
  font-size: 14.5px;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 10px;
  box-shadow: 0 1px 0 rgba(21, 20, 15, 0.4), 4px 4px 0 var(--yellow);
}
.scan-go .btn-arrow { font-family: var(--mono); color: var(--yellow); }
@media (max-width: 760px) {
  .scan-row { flex-direction: column; align-items: flex-start; gap: 8px; }
  .scan-seg { width: 100%; }
  .scan-seg .seg { flex: 1; justify-content: center; }
}
```

- [ ] **Step 3: Build**

Run: `npm.cmd run build`
Expected: no errors.

- [ ] **Step 4: Visual check**

A "See it work" section appears with a "New scan" window: two filled fields, a Simple/Normal/Deep depth selector (Normal highlighted yellow, showing 5/10/20), a Mode selector, and a dark "Find opportunities" button. Reveals on scroll. Readable at 390px.

- [ ] **Step 5: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat(landing): workflow section + search replica"
```

---

### Task 5: Ranked results inbox + opportunity card with score ring

Second replica: a ranked results window whose lead row expands into an opportunity card carrying the SVG score ring (mirrors `ScoreRing` in `src/components/app/OpportunitiesDashboard.tsx`: viewBox 36×36, r=15, dash 94.2, rotate −90) plus signal tags and contact fields.

**Files:**
- Modify: `public/landing.html` (append a `.flow-step` inside `.flow-stack`)
- Modify: `public/hero-v2.css` (append)

**Interfaces:**
- Consumes: `data-reveal` from Task 1; `.app-window`, `.lead-fields`, `.f`, `.redact` styles.
- Note: score ring for 94 → `stroke-dashoffset` = `94.2 * (1 - 94/100)` = `5.65`.

- [ ] **Step 1: Add the inbox + opportunity-card markup to `public/landing.html`**

Inside `.flow-stack`, immediately after the Task 4 `.flow-step` (Search) closing `</div>`, insert:

```html
    <div class="flow-step" data-reveal>
      <span class="flow-tag">02 &middot; Ranked opportunities</span>
      <div class="app-window flow-window">
        <div class="win-head">
          <span class="win-dots"><i></i><i></i><i></i></span>
          <span class="win-title">Opportunity inbox</span>
          <span class="win-count"><b>128</b> RANKED</span>
        </div>
        <div class="opp-card">
          <div class="opp-main">
            <div class="opp-id">
              <span class="lead-name">Maya Okafor</span>
              <span class="lead-role"><i></i>Owner &middot; likely decision maker</span>
              <span class="lead-co">Brightline Dental Studio</span>
            </div>
            <div class="score">
              <svg class="ring" viewBox="0 0 36 36" width="58" height="58">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(21,20,15,0.12)" stroke-width="3.5"></circle>
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--yellow-true)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="94.2" stroke-dashoffset="5.65" transform="rotate(-90 18 18)"></circle>
              </svg>
              <b>94</b>
            </div>
          </div>
          <div class="opp-signals">
            <span class="sig-tag">Outdated website</span>
            <span class="sig-tag">No online booking</span>
            <span class="sig-tag">Low review count</span>
          </div>
          <div class="lead-fields">
            <span class="f"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>m.okafor@<span class="redact">brightline</span>-dental.com</span>
            <span class="f"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"></path></svg>(512) 555-<span class="redact">0184</span></span>
            <span class="f"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18-2.5-2.6-2.5-15.4 0-18z"></path></svg>brightlinedental.com</span>
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Add the opportunity-card styles to `public/hero-v2.css`**

Append:

```css
/* opportunity card replica */
.opp-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.opp-main { display: flex; align-items: center; gap: 16px; }
.opp-id { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.opp-id .lead-role { margin: 0; }
.score { position: relative; flex: none; width: 58px; height: 58px; margin-left: auto; display: grid; place-items: center; }
.score .ring { display: block; }
.score b {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--display);
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
}
.opp-signals { display: flex; flex-wrap: wrap; gap: 7px; }
.sig-tag {
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink);
  background: var(--yellow-soft);
  border: 1px solid rgba(21, 20, 15, 0.35);
  border-radius: 6px;
  padding: 5px 9px;
}
.opp-card .lead-fields { gap: 8px 16px; font-size: 11.5px; }
```

- [ ] **Step 3: Build**

Run: `npm.cmd run build`
Expected: no errors.

- [ ] **Step 4: Visual check**

Second window "Opportunity inbox" shows Maya Okafor, a circular yellow **score ring reading 94** (ring filled ~94%), three signal tags, and three contact fields with blurred `.redact` segments. Reveals on scroll; legible at 390px.

- [ ] **Step 5: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat(landing): opportunity card replica with score ring"
```

---

### Task 6: Outreach automation composer replica

Third replica: the email composer, mirroring `src/components/app/EmailAutomation.tsx` (default subject `Quick idea for {{company}}`, body with `{{firstName}}`/`{{company}}` tokens, AI-draft control + intent preset "Send an audit", recipient list, queued/sent status).

**Files:**
- Modify: `public/landing.html` (append a `.flow-step` inside `.flow-stack`)
- Modify: `public/hero-v2.css` (append)

**Interfaces:**
- Consumes: `data-reveal` from Task 1; `.app-window`, `.win-head` styles.

- [ ] **Step 1: Add the composer markup to `public/landing.html`**

Inside `.flow-stack`, immediately after the Task 5 `.flow-step` (Ranked opportunities) closing `</div>`, insert:

```html
    <div class="flow-step" data-reveal>
      <span class="flow-tag">03 &middot; Reach out automatically</span>
      <div class="app-window flow-window">
        <div class="win-head">
          <span class="win-dots"><i></i><i></i><i></i></span>
          <span class="win-title">Outreach automation</span>
          <span class="win-count"><b>18</b> RECIPIENTS</span>
        </div>
        <div class="compose-body">
          <div class="compose-ai">
            <span class="ai-spark">&#10022; AI draft</span>
            <span class="ai-preset ai-preset-on">Send an audit</span>
            <span class="ai-preset">Quick intro</span>
          </div>
          <div class="compose-field">
            <span class="compose-k">Subject</span>
            <span class="compose-v">Quick idea for <span class="tok">{{company}}</span></span>
          </div>
          <div class="compose-field compose-body-text">
            <span class="compose-k">Body</span>
            <span class="compose-v">
              Hi <span class="tok">{{firstName}}</span>,<br>
              I came across <span class="tok">{{company}}</span> and noticed a few public signals worth improving &mdash; happy to share a quick audit.
            </span>
          </div>
          <div class="compose-foot">
            <span class="compose-send">Send campaign <span class="btn-arrow">&rarr;</span></span>
            <span class="compose-status"><i></i>12 sent &middot; 6 queued</span>
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Add the composer styles to `public/hero-v2.css`**

Append:

```css
/* outreach composer replica */
.compose-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.compose-ai { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ai-spark {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink);
  background: var(--yellow);
  border: 1px solid rgba(21, 20, 15, 0.4);
  border-radius: 7px;
  padding: 6px 10px;
}
.ai-preset {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 6px 10px;
}
.ai-preset-on { border-color: rgba(21, 20, 15, 0.5); color: var(--ink); box-shadow: 2px 2px 0 var(--yellow-soft); }
.compose-field { border: 1px solid var(--line); border-radius: 9px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.compose-k {
  font-family: var(--mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.compose-v { font-size: 14px; line-height: 1.6; color: var(--ink); }
.compose-body-text .compose-v { color: var(--ink-soft); }
.tok {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  background: var(--yellow-soft);
  border-radius: 4px;
  padding: 1px 5px;
}
.compose-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.compose-send {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: var(--ink);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 11px 18px;
  border-radius: 10px;
  box-shadow: 0 1px 0 rgba(21, 20, 15, 0.4), 4px 4px 0 var(--yellow);
}
.compose-send .btn-arrow { font-family: var(--mono); color: var(--yellow); }
.compose-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.compose-status i { width: 7px; height: 7px; border-radius: 50%; background: var(--yellow); outline: 1px solid rgba(21, 20, 15, 0.4); flex: none; }
```

- [ ] **Step 3: Build**

Run: `npm.cmd run build`
Expected: no errors.

- [ ] **Step 4: Visual check**

Third window "Outreach automation" shows an AI-draft row with "Send an audit" preset active, a subject and body containing highlighted `{{company}}`/`{{firstName}}` tokens, a dark "Send campaign" button, and a "12 sent · 6 queued" status. Reveals on scroll; wraps cleanly at 390px.

- [ ] **Step 5: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat(landing): outreach composer replica"
```

---

### Task 7: Mid-page CTA

A CTA block right after the workflow replicas (peak conviction).

**Files:**
- Modify: `public/landing.html` (insert after the `.flow` section closes)
- Modify: `public/hero-v2.css` (append)

**Interfaces:**
- Consumes: `data-reveal` from Task 1; existing `.btn-primary` styles; the bottom-of-page CTA click handler auto-binds the new link.

- [ ] **Step 1: Add the mid-page CTA markup to `public/landing.html`**

Immediately after the closing `</section>` of `.flow` (`id="workflow"`), insert:

```html
<section class="mid-cta" data-screen-label="Mid CTA" data-reveal>
  <p class="mid-cta-line">Your first 20 opportunities are free.</p>
  <a class="btn-primary" href="https://app.globaleads22.com" target="_top">Start scanning <span class="btn-arrow">&rarr;</span></a>
</section>
```

- [ ] **Step 2: Add the mid-CTA styles to `public/hero-v2.css`**

Append:

```css
/* ---------------- mid-page CTA ---------------- */
.mid-cta {
  max-width: 1140px;
  margin: 96px auto 0;
  padding: 0 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 22px;
}
.mid-cta-line {
  font-family: var(--display);
  font-size: clamp(24px, 2.6vw, 34px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}
@media (max-width: 760px) { .mid-cta { padding: 0 24px; margin-top: 64px; } }
```

- [ ] **Step 3: Build**

Run: `npm.cmd run build`
Expected: no errors.

- [ ] **Step 4: Visual check**

After the three replicas, a centered line "Your first 20 opportunities are free." with a "Start scanning" primary button. Clicking it navigates to `app.globaleads22.com`. Reveals on scroll.

- [ ] **Step 5: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat(landing): mid-page CTA"
```

---

### Task 8: Objection cards (rework the Data & trust section)

Replace the prose `.trust-cols` inside the existing `#data` section with three scannable objection cards. Keep the `#data` id, `.sec-head`, and the outer `.trust` container.

**Files:**
- Modify: `public/landing.html` (`#data` section inner)
- Modify: `public/hero-v2.css` (append)

**Interfaces:**
- Consumes: `data-reveal` from Task 1; existing `.sec`, `.trust`, `.sec-head` styles.

- [ ] **Step 1: Replace the trust columns with objection cards in `public/landing.html`**

In the `<section class="sec" id="data" …>` block, replace the existing `<div class="trust-cols"> … </div>` with:

```html
    <div class="objection-grid" data-reveal>
      <div class="obj-card">
        <span class="obj-q">Is this spammy?</span>
        <span class="obj-a">No lists or scraping tricks. You work public business signals and own every list you export.</span>
      </div>
      <div class="obj-card">
        <span class="obj-q">Is the data real?</span>
        <span class="obj-a">It comes from public websites, business listings, and published contact pages &mdash; organized, not invented.</span>
      </div>
      <div class="obj-card">
        <span class="obj-q">Will it work for my niche?</span>
        <span class="obj-a">It already runs across dentists, gyms, law firms, roofers, salons, and more &mdash; just enter your niche and city.</span>
      </div>
    </div>
```

- [ ] **Step 2: Add the objection-card styles to `public/hero-v2.css`**

Append:

```css
/* ---------------- objection cards ---------------- */
.objection-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.obj-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 24px 22px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.obj-card:hover { transform: translateY(-3px); box-shadow: 4px 6px 0 var(--yellow-soft); }
.obj-q {
  font-family: var(--display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.obj-q::before {
  content: "";
  display: block;
  width: 28px;
  height: 3px;
  background: var(--yellow);
  margin-bottom: 12px;
}
.obj-a { font-size: 14px; line-height: 1.6; color: var(--muted); text-wrap: pretty; }
@media (max-width: 980px) { .objection-grid { grid-template-columns: 1fr; gap: 14px; } }
@media (prefers-reduced-motion: reduce) { .obj-card:hover { transform: none; } }
```

- [ ] **Step 3: Build**

Run: `npm.cmd run build`
Expected: no errors.

- [ ] **Step 4: Visual check**

The "Data & trust" section now shows three objection cards (Is this spammy? / Is the data real? / Will it work for my niche?) with yellow accent ticks; hover lifts them; stacks to one column under 980px.

- [ ] **Step 5: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat(landing): objection-handling cards"
```

---

### Task 9: Outreach step in How-it-works, copy trims, reveal pass, final verification

Adds the 4th workflow step (reach out), trims wordy copy, adds `data-reveal` to the remaining static sections, and runs full-page verification.

**Files:**
- Modify: `public/landing.html` (how-it-works steps; section headers; minor copy)
- Modify: `public/hero-v2.css` (how-it-works grid → 4 columns)

**Interfaces:**
- Consumes: `data-reveal` from Task 1.

- [ ] **Step 1: Add a 4th step to How-it-works in `public/landing.html`**

In `<section class="sec" id="how-it-works" …>`, change the `.steps` block to include a fourth step (keep the existing three, append the fourth):

```html
  <div class="steps">
    <div class="step">
      <span class="step-num">01</span>
      <h3>Define the market</h3>
      <p>Tell GlobaLeads22 what you sell and where to look.</p>
    </div>
    <div class="step">
      <span class="step-num">02</span>
      <h3>Find the opening</h3>
      <p>Spot businesses showing public signs they may need you.</p>
    </div>
    <div class="step">
      <span class="step-num">03</span>
      <h3>Start with context</h3>
      <p>Reach the best-fit people first, with company context attached.</p>
    </div>
    <div class="step">
      <span class="step-num">04</span>
      <h3>Reach out automatically</h3>
      <p>Send personalized outreach to the strongest prospects in a few clicks.</p>
    </div>
  </div>
```

- [ ] **Step 2: Make the steps grid 4-up in `public/hero-v2.css`**

Replace the existing `.steps` rule's `grid-template-columns: repeat(3, 1fr);` with `repeat(4, 1fr);`:

```css
.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  border-top: 1px solid var(--line);
}
```

And in the `@media (max-width: 980px)` block, the existing `.steps { grid-template-columns: 1fr; … }` already collapses to one column — leave it. Add a mid-width rule right after the 980px block:

```css
@media (max-width: 1100px) and (min-width: 981px) {
  .steps { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 3: Add reveals + trim copy on remaining sections in `public/landing.html`**

Add the `data-reveal` attribute to the `.sec-head` of `#how-it-works`, the lead-anatomy section, and the who-it's-for section, and to the `.steps`, `.anatomy-wrap`, and `.who-grid` containers. Trim the hero subhead and the who-it's-for paragraphs to shorter lines:

- Hero `.subhead` → `Search a niche and city. GlobaLeads22 finds the businesses showing a real reason to buy, ranks them, and gives you 20 free.`
- `.who-item` paragraphs → one short line each (≤ 12 words). Example replacements:
  - Agencies: `Match accounts to your offer instead of blasting local lists.`
  - Freelancers: `Turn a service, niche, and city into likely buyers.`
  - Sales teams: `Build territory around visible opportunities, not cold volume.`
  - Founders: `Find early customers already close to the pain you solve.`

Example reveal wiring (apply the attribute, keep existing classes/content):

```html
  <header class="sec-head" data-reveal>
    <span class="sec-kicker">How it works</span>
    <h2 class="sec-title">Do not play the numbers game. Work the right accounts.</h2>
  </header>
```

```html
  <div class="steps" data-reveal>
```

```html
  <div class="anatomy-wrap" data-reveal>
```

```html
  <div class="who-grid" data-reveal>
```

- [ ] **Step 4: Build**

Run: `npm.cmd run build`
Expected: no errors.

- [ ] **Step 5: Full-page visual + responsive + motion verification**

At `http://localhost:5173/landing.html`:
- Desktop (~1280px): hero proof counts up; stat band counts up; industry pills scroll; three workflow replicas render and reveal in order (search → opportunity card w/ 94 ring → composer); mid CTA present; how-it-works shows 4 steps; objection cards present; every section fades/rises in on scroll exactly once.
- Mobile (~390px): all sections stack and stay legible; replicas readable; no horizontal scroll.
- Reduced motion (OS setting or `html.no-motion`): all numbers show final values immediately, marquee static and wrapped, sections visible with no fade/transform.
- Click the hero, mid, and final CTAs → each navigates to `https://app.globaleads22.com`.

- [ ] **Step 6: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat(landing): outreach step, copy trims, full reveal pass"
```

---

## Notes for the implementer

- Insertion points are described by neighboring markers (e.g. "immediately before `<section class="sec" id="how-it-works">`") rather than line numbers, because line numbers shift as earlier tasks add markup. Search for the marker.
- Do not touch the existing `.stage`/`#grid-svg` hero animation or the `.powered` vendor marquee.
- Keep the existing reduced-motion blocks intact; new animations add their own guards as shown.
- If `npm.cmd run dev` is already running, Vite hot-reloads `public/` changes on refresh.
