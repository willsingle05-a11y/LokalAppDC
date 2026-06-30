-- Allow the Lokal app's anon / publishable key to READ the venue directory so the
-- frontend can pull venues.image_url and use it as the image for events at that
-- venue. The events table is already publicly readable; venues currently is not
-- (RLS is enabled with no SELECT policy), so the app sees 0 rows.
--
-- Run this once in the Supabase SQL editor. Writes stay restricted — this only
-- exposes read access.

alter table public.venues enable row level security;

drop policy if exists "Public read venues" on public.venues;
create policy "Public read venues"
  on public.venues
  for select
  to anon, authenticated
  using (true);

-- RLS gates which rows are visible; this grants the role table-level access.
grant select on public.venues to anon, authenticated;

-- Sanity check after running (should return rows, not an empty set):
--   select name, image_url from public.venues where image_url is not null limit 5;
