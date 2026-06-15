-- Live demo cleanup for event rows already in Supabase.
-- Keeps one primary category, enriches multi-value tags, and hides rows outside Washington, DC.

with normalized as (
  select
    id,
    lower(coalesce(category, '')) as raw_category,
    concat_ws(
      ' ',
      coalesce(category, ''),
      coalesce(array_to_string("Category", ' '), ''),
      coalesce(tag, ''),
      coalesce(title, ''),
      coalesce(description, ''),
      coalesce(venue_name, ''),
      coalesce(venue, ''),
      coalesce(venue_address, ''),
      array_to_string(coalesce(tags, '{}'), ' ')
    ) as event_text,
    lower(concat_ws(
      ' ',
      coalesce(venue_address, ''),
      coalesce(neighborhood, ''),
      coalesce(venue_name, ''),
      coalesce(venue, '')
    )) as location_text
  from public.events
),
classified as (
  select
    id,
    case
      when raw_category in ('concerts', 'festivals', 'performing-arts', 'sports', 'community', 'expos', 'museums')
        then raw_category
      when event_text ~* 'museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history'
        then 'museums'
      when raw_category ~* 'concert|music|r&b|hip-hop|rap|jazz|latin|country|rock|pop'
        or event_text ~* 'concert|live music|music|r&b|hip-hop|rap|jazz|latin|country|rock|pop|dj|band|singer|songwriter'
        then 'concerts'
      when raw_category ~* 'theatre|theater|comedy|arts'
        or event_text ~* 'theatre|theater|performance art|performing|arts & theatre|gallery|art|exhibit|exhibition|comedy|film|cinema|dance|musical|opera'
        then 'performing-arts'
      when raw_category ~* 'sports'
        or event_text ~* 'baseball|basketball|football|soccer|hockey|sports|mlb|nba|nfl|nhl|nationals|mystics'
        then 'sports'
      when event_text ~* 'festival|fair'
        then 'festivals'
      when event_text ~* 'expo|conference|convention'
        then 'expos'
      else 'community'
    end as new_category,
    array_remove(array[
      case when event_text ~* 'museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history' then 'Museums' end,
      case when event_text ~* 'smithsonian|hirshhorn|renwick gallery|national portrait gallery|american art museum|national air and space museum|national museum of african american history|national museum of natural history|national museum of american history' then 'Smithsonian' end,
      case when event_text ~* 'concert|live music|music|r&b|hip-hop|rap|jazz|latin|country|rock|pop|dj|band|singer|songwriter' then 'Live Music' end,
      case when event_text ~* 'theatre|theater|performance art|performing|arts & theatre|gallery|art|exhibit|exhibition|musical|opera' then 'Arts' end,
      case when event_text ~* 'comedy|stand up|stand-up|improv' then 'Comedy' end,
      case when event_text ~* 'film|cinema|screening|movie' then 'Film' end,
      case when event_text ~* 'baseball|basketball|football|soccer|hockey|sports|mlb|nba|nfl|nhl|nationals|mystics' then 'Sports' end,
      case when event_text ~* 'food|drink|wine|beer|cocktail|restaurant|brunch|market' then 'Food & Drink' end,
      case when event_text ~* 'free|no cover|complimentary|free admission' then 'Free' end
    ], null) as inferred_tags,
    case
      when location_text ~* 'arlington|alexandria|bethesda|silver spring|national harbor|vienna|fairfax|falls church|rockville|hyattsville|college park|virginia|maryland|\bva\b|\bmd\b'
        and location_text !~* 'washington,\s*dc|district of columbia|\bdc\b'
        then false
      when latitude is not null and longitude is not null
        then latitude between 38.79 and 38.995 and longitude between -77.12 and -76.90
      else location_text ~* 'washington,\s*dc|district of columbia|\bdc\b'
        or source in ('manual', 'smithsonian')
    end as is_dc
  from normalized
  join public.events using (id)
),
tagged as (
  select
    *,
    case new_category
      when 'concerts' then 'Concerts'
      when 'festivals' then 'Festivals'
      when 'performing-arts' then 'Arts'
      when 'sports' then 'Sports'
      when 'community' then 'Community'
      when 'expos' then 'Expos'
      when 'museums' then 'Museums'
      else new_category
    end as category_tag
  from classified
)
update public.events events
set
  category = tagged.new_category,
  tags = (
    select array_agg(tag_value order by tag_order)
    from (
      select distinct on (lower(tag_value))
        tag_value,
        tag_order
      from unnest(array_cat(tagged.inferred_tags, array_cat(array[tagged.category_tag], coalesce(events.tags, '{}')))) with ordinality as tag_values(tag_value, tag_order)
      where tag_value is not null and tag_value <> ''
      order by lower(tag_value), tag_order
    ) deduped_tags
  ),
  status = case when tagged.is_dc then coalesce(events.status, 'published') else 'hidden' end,
  updated_at = now()
from tagged
where events.id = tagged.id;
