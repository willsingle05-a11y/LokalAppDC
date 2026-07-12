const SUPABASE_URL = "https://iglzcjtklryapmcpyoam.supabase.co";
const SUPABASE_KEY = "sb_publishable_E4mdzzerAbcMxoVniRJcaQ_NuB98FvH";

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

const GENERIC_LOCATION_RE = /^(washington,?\s*dc|dc|district of columbia|wharf|shaw|noma|downtown|national mall|u street|h street|navy yard|penn quarter|georgetown|dupont(?: circle)?|logan circle|adams morgan|capitol hill|columbia heights|petworth|brookland|ivy city|foggy bottom|waterfront|southwest|northeast|northwest|southeast|southwest)$/i;

function clean(value) {
  const text = String(value || "").trim();
  if (!text || /^location in description$/i.test(text) || /^undefined|null$/i.test(text)) return "";
  return text;
}

function venueFromDescription(description) {
  const text = clean(description).replace(/&amp;/g, "&");
  const matches = [...text.matchAll(/\bat\s+([A-Z0-9][A-Za-z0-9&'\u2019.,+\- ]{2,80}?)(?:[.!?]|$)/g)];
  for (const match of matches.reverse()) {
    const candidate = clean(match[1].replace(/\s+/g, " ").replace(/[,.;:]+$/g, ""));
    if (candidate && !GENERIC_LOCATION_RE.test(candidate) && !/^(the )?(source|event|show|door|venue)$/i.test(candidate)) return candidate;
  }
  return "";
}

function eventLocationLine(row) {
  const venue = clean(row.venue_name || row.venue);
  const area = clean(row.neighborhood);
  const describedVenue = venueFromDescription(row.description);
  const displayVenue = (!venue || venue.toLowerCase() === area.toLowerCase() || GENERIC_LOCATION_RE.test(venue)) && describedVenue ? describedVenue : venue;
  if (displayVenue && area && displayVenue.toLowerCase() !== area.toLowerCase()) return `${displayVenue} / ${area}`;
  return displayVenue || area || "Washington, DC";
}

function supabaseLocationText(row) {
  return [
    row.venue_address,
    row.neighborhood,
    row.venue_name,
    row.venue
  ].map(clean).join(" ").toLowerCase();
}

function isSupabaseEventInDc(row) {
  const text = supabaseLocationText(row);
  const nonDcText = /\b(arlington|alexandria|bethesda|silver spring|national harbor|vienna|fairfax|falls church|rockville|hyattsville|college park|landover|tysons|mclean|reston|gaithersburg|laurel|bowie|annapolis|baltimore|md\b|va\b|virginia|maryland)\b/.test(text);
  const knownDcVenue = /\b(miracle theatre|sixth\s*&\s*i|mlk library|martin luther king jr memorial library|rock creek park tennis center|politics and prose|kennedy center|national theatre|warner theatre|the anthem|union stage|9:30 club|930 club|the atlantis|howard theatre|echostage|capital one arena|nationals park|carefirst arena)\b/.test(text);
  const dcText = knownDcVenue || /washington,\s*(dc|d\.c\.)|washington,\s*district of columbia|district of columbia|\bdc\b|\bd\.c\.\b|\bnw\b|\bne\b|\bsw\b|\bse\b/.test(text);
  if (nonDcText && !dcText) return false;
  if (dcText) return true;
  const lat = Number(row.latitude ?? row.lat);
  const lng = Number(row.longitude ?? row.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return lat >= 38.79 && lat <= 38.995 && lng >= -77.12 && lng <= -76.90;
  return dcText;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDiscoveryWindow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 21);
  date.setHours(23, 59, 59, 999);
  return date;
}

function inDiscoveryWindow(row) {
  const start = startOfToday();
  const end = endOfDiscoveryWindow();
  if (row.date) {
    const date = new Date(`${row.date}T12:00:00`);
    if (!Number.isNaN(date.getTime()) && date >= start && date <= end) return true;
  }
  if (row.starts_at) {
    const date = new Date(row.starts_at);
    if (!Number.isNaN(date.getTime()) && date >= new Date() && date <= end) return true;
  }
  return false;
}

async function fetchEvents() {
  const rows = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const url = new URL("/rest/v1/events", SUPABASE_URL);
    url.search = new URLSearchParams({
      select: "id,title,source,status,category,venue_name,venue,neighborhood,venue_address,date,time,starts_at,description,latitude,longitude,lat,lng",
      status: "eq.published",
      order: "id.asc"
    }).toString();
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${offset}-${offset + 999}`,
        "Range-Unit": "items"
      }
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}: ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

function auditRows(rows) {
  const upcoming = rows.filter(row => isSupabaseEventInDc(row) && inDiscoveryWindow(row));
  const bucketCounts = Object.fromEntries(CITY_SECTION_PATTERNS.map(([name]) => [name, 0]));
  const unmatched = [];
  const weakLocation = [];

  for (const row of upcoming) {
    const locationLine = eventLocationLine(row);
    if (locationLine === "Washington, DC") weakLocation.push({ ...row, locationLine });
    const haystack = [
      row.neighborhood,
      row.venue_address,
      row.venue_name,
      row.venue,
      locationLine
    ].map(clean).join(" ").toLowerCase();
    const sections = /\b(various dc|rotating (dc|locations|observatories|regional|parks|trails)|multiple locations|across dc)\b/.test(haystack)
      ? CITY_SECTION_PATTERNS.map(([name]) => name)
      : CITY_SECTION_PATTERNS.filter(([, pattern]) => pattern.test(haystack)).map(([name]) => name);
    if (!sections.length) {
      unmatched.push({ ...row, locationLine });
      continue;
    }
    sections.forEach(section => { bucketCounts[section] += 1; });
  }

  return { totalPublished: rows.length, upcoming, bucketCounts, unmatched, weakLocation };
}

const rows = await fetchEvents();
const audit = auditRows(rows);
console.log(JSON.stringify({
  totalPublished: audit.totalPublished,
  upcomingPublished: audit.upcoming.length,
  weakLocationLine: audit.weakLocation.length,
  unmatchedBucket: audit.unmatched.length,
  bucketCounts: audit.bucketCounts,
  unmatchedSample: audit.unmatched.slice(0, 80).map(row => ({
    id: row.id,
    title: row.title,
    source: row.source,
    category: row.category,
    venue_name: row.venue_name,
    venue: row.venue,
    neighborhood: row.neighborhood,
    venue_address: row.venue_address,
    locationLine: row.locationLine
  })),
  weakLocationSample: audit.weakLocation.slice(0, 20).map(row => ({
    id: row.id,
    title: row.title,
    source: row.source,
    category: row.category,
    venue_name: row.venue_name,
    venue: row.venue,
    neighborhood: row.neighborhood,
    venue_address: row.venue_address,
    locationLine: row.locationLine
  }))
}, null, 2));
