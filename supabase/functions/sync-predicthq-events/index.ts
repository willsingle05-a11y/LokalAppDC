const PREDICTHQ_API_TOKEN = Deno.env.get("PREDICTHQ_API_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SYNC_SECRET = Deno.env.get("SYNC_SECRET") || "";

const TIMEZONE = Deno.env.get("PHQ_TIMEZONE") || "America/New_York";
const LOOKAHEAD_DAYS = Number(Deno.env.get("PHQ_LOOKAHEAD_DAYS") || "6");
const LIMIT = Number(Deno.env.get("PHQ_LIMIT") || "100");
const CATEGORIES = Deno.env.get("PHQ_CATEGORIES") || "concerts,festivals,performing-arts,sports,community,expos";
const EXCLUDED_CATEGORIES = Deno.env.get("PHQ_EXCLUDED_CATEGORIES") || "academic,school,observances,public-holidays,politics,airport-delays,disasters,weather";
const USE_SCOPE = Deno.env.get("PHQ_USE_SCOPE") === "true";
const PHQ_PLACE_ID = Deno.env.get("PHQ_PLACE_ID") || "";

type PredictHqEvent = Record<string, any>;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function encodeQuery(query: Record<string, string | number | boolean | null | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value) !== "") params.set(key, String(value));
  });
  return params.toString();
}

async function predictHqGet(path: string, query: Record<string, string | number | boolean | null | undefined>) {
  const url = `https://api.predicthq.com/v1/${path}?${encodeQuery(query)}`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${PREDICTHQ_API_TOKEN}`,
      accept: "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PredictHQ ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

async function getDcPlaceId() {
  if (PHQ_PLACE_ID) return PHQ_PLACE_ID;
  const places = await predictHqGet("places/", {
    q: "Washington DC",
    country: "US",
    type: "locality,localadmin",
    limit: 10,
  });
  const match = (places.results || []).find((place: any) =>
    place.name === "Washington" &&
    place.country_alpha2 === "US" &&
    `${place.region || ""} ${place.county || ""}`.includes("District of Columbia")
  ) || places.results?.[0];
  if (!match?.id) throw new Error("Could not find Washington, DC place id.");
  return match.id;
}

function isAddressOnlyVenue(value: string) {
  return /United States of America|Washington, DC 20|Street |Avenue |Road |Northwest|Northeast|Southwest|Southeast|^\d+\s/i.test(value || "");
}

function inferVenueNameFromText(value: string) {
  const text = String(value || "").replace(/^Sourced from [\w.-]+(?:\.com)?\s*-\s*/i, "");
  const patterns = [
    /\bat\s+([A-Z][A-Za-z0-9&'.\- ]{2,70}?)(?:[.,!|]| for | with | featuring | in Washington| in D\.C\.|$)/,
    /\b@\s*([A-Z][A-Za-z0-9&'.\- ]{2,70}?)(?:[.,!|]|$)/,
    /\|\s*([A-Z0-9][A-Za-z0-9&'.\- ]{2,45}?)\s*(?:\||$)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && !isAddressOnlyVenue(candidate) && !/hosted by|washington d\.?c\.?$/i.test(candidate)) return candidate;
  }
  return "";
}

function entityName(event: PredictHqEvent) {
  const entity = (event.entities || []).find((item: any) =>
    ["venue", "place"].includes(item.type) && item.name && !isAddressOnlyVenue(item.name)
  );
  return entity?.name || inferVenueNameFromText(`${event.title || ""} ${event.description || ""}`) || "Location in description";
}

function eventAddress(event: PredictHqEvent) {
  return event.geo?.address?.formatted_address ||
    (event.entities || []).find((entity: any) => entity.formatted_address)?.formatted_address ||
    "";
}

function category(value: string) {
  return value ? value.toLowerCase() : "community";
}

function labelText(value: any) {
  if (value && typeof value === "object") return value.label || value.name || value.title || value.value || "";
  return value;
}

function titleCaseTag(value: string) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function addTag(tags: string[], value: any) {
  const tag = titleCaseTag(String(labelText(value) || ""));
  if (tag && !tags.some((item) => item.toLowerCase() === tag.toLowerCase())) tags.push(tag);
}

function logicalTags(event: PredictHqEvent, eventCategory: string, venueName: string) {
  const tags: string[] = [];
  const text = `${event.title || ""} ${event.description || ""} ${venueName || ""}`.toLowerCase();
  addTag(tags, eventCategory);
  (event.labels || event.phq_labels || []).slice(0, 6).forEach((label: string) => addTag(tags, label));
  if (eventCategory === "concerts" || /concert|live music|band|dj|jazz|vinyl|songwriter|showcase/.test(text)) addTag(tags, "Live Music");
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

function lokalScore(event: PredictHqEvent, venueName: string, eventCategory: string) {
  let score = 50;
  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();
  if (eventCategory === "concerts") score += 24;
  if (eventCategory === "performing-arts") score += 18;
  if (eventCategory === "sports") score += 16;
  if (eventCategory === "festivals") score += 18;
  if (eventCategory === "expos") score += 4;
  if (event.phq_attendance) score += Math.min(12, Math.floor(Number(event.phq_attendance) / 250));
  if (event.local_rank) score += Math.min(10, Math.floor(Number(event.local_rank) / 10));
  if (isAddressOnlyVenue(venueName)) score -= 12;
  if (/open mic|concert|live|dj|party|film|gallery|workshop|class|festival|market|yoga|dance|sip|trivia|comedy/.test(text)) score += 12;
  if (/conference|summit|forum|clinic|information session|training institute|tax|policy|real estate|estate planning|legal clinic/.test(text)) score -= 28;
  return Math.max(0, Math.min(100, score));
}

function isLokalEvent(event: PredictHqEvent) {
  const venueName = entityName(event);
  const eventCategory = category(event.category);
  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();
  if (eventCategory === "hidden") return false;
  if (venueName === "Location in description") return false;
  if (/conference|summit|forum|clinic|information session|training institute|tax conference|public policy|real estate|estate planning|legal clinic/.test(text)) return false;
  if (isAddressOnlyVenue(venueName) && !/concert|open mic|film|gallery|party|workshop|class|festival|market|yoga|dance|sip|trivia|comedy/.test(text)) return false;
  return true;
}

function eventImageUrl(event: PredictHqEvent) {
  const image = event.images?.[0];
  if (typeof image === "string") return image;
  return image?.url || event.image_url || null;
}

function localTimeText(value: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function convertEvent(event: PredictHqEvent) {
  const venueName = entityName(event);
  const eventCategory = category(event.category);
  const tags = logicalTags(event, eventCategory, venueName);
  const address = eventAddress(event);
  let description = String(event.description || "")
    .replace(/^Sourced from [\w.-]+(?:\.com)?\s*-\s*/i, "")
    .replace(/^Sourced from [\w.-]+(?:\.com)?\.?\s*/i, "")
    .trim();
  if (address && description && !description.includes(address)) description = `${description}\n\nAddress: ${address}`;
  if (address && !description) description = `Address: ${address}`;
  return {
    title: event.title || "Untitled event",
    description: description || null,
    category: eventCategory,
    tag: tags[0] || event.labels?.[0] || event.category || eventCategory,
    tags,
    venue_name: venueName,
    venue: venueName,
    neighborhood: "Washington, DC",
    date: event.start_local?.slice(0, 10) || event.start?.slice(0, 10) || null,
    time: localTimeText(event.start),
    starts_at: event.start || null,
    ends_at: event.end || null,
    timezone: event.timezone || TIMEZONE,
    ticket_url: event.event_url || event.url || null,
    image_url: eventImageUrl(event),
    source: "predicthq",
    external_id: event.id,
    external_url: event.event_url || event.url || null,
    latitude: event.location?.[1] ?? null,
    longitude: event.location?.[0] ?? null,
    lokal_score: lokalScore(event, venueName, eventCategory),
    raw_json: event,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function clearExistingRows() {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/events?source=eq.predicthq`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      prefer: "return=minimal",
    },
  });
  if (!response.ok) throw new Error(`Supabase delete ${response.status}: ${await response.text()}`);
}

