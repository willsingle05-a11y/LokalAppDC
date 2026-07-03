-- Fix: Washingtonian events were inserted as status='published' but the
-- enforce_dc_events_before_write trigger (see enforce-dc-events.sql) re-flagged
-- 47 of 49 to 'hidden'. Their venue_address values are bare venue names
-- ("9:30 Club", "Howard Theatre") with no "Washington, DC" text and no lat/lng,
-- so event_is_in_dc() could not confirm them as DC and hid them server-side.
--
-- Washingtonian is a hand-curated DC-area guide (some picks are at metro venues
-- like Wolf Trap or Strathmore). Exempt that source from the auto-hide trigger,
-- mirroring the app-side isSupabaseEventInDc() bypass, then re-publish the rows.
--
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run.

begin;

create or replace function public.hide_non_dc_event()
returns trigger
language plpgsql
as $$
begin
  -- Keep hand-curated Washingtonian picks even at metro-area venues.
  if coalesce(new.source, '') <> 'washingtonian'
     and not public.event_is_in_dc(new) then
    new.status := 'hidden';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Re-publish the rows the old trigger hid on insert. The updated trigger now
-- leaves this status in place for washingtonian-source events.
update public.events
set status = 'published', updated_at = now()
where source = 'washingtonian'
  and status = 'hidden';

commit;
