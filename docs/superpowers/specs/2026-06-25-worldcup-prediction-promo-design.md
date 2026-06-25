# World Cup prediction promo — design

Date: 2026-06-25

## Goal

Drive **sign-ups** and **social-media engagement** during the live 2026 World Cup
with a recurring prediction game: logged-in users predict the **exact final score**
of one featured match; anyone who nails it wins a **free month**, delivered as a
unique 100%-off Stripe promo code emailed to them. Every prediction also produces
a **shareable branded card** that points new people back to sign up and play.

The promo is purely promotional — no money wagered, no odds, no betting.

## Success criteria

- A logged-in user can predict the exact score of the featured match before kickoff.
- Predictions lock at kickoff; nobody can submit or change a guess after.
- After full-time the system auto-resolves the result, finds exact-score winners,
  and rewards each one automatically (code or credits — see Rewards) with no manual step.
- Each prediction yields a downloadable/shareable card.
- The feature cycles automatically to the next upcoming match.

## User flow

1. A landing-page teaser ("Predict tonight's match, win a free month") routes cold
   traffic to **sign up**, then into the app.
2. In the app, a dedicated **`/predictions`** page shows **one featured match** —
   teams, flags, kickoff countdown — sourced from a football API.
3. The user submits an **exact-score prediction** (home goals, away goals). One
   prediction per user per match; locked once submitted and locked for everyone at
   kickoff.
4. Immediately after submitting, the user gets a **shareable branded card**
   ("I predict 2–1 — make yours at GlobaLeads22") to download / post to stories.
5. After full-time, the system pulls the final score, flags exact-score winners,
   and **rewards each winner automatically** (see Rewards), then emails them.
6. The page cycles to the next upcoming match.

## Architecture (fits the existing stack)

React (Vite) SPA + Supabase (Postgres + edge functions) + Stripe + Resend + PostHog.

### Data model — new tables

`worldcup_matches`
- `id` (pk)
- `external_id` (match id from the football API, unique)
- `home_team`, `away_team` (text)
- `home_flag`, `away_flag` (text — flag emoji or code/url)
- `kickoff_at` (timestamptz)
- `status` (`upcoming` | `locked` | `finished`)
- `home_score`, `away_score` (int, null until finished)
- `is_featured` (bool — exactly one true at a time)
- timestamps

`worldcup_predictions`
- `id` (pk)
- `user_id` (fk → auth user)
- `match_id` (fk → `worldcup_matches`)
- `pred_home`, `pred_away` (int)
- `is_winner` (bool, default false)
- `promo_code` (text, null unless code issued)
- `rewarded_at`, `email_sent_at` (timestamptz, null until done)
- `created_at`
- **unique (user_id, match_id)** — one prediction per user per match.

RLS:
- Authenticated users may `insert` only their own row, and only while the target
  match is `upcoming` (kickoff in the future). No `update`/`delete` by users
  (predictions are final once made).
- Users may `select` their own predictions. Match rows are world-readable
  (needed to render the featured match).
- Reward/winner fields are written only by the service role (the tick function).

### Football API

Primary: **football-data.org** (free tier covers the World Cup; gives fixtures,
kickoff times, status, and final scores — enough for this feature). Alternative if
richer/live data is wanted later: **API-Football (api-sports.io)**.

- New function secret: `FOOTBALL_API_KEY`.
- Only the next upcoming World Cup fixture and finished-match results are needed;
  request volume is tiny (well within free tiers).

### Scheduled edge function — `worldcup-tick`

One Supabase edge function, invoked on a schedule (every few minutes) via
`pg_cron` + `pg_net`. Idempotent. Three responsibilities each run:

1. **Sync** — fetch the next upcoming World Cup fixture from the API; upsert it
   into `worldcup_matches`; ensure exactly one row has `is_featured = true` (the
   soonest upcoming, or the in-progress/just-finished one until it resolves).
2. **Lock** — set `status = locked` for the featured match once `kickoff_at` has
   passed (RLS + this flag both block late predictions).
