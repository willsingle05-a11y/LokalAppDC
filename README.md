# Lokal Demo

## Edit the prototype

The maintainable source files live in `src`:

- `src/index.html` - app shell and navigation
- `src/styles/base.css` - shared visual system
- `src/styles/round2.css` - current palette, font, and feature overrides
- `src/features/00-core.js` - demo state, event data, and shared helpers
- `src/features/10-discover.js` - Discover feed and filters
- `src/features/30-social.js` - groups, friends, invites, messages, and follows
- `src/features/40-profile.js` - Profile, settings, notifications, and lists
- `src/features/50-events.js` - event details and sharing
- `src/features/60-onboarding.js` - first-run account and preferences
- `src/features/90-interactions.js` - click/input handlers and startup

## Run the Vite app

Install dependencies once:

```powershell
npm.cmd install
```

Run the local development app:

```powershell
npm.cmd run dev
```

Build the launchable web app:

```powershell
npm.cmd run build
```

Preview the production build:

```powershell
npm.cmd run preview
```

The Vite entry point is `index.html`, which loads `src/main.js`. That bridge
keeps the existing feature files running in their current order while the app
moves toward a more launchable structure.

## Build the shareable file

Run:

```powershell
npm.cmd run build:standalone
```

This regenerates:

- `Lokal-demo.html` - single-file interactive demo
- `Lokal-demo-standalone.zip` - sendable archive

Edit files in `src`. Treat the generated standalone HTML as the share artifact.

## Sync real DC events from an event API

1. Run `supabase/events.sql` in the Supabase SQL editor. This creates/updates
   the `events` table that the demo already reads from, including the `tags`
   array used for multi-tag event cards and future tag filtering.
2. Get an event API token and set it in your shell.
3. Run the sync script:

```powershell
$env:EVENT_API_TOKEN="your_event_api_token"
$env:SUPABASE_URL="https://iglzcjtklryapmcpyoam.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
powershell -ExecutionPolicy Bypass -File .\tools\sync-events.ps1
```

The script finds Washington, DC, pulls events from today through the next 6
days, and upserts them into Supabase by `source + external_id`. It defaults to
a focused DC place search plus Lokal-friendly categories only, then clears older
imported rows before writing the curated set.

Optional settings:

```powershell
$env:PHQ_PLACE_ID="dc_place_id"
$env:PHQ_LOOKAHEAD_DAYS="30"
$env:PHQ_LIMIT="100"
$env:PHQ_CATEGORIES="concerts,festivals,performing-arts,sports,community,expos"
$env:PHQ_USE_SCOPE="true" # broader than the default place.exact search
```

If you omit the Supabase variables, the script prints normalized events instead
of writing them.

There is also a dependency-free Node sync flow available if you prefer to run
the same process with Node.

## Auto-sync events with Supabase

The demo now includes a Supabase Edge Function at:

- `supabase/functions/sync-predicthq-events/index.ts`

That function pulls current DC events, cleans them up, and writes them into the
same `events` table the demo already reads from. Imported rows include a single
primary `tag` plus a multi-value `tags` array inferred from API labels,
category, title/description keywords, time of day, free/price signals, and
local activity patterns.

### 1. Find the Supabase service role key

In Supabase:

1. Open your project.
2. Go to `Project Settings`.
3. Go to `API`.
4. Copy the `service_role` key.

Keep this key server-side only. Do not paste it into the frontend app.

### 2. Deploy the Edge Function

From this project folder:

```powershell
npx supabase login
npx supabase link --project-ref iglzcjtklryapmcpyoam
npx supabase secrets set PREDICTHQ_API_TOKEN="your_predict_hq_token"
npx supabase secrets set SERVICE_ROLE_KEY="your_supabase_service_role_key"
npx supabase secrets set PHQ_LOOKAHEAD_DAYS="14"
npx supabase functions deploy sync-predicthq-events --no-verify-jwt
```

Supabase automatically provides `SUPABASE_URL` to Edge Functions. The service
role key is saved as `SERVICE_ROLE_KEY` because Supabase reserves custom secret
names that start with `SUPABASE_`.

### 3. Test the function once

```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://iglzcjtklryapmcpyoam.functions.supabase.co/sync-predicthq-events" `
  -ContentType "application/json" `
  -Body "{}"
```

Expected response:

```json
{ "ok": true, "fetched": 100, "upserted": 60 }
```

### 4. Schedule automatic updates

Run this file in the Supabase SQL editor:

- `supabase/sql/schedule-predicthq-sync.sql`

It schedules the sync every morning. After that, the Lokal app will pick up new
events from Supabase whenever the app opens or refreshes.

## Seed demo profiles

The app includes 30 demo Lokal profiles in:

- `src/features/01-demo-profiles.js`

To make those profiles real rows in Supabase:

1. Run `supabase/profiles.sql` in the Supabase SQL editor. This creates the
   demo-safe public read policy for rows where `is_demo = true`.
2. In PowerShell, set your service role key and run the seed script:

```powershell
$env:SUPABASE_URL="https://iglzcjtklryapmcpyoam.supabase.co"
$env:SERVICE_ROLE_KEY="your_supabase_service_role_key"
node .\tools\seed-demo-profiles.mjs
```

The script creates confirmed Auth users with `@demo.lokal.app` emails and
upserts their matching `public.profiles` rows. The frontend then merges those
profiles into the Friends search/list automatically when the app opens.

## Happy-hour data

Add only currently verified, DC-proper listings to `data/happy-hours.json`.
Each row needs a weekday and local start/end time. A street address and venue
URL are retained when known; neighborhood-scoped DC source sheets can omit
them. The import script expands weekly rows into normal `events` entries with
`source = happy-hours` and `category = happy-hours`.

```json
[
  {
    "venue_name": "Example DC venue",
    "venue_address": "123 Example St NW, Washington, DC 20001",
    "neighborhood": "Downtown",
    "weekday": "monday",
    "starts_at": "16:00",
    "ends_at": "18:00",
    "specials": "Verified specials from the venue's official page.",
    "price_label": "Happy hour specials",
    "tags": ["Cocktails", "Food deals", "After work"],
    "source_url": "https://venue.example/happy-hour"
  }
]
```

The long-lived recurring setup is in
`supabase/sql/recurring-happy-hours.sql`. It stores schedules in
`public.recurring_happy_hour_schedules`, materializes a rolling 60-day event
window, and refreshes it daily via `pg_cron`.

To parse uploaded spreadsheet-style CSV files into the source data:

```powershell
node .\tools\parse-happy-hour-csvs.mjs .\data\happy-hours.json <csv-file> [...more-csv-files]
```

To generate a schedule seed query for the linked Supabase project:

```powershell
node .\tools\import-happy-hours.mjs .\data\happy-hours.json --schedule-sql .\happy-hours-upsert.sql
```

The existing direct service-role upsert is still available for a short rolling
window:

```powershell
$env:SUPABASE_URL="https://iglzcjtklryapmcpyoam.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
npm run import:happy-hours
```

## Venue address verification

The `public.venues` table stores the local venue directory independently from
the app. To find missing street addresses from the venues' official websites,
export the unresolved rows to JSON and run:

```powershell
node .\tools\resolve-venue-addresses.mjs unresolved-venues.json resolved-venues.json
```

Only rows with `status: "resolved"` and `confidence: "official-jsonld"` or
`"official-page-text"` should be written back to Supabase.

## Design system

Round 2 uses a warm local-editorial palette: paper cream, district green,
coral highlights, and midnight blue. The interface font is `Avenir Next`
with system fallbacks; editorial headings use Georgia.
