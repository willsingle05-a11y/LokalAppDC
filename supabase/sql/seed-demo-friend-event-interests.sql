-- Demo friend-interest rows used by the app to show real Supabase-backed
-- "friends are interested" signals. Safe to rerun.

with pairs(full_name, event_id, type) as (
  values
    ('Ana Lopez', 59891, 'save'),
    ('Ana Lopez', 171808, 'going'),
    ('Marcus Reed', 59981, 'save'),
    ('Marcus Reed', 172200, 'going'),
    ('Jules Kim', 173164, 'save'),
    ('Jules Kim', 59891, 'going'),
    ('Dev Shah', 172200, 'save'),
    ('Dev Shah', 59964, 'going'),
    ('Elena Torres', 171808, 'save'),
    ('Elena Torres', 59926, 'going')
), resolved as (
  select p.id as user_id, pairs.event_id, pairs.type
  from pairs
  join public."Profiles" p on p.display_name = pairs.full_name
  join public.events e on e.id = pairs.event_id
)
insert into public.event_interactions (user_id, event_id, type)
select resolved.user_id, resolved.event_id, resolved.type
from resolved
where not exists (
  select 1
  from public.event_interactions existing
  where existing.user_id = resolved.user_id
    and existing.event_id = resolved.event_id
);
