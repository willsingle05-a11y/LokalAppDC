// supabase/functions/get-blended-feed/index.ts
//
// Ranked, bucket-composed feed for Lokal DC.
//
// Flow:
//   1. Count the user's interactions (saves + event_scores).
//   2. Call the blended_feed(user_id) SQL function (service role, bypasses RLS)
//      to get every eligible event already scored + bucketed.
//   3. Compose a page from the buckets in the target proportions:
//        established user  -> 40% For You / 25% Big in DC / 20% Neighborhood
//                             / 10% Something Different / 5% Trending
//        new user (<5)     -> 60% Big in DC / 40% In Your Neighborhood
//      Backfill any starved section from the global-score ranking so the page
//      always fills (important today: 0 events currently clear the Big-in-DC
//      threshold, so that bucket relies on backfill).
//   4. Return a single ranked array; each item carries its bucket label +
//      score breakdown so the frontend can section it and so we can debug.
//
// Deploy:
//   supabase functions deploy get-blended-feed --no-verify-jwt
// Call:
//   POST /functions/v1/get-blended-feed   { "user_id": "<uuid>", "limit": 30 }
//   GET  /functions/v1/get-blended-feed?user_id=<uuid>&limit=30

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  BLEND_ESTABLISHED,
  BLEND_NEW_USER,
  compose,
  type FeedRow,
  NEW_USER_THRESHOLD,
  SECTION_LABELS,
} from "./feed.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ---- inputs ----------------------------------------------------------
    let userId: string | null = null;
    let pageSize = 30;
    if (req.method === "GET") {
      const u = new URL(req.url);
      userId = u.searchParams.get("user_id");
      pageSize = Number(u.searchParams.get("limit")) || 30;
    } else {
      const body = await req.json().catch(() => ({}));
      userId = body.user_id ?? null;
      pageSize = Number(body.limit) || 30;
    }
    if (!userId) return json({ error: "user_id is required" }, 400);

    // ---- service-role client (bypasses RLS for cross-user trending) ------
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // ---- 1. how many events has this user interacted with? ---------------
    // event_interactions is the app's real saves table (see 05-supabase.js).
    const [savesCount, scoresCount] = await Promise.all([
      supabase.from("event_interactions").select("event_id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase.from("event_scores").select("event_id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);
    const interactions = (savesCount.count ?? 0) + (scoresCount.count ?? 0);
    const isNewUser = interactions < NEW_USER_THRESHOLD;

    // ---- 2. scored + bucketed candidate set ------------------------------
    const { data, error } = await supabase.rpc("blended_feed", {
      p_user_id: userId,
      p_limit: 500,
    });
    if (error) return json({ error: error.message }, 500);
    const rows = (data ?? []) as FeedRow[];

    // ---- 3. compose the page ---------------------------------------------
    const weights = isNewUser ? BLEND_NEW_USER : BLEND_ESTABLISHED;
    const feed = compose(rows, weights, pageSize);

    // ---- 4. shape the response -------------------------------------------
    const bucketCounts: Record<string, number> = {};
    const out = feed.map((r) => {
      bucketCounts[r.bucket] = (bucketCounts[r.bucket] ?? 0) + 1;
      return {
        ...r,
        section: SECTION_LABELS[r.bucket] ?? r.bucket,
      };
    });

    return json({
      user_id: userId,
      mode: isNewUser ? "new_user_fallback" : "blended",
      interactions,
      requested: pageSize,
      returned: out.length,
      candidates: rows.length,
      bucket_counts: bucketCounts,
      feed: out,
    });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
