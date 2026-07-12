-- ============================================================================
-- Smoke tests for the blended feed. Paste into the Supabase SQL editor AFTER
-- running blended-feed.sql. Uses ASSERT — any failure aborts with the message.
-- A clean run prints "ALL BLENDED-FEED TESTS PASSED".
--
-- Part A: exact score math via the pure blended_event_score() helper — literal
--         inputs, deterministic, no table writes.
-- Part B: structural invariants on the live blended_feed() output.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Part A — score-math unit tests (fixed "now" = 2026-07-12 12:00 UTC)
-- ---------------------------------------------------------------------------
do $$
declare
  n   timestamptz := '2026-07-12 12:00:00+00';
  sc  int;
  bd  jsonb;
begin
  -- Case 1: kitchen-sink affinity event, free, imminent (<24h), new-to-db, image,
  --         in home neighborhood, lokal below threshold.
  --   saved 20 + hood 20 + trend 3 + recency 25 + image 5 + free 10 + new 8 = 91
  select score, breakdown into sc, bd from public.blended_event_score(
    true, false, 50, true, true, 3, n + interval '10 hours', n - interval '2 days', true, n, 75);
  assert sc = 91, format('Case1 score expected 91, got %s', sc);
  assert bd = '{"saved_category":20,"neighborhood":20,"trending":3,"recency":25,"image":5,"free":10,"new_to_db":8}'::jsonb,
    format('Case1 breakdown mismatch: %s', bd);

  -- Case 2: pure wildcard, free, within 72h (not 24h), no image, old.
  --   wildcard 10 + wildcard_free 15 + recency 15 + free 10 = 50
  select score, breakdown into sc, bd from public.blended_event_score(
    false, false, 50, false, true, 0, n + interval '30 hours', n - interval '40 days', false, n, 75);
  assert sc = 50, format('Case2 score expected 50, got %s', sc);
  assert (bd->>'wildcard')::int = 10 and (bd->>'wildcard_free')::int = 15
     and (bd->>'recency')::int = 15 and (bd->>'free')::int = 10,
    format('Case2 breakdown mismatch: %s', bd);
  assert not (bd ? 'saved_category'), 'Case2 should have no saved_category component';

  -- Case 3: highlighted Big-in-DC, lokal>=75, far future (>30d), image, ticketed.
  --   wildcard 10 + highlighted 40 + lokal 25 + recency -10 + image 5 = 70
  select score, breakdown into sc, bd from public.blended_event_score(
    false, true, 90, false, false, 0, n + interval '40 days', n - interval '100 days', true, n, 75);
  assert sc = 70, format('Case3 score expected 70, got %s', sc);
  assert (bd->>'recency')::int = -10, format('Case3 recency expected -10, got %s', bd->>'recency');

  -- Case 4: trending cap — 50 recent saves clamps to +20; mid-future (0 recency).
  --   wildcard 10 + trending 20 = 30
  select score, breakdown into sc, bd from public.blended_event_score(
    false, false, 50, false, false, 50, n + interval '10 days', n - interval '90 days', false, n, 75);
  assert sc = 30, format('Case4 score expected 30, got %s', sc);
  assert (bd->>'trending')::int = 20, format('Case4 trending should cap at 20, got %s', bd->>'trending');

  -- Case 5: neighborhood match, within 7 days (+5).
  --   wildcard 10 + neighborhood 20 + recency 5 = 35
  select score, breakdown into sc, bd from public.blended_event_score(
    false, false, 50, true, false, 0, n + interval '5 days', n - interval '90 days', false, n, 75);
  assert sc = 35, format('Case5 score expected 35, got %s', sc);

  -- Case 6: lokal exactly at threshold counts; just below does not.
  select score into sc from public.blended_event_score(
    false, false, 75, false, false, 0, n + interval '10 days', n - interval '90 days', false, n, 75);
  assert sc = 35, format('Case6 (lokal=75) expected 10 wild + 25 lokal = 35, got %s', sc);
  select score into sc from public.blended_event_score(
    false, false, 74, false, false, 0, n + interval '10 days', n - interval '90 days', false, n, 75);
  assert sc = 10, format('Case6 (lokal=74) expected 10 (wildcard only), got %s', sc);

  raise notice 'Part A (score math): 6 cases PASSED';
end $$;

-- ---------------------------------------------------------------------------
-- Part B — invariants on live blended_feed() output. Uses a random uuid with
-- no saves, so this is read-only and safe. Skips gracefully if 0 published
-- future events exist.
-- ---------------------------------------------------------------------------
do $$
declare
  test_uid uuid := '11111111-1111-1111-1111-111111111111';
  total    int;
  bad      int;
  min_start timestamptz;
begin
  select count(*) into total from public.blended_feed(test_uid, now(), 300);
  if total = 0 then
    raise notice 'Part B: no eligible events returned — skipping invariant checks';
    return;
  end if;

  -- (1) score always equals the sum of its breakdown components.
  select count(*) into bad from (
    select score,
           (select coalesce(sum(v.value::int), 0)
              from jsonb_each_text(breakdown) v) as bsum
    from public.blended_feed(test_uid, now(), 300)
  ) x
  where x.score <> x.bsum;
  assert bad = 0, format('score <> sum(breakdown) for %s of %s rows', bad, total);

  -- (2) every bucket label is one of the five known sections.
  select count(*) into bad from public.blended_feed(test_uid, now(), 300)
  where bucket not in ('personalized','big_dc','neighborhood','trending','discovery');
  assert bad = 0, format('%s rows have an unknown bucket', bad);

  -- (3) hard filter: nothing in the past.
  select min(starts_at) into min_start from public.blended_feed(test_uid, now(), 300);
  assert min_start >= now() - interval '1 minute',
    format('feed contains a past event (min starts_at = %s)', min_start);

  -- (4) a user with no saves is never labeled "personalized" or "neighborhood".
  select count(*) into bad from public.blended_feed(test_uid, now(), 300)
  where bucket in ('personalized','neighborhood');
  assert bad = 0, format('%s rows personalized for a user with no saves', bad);

  raise notice 'Part B (feed invariants): PASSED over % rows', total;
end $$;

select 'ALL BLENDED-FEED TESTS PASSED' as result;
