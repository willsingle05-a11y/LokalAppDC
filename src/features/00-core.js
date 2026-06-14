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
const state = { route: "home", socialTab: "groups", homeFilter: "all", mapFilter: "all", mapZoom: 1, mapSearch: "", mapCenter: { x: 50, y: 50 }, age: savedProfile?.age || 27, bio: savedProfile?.bio || "Always looking for a good live show, a new restaurant, and an excuse to get outside.", tastes: savedProfile?.tastes || ["Live music", "Food", "Art", "Patios"], profile: savedProfile || { fullName: "Jordan Miller", username: "jordanindc", phone: "(202) 555-0148", birthdate: "", age: 27, initials: "JM", tastes: ["Live music", "Food", "Art", "Patios"] }, filter: {}, highlightedOnly: false, eventSync: { status: "loading", label: "Checking shared events..." }, pendingSignupPhone: "", pendingSignupProfile: null, joinedGroups: new Set(), pinnedGroups: new Set(["Friday crew"]), leftGroups: new Set(), hype: new Set(), follows: new Set(["songbyrd"]), friends: new Set(["Ana Lopez", "Marcus Reed", "Jules Kim", "Dev Shah", "Elena Torres"]), saved: new Set(), rsvps: new Set(), attended: new Set(JSON.parse(localStorage.getItem("lokalAttended") || "[]")), receipts: JSON.parse(localStorage.getItem("lokalReceipts") || JSON.stringify(defaultReceipts)), newGroups: [], groupType: "private", onboardStep: 0, selections: new Set(), showAllGroups: false, groupMessages: {}, privateGroupMembers: { "Friday crew": ["You","Ana Lopez","Marcus Reed","Dev Shah","Jules Kim","Priya Lee"], "Culture club": ["You","Priya Lee","Jules Kim","Ana Lopez","Elena Torres"], "Capitol picnic crew": ["You","Marcus Reed","Nia Williams","Chris Bennett"], "Gallery hopping": ["You","Dev Shah","Priya Lee","Elena Torres"], "Sunday coffee walk": ["You","Ana Lopez","Sofia Kim","Nia Williams"] }, directMessages: { "Ana Lopez": [{ from: "Ana", text: "Want to check out the Songbyrd show this week?" }], "Marcus Reed": [{ from: "Marcus", text: "I sent the run club details. It looks relaxed." }] }, pendingRequests: [{ id: "group-friday", type: "group", name: "Friday crew", from: "Ana", detail: "Ana invited you to join Friday crew.", time: "12 minutes ago" }, { id: "friend-priya", type: "friend", name: "Priya Lee", from: "Priya", detail: "You have 4 mutual friends.", time: "25 minutes ago" }] };
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
state.friendConnections = { [state.profile.fullName]: Array.from(state.friends) };

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

function eventArtKind(event) {
  const tags = eventTags(event).join(" ").toLowerCase();
  const titleText = `${event.title || ""} ${event.venue || ""} ${event.cat || ""} ${tags}`.toLowerCase();
  let key = event.cat || "community";
  if (/food|market|chef|brunch|wine|beer|cocktail|restaurant/.test(titleText)) key = "food";
  if (/film|cinema|movie/.test(titleText)) key = "film";
  if (/museum|gallery|art|exhibit/.test(titleText)) key = "arts";
  if (/comedy|stand-up|standup/.test(titleText)) key = "comedy";
  if (/run|yoga|fitness|wellness|pickleball/.test(titleText)) key = "fitness";
  return key;
}

