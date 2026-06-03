# GlobaLeads22 Launch Todo

Last updated: 2026-05-22

Goal: get the first paid users while keeping credit accounting, provider spend, and the first-search experience under control.

## Done

- [x] Stripe credit packs exist: Starter, Growth, Pro.
- [x] Checkout session creation is deployed.
- [x] Stripe webhook is deployed.
- [x] Atomic credit spend/grant database functions are migrated.
- [x] Search provider functions verify the signed-in user before calling providers.
- [x] Out-of-credits search opens the buy credits modal.
- [x] First-sign-in onboarding is simplified.
- [x] Landing page free-credit copy matches the app: 30 credits.
- [x] Landing page avoids guaranteed decision-maker language.
- [x] Admin searches do not deduct credits.

## Launch Blockers

- [x] Run a Stripe checkout smoke test.
  - Acceptance: checkout opens, payment succeeds, user returns to app, credits increase.
  - Verify rows in `stripe_payments` and `credit_transactions`.

- [x] Run a zero-credit purchase test.
  - Acceptance: user with 0 credits clicks `Find leads`, buy credits modal opens, selected pack redirects to Stripe.

- [ ] Run a Normal Simple customer search.
  - Acceptance: credits deduct atomically, leads save, `search_sessions.status` becomes `completed`.

- [ ] Run a Search + Enrich Simple customer search.
  - Acceptance: credits deduct, enrichment completes or clearly reports no named contacts.

- //[ ] Run an admin search.
  - Acceptance: no customer credits are deducted, provider usage/cost rows are still logged.

- [ ] Confirm provider budget alerts are set.
  - Google Cloud Places API.
  - Firecrawl.
  - Hunter.
  - Supabase.
  - Stripe.

## Conversion Improvements

- [ ] Improve the buy credits modal shown after insufficient credits.
  - Show: current balance, search cost, missing credits.
  - Highlight the recommended pack.
  - CTA copy: `Buy credits and continue`.

- [ ] Preserve the blocked search after checkout.
  - Acceptance: if a user tries a search with 0 credits, buys credits, then returns, the same search is still ready to run.

- [ ] Add clearer credit pricing near the search button.
  - Simple: 5 credits.
  - Normal: 10 credits.
  - Deep: 20 credits.
  - Enrich doubles the cost.

- [ ] Add example searches to the empty/manual search state.
  - `Dental clinics` + `United States`.
  - `Marketing agencies` + `Mexico`.
  - `Law firms` + `Canada`.

- [ ] Improve first successful search summary.
  - Show businesses found.
  - Show websites scanned.
  - Show public emails found.
  - Show likely decision makers found.
  - Show estimated credits used.

- [ ] Add product proof to landing page.
  - Use one real screenshot or demo result.
  - Include a sample query and output counts.

## Lead Quality Improvements

- [ ] Add feedback buttons on each saved lead.
  - Good.
  - Bad.
  - Wrong country.
  - Duplicate.
  - No useful contact.

- [ ] Add duplicate detection across saved leads.
  - Match by domain first.
  - Fall back to normalized business name + location.

- [ ] Improve empty states.
  - Empty results should suggest a broader niche, different country/city, or Simple vs Deep adjustment.
  - Enrich with no named contacts should explain that public business contacts may still be useful.

- [ ] Improve failure states.
  - Friendly messages for provider limits.
  - Friendly messages for timeouts.
  - Clear credit-refund language when a failed search is refunded.

## Export And Workflow

- [ ] Add Gmail one-touch email.
  - Connect Gmail with OAuth.
  - Generate a personalized draft from a selected lead.
  - Do not send email automatically until deliverability and compliance rules are defined.

- [ ] Add CSV export.
  - Acceptance: exports the same core fields as XLSX.

- [ ] Add Google Sheets export.
  - Acceptance: user can export selected leads to a new Sheet or copy-ready CSV format.

- [ ] Improve lightweight CRM views.
  - Filters by status, priority, contact availability, and follow-up date.
  - Bulk status updates.
  - Better notes editing.

- [ ] Add follow-up reminders.
  - Acceptance: follow-up view clearly shows due and overdue leads.

## Growth And Tracking

- [ ] Add analytics events.
  - Signup.
  - Search started.
  - Search completed.
  - Search failed.
  - Buy credits clicked.
  - Checkout completed.
  - Export completed.

- [ ] Add simple conversion dashboard.
  - Visitors to signup.
  - Signup to first search.
  - First search to purchase.
  - Purchase to repeat search.

- [ ] Prepare first paid ad.
  - Product/category: Sales & Marketing Software.
  - Secondary category: Directories & Listings.
  - Landing URL: `https://www.globaleads22.com`.
  - Offer: 30 free credits, no card required.

## Scale And Abuse Protection

- [ ] Add per-user rate limits.
  - Searches per minute.
  - Searches per hour.
  - Searches per day.
  - Separate admin/internal limits.

- [ ] Move full search orchestration server-side.
  - One Edge Function should reserve credits, call providers, save leads, and refund on failure.
  - Browser should not orchestrate provider calls long term.

- [ ] Add high-cost search warnings.
  - Warn internally when a search exceeds expected provider COGS.
  - Show admin dashboard flags for expensive searches.

- [ ] Add timeout controls.
  - Cap total search runtime.
  - Mark partial searches clearly.
  - Save partial results when useful.

- [ ] Add provider hard-failure monitoring.
  - Alert when Google, Firecrawl, Hunter, or Stripe errors spike.

## Technical Debt

- [ ] Fix existing lint errors.
  - `LocationAutocomplete.tsx`.
  - `MapboxPanel.tsx`.
  - shadcn UI empty interface warnings.
  - Supabase function `any` and regex warnings.
  - `tailwind.config.ts` require imports.

- [ ] Reduce large XLSX bundle impact.
  - Lazy-load export code.
  - Keep first app load lighter.

- [ ] Clean up old/legacy functions.
  - Keep inactive functions documented.
  - Avoid calling `web-search-leads` in the broad search flow.

- [ ] Update `ROADMAP.md` after launch priorities settle.
  - Sync completed launch hardening.
  - Remove stale tester-only items.
