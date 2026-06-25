# World Cup Prediction Promo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an in-app World Cup prediction promo where logged-in users predict one featured match's exact score, and exact-score winners automatically receive a unique 100%-off Stripe promo code by email.

**Architecture:** New Supabase tables (`worldcup_matches`, `worldcup_predictions`) hold the featured match and user predictions. A scheduled edge function (`worldcup-tick`) syncs the next World Cup fixture from football-data.org, locks predictions at kickoff, and on full-time resolves exact-score winners — generating one unique Stripe promotion code per winner and emailing it via Resend. A new in-app `predictions` view lets users submit one guess per match and download a shareable branded card. A landing-page teaser routes cold traffic to sign up.

**Tech Stack:** React 18 + Vite + react-router-dom, TypeScript, Supabase (Postgres + Deno edge functions), Stripe (REST), Resend (REST), football-data.org API, vitest for unit tests, Tailwind for UI.

## Global Constraints

- Run all commands from `web-lead-scoop-main/`. Use `npm.cmd` / `npx.cmd` (Windows).
- Verify with `npm.cmd run build` before each commit; run `npm.cmd run test` for tasks that add tests.
- App/landing domain split must not break: `app.globaleads22.com` always renders `AppPage`; `/` serves `public/landing.html`.
- Public-facing copy must avoid: scraper, scraping, harvesting, guaranteed, spam. Promo is purely promotional — no betting/odds/money language.
- App accent color is `#e8fb52`; landing accent is `#F2E500`. App background `#08090c`, text `#f3f5f8`. Match existing dark styling.
- Edge functions follow the existing pattern: `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`, CORS headers, `Deno.serve(handler)`, validate `Authorization` bearer token via `supabase.auth.getUser(token)` for user-invoked calls.
- All reward writes must be idempotent (guarded so re-running never double-issues a code).
- Respect `prefers-reduced-motion` for any animation.
- New Supabase secrets required: `FOOTBALL_API_KEY`, `STRIPE_WC_COUPON_ID`. Existing reused: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `OUTREACH_FROM_EMAIL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## File structure

**Create:**
- `supabase/migrations/20260625120000_add_worldcup_promo.sql` — tables, RLS, indexes, grants.
- `src/lib/worldcupScoring.ts` — pure winner-detection logic (shared by UI + tested).
- `src/lib/worldcupScoring.test.ts` — unit tests.
- `supabase/functions/_shared/footballApi.ts` — pure parsers for football-data.org responses + thin fetch wrappers.
- `src/lib/footballApi.test.ts` — unit tests for the parsers (imported from `_shared`).
- `supabase/functions/_shared/promoCode.ts` — pure promo-code-string builder.
- `src/lib/promoCode.test.ts` — unit tests for the builder.
- `supabase/functions/worldcup-tick/index.ts` — sync/lock/resolve orchestration.
- `src/hooks/useFeaturedMatch.ts` — load featured match + the user's prediction.
- `src/components/app/WorldCupPredictions.tsx` — the `/predictions` view UI.
- `src/lib/predictionCard.ts` — client-side canvas render of the shareable card.
- `supabase/migrations/20260625130000_schedule_worldcup_tick.sql` — pg_cron schedule.

**Modify:**
- `src/components/app/AppSidebar.tsx` — add a `predictions` nav entry + view type.
- `src/pages/AppPage.tsx` — render the new view; honor a `?view=predictions` deep link.
- `public/landing.html` — add the promo teaser section/CTA.

---

### Task 1: Database migration — promo tables, RLS, indexes

**Files:**
- Create: `supabase/migrations/20260625120000_add_worldcup_promo.sql`

**Interfaces:**
- Produces tables `public.worldcup_matches` and `public.worldcup_predictions` with the columns referenced by every later task. Key columns:
  - `worldcup_matches`: `id uuid pk`, `external_id text unique`, `home_team text`, `away_team text`, `home_flag text`, `away_flag text`, `kickoff_at timestamptz`, `status text` (`upcoming|locked|finished`), `home_score int`, `away_score int`, `is_featured boolean`.
  - `worldcup_predictions`: `id uuid pk`, `user_id uuid`, `match_id uuid`, `pred_home int`, `pred_away int`, `is_winner boolean`, `promo_code text`, `rewarded_at timestamptz`, `email_sent_at timestamptz`, `created_at timestamptz`, unique `(user_id, match_id)`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260625120000_add_worldcup_promo.sql`:

