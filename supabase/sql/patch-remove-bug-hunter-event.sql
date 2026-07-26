-- Remove the Bug Hunter event because its date is inaccurate.

select id, external_id, title, venue_name, venue, date, time, starts_at, source
from public.events
where title ilike '%bug hunter%'
   or title ilike '%bug hunt%'
   or description ilike '%bug hunter%'
   or description ilike '%bug hunt%'
order by starts_at nulls last;

delete from public.events
where title ilike '%bug hunter%'
   or title ilike '%bug hunt%'
   or description ilike '%bug hunter%'
   or description ilike '%bug hunt%';

select id, external_id, title, venue_name, venue, date, time, starts_at, source
from public.events
where title ilike '%bug hunter%'
   or title ilike '%bug hunt%'
   or description ilike '%bug hunter%'
   or description ilike '%bug hunt%'
order by starts_at nulls last;
