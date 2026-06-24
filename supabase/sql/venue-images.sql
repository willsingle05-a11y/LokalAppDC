alter table public.venues add column if not exists image_url text;

create or replace function public.venue_image_key(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    regexp_replace(regexp_replace(lower(trim(coalesce(value, ''))), '^the ', ''), ' (bar|cafe|lounge|tavern)$', ''),
    '[^a-z0-9]+', '', 'g'
  );
$$;

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
      and public.venue_image_key(venue.name) = public.venue_image_key(coalesce(new.venue_name, new.venue, ''))
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
  update public.events event
  set image_url = venue.image_url,
      updated_at = now()
  from public.venues venue
  where venue.image_url is not null
    and venue.image_url <> ''
    and public.venue_image_key(venue.name) = public.venue_image_key(coalesce(event.venue_name, event.venue, ''))
    and event.image_url is distinct from venue.image_url;
  get diagnostics rows_updated = row_count;
  return rows_updated;
end;
$$;

revoke all on function public.refresh_venue_event_images() from public, anon, authenticated;
