-- ============================================================================
-- blended_feed — a 5-bucket personalized/serendipity feed for Lokal DC
-- Project ref: iglzcjtklryapmcpyoam
-- ----------------------------------------------------------------------------
-- IMPORTANT: this is built against the ACTUAL live schema, which differs from
-- the original spec in five places (verified 2026-07-12 via the REST API):
--
--   1. A Postgres VIEW cannot take a user_id parameter. The existing
--      `personalized_feed` is a plain, unparameterized view. To score "for a
--      given user_id" we ship a SET-RETURNING FUNCTION, callable over REST as
--      POST /rest/v1/rpc/blended_feed. `personalized_feed` is left untouched
--      so you can still A/B against it.
--
--   2. The running app records saves in public.event_interactions
--      (id, user_id, event_id, created_at) — NOT the spec's `saves` table,
--      which exists but is unused/empty. So this feed reads event_interactions
--      for both behavioral affinity and the 7-day trending count. If you later
--      standardize on `saves`, swap the table name in the me_saves + trend CTEs
--      (or UNION both).
--
--   2b. public.user_interests has NO `category` column (only user_id, id,
--      weight, created_at). Bucket 1's "+30 category interest match" therefore
--      cannot be expressed from that table. Personalization here is driven by
--      the user's SAVE history (behavioral, +20). To enable the literal-spec
--      +30 interest match, run the OPTIONAL migration at the bottom, then
--      un-comment the `interest_categories` CTE + `sc_interest` lines.
--
--   3. public.profiles has NO `neighborhood` column (only id, username, email,
--      created_at). "Home neighborhood" is DERIVED as the neighborhood the user
--      has saved most often. To use an explicit home neighborhood instead, run
--      the OPTIONAL migration and swap the `home` CTE (noted inline).
--
--   4. Today, 0 events have highlighted=true and 0 have lokal_score>=75 (scores
--      are a flat default of 50). So Bucket 2 "Big in DC" — and the new-user
--      fallback that leans on it — would be EMPTY. The function still applies
--      the spec's exact +40/+25 boosts, but the Edge Function backfills "Big in
--      DC" from the top of the lokal_score / trending distribution so the
--      section is never blank. Populate highlighted / lokal_score to make the
--      literal thresholds meaningful.
--
--   5. events.category is inconsistent free text (e.g. 'live-music', 'museum',
--      but also 'Theatre', 'Rock', 'Miscellaneous'). Matching is literal string
--      equality, which is self-consistent (we always compare events.category to
--      events.category), so buckets work regardless of the vocabulary.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Indexes (safe to re-run)
-- ---------------------------------------------------------------------------
create index if not exists idx_events_pub_start   on public.events (status, starts_at);
create index if not exists idx_events_category     on public.events (category);
create index if not exists idx_events_neighborhood on public.events (neighborhood);
create index if not exists idx_events_lokal        on public.events (lokal_score);
create index if not exists idx_events_highlighted  on public.events (highlighted) where highlighted is true;
create index if not exists idx_events_created      on public.events (created_at);
create index if not exists idx_ei_user             on public.event_interactions (user_id);
create index if not exists idx_ei_event            on public.event_interactions (event_id);
create index if not exists idx_ei_created          on public.event_interactions (created_at);
create index if not exists idx_event_scores_user   on public.event_scores (user_id);


