const icons = {
  compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="m15.4 8.6-2.1 4.7-4.7 2.1 2.1-4.7 4.7-2.1Z"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
};

const demoEvents = [
  { id: 1, title: "Jazz on the Hill", venue: "Songbyrd Music House", area: "Adams Morgan", time: "Tonight, 7:30 PM", price: "$18", cat: "music", tag: "Live music", friends: ["AL"], desc: "A warm, unhurried set from DC's new guard of jazz players. The room is small, the sound is close, and you will want to get there before the first pour." },
  { id: 2, title: "After Hours: New Forms", venue: "Transformer Gallery", area: "Logan Circle", time: "Tonight, 6:00 PM", price: "Free", cat: "art", tag: "Art opening", friends: [], desc: "A compact group show of vivid mixed-media work, with the artists in the room and a neighborhood wine bar waiting around the corner." },
  { id: 3, title: "Sunset Miles", venue: "Meridian Hill Park", area: "U Street", time: "Tonight, 6:30 PM", price: "Free", cat: "fitness", tag: "Run club", friends: ["MR", "DV"], desc: "A friendly four-mile loop with no pace pressure. Stay after for the picnic blanket hang and a rotating neighborhood snack stop." },
  { id: 4, title: "Skyline Social", venue: "The Viceroy Rooftop", area: "Logan Circle", time: "Friday, 8:00 PM", price: "$15", cat: "nightlife", tag: "Rooftop", friends: ["AL", "MR", "JS"], desc: "Golden hour turns into a low-key rooftop party with disco edits, a sharp little drinks menu, and just enough room to actually talk. A reliable Friday reset." },
  { id: 5, title: "Little Food Market", venue: "The Roost Courtyard", area: "Shaw", time: "Saturday, 12:00 PM", price: "Free", cat: "food", tag: "Food pop-up", friends: ["DV"], desc: "Six DC makers, one sunny courtyard, and an excellent excuse to order something you have never tried before." },
  { id: 6, title: "No Kings: Vinyl Night", venue: "The Crown & Crow", area: "Logan Circle", time: "Saturday, 9:00 PM", price: "$10", cat: "nightlife", tag: "DJ set", friends: [], desc: "A deep crate evening with soul, funk, and house selections in a room that always feels a little hidden." },
  { id: 7, title: "Porchlight Sessions", venue: "The Atlantis", area: "U Street", time: "Sunday, 7:00 PM", price: "$22", cat: "music", tag: "Live music", friends: ["JS"], desc: "Three local songwriters trade songs and stories in an intimate Sunday night round." },
  { id: 8, title: "Fresh Air Cinema", venue: "Alethia Tanner Park", area: "Shaw", time: "Sunday, 8:15 PM", price: "Free", cat: "art", tag: "Outdoor film", friends: ["AL", "DV"], desc: "Bring a blanket and settle in for a neighborhood screening under the string lights." },
  { id: 9, title: "Portrait Gallery After Five", venue: "Smithsonian American Art Museum", area: "Penn Quarter", time: "Friday, 5:30 PM", price: "Free", cat: "art", tag: "Museum night", friends: ["JS"], desc: "A relaxed early evening at the museum with a gallery talk, a small bar, and enough time to wander before dinner." },
  { id: 10, title: "Atlas Local Stage", venue: "Atlas Performing Arts Center", area: "H Street", time: "Saturday, 7:00 PM", price: "$20", cat: "music", tag: "Local showcase", friends: ["MR"], desc: "A three-act local showcase in a neighborhood theater that makes a good anchor for a Saturday on H Street." },
  { id: 11, title: "Songbyrd Patio Set", venue: "Songbyrd Music House", area: "Adams Morgan", time: "Saturday, 4:00 PM", price: "Free", cat: "music", tag: "Patio set", friends: ["AL", "DV"], desc: "An easy afternoon patio set with a short local lineup and room to stop by without making the whole day revolve around it." }
];
let events = [...demoEvents];
const friendNames = { AL: "Ana", MR: "Marcus", DV: "Dev", JS: "Jules" };
const savedProfile = JSON.parse(localStorage.getItem("lokalProfile") || "null");
const tasteOptions = ["Live music", "Food", "Art", "Patios", "Sports", "Run clubs", "Comedy", "Rooftops", "Museums", "Markets", "Outdoor movies", "Theater", "Coffee", "Dancing", "Trivia", "Book clubs", "Wellness", "Volunteering", "Pop-ups", "Free events", "Low-key hangs", "New in town", "Wine bars", "Cocktail bars", "Jazz", "DJs", "Karaoke", "Festivals", "Street fairs", "Farmers markets", "Classes", "Networking", "Dating-friendly", "Family-friendly", "Dog-friendly", "Brunch", "Late night food", "Speakeasies", "Gallery openings", "History", "Parks", "Pickleball", "Yoga", "Board games", "LGBTQ+ events", "College events", "Professional mixers"];
const defaultReceipts = [
  { id: "receipt-songbyrd", title: "Flashband at Songbyrd", time: "May 24, 8:00 PM", venue: "Songbyrd Music House", price: "$18", cat: "concerts", desc: "A saved memory from a local show. Receipts will work the same way for future events once you mark that you went.", friends: ["AL", "DV"], attendedAt: new Date("2026-05-24T20:00:00").getTime() },
  { id: "receipt-open-streets", title: "Open Streets DC", time: "May 18, 12:00 PM", venue: "Shaw", price: "Free", cat: "community", desc: "A community receipt showing who you went with and how it contributes to your Lokal score.", friends: ["MR"], attendedAt: new Date("2026-05-18T12:00:00").getTime() },
  { id: "receipt-hirshhorn", title: "After Dark at the Hirshhorn", time: "May 9, 7:00 PM", venue: "Hirshhorn Museum", price: "$20", cat: "performing-arts", desc: "Receipts can reopen the event memory later, including friends and category.", friends: ["JS", "AL"], attendedAt: new Date("2026-05-09T19:00:00").getTime() }
];
const state = { route: "home", socialTab: "groups", homeFilter: "all", mapFilter: "all", mapZoom: 1, mapSearch: "", mapCenter: { x: 50, y: 50 }, age: savedProfile?.age || 27, bio: savedProfile?.bio || "Always looking for a good live show, a new restaurant, and an excuse to get outside.", tastes: savedProfile?.tastes || ["Live music", "Food", "Art", "Patios"], profile: savedProfile || { fullName: "Jordan Miller", username: "jordanindc", phone: "(202) 555-0148", birthdate: "", age: 27, initials: "JM", tastes: ["Live music", "Food", "Art", "Patios"] }, filter: {}, highlightedOnly: false, eventSync: { status: "loading", label: "Checking shared events..." }, pendingSignupPhone: "", pendingSignupProfile: null, joinedGroups: new Set(), pinnedGroups: new Set(["Friday crew"]), leftGroups: new Set(), hype: new Set(), follows: new Set(["songbyrd"]), friends: new Set(["Ana Lopez", "Marcus Reed", "Jules Kim", "Dev Shah", "Elena Torres", "Priya Lee"]), saved: new Set(), rsvps: new Set(), attended: new Set(JSON.parse(localStorage.getItem("lokalAttended") || "[]")), receipts: JSON.parse(localStorage.getItem("lokalReceipts") || JSON.stringify(defaultReceipts)), newGroups: [], groupType: "private", onboardStep: 0, selections: new Set(), showAllGroups: false, groupMessages: {}, privateGroupMembers: { "Friday crew": ["You","Ana Lopez","Marcus Reed","Dev Shah","Jules Kim","Priya Lee"], "Culture club": ["You","Priya Lee","Jules Kim","Ana Lopez","Elena Torres"], "Capitol picnic crew": ["You","Marcus Reed","Nia Williams","Chris Bennett"], "Gallery hopping": ["You","Dev Shah","Priya Lee","Elena Torres"], "Sunday coffee walk": ["You","Ana Lopez","Sofia Kim","Nia Williams"] }, directMessages: { "Ana Lopez": [{ from: "Ana", text: "Want to check out the Songbyrd show this week?" }], "Marcus Reed": [{ from: "Marcus", text: "I sent the run club details. It looks relaxed." }] }, pendingRequests: [{ id: "group-friday", type: "group", name: "Friday crew", from: "Ana", detail: "Ana invited you to join Friday crew.", time: "12 minutes ago" }, { id: "friend-priya", type: "friend", name: "Priya Lee", from: "Priya", detail: "You have 4 mutual friends.", time: "25 minutes ago" }] };
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function avatarStack(friends) {
  if (!friends.length) return "";
  return `<span class="avatars">${friends.map(f => `<span class="avatar">${f}</span>`).join("")}</span>`;
}

