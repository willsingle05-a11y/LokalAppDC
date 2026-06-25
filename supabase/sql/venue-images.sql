alter table public.venues add column if not exists image_url text;

create or replace function public.venue_image_key(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(trim(coalesce(value, ''))), '\s*\([^)]*\)\s*', ' ', 'g'),
          '^the ', ''
        ),
        ' (bar|cafe|lounge|tavern|dc)$', ''
      ),
      '\s+', ' ', 'g'
    ),
    '[^a-z0-9]+', '', 'g'
  );
$$;


insert into public.venues (
  name,
  address,
  venue_type,
  neighborhood,
  source_name,
  source_key,
  raw_data,
  image_url,
  imported_at,
  created_at,
  updated_at
)
select
  alias.name,
  source.address,
  'museum',
  coalesce(source.neighborhood, 'DC'),
  'Lokal venue image alias',
  'venue-alias:' || public.venue_image_key(alias.name),
  jsonb_build_object('aliases', alias.source_name, 'source_venue', source.name),
  source.image_url,
  now(),
  now(),
  now()
from (values
  ('American History Museum', 'National Museum of American History'),
  ('Asian Art Museum', 'National Museum of Asian Art'),
  ('American Indian Museum DC', 'National Museum of the American Indian'),
  ('Portrait Gallery', 'National Portrait Gallery'),
  ('Natural History Museum', 'Smithsonian National Museum of Natural History'),
  ('African American History and Culture Museum', 'National Museum of African American History and Culture')
) as alias(name, source_name)
join public.venues source
  on public.venue_image_key(source.name) = public.venue_image_key(alias.source_name)
where source.image_url is not null
  and source.image_url <> ''
on conflict (source_key) do update
set address = coalesce(excluded.address, public.venues.address),
    venue_type = excluded.venue_type,
    neighborhood = coalesce(excluded.neighborhood, public.venues.neighborhood),
    source_name = excluded.source_name,
    raw_data = public.venues.raw_data || excluded.raw_data,
    image_url = excluded.image_url,
    updated_at = now();
create or replace function public.apply_venue_image_to_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.image_url is null or new.image_url = '' then
    select venue.image_url into new.image_url
    from public.venues venue
    where venue.image_url is not null
      and venue.image_url <> ''
      and public.venue_image_key(venue.name) <> ''
      and (
        public.venue_image_key(venue.name) = public.venue_image_key(coalesce(new.venue_name, new.venue, ''))
        or public.venue_image_key(coalesce(new.title, '')) like '%' || public.venue_image_key(venue.name) || '%'
        or public.venue_image_key(coalesce(new.description, '')) like '%' || public.venue_image_key(venue.name) || '%'
        or (
          length(public.venue_image_key(coalesce(new.venue_name, new.venue, ''))) > 5
          and length(public.venue_image_key(venue.name)) > 5
          and public.venue_image_key(venue.name) like public.venue_image_key(coalesce(new.venue_name, new.venue, '')) || '%'
        )
      )
    order by
      (public.venue_image_key(venue.name) = public.venue_image_key(coalesce(new.venue_name, new.venue, ''))) desc,
      length(public.venue_image_key(venue.name)) desc
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_venue_image_to_event on public.events;
create trigger assign_venue_image_to_event
before insert or update of venue_name, venue, image_url on public.events
for each row execute function public.apply_venue_image_to_event();

create or replace function public.refresh_venue_event_images()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_updated integer;
begin
  with matched_events as (
    select distinct on (event.id)
      event.id,
      venue.image_url
    from public.events event
    join public.venues venue
      on venue.image_url is not null
      and venue.image_url <> ''
      and public.venue_image_key(venue.name) <> ''
      and (
        public.venue_image_key(venue.name) = public.venue_image_key(coalesce(event.venue_name, event.venue, ''))
        or public.venue_image_key(coalesce(event.title, '')) like '%' || public.venue_image_key(venue.name) || '%'
        or public.venue_image_key(coalesce(event.description, '')) like '%' || public.venue_image_key(venue.name) || '%'
        or (
          length(public.venue_image_key(coalesce(event.venue_name, event.venue, ''))) > 5
          and length(public.venue_image_key(venue.name)) > 5
          and public.venue_image_key(venue.name) like public.venue_image_key(coalesce(event.venue_name, event.venue, '')) || '%'
        )
      )
    order by
      event.id,
      (public.venue_image_key(venue.name) = public.venue_image_key(coalesce(event.venue_name, event.venue, ''))) desc,
      length(public.venue_image_key(venue.name)) desc
  )
  update public.events event
  set image_url = matched_events.image_url,
      updated_at = now()
  from matched_events
  where event.id = matched_events.id
    and event.image_url is distinct from matched_events.image_url;
  get diagnostics rows_updated = row_count;
  return rows_updated;
end;
$$;

revoke all on function public.refresh_venue_event_images() from public, anon, authenticated;
