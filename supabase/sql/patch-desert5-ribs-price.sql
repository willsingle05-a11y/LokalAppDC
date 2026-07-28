-- Set the known price for Desert 5 Spot's recurring all-you-can-eat ribs night.
-- This updates both the recurring schedule and all already materialized event rows.

update public.recurring_venue_event_schedules
set price_label = '$35',
    is_free = false,
    updated_at = now()
where source_key = 'd5dc_ayce_ribs_thu';

update public.events
set price = '$35',
    is_free = false,
    updated_at = now()
where source = 'desert_5_spot'
  and external_id like 'd5dc_ayce_ribs_thu-%';

select public.refresh_recurring_venue_events(60);

select external_id, title, venue_name, date, time, price, is_free
from public.events
where source = 'desert_5_spot'
  and external_id like 'd5dc_ayce_ribs_thu-%'
order by starts_at
limit 10;
