with event_text as (
  select
    id,
    concat_ws(' ', title, description, venue_name, venue, array_to_string(coalesce(tags, '{}'), ' ')) as text
  from public.events
  where category = 'performing-arts'
),
museum_rows as (
  update public.events events
  set
    category = 'museums',
    tags = (
      select array_agg(distinct tag)
      from unnest(
        array_remove(array_remove(array_remove(coalesce(events.tags, '{}'), 'Arts'), 'Art'), 'performing-arts')
        || array['Museums']
        || case when event_text.text ~* 'smithsonian|hirshhorn|renwick|portrait gallery' then array['Smithsonian'] else '{}'::text[] end
      ) as tag
      where tag is not null and tag <> ''
    ),
    updated_at = now()
  from event_text
  where events.id = event_text.id
    and event_text.text ~* 'museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history'
  returning events.id
),
performing_rows as (
  select
    events.id,
    event_text.text,
    array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(coalesce(events.tags, '{}'), 'Arts'), 'Art'), 'performing-arts'), 'Museums'), 'Museum'), 'Smithsonian') as cleaned_tags
  from public.events events
  join event_text on event_text.id = events.id
  where events.category = 'performing-arts'
    and not exists (select 1 from museum_rows where museum_rows.id = events.id)
),
tagged as (
  select
    id,
    cleaned_tags
    || case when text ~* 'comedy|stand[- ]?up|standup|improv|comic|open mic' then array['Comedy'] else '{}'::text[] end
    || case when text ~* 'theatre|theater|play|stage|drama' then array['Theater'] else '{}'::text[] end
    || case when text ~* 'musical|broadway|opera' then array['Musical'] else '{}'::text[] end
    || case when text ~* 'dance|ballet|choreo' then array['Dance'] else '{}'::text[] end
    || case when text ~* 'film|cinema|screening|movie' then array['Film'] else '{}'::text[] end
    || case when text ~* 'gallery|exhibit|exhibition|installation|visual art' then array['Gallery'] else '{}'::text[] end
    || case when text ~* 'symphony|orchestra|classical|chamber music' then array['Classical'] else '{}'::text[] end
    || case when text ~* 'performance|performing|cabaret|spoken word|poetry' then array['Performance'] else '{}'::text[] end
    || array['Performance', 'Live Show'] as new_tags
  from performing_rows
)
update public.events events
set
  tags = (
    select array_agg(tag order by first_seen)
    from (
      select distinct on (lower(tag)) tag, first_seen
      from unnest(tagged.new_tags) with ordinality as tags(tag, first_seen)
      where tag is not null
        and tag <> ''
        and lower(tag) not in ('arts', 'art', 'performing-arts', 'performing arts', 'museum', 'museums', 'smithsonian')
      order by lower(tag), first_seen
    ) deduped
  ),
  updated_at = now()
from tagged
where events.id = tagged.id;