```sql
create table if not exists public.worldcup_matches (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  kickoff_at timestamptz not null,
  status text not null default 'upcoming',
  home_score int,
  away_score int,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worldcup_matches_status_check check (status in ('upcoming', 'locked', 'finished'))
);

create table if not exists public.worldcup_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.worldcup_matches(id) on delete cascade,
  pred_home int not null,
  pred_away int not null,
  is_winner boolean not null default false,
  promo_code text,
  rewarded_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint worldcup_predictions_unique_user_match unique (user_id, match_id),
  constraint worldcup_predictions_score_nonneg check (pred_home >= 0 and pred_away >= 0)
);

-- Only one featured match at a time.
create unique index if not exists idx_worldcup_one_featured
  on public.worldcup_matches((is_featured))
  where is_featured = true;

create index if not exists idx_worldcup_predictions_match
  on public.worldcup_predictions(match_id);

grant select on public.worldcup_matches to authenticated, anon;
grant select, insert on public.worldcup_predictions to authenticated;
grant select, insert, update, delete on public.worldcup_matches to service_role;
grant select, insert, update, delete on public.worldcup_predictions to service_role;

alter table public.worldcup_matches enable row level security;
alter table public.worldcup_predictions enable row level security;

-- Matches are world-readable (needed to render the featured match, including on the public teaser).
drop policy if exists "Anyone can read worldcup matches" on public.worldcup_matches;
create policy "Anyone can read worldcup matches"
  on public.worldcup_matches for select
  to authenticated, anon
  using (true);

-- Users can read only their own predictions.
drop policy if exists "Users can read own predictions" on public.worldcup_predictions;
create policy "Users can read own predictions"
  on public.worldcup_predictions for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own prediction only while the match is still 'upcoming'
-- and kickoff is in the future. No update/delete (predictions are final).
drop policy if exists "Users can insert own prediction before lock" on public.worldcup_predictions;
create policy "Users can insert own prediction before lock"
  on public.worldcup_predictions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.worldcup_matches m
      where m.id = match_id
        and m.status = 'upcoming'
        and m.kickoff_at > now()
    )
  );
```

- [ ] **Step 2: Apply the migration locally and verify the schema**

Run:
```bash
npx.cmd supabase db push
```
Expected: migration applies without error. If a local Supabase stack is not running, instead verify the SQL is syntactically valid by reviewing it; the migration will be applied at deploy time.

Verify the tables exist (if local DB available):
```bash
npx.cmd supabase db execute "select count(*) from public.worldcup_matches; select count(*) from public.worldcup_predictions;"
```
Expected: both return `0` without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260625120000_add_worldcup_promo.sql
git commit -m "feat: add worldcup promo tables, RLS, and indexes"
```

---

### Task 2: Pure winner-detection logic

**Files:**
- Create: `src/lib/worldcupScoring.ts`
- Test: `src/lib/worldcupScoring.test.ts`

**Interfaces:**
- Produces:
  - `interface ExactScore { home: number; away: number }`
  - `isExactScoreWinner(prediction: ExactScore, result: ExactScore): boolean` — true only when both numbers match exactly.
  - `formatScore(score: ExactScore): string` — `"2–1"` (en dash), used by the UI and card.

- [ ] **Step 1: Write the failing test**

Create `src/lib/worldcupScoring.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isExactScoreWinner, formatScore } from "./worldcupScoring";

