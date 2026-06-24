alter table public.venues add column if not exists image_url text;

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
      and regexp_replace(lower(venue.name), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(coalesce(new.venue_name, new.venue, '')), '[^a-z0-9]+', '', 'g')
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
    and regexp_replace(lower(venue.name), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(coalesce(event.venue_name, event.venue, '')), '[^a-z0-9]+', '', 'g')
    and event.image_url is distinct from venue.image_url;
  get diagnostics rows_updated = row_count;
  return rows_updated;
end;
$$;

revoke all on function public.refresh_venue_event_images() from public, anon, authenticated;
