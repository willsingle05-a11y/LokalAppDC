import { writeFile } from "node:fs/promises";

const args = new Map(process.argv.slice(2).map((arg, index, all) => arg.startsWith("--") ? [arg, all[index + 1]] : null).filter(Boolean));
const SOURCE = "edibledc";
const BASE_URL = "https://edibledc.com";
const FEED_URL = args.get("--url") || `${BASE_URL}/events/?ical=1`;
const TIMEZONE = "America/New_York";
const outputFile = args.get("--sql") || "supabase/sql/import-edibledc-events.sql";

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

function icsUnescape(value = "") {
  return decodeHtml(String(value)
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\"))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function fetchText(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "LokalDC/1.0 Edible DC event import" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, attempt * 800));
    }
  }
  throw new Error(`Could not fetch ${url}: ${lastError?.message || lastError}`);
}

function unfoldIcs(text) {
  return String(text || "").replace(/\r?\n[ \t]/g, "");
}

function parseProperty(line) {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramsRaw] = head.split(";");
  const params = {};
  paramsRaw.forEach(part => {
    const [key, ...rest] = part.split("=");
    if (key) params[key.toUpperCase()] = rest.join("=");
  });
  return { name: name.toUpperCase(), params, value };
}

function parseIcsEvents(text) {
  const lines = unfoldIcs(text).split(/\r?\n/);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const prop = parseProperty(line);
    if (!prop) continue;
    if (prop.name === "ATTACH") current.attach = prop.value;
    else current[prop.name.toLowerCase()] = { value: prop.value, params: prop.params };
  }
  return events;
}

function dcOffsetIso(date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, timeZoneName: "shortOffset" }).formatToParts(date);
  const offset = parts.find(part => part.type === "timeZoneName")?.value || "GMT-4";
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "-04:00";
  return `${match[1]}${String(match[2]).padStart(2, "0")}:${match[3] || "00"}`;
}

function parseIcsDate(prop) {
  const value = String(prop?.value || "");
  const isDateOnly = prop?.params?.VALUE === "DATE" || /^\d{8}$/.test(value);
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!match) return {};
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = isDateOnly ? 9 : Number(match[4] || 0);
  const minute = isDateOnly ? 0 : Number(match[5] || 0);
  const utc = match[7] === "Z";
  const dateObj = utc ? new Date(Date.UTC(year, month - 1, day, hour, minute)) : new Date(year, month - 1, day, hour, minute);
  const pad = number => String(number).padStart(2, "0");
  const date = `${year}-${pad(month)}-${pad(day)}`;
  if (isDateOnly) {
    return { date, time: "All day", starts_at: `${date}T09:00:00${dcOffsetIso(dateObj)}` };
  }
  const time = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const starts_at = utc ? dateObj.toISOString() : `${date}T${pad(hour)}:${pad(minute)}:00${dcOffsetIso(dateObj)}`;
  return { date, time, starts_at };
}

function dcProperLocation(location = "", description = "") {
  const text = `${location} ${description}`.toLowerCase();
  if (/virtual|online|zoom|webinar|maryland|,\s*md\b|\bmd\s+\d{5}\b|virginia|,\s*va\b|\bva\s+\d{5}\b|arlington|alexandria|bethesda|silver spring|frederick|parkville|westminster|upperville|fairfax|davidsonville|crownsville|hillsboro|waterford|boyce|fredericksburg|loudoun|timoni?um|takoma park/.test(text)) return false;
  return /washington,\s*(dc|district of columbia)|\bdc\s*,?\s*\d{5}\b|\bdc\b|\b(nw|ne|sw|se)\b|\b(northwest|northeast|southwest|southeast)\b/.test(text);
}

function parseLocation(location = "") {
  const pieces = icsUnescape(location).split(",").map(part => part.trim()).filter(Boolean);
  const venue = pieces[0] || "";
  const address = pieces.slice(1).join(", ");
  return { venue_name: venue, venue_address: address };
}

