create table if not exists public.recurring_happy_hour_schedules (
  source_key text primary key,
  venue_name text not null,
  venue_address text not null,
  neighborhood text not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  specials text not null,
  price_label text not null,
  tags text[] not null default '{}',
  source_url text,
  source_name text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.recurring_happy_hour_schedules enable row level security;

create or replace function public.refresh_recurring_happy_hour_events(days_ahead integer default 60)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  local_today date := (now() at time zone 'America/New_York')::date;
  rows_written integer;
begin
  delete from public.events
  where source = 'happy-hours'
    and date < local_today;

  insert into public.events (
    source, external_id, title, description, category, tag, tags, venue_name, venue,
    venue_address, neighborhood, date, time, price, ticket_url, external_url, timezone,
    is_free, status, last_seen_at, raw_json, starts_at, ends_at, is_recurring, image_url
  )
  select
    'happy-hours',
    schedule.source_key || '-' || to_char(occurrence.event_date, 'YYYY-MM-DD'),
    schedule.venue_name || ' happy hour',
    schedule.specials,
    'happy-hours',
    'Happy hour',
    schedule.tags,
    schedule.venue_name,
    schedule.venue_name,
    schedule.venue_address,
    schedule.neighborhood,
    occurrence.event_date,
    trim(to_char(schedule.starts_at, 'FMHH12:MI AM')) || ' - ' || trim(to_char(schedule.ends_at, 'FMHH12:MI AM')),
    schedule.price_label,
    source.website_url,
    source.website_url,
    'America/New_York',
    false,
    'published',
    now(),
    jsonb_build_object('happy_hour', true, 'source_name', schedule.source_name),
    ((occurrence.event_date + schedule.starts_at) at time zone 'America/New_York'),
    ((occurrence.event_date + schedule.ends_at + case when schedule.ends_at <= schedule.starts_at then interval '1 day' else interval '0 day' end) at time zone 'America/New_York'),
    true,
    case
      when source.website_url is null or source.website_url = '' then null
      else 'https://www.google.com/s2/favicons?domain=' || regexp_replace(source.website_url, '^https?://([^/]+).*$', '\1') || '&sz=256'
    end
  from public.recurring_happy_hour_schedules schedule
  left join lateral (
    select venue.website_url
    from public.venues venue
    where lower(regexp_replace(venue.name, '[^a-z0-9]+', '', 'g')) = lower(regexp_replace(schedule.venue_name, '[^a-z0-9]+', '', 'g'))
      and venue.website_url is not null
      and venue.website_url <> ''
    limit 1
  ) venue_lookup on true
  cross join lateral (
    select coalesce(schedule.source_url, venue_lookup.website_url) as website_url
  ) source
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

revoke all on function public.refresh_recurring_happy_hour_events(integer) from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'refresh-lokal-happy-hours') then
    perform cron.schedule(
      'refresh-lokal-happy-hours',
      '15 5 * * *',
      'select public.refresh_recurring_happy_hour_events(60);'
    );
  end if;
end;
$$;
