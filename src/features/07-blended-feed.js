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

// Blended feed content, grouped into labelled sections. Falls back to the local
// feed (rendered from fallbackList) on loading-timeout, error, or empty mapping.
function renderBlendedFeedContent(fallbackList) {
  const bf = state.blendedFeed;
  if (bf.status === "idle" || bf.status === "loading") return feedSkeleton();
  if (bf.status === "error") {
    return `<div class="blended-fallback-note">Personalized feed unavailable (${escapeHtml(bf.error)}) — showing the standard feed.</div>${renderDiscoverFeedContent(fallbackList)}`;
  }
  // Attach each row to a loaded event; drop rows outside the loaded window.
  const mapped = bf.rows
    .map(row => ({ bucket: row.bucket, event: blendedRowToEvent(row) }))
    .filter(item => item.event);
  if (!mapped.length) {
    return `<div class="blended-fallback-note">No personalized matches in the current window yet — showing the standard feed.</div>${renderDiscoverFeedContent(fallbackList)}`;
  }
  const byBucket = {};
  mapped.forEach(item => { (byBucket[item.bucket] = byBucket[item.bucket] || []).push(item.event); });
  const sections = BLENDED_SECTIONS
    .filter(([key]) => byBucket[key] && byBucket[key].length)
    .map(([key, label]) => {
      const cards = byBucket[key].map(event => eventRow(event, "", { showBadge: true })).join("");
      return `<section class="blended-section" data-bucket="${escapeHtml(key)}">
        <div class="blended-section-head"><h3>${escapeHtml(label)}</h3></div>
        <div class="feed-masonry">${cards}</div>
      </section>`;
    }).join("");
  const modeNote = bf.mode === "new_user_fallback"
    ? `<p class="blended-mode-note">New here — showing big DC moments and your neighborhood until you save a few events.</p>`
    : "";
  return `${modeNote}${sections}`;
}
