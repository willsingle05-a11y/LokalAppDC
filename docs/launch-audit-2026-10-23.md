# Lokal launch audit — October 23, 2026

> Historical morning audit. Production ingestion repairs were subsequently deployed. See [the repair report](ingestion-repair-2026-10-23.md) for current coverage, verification, and remaining limitations. Statements below about local-only changes and missing database access describe the earlier snapshot.

**Verdict: the deployed app runs, but event coverage is not ready for launch.**

Checked the local source, deployed GitHub Pages app, public Supabase events, GitHub Actions job steps, and four live source importers. The expected source inventory comes from repository importers and the 34 source names present in published database rows; no separate definitive source list was available. This is not a guarantee that every event on every source website has been captured.

## Confirmed blockers

1. **All three existing scheduled GitHub importers skip database writes.** The October 22 Events DC, Edible DC, and RunGuides runs are green, but each `Apply import to Supabase` step is `skipped`; each `Explain skipped Supabase import` step runs instead. Their workflows explicitly do this when `SUPABASE_DB_URL` is empty. Successful scraping has therefore been reported as a successful import without delivering events.
2. **Expected ongoing sources are empty or stale.** Events DC, Edible DC, Things To Do DC, Washingtonian, Wharf, farmers markets, neighborhood BIDs, and older venue imports have no eligible events in the app's current discovery window. NuAndroids and music CSV imports retain a few future events but are not evidence of active scraping.
3. **Smithsonian timestamps need repair in the deployed importer.** All 1,443 published Smithsonian rows have no upcoming event in the audited window. The newest sampled rows have null `date` and `time`, no source URL, and `starts_at` values clustered around October 23 at 11:00:08 UTC, immediately before their refresh timestamps. This suggests ingestion time is being substituted for the real event time. The deployed Smithsonian importer is not in this repository, so its parsing logic could not be inspected or repaired here.
4. **Account deletion was a success-only UI stub.** The deployed click handler only closes the modal and displays `Account deactivation confirmed`. It does not call the existing deletion-request function. A local fix now persists a request and reports pending/failure accurately. It still requires a real deletion-processing backend and an authenticated end-to-end check before launch approval.