function neighborhoodFor(location = "") {
  const text = location.toLowerCase();
  if (/rhode island ave|metrobar|edgewood|mess hall|area 2|bryant st|city state/.test(text)) return "NoMa / Union Market Area";
  if (/oak dr|sycamore and oak|congress heights/.test(text)) return "Congress Heights";
  if (/first st se|united states capitol|capitol/.test(text)) return "Capitol Hill";
  if (/21st st nw|lisner|foggy bottom|george washington/.test(text)) return "Foggy Bottom";
  if (/dupont|connecticut ave|new hampshire ave/.test(text)) return "Dupont Circle";
  return "Washington DC";
}

function categoryFor(event) {
  const text = `${event.title} ${event.description} ${event.venue_name}`.toLowerCase();
  if (/spill fest|nightclub|club night|after party|dance party/.test(text)) return "nightlife";
  if (/market|cookout|food|culinary|dinner|wine|foraging|restaurant|table|chef|farm/.test(text)) return "food";
  if (/book|author|auditorium|chef patrick|prose|literary/.test(text)) return "culture";
  if (/dj|music festival|live music|performer|concert|afro-caribbean/.test(text)) return "nightlife";
  if (/walk|outdoor|tour/.test(text)) return "community";
  return "food";
}

function tagsFor(event, category) {
  const text = `${event.title} ${event.description} ${event.venue_name}`.toLowerCase();
  const tags = [];
  const add = value => {
    if (!value) return;
    if (tags.some(tag => tag.toLowerCase() === value.toLowerCase())) return;
    tags.push(value);
  };
  if (/wine|vineyard|sommelier|loire/.test(text)) add("Wine");
  if (/foraging|farm|local food|grow/.test(text)) add("Local food");
  if (/cookout|festival|food vendors|food truck|restaurant week/.test(text)) add("Food festival");
  if (/central table|chef-led|multi-course|prix fixe|farm table/.test(text)) add("Chef dinner");
  if (/\bmarket\b|local vendors|makers|bazaar/.test(text)) add("Market");
  if (/book|author|literary|politics and prose/.test(text)) add("Author talk");
  if (/black femme|community|culture|melanin/.test(text)) add("Community");
  if (/afro-caribbean|indonesia|halal|global/.test(text)) add("International");
  if (/dj|dance party|after party/.test(text)) add("DJ Set");
  if (/live music|performer|music/.test(text)) add("Live entertainment");
  if (/outdoor|walk|capitol|lawn/.test(text)) add("Outdoor");
  if (!tags.length) add(category === "food" ? "Food tasting" : "Local event");
  return tags.slice(0, 4);
}

