# Production ingestion repairs — October 23, 2026

The scraper repairs are deployed to Supabase and the web app. Production now contains **15,441 published rows, including 2,496 eligible upcoming DC occurrences through November 13**. The morning audit found 1,443 eligible occurrences. These counts precede UI grouping and deduplication, include individual recurring occurrences, and change as events pass. They do not establish that every event on every source is covered.

Evidence: [final coverage JSON](ingestion-coverage-2026-10-23.json). The audit reads all published rows with pagination and applies the app's discovery eligibility rules.

## Verified imports

The latest private `source_sync_runs` records show **19 successful sources, one confirmed-empty calendar, and one failing source**. Each source was invoked against production; these are database imports rather than dry-run counts. Import horizon is 60 days, longer than the app's visible discovery window.

| Source | Latest successful upserts |
| --- | ---: |
| Smithsonian | 747 |
| Ticketmaster | 677 |
| Downtown DC BID | 322 |
| DC Music Live | 311 |
| FRESHFARM markets | 114 |
| Dupont Circle BID | 112 |
| Adams Morgan Partnership | 18 |
| Edible DC | 15 |
| Union Market District | 14 |
| Events DC | 13 |
| Capitol Riverfront / Navy Yard | 11 |
| Mount Vernon Triangle CID | 8 |
| RunGuides | 7 |
| Wharf | 6 |
| Things To Do DC | 4 |
| Georgetown BID | 3 |
| Anacostia BID | 3 |
| Southwest BID | 1 |
| Washingtonian | 1 |

Shaw Main Streets explicitly says to check back for upcoming events; its empty result is recorded separately from failures. The latest music dry run found 354 valid events; the subsequent production request imported 311 from the then-returned venue calendars. The source's responses vary, so the production table above is the authoritative import result. Existing music rows bring its current discovery-window inventory to 334 occurrences.

## Deployed changes

- Replaced the deployed `rapid-function` scraper with the repository's shared, allowlisted source engine, pinned to commit `9df8573ca74811e04cff5c27eba6c9aed97a9414`.
- Repaired Smithsonian's actual dates, time-zone offsets, event identifiers, images, and links. Missing dates no longer become ingestion timestamps. Online and outside-DC listings are excluded.
- Added current BID, museum, market, food, sports, and venue-calendar adapters. Music ingestion follows published venue pages beyond the small homepage preview and only follows venues verified as DC locations.
- Fixed database upserts to use the actual `(source, external_id)` conflict target and propagate errors. Fractional ticket prices retain their exact display text while integer price bounds fit the live schema.
- Preserved ongoing all-day listings until their real end. Date-only races display `Time TBA` instead of an invented start time. Three Events DC listings without a verified public physical venue are intentionally excluded.
- Installed private import health records with RLS and revoked public access. SQL verification confirmed **19 active source jobs plus the existing daily core job covering Smithsonian and Ticketmaster**. The existing happy-hour, trivia, and Desert 5 Spot recurring jobs remain active.
- Reworked GitHub imports to call the deployed function using its existing authentication, eliminating silently skipped database writes caused by an absent database connection secret. Failed/partial imports now fail visibly and preserve existing rows.
- Removed PredictHQ's destructive pre-import delete from both deployed and local sync paths. A rejected token can no longer clear its existing events.
- Deployed the account-deletion request UI correction and explicit production app mode. Updated dependencies; npm audit reported zero vulnerabilities. Synced production web assets into the local iOS wrapper and updated its Capacitor Swift package version.

## Remaining flags and limits

- **PredictHQ:** its stored token returns HTTP 401. The user explicitly chose to leave it flagged. No replacement credential was requested again.
- **NuAndroids:** its linked Shotgun ticket provider returns HTTP 429, including from the deployed function. Import health records an error and retains existing events. Provider access is needed for complete fresh details.
- **Resident Advisor:** the historical database source has no maintained importer in this repository. A direct public-calendar request returned HTTP 403. It remains unavailable for automated ingestion; no access restriction was bypassed.
- Old CSV/batch labels (`combined-venues`, `venue-scrape-2026-08`, `dc-clubs`, `dc-events-csv-2026-07`, `nightlife-2026-08`) are historical imports, not verified ongoing scrapers. Ticketmaster and expanded music calendars refresh overlapping venue inventory but do not prove complete replacement. The World Cup feed is a past seasonal source. College sports rows are existing imports and were not independently refreshed in this repair.
- Recurring happy-hour/trivia generation is running, but that does not reverify every venue's underlying promotion. Existing rows still include 336 upcoming records without direct source links and 1,213 without direct event images; venue image fallbacks can still display images. Historical malformed/past rows were not deleted.
- This is **not full launch approval**. Authenticated login/token refresh, saved-event persistence, actual account/data deletion processing, moderation, native device testing, TestFlight, and App Store acceptance remain unverified. Windows can sync the iOS wrapper but cannot validate a signed Xcode archive.

## Validation

All 14 regression tests pass, and the production web build and Capacitor sync pass. GitHub's [regression checks](https://github.com/willsingle05-a11y/LokalAppDC/actions/runs/40030372184) and [Pages deployment](https://github.com/willsingle05-a11y/LokalAppDC/actions/runs/40030372154) succeeded for the deployed repair revision. Live feed, restored Smithsonian search results, event descriptions, venue information, and ticket/detail controls were verified in the deployed app; no browser errors were recorded during those checks.

The user's pre-existing Discover edit and Vite logs remain uncommitted and were not included in the deployed web revision.

To repeat checks:

```powershell
npm.cmd test
npm.cmd run build:prod
node tools/sync-source-calendars.mjs --source dc-music-live
node tools/trigger-source-sync.mjs smithsonian ticketmaster
node tools/audit-location-coverage.mjs --json .audit/current-coverage.json
```

The dry-run collector only reads sources. The trigger command writes through the deployed importer. Latest source health is available to administrators with:

```sql
select distinct on (source) source, status, parsed, upserted, error, created_at
from public.source_sync_runs
order by source, created_at desc;
```