Evidence: [Events DC job](https://github.com/willsingle05-a11y/LokalAppDC/actions/runs/39803727625), [Edible DC job](https://github.com/willsingle05-a11y/LokalAppDC/actions/runs/39806799445), [RunGuides job](https://github.com/willsingle05-a11y/LokalAppDC/actions/runs/39808684202).

## Current event coverage

Snapshot around 10:30 AM Eastern. Window: audit time through November 13 at 11:59 PM Eastern. Counts are scheduled DC rows before UI grouping/deduplication; recurring occurrences count individually.

- 13,119 published rows scanned, with complete pagination.
- 1,443 upcoming rows pass the app's DC and scheduled-start rules.
- 1,040 happy-hour occurrences and 195 trivia occurrences: approximately 86% of current inventory.
- No rows match the audit's Anacostia/Southeast location patterns. Location buckets can overlap and use the existing audit heuristics.
- 338 upcoming rows have no `ticket_url`, `external_url`, or `url`.
- 1,204 upcoming rows lack a direct event image; the app can supply venue-image fallbacks, so this is not a count of visibly blank cards.
- Ten upcoming rows do not match the audit's neighborhood patterns. These include Capital One Arena and Sidney Harman Hall; this identifies a limitation in the audit's location patterns, not proof those events disappear from the app.

| Source or source group | Upcoming rows | Finding |
| --- | ---: | --- |
| happy-hours | 1,040 | Materialized today; schedule source data itself was last saved locally in June. Fresh recurrence generation does not reverify venue specials. |
| trivia-nights | 195 | Materialized today; source schedule data still needs venue-level reverification. |
| dc-music-live | 93 | CSV import last seen June 25; no live scraper or workflow in this repo. |
| ticketmaster | 65 | Fresh database write October 23; latest published start is October 27. Full producer configuration and lookahead are not in this repo. |
| desert_5_spot | 28 | Recurrence materialization refreshed today. |
| dc-events-csv-2026-07 | 14 | Historical CSV inventory; no active scraper in this repo. |
| nuandroids | 3 | Last seen August 11; importer reads a supplied CSV, not the live website. |
| nightlife-2026-08 | 2 | Historical import. |
| guhoyas | 1 | Official 2026 schedule import; seasonal, manually maintained. |
| hubison | 1 | Official 2026 schedule import; seasonal, manually maintained. |
| runguides | 1 | Scraper works; scheduled database write is skipped. |
| eventsdc | 0 | Scraper works; scheduled database write is skipped. |
| edibledc | 0 | Scraper works; scheduled database write is skipped. |
| thingstododc | 0 | Embassy scraper works; no existing scheduled workflow. |
| smithsonian | 0 | Fresh writes but unusable upcoming schedule; see blocker above. |
| washingtonian | 0 | Last source import July 2; static SQL only. |
| wharf / The Wharf DC | 0 | Old imported rows; static SQL only. |
| farmers-markets | 0 | Imported dates ended August 5; no rolling importer found. |
| Adams Morgan Partnership | 0 | Old imported dates; no scheduled scraper found. |
| Anacostia BID | 0 | Old imported dates; no scheduled scraper found. |
| Capitol Riverfront BID | 0 | Old imported dates; no scheduled scraper found. |
| Downtown DC BID | 0 | Old imported dates; no scheduled scraper found. |
| Dupont Circle BID | 0 | Old imported dates; no scheduled scraper found. |
| Georgetown BID | 0 | Old imported dates; no scheduled scraper found. |
| Mount Vernon Triangle CID | 0 | Old imported dates; no scheduled scraper found. |
| Shaw Main Streets | 0 | Old imported dates; no scheduled scraper found. |
| Southwest BID | 0 | Old imported dates; no scheduled scraper found. |
| Union Market District | 0 | Old imported dates; no scheduled scraper found. |
| Resident Advisor | 0 | Old manually imported dates; no scheduled scraper found. |
| combined-venues / venue-scrape-2026-08 / dc-clubs | 0 | Imported inventory exhausted; no corresponding scheduled live scraper found. |
| world_cup_2026 | 0 | Historical seasonal source; zero upcoming events is expected. |
| predicthq | 0 published rows | Importer and SQL schedule exist in the repo; actual deployment, credentials and cron execution are unverified. |

Exact per-source timestamps and all 34 published source names are in `launch-event-coverage-2026-10-23.json`.

## Live scraper checks

Ran existing scripts against their actual source websites, generating SQL in a temporary directory only. These tests did not import or modify any database events.

| Scraper | Upcoming DC rows found | Scope |
| --- | ---: | --- |
| Events DC | 7 | Its configured 90-day API window. Nine listings were rejected for missing mapped venue IDs, including an NWSL championship listing; venue mapping needs expansion. |
| Edible DC | 15 | Current iCalendar feed, beyond the app's 21-day window. |
| RunGuides | 11 | Its configured paginated API query, including later races. |
| Things To Do DC | 5 | Embassy & Culture category only; this does not cover every category on the site. One Austrian embassy listing was rejected because its address lacked explicit DC/quadrant text. |

These totals are not the number of rows missing from the current feed: horizons differ, sources may overlap, and some existing rows may already represent the same event.

## Local fixes prepared

- Scheduled imports now fail visibly when `SUPABASE_DB_URL` is absent.
- Import jobs use PostgreSQL `psql` with error stopping and a single transaction, and explicitly install the client. This prevents partial SQL imports being reported as success. See the [PostgreSQL psql documentation](https://www.postgresql.org/docs/18/app-psql.html).
- Added a daily Things To Do DC Embassy & Culture workflow. It requires the same database secret and has not run in GitHub yet.
- GitHub Pages deployment now explicitly sets `VITE_APP_MODE=production`.
- Account deletion now calls the existing request API, waits for success, reports pending status, and allows retry on failure.
- Embassy event parsing now uses Eastern daylight-saving rules instead of a permanent `-04:00` offset.
- Event audit now scans beyond its old 10,000-row cutoff and reuses the app's scheduled-start/DC rules. The old cutoff omitted 3,119 published rows.
- Added reusable event, source-service, and scraper probes plus four launch regression tests.

These changes are local and uncommitted. They have not been deployed, applied to the database, or copied into a new iOS release. The pre-existing edit to `src/features/10-discover.js` and the existing Vite logs were preserved.

## Validation and remaining work

**Passed:** production web build; combined feature-script parsing in actual import order; deletion success/failure regression tests; Eastern daylight-saving regression tests; deployed app initial load, event details, filters, Saved and Profile navigation; no browser error logs during those checks. Deployed home, privacy, terms and report pages return HTTP 200.

**Not verified:** signed-in signup/login and token refresh, save/RSVP persistence across sessions, moderation enforcement, actual account/data deletion, real device behavior, TestFlight, or App Store review. Xcode signing team and native assets exist in source, but a native archive cannot be validated on this Windows host. Existing launch documents include stale claims and should not be treated as a fresh signoff.

To restore production coverage:

1. Set `SUPABASE_DB_URL` in this repository's Actions secrets using the correct Supabase database connection string. Do not paste credentials into this report or source control.
2. Deploy the reviewed workflow/code changes; run all four imports and verify database write steps complete, then rerun the event coverage audit. SQL execution against the current database schema is not yet validated.
3. Inspect the deployed Smithsonian and Ticketmaster producers and their cron schedules. Preserve real event dates/source links, verify the lookahead, and check cron failure history. Smithsonian needs a real fix before its rows can be trusted. The PredictHQ implementation currently deletes its entire source before upsert, so do not invoke it as a diagnostic.
4. Restore ongoing ingestion for the BIDs, Wharf, Washingtonian, farmers markets, venue calendars, NuAndroids, and music sources that are still part of launch scope. Stored CSV/SQL snapshots do not satisfy ongoing scraping. Reverify recurring schedule information with venues.
5. Resolve the listed source-level rejection/mapping gaps and then perform authenticated and native launch acceptance testing.

Automatic approval review rejected a POST diagnostic to the PredictHQ sync endpoint because that endpoint can replace events. It was not retried or invoked indirectly. PredictHQ runtime configuration remains unverified; all subsequent service probes used GET requests only.

## Re-run checks

```powershell
npm.cmd run test:launch
npm.cmd run build:prod
npm.cmd run audit:events -- --json docs/latest-event-coverage.json
npm.cmd run audit:scrapers
node tools/probe-launch-services.mjs
```

The network checks require access to the public source sites/Supabase. JSON evidence accompanies this report: `launch-event-coverage-2026-10-23.json`, `launch-scraper-probes-2026-10-23.json`, and `launch-service-probes-2026-10-23.json`.
