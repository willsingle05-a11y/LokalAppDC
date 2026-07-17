const icons = {
  compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="m15.4 8.6-2.1 4.7-4.7 2.1 2.1-4.7 4.7-2.1Z"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  "user-plus": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="8" cy="7" r="4"/><path d="M17 8v6M20 11h-6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 13h3l10-5v11L7 14H4v-1Z"/><path d="M7 14l1.4 5.2a1.2 1.2 0 0 0 1.2.8h1.6"/><path d="M19 9.5c1 .7 1.5 1.5 1.5 3s-.5 2.3-1.5 3"/><path d="M21 6.5c1.5 1.5 2.3 3.5 2.3 6s-.8 4.5-2.3 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5"/></svg>'
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
let venueDirectory = [];
const friendNames = { AL: "Ana", MR: "Marcus", DV: "Dev", JS: "Jules", PL: "Priya", ET: "Elena", NW: "Nia", CB: "Chris" };
const savedProfile = JSON.parse(localStorage.getItem("lokalProfile") || "null");
const tasteOptions = ["Live music", "Food", "Art", "Patios", "Sports", "Run clubs", "Comedy", "Rooftops", "Museums", "Markets", "Outdoor movies", "Theater", "Coffee", "Dancing", "Trivia", "Book clubs", "Wellness", "Volunteering", "Pop-ups", "Free events", "Low-key hangs", "New in town", "Wine bars", "Cocktail bars", "Jazz", "DJs", "Karaoke", "Festivals", "Street fairs", "Farmers markets", "Classes", "Networking", "Dating-friendly", "Family-friendly", "Dog-friendly", "Brunch", "Late night food", "Speakeasies", "Gallery openings", "History", "Parks", "Pickleball", "Yoga", "Board games", "LGBTQ+ events", "College events", "Professional mixers"];
const defaultReceipts = [];
const state = { route: "home", socialTab: "saved", plannerWeekOffset: 0, homeFilter: "all", discoverCategoryView: "", mapFilter: "all", mapZoom: 1, mapSearch: "", mapCenter: { x: 50, y: 50 }, discoverGenreFilter: "", age: savedProfile?.age || 27, bio: savedProfile?.bio || "Always looking for a good live show, a new restaurant, and an excuse to get outside.", tastes: savedProfile?.tastes || ["Live music", "Food", "Art", "Patios"], profile: savedProfile || { fullName: "Jordan Miller", username: "jordanindc", phone: "(202) 555-0148", birthdate: "", age: 27, initials: "JM", tastes: ["Live music", "Food", "Art", "Patios"], privateAccount: false }, privateAccount: Boolean(savedProfile?.privateAccount), filter: {}, highlightedOnly: false, eventSync: { status: "loading", label: "Checking shared events..." }, pendingSignupPhone: "", pendingSignupProfile: null, verifiedVenues: new Set(JSON.parse(localStorage.getItem("lokalVerifiedVenues") || "[]")), verifiedVenueNames: JSON.parse(localStorage.getItem("lokalVerifiedVenueNames") || "[]"), pendingVenueRequests: JSON.parse(localStorage.getItem("lokalPendingVenueRequests") || "[]"), venueVerificationDismissed: localStorage.getItem("lokalVenueVerificationDismissed") === "1", joinedGroups: new Set(), pinnedGroups: new Set(["Friday crew"]), leftGroups: new Set(), hype: new Set(), follows: new Set(JSON.parse(localStorage.getItem("lokalFollows") || "[]")), friends: new Set(["Ana Lopez", "Marcus Reed", "Jules Kim", "Dev Shah", "Elena Torres"]), saved: new Set(), rsvps: new Set(), attended: new Set(JSON.parse(localStorage.getItem("lokalAttended") || "[]")), receipts: JSON.parse(localStorage.getItem("lokalReceipts") || JSON.stringify(defaultReceipts)), storyPosts: JSON.parse(localStorage.getItem("lokalStoryPosts") || "[]"), newGroups: [], groupType: "private", onboardStep: 0, selections: new Set(), showAllGroups: false, groupMessages: {}, privateGroupMembers: { "Friday crew": ["You","Ana Lopez","Marcus Reed","Dev Shah","Jules Kim","Priya Lee"], "Culture club": ["You","Priya Lee","Jules Kim","Ana Lopez","Elena Torres"], "Capitol picnic crew": ["You","Marcus Reed","Nia Williams","Chris Bennett"], "Gallery hopping": ["You","Dev Shah","Priya Lee","Elena Torres"], "Sunday coffee walk": ["You","Ana Lopez","Sofia Kim","Nia Williams"] }, directMessages: { "Ana Lopez": [{ from: "Ana", text: "Want to check out the Songbyrd show this week?" }], "Marcus Reed": [{ from: "Marcus", text: "I sent the run club details. It looks relaxed." }] }, pendingRequests: [{ id: "friend-priya", type: "friend", name: "Priya Lee", from: "Priya", detail: "You have 4 mutual friends.", time: "25 minutes ago" }] };
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
state.friendConnections = { [state.profile.fullName]: Array.from(state.friends) };
// Persisted saves/RSVPs by stable source id (runtime event ids change each sync),
// reconciled back onto the loaded events so a user's data survives reloads and
// shapes what they see.
state.savedSources = new Set(JSON.parse(localStorage.getItem("lokalSavedSources") || "[]"));
state.rsvpSources = new Set(JSON.parse(localStorage.getItem("lokalRsvpSources") || "[]"));
// Discover filter bar: multi-select What (category), Where (neighborhood), When (day/time).
state.whatFilter = new Set();
state.whereFilter = new Set();
state.whenFilter = new Set();

function accountVenueName() {
  if (state.profile?.accountType !== "venue") return "";
  const approved = Array.isArray(state.verifiedVenueNames) ? state.verifiedVenueNames[0] : "";
  return state.profile?.venueName || approved || "";
}

function isVenueAccount() {
  return state.profile?.accountType === "venue";
}

function currentAccountDisplayName() {
  return isVenueAccount() ? accountVenueName() || state.profile.fullName : state.profile.fullName;
}

function currentAccountInitials() {
  return profileInitials(currentAccountDisplayName());
}

function currentVenueImage() {
  return state.profile?.venueImageUrl || "";
}

function registerLocalVenueProfile() {
  const name = accountVenueName();
  const image = currentVenueImage();
  if (!name || !image) return;
  const key = venueImageKeyName(name);
  venueImageMap[key] = image;
  venueImageKeys = Object.keys(venueImageMap).sort((a, b) => b.length - a.length);
  const existing = venueDirectory.find(venue => venueImageKeyName(venue.name) === key);
  if (existing) existing.image_url = image;
  else venueDirectory.unshift({ name, address: state.profile.venueAddress || "", neighborhood: (state.profile.areas || [])[0] || "", venue_type: "Venue", website_url: state.profile.venueWebsite || "", image_url: image });
}

// Record a save/RSVP by the event's stable source id and persist it.
function setPlanSource(kind, id, on) {
  const event = events.find(item => item.id === Number(id));
  if (!event) return;
  const sourceId = String(event.sourceId || event.id);
  const store = kind === "saved" ? state.savedSources : state.rsvpSources;
  on ? store.add(sourceId) : store.delete(sourceId);
  localStorage.setItem(kind === "saved" ? "lokalSavedSources" : "lokalRsvpSources", JSON.stringify(Array.from(store)));
}

// Re-link persisted saves/RSVPs onto the freshly loaded events (runtime ids change
// every sync, so we match by stable source id).
function reconcileUserPlans() {
  events.forEach(event => {
    const sourceId = String(event.sourceId || event.id);
    if (state.savedSources.has(sourceId)) state.saved.add(event.id);
    if (state.rsvpSources.has(sourceId)) state.rsvps.add(event.id);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

async function copyText(value) {
  const text = String(value || "");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
}

function avatarStack(friends) {
  if (!friends.length) return "";
  return `<span class="avatars">${friends.map(f => `<span class="avatar">${f}</span>`).join("")}</span>`;
}

function interestedFriendsForEvent(event) {
  const explicit = (Array.isArray(event.friends) ? event.friends : []).filter(friend => friendNames[friend]);
  return explicit.filter((friend, index, all) => friend && all.indexOf(friend) === index).slice(0, 2);
}

function eventInterestSignal(event, detail = false) {
  const friends = interestedFriendsForEvent(event);
  if (!friends.length) return "";
  const names = friends.map(friend => friendNames[friend]);
  const wording = names.length === 1 ? `${names[0]} is interested` : `${names[0]} and ${names[1]} are interested`;
  return `<div class="${detail ? "attendee-line" : "signal"}">${avatarStack(friends)} ${wording}</div>`;
}

function eventVisualCategory(event) {
  const map = { concerts: "music", "live-music": "music", "performing-arts": "art", museums: "art", festivals: "food", sports: "fitness", expos: "art", community: "food", nightlife: "nightlife", "happy-hours": "nightlife", "trivia-nights": "nightlife" };
  return map[event.cat] || event.cat;
}

function eventArtKind(event) {
  const tags = eventTags(event).join(" ").toLowerCase();
  const titleText = `${event.title || ""} ${event.venue || ""} ${event.cat || ""} ${tags}`.toLowerCase();
  let key = event.cat || "community";
  if (["happy-hours", "trivia-nights"].includes(key)) key = "nightlife";
  if (/museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history/.test(titleText)) return "museum";
  if (/run club|running|run\b|5k|10k|marathon|jog/.test(titleText)) return "run";
  if (/baseball|mlb|nationals|nats\b/.test(titleText)) return "baseball";
  if (/basketball|nba|wnba|wizards|mystics/.test(titleText)) return "basketball";
  if (/soccer|mls|nwsl|d\.?c\.? united|dc united|washington spirit/.test(titleText)) return "soccer";
  if (/hockey|nhl|capitals|caps\b/.test(titleText)) return "hockey";
  if (/football|nfl|commanders/.test(titleText)) return "football";
  if (/comedy|stand-up|standup/.test(titleText)) key = "comedy";
  if (/film|cinema|movie|screening/.test(titleText)) key = "film";
  if (/gallery|art|exhibit|exhibition/.test(titleText)) key = "arts";
  if (/yoga|fitness|wellness|pickleball/.test(titleText)) key = "fitness";
  if (/nightlife|nightclub|club|bar|lounge|rooftop|cocktail|dance party|after dark|late night|dj set/.test(titleText)) key = "nightlife";
  if (/food|market|chef|brunch|wine|beer|cocktail|restaurant/.test(titleText)) key = "food";
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
    museum: { a: "#58e28a", b: "#1acb75", c: "#e6fff0", shapes: "<path d='M18 78 H82' stroke='white' stroke-width='5'/><path d='M24 35 H76 L50 19 Z' fill='rgba(255,255,255,.32)' stroke='white' stroke-width='4'/><path d='M29 35 V72 M43 35 V72 M57 35 V72 M71 35 V72' stroke='white' stroke-width='5'/><path d='M23 72 H77' stroke='white' stroke-width='5'/>" },
    arts: { a: "#58e28a", b: "#1acb75", c: "#e6fff0", shapes: "<rect x='23' y='20' width='54' height='62' rx='8' fill='rgba(255,255,255,.35)' stroke='white' stroke-width='4'/><circle cx='42' cy='43' r='10' fill='rgba(255,255,255,.6)'/><path d='M30 69 C42 54 53 61 69 42' fill='none' stroke='white' stroke-width='5'/>" },
    comedy: { a: "#45dc80", b: "#0bc479", c: "#e3ffed", shapes: "<path d='M25 28 Q50 18 75 28 L70 72 Q50 84 30 72 Z' fill='rgba(255,255,255,.22)' stroke='white' stroke-width='4'/><circle cx='40' cy='43' r='4' fill='white'/><circle cx='60' cy='43' r='4' fill='white'/><path d='M37 58 Q50 68 63 58' fill='none' stroke='white' stroke-width='5'/>" },
    run: { a: "#61e591", b: "#18c879", c: "#e9fff2", shapes: "<path d='M24 68 C34 77 55 78 77 66 C81 64 80 57 75 56 L58 52 L45 37 L36 42 L46 58 L31 57 C24 56 20 63 24 68 Z' fill='rgba(255,255,255,.42)' stroke='white' stroke-width='4' stroke-linejoin='round'/><path d='M31 70 C42 74 58 74 75 66 M45 58 L58 52' stroke='white' stroke-width='4' fill='none'/><circle cx='38' cy='33' r='7' fill='rgba(255,255,255,.72)'/>" },
    baseball: { a: "#4ce083", b: "#12c77a", c: "#e5ffef", shapes: "<circle cx='50' cy='50' r='31' fill='rgba(255,255,255,.24)' stroke='white' stroke-width='5'/><path d='M33 26 C41 38 41 62 33 74 M67 26 C59 38 59 62 67 74' fill='none' stroke='white' stroke-width='4'/><path d='M36 37 L41 34 M36 47 L42 45 M36 57 L42 60 M64 37 L59 34 M64 47 L58 45 M64 57 L58 60' stroke='white' stroke-width='3'/>" },
    basketball: { a: "#4ce083", b: "#12c77a", c: "#e5ffef", shapes: "<circle cx='50' cy='50' r='31' fill='rgba(255,255,255,.18)' stroke='white' stroke-width='5'/><path d='M20 50 H80 M50 19 V81 M29 29 C43 41 43 59 29 71 M71 29 C57 41 57 59 71 71' fill='none' stroke='white' stroke-width='4'/>" },
    soccer: { a: "#4ce083", b: "#12c77a", c: "#e5ffef", shapes: "<circle cx='50' cy='50' r='31' fill='rgba(255,255,255,.18)' stroke='white' stroke-width='5'/><path d='M50 34 L64 44 L59 61 H41 L36 44 Z' fill='rgba(255,255,255,.45)' stroke='white' stroke-width='4'/><path d='M50 34 V22 M64 44 L78 39 M59 61 L66 75 M41 61 L34 75 M36 44 L22 39' stroke='white' stroke-width='4'/>" },
    hockey: { a: "#4ce083", b: "#12c77a", c: "#e5ffef", shapes: "<path d='M34 21 L51 68' stroke='white' stroke-width='6' stroke-linecap='round'/><path d='M66 21 L52 68' stroke='white' stroke-width='6' stroke-linecap='round'/><path d='M42 70 H71' stroke='white' stroke-width='6' stroke-linecap='round'/><ellipse cx='31' cy='75' rx='12' ry='5' fill='rgba(255,255,255,.62)'/>" },
    football: { a: "#4ce083", b: "#12c77a", c: "#e5ffef", shapes: "<path d='M22 50 C32 24 68 24 78 50 C68 76 32 76 22 50 Z' fill='rgba(255,255,255,.24)' stroke='white' stroke-width='5'/><path d='M36 50 H64 M44 42 V58 M50 42 V58 M56 42 V58' stroke='white' stroke-width='4'/><path d='M29 35 C43 43 57 43 71 35 M29 65 C43 57 57 57 71 65' stroke='white' stroke-width='3' fill='none'/>" },
    fitness: { a: "#61e591", b: "#18c879", c: "#e9fff2", shapes: "<path d='M24 62 C36 40 52 76 66 34' fill='none' stroke='white' stroke-width='5'/><circle cx='68' cy='30' r='8' fill='rgba(255,255,255,.7)'/><path d='M24 77 H78' stroke='white' stroke-width='5'/>" },
    nightlife: { a: "#2f3f6f", b: "#111827", c: "#32d274", shapes: "<path d='M29 24 H71 L64 51 Q50 62 36 51 Z' fill='rgba(255,255,255,.2)' stroke='white' stroke-width='4'/><path d='M50 59 V78 M37 78 H63' stroke='white' stroke-width='5'/><path d='M28 31 H72 M37 39 H63' stroke='white' stroke-width='4'/><circle cx='72' cy='24' r='8' fill='rgba(255,255,255,.65)'/>" }
  };
  const item = art[key] || art[event.cat] || art.community;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='${item.a}'/><stop offset='.58' stop-color='${item.b}'/><stop offset='1' stop-color='${item.c}'/></linearGradient><pattern id='dots' width='16' height='16' patternUnits='userSpaceOnUse'><circle cx='3' cy='3' r='2' fill='rgba(255,255,255,.18)'/></pattern></defs><rect width='100' height='100' rx='18' fill='url(#g)'/><rect width='100' height='100' rx='18' fill='url(#dots)'/><circle cx='80' cy='18' r='18' fill='rgba(255,255,255,.14)'/><circle cx='18' cy='82' r='25' fill='rgba(255,255,255,.12)'/>${item.shapes}</svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
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
    museum: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M18 78 H82'/><path d='M24 35 H76 L50 19 Z'/><path d='M29 35 V72 M43 35 V72 M57 35 V72 M71 35 V72'/><path d='M23 72 H77'/></svg>",
    arts: "<svg viewBox='0 0 100 100' aria-hidden='true'><rect x='24' y='21' width='52' height='60' rx='8'/><circle cx='42' cy='43' r='10'/><path d='M31 68 C42 55 54 62 68 42' fill='none'/></svg>",
    comedy: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M25 28 Q50 18 75 28 L70 72 Q50 84 30 72 Z'/><circle cx='40' cy='43' r='4'/><circle cx='60' cy='43' r='4'/><path d='M38 59 Q50 68 62 59' fill='none'/></svg>",
    run: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M24 68 C34 77 55 78 77 66 C81 64 80 57 75 56 L58 52 L45 37 L36 42 L46 58 L31 57 C24 56 20 63 24 68 Z'/><path d='M31 70 C42 74 58 74 75 66 M45 58 L58 52' fill='none'/><circle cx='38' cy='33' r='7'/></svg>",
    baseball: "<svg viewBox='0 0 100 100' aria-hidden='true'><circle cx='50' cy='50' r='31'/><path d='M33 26 C41 38 41 62 33 74 M67 26 C59 38 59 62 67 74' fill='none'/><path d='M36 37 L41 34 M36 47 L42 45 M36 57 L42 60 M64 37 L59 34 M64 47 L58 45 M64 57 L58 60'/></svg>",
    basketball: "<svg viewBox='0 0 100 100' aria-hidden='true'><circle cx='50' cy='50' r='31'/><path d='M20 50 H80 M50 19 V81 M29 29 C43 41 43 59 29 71 M71 29 C57 41 57 59 71 71' fill='none'/></svg>",
    soccer: "<svg viewBox='0 0 100 100' aria-hidden='true'><circle cx='50' cy='50' r='31'/><path d='M50 34 L64 44 L59 61 H41 L36 44 Z'/><path d='M50 34 V22 M64 44 L78 39 M59 61 L66 75 M41 61 L34 75 M36 44 L22 39' fill='none'/></svg>",
    hockey: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M34 21 L51 68 M66 21 L52 68 M42 70 H71' fill='none'/><ellipse cx='31' cy='75' rx='12' ry='5'/></svg>",
    football: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M22 50 C32 24 68 24 78 50 C68 76 32 76 22 50 Z'/><path d='M36 50 H64 M44 42 V58 M50 42 V58 M56 42 V58' fill='none'/><path d='M29 35 C43 43 57 43 71 35 M29 65 C43 57 57 57 71 65' fill='none'/></svg>",
    fitness: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M24 63 C36 41 52 76 66 34' fill='none'/><circle cx='68' cy='30' r='8'/><path d='M24 78 H78' fill='none'/></svg>",
    nightlife: "<svg viewBox='0 0 100 100' aria-hidden='true'><path d='M29 24 H71 L64 51 Q50 62 36 51 Z'/><path d='M50 59 V78 M37 78 H63' fill='none'/><path d='M28 31 H72 M37 39 H63' fill='none'/><circle cx='72' cy='24' r='8'/></svg>"
  };
  return `<span class="art-scene art-scene-${eventArtKind(event)}">${scenes[eventArtKind(event)] || scenes.community}</span>`;
}

function eventArtImage(event) {
  if (event.image) return `url('${String(event.image).replace(/'/g, "%27")}')`;
  return genericEventArt(event);
}

// Bare image URL/data-URI for use in an <img> (so cards size to the image's
// natural aspect ratio). Falls back to the generated SVG art.
function eventCardImageSrc(event) {
  if (event.image) return String(event.image);
  const art = genericEventArt(event);
  const match = art.match(/^url\(['"]?([\s\S]*?)['"]?\)$/);
  return match ? match[1] : art;
}

function seededPerformingArtsFallbackTags(seedText) {
  const pool = ["Curtain Call", "Limited Run", "Tour Stop", "Ensemble", "Solo Set", "Matinee", "Late Show", "New Work", "Classic Story", "Reserved Seating"];
  const seed = Array.from(String(seedText || "lokal")).reduce((total, char) => total + char.charCodeAt(0), 0);
  return [pool[seed % pool.length], pool[(seed + 4) % pool.length]];
}

function seededConcertFallbackTags(seedText) {
  const pool = ["Tour Stop", "Club Show", "New Release", "Small Room", "Late Set", "Featured Artist", "Dance Floor", "Local Stage", "Vocal Set", "Deep Cuts"];
  const seed = Array.from(String(seedText || "lokal")).reduce((total, char) => total + char.charCodeAt(0), 0);
  return [pool[seed % pool.length], pool[(seed + 5) % pool.length]];
}


const MUSIC_GENRE_TAGS = ["Hip-Hop", "R&B", "Jazz", "Go-Go", "Pop", "Rock", "Indie", "Folk", "Country", "Electronic", "Latin", "Soul", "Singer-Songwriter", "Classical", "Punk", "Metal", "Reggae", "Blues", "House", "Funk"];
function isMusicGenreTag(tag) {
  return MUSIC_GENRE_TAGS.some(genre => genre.toLowerCase() === String(tag || "").toLowerCase());
}
function seededMusicGenreTag(seedText) {
  const pool = ["Indie", "Rock", "Pop", "Jazz", "R&B", "Electronic", "Folk", "Hip-Hop", "Soul", "Latin", "Singer-Songwriter"];
  const seed = Array.from(String(seedText || "lokal")).reduce((total, char) => total + char.charCodeAt(0), 0);
  return pool[seed % pool.length];
}
function eventTags(event) {
  const labels = { concerts: "Concerts", "live-music": "Live music", "performing-arts": "Arts", museums: "Museums", festivals: "Festivals", sports: "Sports", community: "Community", expos: "Expos", nightlife: "Nightlife", "happy-hours": "Happy hours", "trivia-nights": "Trivia Nights" };
  const raw = Array.isArray(event.tags) ? event.tags : [event.tag, event.cat];
  const tags = raw
    .map(tag => typeof tag === "object" && tag !== null ? (tag.label || tag.name || tag.title || tag.value || "") : tag)
    .map(tag => String(tag || "").trim())
    .map(tag => labels[tag.toLowerCase()] || tag)
    .filter(tag => tag && tag !== "[object Object]")
    .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index);
  if (["concerts", "live-music"].includes(String(event.cat || "").toLowerCase())) {
    const text = `${event.title || ""} ${event.venue || ""} ${event.desc || ""} ${event.tag || ""} ${raw.join(" ")}`.toLowerCase();
    const inferred = [];
    const add = (label, pattern) => { if (pattern.test(text) && !inferred.includes(label)) inferred.push(label); };
    add("Hip-Hop", /\b(hip[- ]?hop|rap|rapper|conway|chris travis)\b/);
    add("R&B", /r&b|rhythm and blues|jill scott|bayou/);
    add("Jazz", /jazz|bebop|swing/);
    add("Go-Go", /go[- ]?go|northeast groovers|wpgc/);
    add("Pop", /\bpop\b|dorian electra|fulton lee|flawed mangoes|daniela andrade/);
    add("Rock", /music - rock|\brock band\b|\balt[- ]rock\b|\bindie rock\b|the church|the kills|of montreal/);
    add("Indie", /indie|alt[- ]|alternative|of montreal|son little|bixby|flawed mangoes/);
    add("Folk", /folk|americana|singer[- ]songwriter|songwriter|acoustic|josiah and the bonnevilles|orville peck/);
    add("Singer-Songwriter", /singer[- ]songwriter|songwriter|solo acoustic|porchlight/);
    add("Country", /music - country|country music|orville peck|kolby cooper/);
    add("Electronic", /electronic|edm|dance music|dj set|rufus|r.f.s|echostage|soundcheck|n� androids|transmission|flash/);
    add("House", /house music|deep house|tech house/);
    add("Latin", /latin|reggaeton|salsa|bachata|cumbia|paco amoroso|ca7riel|tumbao/);
    add("Soul", /soul|funk|big freedia|tank and the bangas/);
    add("Funk", /funk|go-go/);
    add("Classical", /classical|orchestra|symphony|chamber|nso/);
    add("Punk", /punk|hardcore/);
    add("Metal", /metal/);
    add("Reggae", /reggae|dancehall/);
    add("Blues", /blues/);
    add("DJ Set", /\bdj\b|deejay|turntable|vinyl/);
    add("Album Tour", /album|record release|new release|listening session|playlist/);
    add("Tour Stop", /\btour\b|world tour|north america/);
    add("Local Artist", /dc artist|local artist|local lineup|hometown/);
    add("Free", /free admission|free event|free concert|free show|rsvp free|no cover/);
    add("18+", /\b18\+\b|ages 18/);
    add("21+", /\b21\+\b|ages 21/);
    add("Club Show", /9:30 club|930 club|the atlantis|union stage|black cat|dc9|songbyrd/);
    add("Big Room", /the anthem|echostage|arena|stadium|audi field/);
    const clean = tags.filter(tag => !["concert", "concerts", "live music", "music", "arts", "art", "free", "nightlife", "night out"].includes(tag.toLowerCase()));
    const genre = [...clean, ...inferred].find(isMusicGenreTag) || seededMusicGenreTag(`${event.title || ""} ${event.venue || ""} ${event.desc || ""}`);
    const fallback = seededConcertFallbackTags(`${event.title || ""} ${event.venue || ""}`).filter(() => clean.length + inferred.length < 2);
    return [genre, ...clean.filter(tag => tag.toLowerCase() !== genre.toLowerCase()), ...inferred.filter(tag => tag.toLowerCase() !== genre.toLowerCase()), ...fallback]
      .filter((tag, index, all) => tag && all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index)
      .slice(0, Math.max(3, clean.length + inferred.length + fallback.length + 1));
  }
  if (String(event.cat || "").toLowerCase() !== "performing-arts") return tags;
  const text = `${event.title || ""} ${event.venue || ""} ${event.desc || ""} ${event.tag || ""} ${raw.join(" ")}`.toLowerCase();
  const inferred = [];
  const add = (label, pattern) => { if (pattern.test(text) && !inferred.includes(label)) inferred.push(label); };
  add("Comedy", /comedy|stand[- ]?up|improv|comic|open mic/);
  add("Broadway", /broadway|moulin rouge|suffs|lion king|wicked|hamilton/);
  add("Play", /\b(play|drama)\b|othello|hamlet|macbeth/);
  add("Musical", /musical|moulin rouge|suffs|wicked|hamilton|lion king/);
  add("Opera", /\bopera\b(?! house)/);
  add("Touring Production", /touring|\btour\b/);
  add("Family Friendly", /family|kids|children|bluey|disney/);
  add("Dance", /dance|ballet|choreo/);
  add("Film", /film|cinema|screening|movie/);
  add("Gallery", /gallery|exhibit|exhibition|installation|visual art/);
  add("Classical", /symphony|orchestra|classical|chamber music/);
  add("Cabaret", /cabaret/);
  add("Drag", /\bdrag\b|drag queen|drag brunch/);
  add("Magic", /magic|illusionist/);
  add("Storytelling", /storytelling|story slam|moth/);
  add("Spoken Word", /spoken word|poetry/);
  const clean = tags.filter(tag => !["arts", "art", "performing-arts", "performing arts", "museum", "museums", "smithsonian", "performance", "theater", "theatre", "stage show", "touring show", "family show", "live show", "ticketed", "opera"].includes(tag.toLowerCase()));
  const fallback = seededPerformingArtsFallbackTags(`${event.title || ""} ${event.venue || ""}`).filter(tag => clean.length + inferred.length < 2 || inferred.length < 2);
  return [...clean, ...inferred, ...fallback]
    .filter((tag, index, all) => tag && all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, Math.max(3, clean.length + inferred.length + fallback.length));
}

function eventTagChips(event, limit = 3) {
  return eventTags(event).slice(0, limit).map(tag => `<span class="event-tag">${escapeHtml(tag)}</span>`).join("");
}

function eventPriceLabel(event) {
  const category = String(event.cat || event.category || "").toLowerCase();
  if (["happy-hours", "trivia-nights", "museums"].includes(category)) return "";
  const price = String(event.price || "").trim();
  // Never surface "Price unknown" — show nothing when the price isn't known.
  if (!price || /^price unknown$/i.test(price)) return "";
  return price;
}

function eventDisplayTime(event) {
  // Recurring museum exhibits/programs read as "Ongoing"; true one-off museum
  // events (a single occurrence) keep their actual date/time.
  if (String(event.cat || "").toLowerCase() === "museums" && occurrencesForEvent(event).length > 1) return "Ongoing";
  return event.time;
}

function eventMetaLine(event) {
  return [eventDisplayTime(event), eventPriceLabel(event)].filter(Boolean).join(" / ");
}

function primaryEventTag(event) {
  return eventTags(event)[0] || event.tag || event.cat || "Local event";
}

function eventArtLabel(event) {
  const category = String(event.cat || event.category || "").toLowerCase();
  const labels = {
    music: "Concert",
    concerts: "Concert",
    "live-music": "Live music",
    art: "Arts",
    "performing-arts": "Arts",
    museums: "Museums",
    theatre: "Arts",
    theater: "Arts",
    sports: "Sports",
    fitness: "Fitness",
    food: "Food",
    festivals: "Festival",
    community: "Community",
    expos: "Expo",
    nightlife: "Night out",
    "happy-hours": "Happy hour",
    "trivia-nights": "Trivia night"
  };
  if (labels[category]) return labels[category];
  const tagText = eventTags(event).join(" ").toLowerCase();
  const text = `${event.cat || ""} ${event.category || ""} ${event.tag || ""} ${tagText} ${event.title || ""}`.toLowerCase();
  if (/\b(nightlife|nightclub|club|bar|lounge|rooftop|cocktail|dance party|after dark|late night)\b/.test(text)) return "Night out";
  if (/\b(concert|music|pop|rock|jazz|classical|dj|band|singer|songwriter|vinyl)\b/.test(text)) return "Concert";
  if (/\b(museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history)\b/.test(text)) return "Museums";
  if (/\b(theatre|theater|performing|arts?|gallery|comedy|film|cinema)\b/.test(text)) return "Arts";
  if (/\b(baseball|mlb|nba|nfl|nhl|soccer|sports?|game)\b/.test(text)) return "Sports";
  if (/\b(food|drink|wine|beer|cocktail|restaurant|brunch|market)\b/.test(text)) return "Food";
  if (/\b(festival|fair)\b/.test(text)) return "Festival";
  if (/\b(expo|conference|convention)\b/.test(text)) return "Expo";
  if (/\b(run|yoga|fitness|wellness|pickleball)\b/.test(text)) return "Fitness";
  if (/\b(community|volunteer|neighborhood|meetup)\b/.test(text)) return "Community";
  return "Community";
}

function cleanLocationPart(value) {
  const text = String(value || "").trim();
  if (!text || /^location in description$/i.test(text) || /^undefined|null$/i.test(text)) return "";
  return text;
}

function isGenericLocationName(value) {
  return /^(washington,?\s*dc|dc|district of columbia|wharf|shaw|noma|downtown|national mall|u street|h street|navy yard|penn quarter|georgetown|dupont(?: circle)?|logan circle|adams morgan|capitol hill|columbia heights|petworth|brookland|ivy city|foggy bottom|waterfront|southwest|northeast|northwest|southeast|southwest)$/i.test(String(value || "").trim());
}

function venueFromEventDescription(event) {
  const description = String(event?.desc || "").replace(/&amp;/g, "&").trim();
  if (!description) return "";
  const matches = [...description.matchAll(/\bat\s+([A-Z0-9][A-Za-z0-9&'\u2019.,+\- ]{2,80}?)(?:[.!?]|$)/g)];
  for (const match of matches.reverse()) {
    const candidate = cleanLocationPart(match[1].replace(/\s+/g, " ").replace(/[,.;:]+$/g, ""));
    if (candidate && !isGenericLocationName(candidate) && !/^(the )?(source|event|show|door|venue)$/i.test(candidate)) return candidate;
  }
  return "";
}

function eventLocationLine(event) {
  const venue = cleanLocationPart(event.venue);
  const area = cleanLocationPart(event.area);
  const describedVenue = venueFromEventDescription(event);
  const displayVenue = (!venue || venue.toLowerCase() === area.toLowerCase() || isGenericLocationName(venue)) && describedVenue ? describedVenue : venue;
  if (displayVenue && area && displayVenue.toLowerCase() !== area.toLowerCase()) return `${displayVenue} / ${area}`;
  return displayVenue || area || "Washington, DC";
}

function eventNeighborhoodLine(event) {
  return [event.area, event.neighborhood, event.venue_address, event.address, eventLocationLine(event)]
    .map(value => cleanLocationPart(value))
    .filter(Boolean)
    .filter((value, index, all) => all.findIndex(item => item.toLowerCase() === value.toLowerCase()) === index)
    .join(" ");
}

const DISCOVER_CITY_SECTIONS = [
  "National Mall",
  "Downtown",
  "Dupont",
  "U Street / Shaw Area",
  "Adams Morgan",
  "Georgetown",
  "Capitol Hill / H Street Area",
  "NoMa / Union Market Area",
  "Navy Yard",
  "Wharf",
  "Upper Northwest",
  "Anacostia / Southeast"
];

const CITY_SECTION_PATTERNS = [
  ["National Mall", /\bnational mall|federal triangle|smithsonian|hirshhorn|renwick|national gallery|portrait gallery|saam|american art museum|air and space|natural history|american history|african american history|american indian|botanic garden|constitution ave|madison dr|jefferson dr|independence ave|l'enfant plaza|the mall\b/i],
  ["Downtown", /\bdowntown|penn quarter|chinatown|gallery place|metro center|citycenter|city center|mount vernon square|mount vernon triangle|convention center|franklin park|white house|farragut|mcpherson|judiciary square|anthem row|national theatre|warner theatre|hard rock cafe|mlk library|sixth\s*&\s*i|e street|g st nw|k street|i street nw|new york ave nw/i],
  ["Dupont", /\bdupont|dupont circle|logan circle|14th street|14th st|thomas circle|scott circle|admiral|number nine|fireplace|st\.? arnold|bier baron|dc comedy loft|swingers|kramerbooks|black cat|s street nw|p street nw|q street nw|22nd st nw/i],
  ["U Street / Shaw Area", /\bu street|u st|shaw|cardozo|le droit|ledroit|blagden alley|truxton circle|9:30 club|930 club|the atlantis|howard theatre|howard theater|lincoln theatre|room 808|atlantic plumbing|florida ave nw|7th st nw|9th st nw|v street|v st nw|t street nw|upshur st nw/i],
  ["Adams Morgan", /\badams morgan|columbia heights|mount pleasant|mt pleasant|meridian hill|kalorama|lanier heights|bedrock billiards|town tavern|tryst|roofer'?s union|18th st nw|columbia rd|wonderland ballroom|club timehri/i],
  ["Georgetown", /\bgeorgetown|foggy bottom|west end|kennedy center|watergate|rose park|palisades|macarthur|loughboro|sibley|gw university|george washington university|m street nw|wisconsin ave|k street waterfront|dumbarton|glover park|tenleytown/i],
  ["Capitol Hill / H Street Area", /\bcapitol hill|h street|h st|barracks row|eastern market|lincoln park|atlas performing|miracle theatre|trusty'?s|tune inn|union pub|union station|noma bid|h street corridor|trinidad|benning road|kingman park|stadium-armory|118 park st se/i],
  ["NoMa / Union Market Area", /\bnoma|no ma|union market|ivy city|brookland|edgewood|eckington|bloomingdale|rhode island ave|michigan ave ne|monroe street market|la cosecha|gallaudet|city state|wunder ?garten|red bear|echostage|queens chapel|penn st ne|1st st\.? ne|3rd street ne|m and n streets ne|v st nw/i],
  ["Navy Yard", /\bnavy yard|capitol riverfront|capitol waterfront|nationals park|nats park|yards park|the yards|half street|half st se|potomac avenue se|n st se|water street se|m street se|first street se|dacha|bullpen|atlas brew works navy yard|royal sands|sandlot|takoda navy yard|solace outpost|the brig|tap99|walter'?s/i],
  ["Wharf", /\bwharf|southwest waterfront|sw waterfront|waterfront|district pier|transit pier|pearl street warehouse|union stage|anthem\b|arena stage|maine ave|kirwan|boardwalk bar|farmers market sw|12 stories|officina|tiki tnt|water st sw|wharf st sw/i],
  ["Upper Northwest", /\bupper northwest|cleveland park|woodley park|van ness|tenleytown|friendship heights|chevy chase|cathedral heights|forest hills|petworth|brightwood|park view|takoma|fort reno|fort totten|lamond riggs|lamont riggs|south dakota ave|rock creek park|rock creek park tennis center|politics and prose|crestwood|colorado ave|connecticut ave nw|jackie lee'?s/i],
  ["Anacostia / Southeast", /\banacostia|southeast|se dc|congress heights|bellevue|atlantic street sw|hillcrest|naval yard|good hope|mlk ave|minnesota ave|east capitol|benning|fairlawn|skyland|historic anacostia|oxon run|wheeler road se|mississippi ave se|fort pl se|parkside pl ne|ord st ne|oak drive se|carefirst arena|thearc|kenilworth|simon elementary/i]
];

function eventCitySections(event) {
  const text = eventNeighborhoodLine(event).toLowerCase();
  if (/\b(various dc|rotating (dc|locations|observatories|regional|parks|trails)|multiple locations|across dc)\b/.test(text)) {
    return DISCOVER_CITY_SECTIONS;
  }
  const matches = CITY_SECTION_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);
  return matches.length ? matches : ["Downtown"];
}

function eventNeighborhoodMatches(event, value) {
  if (!value || value === "Any neighborhood") return true;
  const normalized = String(value || "").trim().toLowerCase();
  if (DISCOVER_CITY_SECTIONS.some(section => section.toLowerCase() === normalized)) {
    return eventCitySections(event).some(section => section.toLowerCase() === normalized);
  }
  return eventNeighborhoodLine(event).toLowerCase().includes(normalized);
}

function discoverNeighborhoodOptions() {
  return DISCOVER_CITY_SECTIONS;
}
const CATEGORY_COLORS = {
  concerts: "#00C9A7",
  "live-music": "#00C9A7",
  music: "#00C9A7",
  "happy-hours": "#FF7B54",
  "trivia-nights": "#4DB6AC",
  nightlife: "#7C6BFF",
  "performing-arts": "#B07EDB",
  art: "#B07EDB",
  museums: "#5F9FC3",
  sports: "#F59E0B",
  fitness: "#27AE60",
  festivals: "#FF6B9D",
  food: "#FF7B54",
  community: "#7BC67E",
  expos: "#64748B"
};

const cardShareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/></svg>';
const cardHeartIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 21.5l7.1-7.1 1.7-1.7a5 5 0 0 0 0-7.1Z"/></svg>';

function categoryColor(event) {
  return CATEGORY_COLORS[String(event.cat || event.category || "").toLowerCase()]
    || CATEGORY_COLORS[eventVisualCategory(event)]
    || "var(--accent)";
}

function cardFriendAvatars(event) {
  const friends = interestedFriendsForEvent(event);
  if (!friends.length) return "";
  return `<span class="card-friends">${friends.map(initials => `<span class="card-friend-avatar">${escapeHtml(initials)}</span>`).join("")}</span>`;
}

function eventUrgency(event) {
  if (eventNumericPrice(event) === 0 || /free/i.test(String(event.price || ""))) return { label: "Free", cls: "urgency-free" };
  return null;
}

function eventCardArea(event) {
  const area = cleanLocationPart(event.area || event.neighborhood);
  if (area && !isGenericLocationName(area)) return area;
  const line = cleanLocationPart(eventLocationLine(event));
  return line && !isGenericLocationName(line) ? line : "";
}

function cleanEventImageStyle(image) {
  return `background-image: linear-gradient(to top, rgba(17,24,39,.72) 0%, rgba(17,24,39,.28) 48%, rgba(255,255,255,.12) 100%), ${image}; background-size: cover, contain; background-repeat: no-repeat, no-repeat; background-position: center, center; background-color: #f7fafc;`;
}

function cleanEventThumbStyle(image) {
  return `background-image: ${image}; background-size: contain; background-repeat: no-repeat; background-position: center; background-color: #f7fafc;`;
}

function eventRow(event, variant = "", opts = {}) {
  const showBadge = opts.showBadge !== false;
  const area = eventCardArea(event);
  const accent = categoryColor(event);
  const tags = eventTags(event);
  const urgency = eventUrgency(event);
  const urgencyHtml = urgency ? `<span class="event-card-urgency ${urgency.cls}">${escapeHtml(urgency.label)}</span>` : "";
  return `<article class="event-card${event.image ? " has-image" : ""}" data-event-card data-search-text="${`${event.title} ${event.venue} ${event.area} ${event.cat} ${tags.join(" ")}`.toLowerCase()}">
    <span class="event-card-media cat-${eventVisualCategory(event)}">
      <img class="event-card-img" src="${eventCardImageSrc(event)}" alt="" loading="lazy">
      <button class="event-card-hit" data-event="${event.id}" aria-label="Open ${escapeHtml(event.title)}"></button>
      <span class="event-card-actions">
        <button class="card-icon-btn card-share" data-share="${event.id}" aria-label="Share ${escapeHtml(event.title)}">${cardShareIcon}</button>
        <button class="card-icon-btn card-save${state.saved.has(event.id) ? " is-saved" : ""}" data-save="${event.id}" aria-label="Save ${escapeHtml(event.title)}">${cardHeartIcon}</button>
      </span>
    </span>
    <button class="event-card-body" data-event="${event.id}" aria-label="Open ${escapeHtml(event.title)}">
      ${opts.reason ? `<span class="event-card-reason">${escapeHtml(opts.reason)}</span>` : ""}
      <span class="event-card-toprow">${showBadge ? `<span class="event-card-cat" style="color:${accent}">${escapeHtml(eventArtLabel(event))}</span>` : ""}<span class="event-card-meta">${eventMetaLine(event)}</span></span>
      <h3 class="event-card-title">${escapeHtml(event.title)}</h3>
      ${area ? `<span class="event-card-loc">${escapeHtml(area)}</span>` : ""}
      <span class="event-card-tagrow">${cardFriendAvatars(event)}<span class="event-card-tags">${eventTagChips(event, 2)}</span>${urgencyHtml}</span>
    </button>
  </article>`;
}

function eventThumbStyle(event) {
  const image = eventArtImage(event);
  return event.image ? cleanEventThumbStyle(image) : `background-image: linear-gradient(160deg, rgba(0,0,0,.05), rgba(0,0,0,.32)), ${image};`;
}

// Compact horizontal list row used below the hero in the hero-then-list feeds.
// Urgency only renders when meaningfully scarce (<=10 spots); otherwise a price
// badge shows the ticket cost at a glance for paid events.
function eventListSideBadge(event) {
  const urgency = eventUrgency(event);
  if (urgency) return `<span class="elr-badge ${urgency.cls}">${escapeHtml(urgency.label)}</span>`;
  const price = eventPriceLabel(event);
  if (price) return `<span class="elr-badge elr-price">${escapeHtml(price)}</span>`;
  return "";
}

function eventListRow(event, opts = {}) {
  const tags = eventTags(event);
  const meta = [event.time, eventLocationLine(event)].filter(Boolean).join(" · ");
  return `<article class="event-list-row${opts.isFirst ? " is-first" : ""}${opts.isLast ? " is-last" : ""}" data-event-card data-search-text="${`${event.title} ${event.venue} ${event.area} ${event.cat} ${tags.join(" ")}`.toLowerCase()}">
    <button class="event-list-hit" data-event="${event.id}" aria-label="Open ${escapeHtml(event.title)}"></button>
    <span class="elr-thumb" style="${eventThumbStyle(event)}"></span>
    <span class="elr-copy">
      <b class="elr-venue">${escapeHtml(event.title)}</b>
      <span class="elr-meta">${escapeHtml(meta)}</span>
      <span class="elr-tags">${eventTagChips(event, 2)}</span>
    </span>
    <span class="elr-side">
      <button class="elr-save card-save${state.saved.has(event.id) ? " is-saved" : ""}" data-save="${event.id}" aria-label="Save ${escapeHtml(event.title)}">${cardHeartIcon}</button>
      ${eventListSideBadge(event)}
    </span>
  </article>`;
}

function eventDedupeKey(event) {
  return `${String(event.title || "").trim().toLowerCase().replace(/\s+/g, " ")}|${venueImageKeyName(event.venue || eventLocationLine(event))}`;
}

// Feed-only dedupe: collapse repeated title+venue occurrences to a single card.
// Assumes `list` is already sorted ascending by start, so the first match kept
// is the next upcoming occurrence.
function dedupeFeedEvents(list) {
  const seen = new Set();
  return list.filter(event => {
    const key = eventDedupeKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// All occurrences of the same title+venue across the loaded event set, sorted
// by start. Used by the detail modal so the full recurring schedule stays
// visible even though the feed only shows one card.
function occurrencesForEvent(event) {
  const key = eventDedupeKey(event);
  return events
    .filter(item => eventDedupeKey(item) === key)
    .sort(sortEventsByStart);
}

// --- Recurring-event detection (drives the "add to calendar weekly" button) ---
const ICS_WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const ICS_CODE_LABEL = { SU: "Sunday", MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday" };
const RECUR_DAY_WORDS = { sunday: "SU", monday: "MO", tuesday: "TU", wednesday: "WE", thursday: "TH", friday: "FR", saturday: "SA" };
const RECUR_ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, last: -1 };
const RECUR_ORDINAL_LABEL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", "-1": "last" };

function weekdayCodeFromDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ""))) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : ICS_WEEKDAY_CODES[date.getDay()];
}

function weeklyRecurrenceLabel(codes) {
  const names = codes.map(code => ICS_CODE_LABEL[code]);
  return names.length === 1 ? `every ${names[0]}` : `every ${names.join(" & ")}`;
}

// Infer cadence from the gap between a series' occurrences (e.g. the wharf
// "Grooves in the Grove" rows or "Music in the Circle" every Saturday).
function inferRecurrenceFromOccurrences(event) {
  const times = occurrencesForEvent(event)
    .map(item => (/^\d{4}-\d{2}-\d{2}$/.test(String(item.startDate || "")) ? new Date(`${item.startDate}T00:00:00`).getTime() : NaN))
    .filter(value => !Number.isNaN(value))
    .sort((a, b) => a - b);
  if (times.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < times.length; i++) gaps.push(Math.round((times[i] - times[i - 1]) / 86400000));
  const typical = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  const code = weekdayCodeFromDate(event.startDate);
  if (!code) return null;
  if (typical === 7) return { freq: "WEEKLY", interval: 1, byday: [code], label: `every ${ICS_CODE_LABEL[code]}` };
  if (typical === 14) return { freq: "WEEKLY", interval: 2, byday: [code], label: `every other ${ICS_CODE_LABEL[code]}` };
  if (typical >= 28 && typical <= 31) return { freq: "MONTHLY", interval: 1, byday: [code], label: `monthly on ${ICS_CODE_LABEL[code]}` };
  return null;
}

// Returns a recurrence rule { freq, interval, byday[], label } or null for one-offs.
function eventRecurrence(event) {
  if (!event) return null;
  const text = `${event.title || ""} ${event.desc || ""}`.toLowerCase();
  // Monthly by position: "first friday", "every second saturday", "third tuesday".
  const monthly = text.match(/\b(first|second|third|fourth|fifth|last)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (monthly) {
    const ordinal = RECUR_ORDINALS[monthly[1]];
    const code = RECUR_DAY_WORDS[monthly[2]];
    if (ordinal && code) return { freq: "MONTHLY", interval: 1, byday: [`${ordinal}${code}`], label: `every ${RECUR_ORDINAL_LABEL[ordinal]} ${ICS_CODE_LABEL[code]}` };
  }
  // Explicit weekly cadence: "weekly", "every week", "every tuesday", "fridays".
  const weeklySignal = /\b(weekly|every week|each week|recurring)\b/.test(text)
    || /\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.test(text)
    || /\b(sundays|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays)\b/.test(text);
  if (weeklySignal) {
    const codes = [];
    Object.entries(RECUR_DAY_WORDS).forEach(([word, code]) => {
      if (new RegExp(`\\b${word}s?\\b`).test(text) && !codes.includes(code)) codes.push(code);
    });
    if (!codes.length) { const code = weekdayCodeFromDate(event.startDate); if (code) codes.push(code); }
    if (codes.length) {
      codes.sort((a, b) => ICS_WEEKDAY_CODES.indexOf(a) - ICS_WEEKDAY_CODES.indexOf(b));
      return { freq: "WEEKLY", interval: 1, byday: codes, label: weeklyRecurrenceLabel(codes) };
    }
  }
  // Inherently recurring categories repeat weekly on their own weekday.
  if (["happy-hours", "trivia-nights", "farmers-markets"].includes(String(event.cat || "").toLowerCase())) {
    const code = weekdayCodeFromDate(event.startDate);
    if (code) return { freq: "WEEKLY", interval: 1, byday: [code], label: `every ${ICS_CODE_LABEL[code]}` };
  }
  return inferRecurrenceFromOccurrences(event);
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
  if (event.startSort === Number.POSITIVE_INFINITY) return Number.MAX_SAFE_INTEGER;
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
  const range = String(value).match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  if (range) {
    const start = new Date(`${range[1]}T00:00:00`);
    const end = new Date(`${range[2]}T23:59:59`);
    return eventDate >= start && eventDate <= end;
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
  const custom = String(value).match(/^custom:(\d{1,2}):\d{2}-(\d{1,2}):\d{2}$/);
  if (custom) {
    const startHour = Number(custom[1]);
    const endHour = Number(custom[2]);
    return startHour <= endHour ? (hour >= startHour && hour <= endHour) : (hour >= startHour || hour <= endHour);
  }
  return true;
}


function isMuseumDisplayEvent(event) {
  if (String(event.cat || "").toLowerCase() !== "museums") return true;
  // Show any museum event that has a concrete date/time; only hide the ones with
  // no real schedule ("time varies" / "date to be announced").
  if (/time varies|date to be announced/.test(String(event.time || "").toLowerCase())) return false;
  return Boolean(event.startDate) || Number.isFinite(event.startSort) || eventStartHour(event) !== null;
}
function matchesFilter(event, filter, applyDiscoverFilters = true) {
  if (!isMuseumDisplayEvent(event)) return false;
  const priceValue = eventNumericPrice(event);
  if (state.age < 21 && ["nightlife", "happy-hours"].includes(event.cat)) return false;
  if (applyDiscoverFilters && state.highlightedOnly && !isHighlighted(event)) return false;
  if (applyDiscoverFilters && state.filter.category && state.filter.category !== "All categories" && event.cat !== state.filter.category) return false;
  if (applyDiscoverFilters && !eventNeighborhoodMatches(event, state.filter.neighborhood)) return false;
  if (applyDiscoverFilters && !matchesDateFilter(event, state.filter.date)) return false;
  if (applyDiscoverFilters && !matchesTimeFilter(event, state.filter.time)) return false;
  if (applyDiscoverFilters && state.filter.price === "Free" && event.price !== "Free") return false;
  if (applyDiscoverFilters && state.filter.price === "Under $20" && (priceValue === null || priceValue >= 20)) return false;
  if (applyDiscoverFilters && state.filter.price === "Under $50" && (priceValue === null || priceValue >= 50)) return false;
  // Museums are numerous and noisy in a mixed feed — only show them under the
  // Museums tab, not under "All".
  if (filter === "all" || filter === "for-you") return event.cat !== "museums";
  if (filter === "neighborhoods") return event.cat !== "museums";
  if (filter === "weekend") return !event.time.startsWith("Tonight");
  if (filter === "tonight") return event.time.startsWith("Tonight");
  if (filter === "free") return event.price === "Free";
  // Food & drink is tag-aware: anything tagged/described with food or drink shows
  // here, so a food-tagged happy hour appears under Food & drink too.
  if (filter === "food") return /\b(food|drink|dining|restaurant|tasting|brunch|wine|beer|cocktail|happy hour|food deals?)\b/.test(`${event.cat} ${eventTags(event).join(" ")} ${event.title} ${event.desc || ""}`.toLowerCase());
  return event.cat === filter;
}

function discoverFilterItems() {
  return [["all", "All"], ["concerts", "Concerts"], ["live-music", "Live music"], ["happy-hours", "Happy hours"], ["trivia-nights", "Trivia Nights"], ["food", "Food & drink"], ["nightlife", "Nightlife"], ["performing-arts", "Performing arts"], ["museums", "Museums"], ["sports", "Sports"], ["festivals", "Festivals"], ["community", "Community"], ["expos", "Expos"], ["free", "Free"]];
}

function filterChips(active, scope) {
  const items = scope === "home"
    ? discoverFilterItems()
    : [["all", "All"], ["concerts", "Concerts"], ["live-music", "Live music"], ["happy-hours", "Happy hours"], ["trivia-nights", "Trivia Nights"], ["nightlife", "Nightlife"], ["performing-arts", "Arts"], ["museums", "Museums"], ["sports", "Sports"], ["festivals", "Festivals"], ["community", "Community"], ["expos", "Expos"]];
  return items.map(([value, label]) => `<button class="${scope === "home" ? "chip" : "filter-chip"} ${active === value ? "active" : ""}" data-${scope}-filter="${value}">${label}</button>`).join("");
}
