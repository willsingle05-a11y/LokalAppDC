-- Normalize Ticketmaster categories that otherwise fall through as generic community.
-- Ticketmaster rows with no stored price payload keep price_min = 0 so the app shows Price unknown.

with normalized as (
  select
    id,
    lower(coalesce(category, '')) as raw_category,
    lower(concat_ws(
      ' ',
      coalesce(category, ''),
      coalesce(title, ''),
      coalesce(description, ''),
      coalesce(venue_name, ''),
      coalesce(venue, ''),
      array_to_string(coalesce(tags, '{}'), ' ')
    )) as text
  from public.events
  where source = 'ticketmaster'
),
classified as (
  select
    id,
    case
      when raw_category in ('concerts', 'performing-arts', 'sports', 'museums', 'festivals', 'expos', 'nightlife') then raw_category
      when raw_category in ('arts & theatre', 'theatre', 'theater', 'comedy', 'performance art')
        or text ~* 'signature theatre|kennedy center|warner theatre|lincoln theatre|theatre|theater|stage play|musical|opera|pippin|what became of us|comedy|stand[- ]?up'
        then 'performing-arts'
      when raw_category in ('baseball', 'basketball', 'football', 'hockey', 'soccer')
        or text ~* 'baseball|basketball|football|hockey|soccer|nationals|wizards|mystics|capitals|commanders|d\.?c\.? united|sports'
        then 'sports'
      when raw_category in ('rock', 'pop', 'r&b', 'hip-hop/rap', 'jazz', 'latin', 'country', 'dance/electronic')
        or text ~* 'concert|tour|music|gospel|festival of praise|room 808|showcase|band|artist|singer|songwriter|dj|jazz|latin|country|rock|pop|r&b|hip[- ]?hop|rap'
        then 'concerts'
      when raw_category in ('museum', 'museums')
        or text ~* 'museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history'
        then 'museums'
      when text ~* 'festival|fair' then 'festivals'
      when text ~* 'expo|conference|convention' then 'expos'
      when text ~* 'nightclub|club night|bar crawl|cocktail|speakeasy|lounge|rooftop|dance party|after dark|late night' then 'nightlife'
      else 'community'
    end as new_category
  from normalized
),
tagged as (
  select
    events.id,
    classified.new_category,
    array_remove(array[
      case when classified.new_category = 'sports' then 'Sports' end,
      case when classified.new_category = 'museums' then 'Museums' end,
      case when classified.new_category = 'festivals' then 'Festivals' end,
      case when classified.new_category = 'expos' then 'Expos' end,
      case when classified.new_category = 'nightlife' then 'Nightlife' end,
      case when normalized.text ~* 'comedy|stand[- ]?up|comic' then 'Comedy' end,
      case when normalized.text ~* 'baseball|nationals' then 'MLB' end,
      case when normalized.text ~* 'baseball|nationals' then 'Baseball' end,
      case when normalized.text ~* 'gospel' then 'Gospel' end,
      case when normalized.text ~* 'room 808|showcase' then 'Club Show' end
    ], null) as inferred_tags
  from public.events events
  join classified on classified.id = events.id
  join normalized on normalized.id = events.id
)
update public.events events
set
  category = tagged.new_category,
  tags = (
    select array_agg(tag order by first_seen)
    from (
      select distinct on (lower(tag)) tag, first_seen
      from unnest(tagged.inferred_tags || coalesce(events.tags, '{}')) with ordinality as tags(tag, first_seen)
      where tag is not null
        and tag <> ''
        and not (tagged.new_category <> 'community' and lower(tag) = 'community')
      order by lower(tag), first_seen
    ) deduped
  ),
  updated_at = now()
from tagged
where events.id = tagged.id
  and (
    events.category is distinct from tagged.new_category
    or (
      tagged.new_category <> 'community'
      and 'Community' = any(coalesce(events.tags, '{}'))
    )
  );
