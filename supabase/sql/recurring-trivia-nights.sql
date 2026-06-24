create table if not exists public.recurring_trivia_schedules (
  source_key text primary key,
  venue_name text not null,
  venue_address text not null,
  neighborhood text not null,
  recurrence_kind text not null check (recurrence_kind in ('weekly', 'monthly-ordinal')),
  weekday smallint not null check (weekday between 0 and 6),
  ordinal_week smallint check (ordinal_week between -1 and 5),
  starts_at time not null,
  host text,
  description text not null,
  tags text[] not null default '{}',
  source_name text,
  social_source text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.recurring_trivia_schedules enable row level security;

create or replace function public.refresh_recurring_trivia_events(days_ahead integer default 60)
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
  where source = 'trivia-nights'
    and date < local_today;

  insert into public.events (
    source, external_id, title, description, category, tag, tags, venue_name, venue,
    venue_address, neighborhood, date, time, price, timezone, is_free, status,
    last_seen_at, raw_json, starts_at, ends_at, is_recurring
  )
  select
    'trivia-nights',
    schedule.source_key || '-' || to_char(occurrence.event_date, 'YYYY-MM-DD'),
    schedule.venue_name || ' trivia night',
    schedule.description,
    'trivia-nights',
    'Trivia night',
    schedule.tags,
    schedule.venue_name,
    schedule.venue_name,
    schedule.venue_address,
    schedule.neighborhood,
    occurrence.event_date,
    trim(to_char(schedule.starts_at, 'FMHH12:MI AM')),
    null,
    'America/New_York',
    false,
    'published',
    now(),
    jsonb_build_object('trivia_night', true, 'host', schedule.host, 'recurrence_kind', schedule.recurrence_kind, 'ordinal_week', schedule.ordinal_week, 'social_source', schedule.social_source),
    ((occurrence.event_date + schedule.starts_at) at time zone 'America/New_York'),
    ((occurrence.event_date + schedule.starts_at + interval '2 hours') at time zone 'America/New_York'),
    true
  from public.recurring_trivia_schedules schedule
  cross join lateral (
    select local_today + day_offset as event_date
    from generate_series(0, greatest(days_ahead, 1)) as day_offset
  ) occurrence
  where schedule.is_active
    and extract(dow from occurrence.event_date) = schedule.weekday
    and (
      schedule.recurrence_kind = 'weekly'
      or (
        schedule.recurrence_kind = 'monthly-ordinal'
        and (
          (schedule.ordinal_week = -1 and occurrence.event_date + 7 > (date_trunc('month', occurrence.event_date) + interval '1 month')::date)
          or (schedule.ordinal_week > 0 and ((extract(day from occurrence.event_date)::int - 1) / 7 + 1) = schedule.ordinal_week)
        )
      )
    )
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
    price = null,
    timezone = excluded.timezone,
    is_free = excluded.is_free,
    status = excluded.status,
    last_seen_at = excluded.last_seen_at,
    raw_json = excluded.raw_json,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_recurring = true,
    updated_at = now();

  get diagnostics rows_written = row_count;
  return rows_written;
end;
$$;

revoke all on function public.refresh_recurring_trivia_events(integer) from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'refresh-lokal-trivia-nights') then
    perform cron.schedule(
      'refresh-lokal-trivia-nights',
      '25 5 * * *',
      'select public.refresh_recurring_trivia_events(60);'
    );
  end if;
end;
$$;
