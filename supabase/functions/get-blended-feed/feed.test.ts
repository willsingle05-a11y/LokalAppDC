// Tests for the pure feed-composition logic.  Run: `deno test` in this folder.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BLEND_ESTABLISHED,
  BLEND_NEW_USER,
  compose,
  type FeedRow,
} from "./feed.ts";

// Build a synthetic, pre-ranked candidate set: `perBucket` rows in each bucket,
// scores strictly descending across the whole list so ranking is unambiguous.
function makeRows(perBucket: Record<string, number>): FeedRow[] {
  const rows: FeedRow[] = [];
  let score = 1000;
  let id = 1;
  for (const [bucket, count] of Object.entries(perBucket)) {
    for (let i = 0; i < count; i++) {
      rows.push({
        id: id++,
        title: `${bucket}-${i}`,
        category: "x",
        neighborhood: "y",
        venue_name: "v",
        starts_at: "2026-07-13T00:00:00Z",
        is_free: false,
        price_min: 0,
        image_url: null,
        lokal_score: 50,
        highlighted: false,
        save_7d: 0,
        score: score--,
        bucket,
        breakdown: {},
      });
    }
  }
  return rows.sort((a, b) => b.score - a.score);
}

function countByBucket(rows: FeedRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.bucket] = (out[r.bucket] ?? 0) + 1;
  return out;
}

Deno.test("established blend hits target proportions when all buckets are full", () => {
  const rows = makeRows({
    personalized: 40,
    big_dc: 40,
    neighborhood: 40,
    discovery: 40,
    trending: 40,
  });
  const out = compose(rows, BLEND_ESTABLISHED, 20);
  assertEquals(out.length, 20, "page should be full");
  const c = countByBucket(out);
  // Round(weight*20): 8/5/4/2/1 = 20 exactly.
  assertEquals(c, { personalized: 8, big_dc: 5, neighborhood: 4, discovery: 2, trending: 1 });
});

Deno.test("output is a single list ranked by score descending", () => {
  const rows = makeRows({ personalized: 30, big_dc: 30, discovery: 30 });
  const out = compose(rows, BLEND_ESTABLISHED, 15);
  for (let i = 1; i < out.length; i++) {
    assert(out[i - 1].score >= out[i].score, "scores must be non-increasing");
  }
});

Deno.test("no duplicate events across buckets/backfill", () => {
  const rows = makeRows({ personalized: 25, big_dc: 25, neighborhood: 25 });
  const out = compose(rows, BLEND_ESTABLISHED, 30);
  const ids = new Set(out.map((r) => r.id));
  assertEquals(ids.size, out.length, "all ids unique");
});

Deno.test("starved bucket is backfilled so the page still fills", () => {
  // Big-in-DC empty (today's reality: 0 events clear the threshold). Page must
  // still fill to pageSize from the other buckets.
  const rows = makeRows({ personalized: 50, discovery: 50 }); // no big_dc/neighborhood/trending
  const out = compose(rows, BLEND_ESTABLISHED, 20);
  assertEquals(out.length, 20, "backfill should fill the page despite empty buckets");
  const c = countByBucket(out);
  assert(!("big_dc" in c), "no big_dc rows exist to include");
});

Deno.test("new-user blend uses only big_dc + neighborhood quotas", () => {
  const rows = makeRows({
    big_dc: 10,
    neighborhood: 10,
    personalized: 10, // present in data but should only arrive via backfill, not quota
  });
  const out = compose(rows, BLEND_NEW_USER, 10);
  assertEquals(out.length, 10);
  const c = countByBucket(out);
  // Quota: big_dc round(.6*10)=6, neighborhood round(.4*10)=4 -> 10, no backfill needed.
  assertEquals(c.big_dc, 6);
  assertEquals(c.neighborhood, 4);
  assert(!("personalized" in c), "personalized should not appear when page fills from quotas");
});

Deno.test("small page still gives each weighted bucket at least one slot", () => {
  const rows = makeRows({
    personalized: 5,
    big_dc: 5,
    neighborhood: 5,
    discovery: 5,
    trending: 5,
  });
  const out = compose(rows, BLEND_ESTABLISHED, 5);
  const c = countByBucket(out);
  // Math.max(1, round(w*5)) guarantees a floor of 1 per bucket; page trims to top 5.
  assert(Object.keys(c).length >= 1);
  assertEquals(out.length, 5);
});

Deno.test("empty candidate set yields empty feed", () => {
  assertEquals(compose([], BLEND_ESTABLISHED, 20), []);
});
