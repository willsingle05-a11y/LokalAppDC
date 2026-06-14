-- Remove duplicate Lokal events while keeping the most complete row.
-- Duplicate key: normalized title + normalized venue + start timestamp/date/time.
-- Keep preference: image, ticket URL, description, external ID, most recently updated.

with normalized as (
  select
    id,
    title,
    venue_name,
    venue,
    date,
    time,
    starts_at,
    source,
    external_id,
    updated_at,
    md5(concat_ws('|',
      regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9]+', '', 'g'),
      regexp_replace(lower(trim(coalesce(venue_name, venue, ''))), '[^a-z0-9]+', '', 'g'),
      coalesce(starts_at::text, concat_ws(' ', date::text, lower(trim(coalesce(time, '')))))
    )) as duplicate_key,
    row_number() over (
      partition by
        regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9]+', '', 'g'),
        regexp_replace(lower(trim(coalesce(venue_name, venue, ''))), '[^a-z0-9]+', '', 'g'),
        coalesce(starts_at::text, concat_ws(' ', date::text, lower(trim(coalesce(time, '')))))
      order by
        case when image_url is not null and image_url <> '' then 0 else 1 end,
        case when ticket_url is not null and ticket_url <> '' then 0 else 1 end,
        case when description is not null and description <> '' then 0 else 1 end,
        case when external_id is not null and external_id <> '' then 0 else 1 end,
        updated_at desc nulls last,
        id asc
    ) as duplicate_rank,
    count(*) over (
      partition by
        regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9]+', '', 'g'),
        regexp_replace(lower(trim(coalesce(venue_name, venue, ''))), '[^a-z0-9]+', '', 'g'),
        coalesce(starts_at::text, concat_ws(' ', date::text, lower(trim(coalesce(time, '')))))
    ) as duplicate_count
  from public.events
  where
    title is not null
    and title <> ''
    and (starts_at is not null or date is not null or time is not null)
),
deleted as (
  delete from public.events events
  using normalized duplicates
  where
    events.id = duplicates.id
    and duplicates.duplicate_count > 1
    and duplicates.duplicate_rank > 1
  returning
    events.id,
    events.title,
    coalesce(events.venue_name, events.venue) as venue,
    events.date,
    events.time,
    events.starts_at,
    events.source,
    events.external_id
)
select
  count(*) as deleted_duplicate_events
from deleted;
