// Optional "For You" blended feed, powered by the get-blended-feed Supabase
// Edge Function (see supabase/functions/get-blended-feed). This is an A/B
// alternative to the local client-side feed: a toggle in the Discover header
// switches between "All" (the existing feed) and "For You" (server-blended,
// grouped into sections). Any failure falls back to the local feed.

const blendedFeedConfig = {
  endpoint: `${supabaseConfig.url}/functions/v1/get-blended-feed`,
  pageSize: 30
};

// Section render order + labels. Must match the Edge Function's SECTION_LABELS.
const BLENDED_SECTIONS = [
  ["personalized", "For You"],
  ["big_dc", "Big in DC"],
  ["neighborhood", "In Your Neighborhood"],
  ["trending", "Trending"],
  ["discovery", "Something Different"]
];

// Runtime state (state is defined in 00-core.js; this file is eval'd after it).
if (!state.feedMode) state.feedMode = "local";
state.blendedFeed = { status: "idle", mode: "", rows: [], error: "" };

function blendedFeedEnabled() {
  return state.feedMode === "blended";
}

// Call the Edge Function for the current interaction user and cache the result.
// Re-renders the home feed on both the loading transition and completion.
async function fetchBlendedFeed() {
  state.blendedFeed = { ...state.blendedFeed, status: "loading", error: "" };
  if (state.route === "home") renderHome();
  try {
    const userId = currentInteractionUserId();
    const response = await fetch(blendedFeedConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseConfig.publishableKey,
        Authorization: `Bearer ${supabaseConfig.publishableKey}`
      },
      body: JSON.stringify({ user_id: userId, limit: blendedFeedConfig.pageSize })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.blendedFeed = {
      status: "ready",
      mode: data.mode || "",
      rows: Array.isArray(data.feed) ? data.feed : [],
      error: ""
    };
  } catch (error) {
    state.blendedFeed = { status: "error", mode: "", rows: [], error: error.message || "unavailable" };
  }
  if (state.route === "home") renderHome();
}

// A blended row is keyed by Supabase events.id; loaded app events carry that as
// event.sourceId. Map back so the existing card renderer has full event data.
function blendedRowToEvent(row) {
  return events.find(event => String(event.sourceId) === String(row.id)) || null;
}

// Feed-mode toggle for the Discover header.
function feedModeToggle() {
  const mode = blendedFeedEnabled() ? "blended" : "local";
  return `<div class="feed-mode-toggle" role="tablist" aria-label="Feed mode">
    <button class="feed-mode-btn ${mode === "local" ? "active" : ""}" data-feed-mode="local" role="tab" aria-selected="${mode === "local"}">All</button>
    <button class="feed-mode-btn ${mode === "blended" ? "active" : ""}" data-feed-mode="blended" role="tab" aria-selected="${mode === "blended"}">For You</button>
  </div>`;
}

// Render a {bucket: [events]} map into the labelled section layout. Shared by the
// server-blended path and the local fallback so both look identical.
function renderBucketSections(byBucket, modeNote) {
  const sections = BLENDED_SECTIONS
    .filter(([key]) => byBucket[key] && byBucket[key].length)
    .map(([key, label]) => {
      const cards = byBucket[key].map(event => eventRow(event, "", { showBadge: true })).join("");
      return `<section class="blended-section" data-bucket="${escapeHtml(key)}">
        <div class="blended-section-head"><h3>${escapeHtml(label)}</h3></div>
        <div class="feed-masonry">${cards}</div>
      </section>`;
    }).join("");
  return `${modeNote || ""}${sections}`;
}

// The user's "home" neighborhoods: onboarding areas plus wherever they save/RSVP.
function blendedHomeKeys() {
  const keys = new Set();
  const add = value => { const key = String(cleanLocationPart(value) || "").toLowerCase().trim(); if (key) keys.add(key); };
  (state.profile?.areas || []).forEach(add);
  [...(state.saved || []), ...(state.rsvps || [])].forEach(id => {
    const event = events.find(item => item.id === id);
    if (event) add(event.area || event.neighborhood);
  });
  return keys;
}

// Client-side version of the blended_feed view: bucket the already-filtered feed
// into the same five sections using the app's own taste + popularity scoring, so
// "For You" still shows real, sectioned picks when the Edge Function isn't
// deployed. Each event lands in exactly one bucket (priority order below), which
// keeps the mix from collapsing back into an echo chamber.
function localBlendedSections(list) {
  const weights = userPreferenceWeights();
  const homeKeys = blendedHomeKeys();
  const used = new Set();
  const personal = event => eventPersonalScore(event, weights);
  const popular = event => eventPopularityScore(event);
  const friendCount = event => Array.isArray(event.friends) ? event.friends.length : 0;
  const hoodKey = event => String(cleanLocationPart(event.area || event.neighborhood) || "").toLowerCase().trim();
  const take = (pool, limit) => {
    const picks = [];
    for (const event of pool) {
      if (picks.length >= limit) break;
      if (used.has(event.id)) continue;
      used.add(event.id);
      picks.push(event);
    }
    return picks;
  };
  const byPersonal = list.filter(event => personal(event) > 0).sort((a, b) => personal(b) - personal(a) || sortEventsByStart(a, b));
  const byBig = list.filter(event => popular(event) >= 4).sort((a, b) => popular(b) - popular(a) || sortEventsByStart(a, b));
  const byHood = list.filter(event => homeKeys.has(hoodKey(event))).sort((a, b) => personal(b) - personal(a) || sortEventsByStart(a, b));
  const byTrending = list.filter(event => friendCount(event) > 0 || popular(event) >= 4).sort((a, b) => friendCount(b) - friendCount(a) || popular(b) - popular(a) || sortEventsByStart(a, b));
  const byDiscovery = list.filter(event => personal(event) === 0).sort((a, b) => popular(b) - popular(a) || sortEventsByStart(a, b));
  // Order of take() calls = bucket priority; the `used` set prevents duplicates.
  return {
    personalized: take(byPersonal, 6),
    big_dc: take(byBig, 5),
    neighborhood: take(byHood, 4),
    trending: take(byTrending, 4),
    discovery: take(byDiscovery, 4)
  };
}

function renderLocalBlendedFeed(list) {
  const source = Array.isArray(list) ? list : [];
  if (!source.length) return renderDiscoverFeedContent(source);
  const buckets = localBlendedSections(source);
  const total = BLENDED_SECTIONS.reduce((sum, [key]) => sum + (buckets[key] ? buckets[key].length : 0), 0);
  if (!total) return renderDiscoverFeedContent(source);
  return renderBucketSections(buckets, "");
}

// Blended feed content, grouped into labelled sections. Uses the Edge Function's
// ranking when it returns mappable rows; otherwise (not deployed, error, still
// loading, or rows outside the loaded window) blends locally so the personalized
// feed always displays.
function renderBlendedFeedContent(fallbackList) {
  const bf = state.blendedFeed;
  if (bf.status === "ready") {
    const mapped = bf.rows
      .map(row => ({ bucket: row.bucket, event: blendedRowToEvent(row) }))
      .filter(item => item.event);
    if (mapped.length) {
      const byBucket = {};
      mapped.forEach(item => { (byBucket[item.bucket] = byBucket[item.bucket] || []).push(item.event); });
      const modeNote = bf.mode === "new_user_fallback"
        ? `<p class="blended-mode-note">New here — showing big DC moments and your neighborhood until you save a few events.</p>`
        : "";
      return renderBucketSections(byBucket, modeNote);
    }
  }
  return renderLocalBlendedFeed(fallbackList);
}
