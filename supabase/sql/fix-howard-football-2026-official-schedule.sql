-- Use Howard Athletics' official 2026 football schedule as the source of truth
-- for Washington, DC home games.
-- Source: https://hubison.com/sports/football/schedule/2026

with official_home_games(opponent_key, opponent_name, game_date, game_time, starts_at, ends_at, venue_name, neighborhood, venue_address) as (
  values
    ('richmond', 'Richmond Spiders', date '2026-09-05', '6:00 PM', timestamptz '2026-09-05 18:00:00 America/New_York', timestamptz '2026-09-05 21:00:00 America/New_York', 'Greene Stadium', 'Shaw', 'Greene Stadium, Washington, DC'),
    ('hampton', 'Hampton Pirates', date '2026-10-03', '3:00 PM', timestamptz '2026-10-03 15:00:00 America/New_York', timestamptz '2026-10-03 18:00:00 America/New_York', 'Audi Field', 'Navy Yard', 'Audi Field, 100 Potomac Ave SW, Washington, DC 20024'),
    ('morehouse', 'Morehouse College Maroon Tigers', date '2026-10-17', '3:30 PM', timestamptz '2026-10-17 15:30:00 America/New_York', timestamptz '2026-10-17 18:30:00 America/New_York', 'Greene Stadium', 'Shaw', 'Greene Stadium, Washington, DC'),
    ('south carolina state', 'South Carolina State Bulldogs', date '2026-11-05', '5:00 PM', timestamptz '2026-11-05 17:00:00 America/New_York', timestamptz '2026-11-05 20:00:00 America/New_York', 'Greene Stadium', 'Shaw', 'Greene Stadium, Washington, DC'),
    ('delaware state', 'Delaware State Hornets', date '2026-11-14', '1:00 PM', timestamptz '2026-11-14 13:00:00 America/New_York', timestamptz '2026-11-14 16:00:00 America/New_York', 'Greene Stadium', 'Shaw', 'Greene Stadium, Washington, DC')
),
updated as (
  update public.events e
  set
    title = 'Howard Football vs. ' || g.opponent_name,
    description = 'Howard Football home game.',
    category = 'sports',
    tag = 'Football',
    tags = array['Football','College sports','Howard Bison'],
    venue_name = g.venue_name,
    venue = g.venue_name,
    neighborhood = g.neighborhood,
    venue_address = g.venue_address,
    date = g.game_date,
    time = g.game_time,
    starts_at = g.starts_at,
    ends_at = g.ends_at,
    timezone = 'America/New_York',
    is_free = false,
    ticket_url = 'https://hubison.com/sports/football/schedule/2026',
    external_url = 'https://hubison.com/sports/football/schedule/2026',
    url = 'https://hubison.com/sports/football/schedule/2026',
    source = case when e.source = 'ticketmaster' then e.source else 'hubison' end,
    raw_json = coalesce(e.raw_json, '{}'::jsonb) || jsonb_build_object(
      'corrected_by', 'lokal',
      'correction_reason', 'Matched to Howard Athletics official 2026 football schedule.',
      'official_schedule_url', 'https://hubison.com/sports/football/schedule/2026'
    ),
    updated_at = now(),
    last_seen_at = now()
  from official_home_games g
  where lower(coalesce(e.title, '')) like '%howard%'
    and lower(coalesce(e.title, '')) like '%football%'
    and lower(coalesce(e.title, '')) like '%' || g.opponent_key || '%'
  returning e.id, g.opponent_key
)
insert into public.events
  (title, description, category, tag, tags, venue_name, venue, neighborhood, venue_address, date, time, starts_at, ends_at, timezone, is_free, source, external_id, ticket_url, external_url, url, status, raw_json, last_seen_at, updated_at)
select
  'Howard Football vs. ' || g.opponent_name,
  'Howard Football home game.',
  'sports',
  'Football',
  array['Football','College sports','Howard Bison'],
  g.venue_name,
  g.venue_name,
  g.neighborhood,
  g.venue_address,
  g.game_date,
  g.game_time,
  g.starts_at,
  g.ends_at,
  'America/New_York',
  false,
  'hubison',
  'hubison_football_2026_' || replace(g.opponent_key, ' ', '_'),
  'https://hubison.com/sports/football/schedule/2026',
  'https://hubison.com/sports/football/schedule/2026',
  'https://hubison.com/sports/football/schedule/2026',
  'published',
  jsonb_build_object(
    'source', 'Howard Athletics',
    'official_schedule_url', 'https://hubison.com/sports/football/schedule/2026'
  ),
  now(),
  now()
from official_home_games g
where not exists (
    select 1
    from updated u
    where u.opponent_key = g.opponent_key
  )
  and not exists (
    select 1
    from public.events e
    where lower(coalesce(e.title, '')) like '%howard%'
      and lower(coalesce(e.title, '')) like '%football%'
      and lower(coalesce(e.title, '')) like '%' || g.opponent_key || '%'
  );
