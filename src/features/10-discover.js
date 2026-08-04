function friendsActivityFeed(limit = 10) {
  const times = ["just now", "8m ago", "23m ago", "1h ago", "2h ago", "4h ago", "yesterday"];
  const verbs = ["saved", "is going", "saved", "RSVPed"];
  return Array.from(state.friends).map(name => {
    const event = (typeof friendInterestEvents === "function" ? friendInterestEvents(name, 1)[0] : null) || displayableDcEvents()[0];
    if (!event) return null;
    const seed = Array.from(String(name)).reduce((total, character) => total + character.charCodeAt(0), 0);
    return {
      name,
      first: String(name).split(" ")[0],
      initials: friendInitials(name),
      eventId: event.id,
      time: `${times[seed % times.length]}`,
      verb: verbs[seed % verbs.length]
    };
  }).filter(Boolean).slice(0, limit);
}

function activityChip(activity) {
  return `<button class="activity-chip" data-event="${activity.eventId}"><span class="activity-ring"><span class="avatar">${escapeHtml(activity.initials)}</span></span><b>${escapeHtml(activity.first)}</b><small>${escapeHtml(activity.verb)} / ${escapeHtml(activity.time)}</small></button>`;
}

function happeningTonightEvents(limit = 2) {
  const tonight = displayableDcEvents()
    .filter(event => matchesFilter(event, "all"))
    .filter(event => /^(tonight|today)/i.test(String(event.time || "")) || matchesDateFilter(event, "Today"))
    .sort(sortEventsByStart);
  return dedupeFeedEvents(tonight).slice(0, limit);
}

function eventFeedPattern(list) {
  if (!list.length) return `<p class="section-helper">No events match that filter right now.</p>`;
  const blocks = [];
  let index = 0;
  while (index < list.length) {
    blocks.push(`<div class="feed-hero-row">${eventRow(list[index], "hero")}</div>`);
    index++;
    if (index < list.length) {
      const pair = list.slice(index, index + 2);
      blocks.push(`<div class="feed-pair-row">${pair.map(event => eventRow(event, "half")).join("")}</div>`);
      index += pair.length;
    }
  }
  return `<div class="feed-grid">${blocks.join("")}</div>`;
}

// Per-category copy + filter chips. The first chip in each list is the
// "all/clear" option. Categories beyond the original brief (museums, festivals,
// community, free) are inferred following the same pattern.
const categoryFeedConfig = {
  concerts: { label: "Concerts", searchPlaceholder: "Search by artist, venue, or date…", chips: ["All shows", "This week", "This month", "Pop", "Rock", "Hip-Hop", "Country", "Classical"] },
  "live-music": { label: "Live music", searchPlaceholder: "Search by genre, venue, or artist…", chips: ["All shows", "Jazz", "Indie", "R&B", "Blues", "Folk", "Electronic", "Soul"] },
  "happy-hours": { label: "Happy hours", searchPlaceholder: "Search by type, vibe, or venue…", chips: ["All deals", "Cocktails", "Beer", "Wine", "Rooftop", "Patio", "Food deals", "After work"] },
  "trivia-nights": { label: "Trivia nights", searchPlaceholder: "Search by bar, theme, or night…", chips: ["All nights", "Free to play", "Pop culture", "Sports", "Music", "Science", "80s", "90s"] },
  food: { label: "Food & drink", searchPlaceholder: "Search by cuisine, restaurant, or deal…", chips: ["All", "Tastings", "Pop-ups", "Brunch", "Wine", "Beer", "Cocktails", "Food festival"] },
  nightlife: { label: "Nightlife", searchPlaceholder: "Search by venue, vibe, or night…", chips: ["All venues", "Clubs", "Bars", "Rooftop", "DJ nights", "Late night", "21+"] },
  culture: { label: "Culture", searchPlaceholder: "Search by embassy, country, heritage, or speaker…", chips: ["All culture", "Embassy", "International", "Heritage", "Reception", "Speaker", "Food tasting", "Dance"] },
  kids: { label: "Kids", searchPlaceholder: "Search by family event, age, venue, or activity…", chips: ["All kids", "Family Friendly", "All ages", "Storytime", "Workshop", "Outdoor", "Disney", "Free"] },
  "performing-arts": { label: "Performing arts", searchPlaceholder: "Search by theater, comedy, dance, film, or show…", chips: ["All events", "Free", "Theater", "Film", "Gallery", "Dance", "Comedy"] },
  sports: { label: "Sports", searchPlaceholder: "Search by team, sport, or venue…", chips: ["All sports", "Nationals", "Commanders", "Capitals", "Mystics", "DC United", "College"] },
  museums: { label: "Museums", searchPlaceholder: "Search by museum, exhibit, or show…", chips: ["All museums", "Free", "After hours", "Exhibits", "Tours", "Family", "Smithsonian"] },
  festivals: { label: "Markets", searchPlaceholder: "Search by market, neighborhood, or type…", chips: ["All markets", "Farmers market", "Flea market", "Makers & craft", "Food & drink", "Holiday", "Street fair", "Outdoor"] },
  community: { label: "Community", searchPlaceholder: "Search by cause, group, convention, or neighborhood…", chips: ["All events", "Volunteer", "Networking", "Convention", "Workshop", "Book club", "Outdoor", "Free"] },
  free: { label: "Free events", searchPlaceholder: "Search free events by type or venue…", chips: ["All free", "Comedy", "Museums", "Outdoor", "Live music", "Festivals", "Workshops", "Talks"] }
};

function getCategoryFeedConfig(category) {
  return categoryFeedConfig[category] || { label: discoverCategoryLabel(category), searchPlaceholder: `Search ${discoverCategoryLabel(category)}…`, chips: [] };
}

// Hero (first event) + "More near you" compact list (the rest). Used on the
// Discover home feed and every category detail page. Pass showBadge:false on
// single-category pages, where the event-type badge is redundant.
function renderHeroAndList(list, opts = {}) {
  if (!list.length) return `<p class="section-helper">No events match that filter right now.</p>`;
  const [hero, ...rest] = list;
  const heroHtml = eventRow(hero, "hero", { showBadge: opts.showBadge !== false });
  if (!rest.length) return `<div class="hero-list">${heroHtml}</div>`;
  const limit = opts.limit || 0;
  const collapsed = limit && !state.feedExpanded && rest.length > limit;
  const shown = collapsed ? rest.slice(0, limit) : rest;
  const rows = shown.map((event, index) => eventListRow(event, { isFirst: index === 0, isLast: index === shown.length - 1 })).join("");
  const moreButton = collapsed ? `<button class="view-more-feed" data-feed-more>View ${rest.length - limit} more</button>` : "";
  return `<div class="hero-list">${heroHtml}<p class="section-label more-near-you">More near you</p><div class="list-group">${rows}</div>${moreButton}</div>`;
}

// Following rail: a proper stories strip of followed venues/curators. Hidden
// entirely when the user follows nothing, rather than showing an empty row.
function followedVenueNames() {
  return Array.from(state.follows).filter(key => typeof key === "string" && key.startsWith("venue:")).map(key => key.slice(6));
}

function followingRail() {
  const stories = activeFollowingStories();
  const venues = followedVenueNames();
  if (!stories.length && !venues.length) return "";
  // Same tile format as Your top types, so the two rows read as one system.
  const venueTiles = venues.map(name => `<button class="top-type" data-venue-events="${escapeHtml(name)}">
    ${venueAvatarHtml(name, "tt-art", "tt-initial")}
    <b>${escapeHtml(name)}</b>
    <small>Following</small>
  </button>`).join("");
  const storyTiles = stories.map((story, index) => `<button class="top-type" data-story="${index}" data-search-text="${`${story.name} ${story.type}`.toLowerCase()}">
    <span class="tt-art tt-initial">${story.icon}</span>
    <b>${escapeHtml(story.todayOnly ? "Today" : story.name)}</b>
    <small>${escapeHtml(story.todayOnly ? story.storyEvents[0]?.title || "Today" : story.type)}</small>
  </button>`).join("");
  return `<div class="top-types top-types-scroll following-stories-row">${venueTiles}${storyTiles}</div>`;
}

function venueDirectoryMatch(name) {
  const key = venueImageKeyName(name);
  return venueDirectory.find(venue => venueImageKeyName(venue.name) === key) || null;
}

/* ============================================================
   Venue avatars
   Following a venue should look like following a venue, not like following the
   letter B. venueDirectory carries an image_url for most DC venues; where it
   doesn't, one of the venue's own listings will. Logo artwork is deliberately
   rejected for event cards (eventHasUsablePhoto) but it is exactly what an
   avatar wants, so the venue's own mark is preferred over a photo of one night.
   ============================================================ */

function venueAvatarImage(name) {
  const directory = venueDirectoryMatch(name);
  const fromDirectory = String(directory?.image_url || "").trim();
  if (fromDirectory) return fromDirectory;
  const displayName = directory?.name || name;
  const venueEvents = displayableDcEvents().filter(event => venueEventMatch(event, displayName));
  const logo = venueEvents.find(event => event.image && eventImageLooksLogoLike(event.image));
  return String(logo?.image || venueEvents.find(event => event.image)?.image || "").trim();
}

