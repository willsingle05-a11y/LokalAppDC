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
// community, expos, free) are inferred following the same pattern.
const categoryFeedConfig = {
  concerts: { label: "Concerts", searchPlaceholder: "Search by artist, venue, or date…", chips: ["All shows", "This week", "This month", "Pop", "Rock", "Hip-Hop", "Country", "Classical"] },
  "live-music": { label: "Live music", searchPlaceholder: "Search by genre, venue, or artist…", chips: ["All shows", "Jazz", "Indie", "R&B", "Blues", "Folk", "Electronic", "Soul"] },
  "happy-hours": { label: "Happy hours", searchPlaceholder: "Search by type, vibe, or venue…", chips: ["All deals", "Cocktails", "Beer", "Wine", "Rooftop", "Patio", "Food deals", "After work"] },
  "trivia-nights": { label: "Trivia nights", searchPlaceholder: "Search by bar, theme, or night…", chips: ["All nights", "Free to play", "Pop culture", "Sports", "Music", "Science", "80s", "90s"] },
  nightlife: { label: "Nightlife", searchPlaceholder: "Search by venue, vibe, or night…", chips: ["All venues", "Clubs", "Bars", "Rooftop", "DJ nights", "Late night", "21+"] },
  "performing-arts": { label: "Arts and culture", searchPlaceholder: "Search by museum, gallery, or show…", chips: ["All events", "Free", "Theater", "Film", "Gallery", "Dance", "Comedy"] },
  sports: { label: "Sports", searchPlaceholder: "Search by team, sport, or venue…", chips: ["All sports", "Nationals", "Commanders", "Capitals", "Mystics", "DC United", "College"] },
  museums: { label: "Museums", searchPlaceholder: "Search by museum, exhibit, or show…", chips: ["All museums", "Free", "After hours", "Exhibits", "Tours", "Family", "Smithsonian"] },
  festivals: { label: "Festivals", searchPlaceholder: "Search by festival, neighborhood, or type…", chips: ["All festivals", "Food & drink", "Music", "Art", "Cultural", "Outdoor", "Family"] },
  community: { label: "Community", searchPlaceholder: "Search by cause, group, or neighborhood…", chips: ["All events", "Volunteer", "Networking", "Book club", "Outdoor", "Free", "Neighborhood"] },
  expos: { label: "Expos", searchPlaceholder: "Search by expo, theme, or venue…", chips: ["All expos", "Convention", "Trade show", "Marketplace", "Workshop", "Networking"] },
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
  const rows = rest.map((event, index) => eventListRow(event, { isFirst: index === 0, isLast: index === rest.length - 1 })).join("");
  return `<div class="hero-list">${heroHtml}<p class="section-label more-near-you">More near you</p><div class="list-group">${rows}</div></div>`;
}

function renderHome() {
  if (state.discoverCategoryView) return renderDiscoverCategoryPage(state.discoverCategoryView);
  const dcEvents = displayableDcEvents();
  const filtered = dcEvents.filter(event => matchesFilter(event, state.homeFilter)).sort(sortEventsByStart);
  const activeChip = discoverFilterItems().find(([value]) => value === state.homeFilter);
  const feedTitle = activeChip ? activeChip[1] : "What's happening";
  const feedContent = renderDiscoverFeedContent(filtered);
  const activity = friendsActivityFeed();
  const tonight = happeningTonightEvents();
  app.innerHTML = `<section class="page discover-page">
    <div class="discover-heading discover-cover"><div><p class="eyebrow">Sunday in DC</p><h1>Discover</h1></div><button class="filter-button" data-more-filters>Filters +</button></div>
    ${state.age < 21 ? `<p class="age-note">Showing age-appropriate picks for your profile.</p>` : ""}
    ${activity.length ? `<p class="eyebrow">Friends activity</p><div class="activity-strip">${activity.map(activityChip).join("")}</div>` : ""}
    ${tonight.length ? `<section class="tonight-section"><div class="tonight-head"><span class="tonight-dot"></span><h2>Happening Tonight</h2></div><div class="feed-grid">${tonight.map(event => eventRow(event, "hero")).join("")}</div></section>` : ""}
    <div class="chips">${filterChips(state.homeFilter, "home")}</div>
    <label class="search-box discover-search-box"><span>&#8981;</span><input data-discover-search placeholder="Search events, friends, or curators" aria-label="Search Lokal"></label><div class="discover-search-results" data-discover-results hidden></div>
    <div class="sync-note ${state.eventSync.status}"><span>${state.eventSync.label}</span><button class="text-button" data-refresh-events>Refresh</button></div>
    <section class="section feed-section"><div class="section-heading"><div><p class="eyebrow">Your feed</p><h2>${escapeHtml(feedTitle)}</h2></div></div>
    <div data-feed-content>${feedContent}</div></section>
  </section>`;
}

