create or replace function public.event_is_in_dc(event_row public.events)
returns boolean
language plpgsql
stable
as $$
declare
  location_text text;
  event_lat double precision;
  event_lng double precision;
  has_dc_text boolean;
  has_non_dc_text boolean;
begin
  location_text := lower(concat_ws(
    ' ',
    coalesce(event_row.venue_address, ''),
    coalesce(event_row.neighborhood, ''),
    coalesce(event_row.venue_name, ''),
    coalesce(event_row.venue, ''),
    coalesce(event_row.raw_json #>> '{geo,address,formatted_address}', ''),
    coalesce(event_row.raw_json #>> '{geo,address,locality}', ''),
    coalesce(event_row.raw_json #>> '{geo,address,region}', '')
  ));

  event_lat := coalesce(event_row.latitude, event_row.lat);
  event_lng := coalesce(event_row.longitude, event_row.lng);

  has_dc_text := location_text ~* 'washington,\s*(dc|d\.c\.)|washington,\s*district of columbia|district of columbia|(^|[^a-z])d\.?c\.?([^a-z]|$)|(^|[^a-z])(nw|ne|sw|se)([^a-z]|$)';
  has_non_dc_text := location_text ~* '(^|[^a-z])(arlington|alexandria|bethesda|silver spring|national harbor|vienna|fairfax|falls church|rockville|hyattsville|college park|landover|tysons|mclean|reston|gaithersburg|laurel|bowie|annapolis|baltimore|virginia|maryland|va|md)([^a-z]|$)';

  if has_non_dc_text and not has_dc_text then
    return false;
  end if;

  if event_lat is not null and event_lng is not null then
    return event_lat between 38.79 and 38.995
      and event_lng between -77.12 and -76.90;
  end if;

  return has_dc_text;
end;
$$;

create or replace function public.hide_non_dc_event()
returns trigger
language plpgsql
as $$
begin
  if not public.event_is_in_dc(new) then
    new.status := 'hidden';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_dc_events_before_write on public.events;
create trigger enforce_dc_events_before_write
before insert or update on public.events
for each row execute function public.hide_non_dc_event();

update public.events
set status = 'hidden', updated_at = now()
where not public.event_is_in_dc(events);
