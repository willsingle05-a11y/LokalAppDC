import { writeFile } from "node:fs/promises";

const args = new Map(process.argv.slice(2).map((arg, index, all) => arg.startsWith("--") ? [arg, all[index + 1]] : null).filter(Boolean));
const SOURCE = "runguides";
const BASE_URL = "https://www.runguides.com";
const API_BASE_URL = "https://runguides-api-6dce8eac15ab.herokuapp.com";
const FEED_URL = args.get("--url") || `${BASE_URL}/washington-dc/runs/5k/all`;
const TIMEZONE = "America/New_York";
const DEFAULT_START_TIME = args.get("--default-time") || "08:00";
const API_LIMIT = Number(args.get("--limit") || 50);
const MAX_API_PAGES = Number(args.get("--max-pages") || 4);
const outputFile = args.get("--sql") || "supabase/sql/import-runguides-races.sql";

function decodeHtml(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function fetchText(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "LokalDC/1.0 RunGuides race import" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, attempt * 800));
    }
  }
  throw new Error(`Could not fetch ${url}: ${lastError?.message || lastError}`);
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach(item => search.append(key, item));
    else if (value !== undefined && value !== null) search.set(key, value);
  });
  return search.toString();
}

async function fetchLocationData() {
  const data = await fetchJson(`${API_BASE_URL}/api/v1/location_view_search?name=washington-dc`);
  return data?.location_view || null;
}

async function fetchApiRows() {
  const location = await fetchLocationData();
  if (!location?.id || !location.north_east_latitude || !location.south_west_latitude) return [];
  const rows = [];
  for (let page = 0; page < MAX_API_PAGES; page += 1) {
    const offset = page * API_LIMIT;
    const params = queryString({
      current_location_view_id: location.id,
      "geo_boundary[long1]": location.north_east_longitude,
      "geo_boundary[lat2]": location.south_west_latitude,
      "geo_boundary[long2]": location.south_west_longitude,
      "geo_boundary[lat1]": location.north_east_latitude,
      timestamp: Date.now(),
      method: "redis",
      offset,
      limit: API_LIMIT,
      "category_ids[]": "4"
    });
    const data = await fetchJson(`${API_BASE_URL}/events/search?${params}`);
    const pageRows = [...(data?.listings || []), ...(data?.featured_listings || [])];
    rows.push(...pageRows);
    if (pageRows.length < API_LIMIT || data?.results_maxed === false) break;
  }
  return rows;
}

function extractJsonArrayAfterKey(html, key) {
  const marker = `"${key}":`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return [];
  const start = html.indexOf("[", markerIndex + marker.length);
  if (start < 0) return [];
  let depth = 0;
  let inString = false;
  let escaping = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (escaping) {
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start, index + 1));
    }
  }
  return [];
}