function discoverCategoryLabel(category) {
  const item = discoverFilterItems().find(([value]) => value === category);
  return item ? item[1] : category;
}


function renderDiscoverCategoryPage(category) {
  const label = getCategoryFeedConfig(category).label || discoverCategoryLabel(category);
  const hasCategorySearch = searchableDiscoverCategory(category);
  if (!hasCategorySearch) state.discoverGenreFilter = "";
  const categoryEvents = displayableDcEvents().filter(event => matchesFilter(event, category)).sort(sortEventsByStart);
  const visibleEvents = hasCategorySearch && state.discoverGenreFilter
    ? categoryEvents.filter(event => eventMatchesCategoryFacet(event, state.discoverGenreFilter))
    : categoryEvents;
  app.innerHTML = `<section class="page category-list-page">
    <div class="discover-heading category-detail-heading"><button class="back-button" data-discover-back aria-label="Back to Discover">&larr;</button><div><h1>${escapeHtml(label)}</h1></div></div>
    <p class="feed-count">${visibleEvents.length} event${visibleEvents.length === 1 ? "" : "s"} this week in DC</p>
    ${hasCategorySearch ? categoryFacetControls(category, categoryEvents) : ""}
    ${renderHeroAndList(visibleEvents, { showBadge: false })}
  </section>`;
}

function searchableDiscoverCategory(category) {
  return ["concerts", "live-music", "happy-hours", "trivia-nights", "nightlife", "performing-arts", "museums", "sports", "festivals", "community", "expos", "free"].includes(category);
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
    museums: "museum type",
    festivals: "festival type",
    community: "community type",
    expos: "expo type",
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
    museums: "All museum types",
    festivals: "All festival types",
    community: "All community types",
    expos: "All expos",
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
    museums: ["Smithsonian", "After Hours", "Gallery Talk", "Workshop", "Screening", "Family Friendly", "Tour"],
    festivals: ["Food & Drink", "Market", "Outdoor", "Family Friendly", "Cultural", "Street Fair", "Pop-up"],
    community: ["Volunteer", "Networking", "Book Club", "Outdoor", "Family Friendly", "Free", "Neighborhood"],
    expos: ["Convention", "Expo", "Trade Show", "Marketplace", "Workshop", "Networking"],
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
  const blocked = ["concerts", "live music", "happy hours", "trivia nights", "nightlife", "arts", "museums", "sports", "festivals", "community", "expos", "performing arts"];
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
  if (/happy hour|wine bar|cocktail bar|beer/.test(text)) return "happy-hours";
  if (/trivia|quiz/.test(text)) return "trivia-nights";
  if (/bar|cocktail|dance|nightlife|rooftop|patio|late night|speakeasy/.test(text)) return "nightlife";
  if (/museum/.test(text)) return "museums";
  if (/gallery|art|theater|theatre|film|comedy/.test(text)) return "performing-arts";
  if (/sport|pickleball/.test(text)) return "sports";
  if (/food|restaurant|brunch|festival|street fair|market/.test(text)) return "festivals";
  if (/community|volunteer|book club|networking|professional/.test(text)) return "community";
  return "";
}

function orderedDiscoverCategories() {
  const defaults = ["concerts", "live-music", "happy-hours", "trivia-nights", "nightlife", "performing-arts", "museums", "sports", "festivals", "community", "expos"];
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

function renderDiscoverFeedContent(filtered) {
  const hasCategorySearch = !["all", "nearby"].includes(state.homeFilter) && searchableDiscoverCategory(state.homeFilter);
  const visibleEvents = hasCategorySearch && state.discoverGenreFilter
    ? filtered.filter(event => eventMatchesCategoryFacet(event, state.discoverGenreFilter))
    : filtered;
  // When a single category chip is active the feed is dedicated to that category,
  // so the event-type badge is redundant (hide it). The mixed all/nearby feed keeps it.
  return `${hasCategorySearch ? categoryFacetControls(state.homeFilter, filtered) : ""}${renderHeroAndList(dedupeFeedEvents(visibleEvents), { showBadge: !hasCategorySearch })}`;
}

function discoverSearchText(event) {
  const neighborhood = typeof eventNeighborhoodLine === "function" ? eventNeighborhoodLine(event) : "";
  return `${event.title || ""} ${event.venue || ""} ${event.area || ""} ${neighborhood} ${event.desc || ""} ${event.cat || ""} ${event.tag || ""} ${eventTags(event).join(" ")}`.toLowerCase();
}

function displayableDcEvents() {
  return events.filter(isDisplayableDcEvent);
}

function isDisplayableDcEvent(event) {
  if (!isMuseumDisplayEvent(event)) return false;
  const text = `${event.title || ""} ${event.venue || ""} ${event.area || ""} ${event.desc || ""}`.toLowerCase();
  const outsideDc = /\b(arlington|alexandria|bethesda|silver spring|national harbor|vienna|fairfax|falls church|rockville|hyattsville|college park|landover|tysons|mclean|reston|gaithersburg|laurel|bowie|annapolis|baltimore)\b|,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy)\b|\bvirginia\b/.test(text);
  if (outsideDc) return false;
  return /washington,\s*(dc|d\.c\.)|washington dc|district of columbia|\bdc\b|northwest|northeast|southwest|southeast|\bnw\b|\bne\b|\bsw\b|\bse\b|adams morgan|u street|logan circle|shaw|navy yard|penn quarter|h street|georgetown|dupont|capitol hill|noma|union market|waterfront|wharf|foggy bottom|columbia heights|petworth|tenleytown|cleveland park|woodley park|brookland|anacostia|eckington|ivy city|barracks row|mount vernon square|downtown/.test(text);
}

