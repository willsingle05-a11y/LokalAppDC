-- Read-only duplicate audit for Lokal events.
-- Reports duplicate groups by:
-- 1. source + external_id when both are present
-- 2. normalized title + normalized venue + start timestamp/date/time
--
-- Keep recommendation matches dedupe-events.sql:
-- image, ticket URL, description, external ID, most recently updated, lowest id.

with ranked as (
  select
    id,
    title,
    coalesce(venue_name, venue) as venue,
    date,
    time,
    starts_at,
    source,
    external_id,
    ticket_url,
    image_url,
    description,
    updated_at,
    regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9]+', '', 'g') as normalized_title,
    regexp_replace(lower(trim(coalesce(venue_name, venue, ''))), '[^a-z0-9]+', '', 'g') as normalized_venue,
    coalesce(starts_at::text, concat_ws(' ', date::text, lower(trim(coalesce(time, ''))))) as normalized_start,
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
    ) as normalized_rank,
    count(*) over (
      partition by
        regexp_replace(lower(trim(coalesce(title, ''))), '[^a-z0-9]+', '', 'g'),
        regexp_replace(lower(trim(coalesce(venue_name, venue, ''))), '[^a-z0-9]+', '', 'g'),
        coalesce(starts_at::text, concat_ws(' ', date::text, lower(trim(coalesce(time, '')))))
    ) as normalized_count,
    row_number() over (
      partition by source, external_id
      order by
        case when image_url is not null and image_url <> '' then 0 else 1 end,
        case when ticket_url is not null and ticket_url <> '' then 0 else 1 end,
        case when description is not null and description <> '' then 0 else 1 end,
        updated_at desc nulls last,
        id asc
    ) as source_external_rank,
    count(*) over (
      partition by source, external_id
    ) as source_external_count
  from public.events
  where
    title is not null
    and title <> ''
    and (starts_at is not null or date is not null or time is not null)
),
source_external_duplicates as (
  select
    'source_external_id' as duplicate_type,
    concat_ws('|', source, external_id) as duplicate_key,
    source_external_count as duplicate_count,
    case when source_external_rank = 1 then 'keep' else 'delete' end as recommendation,
    id,
    title,
    venue,
    date,
    time,
    starts_at,
    source,
    external_id,
    updated_at
  from ranked
  where
    external_id is not null
    and external_id <> ''
    and source_external_count > 1
),
normalized_duplicates as (
  select
    'normalized_event' as duplicate_type,
    md5(concat_ws('|', normalized_title, normalized_venue, normalized_start)) as duplicate_key,
    normalized_count as duplicate_count,
    case when normalized_rank = 1 then 'keep' else 'delete' end as recommendation,
    id,
    title,
    venue,
    date,
    time,
    starts_at,
    source,
    external_id,
    updated_at
  from ranked
  where normalized_count > 1
)
select *
from source_external_duplicates

union all

select *
from normalized_duplicates
order by duplicate_type, duplicate_key, recommendation desc, updated_at desc nulls last, id asc;