3. **Resolve** — for a featured match the API reports as finished: store the final
   score, set `status = finished`, find predictions where
   `pred_home = home_score AND pred_away = away_score`, mark `is_winner = true`,
   and reward each winner (idempotent — skip rows already `rewarded_at`). Then
   un-feature it so the next Sync promotes the next fixture.

### Prediction submission

Authenticated insert into `worldcup_predictions` (direct Supabase insert guarded by
RLS, or a thin edge function if server-side validation is preferred). Server/RLS
enforces: match is `upcoming`, kickoff in the future, no existing prediction for
this (user, match).

## Rewards

A winner = predicted the exact final scoreline. Exact scores are rare, so the
free-month giveaway is naturally capped without artificial limits.

There are no active paying subscribers, so every winner gets the same reward — no
branching:

- Generate a **unique Stripe promotion code** off a single reusable **Coupon**
  (`100% off`, `duration: once`), store it on the prediction row, and **email it**
  to the user via Resend (reusing the `send-email-campaign` sender setup:
  `RESEND_API_KEY`, `OUTREACH_FROM_EMAIL`). They redeem it at checkout — which is
  exactly the sign-up→paid conversion we want.

The single Stripe Coupon is created once (setup step / one-off script or manual in
Stripe). Per-winner uniqueness comes from generating one promotion code per winner.

All reward writes are **idempotent**: keyed on the prediction row, guarded by
`rewarded_at` so re-running the tick never double-issues a code or double-credits.

## Shareable prediction card

Rendered **client-side** from the user's prediction (HTML/canvas → downloadable
PNG; e.g. an offscreen branded card drawn to canvas, or an existing html-to-image
approach). Brand-styled to match the app (dark + neon accent). Shows the two teams,
the predicted scoreline, and a "make yours at GlobaLeads22" call-to-action. No
backend required. Respect `prefers-reduced-motion` for any animation on the page.

## Landing page teaser

A small section/CTA on `public/landing.html` ("Predict tonight's match — win a free
month") linking into the app sign-up, consistent with the existing landing styling
and the existing `landing_cta_click` PostHog capture. Keeps the promo discoverable
to cold Instagram traffic.

## Analytics

PostHog events for the funnel: prediction submitted, card shared/downloaded, winner
rewarded (code vs credits), code redeemed (if observable via Stripe). Reuse existing
PostHog wiring.

## Edge cases & rules

- **Late entry:** predictions blocked once `kickoff_at` passes (RLS + `locked`).
- **Duplicate prediction:** prevented by the unique (user_id, match_id) constraint.
- **Match postponed / rescheduled:** Sync re-reads kickoff from the API each run and
  updates `kickoff_at`; a not-yet-started match stays `upcoming`.
- **Abandoned/void match:** if the API never reports a final score, the match never
  resolves and issues no rewards; it can be un-featured manually if needed.
- **Resolve idempotency:** `rewarded_at` guards prevent double rewards across ticks.
- **No winners:** common and fine — resolve simply issues nothing and moves on.

## Out of scope (v1)

- **Sales-boost mechanic** (consolation discount for non-winners / always-on World
  Cup offer). Deferred, but the resolve+email flow is structured so a consolation
  code or offer can plug into the non-winner path later without rework.
- Live score ticker, multiple simultaneous predictable matches, leaderboard, public
  winners feed.
- Subscriber-specific rewards (there are no active subscribers; a single code path
  serves everyone).
- Any betting/odds/money mechanics.

## Verification

- `npm.cmd run build` succeeds.
- A logged-in user can submit one exact-score prediction on `/predictions`; a second
  attempt is rejected; submission after kickoff is rejected.
- Simulated finished match: an exact-score prediction yields a unique Stripe promo
  code + email; re-running the tick issues nothing new (idempotent).
- The shareable card renders and downloads with correct teams + predicted score.
- Featured match cycles to the next upcoming fixture after resolution.
- Landing teaser routes to sign-up and fires `landing_cta_click`.