describe("isExactScoreWinner", () => {
  it("is true when both scores match exactly", () => {
    expect(isExactScoreWinner({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(true);
  });

  it("is false when only one side matches", () => {
    expect(isExactScoreWinner({ home: 2, away: 1 }, { home: 2, away: 0 })).toBe(false);
    expect(isExactScoreWinner({ home: 2, away: 1 }, { home: 1, away: 1 })).toBe(false);
  });

  it("is false when the scoreline is reversed", () => {
    expect(isExactScoreWinner({ home: 2, away: 1 }, { home: 1, away: 2 })).toBe(false);
  });

  it("handles a 0-0 draw", () => {
    expect(isExactScoreWinner({ home: 0, away: 0 }, { home: 0, away: 0 })).toBe(true);
  });
});

describe("formatScore", () => {
  it("formats with an en dash", () => {
    expect(formatScore({ home: 2, away: 1 })).toBe("2–1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/lib/worldcupScoring.test.ts`
Expected: FAIL — cannot resolve `./worldcupScoring`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/worldcupScoring.ts`:

```typescript
export interface ExactScore {
  home: number;
  away: number;
}

export function isExactScoreWinner(prediction: ExactScore, result: ExactScore): boolean {
  return prediction.home === result.home && prediction.away === result.away;
}

export function formatScore(score: ExactScore): string {
  return `${score.home}–${score.away}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/lib/worldcupScoring.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/worldcupScoring.ts src/lib/worldcupScoring.test.ts
git commit -m "feat: add exact-score winner detection logic"
```

---

### Task 3: Football API parsers (football-data.org)

**Files:**
- Create: `supabase/functions/_shared/footballApi.ts`
- Test: `src/lib/footballApi.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface ParsedMatch { externalId: string; homeTeam: string; awayTeam: string; kickoffAt: string; isFinished: boolean; homeScore: number | null; awayScore: number | null }`
  - `parseMatch(raw: any): ParsedMatch` — maps one football-data.org match object.
  - `pickNextUpcoming(matches: any[], nowIso: string): ParsedMatch | null` — earliest match whose kickoff is in the future and not finished.
  - `fetchWorldCupMatches(apiKey: string): Promise<any[]>` — thin GET to `https://api.football-data.org/v4/competitions/WC/matches`, returns the `matches` array (used by the edge function; not unit-tested).

football-data.org match shape (relevant fields): `{ id, utcDate, status, homeTeam: { name }, awayTeam: { name }, score: { fullTime: { home, away } } }`. `status` is one of `SCHEDULED|TIMED|IN_PLAY|PAUSED|FINISHED|SUSPENDED|POSTPONED|CANCELLED`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/footballApi.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseMatch, pickNextUpcoming } from "../../supabase/functions/_shared/footballApi";

const finished = {
  id: 537001,
  utcDate: "2026-06-20T19:00:00Z",
  status: "FINISHED",
  homeTeam: { name: "Brazil" },
  awayTeam: { name: "Argentina" },
  score: { fullTime: { home: 2, away: 1 } },
};

const upcoming = {
  id: 537002,
  utcDate: "2026-06-28T19:00:00Z",
  status: "TIMED",
  homeTeam: { name: "France" },
  awayTeam: { name: "Spain" },
  score: { fullTime: { home: null, away: null } },
};

describe("parseMatch", () => {
  it("maps a finished match with scores", () => {
    const m = parseMatch(finished);
    expect(m).toEqual({
      externalId: "537001",
      homeTeam: "Brazil",
      awayTeam: "Argentina",
      kickoffAt: "2026-06-20T19:00:00Z",
      isFinished: true,
      homeScore: 2,
      awayScore: 1,
    });
  });

  it("maps an upcoming match with null scores", () => {
    const m = parseMatch(upcoming);
    expect(m.isFinished).toBe(false);
    expect(m.homeScore).toBeNull();
    expect(m.externalId).toBe("537002");
  });
});

describe("pickNextUpcoming", () => {
  it("returns the earliest future, non-finished match", () => {
    const later = { ...upcoming, id: 537003, utcDate: "2026-07-02T19:00:00Z" };
    const picked = pickNextUpcoming([finished, later, upcoming], "2026-06-25T00:00:00Z");
    expect(picked?.externalId).toBe("537002");
  });

  it("returns null when nothing is upcoming", () => {
    expect(pickNextUpcoming([finished], "2026-06-25T00:00:00Z")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/lib/footballApi.test.ts`
Expected: FAIL — cannot resolve the `_shared/footballApi` module.

- [ ] **Step 3: Write minimal implementation**

Create `supabase/functions/_shared/footballApi.ts`:

```typescript
// Pure, dependency-free parsers for football-data.org responses.
// Imported and unit-tested from src/ (no Deno globals at module top level).

export interface ParsedMatch {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  isFinished: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

export function parseMatch(raw: any): ParsedMatch {
  const full = raw?.score?.fullTime ?? {};
  return {
    externalId: String(raw.id),
    homeTeam: raw?.homeTeam?.name ?? "",
    awayTeam: raw?.awayTeam?.name ?? "",
    kickoffAt: raw.utcDate,
    isFinished: raw.status === "FINISHED",
    homeScore: typeof full.home === "number" ? full.home : null,
    awayScore: typeof full.away === "number" ? full.away : null,
  };
}

const DEAD_STATUSES = new Set(["FINISHED", "POSTPONED", "CANCELLED", "SUSPENDED"]);

export function pickNextUpcoming(matches: any[], nowIso: string): ParsedMatch | null {
  const now = Date.parse(nowIso);
  const upcoming = matches
    .filter((m) => !DEAD_STATUSES.has(m.status) && Date.parse(m.utcDate) > now)
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
  return upcoming.length ? parseMatch(upcoming[0]) : null;
}

// Thin fetch wrapper (used by the edge function; not unit-tested).
export async function fetchWorldCupMatches(apiKey: string): Promise<any[]> {
  const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": apiKey },
  });
  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.matches) ? data.matches : [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/lib/footballApi.test.ts`
Expected: PASS (4 assertions).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/footballApi.ts src/lib/footballApi.test.ts
git commit -m "feat: add football-data.org match parsers"
```

---

### Task 4: Promo-code-string builder

**Files:**
- Create: `supabase/functions/_shared/promoCode.ts`
- Test: `src/lib/promoCode.test.ts`

**Interfaces:**
- Produces:
  - `buildPromoCode(seed?: string): string` — returns an uppercase, human-typable code like `WC-7F3K9Q2P`. Prefix `WC-` then 8 chars from an unambiguous alphabet (no `0/O/1/I`). When `seed` is supplied, output is deterministic (for tests); otherwise it uses random bytes.

- [ ] **Step 1: Write the failing test**

Create `src/lib/promoCode.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildPromoCode } from "../../supabase/functions/_shared/promoCode";

describe("buildPromoCode", () => {
  it("starts with the WC- prefix and is 11 chars total", () => {
    const code = buildPromoCode("abcdefghij");
    expect(code.startsWith("WC-")).toBe(true);
    expect(code.length).toBe(11);
  });

  it("is deterministic for a given seed", () => {
    expect(buildPromoCode("abcdefghij")).toBe(buildPromoCode("abcdefghij"));
  });

  it("only uses unambiguous uppercase characters", () => {
    const code = buildPromoCode("zzzzzzzzzz").slice(3);
    expect(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(code)).toBe(true);
  });

  it("produces different codes without a seed", () => {
    expect(buildPromoCode()).not.toBe(buildPromoCode());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/lib/promoCode.test.ts`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Write minimal implementation**

Create `supabase/functions/_shared/promoCode.ts`:

```typescript
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CODE_LEN = 8;

export function buildPromoCode(seed?: string): string {
  let body = "";
  if (seed) {
    // Deterministic mapping from the seed string (used in tests).
    for (let i = 0; i < CODE_LEN; i++) {
      const c = seed.charCodeAt(i % seed.length) + i;
      body += ALPHABET[c % ALPHABET.length];
    }
  } else {
    const bytes = new Uint8Array(CODE_LEN);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < CODE_LEN; i++) {
      body += ALPHABET[bytes[i] % ALPHABET.length];
    }
  }
  return `WC-${body}`;
}
```

(Note: `crypto.getRandomValues` exists in both Deno and the vitest jsdom/node environment.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- src/lib/promoCode.test.ts`
Expected: PASS (4 assertions).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/promoCode.ts src/lib/promoCode.test.ts
git commit -m "feat: add unique promo-code string builder"
```

---

### Task 5: `worldcup-tick` edge function (sync / lock / resolve)

**Files:**
- Create: `supabase/functions/worldcup-tick/index.ts`

**Interfaces:**
- Consumes: `parseMatch`, `pickNextUpcoming`, `fetchWorldCupMatches` from `_shared/footballApi.ts`; `isExactScoreWinner` from `src/lib/worldcupScoring.ts` (re-implemented inline below to avoid cross-importing `src/` into a Deno function — keep the one-line equality); `buildPromoCode` from `_shared/promoCode.ts`.
- Produces: an HTTP function that, on each invocation, runs sync → lock → resolve and returns a JSON summary `{ synced, locked, resolved, winners, codesIssued }`. Protected by a shared secret (`X-Tick-Secret` header matching `WORLDCUP_TICK_SECRET`) so only the scheduler can call it.

- [ ] **Step 1: Write the function**

Create `supabase/functions/worldcup-tick/index.ts`:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWorldCupMatches, pickNextUpcoming, parseMatch } from "../_shared/footballApi.ts";
import { buildPromoCode } from "../_shared/promoCode.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const footballApiKey = Deno.env.get("FOOTBALL_API_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWcCouponId = Deno.env.get("STRIPE_WC_COUPON_ID");
const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const fromEmail = Deno.env.get("OUTREACH_FROM_EMAIL")?.trim() || "contact@globaleads22.com";
const tickSecret = Deno.env.get("WORLDCUP_TICK_SECRET");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, x-tick-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function createStripePromotionCode(code: string): Promise<boolean> {
  if (!stripeSecretKey || !stripeWcCouponId) return false;
  const res = await fetch("https://api.stripe.com/v1/promotion_codes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ coupon: stripeWcCouponId, code, "max_redemptions": "1" }).toString(),
  });
  return res.ok;
}

async function emailWinner(to: string, code: string, home: string, away: string): Promise<boolean> {
  if (!resendApiKey) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `GlobaLeads22 <${fromEmail}>`,
      to: [to],
      subject: "You nailed the score — here's your free month ⚽",
      text: `You predicted ${home} vs ${away} exactly right!\n\nUse this code at checkout for your first month free:\n\n${code}\n\nRedeem at https://app.globaleads22.com\n\n— GlobaLeads22`,
    }),
  });
  return res.ok;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (tickSecret && req.headers.get("x-tick-secret") !== tickSecret) {
    return json({ error: "Forbidden" }, 403);
  }
  if (!footballApiKey) return json({ error: "FOOTBALL_API_KEY not configured" }, 500);

  const summary = { synced: false, locked: false, resolved: false, winners: 0, codesIssued: 0 };

  try {
    const matches = await fetchWorldCupMatches(footballApiKey);
    const nowIso = new Date().toISOString();

    // ---- 1. Resolve: any featured match the API reports finished ----
    const { data: featured } = await supabase
      .from("worldcup_matches")
      .select("*")
      .eq("is_featured", true)
      .maybeSingle();

    if (featured) {
      const apiMatch = matches.find((m) => String(m.id) === featured.external_id);
      const parsed = apiMatch ? parseMatch(apiMatch) : null;

      // Lock once kickoff passes.
      if (featured.status === "upcoming" && Date.parse(featured.kickoff_at) <= Date.now()) {
        await supabase.from("worldcup_matches").update({ status: "locked", updated_at: nowIso }).eq("id", featured.id);
        summary.locked = true;
      }

      if (parsed?.isFinished && parsed.homeScore !== null && parsed.awayScore !== null) {
        await supabase
          .from("worldcup_matches")
          .update({ status: "finished", home_score: parsed.homeScore, away_score: parsed.awayScore, is_featured: false, updated_at: nowIso })
          .eq("id", featured.id);
        summary.resolved = true;

        // Find exact-score predictions not yet rewarded.
        const { data: winners } = await supabase
          .from("worldcup_predictions")
          .select("id, user_id")
          .eq("match_id", featured.id)
          .eq("pred_home", parsed.homeScore)
          .eq("pred_away", parsed.awayScore)
          .is("rewarded_at", null);

        for (const w of winners ?? []) {
          summary.winners += 1;
          const code = buildPromoCode();
          const created = await createStripePromotionCode(code);
          // Look up the winner's email from auth.
          const { data: authUser } = await supabase.auth.admin.getUserById(w.user_id);
          const email = authUser?.user?.email;
          let emailed = false;
          if (created && email) emailed = await emailWinner(email, code, featured.home_team, featured.away_team);
          await supabase
            .from("worldcup_predictions")
            .update({
              is_winner: true,
              promo_code: created ? code : null,
              rewarded_at: created ? nowIso : null,
              email_sent_at: emailed ? nowIso : null,
            })
            .eq("id", w.id);
          if (created) summary.codesIssued += 1;
        }
      }
    }

    // ---- 2. Sync: ensure a featured upcoming match exists ----
    const { data: stillFeatured } = await supabase
      .from("worldcup_matches")
      .select("id")
      .eq("is_featured", true)
      .maybeSingle();

    if (!stillFeatured) {
      const next = pickNextUpcoming(matches, nowIso);
      if (next) {
        // Upsert by external_id, then feature it.
        await supabase.from("worldcup_matches").upsert(
          {
            external_id: next.externalId,
            home_team: next.homeTeam,
            away_team: next.awayTeam,
            kickoff_at: next.kickoffAt,
            status: "upcoming",
            is_featured: true,
            updated_at: nowIso,
          },
          { onConflict: "external_id" },
        );
        summary.synced = true;
      }
    }

    return json(summary);
  } catch (error) {
    console.error("worldcup-tick error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal error", summary }, 500);
  }
};

Deno.serve(handler);
```

- [ ] **Step 2: Type-check / lint the function**

Run: `npm.cmd run lint`
Expected: no new errors for `supabase/functions/worldcup-tick/index.ts` (Deno remote imports may be flagged as in other functions — match the existing baseline; do not introduce new lint errors).

- [ ] **Step 3: Deploy and manually verify (integration)**

Set secrets, then deploy:
```bash
npx.cmd supabase secrets set FOOTBALL_API_KEY=... STRIPE_WC_COUPON_ID=... WORLDCUP_TICK_SECRET=...
npx.cmd supabase functions deploy worldcup-tick
```
Invoke once and confirm a featured match appears:
```bash
curl -X POST "https://<project-ref>.functions.supabase.co/worldcup-tick" -H "x-tick-secret: <secret>"
```
Expected: JSON like `{ "synced": true, "locked": false, "resolved": false, "winners": 0, "codesIssued": 0 }`, and `select home_team, away_team, status, is_featured from worldcup_matches where is_featured;` returns the next fixture.

- [ ] **Step 4: Verify resolve idempotency (integration)**

With a featured match manually set to a finished external match (or after a real match finishes), invoke the tick twice. Expected: first call sets `winners`/`codesIssued` > 0 (if any exact-score predictions exist); second call returns `winners: 0` because rewarded rows are filtered by `rewarded_at is null`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/worldcup-tick/index.ts
git commit -m "feat: add worldcup-tick sync/lock/resolve edge function"
```

---

### Task 6: Featured-match hook (load match + user prediction, submit)

**Files:**
- Create: `src/hooks/useFeaturedMatch.ts`

**Interfaces:**
- Consumes: `supabase` client from `@/integrations/supabase/client`.
- Produces:
  - `interface FeaturedMatch { id: string; homeTeam: string; awayTeam: string; kickoffAt: string; status: "upcoming" | "locked" | "finished"; homeScore: number | null; awayScore: number | null }`
  - `interface MyPrediction { predHome: number; predAway: number; isWinner: boolean }`
  - `useFeaturedMatch(userId?: string)` returns `{ match: FeaturedMatch | null; myPrediction: MyPrediction | null; loading: boolean; submit: (home: number, away: number) => Promise<{ ok: boolean; error?: string }>; refetch: () => Promise<void> }`.

- [ ] **Step 1: Write the hook**

Create `src/hooks/useFeaturedMatch.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: "upcoming" | "locked" | "finished";
  homeScore: number | null;
  awayScore: number | null;
}

export interface MyPrediction {
  predHome: number;
  predAway: number;
  isWinner: boolean;
}

export function useFeaturedMatch(userId?: string) {
  const [match, setMatch] = useState<FeaturedMatch | null>(null);
  const [myPrediction, setMyPrediction] = useState<MyPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: m } = await supabase
      .from("worldcup_matches")
      .select("id, home_team, away_team, kickoff_at, status, home_score, away_score")
      .eq("is_featured", true)
      .maybeSingle();

    const nextMatch: FeaturedMatch | null = m
      ? {
          id: m.id,
          homeTeam: m.home_team,
          awayTeam: m.away_team,
          kickoffAt: m.kickoff_at,
          status: m.status,
          homeScore: m.home_score,
          awayScore: m.away_score,
        }
      : null;
    setMatch(nextMatch);

    if (nextMatch && userId) {
      const { data: p } = await supabase
        .from("worldcup_predictions")
        .select("pred_home, pred_away, is_winner")
        .eq("user_id", userId)
        .eq("match_id", nextMatch.id)
        .maybeSingle();
      setMyPrediction(p ? { predHome: p.pred_home, predAway: p.pred_away, isWinner: p.is_winner } : null);
    } else {
      setMyPrediction(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (home: number, away: number) => {
      if (!match || !userId) return { ok: false, error: "Not ready" };
      const { error } = await supabase
        .from("worldcup_predictions")
        .insert({ user_id: userId, match_id: match.id, pred_home: home, pred_away: away });
      if (error) {
        const already = error.code === "23505";
        return { ok: false, error: already ? "You already predicted this match." : error.message };
      }
      await load();
      return { ok: true };
    },
    [match, userId, load],
  );

  return { match, myPrediction, loading, submit, refetch: load };
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm.cmd run build`
Expected: build succeeds (the hook type-checks; it is not yet imported anywhere, which is fine).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFeaturedMatch.ts
git commit -m "feat: add useFeaturedMatch hook for promo predictions"
```

---

### Task 7: Shareable prediction card (client-side canvas)

**Files:**
- Create: `src/lib/predictionCard.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `renderPredictionCard(opts: { homeTeam: string; awayTeam: string; predHome: number; predAway: number }): Promise<Blob>` — draws a 1080×1080 branded card to an offscreen canvas and resolves a PNG `Blob`.
  - `downloadBlob(blob: Blob, filename: string): void` — triggers a browser download.

- [ ] **Step 1: Write the implementation**

Create `src/lib/predictionCard.ts`:

```typescript
interface CardOpts {
  homeTeam: string;
  awayTeam: string;
  predHome: number;
  predAway: number;
}

const SIZE = 1080;
const BG = "#08090c";
const ACCENT = "#e8fb52";
const TEXT = "#f3f5f8";

export async function renderPredictionCard(opts: CardOpts): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, SIZE, 14);
  ctx.fillRect(0, SIZE - 14, SIZE, 14);

  ctx.textAlign = "center";

  ctx.fillStyle = ACCENT;
  ctx.font = "700 38px Arial";
  ctx.fillText("MY WORLD CUP PREDICTION", SIZE / 2, 200);

  ctx.fillStyle = TEXT;
  ctx.font = "800 64px Arial";
  ctx.fillText(`${opts.homeTeam}  vs  ${opts.awayTeam}`, SIZE / 2, 430);

  ctx.fillStyle = ACCENT;
  ctx.font = "900 200px Arial";
  ctx.fillText(`${opts.predHome}–${opts.predAway}`, SIZE / 2, 700);

  ctx.fillStyle = TEXT;
  ctx.font = "700 40px Arial";
  ctx.fillText("Make your pick → globaleads22.com", SIZE / 2, 920);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm.cmd run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/predictionCard.ts
git commit -m "feat: add shareable prediction card renderer"
```

---

### Task 8: Predictions view UI + sidebar entry + deep link

**Files:**
- Create: `src/components/app/WorldCupPredictions.tsx`
- Modify: `src/components/app/AppSidebar.tsx`
- Modify: `src/pages/AppPage.tsx:69` (add view to nav) and the `<main>` view switch around `src/pages/AppPage.tsx:525-585`.

**Interfaces:**
- Consumes: `useFeaturedMatch` (Task 6), `formatScore` from `@/lib/worldcupScoring` (Task 2), `renderPredictionCard` + `downloadBlob` (Task 7).
- Produces: `WorldCupPredictions` default export taking `{ userId?: string }`. Adds `"predictions"` to the `AppSidebarView` union.

- [ ] **Step 1: Add the sidebar view type and nav item**

In `src/components/app/AppSidebar.tsx`, find the `AppSidebarView` union type and add `"predictions"`. Then add a nav button alongside the existing ones (follow the existing nav-item markup in that file; use the `Trophy` icon from `lucide-react`). Concretely, add `"predictions"` to the exported union:

```typescript
// In the AppSidebarView union (add the new member):
export type AppSidebarView =
  | "home"
  | "search"
  | "lead-inbox"
  | "pipeline"
  | "follow-ups"
  | "saved-searches"
  | "settings"
  | "admin"
  | "predictions";
```

And add a nav entry in the sidebar's items list (match the existing item structure in this file — icon + label + `onNavigate("predictions")`), labelled `World Cup` with the `Trophy` icon. Place it near the top so it is prominent during the promo.

- [ ] **Step 2: Build the predictions view**

Create `src/components/app/WorldCupPredictions.tsx`:

```typescript
import { useState } from "react";
import { Trophy, Loader2, Share2 } from "lucide-react";
import { useFeaturedMatch } from "@/hooks/useFeaturedMatch";
import { formatScore } from "@/lib/worldcupScoring";
import { renderPredictionCard, downloadBlob } from "@/lib/predictionCard";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

interface Props {
  userId?: string;
}

const WorldCupPredictions = ({ userId }: Props) => {
  const { match, myPrediction, loading, submit } = useFeaturedMatch(userId);
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const kickoffPassed = match ? Date.parse(match.kickoffAt) <= Date.now() : false;
  const locked = !match || match.status !== "upcoming" || kickoffPassed;

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await submit(home, away);
    setSubmitting(false);
    if (res.ok) {
      track("worldcup_prediction_submitted", { matchId: match?.id, home, away });
      toast({ title: "Prediction locked in!", description: `You predicted ${formatScore({ home, away })}.` });
    } else {
      toast({ title: "Could not submit", description: res.error, variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!match || !myPrediction) return;
    const blob = await renderPredictionCard({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      predHome: myPrediction.predHome,
      predAway: myPrediction.predAway,
    });
    downloadBlob(blob, "my-worldcup-prediction.png");
    track("worldcup_card_shared", { matchId: match.id });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[#9aa3b2]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Trophy className="mx-auto h-10 w-10 text-[#e8fb52]" />
        <h2 className="mt-4 font-display text-2xl font-black text-[#f3f5f8]">No match to predict right now</h2>
        <p className="mt-2 text-sm text-[#9aa3b2]">Check back soon — the next featured match drops shortly.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#e8fb52]">
        <Trophy className="h-4 w-4" /> World Cup prediction — win a free month
      </div>
      <h1 className="mt-3 font-display text-3xl font-black text-[#f3f5f8]">
        {match.homeTeam} vs {match.awayTeam}
      </h1>
      <p className="mt-1 text-sm text-[#9aa3b2]">
        Kickoff {new Date(match.kickoffAt).toLocaleString()}. Predict the exact final score before kickoff.
      </p>

      {myPrediction ? (
        <div className="mt-8 border border-[#e8fb52]/30 bg-[#e8fb52]/10 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#e8fb52]">Your prediction</p>
          <p className="mt-2 font-display text-5xl font-black text-[#f3f5f8]">
            {formatScore({ home: myPrediction.predHome, away: myPrediction.predAway })}
          </p>
          {match.status === "finished" && (
            <p className="mt-3 text-sm text-[#9aa3b2]">
              Final: {formatScore({ home: match.homeScore ?? 0, away: match.awayScore ?? 0 })}.{" "}
              {myPrediction.isWinner ? "You won — check your email for your code! \u{1f3c6}" : "So close — next match awaits."}
            </p>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="mt-5 inline-flex items-center gap-2 border border-[#e8fb52] bg-[#e8fb52] px-4 py-2 font-display text-sm font-bold text-black hover:bg-[#f3ff8a]"
          >
            <Share2 className="h-4 w-4" /> Share my prediction
          </button>
        </div>
      ) : locked ? (
        <div className="mt-8 border border-[#f3f5f8]/10 bg-[#111319] p-6 text-sm text-[#9aa3b2]">
          Predictions are closed for this match. The next one opens soon.
        </div>
      ) : (
        <div className="mt-8 border border-[#f3f5f8]/10 bg-[#111319] p-6">
          <div className="flex items-center justify-center gap-6">
            <ScoreInput label={match.homeTeam} value={home} onChange={setHome} />
            <span className="font-display text-3xl font-black text-[#5d6675]">:</span>
            <ScoreInput label={match.awayTeam} value={away} onChange={setAway} />
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="mt-6 w-full border border-[#e8fb52] bg-[#e8fb52] px-4 py-3 font-display text-sm font-bold text-black hover:bg-[#f3ff8a] disabled:opacity-60"
          >
            {submitting ? "Locking in…" : "Lock in my prediction"}
          </button>
        </div>
      )}
    </div>
  );
};

const ScoreInput = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
  <div className="text-center">
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
      className="h-20 w-24 border border-[#f3f5f8]/15 bg-[#08090c] text-center font-display text-4xl font-black text-[#f3f5f8] focus:border-[#e8fb52] focus:outline-none"
    />
    <p className="mt-2 max-w-24 truncate font-mono text-[10px] uppercase tracking-widest text-[#9aa3b2]">{label}</p>
  </div>
);

export default WorldCupPredictions;
```

- [ ] **Step 3: Wire the view into AppPage**

In `src/pages/AppPage.tsx`:
1. Add the import near the other view imports (around line 30): `import WorldCupPredictions from "@/components/app/WorldCupPredictions";`
2. In the `<main>` view switch (the `viewMode === ...` chain around lines 525–585), add a branch before the final `: null`:

```tsx
) : viewMode === "predictions" ? (
  <WorldCupPredictions userId={user?.id} />
```

3. Add a deep link: in the existing `useEffect` that reads query params (around line 217), set the view when `?view=predictions` is present:

```tsx
// inside the query-param effect:
if (new URLSearchParams(window.location.search).get("view") === "predictions") {
  setViewMode("predictions");
}
```

Note: `predictions` is intentionally NOT added to `PAID_WORKSPACE_VIEWS` (line 69) — the promo must be open to free users to drive sign-ups.

- [ ] **Step 4: Verify build and manual smoke test**

Run: `npm.cmd run build`
Expected: build succeeds.

Run dev and verify: `npm.cmd run dev`, open the app, click the new **World Cup** sidebar item (or load `/?view=predictions`). Expected: the featured match renders; submitting a score shows the "locked in" card; a second submit is rejected with "You already predicted this match."; **Share my prediction** downloads a PNG.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/WorldCupPredictions.tsx src/components/app/AppSidebar.tsx src/pages/AppPage.tsx
git commit -m "feat: add in-app World Cup predictions view"
```

---

### Task 9: Landing page teaser

**Files:**
- Modify: `public/landing.html`

**Interfaces:**
- Consumes: nothing. Adds a static promo section linking cold traffic into the app sign-up at `https://app.globaleads22.com/?view=predictions`.

- [ ] **Step 1: Add the teaser section**

In `public/landing.html`, add a promo band (place it after the hero/stage section, before the final CTA). Match the landing's existing class/utility conventions and accent (`#F2E500`). Use an existing CTA anchor pattern so the existing `landing_cta_click` PostHog handler (which targets `a[href^="https://app..."]`) fires:

```html
<!-- World Cup promo teaser -->
<section class="wc-promo" id="worldcup">
  <p class="wc-promo__kicker">⚽ World Cup promo</p>
  <h2 class="wc-promo__title">Predict tonight's match. Win a free month.</h2>
  <p class="wc-promo__sub">
    Guess the exact final score before kickoff. Nail it and we email you a code for a free month of GlobaLeads22.
  </p>
  <a class="wc-promo__cta" href="https://app.globaleads22.com/?view=predictions">Make your prediction →</a>
</section>
```

Add matching styles in the page's existing `<style>`/`hero-v2.css` conventions (dark background, `#F2E500` accent CTA, centered). Keep copy free of betting/odds language.

- [ ] **Step 2: Verify build**

Run: `npm.cmd run build`
Expected: build succeeds (static asset unaffected). Visually confirm the section renders at mobile + desktop widths and the CTA links to the app.

- [ ] **Step 3: Commit**

```bash
git add public/landing.html public/hero-v2.css
git commit -m "feat: add World Cup promo teaser to landing page"
```

---

### Task 10: Schedule the tick (pg_cron) + deployment checklist

**Files:**
- Create: `supabase/migrations/20260625130000_schedule_worldcup_tick.sql`

**Interfaces:**
- Consumes: the deployed `worldcup-tick` function (Task 5) and `WORLDCUP_TICK_SECRET`.
- Produces: a pg_cron job that POSTs to the function every 5 minutes via `pg_net`.

- [ ] **Step 1: Write the scheduling migration**

Create `supabase/migrations/20260625130000_schedule_worldcup_tick.sql`. Replace `<PROJECT_REF>` and `<TICK_SECRET>` at deploy time (or store them in Vault and read from there per your platform's setup):

```sql
-- Requires the pg_cron and pg_net extensions (available on Supabase).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any prior schedule with the same name before recreating.
select cron.unschedule('worldcup-tick-every-5min')
where exists (select 1 from cron.job where jobname = 'worldcup-tick-every-5min');

select cron.schedule(
  'worldcup-tick-every-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/worldcup-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-tick-secret', '<TICK_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Apply and verify the schedule**

Run:
```bash
npx.cmd supabase db push
```
Verify the job exists:
```bash
npx.cmd supabase db execute "select jobname, schedule from cron.job where jobname = 'worldcup-tick-every-5min';"
```
Expected: one row with schedule `*/5 * * * *`. Confirm in Supabase logs that `worldcup-tick` is invoked on the next 5-minute boundary and returns a 200 summary.

- [ ] **Step 3: Document the deployment checklist**

Append a short "World Cup promo" section to `CLAUDE.md` under deployment notes listing: apply both migrations; set secrets `FOOTBALL_API_KEY`, `STRIPE_WC_COUPON_ID`, `WORLDCUP_TICK_SECRET`; create the Stripe coupon (100% off, `duration: once`) and put its id in `STRIPE_WC_COUPON_ID`; deploy `worldcup-tick`; confirm `RESEND_API_KEY` + `OUTREACH_FROM_EMAIL` are set.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260625130000_schedule_worldcup_tick.sql CLAUDE.md
git commit -m "feat: schedule worldcup-tick via pg_cron + deployment checklist"
```

---

## One-time setup (not a code task — do before launch)

- In the Stripe dashboard (or via API), create a **Coupon**: `100% off`, `duration: once`. Copy its id into the `STRIPE_WC_COUPON_ID` secret. The tick function generates one unique **promotion code** per winner off this coupon.
- Obtain a free **football-data.org** API token → `FOOTBALL_API_KEY`.
- Generate a random `WORLDCUP_TICK_SECRET` and set it on both the function secrets and the cron migration.

---

## Self-review notes (coverage check vs spec)

- Featured match, exact-score prediction, login-required, lock at kickoff → Tasks 1 (RLS), 6 (hook), 8 (UI).
- Auto-resolve via football API, winner detection, unique Stripe code, email → Tasks 2, 3, 4, 5.
- Shareable card → Tasks 7, 8.
- Landing teaser → Task 9.
- Auto-cycle to next match → Task 5 (sync un-features finished match, promotes next).
- Idempotent rewards → Task 5 (`rewarded_at is null` filter) + verified in Task 5 Step 4.
- Scheduling → Task 10.
- Sales-boost mechanic intentionally deferred (spec out-of-scope); the resolve loop in Task 5 is the seam where a non-winner consolation path would later attach.