async function upsertRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/events?on_conflict=source,external_id`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Supabase upsert ${response.status}: ${await response.text()}`);
}

Deno.serve(async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.debug === true) {
      return json({
        ok: true,
        hasPredictHqToken: Boolean(PREDICTHQ_API_TOKEN),
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
        hasSyncSecret: Boolean(SYNC_SECRET),
        lookaheadDays: LOOKAHEAD_DAYS,
        categories: CATEGORIES,
      });
    }

    if (SYNC_SECRET && request.headers.get("x-sync-secret") !== SYNC_SECRET) {
      return json({ error: "unauthorized" }, 401);
    }
    if (!PREDICTHQ_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Missing PREDICTHQ_API_TOKEN, SUPABASE_URL, or SERVICE_ROLE_KEY." }, 500);
    }

    const placeId = await getDcPlaceId();
    const start = isoDate(new Date());
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + LOOKAHEAD_DAYS);
    const end = isoDate(endDate);
    const allowed = new Set(CATEGORIES.split(",").map((item) => item.trim()).filter(Boolean));
    const excluded = new Set(EXCLUDED_CATEGORIES.split(",").map((item) => item.trim()).filter(Boolean));

    const allEvents: PredictHqEvent[] = [];
    let offset = 0;
    let next = "";
    do {
      const query: Record<string, string | number | boolean> = {
        "active.gte": start,
        "active.lte": end,
        "active.tz": TIMEZONE,
        category: CATEGORIES,
        sort: "start",
        limit: LIMIT,
        offset,
      };
      query[USE_SCOPE ? "place.scope" : "place.exact"] = placeId;
      const data = await predictHqGet("events/", query);
      allEvents.push(...(data.results || []));
      next = data.next || "";
      offset += LIMIT;
    } while (next);

    const rows = allEvents
      .filter((event) => allowed.has(event.category) && !excluded.has(event.category) && isLokalEvent(event))
      .map(convertEvent)
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || Number(b.lokal_score) - Number(a.lokal_score));

    await clearExistingRows();
    await upsertRows(rows);

    return json({
      ok: true,
      fetched: allEvents.length,
      upserted: rows.length,
      placeId,
      start,
      end,
    });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
