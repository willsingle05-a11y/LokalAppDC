-- Backfill only prices verified from public venue ticket pages.
-- Unknown Ticketmaster/MLB prices stay unknown until an API/source exposes them.

update public.events
set
  price_min = 40,
  price_max = 68,
  is_free = false,
  updated_at = now()
where id = 2750
  and coalesce(price_min, 0) = 0;

update public.events
set
  price_min = 40,
  price_max = 68,
  is_free = false,
  updated_at = now()
where lower(title) = lower('Fulton Lee - Sing With Me Tour 2026')
  and lower(coalesce(venue_name, venue, '')) = lower('Union Stage')
  and coalesce(price_min, 0) = 0;

update public.events
set
  price_min = 34,
  price_max = null,
  is_free = false,
  updated_at = now()
where id = 2793
  and coalesce(price_min, 0) = 0;