function renderDiscoverEventSearch(query) {
  const content = document.querySelector("[data-feed-content]");
  if (!content) return 0;
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) {
    renderHome();
    return displayableDcEvents().filter(event => matchesFilter(event, state.homeFilter)).length;
  }
  const dcEvents = displayableDcEvents().filter(event => matchesFilter(event, "all"));
  const pool = normalizedQuery
    ? dcEvents.filter(event => normalizedQuery.split(/\s+/).every(term => discoverSearchText(event).includes(term)))
    : dcEvents.filter(event => matchesFilter(event, state.homeFilter));
  const matches = dedupeFeedEvents(pool.sort(sortEventsByStart));
  content.innerHTML = renderHeroAndList(matches, { showBadge: true });
  return matches.length;
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

const followingStories = [
  { id: "featured-today", icon: "5", name: "5 featured events in DC today", type: "Today", intro: "Five DC events worth knowing about today.", todayOnly: true },
  { id: "songbyrd", icon: "S", name: "Songbyrd", type: "Venue", intro: "What's coming up at Songbyrd over the next few days.", eventIds: [1, 11], venueKeywords: ["songbyrd"] },
  { id: "dcafterdark", icon: "D", name: "@dcafterdark", type: "Curator", intro: "A few things @dcafterdark thinks are worth leaving the house for this week.", eventIds: [4, 6, 7], categories: ["concerts", "performing-arts"], tagKeywords: ["Nightlife", "Comedy", "Live Music", "Late Night", "Evening"] },
  { id: "smithsonian", icon: "M", name: "Smithsonian", type: "Venue", intro: "A Smithsonian event to catch over the next couple of days.", eventIds: [9], venueKeywords: ["smithsonian", "hirshhorn", "national gallery", "saam", "portrait gallery"] },
  { id: "eaterdc", icon: "E", name: "@eater_dc", type: "Curator", intro: "Food and drink suggestions from @eater_dc for the next few days.", eventIds: [5], tagKeywords: ["Food & Drink", "Food", "Market", "Wine", "Beer", "Cocktail"], textKeywords: ["food", "restaurant", "market", "chef", "brunch", "wine", "beer", "cocktail"] },
  { id: "atlas", icon: "A", name: "Atlas", type: "Venue", intro: "What's coming up at Atlas over the next few days.", eventIds: [10], venueKeywords: ["atlas"] }
];

function storyEventPool(story) {
  if (story.todayOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dcEvents = displayableDcEvents().sort(sortEventsByStart);
    const todaysEvents = dcEvents
      .filter(event => sameCalendarDate(eventDateValue(event), today))
      .slice(0, 5);
    return (todaysEvents.length ? todaysEvents : dcEvents.slice(0, 5));
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

function activeFollowingStories() {
  const ownStory = state.storyPosts.length ? [{
    id: "your-story",
    icon: state.profile.initials,
    name: "Your story",
    type: "Just posted",
    intro: "Events you shared with your friends on Lokal.",
    eventIds: state.storyPosts.map(post => post.eventId)
  }] : [];
  const [featuredStory, ...otherStories] = followingStories;
  return [featuredStory, ...ownStory, ...otherStories]
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
    <div class="story-heading"><div><p class="eyebrow">${story.type}</p><h2>${story.name}</h2></div><span class="group-icon">${story.icon}</span></div>
    <p class="lede">${story.intro}</p>
    <div class="event-stack">${storyEvents.map(eventRow).join("")}</div>
    <div class="story-controls"><button class="secondary" data-story-prev="${storyIndex}" aria-label="Previous following story">&larr; Previous</button><small>${storyIndex + 1} of ${stories.length}</small><button class="secondary" data-story-next="${storyIndex}" aria-label="Next following story">Next &rarr;</button></div>
  </section></div>`;
}
