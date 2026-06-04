# Lokal Demo

## Edit the prototype

The maintainable source files live in `src`:

- `src/index.html` - app shell and navigation
- `src/styles/base.css` - shared visual system
- `src/styles/round2.css` - current palette, font, and feature overrides
- `src/features/00-core.js` - demo state, event data, and shared helpers
- `src/features/10-discover.js` - Discover feed, filters, and Map
- `src/features/30-social.js` - groups, friends, invites, messages, and follows
- `src/features/40-profile.js` - Profile, settings, notifications, and lists
- `src/features/50-events.js` - event details and sharing
- `src/features/60-onboarding.js` - first-run account and preferences
- `src/features/90-interactions.js` - click/input handlers and startup

## Build the shareable file

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-standalone.ps1
```

This regenerates:

- `Lokal-demo.html` - single-file interactive demo
- `Lokal-demo-standalone.zip` - sendable archive

Edit files in `src`. Treat the generated standalone HTML as the share artifact.

## Sync real DC events from PredictHQ

1. Run `supabase/events.sql` in the Supabase SQL editor. This creates/updates
   the `events` table that the demo already reads from.
2. Get a PredictHQ API token and set it in your shell.
3. Run the sync script:

```powershell
$env:PREDICTHQ_API_TOKEN="your_predicthq_token"
$env:SUPABASE_URL="https://iglzcjtklryapmcpyoam.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
powershell -ExecutionPolicy Bypass -File .\tools\sync-predicthq-events.ps1
```

The script finds the Washington, DC PredictHQ Place ID, pulls events from today
through the next 6 days using `active.gte`, `active.lte`,
`active.tz=America/New_York`, and upserts them into Supabase by
`source + external_id`. It defaults to `place.exact` plus Lokal-friendly
categories only, then clears older PredictHQ rows before writing the curated
set.

Optional settings:

```powershell
$env:PHQ_PLACE_ID="predict_hq_dc_place_id"
$env:PHQ_LOOKAHEAD_DAYS="30"
$env:PHQ_LIMIT="100"
$env:PHQ_CATEGORIES="concerts,festivals,performing-arts,sports,community,expos"
$env:PHQ_USE_SCOPE="true" # broader than the default place.exact search
```

If you omit the Supabase variables, the script prints normalized events instead
of writing them.

There is also a dependency-free Node version at
`tools/sync-predicthq-events.mjs` if you prefer to run the same flow with Node.

## Design system

Round 2 uses a warm local-editorial palette: paper cream, district green,
coral highlights, and midnight blue. The interface font is `Avenir Next`
with system fallbacks; editorial headings use Georgia.