function eventVisualCategory(event) {
  const map = { concerts: "music", "performing-arts": "art", festivals: "food", sports: "fitness", expos: "art", community: "food" };
  return map[event.cat] || event.cat;
}

function genericEventArt(event) {
  const art = {
    concerts: { label: "Live stage", color: "#00c897", icon: "M 20 70 C 38 36 62 36 80 70 M 34 42 L 34 22 L 62 30 L 62 52 M 30 78 L 70 78" },
    "performing-arts": { label: "Curtain call", color: "#5f9fc3", icon: "M 22 28 Q 50 12 78 28 L 70 76 Q 50 64 30 76 Z M 36 39 Q 50 48 64 39" },
    sports: { label: "Game day", color: "#00e5a8", icon: "M 50 18 A 32 32 0 1 1 49 18 M 22 50 H 78 M 50 18 C 36 36 36 64 50 82 M 50 18 C 64 36 64 64 50 82" },
    festivals: { label: "Festival lights", color: "#3a7ca5", icon: "M 18 36 C 34 22 66 22 82 36 M 24 48 H 76 M 30 48 V 78 M 70 48 V 78 M 39 35 V 78 M 61 35 V 78" },
    community: { label: "Around town", color: "#00c897", icon: "M 24 76 V 34 H 48 V 76 M 52 76 V 24 H 76 V 76 M 31 44 H 41 M 59 34 H 69 M 59 47 H 69" },
    expos: { label: "Show floor", color: "#5f9fc3", icon: "M 22 28 H 78 V 76 H 22 Z M 30 40 H 70 M 30 52 H 70 M 30 64 H 54" }
  };
  const item = art[event.cat] || art.community;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='${item.color}'/><circle cx='74' cy='20' r='18' fill='rgba(255,255,255,.16)'/><circle cx='25' cy='74' r='24' fill='rgba(255,255,255,.14)'/><path d='${item.icon}' fill='none' stroke='white' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function eventArtImage(event) {
  if (event.image) return `url("${String(event.image).replace(/"/g, "%22")}")`;
  return genericEventArt(event);
}

function eventRow(event) {
  const signal = event.friends.length ? `<div class="signal">${avatarStack(event.friends)} ${event.friends.map(f => friendNames[f]).join(" + ")} ${event.friends.length === 1 ? "saved this" : "are going"}</div>` : "";
  const label = event.id === 5 ? "Featured partner" : event.id === 7 ? "Curated by @dcafterdark" : event.id === 8 ? "Popular near you" : "Trending";
  const attachedGroup = event.id === 3 ? `<div class="signal">Hosted by public group: DC Run Club</div>` : event.id === 4 ? `<div class="signal">Join the Skyline Social event chat</div>` : "";
  const image = eventArtImage(event);
  return `<button class="event-row feed-event" data-event="${event.id}" data-search-text="${`${event.title} ${event.venue} ${event.area} ${event.cat} ${event.tag}`.toLowerCase()}">
    <span class="event-art cat-${eventVisualCategory(event)}" style="background-image: linear-gradient(180deg, rgba(17,24,39,.06), rgba(17,24,39,.34)), ${image};"><span class="art-label">${event.tag}</span></span>
    <span class="event-copy"><span class="feed-label">${label}</span><span class="event-meta">${event.time} / ${event.price}</span><h3>${event.title}</h3><p>${event.venue} / ${event.area}</p>${signal}${attachedGroup}</span>
  </button>`;
}

function isHighlighted(event) { return [4, 5].includes(event.id); }

function eventNumericPrice(event) {
  if (event.price === "Free") return 0;
  const match = String(event.price || "").match(/\$?(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function eventStartHour(event) {
  if (event.startHour !== undefined && event.startHour !== null) return event.startHour;
  const match = String(event.time || "").match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[2].toUpperCase() === "PM") hour += 12;
  return hour;
}

function eventStartSortValue(event) {
  if (Number.isFinite(event.startSort)) return event.startSort;
  const timeText = String(event.time || "");
  const dayOrder = timeText.startsWith("Tonight") ? 0
    : timeText.startsWith("Today") ? 0
      : timeText.startsWith("Fri") ? 1
        : timeText.startsWith("Sat") ? 2
          : timeText.startsWith("Sun") ? 3
            : 99;
  const hour = eventStartHour(event);
  return dayOrder * 24 * 60 * 60 * 1000 + (hour ?? 24) * 60 * 60 * 1000;
}

function eventDateValue(event) {
  if (event.startDate) {
    const date = new Date(`${event.startDate}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (Number.isFinite(event.startSort) && event.startSort < Number.MAX_SAFE_INTEGER) {
    const date = new Date(event.startSort);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  return null;
}

function sameCalendarDate(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function matchesDateFilter(event, value) {
  if (!value || value === "Any date") return true;
  const eventDate = eventDateValue(event);
  if (!eventDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (value === "Today") return sameCalendarDate(eventDate, today);
  if (value === "This week") {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);
    return eventDate >= today && eventDate <= weekEnd;
  }
  if (value === "This weekend") {
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    return sameCalendarDate(eventDate, saturday) || sameCalendarDate(eventDate, sunday);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return event.startDate === value || sameCalendarDate(eventDate, new Date(`${value}T00:00:00`));
  return true;
}

function sortEventsByStart(a, b) {
  const startDelta = eventStartSortValue(a) - eventStartSortValue(b);
  if (startDelta !== 0) return startDelta;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function matchesTimeFilter(event, value) {
  if (!value || value === "Any time") return true;
  const hour = eventStartHour(event);
  if (hour === null) return false;
  if (value === "Morning") return hour >= 4 && hour < 12;
  if (value === "Afternoon") return hour >= 12 && hour < 16;
  if (value === "Evening") return hour >= 16 && hour < 21;
  if (value === "Late night") return hour >= 21 || hour < 4;
  return true;
}

function matchesFilter(event, filter, applyDiscoverFilters = true) {
  const priceValue = eventNumericPrice(event);
  if (state.age < 21 && event.cat === "nightlife") return false;
  if (applyDiscoverFilters && state.highlightedOnly && !isHighlighted(event)) return false;
  if (applyDiscoverFilters && state.filter.category && state.filter.category !== "All categories" && event.cat !== state.filter.category) return false;
  if (applyDiscoverFilters && !matchesDateFilter(event, state.filter.date)) return false;
  if (applyDiscoverFilters && !matchesTimeFilter(event, state.filter.time)) return false;
  if (applyDiscoverFilters && state.filter.price === "Free" && event.price !== "Free") return false;
  if (applyDiscoverFilters && state.filter.price === "Under $20" && (priceValue === null || priceValue >= 20)) return false;
  if (applyDiscoverFilters && state.filter.price === "Under $50" && (priceValue === null || priceValue >= 50)) return false;
  if (filter === "all" || filter === "for-you") return true;
  if (filter === "nearby") return true;
  if (filter === "weekend") return !event.time.startsWith("Tonight");
  if (filter === "tonight") return event.time.startsWith("Tonight");
  if (filter === "free") return event.price === "Free";
  return event.cat === filter;
}

function filterChips(active, scope) {
  const items = scope === "home"
    ? [["all", "All"], ["nearby", "Nearby"], ["concerts", "Concerts"], ["performing-arts", "Performing arts"], ["sports", "Sports"], ["festivals", "Festivals"], ["community", "Community"], ["expos", "Expos"], ["free", "Free"]]
    : [["all", "All"], ["concerts", "Concerts"], ["performing-arts", "Arts"], ["sports", "Sports"], ["festivals", "Festivals"], ["community", "Community"], ["expos", "Expos"]];
  return items.map(([value, label]) => `<button class="${scope === "home" ? "chip" : "filter-chip"} ${active === value ? "active" : ""}" data-${scope}-filter="${value}">${label}</button>`).join("");
}


