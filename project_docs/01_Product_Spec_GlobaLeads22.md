# Product Spec: GlobaLeads22

## What The App Does

GlobaLeads22 is a B2B lead research SaaS for finding local and niche business leads by keyword plus location. Users describe the type of businesses they want, the app discovers companies, scans public websites for contact details, enriches likely decision-maker data when possible, scores the leads, and lets users organize or export results.

The product is built around a simple promise: generate usable lead lists faster than manual research.

## Core Users

- Small agencies looking for local businesses to sell services to.
- Freelancers and consultants doing outbound.
- B2B sales teams that need niche/local prospecting.
- Founders testing outbound markets.
- Operators who need quick lists without building scraping workflows.

## Search Flow

Current active search workflow:

1. User chooses search mode:
   - AI Assisted Search.
   - Manual Search.
2. User provides:
   - Industry / niche.
   - Location.
   - Optional language.
   - Search depth: Simple, Normal, or Deep.
   - Contact mode: Normal or Enrich.
   - Quality strictness: Broad, Balanced, or Strict.
   - Priority signals: phone, website, email, LinkedIn, person.
3. The app expands the query when needed, especially for person-first lead discovery.
4. `search-places` discovers business candidates.
5. `extract-contacts` scans accepted websites and public pages.
6. The app searches likely contact pages:
   - About.
   - Team.
   - Staff.
   - Doctors / specialists.
   - Contact.
   - Spanish equivalents such as nosotros, equipo, doctores, especialistas, contacto.
7. The app extracts:
   - Business name.
   - Website.
   - Public email.
   - Phone.
   - Social links.
   - Person / likely decision maker.
   - LinkedIn profile when valid.
8. Results are ranked and saved.
9. The UI shows completed leads only when the lead has both a company name and a real person name.

## Credit System

Customer-facing billing uses credits.

Current search costs:

| Search Type | Normal | Enrich |
|---|---:|---:|
| Simple | 5 credits | 10 credits |
| Normal | 10 credits | 20 credits |
| Deep | 20 credits | 40 credits |

Plan credits:

| Plan | Included Credits |
|---|---:|
| Free | 30 |
| Starter | 150 / month |
| Growth | 500 / month |
| Pro | 1500 / month, currently held as coming soon in customer UI |

Top-ups:

| Top-up | Price | Credits |
|---|---:|---:|
| Small | $10 | 100 |
| Medium | $25 | 300 |
| Large | $59 | 800 |

Free users are limited to simple search quality. Starter and Growth unlock the current full app experience: full search quality, lead inbox, pipeline, follow-ups, saved searches, exports, and credit top-ups.

## Lead Scoring Logic

Lead scoring is deterministic and evidence-based.

Important scoring signals:

- Has a real person name.
- Has a company / business name.
- Has a public email.
- Has a phone number.
- Has a business website.
- Has a valid LinkedIn `/in/` profile.
- Has a contact page or person/team page.
- Has a likely decision-maker title.
- Matches the requested industry and location.

Current person-first rule:

- Completed leads should include both a real person name and a company name.
- Company-only records can be used internally as candidates but should not be shown as finished leads.
- Generic emails like `info@`, `contact@`, `sales@`, `support@`, `ventas@`, and `contacto@` do not count as a person.
- Company LinkedIn pages support company confidence but do not count as person evidence.

Lead labels:

- Strong lead.
- Good lead.
- Needs work.

The UI should say "likely decision maker", not guaranteed decision maker.

## Export Behavior

Paid users can copy or export visible leads.

Export behavior:

- Exports visible filtered results.
- Export includes business and contact fields.
- Current export format is spreadsheet-oriented.
- Export should preserve backward-compatible fields like `emails`.
- Export should include enriched `contacts` when available.
- Free users are gated from export and prompted to upgrade.

Future export behavior should support selected leads, export history, and CRM destinations.

## Enrichment Sources

Current active sources and methods:

- Business discovery through the app's maps-first discovery function.
- Public website scraping through the contact extraction function.
- Public website pages likely to contain people and emails.
- Public social/profile links found on websites.
- Optional decision-maker enrichment when a valid business domain exists.
- Provider usage and cost accounting through admin telemetry.

Internal provider names should stay out of normal user-facing product copy. They can appear in technical documentation, admin cost accounting, and internal planning.

## Current Limitations

- Person extraction is much better now, but local business websites can still be sparse or poorly structured.
- Some industries expose generic inboxes more often than named contacts.
- LinkedIn profile discovery is opportunistic and depends on public links.
- No native CRM integration is live yet.
- Gmail / one-touch email is planned but not implemented.
- Pro team seats and customer-facing organization management are not yet production-ready.
- Reordering leads inside pipeline columns is not persisted.
- Results depend on public web availability, site quality, and provider availability.
- Some searches may return fewer leads because company-only records are rejected.

## Future Features

Near-term:

- Contact / bug report flow inside the app.
- More robust lead diagnostics for low-result searches.
- Better person extraction for additional industries and languages.
- Lead detail drawer for editing notes, status, contact fields, and evidence.
- Saved search reruns.
- Better onboarding data capture and personalization.

Growth features:

- One-touch email workflow.
- Gmail integration.
- HubSpot export.
- CRM automations.
- Lead dedupe and company intelligence.
- Outreach templates.
- Follow-up reminders tied to pipeline status.

Pro / team features:

- Team seats.
- Organization owner and member roles.
- Shared CRM workspace.
- Team usage limits.
- Admin-level team activity view.
- Priority support.
- Early access features.

