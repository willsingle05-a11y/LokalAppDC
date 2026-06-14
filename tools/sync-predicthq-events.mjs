const PREDICTHQ_API_TOKEN = process.env.PREDICTHQ_API_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PHQ_PLACE_ID = process.env.PHQ_PLACE_ID;
const TIMEZONE = process.env.PHQ_TIMEZONE || "America/New_York";
const LOOKAHEAD_DAYS = Number(process.env.PHQ_LOOKAHEAD_DAYS || 6);
const LIMIT = Number(process.env.PHQ_LIMIT || 100);
const CATEGORIES = process.env.PHQ_CATEGORIES || "concerts,festivals,performing-arts,sports,community,expos";
const EXCLUDED_CATEGORIES = process.env.PHQ_EXCLUDED_CATEGORIES || "academic,school,observances,public-holidays,politics,airport-delays,disasters,weather";
const USE_SCOPE = process.env.PHQ_USE_SCOPE === "true";

function requireToken() {
  if (!PREDICTHQ_API_TOKEN) {
    throw new Error("Missing PREDICTHQ_API_TOKEN. Add it to your shell environment before running this script.");
  }
}

function formatDateInTimezone(date, timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateWindow() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + LOOKAHEAD_DAYS);
  return {
    start: formatDateInTimezone(start),
    end: formatDateInTimezone(end)
  };
}

async function predictHqGet(path, params) {
  requireToken();
  const url = new URL(`https://api.predicthq.com/v1/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${PREDICTHQ_API_TOKEN}`,
      Accept: "application/json"
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`PredictHQ ${response.status}: ${data.error || data.detail || JSON.stringify(data)}`);
  }
  return data;
}

async function findWashingtonDcPlaceId() {
  if (PHQ_PLACE_ID) return PHQ_PLACE_ID;
  const data = await predictHqGet("places/", {
    q: "Washington DC",
    country: "US",
    type: "locality,localadmin",
    limit: 10
  });
  const match = data.results?.find(place =>
    place.name?.toLowerCase() === "washington" &&
    place.country_alpha2 === "US" &&
    /district of columbia/i.test(place.region || place.county || "")
  ) || data.results?.[0];
  if (!match?.id) throw new Error("Could not find a Washington, DC Place ID from PredictHQ Places API.");
  console.log(`Using PredictHQ place: ${match.name}, ${match.region || match.country} (${match.id})`);
  return match.id;
}

function phqCategoryToLokal(category) {
  return String(category || "community").toLowerCase();
}

function labelText(value) {
  if (value && typeof value === "object") return value.label || value.name || value.title || value.value || "";
  return value;
}

