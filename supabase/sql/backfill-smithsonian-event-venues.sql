-- Backfill Smithsonian events whose venue fields are blank/generic but whose title or
-- description names a specific Smithsonian venue. This keeps cards from showing only
-- a neighborhood such as "Wharf" or generic "Washington, DC" when a real venue is known.

insert into public.venues (name, address, venue_type, neighborhood, source_name, source_key, raw_data, imported_at, created_at, updated_at)
values
  ('Smithsonian Castle', '1000 Jefferson Dr SW, Washington, DC 20560', 'Museum', 'National Mall', 'manual', 'venue:smithsoniancastle', '{"manual_location_backfill": true}'::jsonb, now(), now(), now()),
  ('U.S. Botanic Garden', '100 Maryland Ave SW, Washington, DC 20001', 'Museum', 'National Mall', 'manual', 'venue:usbotanicgarden', '{"manual_location_backfill": true}'::jsonb, now(), now(), now()),
  ('National Zoo', '3001 Connecticut Ave NW, Washington, DC 20008', 'Museum', 'Woodley Park', 'manual', 'venue:nationalzoo', '{"manual_location_backfill": true}'::jsonb, now(), now(), now())
on conflict (name, address) do update
set venue_type = coalesce(public.venues.venue_type, excluded.venue_type),
    neighborhood = coalesce(public.venues.neighborhood, excluded.neighborhood),
    raw_data = public.venues.raw_data || excluded.raw_data,
    updated_at = now();

with venue_rules as (
  select * from (values
    ('S. Dillon Ripley Center', 'ripley center|before-camp room|after-camp room'),
    ('National Museum of African American History and Culture', 'african american history|nmaahc|at the vanguard|black radio'),
    ('National Portrait Gallery', 'national portrait gallery|portrait gallery|america''s presidents|f street sidewalk'),
    ('Smithsonian American Art Museum', 'american art museum|saam'),
    ('National Air and Space Museum', 'air and space museum'),
    ('Natural History Museum', 'natural history museum|national museum of natural history'),
    ('American History Museum', 'american history museum|star-spangled banner'),
    ('American Indian Museum DC', 'american indian museum|national museum of the american indian|nmai'),
    ('Hirshhorn Museum', 'hirshhorn'),
    ('Smithsonian Castle', 'smithsonian castle|the castle|castle café|castle cafe'),
    ('National Museum of African Art', 'african art museum|national museum of african art'),
    ('National Gallery of Art', 'national gallery of art'),
    ('U.S. Botanic Garden', 'u\.s\. botanic garden|us botanic garden|botanic garden'),
    ('National Zoo', 'national zoo')
  ) as rule(venue_name, pattern)
), matched as (
  select event.id, rule.venue_name,
         row_number() over (partition by event.id order by length(rule.pattern) desc) as rank
  from public.events event
  join venue_rules rule on concat_ws(' ', event.title, event.description) ~* rule.pattern
  where event.source = 'smithsonian'
    and (
      nullif(btrim(coalesce(event.venue_name, event.venue, '')), '') is null
      or coalesce(event.venue_name, event.venue) = 'Location in description'
      or lower(coalesce(event.venue_name, event.venue, '')) in ('washington, dc','dc','shaw','national mall','downtown')
      or nullif(btrim(coalesce(event.venue_address, '')), '') is null
      or lower(event.venue_address) in ('washington, dc','dc')
    )
), best as (
  select matched.id, venue.name, venue.address, venue.neighborhood
  from matched
  join public.venues venue on lower(venue.name) = lower(matched.venue_name)
  where matched.rank = 1
), updated as (
  update public.events event
  set venue_name = case
        when nullif(btrim(coalesce(event.venue_name, '')), '') is null
          or event.venue_name = 'Location in description'
          or lower(event.venue_name) in ('washington, dc','dc','shaw','national mall','downtown')
          then best.name
        else event.venue_name
      end,
      venue = case
        when nullif(btrim(coalesce(event.venue, '')), '') is null
          or event.venue = 'Location in description'
          or lower(event.venue) in ('washington, dc','dc','shaw','national mall','downtown')
          then best.name
        else event.venue
      end,
      venue_address = case
        when nullif(btrim(coalesce(event.venue_address, '')), '') is null
          or lower(event.venue_address) in ('washington, dc','dc')
          then best.address
        else event.venue_address
      end,
      neighborhood = coalesce(nullif(event.neighborhood, ''), best.neighborhood, 'Washington, DC'),
      updated_at = now()
  from best
  where event.id = best.id
  returning event.id
)
select count(*) as updated_events from updated;

select public.refresh_venue_event_images();