-- Normalize existing event categories so the app never shows a generic "Event" category.
-- Adds one new Lokal category: museums.

with normalized as (
  select
    id,
    case
      when lower(coalesce(category, '')) in ('concerts', 'festivals', 'performing-arts', 'sports', 'community', 'expos', 'museums')
        then lower(category)
      when lower(coalesce(category, '')) in ('museum', 'museums')
        or concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'smithsonian|hirshhorn|renwick gallery|national portrait gallery|american art museum|national air and space museum|national museum of african american history|national museum of natural history|national museum of american history|museum'
        then 'museums'
      when lower(coalesce(category, '')) in ('rock', 'pop', 'r&b', 'hip-hop/rap', 'jazz', 'latin', 'country')
        or concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'concert|music|rock|pop|r&b|hip-hop|rap|jazz|latin|country|dj|band|singer|songwriter'
        then 'concerts'
      when lower(coalesce(category, '')) in ('theatre', 'theater', 'performance art', 'arts & theatre', 'comedy')
        or concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'theatre|theater|performance art|performing|arts & theatre|comedy|film|cinema|dance'
        then 'performing-arts'
      when lower(coalesce(category, '')) in ('baseball', 'basketball')
        or concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'baseball|basketball|football|soccer|hockey|sports|mlb|nba|nfl|nhl'
        then 'sports'
      when lower(coalesce(category, '')) in ('festival', 'festivals')
        or concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'festival|fair'
        then 'festivals'
      when lower(coalesce(category, '')) in ('expo', 'expos')
        or concat_ws(' ', title, description, venue_name, venue, array_to_string(tags, ' ')) ~* 'expo|conference|convention'
        then 'expos'
      else 'community'
    end as new_category
  from public.events
)
update public.events events
set
  category = normalized.new_category,
  tags = case
    when normalized.new_category = 'museums' and not ('Museums' = any(coalesce(events.tags, '{}')))
      then array_append(coalesce(events.tags, '{}'), 'Museums')
    else coalesce(events.tags, '{}')
  end,
  updated_at = now()
from normalized
where events.id = normalized.id
  and (
    events.category is distinct from normalized.new_category
    or (normalized.new_category = 'museums' and not ('Museums' = any(coalesce(events.tags, '{}'))))
  );
