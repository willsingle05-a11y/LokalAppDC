-- Narrow read path for showing which friends are interested in visible events.
-- This avoids making the whole event_interactions table publicly selectable.

create or replace function public.friend_event_interests(friend_ids uuid[], event_ids bigint[])
returns table(user_id uuid, event_id bigint, type text)
language sql
security definer
set search_path = public
as $function$
  select ei.user_id, ei.event_id, ei.type
  from public.event_interactions ei
  where ei.user_id = any(friend_ids)
    and ei.event_id = any(event_ids)
    and ei.type in ('save', 'going', 'share');
$function$;

grant execute on function public.friend_event_interests(uuid[], bigint[]) to anon, authenticated;
