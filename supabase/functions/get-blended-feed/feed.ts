// Pure feed-composition logic for get-blended-feed. Kept free of Deno.serve /
// network / env so it can be unit-tested with `deno test`.

export const SECTION_LABELS: Record<string, string> = {
  personalized: "For You",
  big_dc: "Big in DC",
  neighborhood: "In Your Neighborhood",
  discovery: "Something Different",
  trending: "Trending",
};

// Feed composition by user maturity.
export const BLEND_ESTABLISHED: Record<string, number> = {
  personalized: 0.40,
  big_dc: 0.25,
  neighborhood: 0.20,
  discovery: 0.10,
  trending: 0.05,
};
export const BLEND_NEW_USER: Record<string, number> = {
  big_dc: 0.60,
  neighborhood: 0.40,
};

export const NEW_USER_THRESHOLD = 5; // interactions before we trust personalization

export interface FeedRow {
  id: number;
  title: string;
  category: string | null;
  neighborhood: string | null;
  venue_name: string | null;
  starts_at: string;
  is_free: boolean | null;
  price_min: number | null;
  image_url: string | null;
  lokal_score: number | null;
  highlighted: boolean | null;
  save_7d: number;
  score: number;
  bucket: string;
  breakdown: Record<string, number>;
}

// Deterministically compose `pageSize` items from bucketed, globally-ranked
// rows using the target weights, then backfill any shortfall by global score.
export function compose(
  rows: FeedRow[],
  weights: Record<string, number>,
  pageSize: number,
): FeedRow[] {
  const byBucket = new Map<string, FeedRow[]>();
  for (const r of rows) {
    (byBucket.get(r.bucket) ?? byBucket.set(r.bucket, []).get(r.bucket)!).push(r);
  }
  // rows arrive pre-sorted by score desc, so each bucket list is already ranked.

  const picked = new Map<number, FeedRow>();

  // Pass 1: take each bucket's quota from the top of its ranked list.
  for (const [bucket, weight] of Object.entries(weights)) {
    const quota = Math.max(1, Math.round(weight * pageSize));
    const pool = byBucket.get(bucket) ?? [];
    for (const r of pool.slice(0, quota)) picked.set(r.id, r);
  }

  // Pass 2: backfill from the global ranking until the page is full. Covers
  // starved buckets (e.g. Big in DC when nothing clears the score threshold).
  for (const r of rows) {
    if (picked.size >= pageSize) break;
    if (!picked.has(r.id)) picked.set(r.id, r);
  }

  // Return a single ranked list (highest score first).
  return [...picked.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, pageSize);
}