function extractPrice(description = "") {
  const prices = [...description.matchAll(/\$([0-9]+(?:\.[0-9]{2})?)/g)].map(match => Number(match[1])).filter(Number.isFinite);
  if (!prices.length) return { price: "", price_min: "", price_max: "", is_free: /free admission|free entry|free event|no cover|rsvp free/i.test(description) };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { price: min === max ? `$${min}` : `$${min} - $${max}`, price_min: min, price_max: max, is_free: false };
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSql(rows) {
  const json = JSON.stringify(rows).replace(/'/g, "''");
  return `-- Edible DC import. Generated by tools/import-edibledc-events.mjs.
-- Safe to re-run: upserts by source + external_id.

insert into public.venues (
  name, address, venue_type, neighborhood, source_name, source_key, website_url, image_url, raw_data, imported_at, created_at, updated_at
)
select
  venue_name,
  venue_address,
  venue_type,
  neighborhood,
  'Edible DC',
  'edibledc:venue:' || lower(regexp_replace(concat_ws('|', venue_name, venue_address), '[^a-z0-9]+', '-', 'g')),
  min_source_url,
  nullif(venue_image_url, ''),
  jsonb_build_object('edibledc_import', true, 'source_url', min_source_url),
  now(), now(), now()
from (
  select
    item->>'venue_name' as venue_name,
    item->>'venue_address' as venue_address,
    max(item->>'venue_type') as venue_type,
    max(item->>'neighborhood') as neighborhood,
    min(item->>'external_url') as min_source_url,
    max(item->>'image_url') as venue_image_url
  from jsonb_array_elements('${json}'::jsonb) item
  where nullif(item->>'venue_name', '') is not null
    and nullif(item->>'venue_address', '') is not null
  group by item->>'venue_name', item->>'venue_address'
) venue_item
on conflict (name, address) do update
set source_name = coalesce(public.venues.source_name, excluded.source_name),
    source_key = coalesce(public.venues.source_key, excluded.source_key),
    venue_type = coalesce(nullif(public.venues.venue_type, ''), excluded.venue_type),
    neighborhood = coalesce(nullif(public.venues.neighborhood, ''), excluded.neighborhood),
    website_url = coalesce(nullif(public.venues.website_url, ''), excluded.website_url),
    image_url = coalesce(nullif(public.venues.image_url, ''), excluded.image_url),
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

function normalizeEvent(icsEvent) {
  const title = icsUnescape(icsEvent.summary?.value || "");
  const description = icsUnescape(icsEvent.description?.value || "");
  const location = icsUnescape(icsEvent.location?.value || "");
  const url = String(icsEvent.url?.value || "").trim();
  const { venue_name, venue_address } = parseLocation(location);
  const start = parseIcsDate(icsEvent.dtstart);
  const end = parseIcsDate(icsEvent.dtend);
  const price = extractPrice(description);
  const category = categoryFor({ title, description, venue_name });
  const tags = tagsFor({ title, description, venue_name }, category);
  return {
    title,
    description,
    category,
    tag: tags[0] || "Food",
    tags,
    venue_name,
    venue_address,
    venue_type: category === "food" ? "Food / Culinary Venue" : "Event Venue",
    neighborhood: neighborhoodFor(location),
    date: start.date || "",
    time: start.time || "",
    starts_at: start.starts_at || "",
    ends_at: end.starts_at || "",
    timezone: TIMEZONE,
    ...price,
    source: SOURCE,
    external_id: String(icsEvent.uid?.value || url || title).trim(),
    ticket_url: "",
    external_url: url,
    image_url: String(icsEvent.attach || "").trim(),
    raw_json: { uid: icsEvent.uid?.value || "", location, source_url: url, imported_from: FEED_URL },
    status: "published"
  };
}

const feed = await fetchText(FEED_URL);
const parsed = parseIcsEvents(feed);
const now = new Date();
const included = [];
const excluded = [];

for (const raw of parsed) {
  const row = normalizeEvent(raw);
  if (!row.title || !row.external_id || !row.starts_at) {
    excluded.push({ title: row.title, reason: "missing title, id, or start" });
    continue;
  }
  if (!dcProperLocation(`${row.venue_name} ${row.venue_address}`, row.description)) {
    excluded.push({ title: row.title, reason: "outside DC proper or virtual", location: `${row.venue_name} ${row.venue_address}`.trim() });
    continue;
  }
  if (new Date(row.starts_at) < now) {
    excluded.push({ title: row.title, reason: "past event", starts_at: row.starts_at });
    continue;
  }
  included.push(row);
}

const unique = [...new Map(included.map(row => [row.external_id, row])).values()];
await writeFile(outputFile, buildSql(unique));
console.log(JSON.stringify({
  feedEvents: parsed.length,
  includedRows: unique.length,
  excludedRows: excluded.length,
  included: unique.map(row => ({
    title: row.title,
    date: row.date,
    time: row.time,
    venue: row.venue_name,
    address: row.venue_address,
    category: row.category,
    tags: row.tags,
    url: row.external_url
  })),
  excluded
}, null, 2));
