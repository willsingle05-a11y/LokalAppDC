-- Keeps event_interactions usable even though the older event_tags/tags join
-- tables are not part of this Supabase project. Interest weights now derive
-- from the canonical events.tags array plus category/tag fallbacks.

create or replace function public.update_interest_weights(p_user_id uuid)
returns void
language plpgsql
security definer
as $function$
begin
  update public.user_interests ui
  set weight = least(ui.weight + 0.2, 3.0),
      updated_at = now()
  from public.event_interactions ei
  join public.events e on e.id = ei.event_id
  cross join lateral (
    select lower(regexp_replace(value, '[^a-z0-9]+', '-', 'g')) as slug
    from unnest(
      array_remove(
        coalesce(e.tags, '{}'::text[])
        || array[coalesce(e.tag, ''), coalesce(e.category, '')],
        ''
      )
    ) value
  ) event_tag
  where ei.user_id = p_user_id
    and ui.user_id = p_user_id
    and ui.tag_slug = trim(both '-' from event_tag.slug)
    and ei.type in ('save', 'going', 'share')
    and ei.created_at > now() - interval '7 days';

  update public.user_interests ui
  set weight = greatest(ui.weight - 0.1, 0.1),
      updated_at = now()
  from public.event_interactions ei
  join public.events e on e.id = ei.event_id
  cross join lateral (
    select lower(regexp_replace(value, '[^a-z0-9]+', '-', 'g')) as slug
    from unnest(
      array_remove(
        coalesce(e.tags, '{}'::text[])
        || array[coalesce(e.tag, ''), coalesce(e.category, '')],
        ''
      )
    ) value
  ) event_tag
  where ei.user_id = p_user_id
    and ui.user_id = p_user_id
    and ui.tag_slug = trim(both '-' from event_tag.slug)
    and ei.type = 'skip'
    and ei.created_at > now() - interval '7 days';
end;
$function$;
