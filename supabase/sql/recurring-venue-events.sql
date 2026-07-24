-- Recurring venue events (live music, dance nights, day parties, food nights) that
-- don't fit the category-locked happy-hours / trivia schedules. Mirrors the exact
-- pattern of recurring-happy-hours.sql and recurring-trivia-nights.sql:
--   schedule table  ->  security-definer refresh function  ->  daily pg_cron job
-- that materializes dated occurrences into public.events and prunes past/undated rows.
--
-- Unlike those two, this one preserves each event's OWN title/category/tag/tags/time,
-- so a single venue can host many different recurring events.
--
-- First user of the table: Desert 5 Spot DC (source 'desert_5_spot'), whose 8 rows had
-- been inserted with NULL date/starts_at (7) or a past date (1), so they never entered
-- the app's 21-day discovery window. Running this file replaces them with rolling,
-- properly dated occurrences.

-- ---------------------------------------------------------------------------
-- 1) Schedule table
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_venue_event_schedules (
  source_key text primary key,          -- unique per weekday-occurrence; becomes the external_id prefix
  event_source text not null,           -- value written to events.source (e.g. 'desert_5_spot')
  title text not null,
  description text not null,
  category text not null,
  tag text not null,
  tags text[] not null default '{}',
  venue_name text not null,
  venue_address text not null,          -- keep explicit "Washington, DC" + quadrant so enforce_dc_events keeps it published
  neighborhood text not null,
  weekday smallint not null check (weekday between 0 and 6),  -- Postgres dow: Sun=0 ... Sat=6
  starts_at time not null,
  ends_at time,                         -- nullable; when set, drives the ends_at timestamp + "start - end" label
  price_label text,
  is_free boolean not null default false,
  external_url text,
  image_url text,
  source_name text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.recurring_venue_event_schedules enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Refresh function — materialize dated occurrences, prune past/undated rows
-- ---------------------------------------------------------------------------
create or replace function public.refresh_recurring_venue_events(days_ahead integer default 60)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  local_today date := (now() at time zone 'America/New_York')::date;
  rows_written integer;
begin
  -- Drop stale rows for any managed source: past occurrences AND the old undated
  -- template rows (date is null) that never surfaced.
  delete from public.events
  where source in (select distinct event_source from public.recurring_venue_event_schedules where is_active)
    and (date is null or date < local_today);

  insert into public.events (
    source, external_id, title, description, category, tag, tags, venue_name, venue,
    venue_address, neighborhood, date, time, price, ticket_url, external_url, timezone,
    is_free, status, last_seen_at, raw_json, starts_at, ends_at, is_recurring, image_url
  )
  select
    schedule.event_source,
    schedule.source_key || '-' || to_char(occurrence.event_date, 'YYYY-MM-DD'),
    schedule.title,
    schedule.description,
    schedule.category,
    schedule.tag,
    schedule.tags,
    schedule.venue_name,
    schedule.venue_name,
    schedule.venue_address,
    schedule.neighborhood,
    occurrence.event_date,
    trim(to_char(schedule.starts_at, 'FMHH12:MI AM'))
      || case when schedule.ends_at is not null then ' - ' || trim(to_char(schedule.ends_at, 'FMHH12:MI AM')) else '' end,
    schedule.price_label,
    schedule.external_url,
    schedule.external_url,
    'America/New_York',
    schedule.is_free,
    'published',
    now(),
    jsonb_build_object('recurring_venue_event', true, 'source_name', schedule.source_name),
    ((occurrence.event_date + schedule.starts_at) at time zone 'America/New_York'),
    case
      when schedule.ends_at is not null
      then ((occurrence.event_date + schedule.ends_at
             + case when schedule.ends_at <= schedule.starts_at then interval '1 day' else interval '0 day' end)
            at time zone 'America/New_York')
      else null
    end,
    true,
    nullif(schedule.image_url, '')
  from public.recurring_venue_event_schedules schedule
  cross join lateral (
    select local_today + day_offset as event_date
    from generate_series(0, greatest(days_ahead, 1)) as day_offset
  ) occurrence
  where schedule.is_active
    and extract(dow from occurrence.event_date) = schedule.weekday
  on conflict (source, external_id) do update set
    title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    tag = excluded.tag,
    tags = excluded.tags,
    venue_name = excluded.venue_name,
    venue = excluded.venue,
    venue_address = excluded.venue_address,
    neighborhood = excluded.neighborhood,
    date = excluded.date,
    time = excluded.time,
    price = excluded.price,
    ticket_url = excluded.ticket_url,
    external_url = excluded.external_url,
    timezone = excluded.timezone,
    is_free = excluded.is_free,
    status = excluded.status,
    last_seen_at = excluded.last_seen_at,
    raw_json = excluded.raw_json,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_recurring = true,
    image_url = excluded.image_url,
    updated_at = now();

  get diagnostics rows_written = row_count;
  return rows_written;
end;
$$;

revoke all on function public.refresh_recurring_venue_events(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Daily cron — keep a rolling 60-day horizon (5:35 AM, after happy-hours/trivia)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'refresh-lokal-venue-events') then
    perform cron.schedule(
      'refresh-lokal-venue-events',
      '35 5 * * *',
      'select public.refresh_recurring_venue_events(60);'
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Seed: Desert 5 Spot DC recurring lineup
--    NOTE: the existing rows carry venue_address '400 Morse St NE' (Union Market /
--    NoMa, NE) but neighborhood 'Navy Yard' (which is SE, by Nationals Park) — those
--    contradict. Address wins here, so neighborhood is set to 'Union Market'. If the
--    venue is actually elsewhere, fix the address + neighborhood below and re-run.
-- ---------------------------------------------------------------------------
insert into public.recurring_venue_event_schedules (
  source_key, event_source, title, description, category, tag, tags,
  venue_name, venue_address, neighborhood, weekday, starts_at, ends_at,
  price_label, is_free, external_url, image_url, source_name, is_active
) values
  ('d5dc_cowboy_karaoke_wed', 'desert_5_spot',
   'Live Band Cowboy Karaoke DC',
   'Grab the mic at DC''s country bar — live band cowboy karaoke every Wednesday at Desert 5 Spot.',
   'nightlife', 'Karaoke', array['Karaoke','Live Band','Country'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 3, time '21:00', null,
   null, false, null, null, 'Desert 5 Spot DC', true),

  ('d5dc_saddle_up_swing_wed', 'desert_5_spot',
   'Saddle Up Swing — Country Dancing with Live Band Karaoke',
   'Country line and swing dancing with live band karaoke. Boots optional, fun required.',
   'nightlife', 'Dancing', array['Country Dancing','Live Band','Country'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 3, time '19:00', null,
   null, false, null, null, 'Desert 5 Spot DC', true),

  ('d5dc_american_darling_thu', 'desert_5_spot',
   'Thursdays at Desert 5 Spot DC — American Darling Live',
   'Live country from American Darling every Thursday night at Desert 5 Spot.',
   'concerts', 'Live music', array['Live music','Country'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 4, time '20:00', null,
   null, false, null, null, 'Desert 5 Spot DC', true),

  ('d5dc_wild_west_thu', 'desert_5_spot',
   'Wild West Thursdays — $5 Beer & Shot',
   '$5 beer & shot specials and Wild West vibes every Thursday.',
   'nightlife', 'Drink Specials', array['Drink Specials','Country'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 4, time '20:00', null,
   '$5 beer & shot', false, null, null, 'Desert 5 Spot DC', true),

  ('d5dc_ayce_ribs_thu', 'desert_5_spot',
   'All You Can Eat Ribs Night',
   'All-you-can-eat ribs night — dig in every Thursday at Desert 5 Spot.',
   'food', 'Food', array['Food','BBQ'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 4, time '17:00', null,
   null, false, null, null, 'Desert 5 Spot DC', true),

  ('d5dc_shawn_parsons_fri', 'desert_5_spot',
   'Shawn Parsons & The Secret Service with Country DJs',
   'Shawn Parsons & The Secret Service with country DJs — Friday nights at Desert 5 Spot.',
   'concerts', 'Live music', array['Live music','Country','DJ'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 5, time '21:00', null,
   null, false, null, null, 'Desert 5 Spot DC', true),

  ('d5dc_shawn_parsons_sat', 'desert_5_spot',
   'Shawn Parsons & The Secret Service with Country DJs',
   'Shawn Parsons & The Secret Service with country DJs — Saturday nights at Desert 5 Spot.',
   'concerts', 'Live music', array['Live music','Country','DJ'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 6, time '21:00', null,
   null, false, null, null, 'Desert 5 Spot DC', true),

  ('d5dc_dusty_boots_sat', 'desert_5_spot',
   'Dusty Boots Day Party — Patio Party',
   'Patio day party — country tunes, sunshine, and cold drinks, every Saturday afternoon.',
   'nightlife', 'Day Party', array['Day Party','Patio','Country'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 6, time '16:00', null,
   null, false, null, null, 'Desert 5 Spot DC', true),

  ('d5dc_dusty_boots_sun', 'desert_5_spot',
   'Dusty Boots Day Party — Patio Party',
   'Patio day party — country tunes, sunshine, and cold drinks, every Sunday afternoon.',
   'nightlife', 'Day Party', array['Day Party','Patio','Country'],
   'Desert 5 Spot', '400 Morse St NE, Washington, DC 20002', 'Union Market', 0, time '16:00', null,
   null, false, null, null, 'Desert 5 Spot DC', true)
on conflict (source_key) do update set
  event_source = excluded.event_source,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  tag = excluded.tag,
  tags = excluded.tags,
  venue_name = excluded.venue_name,
  venue_address = excluded.venue_address,
  neighborhood = excluded.neighborhood,
  weekday = excluded.weekday,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  price_label = excluded.price_label,
  is_free = excluded.is_free,
  external_url = excluded.external_url,
  image_url = excluded.image_url,
  source_name = excluded.source_name,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5) Materialize now (also prunes the old undated + past desert_5_spot rows)
-- ---------------------------------------------------------------------------
select public.refresh_recurring_venue_events(60);
