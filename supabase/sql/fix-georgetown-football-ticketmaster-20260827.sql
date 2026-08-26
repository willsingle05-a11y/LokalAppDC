-- Correct Georgetown football's placeholder Ticketmaster row.
-- Georgetown's official 2026 football schedule lists Lafayette at Cooper Field
-- on Thu, Aug 27, 2026 at 7 p.m. The imported Ticketmaster row had a midnight
-- placeholder on Aug 29 and a generic Z-event URL that can open as not found.

update public.events
set
  date = date '2026-08-27',
  time = '7:00 PM',
  starts_at = timestamptz '2026-08-27 19:00:00 America/New_York',
  ends_at = timestamptz '2026-08-27 22:00:00 America/New_York',
  ticket_url = 'https://am.ticketmaster.com/guhoyas/buy/footballtickets',
  external_url = 'https://guhoyas.com/sports/football/schedule',
  url = 'https://guhoyas.com/sports/football/schedule',
  neighborhood = 'Georgetown',
  venue_address = 'Cooper Field, 1401 West Road NW, Washington, DC 20057',
  price = '$33+',
  price_min = 33,
  is_free = false,
  raw_json = coalesce(raw_json, '{}'::jsonb) || jsonb_build_object(
    'corrected_by', 'lokal',
    'correction_reason', 'Official Georgetown schedule shows Thu Aug 27, 2026 at 7 p.m.; imported Ticketmaster row was a midnight placeholder.',
    'official_schedule_url', 'https://guhoyas.com/sports/football/schedule'
  )
where id = 273427
   or external_id = 'ticketmaster_Z7r9jZ1A7-OAU'
   or (
     source = 'ticketmaster'
     and title ilike '%Georgetown Hoyas Football%'
     and title ilike '%Lafayette%'
     and venue_name = 'Cooper Field'
   );
