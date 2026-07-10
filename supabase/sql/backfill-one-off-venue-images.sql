-- Backfill: give one-off (non-recurring) events the matching venue's image,
-- but ONLY when the event has no image of its own. This is the existing
-- venue->event image rule (public.apply_venue_image_to_event trigger /
-- public.refresh_venue_event_images) applied to pre-existing rows, scoped to
-- one-off events.
--
-- Impact (2026-07): ~1,580 of 2,034 image-less one-off events get a venue image.
-- The rest are at venues not in public.venues (Strathmore, Wolf Trap, etc.).
--
-- Safety: the events table also has the enforce_dc_events_before_write trigger,
-- which sets status='hidden' on any INSERT/UPDATE it can't confirm is in DC.
-- We therefore only touch rows that already pass public.event_is_in_dc(), so this
-- backfill can only ADD an image, never hide a currently-visible event.
--
-- Depends on public.venue_image_key() (from venue-images.sql). Safe to re-run.
-- Paste into Supabase -> SQL Editor -> Run.

with matched as (
  select distinct on (e.id)
    e.id,
    v.image_url
  from public.events e
  join public.venues v
    on v.image_url is not null
   and v.image_url <> ''
   and public.venue_image_key(v.name) <> ''
   and (
        -- normalized venue name is an exact match
        public.venue_image_key(v.name) = public.venue_image_key(coalesce(e.venue_name, e.venue, ''))
        -- or the venue name appears inside the event title / description
     or public.venue_image_key(coalesce(e.title, ''))       like '%' || public.venue_image_key(v.name) || '%'
     or public.venue_image_key(coalesce(e.description, '')) like '%' || public.venue_image_key(v.name) || '%'
        -- or the event's (more specific) venue name is a prefix of the venue row
     or (
          length(public.venue_image_key(coalesce(e.venue_name, e.venue, ''))) > 5
      and length(public.venue_image_key(v.name)) > 5
      and public.venue_image_key(v.name) like public.venue_image_key(coalesce(e.venue_name, e.venue, '')) || '%'
        )
   )
  where coalesce(e.is_recurring, false) = false           -- one-off events only
    and (e.image_url is null or e.image_url = '')          -- unless it already has an image
    and public.event_is_in_dc(e)                           -- never let the DC trigger hide a row
  order by
    e.id,
    -- prefer an exact venue-name match, then the most specific (longest) venue key
    (public.venue_image_key(v.name) = public.venue_image_key(coalesce(e.venue_name, e.venue, ''))) desc,
    length(public.venue_image_key(v.name)) desc
)
update public.events e
set image_url = matched.image_url
from matched
where e.id = matched.id
  and e.image_url is distinct from matched.image_url;