function genericEventArt(event) {
  const key = eventArtKind(event);
  const art = {
    concerts: { a: "#42d87c", b: "#18c76f", c: "#d9ffe8", shapes: "<path d='M18 72 C34 42 66 42 82 72' fill='none' stroke='white' stroke-width='5'/><path d='M34 44 V22 L64 31 V55' fill='none' stroke='white' stroke-width='5'/><circle cx='34' cy='67' r='9' fill='rgba(255,255,255,.85)'/><circle cx='64' cy='67' r='9' fill='rgba(255,255,255,.65)'/>" },
    "performing-arts": { a: "#3fd47b", b: "#0bbf73", c: "#cdf9db", shapes: "<path d='M18 24 Q50 11 82 24 V82 Q50 67 18 82 Z' fill='rgba(255,255,255,.2)' stroke='white' stroke-width='4'/><path d='M33 43 Q50 54 67 43' fill='none' stroke='white' stroke-width='5'/><circle cx='37' cy='34' r='4' fill='white'/><circle cx='63' cy='34' r='4' fill='white'/>" },
    sports: { a: "#4ce083", b: "#12c77a", c: "#e5ffef", shapes: "<rect x='16' y='22' width='68' height='56' rx='12' fill='rgba(255,255,255,.15)' stroke='white' stroke-width='4'/><path d='M16 50 H84 M50 22 V78' stroke='white' stroke-width='4'/><circle cx='50' cy='50' r='13' fill='none' stroke='white' stroke-width='4'/>" },
    festivals: { a: "#36d676", b: "#00c897", c: "#d8ffe9", shapes: "<path d='M18 42 C33 23 67 23 82 42' fill='none' stroke='white' stroke-width='5'/><path d='M26 46 H74 L68 78 H32 Z' fill='rgba(255,255,255,.22)' stroke='white' stroke-width='4'/><path d='M36 46 V78 M50 35 V78 M64 46 V78' stroke='white' stroke-width='4'/>" },
    community: { a: "#5fe18d", b: "#28cf79", c: "#e7fff0", shapes: "<path d='M22 80 V38 H47 V80 M53 80 V24 H78 V80' fill='rgba(255,255,255,.55)' stroke='white' stroke-width='4'/><path d='M30 48 H39 M61 36 H70 M61 50 H70' stroke='white' stroke-width='4'/><circle cx='28' cy='23' r='8' fill='rgba(255,255,255,.75)'/>" },
    expos: { a: "#46dc82", b: "#10c578", c: "#dfffea", shapes: "<rect x='19' y='25' width='62' height='52' rx='7' fill='rgba(255,255,255,.35)' stroke='white' stroke-width='4'/><path d='M29 39 H71 M29 52 H71 M29 65 H56' stroke='white' stroke-width='4'/><circle cx='74' cy='22' r='8' fill='rgba(255,255,255,.65)'/>" },
    food: { a: "#50dc82", b: "#18c973", c: "#eafff1", shapes: "<path d='M30 22 V57 M40 22 V57 M30 40 H40 M60 22 V78' stroke='white' stroke-width='5' stroke-linecap='round'/><path d='M22 70 C34 54 66 54 78 70' fill='rgba(255,255,255,.35)' stroke='white' stroke-width='4'/><circle cx='50' cy='48' r='10' fill='rgba(255,255,255,.45)'/>" },
    film: { a: "#35d374", b: "#0fc983", c: "#d8ffe8", shapes: "<rect x='19' y='28' width='62' height='44' rx='7' fill='rgba(255,255,255,.2)' stroke='white' stroke-width='4'/><path d='M37 39 L37 61 L59 50 Z' fill='white'/><path d='M24 35 H30 M24 47 H30 M24 59 H30 M70 35 H76 M70 47 H76 M70 59 H76' stroke='white' stroke-width='3'/>" },
    arts: { a: "#58e28a", b: "#1acb75", c: "#e6fff0", shapes: "<rect x='23' y='20' width='54' height='62' rx='8' fill='rgba(255,255,255,.35)' stroke='white' stroke-width='4'/><circle cx='42' cy='43' r='10' fill='rgba(255,255,255,.6)'/><path d='M30 69 C42 54 53 61 69 42' fill='none' stroke='white' stroke-width='5'/>" },
    comedy: { a: "#45dc80", b: "#0bc479", c: "#e3ffed", shapes: "<path d='M25 28 Q50 18 75 28 L70 72 Q50 84 30 72 Z' fill='rgba(255,255,255,.22)' stroke='white' stroke-width='4'/><circle cx='40' cy='43' r='4' fill='white'/><circle cx='60' cy='43' r='4' fill='white'/><path d='M37 58 Q50 68 63 58' fill='none' stroke='white' stroke-width='5'/>" },
    fitness: { a: "#61e591", b: "#18c879", c: "#e9fff2", shapes: "<path d='M24 62 C36 40 52 76 66 34' fill='none' stroke='white' stroke-width='5'/><circle cx='68' cy='30' r='8' fill='rgba(255,255,255,.7)'/><path d='M24 77 H78' stroke='white' stroke-width='5'/>" }
  };
  const item = art[key] || art[event.cat] || art.community;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='${item.a}'/><stop offset='.58' stop-color='${item.b}'/><stop offset='1' stop-color='${item.c}'/></linearGradient><pattern id='dots' width='16' height='16' patternUnits='userSpaceOnUse'><circle cx='3' cy='3' r='2' fill='rgba(255,255,255,.18)'/></pattern></defs><rect width='100' height='100' rx='18' fill='url(#g)'/><rect width='100' height='100' rx='18' fill='url(#dots)'/><circle cx='80' cy='18' r='18' fill='rgba(255,255,255,.14)'/><circle cx='18' cy='82' r='25' fill='rgba(255,255,255,.12)'/>${item.shapes}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function eventArtScene(event) {
  if (event.image) return "";
  const scenes = {
    concerts: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M24 72 C38 47 62 47 76 72' fill='none'/><path d='M38 48 V24 L66 32 V58'/><circle cx='38' cy='70' r='9'/><circle cx='66' cy='70' r='9'/></svg>",
    "performing-arts": "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M20 26 Q50 14 80 26 L72 76 Q50 64 28 76 Z'/><circle cx='39' cy='41' r='4'/><circle cx='61' cy='41' r='4'/><path d='M38 58 Q50 68 62 58' fill='none'/></svg>",
    sports: "<svg viewBox='0 0 100 100' aria-hidden='true'><circle cx='50' cy='50' r='31' fill='none'/><path d='M20 50 H80 M50 19 C37 36 37 64 50 81 M50 19 C63 36 63 64 50 81' fill='none'/></svg>",
    festivals: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M18 40 C34 23 66 23 82 40' fill='none'/><path d='M26 47 H74 L68 78 H32 Z'/><path d='M38 47 V78 M50 36 V78 M62 47 V78' fill='none'/></svg>",
    community: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M23 80 V38 H47 V80 M53 80 V25 H77 V80'/><path d='M31 49 H40 M61 37 H70 M61 51 H70' fill='none'/></svg>",
    expos: "<svg viewBox='0 0 100 100' aria-hidden='true'><rect x='20' y='25' width='60' height='52' rx='7'/><path d='M31 40 H69 M31 53 H69 M31 66 H56' fill='none'/></svg>",
    food: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M30 23 V58 M40 23 V58 M30 41 H40 M61 23 V78' fill='none'/><path d='M22 71 C34 55 66 55 78 71'/><circle cx='50' cy='49' r='10'/></svg>",
    film: "<svg viewBox='0 0 100 100' aria-hidden='true'><rect x='19' y='29' width='62' height='42' rx='7'/><path d='M38 40 L38 60 L60 50 Z'/><path d='M25 36 H30 M25 48 H30 M25 60 H30 M70 36 H75 M70 48 H75 M70 60 H75' fill='none'/></svg>",
    arts: "<svg viewBox='0 0 100 100' aria-hidden='true'><rect x='24' y='21' width='52' height='60' rx='8'/><circle cx='42' cy='43' r='10'/><path d='M31 68 C42 55 54 62 68 42' fill='none'/></svg>",
    comedy: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M25 28 Q50 18 75 28 L70 72 Q50 84 30 72 Z'/><circle cx='40' cy='43' r='4'/><circle cx='60' cy='43' r='4'/><path d='M38 59 Q50 68 62 59' fill='none'/></svg>",
    fitness: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M24 63 C36 41 52 76 66 34' fill='none'/><circle cx='68' cy='30' r='8'/><path d='M24 78 H78' fill='none'/></svg>"
  };
  return `<span class="art-scene art-scene-${eventArtKind(event)}">${scenes[eventArtKind(event)] || scenes.community}</span>`;
}

function eventArtImage(event) {
  if (event.image) return `url("${String(event.image).replace(/"/g, "%22")}")`;
  return genericEventArt(event);
}

function eventTags(event) {
  const raw = Array.isArray(event.tags) ? event.tags : [event.tag, event.cat];
  return raw
    .map(tag => typeof tag === "object" && tag !== null ? (tag.label || tag.name || tag.title || tag.value || "") : tag)
    .map(tag => String(tag || "").trim())
    .filter(tag => tag && tag !== "[object Object]")
    .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index);
}