function extractStructuredEvents(html) {
  const match = html.match(/<meta\s+name=["']structured-data-events-list["']\s+content="([^"]+)"/i);
  if (!match?.[1]) return [];
  const parsed = JSON.parse(decodeHtml(match[1]));
  return Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [];
}

function parseJsonObjectAt(text, start) {
  let depth = 0;
  let inString = false;
  let escaping = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaping) {
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractEmbeddedEventObjects(html) {
  const rows = [];
  const marker = '{"title":';
  let index = html.indexOf(marker);
  while (index >= 0) {
    const row = parseJsonObjectAt(html, index);
    if (row?.listing_date && row?.listing_city && row?.listing_state && row?.id) rows.push(row);
    index = html.indexOf(marker, index + marker.length);
  }
  return rows;
}

function dcOffsetIso(date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, timeZoneName: "shortOffset" }).formatToParts(date);
  const offset = parts.find(part => part.type === "timeZoneName")?.value || "GMT-4";
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "-04:00";
  return `${match[1]}${String(match[2]).padStart(2, "0")}:${match[3] || "00"}`;
}

function localIso(date, time = DEFAULT_START_TIME) {
  const [hour, minute] = time.split(":").map(Number);
  const dateObj = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${dcOffsetIso(dateObj)}`;
}

function timeLabel(time = DEFAULT_START_TIME) {
  let [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function absoluteUrl(value = "") {
  if (!value) return "";
  return new URL(value, BASE_URL).toString();
}

function isDcProper(row) {
  const city = String(row.listing_city || row.geocoded_city || "").toLowerCase();
  const state = String(row.listing_state || row.geocoded_state || "").toLowerCase();
  return city === "washington" && (state === "district of columbia" || state === "dc");
}

function normalizeDistance(value = "") {
  const text = String(value || "").trim().toLowerCase();
  const labels = {
    "1k": "1K",
    "1mi": "1 mile",
    "2mi": "2 mile",
    "3k": "3K",
    "5k": "5K",
    "8k/5mi": "8K / 5 mile",
    "10k": "10K",
    "10mi": "10 mile",
    "15k": "15K",
    "half-marathon": "Half marathon",
    "marathon": "Marathon",
    "50k": "50K",
    "ultra": "Ultra",
    "fun run": "Fun run",
    "relay": "Relay"
  };
  return labels[text] || decodeHtml(value);
}

function distanceNamesFromText(value = "") {
  const text = String(value || "").toLowerCase();
  const distances = [];
  const add = value => {
    if (!distances.some(item => item.toLowerCase() === value.toLowerCase())) distances.push(value);
  };
  if (/\b1k\b/.test(text)) add("1K");
  if (/\b1\s?mi\b|1 mile/.test(text)) add("1 mile");
  if (/\b2\s?mi\b|2 mile/.test(text)) add("2 mile");
  if (/\b3k\b/.test(text)) add("3K");
  if (/\b5k\b|5 k\b/.test(text)) add("5K");
  if (/\b8k\b|5mi|5 mile/.test(text)) add("8K / 5 mile");
  if (/\b10k\b/.test(text)) add("10K");
  if (/\b10\s?mi\b|10 mile/.test(text)) add("10 mile");
  if (/\b15k\b/.test(text)) add("15K");
  if (/half[- ]marathon/.test(text)) add("Half marathon");
  if (/\bmarathon\b/.test(text) && !/half[- ]marathon/.test(text)) add("Marathon");
  if (/\b50k\b/.test(text)) add("50K");
  if (/\bultra\b/.test(text)) add("Ultra");
  if (/fun run/.test(text)) add("Fun run");
  if (/\brelay\b/.test(text)) add("Relay");
  return distances;
}

function distanceTags(row) {
  const categoryNames = (row.listing_categories || []).map(item => item?.name).filter(Boolean);
  const raw = [...categoryNames, ...(Array.isArray(row.tags) ? row.tags : []), ...distanceNamesFromText(`${row.name || ""} ${row.title || ""} ${row.description || ""}`)];
  if (!raw.some(item => /5k/i.test(String(item)))) raw.push("5k");
  return raw
    .map(normalizeDistance)
    .filter(tag => /(\d|mile|marathon|ultra|relay|fun run)/i.test(tag))
    .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index);
}

function structuredEventToRow(event) {
  const location = event.location || {};
  const address = location.address || {};
  const url = String(event.url || "");
  const id = url.match(/\/event\/(\d+)\//)?.[1] || url;
  const title = decodeHtml(event.name || "");
  const description = decodeHtml(event.description || "");
  const distances = distanceNamesFromText(`${title} ${description}`);
  if (!distances.some(item => item.toLowerCase() === "5k")) distances.push("5K");
  return {
    id,
    name: title,
    title,
    event_date: event.startDate || "",
    listing_date: event.startDate || "",
    listing_city: address.addressLocality || "",
    listing_state: address.addressRegion || "",
    listing_country: address.addressCountry || "",
    geocoded_city: address.addressLocality || "",
    geocoded_state: address.addressRegion || "",
    is_virtual: String(event.eventAttendanceMode || "").toLowerCase().includes("online"),
    covid_virtual: false,
    date_tbd: false,
    website: url,
    event_url: url.replace(BASE_URL, ""),
    onClickUrl: url.replace(BASE_URL, ""),
    flyer: event.image || "",
    flyer_100: event.image || "",
    course_type: description.match(/Course type:\s*([^.]+)/i)?.[1] || "",
    participants: description.match(/Expected participants:\s*([^.]+)/i)?.[1] || "",
    listing_categories: distances.map(name => ({ name })),
    tags: [],
    tagline: description
  };
}

function neighborhoodFor(row) {
  const text = `${row.name || ""} ${row.title || ""} ${row.tagline || ""} ${row.race_info_text || ""}`.toLowerCase();
  if (/anacostia/.test(text)) return "Anacostia";
  if (/kenilworth/.test(text)) return "Anacostia";
  if (/janney/.test(text)) return "Upper Northwest";
  if (/fona|arboretum/.test(text)) return "NoMa / Union Market Area";
  if (/congressional cemetery|dead man/.test(text)) return "Capitol Hill";
  if (/rock '?n'? roll|jingle all the way|national mall|downtown/.test(text)) return "National Mall";
  return "Washington DC";
}

function descriptionFor(row, distances) {
  const sourceDescription = decodeHtml(row.race_info_text || row.tagline || "");
  const parts = [];
  if (sourceDescription && !/^\{Year\}/.test(sourceDescription)) parts.push(sourceDescription);
  parts.push(`Running race listed by RunGuides with ${distances.join(", ") || "running"} distance${distances.length === 1 ? "" : "s"}.`);
  if (row.participants) parts.push(`Race size: ${decodeHtml(row.participants)} participants.`);
  if (row.course_type) parts.push(`Course type: ${decodeHtml(row.course_type)}.`);
  parts.push("RunGuides does not list an exact start time in the calendar feed; confirm race-day timing on the event website.");
  return parts.join(" ");
}

function normalizeRow(row) {
  const distances = distanceTags(row);
  const date = String(row.listing_date || row.event_date || "").slice(0, 10);
  const startsAt = localIso(date);
  const endsAt = localIso(date, "11:00");
  const externalUrl = absoluteUrl(row.website || row.affiliate_link || row.event_url || row.onClickUrl || "");
  const runGuidesUrl = absoluteUrl(row.event_url || "");
  const tags = ["Running", ...distances];
  if (row.course_type) tags.push(decodeHtml(row.course_type));
  if (row.has_kid_run) tags.push("Kids run");
  return {
    title: decodeHtml(row.name || row.title || ""),
    description: descriptionFor(row, distances),
    category: "sports",
    tag: "Running",
    tags: tags.filter((tag, index, all) => tag && all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index).slice(0, 6),
    venue_name: "Washington, DC",
    venue_address: "Washington, DC",
    venue_type: "Running Race",
    neighborhood: neighborhoodFor(row),
    date,
    time: timeLabel(DEFAULT_START_TIME),
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: TIMEZONE,
    price: "",
    price_min: "",
    price_max: "",
    is_free: false,
    source: SOURCE,
    external_id: String(row.id || `${row.name}-${date}`).trim(),
    ticket_url: externalUrl,
    external_url: externalUrl || runGuidesUrl,
    image_url: row.flyer_100 || row.flyer || row.mobile_flyer || "",
    raw_json: { ...row, imported_from: FEED_URL, runguides_url: runGuidesUrl, inferred_time: true, inferred_time_label: timeLabel(DEFAULT_START_TIME) },
    status: "published"
  };
}

function buildSql(rows) {
  const json = JSON.stringify(rows).replace(/'/g, "''");
  return `-- RunGuides race import. Generated by tools/import-runguides-races.mjs.
-- Safe to re-run: upserts by source + external_id.

insert into public.venues (
  name, address, venue_type, neighborhood, source_name, source_key, website_url, image_url, raw_data, imported_at, created_at, updated_at
)
select
  venue_name,
  venue_address,
  venue_type,
  neighborhood,
  'RunGuides',
  'runguides:venue:washington-dc-running',
  '${BASE_URL}/washington-dc/runs',
  null,
  jsonb_build_object('runguides_import', true, 'source_url', '${FEED_URL}'),
  now(), now(), now()
from (
  select
    'Washington, DC' as venue_name,
    'Washington, DC' as venue_address,
    'Running Race' as venue_type,
    'Washington DC' as neighborhood
) venue_item
on conflict (name, address) do update
set source_name = coalesce(public.venues.source_name, excluded.source_name),
    source_key = coalesce(public.venues.source_key, excluded.source_key),
    venue_type = coalesce(nullif(public.venues.venue_type, ''), excluded.venue_type),
    raw_data = public.venues.raw_data || excluded.raw_data,
    updated_at = now();

insert into public.events (
  title, description, category, tag, tags, venue_name, venue, neighborhood, venue_address,
  date, time, starts_at, ends_at, timezone, price, price_min, price_max, is_free,
  source, external_id, ticket_url, external_url, url, image_url, raw_json, status,
  last_seen_at, created_at, updated_at
)
select
  item->>'title',
  item->>'description',
  item->>'category',
  item->>'tag',
  array(select jsonb_array_elements_text(item->'tags')),
  item->>'venue_name',
  item->>'venue_name',
  item->>'neighborhood',
  item->>'venue_address',
  nullif(item->>'date', '')::date,
  nullif(item->>'time', ''),
  nullif(item->>'starts_at', '')::timestamptz,
  nullif(item->>'ends_at', '')::timestamptz,
  item->>'timezone',
  nullif(item->>'price', ''),
  nullif(item->>'price_min', '')::numeric,
  nullif(item->>'price_max', '')::numeric,
  coalesce((item->>'is_free')::boolean, false),
  item->>'source',
  item->>'external_id',
  nullif(item->>'ticket_url', ''),
  item->>'external_url',
  item->>'external_url',
  nullif(item->>'image_url', ''),
  item->'raw_json',
  item->>'status',
  now(), now(), now()
from jsonb_array_elements('${json}'::jsonb) item
on conflict (source, external_id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  tag = excluded.tag,
  tags = excluded.tags,
  venue_name = excluded.venue_name,
  venue = excluded.venue,
  neighborhood = excluded.neighborhood,
  venue_address = excluded.venue_address,
  date = excluded.date,
  time = excluded.time,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  timezone = excluded.timezone,
  price = excluded.price,
  price_min = excluded.price_min,
  price_max = excluded.price_max,
  is_free = excluded.is_free,
  ticket_url = excluded.ticket_url,
  external_url = excluded.external_url,
  url = excluded.url,
  image_url = excluded.image_url,
  raw_json = excluded.raw_json,
  status = excluded.status,
  last_seen_at = now(),
  updated_at = now();
`;
}

let apiRows = [];
let html = "";
try {
  apiRows = await fetchApiRows();
} catch (error) {
  console.warn(`RunGuides API fetch failed, falling back to page HTML: ${error.message}`);
}
try {
  html = await fetchText(FEED_URL);
} catch (error) {
  if (!apiRows.length) throw error;
  console.warn(`RunGuides HTML fallback fetch failed: ${error.message}`);
}
const structuredRows = html ? extractStructuredEvents(html).map(structuredEventToRow) : [];
const embeddedRows = html ? extractEmbeddedEventObjects(html) : [];
const richRows = html ? extractJsonArrayAfterKey(html, "Washington DC-selected-featured") : [];
const richById = new Map(richRows.map(row => [String(row.id || ""), row]));
const parsed = [...apiRows, ...embeddedRows, ...structuredRows, ...richRows]
  .map(row => ({ ...row, ...(richById.get(String(row.id || "")) || {}) }))
  .filter((row, index, all) => all.findIndex(item => String(item.id || item.website || item.name) === String(row.id || row.website || row.name)) === index);
const now = new Date();
const included = [];
const excluded = [];

for (const raw of parsed) {
  if (!isDcProper(raw)) {
    excluded.push({ title: raw.name || raw.title, reason: "outside DC proper", location: `${raw.listing_city || raw.geocoded_city}, ${raw.listing_state || raw.geocoded_state}` });
    continue;
  }
  if (raw.is_virtual || raw.covid_virtual) {
    excluded.push({ title: raw.name || raw.title, reason: "virtual event" });
    continue;
  }
  if (raw.date_tbd || !raw.event_date || !raw.listing_date) {
    excluded.push({ title: raw.name || raw.title, reason: "missing exact date" });
    continue;
  }
  const row = normalizeRow(raw);
  if (!row.title || !row.external_id || !row.starts_at) {
    excluded.push({ title: row.title, reason: "missing title, id, or start" });
    continue;
  }
  if (new Date(row.starts_at) < now) {
    excluded.push({ title: row.title, reason: "past event", starts_at: row.starts_at });
    continue;
  }
  included.push(row);
}

const unique = [...new Map(included.map(row => [row.external_id, row])).values()]
  .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
await writeFile(outputFile, buildSql(unique));
console.log(JSON.stringify({
  sourceUrl: FEED_URL,
  apiRows: apiRows.length,
  parsedRows: parsed.length,
  includedRows: unique.length,
  excludedRows: excluded.length,
  included: unique.map(row => ({
    title: row.title,
    date: row.date,
    time: row.time,
    venue: row.venue_name,
    neighborhood: row.neighborhood,
    category: row.category,
    tags: row.tags,
    url: row.external_url
  })),
  excluded
}, null, 2));
