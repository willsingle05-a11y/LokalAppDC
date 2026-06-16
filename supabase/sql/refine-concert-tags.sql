with concert_rows as (
  select
    events.id,
    concat_ws(' ', title, description, venue_name, venue) as text,
    (
      select coalesce(array_agg(tag), '{}'::text[])
      from unnest(coalesce(events.tags, '{}')) as tag
      where lower(tag) not in (
        'concert', 'concerts', 'live music', 'music', 'arts', 'art',
        'hip-hop', 'r&b', 'jazz', 'go-go', 'pop', 'rock', 'indie', 'folk',
        'country', 'electronic', 'latin', 'soul', 'dj set', 'free', '18+', '21+',
        'big room',
        'tour stop', 'club show', 'new release', 'small room', 'late set',
        'album tour', 'featured artist', 'dance floor', 'local stage', 'vocal set', 'deep cuts'
      )
    ) as cleaned_tags
  from public.events events
  where events.category = 'concerts'
),
tagged as (
  select
    id,
    cleaned_tags
    || case when text ~* '\mhip[- ]?hop\M|\mrap\M|\mrapper\M|conway|chris travis' then array['Hip-Hop'] else '{}'::text[] end
    || case when text ~* 'r&b|rhythm and blues|jill scott|bayou' then array['R&B'] else '{}'::text[] end
    || case when text ~* 'jazz|bebop|swing' then array['Jazz'] else '{}'::text[] end
    || case when text ~* 'go[- ]?go|northeast groovers|wpgc' then array['Go-Go'] else '{}'::text[] end
    || case when text ~* '\mpop\M|dorian electra|fulton lee|flawed mangoes|daniela andrade' then array['Pop'] else '{}'::text[] end
    || case when text ~* 'music - rock|\mrock band\M|\malt[- ]rock\M|\mindie rock\M|the church|the kills|of montreal' then array['Rock'] else '{}'::text[] end
    || case when text ~* 'indie|alt[- ]|alternative|of montreal|son little|bixby|flawed mangoes' then array['Indie'] else '{}'::text[] end
    || case when text ~* 'folk|americana|singer[- ]songwriter|josiah and the bonnevilles|orville peck' then array['Folk'] else '{}'::text[] end
    || case when text ~* 'music - country|country music|orville peck|kolby cooper' then array['Country'] else '{}'::text[] end
    || case when text ~* 'electronic|edm|dance music|dj set|rufus|rüfüs|echostage|soundcheck' then array['Electronic'] else '{}'::text[] end
    || case when text ~* 'latin|reggaeton|salsa|bachata|cumbia|paco amoroso|ca7riel' then array['Latin'] else '{}'::text[] end
    || case when text ~* 'soul|funk|big freedia|tank and the bangas' then array['Soul'] else '{}'::text[] end
    || case when text ~* '\mdj\M|deejay|turntable|vinyl' then array['DJ Set'] else '{}'::text[] end
    || case when text ~* 'album|record release|new release|listening session|playlist' then array['Album Tour'] else '{}'::text[] end
    || case when text ~* '\mtour\M|world tour|north america' then array['Tour Stop'] else '{}'::text[] end
    || case when text ~* 'dc artist|local artist|local lineup|hometown' then array['Local Artist'] else '{}'::text[] end
    || case when text ~* 'free admission|free event|free concert|free show|rsvp free|no cover' then array['Free'] else '{}'::text[] end
    || case when text ~* '18\+|ages 18' then array['18+'] else '{}'::text[] end
    || case when text ~* '21\+|ages 21' then array['21+'] else '{}'::text[] end
    || case when text ~* '9:30 club|930 club|the atlantis|union stage|black cat|dc9|songbyrd' then array['Club Show'] else '{}'::text[] end
    || case when text ~* 'the anthem|echostage|arena|stadium|audi field' then array['Big Room'] else '{}'::text[] end
    || array[
      case (abs(hashtext(text)) % 10)
        when 0 then 'Tour Stop'
        when 1 then 'Club Show'
        when 2 then 'New Release'
        when 3 then 'Small Room'
        when 4 then 'Late Set'
        when 5 then 'Featured Artist'
        when 6 then 'Dance Floor'
        when 7 then 'Local Stage'
        when 8 then 'Vocal Set'
        else 'Deep Cuts'
      end,
      case ((abs(hashtext(text)) + 5) % 10)
        when 0 then 'Tour Stop'
        when 1 then 'Club Show'
        when 2 then 'New Release'
        when 3 then 'Small Room'
        when 4 then 'Late Set'
        when 5 then 'Featured Artist'
        when 6 then 'Dance Floor'
        when 7 then 'Local Stage'
        when 8 then 'Vocal Set'
        else 'Deep Cuts'
      end
    ] as new_tags
  from concert_rows
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
        and lower(tag) not in ('concert', 'concerts', 'live music', 'music', 'arts', 'art')
      order by lower(tag), first_seen
    ) deduped
  ),
  updated_at = now()
from tagged
where events.id = tagged.id;
