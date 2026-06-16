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
    (
      select coalesce(array_agg(tag), '{}'::text[])
      from unnest(coalesce(events.tags, '{}')) as tag
      where lower(tag) not in (
        'arts', 'art', 'performing-arts', 'performing arts', 'museums', 'museum', 'smithsonian',
        'performance', 'theater', 'theatre', 'stage show', 'touring show', 'family show',
        'live show', 'ticketed', 'opera', 'curtain call', 'limited run', 'tour stop',
        'ensemble', 'solo set', 'matinee', 'late show', 'new work', 'classic story',
        'reserved seating'
      )
    ) as cleaned_tags
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
    || case when text ~* 'broadway|moulin rouge|suffs|lion king|wicked|hamilton' then array['Broadway'] else '{}'::text[] end
    || case when text ~* '\m(play|drama)\M|othello|hamlet|macbeth' then array['Play'] else '{}'::text[] end
    || case when text ~* 'musical|moulin rouge|suffs|wicked|hamilton|lion king' then array['Musical'] else '{}'::text[] end
    || case when text ~* 'opera' and text !~* 'opera house' then array['Opera'] else '{}'::text[] end
    || case when text ~* 'touring|\mtour\M' then array['Touring Production'] else '{}'::text[] end
    || case when text ~* 'family|kids|children|bluey|disney' then array['Family Friendly'] else '{}'::text[] end
    || case when text ~* 'dance|ballet|choreo' then array['Dance'] else '{}'::text[] end
    || case when text ~* 'film|cinema|screening|movie' then array['Film'] else '{}'::text[] end
    || case when text ~* 'gallery|exhibit|exhibition|installation|visual art' then array['Gallery'] else '{}'::text[] end
    || case when text ~* 'symphony|orchestra|classical|chamber music' then array['Classical'] else '{}'::text[] end
    || case when text ~* 'cabaret' then array['Cabaret'] else '{}'::text[] end
    || case when text ~* '\mdrag\M|drag queen|drag brunch' then array['Drag'] else '{}'::text[] end
    || case when text ~* 'magic|illusionist' then array['Magic'] else '{}'::text[] end
    || case when text ~* 'storytelling|story slam|moth' then array['Storytelling'] else '{}'::text[] end
    || case when text ~* 'spoken word|poetry' then array['Spoken Word'] else '{}'::text[] end
    || array[
      case (abs(hashtext(text)) % 10)
        when 0 then 'Curtain Call'
        when 1 then 'Limited Run'
        when 2 then 'Tour Stop'
        when 3 then 'Ensemble'
        when 4 then 'Solo Set'
        when 5 then 'Matinee'
        when 6 then 'Late Show'
        when 7 then 'New Work'
        when 8 then 'Classic Story'
        else 'Reserved Seating'
      end,
      case ((abs(hashtext(text)) + 4) % 10)
        when 0 then 'Curtain Call'
        when 1 then 'Limited Run'
        when 2 then 'Tour Stop'
        when 3 then 'Ensemble'
        when 4 then 'Solo Set'
        when 5 then 'Matinee'
        when 6 then 'Late Show'
        when 7 then 'New Work'
        when 8 then 'Classic Story'
        else 'Reserved Seating'
      end
    ] as new_tags
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
        and lower(tag) not in ('arts', 'art', 'performing-arts', 'performing arts', 'museum', 'museums', 'smithsonian', 'performance', 'theater', 'theatre', 'stage show', 'touring show', 'family show', 'live show', 'ticketed', 'opera')
      order by lower(tag), first_seen
    ) deduped
  ),
  updated_at = now()
from tagged
where events.id = tagged.id;
