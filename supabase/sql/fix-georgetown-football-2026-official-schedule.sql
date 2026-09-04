-- Use Georgetown Athletics' official 2026 football schedule as the source of
-- truth for Cooper Field home games.
-- Source: https://guhoyas.com/sports/football/schedule/2026

with official_home_games(opponent_key, opponent_name, game_date, game_time, starts_at, ends_at, status) as (
  values
    ('lafayette', 'Lafayette College Leopards', date '2026-08-27', '7:00 PM', timestamptz '2026-08-27 19:00:00 America/New_York', timestamptz '2026-08-27 22:00:00 America/New_York', 'cancelled'),
    ('lehigh', 'Lehigh Mountain Hawks', date '2026-09-05', '12:30 PM', timestamptz '2026-09-05 12:30:00 America/New_York', timestamptz '2026-09-05 15:30:00 America/New_York', 'published'),
    ('columbia', 'Columbia Lions', date '2026-09-26', '12:30 PM', timestamptz '2026-09-26 12:30:00 America/New_York', timestamptz '2026-09-26 15:30:00 America/New_York', 'published'),
    ('cornell', 'Cornell Big Red', date '2026-10-03', '12:30 PM', timestamptz '2026-10-03 12:30:00 America/New_York', timestamptz '2026-10-03 15:30:00 America/New_York', 'published'),
    ('bucknell', 'Bucknell Bison', date '2026-10-10', '12:30 PM', timestamptz '2026-10-10 12:30:00 America/New_York', timestamptz '2026-10-10 15:30:00 America/New_York', 'published'),
    ('holy cross', 'Holy Cross Crusaders', date '2026-11-07', '12:30 PM', timestamptz '2026-11-07 12:30:00 America/New_York', timestamptz '2026-11-07 15:30:00 America/New_York', 'published')
),
updated as (
  update public.events e
  set
    title = 'Georgetown Football vs. ' || g.opponent_name,
    description = case
      when g.status = 'cancelled' then 'Official Georgetown Athletics schedule lists this game as No Contest.'
      else 'Georgetown Football home game at Cooper Field.'
    end,
    category = 'sports',
    tag = 'Football',
    tags = array['Football','College sports','Georgetown Hoyas'],
    venue_name = 'Cooper Field',
    venue = 'Cooper Field',
    neighborhood = 'Georgetown',
    venue_address = 'Cooper Field, 1401 West Road NW, Washington, DC 20057',
    date = g.game_date,
    time = g.game_time,
    starts_at = g.starts_at,
    ends_at = g.ends_at,
    timezone = 'America/New_York',
    is_free = false,
    ticket_url = 'https://am.ticketmaster.com/guhoyas/buy/footballtickets',
    external_url = 'https://guhoyas.com/sports/football/schedule/2026',
    status = g.status,
    raw_json = coalesce(e.raw_json, '{}'::jsonb) || jsonb_build_object(
      'corrected_by', 'lokal',
      'correction_reason', 'Matched to Georgetown Athletics official 2026 football schedule.',
      'official_schedule_url', 'https://guhoyas.com/sports/football/schedule/2026'
    ),
    updated_at = now(),
    last_seen_at = now()
  from official_home_games g
  where lower(coalesce(e.venue_name, e.venue, '')) like '%cooper field%'
    and lower(e.title) like '%georgetown%'
    and lower(e.title) like '%football%'
    and lower(e.title) like '%' || g.opponent_key || '%'
  returning e.id, g.opponent_key
)
insert into public.events
  (title, description, category, tag, tags, venue_name, venue, neighborhood, venue_address, date, time, starts_at, ends_at, timezone, is_free, source, external_id, ticket_url, external_url, status, raw_json, last_seen_at, updated_at)
select
  'Georgetown Football vs. ' || g.opponent_name,
  'Georgetown Football home game at Cooper Field.',
  'sports',
  'Football',
  array['Football','College sports','Georgetown Hoyas'],
  'Cooper Field',
  'Cooper Field',
  'Georgetown',
  'Cooper Field, 1401 West Road NW, Washington, DC 20057',
  g.game_date,
  g.game_time,
  g.starts_at,
  g.ends_at,
  'America/New_York',
  false,
  'guhoyas',
  'guhoyas_football_2026_' || replace(g.opponent_key, ' ', '_'),
  'https://am.ticketmaster.com/guhoyas/buy/footballtickets',
  'https://guhoyas.com/sports/football/schedule/2026',
  g.status,
  jsonb_build_object(
    'source', 'Georgetown Athletics',
    'official_schedule_url', 'https://guhoyas.com/sports/football/schedule/2026'
  ),
  now(),
  now()
from official_home_games g
where g.status = 'published'
  and not exists (
    select 1
    from updated u
    where u.opponent_key = g.opponent_key
  )
  and not exists (
    select 1
    from public.events e
    where lower(coalesce(e.venue_name, e.venue, '')) like '%cooper field%'
      and lower(e.title) like '%georgetown%'
      and lower(e.title) like '%football%'
      and lower(e.title) like '%' || g.opponent_key || '%'
  );