-- ---------------------------------------------------------------------------
-- 2. blended_event_score — PURE, IMMUTABLE score function. Takes the already-
--    resolved per-event signals and returns (score, breakdown). Kept separate
--    from blended_feed so the exact score math is unit-testable with literal
--    inputs (see blended-feed.test.sql) — no table writes, no FK setup.
-- ---------------------------------------------------------------------------
create or replace function public.blended_event_score(
  p_is_affinity   boolean,      -- category is in the user's engaged categories
  p_highlighted   boolean,      -- events.highlighted
  p_lokal         int,          -- events.lokal_score
  p_is_home       boolean,      -- event neighborhood = user's home neighborhood
  p_is_free       boolean,      -- events.is_free
  p_save_7d       int,          -- saves in the last 7 days (all users)
  p_starts_at     timestamptz,
  p_created_at    timestamptz,
  p_has_image     boolean,      -- events.image_url is not null
  p_now           timestamptz,
  p_big_threshold int default 75
)
returns table (score int, breakdown jsonb)
language sql
immutable
as $$
  with c as (
    select
      (case when p_is_affinity then 20 else 0 end)                                as sc_saved,
      (case when p_highlighted is true then 40 else 0 end)                        as sc_highlight,
      (case when coalesce(p_lokal, 0) >= p_big_threshold then 25 else 0 end)      as sc_lokal,
      (case when p_is_home then 20 else 0 end)                                    as sc_hood,
      (case when not p_is_affinity then 10 else 0 end)                            as sc_wild,
      (case when not p_is_affinity and p_is_free is true then 15 else 0 end)      as sc_wildfree,
      least(coalesce(p_save_7d, 0), 20)                                           as sc_trend,
      (case
         when p_starts_at <  p_now + interval '24 hours' then 25
         when p_starts_at <  p_now + interval '72 hours' then 15
         when p_starts_at <  p_now + interval '7 days'   then 5
         when p_starts_at >  p_now + interval '30 days'  then -10
         else 0 end)                                                             as sc_recency,
      (case when p_has_image then 5 else 0 end)                                   as sc_image,
      (case when p_is_free is true then 10 else 0 end)                            as sc_free,
      (case when p_created_at >= p_now - interval '7 days' then 8 else 0 end)     as sc_new
  )
  select
    (sc_saved + sc_highlight + sc_lokal + sc_hood + sc_wild + sc_wildfree
       + sc_trend + sc_recency + sc_image + sc_free + sc_new) as score,
    jsonb_strip_nulls(jsonb_build_object(
      'saved_category', nullif(sc_saved, 0),
      'highlighted',    nullif(sc_highlight, 0),
      'lokal_score',    nullif(sc_lokal, 0),
      'neighborhood',   nullif(sc_hood, 0),
      'wildcard',       nullif(sc_wild, 0),
      'wildcard_free',  nullif(sc_wildfree, 0),
      'trending',       nullif(sc_trend, 0),
      'recency',        nullif(sc_recency, 0),
      'image',          nullif(sc_image, 0),
      'free',           nullif(sc_free, 0),
      'new_to_db',      nullif(sc_new, 0)
    )) as breakdown
  from c;
$$;

grant execute on function public.blended_event_score(
  boolean, boolean, int, boolean, boolean, int, timestamptz, timestamptz, boolean, timestamptz, int
) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 3. blended_feed(user_id, ...) — returns every eligible event, scored,
--    bucketed, with a per-event score breakdown.
--
--    SECURITY DEFINER so it can read save counts across all users (for the
--    "trending" signal) regardless of RLS. It only ever RETURNS aggregate save
--    counts + the caller's own personalization, never other users' rows.
-- ---------------------------------------------------------------------------
create or replace function public.blended_feed(
  p_user_id      uuid,
  p_now          timestamptz default now(),
  p_limit        int         default 500,
  p_big_threshold int        default 75      -- spec's lokal_score cutoff for "Big in DC"
)
returns table (
  id           bigint,
  title        text,
  category     text,
  neighborhood text,
  venue_name   text,
  starts_at    timestamptz,
  is_free      boolean,
  price_min    numeric,
  image_url    text,
  lokal_score  int,
  highlighted  boolean,
  save_7d      int,
  score        int,
  bucket       text,
  breakdown    jsonb
)
language sql
stable
security definer
set search_path = public
as $$
with
-- The user's own saves (from event_interactions — the app's real saves table),
-- joined to reveal category + neighborhood affinity.
me_saves as (
  select s.event_id, e.category, e.neighborhood
  from public.event_interactions s
  join public.events e on e.id = s.event_id
  where s.user_id = p_user_id
),
-- Categories the user has engaged with (behavioral). NULLs excluded so the
-- `NOT IN` used for the wildcard bucket stays well-defined.
affinity as (
  select distinct category
  from me_saves
  where category is not null
),
-- OPTIONAL literal-spec Bucket 1 (+30). Requires user_interests.category — see
-- migration at the bottom. Un-comment this CTE and the `sc_interest` lines.
-- interest_categories as (
--   select distinct category
--   from public.user_interests
--   where user_id = p_user_id and weight > 0 and category is not null
-- ),
-- Derived home neighborhood = the neighborhood this user saves most often.
-- If you add profiles.neighborhood, replace this body with:
--   select neighborhood from public.profiles where id = p_user_id
home as (
  select neighborhood
  from me_saves
  where neighborhood is not null
  group by neighborhood
  order by count(*) desc
  limit 1
),
-- Trending: saves per event in the last 7 days, across all users.
trend as (
  select event_id, count(*)::int as c
  from public.event_interactions
  where created_at >= p_now - interval '7 days'
  group by event_id
),
-- Hard filters: published, upcoming, and not already saved by this user.
elig as (
  select e.*
  from public.events e
  where e.status = 'published'
    and e.starts_at >= p_now
    and e.id not in (select event_id from me_saves)
),
-- Resolve per-event signals + flags once; the pure helper does the arithmetic.
scored as (
  select
    e.id, e.title, e.category, e.neighborhood, e.venue_name, e.starts_at,
    e.is_free, e.price_min, e.image_url, e.lokal_score, e.highlighted,
    coalesce(t.c, 0)                                                    as save_7d,
    (e.category in (select category from affinity))                    as is_affinity,
    (e.neighborhood is not null
       and e.neighborhood = (select neighborhood from home))           as is_home,
    (e.highlighted is true
       or coalesce(e.lokal_score, 0) >= p_big_threshold)               as is_big,
    s.score,
    s.breakdown
  from elig e
  left join trend t on t.event_id = e.id
  cross join lateral public.blended_event_score(
    (e.category in (select category from affinity)),   -- p_is_affinity
    e.highlighted,                                     -- p_highlighted
    e.lokal_score,                                     -- p_lokal
    (e.neighborhood is not null
       and e.neighborhood = (select neighborhood from home)),  -- p_is_home
    e.is_free,                                         -- p_is_free
    coalesce(t.c, 0),                                  -- p_save_7d
    e.starts_at,                                       -- p_starts_at
    e.created_at,                                      -- p_created_at
    (e.image_url is not null),                         -- p_has_image
    p_now,                                             -- p_now
    p_big_threshold                                    -- p_big_threshold
  ) s
)
select
  id, title, category, neighborhood, venue_name, starts_at,
  is_free, price_min, image_url, lokal_score, highlighted, save_7d,
  score,
  -- Primary bucket for the section label. Precedence: city-wide moments first
  -- (everyone should see them), then personal, local, trending, novel.
  case
    when is_big                 then 'big_dc'
    when is_affinity            then 'personalized'
    when is_home                then 'neighborhood'
    when save_7d > 0            then 'trending'
    else                             'discovery'
  end as bucket,
  breakdown
