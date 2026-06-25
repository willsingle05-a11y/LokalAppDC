-- Pull explicit location details out of event descriptions and into event location fields.
-- This handles labeled lines such as Address:, Location:, Venue:, or Where:,
-- and fills missing venue data from known venues mentioned in description text.

create or replace function public.event_description_location_match(input_description text)
returns table(label text, value text)
language sql
stable
as $$
  select lower(match[1]) as label, trim(both ' .;,' from match[2]) as value
  from regexp_matches(coalesce(input_description, ''), '(?im)^\s*(address|location|where|venue)\s*:\s*([^\r\n]+)', 'n') as match
  limit 1;
$$;

create or replace function public.event_description_without_location_line(input_description text)
returns text
language sql
stable
as $$
  select nullif(
    trim(
      regexp_replace(
        coalesce(input_description, ''),
        '(?im)^\s*(address|location|where|venue)\s*:\s*[^\r\n]+\s*',
        '',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function public.pull_event_location_from_description()
returns trigger
language plpgsql
as $$
declare
  extracted record;
  matched_venue record;
  has_missing_venue boolean;
begin
  if new.description is null or btrim(new.description) = '' then
    return new;
  end if;

  select * into extracted
  from public.event_description_location_match(new.description)
  limit 1;

  if extracted.value is not null and extracted.value <> '' then
    if extracted.label = 'address'
       or extracted.value ~* '(^|[^a-z0-9])\d{1,6}\s+[[:alnum:].''& -]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|pl|place|ct|court|cir|circle|way|lane|ln)\b'
       or extracted.value ~* '\b(nw|ne|sw|se)\b|washington,\s*(dc|d\.c\.)|district of columbia'
    then
      if nullif(btrim(coalesce(new.venue_address, '')), '') is null then
        new.venue_address := extracted.value;
      end if;
    else
      if nullif(btrim(coalesce(new.venue_name, '')), '') is null or new.venue_name = 'Location in description' then
        new.venue_name := extracted.value;
      end if;
      if nullif(btrim(coalesce(new.venue, '')), '') is null or new.venue = 'Location in description' then
        new.venue := extracted.value;
      end if;
    end if;

    new.description := coalesce(public.event_description_without_location_line(new.description), new.description);
  end if;

  has_missing_venue := nullif(btrim(coalesce(new.venue_name, new.venue, '')), '') is null
    or coalesce(new.venue_name, new.venue) = 'Location in description';

  if has_missing_venue then
    select venue.name, venue.address, venue.neighborhood
      into matched_venue
    from public.venues venue
    where lower(coalesce(new.description, '')) like '%' || lower(venue.name) || '%'
      and length(venue.name) >= 6
    order by length(venue.name) desc
    limit 1;

    if matched_venue.name is not null then
      new.venue_name := matched_venue.name;
      new.venue := matched_venue.name;
      if nullif(btrim(coalesce(new.venue_address, '')), '') is null then
        new.venue_address := matched_venue.address;
      end if;
      if nullif(btrim(coalesce(new.neighborhood, '')), '') is null then
        new.neighborhood := matched_venue.neighborhood;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists pull_event_location_from_description on public.events;
create trigger pull_event_location_from_description
before insert or update of description, venue_name, venue, venue_address
on public.events
for each row
execute function public.pull_event_location_from_description();

with matched as (
  select event.id, venue.name, venue.address, venue.neighborhood,
         row_number() over (partition by event.id order by length(venue.name) desc) as rank
  from public.events event
  join public.venues venue
    on lower(coalesce(event.description, '')) like '%' || lower(venue.name) || '%'
   and length(venue.name) >= 6
  where nullif(btrim(coalesce(event.venue_name, event.venue, '')), '') is null
     or coalesce(event.venue_name, event.venue) = 'Location in description'
), best as (
  select * from matched where rank = 1
), labeled as (
  select event.id, location.label, location.value
  from public.events event
  cross join lateral public.event_description_location_match(event.description) location
), updated as (
  update public.events event
  set venue_name = case
        when (nullif(btrim(coalesce(event.venue_name, '')), '') is null or event.venue_name = 'Location in description')
          and labeled.value is not null
          and labeled.label <> 'address'
          and labeled.value !~* '(^|[^a-z0-9])\d{1,6}\s+[[:alnum:].''& -]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|pl|place|ct|court|cir|circle|way|lane|ln)\b|\b(nw|ne|sw|se)\b|washington,\s*(dc|d\.c\.)|district of columbia'
          then labeled.value
        when (nullif(btrim(coalesce(event.venue_name, '')), '') is null or event.venue_name = 'Location in description')
          and best.name is not null
          then best.name
        else event.venue_name
      end,
      venue = case
        when (nullif(btrim(coalesce(event.venue, '')), '') is null or event.venue = 'Location in description')
          and labeled.value is not null
          and labeled.label <> 'address'
          and labeled.value !~* '(^|[^a-z0-9])\d{1,6}\s+[[:alnum:].''& -]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|pl|place|ct|court|cir|circle|way|lane|ln)\b|\b(nw|ne|sw|se)\b|washington,\s*(dc|d\.c\.)|district of columbia'
          then labeled.value
        when (nullif(btrim(coalesce(event.venue, '')), '') is null or event.venue = 'Location in description')
          and best.name is not null
          then best.name
        else event.venue
      end,
      venue_address = case
        when nullif(btrim(coalesce(event.venue_address, '')), '') is null
          and labeled.value is not null
          and (labeled.label = 'address'
            or labeled.value ~* '(^|[^a-z0-9])\d{1,6}\s+[[:alnum:].''& -]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|pl|place|ct|court|cir|circle|way|lane|ln)\b|\b(nw|ne|sw|se)\b|washington,\s*(dc|d\.c\.)|district of columbia')
          then labeled.value
        when nullif(btrim(coalesce(event.venue_address, '')), '') is null
          and best.address is not null
          then best.address
        else event.venue_address
      end,
      neighborhood = coalesce(nullif(event.neighborhood, ''), best.neighborhood),
      description = coalesce(public.event_description_without_location_line(event.description), event.description),
      updated_at = now()
  from labeled
  full join best on best.id = labeled.id
  where event.id = coalesce(labeled.id, best.id)
    and (
      labeled.id is not null
      or best.id is not null
    )
  returning event.id
)
select count(*) as updated_events from updated;

select public.refresh_venue_event_images();