with schedule (external_key, weekday, starts_at, ends_at, timing_tag) as (
  values
    ('the-admiral-mon', 1, time '16:00', time '18:00', 'After work'),
    ('the-admiral-tue', 2, time '16:00', time '18:00', 'After work'),
    ('the-admiral-wed', 3, time '16:00', time '22:00', 'Evening'),
    ('the-admiral-thu', 4, time '16:00', time '18:00', 'After work'),
    ('the-admiral-fri', 5, time '16:00', time '18:00', 'After work')
), occurrences as (
  select
    schedule.*,
    current_date + day_offset as event_date
  from schedule
  cross join generate_series(0, 7) as day_offset
  where extract(dow from current_date + day_offset) = schedule.weekday
)
insert into public.events (
  source, external_id, title, description, category, tag, tags,
  venue_name, venue, venue_address, neighborhood, date, time, starts_at,
  ends_at, timezone, price, ticket_url, external_url, is_free, status,
  last_seen_at, raw_json
)
select
  'happy-hours',
  external_key || '-' || to_char(event_date, 'YYYY-MM-DD'),
  'The Admiral happy hour',
  '$10 cocktails, $35 cocktail pitcher, $6 beers, $11.25 wine, $6.50 shots.',
  'happy-hours',
  'Happy hour',
  array['Happy hour', 'Cocktails', 'Cocktail pitchers', 'Beer', 'Wine', 'Shots', timing_tag],
  'The Admiral',
  'The Admiral',
  '1 Dupont Cir NW, Washington, DC 20036',
  'Dupont Circle',
  event_date,
  to_char(starts_at, 'FMHH12:MI AM') || ' - ' || to_char(ends_at, 'FMHH12:MI AM'),
  (event_date + starts_at) at time zone 'America/New_York',
  (event_date + ends_at) at time zone 'America/New_York',
  'America/New_York',
  'Cocktails from $10',
  'https://www.theadmiraldc.com/',
  'https://www.theadmiraldc.com/',
  false,
  'published',
  now(),
  jsonb_build_object('happy_hour', true, 'source_url', 'https://www.theadmiraldc.com/')
from occurrences
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
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  price = excluded.price,
  ticket_url = excluded.ticket_url,
  external_url = excluded.external_url,
  last_seen_at = now(),
  raw_json = excluded.raw_json;