function titleCaseTag(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function addTag(tags, value) {
  const tag = titleCaseTag(labelText(value));
  if (tag && !tags.some(item => item.toLowerCase() === tag.toLowerCase())) tags.push(tag);
}

function logicalTags(event, category, venueName) {
  const tags = [];
  const text = `${event.title || ""} ${event.description || ""} ${venueName || ""}`.toLowerCase();
  addTag(tags, category);
  (event.labels || event.phq_labels || []).slice(0, 6).forEach(label => addTag(tags, label));
  if (category === "concerts" || /concert|live music|band|dj|jazz|vinyl|songwriter|showcase/.test(text)) addTag(tags, "Live Music");
  if (/dj|dance|party|club|nightlife/.test(text)) addTag(tags, "Nightlife");
  if (/comedy|stand up|open mic/.test(text)) addTag(tags, "Comedy");
  if (/film|cinema|screening|movie/.test(text)) addTag(tags, "Film");
  if (/gallery|museum|exhibit|exhibition|art opening/.test(text)) addTag(tags, "Art");
  if (/market|food|tasting|brunch|restaurant|chef|wine|beer|cocktail/.test(text)) addTag(tags, "Food & Drink");
  if (/run|yoga|fitness|bike|pickleball|wellness/.test(text)) addTag(tags, "Fitness");
  if (/nats|nationals|soccer|basketball|football|hockey|game\b|sports/.test(text)) addTag(tags, "Sports");
  if (/family|kids|children/.test(text)) addTag(tags, "Family Friendly");
  if (/free|no cover|complimentary/.test(text)) addTag(tags, "Free");
  if (/workshop|class|learn|lesson/.test(text)) addTag(tags, "Classes");
  if (/community|volunteer|neighborhood|meetup/.test(text)) addTag(tags, "Community");
  const start = event.start ? new Date(event.start) : null;
  if (start && !Number.isNaN(start.getTime())) {
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", hour12: false }).format(start));
    if (hour >= 4 && hour < 12) addTag(tags, "Morning");
    else if (hour >= 12 && hour < 16) addTag(tags, "Afternoon");
    else if (hour >= 16 && hour < 21) addTag(tags, "Evening");
    else addTag(tags, "Late Night");
  }
  return tags.slice(0, 10);
}

function firstEntity(event, type) {
  return event.entities?.find(entity => entity.type === type) || null;
}

function eventUrl(event) {
  return event.event_url || event.url || event.entities?.find(entity => entity.url)?.url || null;
}

function eventAddress(event) {
  return event.geo?.address?.formatted_address || event.entities?.find(entity => entity.formatted_address)?.formatted_address || "";
}

function isAddressOnlyVenue(venueName) {
  if (!venueName) return true;
  return /United States of America|Washington, DC 20|Street |Avenue |Road |Northwest|Northeast|Southwest|Southeast/i.test(venueName);
}

function inferVenueNameFromText(value) {
  const text = String(value || "").replace(/^Sourced from predicthq\.com\s*-\s*/i, "");
  const patterns = [
    /\bat\s+([A-Z][A-Za-z0-9&'’.\- ]{2,70}?)(?:[.,!|]| for | with | featuring | in Washington| in D\.C\.|$)/,
    /\b@\s*([A-Z][A-Za-z0-9&'’.\- ]{2,70}?)(?:[.,!|]|$)/,
    /\|\s*([A-Z0-9][A-Za-z0-9&'’.\- ]{2,45}?)\s*(?:\||$)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && !isAddressOnlyVenue(candidate) && !/hosted by|washington d\.?c\.?$/i.test(candidate)) return candidate;
  }
  return "";
}

function lokalScore(event, venueName, category) {
  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();
  let score = 50;
  if (category === "concerts") score += 24;
  if (category === "performing-arts") score += 18;
  if (event.category === "sports") score += 16;
  if (event.category === "festivals") score += 18;
  if (event.category === "expos") score += 4;
  if (event.phq_attendance) score += Math.min(12, Math.floor(Number(event.phq_attendance) / 250));
  if (event.local_rank) score += Math.min(10, Math.floor(Number(event.local_rank) / 10));
  if (isAddressOnlyVenue(venueName)) score -= 12;
  if (/open mic|concert|live|dj|party|film|gallery|workshop|class|festival|market|yoga|dance|sip|trivia|comedy/.test(text)) score += 12;
  if (/conference|summit|forum|clinic|information session|training institute|tax|policy|real estate|estate planning|legal clinic/.test(text)) score -= 28;
  return Math.max(0, Math.min(100, score));
}

function isLokalEvent(event) {
  const venue = firstEntity(event, "venue") || firstEntity(event, "place");
  const venueName = venue?.name || inferVenueNameFromText(`${event.title || ""} ${event.description || ""}`) || "Location in description";
  const category = phqCategoryToLokal(event.category);
  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();
  if (category === "hidden") return false;
  if (venueName === "Location in description") return false;
  if (/conference|summit|forum|clinic|information session|training institute|tax conference|public policy|real estate|estate planning|legal clinic/.test(text)) return false;
  if (isAddressOnlyVenue(venueName) && !/concert|open mic|film|gallery|party|workshop|class|festival|market|yoga|dance|sip|trivia|comedy/.test(text)) return false;
  return true;
}

function cleanDescription(value) {
  const cleaned = String(value || "")
    .replace(/^Sourced from predicthq\.com\s*-\s*/i, "")
    .replace(/^Sourced from predicthq\.com\.?\s*/i, "")
    .trim();
  return cleaned || null;
}

function descriptionWithAddress(event) {
  const description = cleanDescription(event.description);
  const address = eventAddress(event);
  if (!address) return description;
  if (description && description.includes(address)) return description;
  return `${description || ""}${description ? "\n\n" : ""}Address: ${address}`;
}

function normalizePredictHqEvent(event) {
  const venue = firstEntity(event, "venue") || firstEntity(event, "place");
  const venueName = venue?.name || inferVenueNameFromText(`${event.title || ""} ${event.description || ""}`) || "Location in description";
  const category = phqCategoryToLokal(event.category);
  const tags = logicalTags(event, category, venueName);
  const [longitude, latitude] = Array.isArray(event.location) ? event.location : [null, null];
  const start = event.start ? new Date(event.start) : null;
  const localDate = event.start_local || event.start;
  return {
    title: event.title || "Untitled event",
    description: descriptionWithAddress(event) || event.phq_labels?.join(", ") || null,
    category,
    tag: tags[0] || event.labels?.[0] || event.category || "Local event",
    tags,
    venue_name: venueName,
    venue: venueName,
    neighborhood: "Washington, DC",
    date: localDate ? String(localDate).slice(0, 10) : null,
    time: start && !Number.isNaN(start.getTime())
      ? new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit" }).format(start)
      : null,
    starts_at: event.start || null,
    ends_at: event.end || null,
    timezone: event.timezone || TIMEZONE,
    ticket_url: eventUrl(event),
    source: "predicthq",
    external_id: event.id,
    external_url: eventUrl(event),
    latitude,
    longitude,
    lokal_score: lokalScore(event, venueName, category),
    raw_json: event,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function fetchPredictHqEvents() {
  const placeId = await findWashingtonDcPlaceId();
  const { start, end } = dateWindow();
  console.log(`Fetching PredictHQ events for DC from ${start} to ${end} (${TIMEZONE})`);
  console.log(`PredictHQ categories: ${CATEGORIES}`);
  console.log(`Excluded categories: ${EXCLUDED_CATEGORIES}`);
  console.log(`Location filter: ${USE_SCOPE ? "place.scope" : "place.exact"}=${placeId}`);
  const all = [];
  let offset = 0;
  while (true) {
    const data = await predictHqGet("events/", {
      [USE_SCOPE ? "place.scope" : "place.exact"]: placeId,
      "active.gte": start,
      "active.lte": end,
      "active.tz": TIMEZONE,
      category: CATEGORIES,
      sort: "start",
      limit: LIMIT,
      offset
    });
    all.push(...(data.results || []));
    if (!data.next || !data.results?.length) break;
    offset += LIMIT;
  }
  const allowed = new Set(CATEGORIES.split(",").map(item => item.trim()).filter(Boolean));
  const excluded = new Set(EXCLUDED_CATEGORIES.split(",").map(item => item.trim()).filter(Boolean));
  const filtered = all.filter(event => allowed.has(event.category) && !excluded.has(event.category) && isLokalEvent(event));
  console.log(`Kept ${filtered.length} of ${all.length} PredictHQ rows after Lokal category and quality cleanup.`);
  return filtered.map(normalizePredictHqEvent).sort((a, b) => String(a.date).localeCompare(String(b.date)) || (b.lokal_score - a.lokal_score));
}

async function clearExistingPredictHqEvents() {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/events?source=eq.predicthq`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "User-Agent": "lokal-predicthq-sync/1.0",
      Prefer: "return=minimal"
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase cleanup failed ${response.status}: ${text}`);
  }
  console.log("Cleared existing PredictHQ rows before writing curated rows.");
}

async function upsertSupabaseEvents(rows) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing, so I am printing normalized events instead of writing to Supabase.");
    console.log(JSON.stringify(rows.slice(0, 10), null, 2));
    console.log(`Fetched ${rows.length} PredictHQ event${rows.length === 1 ? "" : "s"}.`);
    return;
  }
  if (!rows.length) {
    console.log("No PredictHQ events found for this window.");
    return;
  }
  await clearExistingPredictHqEvents();
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/events?on_conflict=source,external_id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "lokal-predicthq-sync/1.0",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upsert failed ${response.status}: ${text}`);
  }
  console.log(`Upserted ${rows.length} PredictHQ event${rows.length === 1 ? "" : "s"} into Supabase.`);
}

if (process.argv.includes("--help")) {
  console.log(`Usage:
  PREDICTHQ_API_TOKEN=... node tools/sync-predicthq-events.mjs

Optional env:
  PHQ_PLACE_ID=...                  Use a known PredictHQ DC Place ID instead of looking it up.
  PHQ_LOOKAHEAD_DAYS=6              Pull today through this many days ahead.
  PHQ_TIMEZONE=America/New_York     Timezone for active date filtering.
  SUPABASE_URL=...                  Supabase project URL.
  SUPABASE_SERVICE_ROLE_KEY=...     Service role key for inserting/upserting events.

If Supabase env vars are omitted, the script prints normalized events instead of writing.`);
  process.exit(0);
}

try {
  const rows = await fetchPredictHqEvents();
  await upsertSupabaseEvents(rows);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