from scored
order by score desc, starts_at asc
limit p_limit;
$$;

grant execute on function public.blended_feed(uuid, timestamptz, int, int)
  to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 4. blended_feed_base — an unparameterized VIEW mirroring `personalized_feed`,
--    scoring only the user-independent signals (Big in DC + trending + recency
--    + universal boosts). Useful for a logged-out feed and for A/B comparison.
-- ---------------------------------------------------------------------------
create or replace view public.blended_feed_base as
with trend as (
  select event_id, count(*)::int as c
  from public.event_interactions
  where created_at >= now() - interval '7 days'
  group by event_id
)
select
  e.id, e.title, e.category, e.neighborhood, e.venue_name, e.starts_at,
  e.is_free, e.price_min, e.image_url, e.lokal_score, e.highlighted,
  coalesce(t.c, 0) as save_7d,
  (
    (case when e.highlighted is true then 40 else 0 end)
    + (case when coalesce(e.lokal_score, 0) >= 75 then 25 else 0 end)
    + least(coalesce(t.c, 0), 20)
    + (case
         when e.starts_at <  now() + interval '24 hours' then 25
         when e.starts_at <  now() + interval '72 hours' then 15
         when e.starts_at <  now() + interval '7 days'   then 5
         when e.starts_at >  now() + interval '30 days'  then -10
         else 0 end)
    + (case when e.image_url is not null then 5 else 0 end)
    + (case when e.is_free is true then 10 else 0 end)
    + (case when e.created_at >= now() - interval '7 days' then 8 else 0 end)
  ) as score
from public.events e
left join trend t on t.event_id = e.id
where e.status = 'published'
  and e.starts_at >= now();


-- ---------------------------------------------------------------------------
-- 5. OPTIONAL migrations — run these to unlock the literal-spec behavior for
--    Bucket 1 (interest categories) and Bucket 3 (explicit home neighborhood).
--    They are additive and non-destructive. After running #1, un-comment the
--    interest_categories CTE + sc_interest lines in blended_feed above.
-- ---------------------------------------------------------------------------
-- alter table public.user_interests add column if not exists category text;
-- alter table public.profiles       add column if not exists neighborhood text;


-- ---------------------------------------------------------------------------
-- Quick test (replace the uuid with a real profiles.id):
--   select bucket, count(*), round(avg(score)) avg_score
--   from public.blended_feed('00000000-0000-0000-0000-000000000000')
--   group by bucket order by 2 desc;
-- ---------------------------------------------------------------------------
