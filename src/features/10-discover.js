function renderHome() {
  const filtered = events.filter(event => matchesFilter(event, state.homeFilter)).sort(sortEventsByStart);
  app.innerHTML = `<section class="page">
    <div class="discover-heading"><div><p class="eyebrow">Sunday in DC</p><h1>Discover</h1></div><button class="filter-button" data-more-filters>Filters +</button></div>
    <div class="sync-note ${state.eventSync.status}"><span>${state.eventSync.label}</span><button class="text-button" data-refresh-events>Refresh</button></div>
    <label class="search-box"><span>⌕</span><input data-discover-search placeholder="Search events, friends, or curators" aria-label="Search Lokal"></label><div class="discover-search-results" data-discover-results hidden></div>
    ${state.age < 21 ? `<p class="age-note">Showing age-appropriate picks for your profile.</p>` : ""}
    <p class="eyebrow">Following</p><div class="following-rail">${followingStories.map((story,index) => `<button class="following-chip" data-story="${index}" data-search-text="${`${story.name} ${story.type}`.toLowerCase()}"><span class="group-icon">${story.icon}</span><b>${story.name}</b><small>${story.type}</small></button>`).join("")}</div>
    <div class="chips">${filterChips(state.homeFilter, "home")}</div>
    <section class="section feed-section"><div class="section-heading"><div><p class="eyebrow">Your feed</p><h2>What's happening</h2></div></div>
    <div class="event-stack">${filtered.map(eventRow).join("")}</div></section>
  </section>`;
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
  const event = events.find(item => mapSearchMatches(item));
  if (area) state.mapCenter = area[1];
  else if (event) state.mapCenter = eventMapPosition(event, 0);
}

function renderMap() {
  const visibleEvents = events.filter(event => matchesFilter(event, state.mapFilter, false) && mapSearchMatches(event)).sort(sortEventsByStart);
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
  { id: "songbyrd", icon: "S", name: "Songbyrd", type: "Venue", intro: "What's coming up at Songbyrd over the next few days.", eventIds: [1, 11], venueKeywords: ["songbyrd"] },
  { id: "dcafterdark", icon: "D", name: "@dcafterdark", type: "Curator", intro: "A few things @dcafterdark thinks are worth leaving the house for this week.", eventIds: [4, 6, 7], categories: ["concerts", "performing-arts"], tagKeywords: ["Nightlife", "Comedy", "Live Music", "Late Night", "Evening"] },
  { id: "runclub", icon: "R", name: "DC Run Club", type: "Public group", intro: "Upcoming ways to run, meet people, and hang out with DC Run Club.", eventIds: [3], tagKeywords: ["Run", "Fitness", "Wellness", "Sports"], textKeywords: ["run club", "run", "yoga", "fitness"] },
  { id: "smithsonian", icon: "M", name: "Smithsonian", type: "Venue", intro: "A Smithsonian event to catch over the next couple of days.", eventIds: [9], venueKeywords: ["smithsonian", "hirshhorn", "national gallery", "saam", "portrait gallery"] },
  { id: "eaterdc", icon: "E", name: "@eater_dc", type: "Curator", intro: "Food and drink suggestions from @eater_dc for the next few days.", eventIds: [5], tagKeywords: ["Food & Drink", "Food", "Market", "Wine", "Beer", "Cocktail"], textKeywords: ["food", "restaurant", "market", "chef", "brunch", "wine", "beer", "cocktail"] },
  { id: "atlas", icon: "A", name: "Atlas", type: "Venue", intro: "What's coming up at Atlas over the next few days.", eventIds: [10], venueKeywords: ["atlas"] }
];

function storyEventPool(story) {
  const venueKeywords = story.venueKeywords || [];
  const textKeywords = story.textKeywords || [];
  const tagKeywords = story.tagKeywords || [];
  const categories = story.categories || [];
  const directMatches = events.filter(event => {
    const eventText = `${event.title} ${event.venue} ${event.area} ${event.desc || ""}`.toLowerCase();
    const tags = eventTags(event).map(tag => tag.toLowerCase());
    if (venueKeywords.some(keyword => `${event.venue} ${event.title}`.toLowerCase().includes(keyword))) return true;
    if (textKeywords.some(keyword => eventText.includes(keyword.toLowerCase()))) return true;
    if (tagKeywords.some(keyword => tags.includes(keyword.toLowerCase()))) return true;
    if (categories.includes(event.cat)) return true;
    return false;
  });
  const fallback = (story.eventIds || [])
    .map(id => events.find(event => event.id === id) || demoEvents.find(event => event.id === id))
    .filter(Boolean);
  return [...directMatches, ...fallback]
    .filter((event, index, all) => all.findIndex(item => item.id === event.id) === index)
    .sort(sortEventsByStart)
    .slice(0, 6);
}

function openStory(index) {
  const storyIndex = (Number(index) + followingStories.length) % followingStories.length;
  const story = followingStories[storyIndex];
  const storyEvents = storyEventPool(story);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet story-sheet" role="dialog" aria-modal="true" aria-label="${story.name}" data-story-sheet="${storyIndex}">
    <button class="modal-close" aria-label="Close ${story.name}">&times;</button>
    <div class="story-progress">${followingStories.map((_,dotIndex) => `<span class="${dotIndex === storyIndex ? "active" : ""}"></span>`).join("")}</div>
    <div class="story-heading"><div><p class="eyebrow">${story.type}</p><h2>${story.name}</h2></div><span class="group-icon">${story.icon}</span></div>
    <p class="lede">${story.intro}</p>
    <div class="event-stack">${storyEvents.length ? storyEvents.map(eventRow).join("") : `<p class="section-helper">No upcoming events matched this follow yet. Lokal will fill this story as new events come in.</p>`}</div>
    <div class="story-controls"><button class="secondary" data-story-prev="${storyIndex}" aria-label="Previous following story">← Previous</button><small>${storyIndex + 1} of ${followingStories.length}</small><button class="secondary" data-story-next="${storyIndex}" aria-label="Next following story">Next →</button></div>
  </section></div>`;
}