// Some venues only publish a knockout logo — white artwork on transparency,
// drawn for a dark header. Dropped on a white disc it is simply invisible, so
// those get an ink backdrop instead. The filename is the only signal available:
// the pixels come from another origin, so reading them back off a canvas throws.
function venueLogoIsKnockout(imageUrl) {
  const value = String(imageUrl || "").trim();
  let path = value.toLowerCase();
  try { path = new URL(value).pathname.toLowerCase(); } catch (_) {}
  let fileName = path.split(/[/?#]/).filter(Boolean).pop() || path;
  try { fileName = decodeURIComponent(fileName); } catch (_) {}
  return /(?:^|[\s._+-])(white|reverse|reversed|inverted|invert|knockout)(?:[\s._+-]|$)/.test(fileName.replace(/\+/g, " "));
}

// One shape for every list a followed venue appears in, so the Discover rail,
// the Social following list and the profile sheet stay in step. Falls back to
// the initial when the venue has no artwork at all — and, via the capture-phase
// error listener in 90-interactions, when the artwork fails to load.
function venueAvatarHtml(name, className, initialClassName = "") {
  const initial = escapeHtml(String(name || "V").trim().slice(0, 1).toUpperCase());
  // Both classes stay on the span either way, so the initial is still styled
  // correctly if the image is dropped later.
  const classes = [className, initialClassName].filter(Boolean).join(" ");
  const image = venueAvatarImage(name);
  if (!image) return `<span class="${classes}">${initial}</span>`;
  // Venue marks are wordmarks as often as they are badges, so a logo is
  // contained rather than cropped; a photo of the room can fill the circle.
  // This is the first guess, off the filename — the load listener in
  // 90-interactions settles it once the real proportions are known.
  const knockout = venueLogoIsKnockout(image);
  const fit = knockout || eventImageLooksLogoLike(image) ? " is-logo" : "";
  return `<span class="${classes} has-venue-image${fit}${knockout ? " is-knockout" : ""}" data-avatar-initial="${initial}"><img src="${escapeHtml(image)}" alt="" loading="lazy"></span>`;
}

function venueSearchMatches(query, limit = 8) {
  const terms = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const fromEvents = displayableDcEvents().map(event => ({ name: cleanLocationPart(event.venue), neighborhood: cleanLocationPart(event.area || event.neighborhood), image_url: event.image || "" }));
  // Collapse the spellings of a venue to one entry — "Tryst", "Tryst Bar
  // Events" and "Tryst Coffee House bar" are one result, not three.
  const merged = [...venueDirectory, ...fromEvents]
    .filter(venue => venue.name)
    .map(venue => ({ ...venue, name: canonicalVenueName(venue.name) }))
    .filter((venue, index, all) => all.findIndex(item => venueCanonicalKey(item.name) === venueCanonicalKey(venue.name)) === index);
  return merged
    .filter(venue => terms.every(term => `${venue.name} ${venue.neighborhood || ""} ${venue.address || ""}`.toLowerCase().includes(term)))
    .slice(0, limit);
}

function venueEventMatch(event, displayName) {
  const key = venueImageKeyName(displayName);
  const eventVenueKey = venueImageKeyName(event.venue);
  const eventLocationKey = venueImageKeyName(eventLocationLine(event));
  const text = `${event.venue || ""} ${event.title || ""} ${eventLocationLine(event) || ""}`.toLowerCase();
  const displayText = String(displayName || "").toLowerCase();
  if (!key) return false;
  if (eventVenueKey === key || eventLocationKey === key) return true;
  if (key.length >= 5 && eventVenueKey.length >= 5 && (eventVenueKey.includes(key) || key.includes(eventVenueKey))) return true;
  if (key.length >= 5 && eventLocationKey.length >= 5 && eventLocationKey.includes(key)) return true;
  return displayText.length >= 3 && text.includes(displayText);
}

function isVerifiedVenueName(name) {
  return state.verifiedVenues?.has(venueImageKeyName(name));
}

function openVenueApprovalRequiredSheet(name) {
  const displayName = cleanLocationPart(name) || accountVenueName() || "your venue";
  const pending = (state.pendingVenueRequests || []).some(request => venueImageKeyName(request.venue_name || request.venueName) === venueImageKeyName(displayName));
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet venue-approval-sheet" role="dialog" aria-modal="true" aria-label="Venue approval required"><button class="modal-close" aria-label="Close venue approval">&times;</button>
    <p class="eyebrow">Venue approval</p><h2>Approval required before posting.</h2>
    <p class="lede">${escapeHtml(displayName)} needs Lokal approval before event posts can be uploaded. ${pending ? "Your request is already pending review." : "Submit a verification request from Profile and we will review it."}</p>
    ${pending ? `<button class="wide-button" data-route="profile">View profile status</button>` : `<button class="wide-button" data-venue-verify>Request venue verification</button>`}
  </section></div>`;
}

function openVenueEvents(name) {
  const directoryVenue = venueDirectoryMatch(name) || { name };
  const displayName = directoryVenue.name || name;
  const venueEvents = displayableDcEvents().filter(event => venueEventMatch(event, displayName)).sort(sortEventsByStart).slice(0, 12);
  const following = state.follows.has(`venue:${displayName}`);
  const verified = isVerifiedVenueName(displayName);
  const eventVenueImage = venueEvents.find(event => event.image)?.image || "";
  const eventCardFallbackImage = venueEvents[0] ? eventCardImageSrc(venueEvents[0]) : "";
  const venueImage = directoryVenue.image_url || eventVenueImage || eventCardFallbackImage;
  const venueImg = venueImage ? `<img class="venue-page-img" src="${escapeHtml(venueImage)}" alt="" loading="lazy">` : "";
  const meta = [directoryVenue.neighborhood, directoryVenue.address].filter(Boolean).join(" / ");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet venue-page-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(displayName)}"><button class="modal-close" aria-label="Close venue">&times;</button>
    <div class="venue-page-hero${venueImage ? " has-image" : ""}">${venueImg}<p class="eyebrow">Venue${verified ? " / Verified" : ""}</p><h2>${escapeHtml(displayName)}</h2>${meta ? `<span>${escapeHtml(meta)}</span>` : ""}</div>
    <div class="venue-page-actions"><button class="follow-button venue-follow-btn ${following ? "selected" : ""}" data-follow-venue="venue:${escapeHtml(displayName)}">${following ? "Following" : "Follow"}</button>${isVenueAccount() ? `<button class="venue-add-button" data-post-venue-event="${escapeHtml(displayName)}" aria-label="${verified ? "Post event" : "Request approval"} for ${escapeHtml(displayName)}">+</button>` : ""}${directoryVenue.website_url ? `<a class="text-button" href="${escapeHtml(directoryVenue.website_url)}" target="_blank" rel="noreferrer">Website</a>` : ""}</div>
    <p class="eyebrow group-divider">Upcoming events</p>
    <div class="interest-list venue-event-list">${venueEvents.map(event => `<button class="interest-event venue-event-row" data-event="${event.id}" aria-label="Open ${escapeHtml(event.title)}"><span><b>${escapeHtml(event.title)}</b><small>${escapeHtml(event.time)}</small><em>${escapeHtml(eventLocationLine(event))}</em></span></button>`).join("") || `<p class="section-helper">No upcoming events listed for this venue yet.</p>`}</div>
  </section></div>`;
}

function openVenueEventPostSheet(name) {
  const directoryVenue = venueDirectoryMatch(name) || { name };
  const displayName = directoryVenue.name || name;
  if (!isVerifiedVenueName(displayName)) {
    openVenueApprovalRequiredSheet(displayName);
    return;
  }
  const address = directoryVenue.address || "";
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal settings-sheet venue-form-sheet" role="dialog" aria-modal="true" aria-label="Post an event for ${escapeHtml(displayName)}"><button class="modal-close" aria-label="Close post event">&times;</button>
    <p class="eyebrow">Verified venue</p><h2>Post an event</h2>
    <p class="lede">Create an event for ${escapeHtml(displayName)}. Submissions go to Lokal for review before publishing.</p>
    <input type="hidden" data-post-venue-name value="${escapeHtml(displayName)}">
    <label class="settings-field">Event name<input data-post-event-title placeholder="Summer patio DJ night"></label>
    <label class="settings-field">When starts<input data-post-starts-at type="datetime-local"></label>
    <label class="settings-field">When ends (optional)<input data-post-ends-at type="datetime-local"></label>
    <label class="settings-field">Where<input data-post-venue-address value="${escapeHtml(address)}" placeholder="Venue address or room"></label>
    <label class="settings-field">Category<select data-post-category>
      <option value="nightlife">Nightlife</option>
      <option value="culture">Culture</option>
      <option value="concerts">Concerts</option>
      <option value="live-music">Live music</option>
      <option value="performing-arts">Performing arts</option>
      <option value="kids">Kids</option>
      <option value="happy-hours">Happy hours</option>
      <option value="trivia-nights">Trivia nights</option>
      <option value="food">Food & drink</option>
      <option value="community">Community</option>
      <option value="sports">Sports</option>
      <option value="festivals">Festivals</option>
    </select></label>
    <label class="settings-field">Tags<input data-post-tags placeholder="DJ set, rooftop, 21+"></label>
    <label class="settings-field">Ticket or RSVP link<input data-post-ticket-url type="url" placeholder="https://..."></label>
    <label class="settings-field">Price (optional)<input data-post-price placeholder="Free, $10, From $25"></label>
    <label class="settings-field">Picture URL (optional)<input data-post-image-url type="url" placeholder="https://..."></label>
    <label class="settings-field">Description<textarea data-post-description placeholder="What should people know before they go?"></textarea></label>
    <label class="privacy-toggle recurring-toggle"><span><b>Recurring event</b><small>Use this for weekly trivia, monthly parties, classes, or repeat happy hours.</small></span><input data-post-recurring type="checkbox"></label>
    <div class="recurring-fields">
      <label class="settings-field">Repeats<select data-post-recurrence-frequency><option value="">Not recurring</option><option value="weekly">Weekly</option><option value="biweekly">Every other week</option><option value="monthly">Monthly</option></select></label>
      <label class="settings-field">Repeat until<input data-post-recurrence-until type="date"></label>
    </div>
    <p class="account-error" data-post-event-error></p>
    <button class="wide-button" data-submit-venue-event>Submit event</button>
  </section></div>`;
}

// Category weights built from the user's own data: tastes, saves, RSVPs, and
// attended history, so the feed adapts to what each person actually engages with.
// How common each tag is across the whole catalog (cached per events load) so we
// can reward specific tags (Jazz, Rooftop) over broad ones (Beer, Happy hour).
let discoverTagFreqCache = null;
function eventTagFrequencies() {
  if (discoverTagFreqCache && discoverTagFreqCache.size === events.length) return discoverTagFreqCache.map;
  const map = {};
  events.forEach(event => eventTags(event).forEach(tag => { const key = String(tag).toLowerCase(); map[key] = (map[key] || 0) + 1; }));
  discoverTagFreqCache = { size: events.length, map };
  return map;
}
function tagSpecificity(tag, freq) {
  return 1 / Math.sqrt((freq[String(tag).toLowerCase()] || 1));
}

function userPreferenceWeights() {
  const catWeights = {};
  const tagWeights = {};
  const bumpCat = (cat, weight) => { const key = String(cat || "").toLowerCase(); if (key) catWeights[key] = (catWeights[key] || 0) + weight; };
  // Time-of-day tags are already their own filter dimension; keep preferences
  // about genre/venue/vibe so reasons read like real tastes (Jazz, Rooftop).
  const isTimeTag = key => /^(early|late|morning|afternoon|evening|night|all day|today|tonight|this weekend|weekend|this week)/i.test(key);
  const bumpTags = (event, weight) => eventTags(event).forEach(tag => { const key = String(tag || "").toLowerCase(); if (key && !isTimeTag(key)) tagWeights[key] = (tagWeights[key] || 0) + weight; });
  (state.tastes || []).forEach(taste => { bumpCat(typeof categoryFromTaste === "function" ? categoryFromTaste(taste) : "", 2); const key = taste.toLowerCase(); tagWeights[key] = (tagWeights[key] || 0) + 2; });
  const fromIds = (idSet, weight) => Array.from(idSet || []).forEach(id => { const event = events.find(item => item.id === id); if (event) { bumpCat(event.cat, weight); bumpTags(event, weight); } });
  fromIds(state.saved, 2);
  fromIds(state.rsvps, 3);
  (typeof profileReceipts === "function" ? profileReceipts() : []).forEach(receipt => { bumpCat(receipt.cat, 3); const event = events.find(item => String(item.id) === String(receipt.id)); if (event) bumpTags(event, 3); });
  return { catWeights, tagWeights, tagFreq: eventTagFrequencies() };
}

function eventPersonalScore(event, weights) {
  let score = weights.catWeights[String(event.cat || "").toLowerCase()] || 0;
  // Specific (rare) tags count for more than broad ones, and more than the category.
  eventTags(event).forEach(tag => {
    const weight = weights.tagWeights[String(tag).toLowerCase()] || 0;
    if (weight) score += weight * 2 * tagSpecificity(tag, weights.tagFreq);
  });
  return score;
}

// Why an event was surfaced — the most specific tag the user has engaged with.
function eventPersonalReason(event, weights) {
  let bestTag = "";
  let bestScore = 0;
  eventTags(event).forEach(tag => {
    const weight = weights.tagWeights[String(tag).toLowerCase()] || 0;
    if (!weight) return;
    const score = weight * tagSpecificity(tag, weights.tagFreq);
    if (score > bestScore) { bestScore = score; bestTag = tag; }
  });
  return bestTag ? `Because you like ${bestTag}` : "";
}

// Personalized ordering for the main feed: events matching the user's tastes and
// past behavior (by specific tag and category) float up; ties broken by soonest start.
// Marquee DC venues — a show here is almost always a "bigger" event.
const MARQUEE_VENUE_RE = /\b(the anthem|9:?30 club|capital one arena|nationals park|audi field|dar constitution hall|constitution hall|the howard theatre|howard theatre|echostage|union stage|warner theatre|lincoln theatre|kennedy center|national theatre|wolf trap|merriweather|strathmore|entertainment and sports arena|city winery|the fillmore|black cat|pearl street warehouse)\b/;

// A rough "how big / popular is this" signal so marquee shows and buzzy events
// surface in the mixed feed alongside personalized picks. Deliberately small
// relative to strong personal-tag matches so real tastes still win.
function eventPopularityScore(event) {
  let score = 0;
  const venueText = `${event.venue || ""} ${event.area || ""}`.toLowerCase();
  if (MARQUEE_VENUE_RE.test(venueText)) score += 8;
  const catTier = { concerts: 4, festivals: 4, culture: 4, sports: 4, "performing-arts": 3, "live-music": 3, kids: 3, nightlife: 2, community: 1, expos: 1, museums: 1, "happy-hours": 0, "trivia-nights": 0 };
  score += catTier[String(event.cat || "").toLowerCase()] ?? 1;
  // Ticketed events with a real start time skew toward marquee programming.
  if (event.hasPreciseStart && eventPriceLabel(event)) score += 2;
  return score;
}

// Personalized ordering for the For You feed: taste match + a popularity boost.
function feedPersonalSort(list) {
  const weights = userPreferenceWeights();
  const key = event => eventPersonalScore(event, weights) + eventPopularityScore(event);
  return list.slice().sort((a, b) => key(b) - key(a) || sortEventsByStart(a, b));
}

// General All feed ordering: keep it broadly similar for everyone by using time
// and category variety instead of personal tastes.
// The feed leans on the user's tastes, but a handful of categories (happy
// hours, trivia) have far more listings than anything else, so a purely
// interest-weighted order buries the rest of the city. Each pick is scored on
// interest match, then penalised for how recently its category, venue and
// title-shape have already appeared. Variety wins ties.
function feedCategoryKey(event) {
  return String(discoverCategoryLabel(event.cat || "other")).toLowerCase();
}

// Spread a single round so the same category never lands three deep.
function spaceFeedCategories(round) {
  const remaining = round.slice();
  const out = [];
  while (remaining.length) {
    const recent = new Set(out.slice(-2).map(feedCategoryKey));
    let index = remaining.findIndex(event => !recent.has(feedCategoryKey(event)));
    if (index === -1) index = 0;
    out.push(remaining.splice(index, 1)[0]);
  }
  return out;
}

function feedMixedSort(list) {
  const weights = typeof userPreferenceWeights === "function" ? userPreferenceWeights() : null;
  const interestOf = event => (weights && typeof eventPersonalScore === "function") ? eventPersonalScore(event, weights) : 0;

  // Bucket by category + title shape, so the eight "Happy Hour" listings queue
  // behind one another instead of competing for the top of the feed.
  const buckets = new Map();
  list.slice().sort(sortEventsByStart).forEach(event => {
    const key = `${feedCategoryKey(event)}|${normalizedFeedDedupeTitle(event)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(event);
  });

  // Round 1 takes one event from every distinct listing, ordered by how well it
  // matches the user's tastes. Round 2 takes the seconds, and so on — so the
  // feed leads with breadth and only repeats a listing once everything else
  // has had a turn.
  const lists = [...buckets.values()];
  const depth = Math.max(0, ...lists.map(items => items.length));
  const result = [];
  for (let round = 0; round < depth; round += 1) {
    const picks = lists.map(items => items[round]).filter(Boolean);
    picks.sort((a, b) => (interestOf(b) - interestOf(a)) || sortEventsByStart(a, b));
    result.push(...spaceFeedCategories(picks));
  }
  return result;
}

function neighborhoodControls(sourceEvents) {
  const active = state.neighborhoodFilter || "";
  const options = discoverNeighborhoodOptions(sourceEvents);
  return `<section class="genre-filter-panel" aria-label="Search by neighborhood">
    <label class="search-box genre-search"><span>&#8981;</span><input data-neighborhood-search placeholder="Search by neighborhood" value="${escapeHtml(active)}" aria-label="Search by neighborhood"></label>
    <div class="genre-chips"><button class="filter-chip ${active ? "" : "active"}" data-neighborhood="">All neighborhoods</button>${options.map(name => `<button class="filter-chip ${name.toLowerCase() === active.toLowerCase() ? "active" : ""}" data-neighborhood="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}</div>
  </section>`;
}

// Live scrolling ticker of upcoming events (from the landing-page hero treatment).
// The line is rendered twice so the marquee loops seamlessly.
function liveTicker() {
  const items = dedupeFeedEvents(displayableDcEvents().filter(event => matchesFilter(event, "all")).sort(sortEventsByStart)).slice(0, 12);
  if (!items.length) return "";
  const line = items.map(event => `<span><i></i>${escapeHtml(cleanLocationPart(event.area || event.neighborhood) || "DC")} · ${escapeHtml(event.title)} · ${escapeHtml(event.time)}</span>`).join("");
  return `<div class="live-ticker" aria-hidden="true"><div class="live-ticker-track">${line}${line}</div></div>`;
}

// Paginated feed: every event renders as a full image-then-text card, 10 at a
// time. "View more" reveals the next 10 only (state.feedShown), not everything.
// Canvas "no results" screen — names the filters that are actually on and
// offers to drop each one, rather than a dead end.
function noResultsScreen() {
  const active = [];
  if (state.whatFilter && state.whatFilter.size) active.push({ label: "type", clear: "data-clear-what" });
  if (state.whereFilter && state.whereFilter.size) active.push({ label: "neighborhood", clear: "data-clear-where" });
  const whenOn = (state.whenFilter && state.whenFilter.size)
    || (state.filter.date && state.filter.date !== "Any date")
    || (state.filter.time && state.filter.time !== "Any time");
  if (whenOn) active.push({ label: "date", clear: "data-clear-when" });

  const headline = active.length > 1
    ? `Nothing matches all ${active.length} filters`
    : active.length === 1
      ? `Nothing matches that ${active[0].label} filter`
      : "Nothing to show right now";
  const body = active.length
    ? `That combination is rare in DC right now. Loosen one thing and we'll try again.`
    : `We could not find any events for this view. Try refreshing the feed.`;
  const actions = active
    .map((item, index) => `<button class="wide-button ${index === 0 ? "" : "secondary"}" ${item.clear}>Drop the ${item.label} filter</button>`)
    .join("");

  const closest = dedupeFeedEvents(displayableDcEvents().slice().sort(sortEventsByStart))[0];
  const closestBlock = closest
    ? `<div class="no-results-closest"><p class="eyebrow">Closest match</p>
        <button class="top-ten-row" data-event="${closest.id}">
          <span class="tt-thumb"><img src="${eventCardImageSrc(closest)}" alt="" loading="lazy"></span>
          <span class="tt-copy"><b>${escapeHtml(closest.title)}</b><small>${escapeHtml(eventMetaLine(closest))}</small></span>
        </button></div>`
    : "";

  return `<div class="no-results">
    <div class="no-results-art" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 20h18"/><path d="M6 20V9l5-4 5 4v11"/><path d="M9.5 20v-4h3v4"/><path d="M19 5.5l-2.5 2.5M16.5 5.5L19 8"/></svg></div>
    <h3>${escapeHtml(headline)}</h3>
    <p>${escapeHtml(body)}</p>
    ${actions ? `<div class="no-results-actions">${actions}</div>` : ""}
    ${closestBlock}
  </div>`;
}

function renderEventFeed(list, opts = {}) {
  const uniqueList = dedupeFeedEvents(list);
  if (!uniqueList.length) return noResultsScreen();
  const shown = Math.max(10, opts.shown || state.feedShown || 10);
  const visible = uniqueList.slice(0, shown);
  // Show the "Because you like ..." reason only in explicitly personalized feeds.
  const weights = (opts.personalized && opts.showBadge !== false) ? userPreferenceWeights() : null;
  const cards = visible.map(event => eventRow(event, "", { showBadge: opts.showBadge !== false, reason: weights ? eventPersonalReason(event, weights) : "" })).join("");
  const remaining = uniqueList.length - shown;
  const moreAttr = opts.moreAttr || "data-feed-more";
  const more = remaining > 0 ? `<button class="view-more-feed" ${moreAttr}>View ${Math.min(10, remaining)} more</button>` : "";
  // Masonry: cards size to their image so they aren't all identical, packed into
  // multiple columns. The "View more" button sits outside the columns.
  return `<div class="feed-masonry">${cards}</div>${more}`;
}

function topWeekEventScore(event) {
  const interactionScore =
    (state.saved?.has(event.id) ? 8 : 0)
    + (state.rsvps?.has(event.id) ? 10 : 0)
    + (event.friends?.length || 0) * 3;
  const imageScore = String(event.image || "").trim() ? 4 : 0;
  return eventPopularityScore(event) + interactionScore + imageScore;
}

function topWeekEvents(limit = 10) {
  const now = Date.now();
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
  const weekEvents = dedupeFeedEvents(displayableDcEvents()
    .filter(event => Number.isFinite(event.startSort) && event.startSort >= now && event.startSort <= weekEnd)
    .sort((a, b) => topWeekEventScore(b) - topWeekEventScore(a) || sortEventsByStart(a, b)));
  const fallbackEvents = dedupeFeedEvents(displayableDcEvents()
    .filter(event => Number.isFinite(event.startSort) && event.startSort >= now)
    .sort((a, b) => topWeekEventScore(b) - topWeekEventScore(a) || sortEventsByStart(a, b)));
  const pool = weekEvents.length >= limit ? weekEvents : [...weekEvents, ...fallbackEvents.filter(event => !weekEvents.some(item => item.id === event.id))];
  const picks = [];
  const usedCategories = new Set();
  pool.forEach(event => {
    const category = String(event.cat || "").toLowerCase();
    if (picks.length < limit && category && !usedCategories.has(category)) {
      picks.push(event);
      usedCategories.add(category);
    }
  });
  pool.forEach(event => {
    if (picks.length < limit && !picks.some(item => item.id === event.id)) picks.push(event);
  });
  return picks.slice(0, limit);
}

function renderTopWeekEvents() {
  const picks = topWeekEvents(10);
  if (!picks.length) return "";
  return `<section class="top-week-section" aria-label="Top 10 events this week discovered by Lokal">
    <button class="top-week-heading" data-top-week-events>
      <span class="top-week-badge">10</span><div><p class="eyebrow">Discovered by Lokal</p><h3>Top 10 events this week</h3></div><i aria-hidden="true">&rarr;</i>
    </button>
  </section>`;
}

function topWeekThumbSrc(event) {
  return event.image ? eventCardImageSrc(event) : (venueDirectoryMatch(event.venue)?.image_url || eventCardImageSrc(event));
}

function openTopWeekEvents() {
  const picks = topWeekEvents(10);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet top-week-sheet" role="dialog" aria-modal="true" aria-label="Top 10 events this week"><button class="modal-close" aria-label="Close top 10">&times;</button>
    <p class="eyebrow">Discovered by Lokal</p><h2>Top 10 events this week</h2>
    <p class="lede">A ranked mix of the week across DC, balancing category variety with saves, RSVPs, shares, venue quality, and timing.</p>
    <div class="top-week-list">${picks.map((event, index) => `<button class="top-week-row" data-top-week-event="${event.id}" aria-label="Open ${escapeHtml(eventDisplayTitle(event))}"><span class="top-week-row-rank">${index + 1}</span><span class="top-week-row-thumb"><img src="${escapeHtml(topWeekThumbSrc(event))}" alt="" loading="lazy"></span><span class="top-week-row-copy"><b>${escapeHtml(eventDisplayTitle(event))}</b><small>${escapeHtml(cleanLocationPart(event.venue) || eventLocationLine(event))}</small><em>${escapeHtml(eventDisplayTime(event))} / ${escapeHtml(discoverCategoryLabel(event.cat || "community"))}</em></span></button>`).join("") || `<p class="section-helper">No ranked events are available yet.</p>`}</div>
  </section></div>`;
}

// --- Today's five, as a card deck -----------------------------------------
// The first thing you see on opening the app: today's five picks as a stack of
// cards you swipe through, rather than a list you read. The card you are on sits
// square in the middle and the rest fan out behind it, so the whole thing reads
// as one physical deck. It also advances on its own, so the surface feels alive
// when it is just sitting there.
const TODAY_HERO_ROTATE_MS = 3800;
// How long the deck waits after you touch it before it starts advancing again.
const TODAY_HERO_RESUME_MS = 9000;
// Past this much horizontal drag, letting go throws the card instead of
// springing it back. Roughly a third of a card.
const TODAY_HERO_THROW_PX = 68;
// Movement under this is a tap, not a drag, and should open the event.
const TODAY_HERO_TAP_PX = 8;
let todayHeroTimer = null;
let todayHeroResumeTimer = null;

// Today's picks first. Once the last of today's events has started, widen to
// whatever is next on the calendar rather than emptying the deck: the old
// fallback re-selected from `pool`, which is the very list that had just been
// emptied by the already-happened filter, so the deck vanished every evening.
function todayHeroEvents(limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const stillToCome = list => (list || [])
    .slice()
    .filter(event => !storyEventAlreadyHappened(event))
    .sort(sortEventsByStart);
  const storyPool = stillToCome(state.todayStoryEvents);
  const fullPool = stillToCome(displayableDcEvents());
  const preferred = storyPool.length ? storyPool : fullPool;
  const todays = dailyFeaturedEventSelection(preferred.filter(event => sameCalendarDate(eventDateValue(event), today)), limit);
  if (todays.length) return todays;
  // dailyFeaturedEventSelection ranks by popularity, so handed the whole
  // calendar it will happily surface a stadium show three weeks out. Widen the
  // window a day at a time instead, so "coming up next" stays literally true.
  for (const days of [1, 2, 3, 7, 14]) {
    const cutoff = new Date(today.getTime() + (days + 1) * 86400000);
    const soon = dailyFeaturedEventSelection(fullPool.filter(event => {
      const date = eventDateValue(event);
      return date && date < cutoff;
    }), limit);
    if (soon.length >= limit) return soon;
    if (soon.length && days === 14) return soon;
  }
  return dailyFeaturedEventSelection(fullPool.length ? fullPool : preferred, limit);
}

// The heading has to tell the truth about what is in the deck — "Happening
// today" over tomorrow morning's events is a small lie the user will catch.
function todayHeroIsToday(list) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return list.length > 0 && list.every(event => sameCalendarDate(eventDateValue(event), today));
}

// When the deck is all today the fact strip only needs the clock — the full
// "Sun, Aug 2, 2:30 PM" stays on the line under the title. On a day where
// today's events have all started, the deck shows what's next, and then the
// clock alone would read as though it were tonight, so the weekday comes too.
function todayHeroClock(event, isToday = true) {
  const display = String(eventDisplayTime(event) || "");
  const match = display.match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM)/i);
  if (!match) return display || "Today";
  const clock = match[0].replace(/\s+/g, " ").toUpperCase();
  if (isToday) return clock;
  const weekday = display.match(/^[A-Za-z]{3}/);
  return weekday ? `${weekday[0].toUpperCase()} ${clock}` : clock;
}

function todayHeroCard(event, index, total, isToday = true) {
  const displayTitle = eventDisplayTitle(event);
  const venue = cleanLocationPart(canonicalVenueName(event.venue)) || eventLocationLine(event) || "Washington, DC";
  const price = typeof eventPriceLabel === "function" ? eventPriceLabel(event) : "";
  // The neighbourhood only earns its place when it says something the venue line
  // above it hasn't already ("Audi Field" then "Audi Field / Washington, DC").
  const area = eventCardArea(event);
  const areaAddsSomething = area && !`${venue}`.toLowerCase().includes(area.toLowerCase()) && !area.toLowerCase().includes(venue.toLowerCase());
  const meta = [eventDisplayTime(event), areaAddsSomething ? area : ""].filter(Boolean).join(" · ");
  // Top-left of the card carries the two facts you sort on — when, and what kind
  // of thing it is — as label-over-value pairs, the way the reference decks do.
  return `<article class="today-card" data-today-card="${index}" data-depth="${Math.min(index, 3)}" style="z-index:${total - index}" role="group" aria-roledescription="slide" aria-label="${index + 1} of ${total}: ${escapeHtml(displayTitle)}">
    <img class="today-card-img" src="${escapeHtml(eventCardImageSrc(event))}" data-fallback-src="${escapeHtml(eventFallbackImageSrc(event))}" onerror="this.onerror=null;this.src=this.dataset.fallbackSrc;this.classList.add('is-fallback-image');" alt="" loading="${index === 0 ? "eager" : "lazy"}">
    <span class="today-card-shade" aria-hidden="true"></span>
    <span class="today-card-sheen" aria-hidden="true"></span>
    <button class="today-card-hit" data-event="${event.id}" aria-label="Open ${escapeHtml(displayTitle)}"></button>
    <span class="today-card-top">
      <span class="today-card-facts">
        <span class="today-fact"><small>Starts</small><b>${escapeHtml(todayHeroClock(event, isToday))}</b></span>
        <span class="today-fact"><small>Type</small><b>${escapeHtml(eventArtLabel(event))}</b></span>
      </span>
      <span class="today-card-tools">
        <button class="card-icon-btn card-share today-card-tool" data-share="${event.id}" aria-label="Share ${escapeHtml(displayTitle)}">${cardShareIcon}</button>
        <button class="card-icon-btn card-save today-card-tool${state.saved.has(event.id) ? " is-saved" : ""}" data-save="${event.id}" aria-label="Save ${escapeHtml(displayTitle)}">${cardHeartIcon}</button>
      </span>
    </span>
    <span class="today-card-copy">
      <b class="today-card-title">${escapeHtml(displayTitle)}</b>
      <span class="today-card-venue">${escapeHtml(venue)}</span>
      ${meta || price ? `<span class="today-card-meta">${escapeHtml(meta)}${price ? `<i class="today-card-price">${escapeHtml(price)}</i>` : ""}</span>` : ""}
    </span>
  </article>`;
}

function renderTodayHero() {
  const events = todayHeroEvents(5);
  if (!events.length) return "";
  const isToday = todayHeroIsToday(events);
  const cards = events.map((event, index) => todayHeroCard(event, index, events.length, isToday)).join("");
  const dots = events.map((event, index) => `<button class="today-dot${index === 0 ? " is-on" : ""}" data-today-dot="${index}" aria-label="Show pick ${index + 1}"></button>`).join("");
  return `<section class="today-hero" data-today-hero aria-roledescription="carousel" aria-label="${isToday ? "Today's top picks" : "Coming up next"}">
    <div class="today-hero-head">
      <span class="today-hero-badge" aria-hidden="true">${events.length}</span>
      <div class="today-hero-headings">
        <p class="eyebrow">${isToday ? "Happening today" : "Coming up next"}<span class="today-hero-live" aria-hidden="true"></span></p>
        <h2>Top ${events.length} in DC</h2>
      </div>
    </div>
    <div class="today-deck" data-today-deck tabindex="0" role="group" aria-label="Swipe through today's picks">${cards}</div>
    <div class="today-hero-dots" data-today-dots>${dots}</div>
  </section>`;
}

// Wires the deck up after render. Each card's position in the stack is a `depth`
// (0 is the front card, 1 and 2 fan out behind it, anything deeper is parked out
// of sight); CSS owns what each depth looks like, this owns which card is at
// which depth. Dragging the front card throws it off and promotes the next.
// Any touch or keypress parks the auto-advance for a while, so the deck never
// pulls a card out from under someone mid-read.
function initTodayHero() {
  clearInterval(todayHeroTimer);
  clearTimeout(todayHeroResumeTimer);
  todayHeroTimer = null;
  todayHeroResumeTimer = null;
  const hero = document.querySelector("[data-today-hero]");
  const deck = hero?.querySelector("[data-today-deck]");
  if (!hero || !deck) return;
  const cards = [...deck.querySelectorAll(".today-card")];
  const dots = [...hero.querySelectorAll("[data-today-dot]")];
  if (!cards.length) return;
  const total = cards.length;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // A re-render (a sync landing, a filter clearing) shouldn't throw the deck back
  // to the first card while someone is part-way through it.
  let index = Math.min(Math.max(Number(state.todayHeroIndex) || 0, 0), total - 1);
  let busy = false;

  const layout = () => {
    state.todayHeroIndex = index;
    cards.forEach((card, position) => {
      const depth = (position - index + total) % total;
      card.dataset.depth = String(Math.min(depth, 3));
      card.style.zIndex = String(total - depth);
      card.style.transform = "";
      card.classList.toggle("is-front", depth === 0);
      // Only the front card is reachable; the fanned ones are decoration.
      card.querySelectorAll("button").forEach(button => { button.tabIndex = depth === 0 ? 0 : -1; });
      card.setAttribute("aria-hidden", depth === 0 ? "false" : "true");
    });
    dots.forEach((dot, position) => dot.classList.toggle("is-on", position === index));
  };

  // Throw the front card off in `direction` (1 = forwards/left, -1 = back/right)
  // and restack. The card that leaves is put back at the bottom of the deck with
  // transitions suppressed for a frame, so it doesn't visibly fly back across.
  const advance = direction => {
    if (busy || total < 2) return;
    const outgoing = cards[index];
    busy = true;
    outgoing.dataset.depth = "out";
    outgoing.style.transform = `translate3d(${direction > 0 ? "-125%" : "125%"}, 6%, 0) rotate(${direction > 0 ? -16 : 16}deg)`;
    const settle = () => {
      index = (index + direction + total) % total;
      outgoing.classList.add("no-transition");
      layout();
      // Two frames: one for the class to apply, one for the new depth to paint.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        outgoing.classList.remove("no-transition");
        busy = false;
      }));
    };
    reduceMotion ? settle() : setTimeout(settle, 300);
  };

  const goTo = target => {
    const next = ((target % total) + total) % total;
    if (next === index || busy) return;
    // Shortest way round the deck, so tapping the last dot doesn't walk through
    // every card in between.
    const forward = (next - index + total) % total;
    advance(forward <= total - forward ? 1 : -1);
    if (forward !== 1 && total - forward !== 1) {
      // More than one card away: land the rest without the throw animation.
      setTimeout(() => { index = next; layout(); }, reduceMotion ? 0 : 320);
    }
  };

  const start = () => {
    if (reduceMotion || total < 2) return;
    clearInterval(todayHeroTimer);
    todayHeroTimer = setInterval(() => {
      if (document.hidden || document.querySelector(".modal-backdrop") || !document.body.contains(deck)) return;
      advance(1);
    }, TODAY_HERO_ROTATE_MS);
  };
  const pause = () => {
    clearInterval(todayHeroTimer);
    clearTimeout(todayHeroResumeTimer);
    todayHeroTimer = null;
    todayHeroResumeTimer = setTimeout(start, TODAY_HERO_RESUME_MS);
  };

  // --- Drag ----------------------------------------------------------------
  let drag = null;
  deck.addEventListener("pointerdown", event => {
    if (busy || event.button > 0) return;
    const front = cards[index];
    if (!event.target.closest(".today-card") || !front.contains(event.target)) return;
    // Leave the tool buttons alone — they are targets, not drag handles.
    if (event.target.closest(".today-card-tool")) return;
    pause();
    drag = { x: event.clientX, y: event.clientY, dx: 0, moved: false, id: event.pointerId };
    front.classList.add("is-dragging");
  });

  deck.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    // Vertical intent belongs to the page scroll, not the deck.
    if (!drag.moved && Math.abs(dy) > Math.abs(dx) * 1.3 && Math.abs(dy) > TODAY_HERO_TAP_PX) { release(false); return; }
    if (Math.abs(dx) > TODAY_HERO_TAP_PX) drag.moved = true;
    drag.dx = dx;
    if (!drag.moved) return;
    event.preventDefault();
    const front = cards[index];
    front.style.transform = `translate3d(${dx}px, ${Math.abs(dx) * 0.04}px, 0) rotate(${dx / 22}deg)`;
  });

  function release(allowThrow = true) {
    if (!drag) return;
    const front = cards[index];
    const { dx, moved } = drag;
    drag = null;
    front.classList.remove("is-dragging");
    if (allowThrow && moved && Math.abs(dx) > TODAY_HERO_THROW_PX) advance(dx < 0 ? 1 : -1);
    else front.style.transform = "";
    // A drag that ends on the card would otherwise fire a click and open the
    // event the user was only flicking past.
    if (moved) {
      deck.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => deck.removeEventListener("click", swallow, { capture: true }), 0);
    }
  }
  const swallow = event => { event.stopPropagation(); event.preventDefault(); };
  deck.addEventListener("pointerup", () => release());
  deck.addEventListener("pointercancel", () => release(false));
  deck.addEventListener("pointerleave", () => release());

  deck.addEventListener("keydown", event => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    pause();
    advance(event.key === "ArrowRight" ? 1 : -1);
  });
  dots.forEach((dot, position) => dot.addEventListener("click", () => { pause(); goTo(position); }));

  layout();
  start();
}

function tonightMapEvents(limit = 5) {
  const dc = dedupeFeedEvents(displayableDcEvents().filter(event => matchesFilter(event, "all")).sort(sortEventsByStart));
  const withPictures = dc.filter(event => String(event.image || "").trim());
  const tonight = withPictures.filter(event => /^(tonight|today)/i.test(String(event.time || "")) || matchesDateFilter(event, "Today"));
  const pool = tonight.length >= limit ? tonight : [...tonight, ...withPictures.filter(event => !tonight.includes(event))];
  const picks = [];
  const seenCategories = new Set();
  const addIfNewCategory = event => {
    const category = String(event.cat || "other").toLowerCase();
    if (seenCategories.has(category) || picks.some(item => item.id === event.id)) return;
    picks.push(event);
    seenCategories.add(category);
  };
  pool.forEach(event => {
    if (picks.length < limit) addIfNewCategory(event);
  });
  pool.forEach(event => {
    if (picks.length < limit && !picks.some(item => item.id === event.id)) picks.push(event);
  });
  return picks.slice(0, limit);
}

// Landing-page style: a DC photo with up to 5 events popping up across the city.
// Each pin is tappable and opens that event's detail.
function renderTonightMap() {
  const events = tonightMapEvents(5);
  if (!events.length) return "";
  const spots = [[19, 26], [66, 19], [41, 49], [74, 63], [25, 75]];
  const pins = events.map((event, index) => {
    const [x, y] = spots[index % spots.length];
    const venue = cleanLocationPart(event.venue) || eventLocationLine(event) || "DC";
    return `<button class="tonight-pin" data-event="${event.id}" style="left:${x}%;top:${y}%;animation-delay:${(index * 0.45).toFixed(2)}s" aria-label="Open ${escapeHtml(event.title)} at ${escapeHtml(venue)}"><span class="tonight-pin-dot"></span><span class="tonight-pin-copy"><b>${escapeHtml(event.title)}</b><small>${escapeHtml(venue)}</small></span></button>`;
  }).join("");
  return `<section class="tonight-map">
    <div class="tonight-head"><span class="tonight-dot"></span><h2>Happening Today</h2></div>
    <div class="tonight-canvas">${pins}</div>
  </section>`;
}
// Sub-filters shown directly under the main category chips. The genre/type facet
// and the neighborhood are independent dimensions and combine with each other and
// the category (e.g. Live music + Karaoke + Shaw).
function filterDateLabel(value) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.includes("..") ? "Date range" : value;
  return value;
}
function filterTimeLabel(value) {
  if (/^custom:/.test(value)) return value.replace("custom:", "").replace("-", "–");
  return value;
}

// Filter bar: What / Where / When, each a multi-select dropdown. Selections combine.
const WHEN_DATE_TOKENS = ["Today", "This weekend", "This week"];
const WHEN_TIME_TOKENS = ["Morning", "Afternoon", "Evening", "Late night"];

function whatFilterOptions() {
  return discoverFilterItems().filter(([value]) => value !== "all");
}
function whatLabelFor(value) {
  const item = discoverFilterItems().find(([itemValue]) => itemValue === value);
  return item ? item[1] : value;
}
function filterBarSummary(labels, fallback) {
  const list = [...labels];
  if (!list.length) return fallback;
  return list.length === 1 ? list[0] : `${list[0]} +${list.length - 1}`;
}
function whenSelectionLabels() {
  const labels = [...(state.whenFilter || new Set())];
  if (state.filter.date && state.filter.date !== "Any date") labels.push(filterDateLabel(state.filter.date));
  if (state.filter.time && state.filter.time !== "Any time") labels.push(filterTimeLabel(state.filter.time));
  return labels;
}

function renderFilterBar() {
  const open = state.openFilterSheet || "";
  const what = state.whatFilter || new Set();
  const where = state.whereFilter || new Set();
  const whenLabels = whenSelectionLabels();
  // Each pill owns its dropdown so the panel opens directly beneath the pill that
  // was tapped (absolutely positioned inside the pill's wrapper), not full-width.
  // Three rows, three sheets. Each opens a full-height picker rather than an
  // inline dropdown, so When, Where and What all behave the same way.
  // The rows carry the criterion and nothing else; an active filter reads
  // through weight and the mint dot rather than a second line of text.
  const cardRow = (attr, label, isSet, iconName) => `<button class="search-card-row${isSet ? " is-set" : ""}" ${attr}>
    <span class="sc-dot filter-row-icon filter-row-icon-${iconName}" aria-hidden="true">${icons[iconName]}</span>
    <span class="sc-copy"><b>${label}</b></span>
    <span class="sc-caret">&rsaquo;</span>
  </button>`;
  const anyActive = (what.size ? 1 : 0) + (where.size ? 1 : 0) + (whenLabels.length ? 1 : 0);
  const panelOpen = Boolean(state.filterPanelOpen);
  // Search field and a round filter button beside it. The three criteria stay
  // out of the way until the filter button is tapped; each then opens its own
  // sheet, so When, Where and What all behave identically.
  return `<div class="sub-filters">
    <div class="search-row">
      <label class="search-field">
        <span class="search-ic">${icons.search}</span>
        <input data-discover-search value="${escapeHtml(state.discoverSearch || "")}" placeholder="Search events or venues" aria-label="Search events, venues, or neighborhoods">
      </label>
      <button class="filter-round-btn${panelOpen ? " open" : ""}${anyActive ? " has-value" : ""}" data-toggle-filter-panel aria-expanded="${panelOpen}" aria-label="Filters">
        ${icons.sliders}${anyActive ? `<i class="filter-round-count">${anyActive}</i>` : ""}
      </button>
    </div>
    <div class="discover-search-results" data-discover-results hidden></div>
    ${panelOpen ? `<div class="filter-panel-rows">
      ${cardRow("data-when-sheet", "When", whenLabels.length, "clock")}
      ${cardRow("data-where-sheet", "Where", where.size, "pin")}
      ${cardRow("data-what-sheet", "What", what.size, "megaphone")}
      ${anyActive ? `<button class="search-card-clear" data-clear-all-filters>Clear filters</button>` : ""}
    </div>` : ""}
  </div>`;
}

// Where and What mirror the When sheet: a titled sheet, selectable options,
// and the same Clear / Apply footer.
function openWhereSheet() {
  const where = state.whereFilter || new Set();
  const options = discoverNeighborhoodOptions(displayableDcEvents());
  // "Everywhere" is the explicit default, mirroring "Anytime" in the When sheet.
  const chips = `<button class="${where.size ? "" : "selected"}" data-clear-where>Everywhere</button>`
    + options
      .map(name => `<button class="${where.has(name) ? "selected" : ""}" data-toggle-where="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
      .join("");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal filter-sheet where-sheet" role="dialog" aria-modal="true" aria-label="Where">
    <button class="modal-close" aria-label="Close">&times;</button>
    <div class="sheet-head"><h3>Where?</h3></div>
    <p class="cal-hint">${where.size ? `${where.size} neighborhood${where.size === 1 ? "" : "s"} selected` : "Pick one or more neighborhoods, or leave it open."}</p>
    <div class="filter-block"><div class="filter-options">${chips}</div></div>
    <div class="filter-footer"><button class="text-button" data-clear-where>Clear</button><button class="wide-button" data-apply-when>Apply</button></div>
  </section></div>`;
}

function openWhatSheet() {
  const what = state.whatFilter || new Set();
  const artForWhat = (value, label) => {
    const aliases = {
      concerts: "Concerts",
      "live-music": "Live music",
      food: "Food & drink",
      nightlife: "Nightlife",
      culture: "Culture",
      kids: "Kids",
      "performing-arts": "Performing arts",
      museums: "Museums",
      sports: "Sports",
      festivals: "Markets",
      community: "Community",
      "happy-hours": "Happy hours",
      "trivia-nights": "Trivia",
      free: "Free events"
    };
    return categoryArt[aliases[value] || label] || "";
  };
  const optionButton = (value, label) => `<button class="what-option ${what.has(value) ? "selected" : ""}" data-toggle-what="${escapeHtml(value)}">${artForWhat(value, label) ? `<span class="what-option-art" aria-hidden="true">${artForWhat(value, label)}</span>` : ""}<span>${escapeHtml(label)}</span></button>`;
  const chips = `<button class="what-option ${what.size ? "" : "selected"}" data-clear-what><span class="what-option-art what-option-all" aria-hidden="true">${icons.spark}</span><span>All</span></button>`
    + whatFilterOptions()
      .map(([value, label]) => optionButton(value, label))
      .join("");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal filter-sheet what-sheet" role="dialog" aria-modal="true" aria-label="What">
    <button class="modal-close" aria-label="Close">&times;</button>
    <div class="sheet-head"><h3>What?</h3></div>
    <p class="cal-hint">${what.size ? `${what.size} type${what.size === 1 ? "" : "s"} selected` : "Pick the kinds of events you want to see."}</p>
    <div class="filter-block"><div class="filter-options">${chips}</div></div>
    <div class="filter-footer"><button class="text-button" data-clear-what>Clear</button><button class="wide-button" data-apply-when>Apply</button></div>
  </section></div>`;
}

// The canvas "When step": preset chips, the month calendar, time of day,
// then Clear / Apply. Same date module the filter sheet uses.
function openWhenSheet() {
  const when = state.whenFilter || new Set();
  const hasTimeFilter = WHEN_TIME_TOKENS.some(token => when.has(token)) || (state.filter.time && state.filter.time !== "Any time");
  const anytimeChip = `<button class="${hasTimeFilter ? "" : "selected"}" data-clear-time-filter>Anytime</button>`;
  const timeChips = anytimeChip + WHEN_TIME_TOKENS
    .map(token => `<button class="${when.has(token) ? "selected" : ""}" data-toggle-when="${token}">${token}</button>`)
    .join("");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal filter-sheet when-sheet" role="dialog" aria-modal="true" aria-label="When">
    <button class="modal-close" aria-label="Close">&times;</button>
    ${dateFilterModule()}
    <div class="filter-block"><p class="eyebrow">Time of day</p><div class="filter-options">${timeChips}</div></div>
    <div class="filter-footer"><button class="text-button" data-clear-when>Clear</button><button class="wide-button" data-apply-when>Apply</button></div>
  </section></div>`;
}

function checkRow(kind, value, label, checked) {
  return `<button class="check-row${checked ? " checked" : ""}" data-toggle-${kind}="${escapeHtml(value)}"><span class="check-box">${checked ? icons.check : ""}</span><span>${escapeHtml(label)}</span></button>`;
}

function filterDropdownContent(kind) {
  if (kind === "what") {
    const what = state.whatFilter || new Set();
    const allRow = `<button class="check-row${what.size ? "" : " checked"}" data-clear-what><span class="check-box">${what.size ? "" : icons.check}</span><span>All</span></button>`;
    return `<div class="check-list check-list-scroll">${allRow}${whatFilterOptions().map(([value, label]) => checkRow("what", value, label, what.has(value))).join("")}</div>${what.size ? `<button class="dropdown-clear" data-clear-what>Clear all</button>` : ""}`;
  }
  if (kind === "where") {
    const where = state.whereFilter || new Set();
    const options = discoverNeighborhoodOptions(displayableDcEvents());
    const everywhereRow = `<button class="check-row${where.size ? "" : " checked"}" data-clear-where><span class="check-box">${where.size ? "" : icons.check}</span><span>Everywhere</span></button>`;
    return `<div class="check-list check-list-scroll">${everywhereRow}${options.map(name => checkRow("where", name, name, where.has(name))).join("")}</div>${where.size ? `<button class="dropdown-clear" data-clear-where>Clear all</button>` : ""}`;
  }
  if (kind === "when") {
    const when = state.whenFilter || new Set();
    const dateVal = state.filter.date && state.filter.date !== "Any date" ? state.filter.date : "";
    const timeVal = state.filter.time && state.filter.time !== "Any time" ? state.filter.time : "";
    const isCustomDate = /^\d{4}-\d{2}-\d{2}/.test(dateVal);
    const isCustomTime = /^custom:/.test(timeVal);
    const pickRow = (kindAttr, checked, label) => `<button class="check-row${checked ? " checked" : ""}" data-${kindAttr}><span class="check-box">${checked ? icons.check : ""}</span><span>${escapeHtml(label)}</span></button>`;
    const hasTimeFilter = WHEN_TIME_TOKENS.some(token => when.has(token)) || Boolean(timeVal);
    const anytimeRow = `<button class="check-row${hasTimeFilter ? "" : " checked"}" data-clear-time-filter><span class="check-box">${hasTimeFilter ? "" : icons.check}</span><span>Anytime</span></button>`;
    const dateGroup = `<div class="filter-group"><span class="filter-group-head">${icons.calendar}Date</span><div class="check-list">${WHEN_DATE_TOKENS.map(token => checkRow("when", token, token, when.has(token))).join("")}${pickRow("pick-date", isCustomDate, isCustomDate ? dateVal.replace("..", " – ") : "Pick a date…")}</div></div>`;
    const timeGroup = `<div class="filter-group"><span class="filter-group-head">${icons.clock}Time</span><div class="check-list">${anytimeRow}${WHEN_TIME_TOKENS.map(token => checkRow("when", token, token, when.has(token))).join("")}${pickRow("pick-time", isCustomTime, isCustomTime ? timeVal.replace("custom:", "").replace("-", " – ") : "Pick a time…")}</div></div>`;
    const clear = (when.size || dateVal || timeVal) ? `<button class="dropdown-clear" data-clear-when>Clear all</button>` : "";
    return `${dateGroup}${timeGroup}${clear}`;
  }
  return "";
}

// Does an event pass the What / Where / When multi-select filters?
function eventMatchesFilters(event) {
  const what = state.whatFilter || new Set();
  const where = state.whereFilter || new Set();
  if (what.size === 0) { if (event.cat === "museums") return false; }
  else if (![...what].some(value => matchesFilter(event, value, false))) return false;
  if (where.size > 0 && ![...where].some(name => eventNeighborhoodMatches(event, name))) return false;
  return eventMatchesWhen(event);
}
function eventMatchesWhen(event) {
  const when = state.whenFilter || new Set();
  const dateSel = [...when].filter(token => WHEN_DATE_TOKENS.includes(token));
  const timeSel = [...when].filter(token => WHEN_TIME_TOKENS.includes(token));
  const customDate = state.filter.date && state.filter.date !== "Any date" ? state.filter.date : "";
  const customTime = state.filter.time && state.filter.time !== "Any time" ? state.filter.time : "";
  const dateOk = (!dateSel.length && !customDate) || dateSel.some(token => matchesDateFilter(event, token)) || (customDate && matchesDateFilter(event, customDate));
  const timeOk = (!timeSel.length && !customTime) || timeSel.some(token => matchesTimeFilter(event, token)) || (customTime && matchesTimeFilter(event, customTime));
  return dateOk && timeOk;
}

function openDatePickerSheet() {
  const current = state.filter.date && state.filter.date !== "Any date" ? state.filter.date : "";
  const range = String(current).match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  const from = range ? range[1] : (/^\d{4}-\d{2}-\d{2}$/.test(current) ? current : "");
  const to = range ? range[2] : "";
  const today = new Date().toISOString().slice(0, 10);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Pick a date"><button class="modal-close" aria-label="Close date picker">&times;</button>
    <p class="eyebrow">Filter</p><h2>Pick a date</h2>
    <p class="lede">Choose a single day, or a start and end date for a range.</p>
    <label class="settings-field">From<input type="date" data-date-from min="${today}" value="${from}"></label>
    <label class="settings-field">To (optional, for a range)<input type="date" data-date-to min="${from || today}" value="${to}"></label>
    <button class="wide-button" data-apply-date>Apply date</button>
    <button class="text-button" data-clear-date>Clear date</button>
  </section></div>`;
}

function openTimePickerSheet() {
  const current = state.filter.time && state.filter.time !== "Any time" ? state.filter.time : "";
  const match = String(current).match(/^custom:(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  const from = match ? match[1] : "";
  const to = match ? match[2] : "";
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Pick a time"><button class="modal-close" aria-label="Close time picker">&times;</button>
    <p class="eyebrow">Filter</p><h2>Pick a time</h2>
    <p class="lede">Choose a start time, and optionally an end time for a range.</p>
    <label class="settings-field">From<input type="time" data-time-from value="${from}"></label>
    <label class="settings-field">To (optional, for a range)<input type="time" data-time-to value="${to}"></label>
    <button class="wide-button" data-apply-time>Apply time</button>
    <button class="text-button" data-clear-time>Clear time</button>
  </section></div>`;
}

function discoverStatusLabel() {
  if (state.eventSync.status === "loading") return "Checking shared events";
  if (state.eventSync.status === "error") return "Event refresh needs attention";
  return "";
}

function discoverFiltersActive() {
  const whenActive = (state.whenFilter && state.whenFilter.size)
    || (state.filter.date && state.filter.date !== "Any date")
    || (state.filter.time && state.filter.time !== "Any time");
  return Boolean((state.whatFilter && state.whatFilter.size)
    || (state.whereFilter && state.whereFilter.size)
    || whenActive);
}

function renderHome() {
  if (typeof userIsUnder21 === "function" && userIsUnder21()) {
    ["happy-hours", "nightlife"].forEach(value => state.whatFilter?.delete(value));
    if (["happy-hours", "nightlife"].includes(state.homeFilter)) state.homeFilter = "all";
    if (["happy-hours", "nightlife"].includes(state.discoverCategoryView)) state.discoverCategoryView = "";
  }
  if (state.discoverCategoryView) return renderDiscoverCategoryPage(state.discoverCategoryView);
  const dcEvents = displayableDcEvents();
  const base = dcEvents.filter(eventMatchesFilters);
  // All should feel broadly shared; For You is where onboarding interests tailor order.
  const sorted = (state.whatFilter && state.whatFilter.size) ? base.slice().sort(sortEventsByStart) : feedMixedSort(base);
  const deduped = dedupeFeedEvents(sorted);
  const syncStatus = discoverStatusLabel();
  // Today's five lead the page — the deck is the first thing on open, above the
  // search and filters. It steps aside once the user is actively filtering.
  const heroHtml = discoverFiltersActive() ? "" : renderTodayHero();
  app.innerHTML = `<section class="page discover-page">
    ${state.age < 21 ? `<p class="age-note">Showing age-appropriate picks for your profile.</p>` : ""}
    ${heroHtml}
    ${renderFilterBar()}
    ${followingRail()}
    ${syncStatus ? `<div class="sync-note ${state.eventSync.status}"><span>${syncStatus}</span><button class="icon-refresh" data-refresh-events aria-label="Refresh events">${icons.refresh}</button></div>` : ""}
    <section class="section feed-section"><div class="section-heading"><div class="feed-heading-copy"><p class="eyebrow">Across the city</p><h2>What's happening</h2></div>${typeof feedModeToggle === "function" ? feedModeToggle() : ""}</div>
    ${discoverFiltersActive() ? "" : renderTopWeekEvents()}
    <div data-feed-content>${(typeof blendedFeedEnabled === "function" && blendedFeedEnabled()) ? renderBlendedFeedContent(deduped) : renderDiscoverFeedContent(deduped)}</div></section>
  </section>`;
  if (state.resetDiscoverScrollAfterRender && typeof resetAppScroll === "function") resetAppScroll();
  if (heroHtml) initTodayHero();
}

function discoverCategoryLabel(category) {
  const item = discoverFilterItems().find(([value]) => value === category);
  return item ? item[1] : category;
}


function renderDiscoverCategoryPage(category) {
  const label = getCategoryFeedConfig(category).label || discoverCategoryLabel(category);
  const hasCategorySearch = searchableDiscoverCategory(category);
  if (!hasCategorySearch) state.discoverGenreFilter = "";
  const categoryEvents = dedupeFeedEvents(displayableDcEvents().filter(event => matchesFilter(event, category)).sort(sortEventsByStart));
  const visibleEvents = hasCategorySearch && state.discoverGenreFilter
    ? categoryEvents.filter(event => eventMatchesCategoryFacet(event, state.discoverGenreFilter))
    : categoryEvents;
  app.innerHTML = `<section class="page category-list-page">
    <div class="discover-heading category-detail-heading"><button class="back-button" data-discover-back aria-label="Back to Discover">&larr;</button><div><h1>${escapeHtml(label)}</h1></div></div>
    ${hasCategorySearch ? categoryFacetControls(category, categoryEvents) : ""}
    ${renderEventFeed(visibleEvents, { showBadge: false })}
  </section>`;
}

function searchableDiscoverCategory(category) {
  return ["concerts", "live-music", "happy-hours", "trivia-nights", "food", "nightlife", "culture", "kids", "performing-arts", "museums", "sports", "festivals", "community", "free"].includes(category);
}

function eventMatchesCategoryFacet(event, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  const neighborhood = typeof eventNeighborhoodLine === "function" ? eventNeighborhoodLine(event) : "";
  const text = `${event.title || ""} ${event.venue || ""} ${event.area || ""} ${neighborhood} ${event.desc || ""} ${event.tag || ""} ${eventTags(event).join(" ")}`.toLowerCase();
  return text.includes(normalized);
}

function categoryFacetLabel(category) {
  const labels = {
    concerts: "genre",
    "live-music": "genre",
    "performing-arts": "arts type",
    sports: "sport or league",
    "happy-hours": "happy hour type",
    "trivia-nights": "trivia type",
    nightlife: "nightlife type",
    culture: "culture type",
    kids: "kids type",
    museums: "museum type",
    festivals: "market type",
    community: "community type",
    free: "type"
  };
  return labels[category] || "type";
}

function categoryFacetAllLabel(category) {
  const labels = {
    concerts: "All genres",
    "live-music": "All genres",
    "performing-arts": "All arts",
    sports: "All sports/leagues",
    "happy-hours": "All deals",
    "trivia-nights": "All trivia",
    nightlife: "All nightlife",
    culture: "All culture",
    kids: "All kids",
    museums: "All museum types",
    festivals: "All market types",
    community: "All community types",
    free: "All free events"
  };
  return labels[category] || "All types";
}

function categoryFacetPriorityList(category) {
  return {
    concerts: MUSIC_GENRE_TAGS,
    "live-music": MUSIC_GENRE_TAGS,
    "performing-arts": ["Comedy", "Broadway", "Play", "Musical", "Dance", "Film", "Classical", "Cabaret", "Drag", "Magic", "Storytelling", "Spoken Word", "Family Friendly"],
    sports: ["MLB", "NBA", "NFL", "NHL", "MLS", "WNBA", "Baseball", "Basketball", "Football", "Hockey", "Soccer", "Tennis", "Running"],
    "happy-hours": ["Cocktails", "Beer", "Wine", "Rooftop", "Patio", "Food Specials", "All Night", "Date Spot", "Dive Bar", "Upscale"],
    "trivia-nights": ["Weekly", "Monthly", "Team Trivia", "Pop Culture", "General Knowledge", "Prizes", "Bar Trivia"],
    nightlife: ["DJ Set", "Dance Floor", "Club Night", "Rooftop", "Late Night", "Pride", "Lounge", "Cocktails"],
    culture: ["Embassy", "International", "Heritage", "Reception", "Speaker", "Food tasting", "Dance", "Tour", "Formal"],
    kids: ["Family Friendly", "All ages", "Storytime", "Workshop", "Outdoor", "Disney", "Puppet", "Free"],
    museums: ["Smithsonian", "After Hours", "Gallery Talk", "Workshop", "Screening", "Family Friendly", "Tour"],
    festivals: ["Farmers Market", "Flea Market", "Makers", "Craft", "Food & Drink", "Holiday", "Street Fair", "Outdoor", "Vintage", "Pop-up"],
    community: ["Volunteer", "Networking", "Book Club", "Convention", "Workshop", "Outdoor", "Family Friendly", "Free", "Neighborhood"],
    free: ["Comedy", "Museum", "Outdoor", "Family Friendly", "Live music", "Festival", "Workshop", "Talk", "Community"]
  }[category] || [];
}

function categoryFacetPriority(category, tag) {
  const value = String(tag || "").toLowerCase();
  const priority = categoryFacetPriorityList(category);
  const index = priority.findIndex(item => item.toLowerCase() === value);
  return index === -1 ? 1000 : index;
}

function categoryFacetOptions(category, categoryEvents) {
  const blocked = ["concerts", "live music", "happy hours", "trivia nights", "nightlife", "culture", "kids", "arts", "museums", "sports", "festivals", "community", "expos", "performing arts"];
  const taggedOptions = categoryEvents
    .flatMap(eventTags)
    .map(tag => String(tag || "").trim())
    .filter(tag => tag && !blocked.includes(tag.toLowerCase()));
  const priorityOptions = categoryFacetPriorityList(category).filter(option => categoryEvents.some(event => eventMatchesCategoryFacet(event, option)));
  return [...priorityOptions, ...taggedOptions]
    .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index)
    .sort((a, b) => categoryFacetPriority(category, a) - categoryFacetPriority(category, b) || a.localeCompare(b))
    .slice(0, 18);
}

function categoryFacetControls(category, categoryEvents) {
  const active = state.discoverGenreFilter || "";
  const config = getCategoryFeedConfig(category);
  const placeholder = config.searchPlaceholder || `Search by ${categoryFacetLabel(category)}`;
  const allLabel = (config.chips && config.chips[0]) || categoryFacetAllLabel(category);
  const options = (config.chips && config.chips.length > 1) ? config.chips.slice(1) : categoryFacetOptions(category, categoryEvents);
  return `<section class="genre-filter-panel" aria-label="${escapeHtml(placeholder)}">
    <label class="search-box genre-search"><span>&#8981;</span><input data-category-genre-search placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(active)}" aria-label="${escapeHtml(placeholder)}"></label>
    <div class="genre-chips"><button class="filter-chip ${active ? "" : "active"}" data-category-genre="">${escapeHtml(allLabel)}</button>${options.map(option => `<button class="filter-chip ${option.toLowerCase() === active.toLowerCase() ? "active" : ""}" data-category-genre="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}</div>
  </section>`;
}
function categoryFromTaste(taste) {
  const text = String(taste || "").toLowerCase();
  if (/concert/.test(text)) return "concerts";
  if (/music|jazz|dj|karaoke/.test(text)) return "live-music";
  if (/happy hour/.test(text)) return "happy-hours";
  if (/trivia|quiz/.test(text)) return "trivia-nights";
  if (/bar|cocktail|dance|nightlife|rooftop|patio|late night|speakeasy/.test(text)) return "nightlife";
  if (/embassy|international|culture|cultural|heritage|ambassador|global/.test(text)) return "culture";
  if (/kids?|children|family|all ages|storytime|story time|youth|bluey|disney|puppet|toddler/.test(text)) return "kids";
  if (/museum/.test(text)) return "museums";
  if (/visual art|gallery|art/.test(text)) return "performing-arts";
  if (/gallery|art|theater|theatre|film|comedy/.test(text)) return "performing-arts";
  if (/sport|pickleball/.test(text)) return "sports";
  if (/food|restaurant|brunch|chef|culinary|tasting|wine|beer|cocktail/.test(text)) return "food";
  if (/festival|street fair|market/.test(text)) return "festivals";
  if (/community|volunteer|book club|networking|professional/.test(text)) return "community";
  return "";
}

function orderedDiscoverCategories() {
  const defaults = ["concerts", "live-music", "food", "happy-hours", "trivia-nights", "nightlife", "culture", "kids", "performing-arts", "museums", "sports", "festivals", "community"];
  const preferred = (state.tastes || []).map(categoryFromTaste).filter(Boolean);
  return [...preferred, ...defaults].filter((category, index, all) => all.indexOf(category) === index);
}

function discoverRail(category, railEvents) {
  const sorted = railEvents.sort(sortEventsByStart);
  const emptyText = category === "for-you" ? "No events matched that search yet." : "No events in this section yet.";
  return `<section class="discover-rail" data-discover-rail="${category}">
    <div class="rail-heading"><button class="rail-title" data-discover-category="${category}" ${category === "for-you" ? "disabled" : ""}><h3>${escapeHtml(discoverCategoryLabel(category))}</h3></button></div>
    <div class="event-stack">${sorted.length ? sorted.map(eventRow).join("") : `<p class="section-helper">${emptyText}</p>`}</div>
  </section>`;
}

function feedSkeleton() {
  return `<div class="feed-skeleton">${[0, 1, 2].map(() => `<div class="skeleton-card"></div>`).join("")}</div>`;
}

function renderDiscoverFeedContent(list) {
  // First-load states: nothing loaded yet -> shimmer skeleton; still empty after the
  // timeout -> connection error with a refresh action.
  if (!displayableDcEvents().length) {
    if (state.eventSync.status === "loading" && !state.eventsLoadTimedOut) return feedSkeleton();
    return `<div class="feed-error"><p>Having trouble loading events. Check your connection and try refreshing.</p><button class="wide-button" data-refresh-events>Refresh</button></div>`;
  }
  // The category badge is only useful in the mixed "All" feed.
  return renderEventFeed(list, { showBadge: !(state.whatFilter && state.whatFilter.size === 1) });
}

function discoverSearchText(event) {
  const neighborhood = typeof eventNeighborhoodLine === "function" ? eventNeighborhoodLine(event) : "";
  return `${event.title || ""} ${event.venue || ""} ${event.venueAddress || ""} ${event.area || ""} ${neighborhood} ${event.desc || ""} ${event.cat || ""} ${event.tag || ""} ${eventTags(event).join(" ")}`.toLowerCase();
}

let discoverSearchIndexCache = { key: "", rows: [] };

function discoverSearchIndex() {
  const key = `${events.length}:${events[0]?.id || ""}:${events[events.length - 1]?.id || ""}:age-${state.age || state.profile?.age || ""}`;
  if (discoverSearchIndexCache.key === key) return discoverSearchIndexCache.rows;
  const rows = dedupeFeedEvents(displayableDcEvents().filter(event => matchesFilter(event, "all")).sort(sortEventsByStart))
    .map(event => ({ event, text: discoverSearchText(event) }));
  discoverSearchIndexCache = { key, rows };
  return rows;
}

function displayableDcEvents() {
  return events.filter(isDisplayableDcEvent);
}

function isDisplayableDcEvent(event) {
  if (!isMuseumDisplayEvent(event)) return false;
  if (typeof isAgeAllowedEvent === "function" && !isAgeAllowedEvent(event)) return false;
  const text = `${event.title || ""} ${event.venue || ""} ${event.venueAddress || ""} ${event.area || ""} ${event.desc || ""}`.toLowerCase();
  const outsideDc = /\b(arlington|alexandria|bethesda|silver spring|national harbor|vienna|fairfax|falls church|rockville|hyattsville|college park|landover|tysons|mclean|reston|gaithersburg|laurel|bowie|annapolis|baltimore)\b|,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy)\b|\bvirginia\b/.test(text);
  if (outsideDc) return false;
  return /washington,\s*(dc|d\.c\.)|washington dc|district of columbia|\bdc\b|northwest|northeast|southwest|southeast|\bnw\b|\bne\b|\bsw\b|\bse\b|adams morgan|u street|logan circle|shaw|navy yard|penn quarter|h street|georgetown|dupont|capitol hill|noma|union market|waterfront|wharf|foggy bottom|columbia heights|petworth|tenleytown|cleveland park|woodley park|brookland|anacostia|eckington|ivy city|barracks row|mount vernon square|downtown/.test(text);
}

function venueSearchCard(venue) {
  const image = String(venue.image_url || "").trim();
  const meta = [venue.neighborhood, venue.address, venue.venue_type].filter(Boolean).join(" / ") || "Venue";
  const imageHtml = image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : `<span>${escapeHtml(String(venue.name || "V").slice(0, 1).toUpperCase())}</span>`;
  return `<button class="venue-search-card" data-venue-events="${escapeHtml(venue.name)}" aria-label="Open ${escapeHtml(venue.name)}"><span class="venue-search-art">${imageHtml}</span><span><b>${escapeHtml(venue.name)}</b><small>${escapeHtml(meta)}</small><em>Venue page</em></span></button>`;
}

function renderDiscoverEventSearch(query) {
  const content = document.querySelector("[data-feed-content]");
  if (!content) return 0;
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) {
    state.searchFeedShown = 20;
    renderHome();
    return displayableDcEvents().filter(event => matchesFilter(event, state.homeFilter)).length;
  }
  document.querySelector(".top-week-section")?.remove();
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matches = discoverSearchIndex()
    .filter(row => terms.every(term => row.text.includes(term)))
    .map(row => row.event);
  const venueMatches = venueSearchMatches(normalizedQuery, 8);
  const venueHtml = venueMatches.length ? `<div class="venue-search-section"><p class="section-label">Venues</p><div class="venue-search-list">${venueMatches.map(venueSearchCard).join("")}</div></div>` : "";
  const eventHtml = matches.length
    ? renderEventFeed(matches, { showBadge: true, shown: state.searchFeedShown || 20, moreAttr: "data-search-feed-more" })
    : `<p class="section-helper">No matching events yet.</p>`;
  content.innerHTML = `${venueHtml}${eventHtml}`;
  return matches.length + venueMatches.length;
}

const dcMapAreas = {
  "Adams Morgan": { x: 24, y: 27 },
  "U Street": { x: 42, y: 42 },
  "Logan Circle": { x: 48, y: 57 },
  "Shaw": { x: 60, y: 66 },
  "Navy Yard": { x: 78, y: 83 },
  "Penn Quarter": { x: 66, y: 54 },
  "H Street": { x: 78, y: 44 },
  "Washington, DC": { x: 50, y: 50 }
};

function eventMapPosition(event, index) {
  const base = dcMapAreas[event.area] || dcMapAreas[event.venue] || dcMapAreas["Washington, DC"];
  const jitter = ((event.sourceId || event.id || index) * 17) % 9 - 4;
  return { x: base.x + jitter, y: base.y + (((event.id || index) * 11) % 9 - 4) };
}

function scaledMapPosition(position) {
  const zoom = state.mapZoom;
  return {
    x: 50 + (position.x - state.mapCenter.x) * zoom,
    y: 50 + (position.y - state.mapCenter.y) * zoom
  };
}

function clampMapValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setMapZoom(value) {
  state.mapZoom = clampMapValue(Math.round(value * 100) / 100, 0.75, 2.75);
}

function panMap(deltaX, deltaY) {
  const speed = 0.08 / state.mapZoom;
  state.mapCenter = {
    x: clampMapValue(state.mapCenter.x + deltaX * speed, 8, 92),
    y: clampMapValue(state.mapCenter.y + deltaY * speed, 8, 92)
  };
}

function mapSearchMatches(event) {
  const query = state.mapSearch.trim().toLowerCase();
  if (!query) return true;
  return `${event.title} ${event.venue} ${event.area} ${event.cat} ${event.tag}`.toLowerCase().includes(query);
}

function applyMapSearch() {
  const query = state.mapSearch.trim().toLowerCase();
  if (!query) return;
  const area = Object.entries(dcMapAreas).find(([name]) => name.toLowerCase().includes(query));
  const event = displayableDcEvents().find(item => mapSearchMatches(item));
  if (area) state.mapCenter = area[1];
  else if (event) state.mapCenter = eventMapPosition(event, 0);
}

function renderMap() {
  const visibleEvents = displayableDcEvents().filter(event => matchesFilter(event, state.mapFilter, false) && mapSearchMatches(event)).sort(sortEventsByStart);
  const pins = visibleEvents.map((event, index) => {
    const pos = scaledMapPosition(eventMapPosition(event, index));
    return `<button class="pin ${event.cat}" data-map-event="${event.id}" style="left:${pos.x}%;top:${pos.y}%"><span>${index + 1}</span></button>`;
  }).join("");
  const labels = Object.entries(dcMapAreas).filter(([name]) => name !== "Washington, DC").map(([name, pos]) => {
    const scaled = scaledMapPosition(pos);
    return `<span class="neighborhood" style="top:${scaled.y}%;left:${scaled.x}%">${name}</span>`;
  }).join("");
  app.innerHTML = `<section class="map-page">
    <div class="map-top"><div class="discover-heading"><div><p class="eyebrow">Near your location</p><h1>Map</h1></div><span class="route-badge">${state.mapZoom.toFixed(1)}x zoom</span></div><div class="chips">${filterChips(state.mapFilter, "map")}</div></div>
    <div class="map-canvas" data-map-canvas>
      <label class="map-search"><input data-map-search value="${escapeHtml(state.mapSearch)}" placeholder="Search area, venue, or event" aria-label="Search map"><button class="filter-button" data-map-area>Search area</button></label>
      <div class="map-gesture-hint">Pinch to zoom / drag to move</div><button class="map-reset" data-map-zoom="reset" aria-label="Reset map">Reset</button>
      <div class="map-grid" style="transform: scale(${state.mapZoom});"></div>
      ${labels}
      ${pins || `<p class="map-empty">No events match this map search.</p>`}
      <div class="map-results-pill">${visibleEvents.length} event${visibleEvents.length === 1 ? "" : "s"} on map</div>
      <div class="map-card" id="map-card"></div>
    </div>
  </section>`;
}

// Today's five used to live here as a story tile you tapped to open a list.
// They now lead Discover as the rotating deck (see renderTodayHero), so the rail
// is back to what it says it is: the venues and curators you follow.
const followingStories = [
  { id: "songbyrd", icon: "S", name: "Songbyrd", type: "Venue", intro: "What's coming up at Songbyrd over the next few days.", eventIds: [1, 11], venueKeywords: ["songbyrd"] },
  { id: "dcafterdark", icon: "D", name: "@dcafterdark", type: "Curator", intro: "A few things @dcafterdark thinks are worth leaving the house for this week.", eventIds: [4, 6, 7], categories: ["concerts", "performing-arts"], tagKeywords: ["Nightlife", "Comedy", "Live Music", "Late Night", "Evening"] },
  { id: "smithsonian", icon: "M", name: "Smithsonian", type: "Venue", intro: "A Smithsonian event to catch over the next couple of days.", eventIds: [9], venueKeywords: ["smithsonian", "hirshhorn", "national gallery", "saam", "portrait gallery"] },
  { id: "eaterdc", icon: "E", name: "@eater_dc", type: "Curator", intro: "Food and drink suggestions from @eater_dc for the next few days.", eventIds: [5], tagKeywords: ["Food & Drink", "Food", "Market", "Wine", "Beer", "Cocktail"], textKeywords: ["food", "restaurant", "market", "chef", "brunch", "wine", "beer", "cocktail"] },
  { id: "atlas", icon: "A", name: "Atlas", type: "Venue", intro: "What's coming up at Atlas over the next few days.", eventIds: [10], venueKeywords: ["atlas"] }
];

function diverseEventSelection(list, limit = 5) {
  const picked = [];
  const usedIds = new Set();
  const usedCategories = new Set();
  list.forEach(event => {
    if (picked.length >= limit) return;
    if (usedCategories.has(event.cat)) return;
    picked.push(event);
    usedIds.add(event.id);
    usedCategories.add(event.cat);
  });
  list.forEach(event => {
    if (picked.length >= limit) return;
    if (usedIds.has(event.id)) return;
    picked.push(event);
    usedIds.add(event.id);
  });
  return picked;
}

function eventDaypart(event) {
  if (!Number.isFinite(event?.startSort)) return "anytime";
  const hour = new Date(event.startSort).getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "late";
}

function dailyFeaturedEventSelection(list, limit = 5) {
  const candidates = list
    .filter(event => event.image)
    .filter(event => Number.isFinite(event.startSort) && event.startSort < Number.MAX_SAFE_INTEGER)
    .sort((a, b) => eventPopularityScore(b) - eventPopularityScore(a) || sortEventsByStart(a, b));
  const picked = [];
  const usedIds = new Set();
  const usedCategories = new Set();
  const usedDayparts = new Set();
  const addBest = (pool, preferNewCategory = true, preferNewDaypart = false) => {
    const next = pool.find(event =>
      !usedIds.has(event.id)
      && (!preferNewCategory || !usedCategories.has(event.cat))
      && (!preferNewDaypart || !usedDayparts.has(eventDaypart(event)))
    );
    if (!next) return false;
    picked.push(next);
    usedIds.add(next.id);
    usedCategories.add(next.cat);
    usedDayparts.add(eventDaypart(next));
    return true;
  };
  ["morning", "afternoon", "evening", "late"].forEach(daypart => {
    if (picked.length < limit) addBest(candidates.filter(event => eventDaypart(event) === daypart), true);
  });
  while (picked.length < limit && addBest(candidates, true, true)) {}
  while (picked.length < limit && addBest(candidates, true, false)) {}
  while (picked.length < limit && addBest(candidates, false, false)) {}
  return picked.slice(0, limit).sort(sortEventsByStart);
}

function storyEventPool(story) {
  if (story.todayOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dcEvents = ((state.todayStoryEvents && state.todayStoryEvents.length) ? state.todayStoryEvents : displayableDcEvents())
      .filter(event => typeof isAgeAllowedEvent !== "function" || isAgeAllowedEvent(event))
      .slice()
      .sort(sortEventsByStart);
    const todaysEvents = dailyFeaturedEventSelection(dcEvents
      .filter(event => sameCalendarDate(eventDateValue(event), today)), 5);
    const fallbackEvents = dailyFeaturedEventSelection(dcEvents, 5);
    return (todaysEvents.length ? todaysEvents : fallbackEvents);
  }
  const venueKeywords = story.venueKeywords || [];
  const textKeywords = story.textKeywords || [];
  const tagKeywords = story.tagKeywords || [];
  const categories = story.categories || [];
  const dcEvents = displayableDcEvents();
  const directMatches = dcEvents.filter(event => {
    const eventText = `${event.title} ${event.venue} ${event.area} ${event.desc || ""}`.toLowerCase();
    const tags = eventTags(event).map(tag => tag.toLowerCase());
    if (venueKeywords.some(keyword => `${event.venue} ${event.title}`.toLowerCase().includes(keyword))) return true;
    if (textKeywords.some(keyword => eventText.includes(keyword.toLowerCase()))) return true;
    if (tagKeywords.some(keyword => tags.includes(keyword.toLowerCase()))) return true;
    if (categories.includes(event.cat)) return true;
    return false;
  });
  const fallback = (story.eventIds || [])
    .map(id => dcEvents.find(event => event.id === id))
    .filter(Boolean);
  return [...directMatches, ...fallback]
    .filter((event, index, all) => all.findIndex(item => item.id === event.id) === index)
    .sort(sortEventsByStart)
    .slice(0, 6);
}

function storyEventAlreadyHappened(event) {
  return Number.isFinite(event?.startSort) && event.startSort < Date.now();
}

function activeFollowingStories() {
  const userStoryPosts = (state.storyPosts || []).filter(post => post?.source === "user");
  const ownStory = userStoryPosts.length ? [{
    id: "your-story",
    icon: state.profile.initials,
    name: "Your story",
    type: "Just posted",
    intro: "Events you shared with your friends on Lokal.",
    eventIds: userStoryPosts.map(post => post.eventId)
  }] : [];
  const followedVenues = followedVenueNames().map(name => name.toLowerCase());
  const isFollowedStory = story => state.follows.has(story.id) || followedVenues.some(name => String(story.name || "").toLowerCase().includes(name) || (story.venueKeywords || []).some(keyword => name.includes(keyword) || keyword.includes(name)));
  return [...ownStory, ...followingStories.filter(isFollowedStory)]
    .filter(Boolean)
    .map(story => ({ ...story, storyEvents: storyEventPool(story) }))
    .filter(story => story.storyEvents.length);
}

function openStory(index) {
  const stories = activeFollowingStories();
  if (!stories.length) {
    toast("No active stories right now");
    return;
  }
  const storyIndex = (Number(index) + stories.length) % stories.length;
  const story = stories[storyIndex];
  const storyEvents = story.storyEvents;
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet story-sheet" role="dialog" aria-modal="true" aria-label="${story.name}" data-story-sheet="${storyIndex}">
    <button class="modal-close" aria-label="Close ${story.name}">&times;</button>
    <div class="story-progress">${stories.map((_,dotIndex) => `<span class="${dotIndex === storyIndex ? "active" : ""}"></span>`).join("")}</div>
    <div class="story-heading"><div><p class="eyebrow">${story.type}</p><h2>${story.todayOnly ? "Happening today" : escapeHtml(story.name)}</h2></div><span class="group-icon">${story.icon}</span></div>
    <p class="lede">${story.intro}</p>
    <div class="event-stack">${storyEvents.map(event => eventListRow(event, { disabled: story.todayOnly && storyEventAlreadyHappened(event), expired: story.todayOnly && storyEventAlreadyHappened(event) })).join("")}</div>
    <div class="story-controls"><button class="secondary" data-story-prev="${storyIndex}" aria-label="Previous following story">&larr; Previous</button><small>${storyIndex + 1} of ${stories.length}</small><button class="secondary" data-story-next="${storyIndex}" aria-label="Next following story">Next &rarr;</button></div>
  </section></div>`;
}
