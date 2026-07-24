// 06-scoring.js
// ============================================================
// Personalized feed: refresh per-user scores + read the feed.
//
// This file follows your app's pattern: it is concatenated with the other
// feature files and eval'd in one shared scope by main.js. So:
//   • NO import/export here (everything 05-supabase.js defines is already
//     visible to this file because they share the same scope).
//   • It loads at position 06 — right after 05-supabase.js — so the Supabase
//     client exists before anything below runs.
//
// ►► THE ONE LINE TO CHECK ◄◄
// `lokalSb` must point at the Supabase client created in 05-supabase.js.
// It tries the two most common names. Open 05-supabase.js, see what the client
// variable is called, and if it's neither of these, add it to the front below.
// ============================================================

const lokalSb =
  (typeof supabaseClient !== "undefined" && supabaseClient) ||
  (typeof supabase !== "undefined" && supabase) ||
  null;

// In-session guards so moving between screens doesn't re-invoke the function.
// These reset on a full page load (a real "app open"), which is what we want.
let _lastScoreRun = 0;
let _scoreInFlight = null;
const SCORE_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // mirror the server's 6h cache

// Ask the score-events edge function to (re)score the signed-in user's events.
// Server-side it only re-scores stale (>6h) or missing scores, so it's cheap.
async function refreshScores(opts) {
  opts = opts || {};
  const accessToken = typeof supabaseStorageKeys !== "undefined" ? localStorage.getItem(supabaseStorageKeys.accessToken) : "";
  if (!accessToken && !lokalSb) return { skipped: "no-signed-in-user" };
  if (!lokalSb) {
    const now = Date.now();
    if (!opts.force && now - _lastScoreRun < SCORE_MIN_INTERVAL_MS) return { skipped: "throttled" };
    if (_scoreInFlight) return _scoreInFlight;
    _scoreInFlight = (async () => {
      try {
        const response = await fetch(`${supabaseConfig.url}/functions/v1/score-events`, {
          method: "POST",
          headers: {
            apikey: supabaseConfig.anonKey || supabaseConfig.publishableKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return { error: data.message || `score-events returned ${response.status}` };
        _lastScoreRun = Date.now();
        return data || { success: true };
      } finally {
        _scoreInFlight = null;
      }
    })();
    return _scoreInFlight;
  }

  const userRes = await lokalSb.auth.getUser();
  const user = userRes && userRes.data ? userRes.data.user : null;
  if (!user) return { skipped: "no-signed-in-user" };

  const now = Date.now();
  if (!opts.force && now - _lastScoreRun < SCORE_MIN_INTERVAL_MS) {
    return { skipped: "throttled" };
  }
  if (_scoreInFlight) return _scoreInFlight; // dedupe concurrent callers

  _scoreInFlight = (async () => {
    try {
      // invoke() attaches the user's auth token automatically, so it clears
      // the function's JWT check.
      const { data, error } = await lokalSb.functions.invoke("score-events", {
        body: { user_id: user.id },
      });
      if (error) {
        console.error("[scoring] refreshScores error:", error.message);
        return { error: error.message };
      }
      _lastScoreRun = Date.now();
      return data || { success: true };
    } finally {
      _scoreInFlight = null;
    }
  })();

  return _scoreInFlight;
}

// Read the signed-in user's personalized feed (the personalized_feed view,
// already filtered to auth.uid() and ordered by boosted relevance score).
async function getPersonalizedFeed() {
  if (!lokalSb) {
    const accessToken = typeof supabaseStorageKeys !== "undefined" ? localStorage.getItem(supabaseStorageKeys.accessToken) : "";
    if (!accessToken) return [];
    try {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/personalized_feed?select=*`, {
        headers: {
          apikey: supabaseConfig.anonKey || supabaseConfig.publishableKey,
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.ok ? await response.json() : [];
    } catch {
      return [];
    }
  }
  const { data, error } = await lokalSb.from("personalized_feed").select("*");
  if (error) {
    console.error("[scoring] getPersonalizedFeed error:", error.message);
    return [];
  }
  return data || [];
}

// Make them reachable from other feature files / the console.
if (typeof window !== "undefined") {
  window.refreshScores = refreshScores;
  window.getPersonalizedFeed = getPersonalizedFeed;
}

// On app open: if someone is signed in, refresh their scores in the background.
// When it finishes, re-render the discover feed IF your discover code exposes a
// reload function. Adjust the name on the marked line to match 10-discover.js.
refreshScores().then((res) => {
  if (res && res.scored) {
    console.log(`[scoring] refreshed ${res.scored} event scores`);

    // ►► If 10-discover.js has a function that reloads/renders the feed, call it
    //    here so the freshly scored order shows immediately. Rename to match.
    if (typeof loadDiscover === "function") loadDiscover();
    else if (typeof renderDiscover === "function") renderDiscover();
    else if (typeof loadEvents === "function") loadEvents();
  }
});