function eventTagChips(event, limit = 3) {
  return eventTags(event).slice(0, limit).map(tag => `<span class="event-tag">${escapeHtml(tag)}</span>`).join("");
}

function primaryEventTag(event) {
  return eventTags(event)[0] || event.tag || event.cat || "Local event";
}

function eventRow(event) {
  const signal = event.friends.length ? `<div class="signal">${avatarStack(event.friends)} ${event.friends.map(f => friendNames[f]).join(" + ")} ${event.friends.length === 1 ? "saved this" : "are going"}</div>` : "";
  const label = event.id === 5 ? "Featured partner" : event.id === 7 ? "Curated by @dcafterdark" : event.id === 8 ? "Popular near you" : "Trending";
  const attachedGroup = event.id === 3 ? `<div class="signal">Hosted by public group: DC Run Club</div>` : event.id === 4 ? `<div class="signal">Join the Skyline Social event chat</div>` : "";
  const image = eventArtImage(event);
  const tags = eventTags(event);
  return `<button class="event-row feed-event" data-event="${event.id}" data-search-text="${`${event.title} ${event.venue} ${event.area} ${event.cat} ${tags.join(" ")}`.toLowerCase()}">
    <span class="event-art cat-${eventVisualCategory(event)}" style="background-image: linear-gradient(180deg, rgba(17,24,39,.06), rgba(17,24,39,.34)), ${image};">${eventArtScene(event)}<span class="art-label">${escapeHtml(primaryEventTag(event))}</span></span>
    <span class="event-copy"><span class="feed-label">${label}</span><span class="event-meta">${event.time} / ${event.price}</span><h3>${event.title}</h3><p>${event.venue} / ${event.area}</p><span class="event-tags">${eventTagChips(event)}</span>${signal}${attachedGroup}</span>
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


