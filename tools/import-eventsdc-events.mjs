import { writeFile } from "node:fs/promises";

const args = new Map(process.argv.slice(2).map((arg, index, all) => arg.startsWith("--") ? [arg, all[index + 1]] : null).filter(Boolean));
const SOURCE = "eventsdc";
const BASE_URL = "https://eventsdc.com";
const API_URL = `${BASE_URL}/api/events`;
const TIMEZONE = "America/New_York";
const daysAhead = Number(args.get("--days") || 90);
const outputFile = args.get("--sql") || "supabase/sql/import-eventsdc-events.sql";

const venueMap = new Map(Object.entries({
  "2": { name: "Walter E. Washington Convention Center", address: "801 Allen Y. Lew Place NW, Washington, DC 20001", neighborhood: "Mount Vernon Square", type: "Convention Center" },
  "11": { name: "Carnegie Library at Mt. Vernon Square", address: "801 K St NW, Washington, DC 20001", neighborhood: "Mount Vernon Square", type: "Historic Venue" },
  "12": { name: "RFK Stadium", address: "2400 East Capitol St SE, Washington, DC 20003", neighborhood: "Capitol Hill", type: "Stadium" },
  "13": { name: "The Fields at RFK Campus", address: "401 Oklahoma Ave NE, Washington, DC 20002", neighborhood: "Capitol Hill", type: "Sports Field" },
  "14": { name: "Festival Grounds at RFK Campus", address: "2400 East Capitol St SE, Washington, DC 20003", neighborhood: "Capitol Hill", type: "Festival Grounds" },
  "15": { name: "Skate Park at RFK Campus", address: "2400 East Capitol St SE, Washington, DC 20003", neighborhood: "Capitol Hill", type: "Skate Park" },
  "16": { name: "DC Armory", address: "2001 East Capitol St SE, Washington, DC 20003", neighborhood: "Capitol Hill", type: "Arena" },
  "17": { name: "Nationals Park", address: "1500 S Capitol St SE, Washington, DC 20003", neighborhood: "Navy Yard", type: "Stadium" },
  "18": { name: "CareFirst Arena", address: "1100 Oak Dr SE, Washington, DC 20032", neighborhood: "Congress Heights", type: "Arena" },
  "19": { name: "Gateway DC", address: "2700 Martin Luther King Jr Ave SE, Washington, DC 20032", neighborhood: "Congress Heights", type: "Outdoor Venue" },
  "20": { name: "R.I.S.E. Demonstration Center", address: "2730 Martin Luther King Jr Ave SE, Washington, DC 20032", neighborhood: "Congress Heights", type: "Community Venue" },
  "289": { name: "GATHER by Events DC", address: "801 Allen Y. Lew Place NW, Washington, DC 20001", neighborhood: "Mount Vernon Square", type: "Event Space" }
}));

const eventTypeMap = new Map(Object.entries({
  "5": "Conventions & Meetings",
  "6": "Cultural Programs",
  "7": "Sports & Entertainment",
  "28": "Sports",
  "29": "Entertainment"
}));

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

function stripTags(value = "") {
  return decodeHtml(String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " "));
}

function absoluteUrl(value = "") {
  if (!value) return "";
  return new URL(decodeHtml(value), BASE_URL).toString();
}

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "LokalDC/1.0 EventsDC event import" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, attempt * 700));
    }
  }
  throw new Error(`Could not fetch ${url}: ${lastError?.message || lastError}`);
}

function dcOffsetIso(date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, timeZoneName: "shortOffset" }).formatToParts(date);
  const offset = parts.find(part => part.type === "timeZoneName")?.value || "GMT-4";
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "-04:00";
  return `${match[1]}${String(match[2]).padStart(2, "0")}:${match[3] || "00"}`;
}

function localIsoFromApi(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?/);
  if (!match) return "";
  const localDate = new Date(`${match[1]}T${match[2]}:00`);
  return `${match[1]}T${match[2]}:00${dcOffsetIso(localDate)}`;
}

function localDate(value) {
  return String(value || "").slice(0, 10);
}

function localTimeLabel(value) {
  const match = String(value || "").match(/T(\d{2}):(\d{2})/);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function extractFirst(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function extractHrefByText(html, labels) {
  const links = [...html.matchAll(/<a\b([^>]*href=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi)];
  for (const link of links) {
    const href = decodeHtml(link[2]);
    const text = stripTags(link[3]).toLowerCase();
    if (labels.some(label => text.includes(label))) return absoluteUrl(href);
  }
  return "";
}

function extractDescription(html) {
  const field = html.match(/<div class="field field--name-field-description[\s\S]*?field__item">([\s\S]*?)<\/div>\s*(?:<\/div>|<div class="field)/i)?.[1];
  const meta = html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1] || html.match(/<meta name="twitter:description" content="([^"]+)"/i)?.[1];
  return stripTags(field || meta || "");
}

function extractCanonical(html, nid) {
  return html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] || `${BASE_URL}/node/${nid}`;
}

function extractDetailImage(html, fallback = "") {
  const og = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || html.match(/<meta name="twitter:image" content="([^"]+)"/i)?.[1];
  return absoluteUrl(og || fallback);
}

function categoryFor(row, eventTypeName) {
  const text = `${row.title || ""} ${eventTypeName || ""}`.toLowerCase();
  if (/mystics|sports|basketball|soccer|football|baseball|criterium|bike|cycling|arena/.test(text)) return "sports";
  if (/wellness|workshop|food drive|community|back-to-school|farmers|flea/.test(text)) return "community";
  if (/cultural|culture|pan-african|arts/.test(text)) return "culture";
  if (/concert|music|performance|entertainment|festival/.test(text)) return "live-music";
  if (/convention|conference|expo|meeting|luncheon|summit/.test(text)) return "expos";
  return "community";
}

function tagsFor(row, category, eventTypeName, venue) {
  const text = `${row.title || ""} ${eventTypeName || ""} ${venue?.name || ""}`.toLowerCase();
  const tags = [];
  const add = value => {
    if (!value) return;
    if (String(value).toLowerCase() === category.toLowerCase()) return;
    if (!tags.some(tag => tag.toLowerCase() === String(value).toLowerCase())) tags.push(value);
  };
  if (/mystics/.test(text)) { add("WNBA"); add("Basketball"); }
  if (/soccer|spirit|dc united/.test(text)) { add("Soccer"); }
  if (/criterium|cycling|bike/.test(text)) { add("Cycling"); add("Race"); }
  if (/farmers|flea/.test(text)) { add("Market"); add("Local vendors"); }
  if (/food drive/.test(text)) { add("Food drive"); add("Veterans"); }
  if (/wellness|mental/.test(text)) { add("Wellness"); add("Workshop"); }
  if (category === "expos" && /conference|convention|expo|summit/.test(text)) { add("Conference"); add("Expo"); }
  if (/business|leadership|luncheon/.test(text)) { add("Business"); add("Networking"); }
  if (/pan-african|cultural|culture/.test(text)) { add("Culture"); add("Wellness"); }
  if (category === "expos" && eventTypeName && !/sports|entertainment/i.test(eventTypeName)) add(eventTypeName.replace("Conventions & Meetings", "Convention"));
  if (/hazardous waste|collection|drop off/.test(text)) { add("Collection"); add("City services"); }
  if (venue?.name?.includes("Convention Center")) add("Convention center");
  if (!tags.length) add(category === "sports" ? "Sports event" : "Local event");
  return tags.slice(0, 4);
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSql(rows) {
  const json = JSON.stringify(rows).replace(/'/g, "''");
  return `-- Events DC import. Generated by tools/import-eventsdc-events.mjs.
-- Safe to re-run: upserts by source + external_id.

insert into public.venues (
  name, address, venue_type, neighborhood, source_name, source_key, website_url, image_url, raw_data, imported_at, created_at, updated_at
)
select
  venue_name,
  venue_address,
  venue_type,
  neighborhood,
  'Events DC',
  'eventsdc:venue:' || lower(regexp_replace(concat_ws('|', venue_name, venue_address), '[^a-z0-9]+', '-', 'g')),
  venue_url,
  nullif(venue_image_url, ''),
  jsonb_build_object('eventsdc_import', true, 'source_url', min_source_url),
  now(), now(), now()
from (
  select
    item->>'venue_name' as venue_name,
    item->>'venue_address' as venue_address,
    max(item->>'venue_type') as venue_type,
    max(item->>'neighborhood') as neighborhood,
    min(item->>'venue_url') as venue_url,
    max(item->>'venue_image_url') as venue_image_url,
    min(item->>'external_url') as min_source_url
  from jsonb_array_elements('${json}'::jsonb) item
  where nullif(item->>'venue_name', '') is not null
    and nullif(item->>'venue_address', '') is not null
  group by item->>'venue_name', item->>'venue_address'
) venue_item
on conflict (name, address) do update
set source_name = coalesce(public.venues.source_name, excluded.source_name),
    source_key = coalesce(public.venues.source_key, excluded.source_key),
    venue_type = excluded.venue_type,
    neighborhood = excluded.neighborhood,
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

async function loadApiRows() {
  const start = new Date();
  const end = new Date(start.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const format = date => {
    const pad = value => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  };
  const params = new URLSearchParams();
  // The Events DC calendar bundle uses these parameter names in this reversed way.
  params.set("field_end_date_value", format(start));
  params.set("field_start_date_value", format(end));
  const json = await fetchText(`${API_URL}?${params.toString()}`);
  return JSON.parse(json);
}

async function normalizeRow(apiRow) {
  const nid = String(apiRow.nid || "").trim();
  if (!nid) return null;
  const detailHtml = await fetchText(`${BASE_URL}/node/${nid}`);
  const eventTypeName = eventTypeMap.get(String(apiRow.field_event_type || "")) || "";
  const venueId = Array.isArray(apiRow.field_venue) ? String(apiRow.field_venue[0] || "") : String(apiRow.field_venue || "");
  const inferredVenueId = venueId || (/rfk|criterium|household hazardous/i.test(apiRow.title || "") ? "12" : "");
  const venue = venueMap.get(inferredVenueId);
  if (!venue) return { excluded: "missing Events DC venue id", title: apiRow.title, nid };
  const description = extractDescription(detailHtml);
  const canonical = extractCanonical(detailHtml, nid);
  const ticketUrl = extractHrefByText(detailHtml, ["buy tickets", "register now", "learn more"]);
  const category = categoryFor(apiRow, eventTypeName);
  const tags = tagsFor(apiRow, category, eventTypeName, venue);
  const startsAt = localIsoFromApi(apiRow.field_start_date);
  const endsAt = localIsoFromApi(apiRow.field_end_date);
  return {
    title: decodeHtml(apiRow.title || ""),
    description,
    category,
    tag: tags[0] || "Events DC",
    tags,
    venue_name: venue.name,
    venue_address: venue.address,
    venue_type: venue.type,
    neighborhood: venue.neighborhood,
    venue_url: `${BASE_URL}/node/${venueId}`,
    venue_image_url: "",
    date: localDate(apiRow.field_start_date),
    time: localTimeLabel(apiRow.field_start_date),
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: TIMEZONE,
    price: "",
    price_min: "",
    price_max: "",
    is_free: false,
    source: SOURCE,
    external_id: nid,
    ticket_url: ticketUrl,
    external_url: canonical,
    image_url: extractDetailImage(detailHtml, apiRow.field_image),
    raw_json: { api_row: apiRow, event_type_name: eventTypeName, full_description: description, source_url: canonical },
    status: "published"
  };
}

const apiRows = await loadApiRows();
const included = [];
const excluded = [];
const now = new Date();
for (const apiRow of apiRows) {
  const row = await normalizeRow(apiRow);
  if (!row) continue;
  if (row.excluded) {
    excluded.push(row);
    continue;
  }
  if (!row.starts_at || new Date(row.starts_at) < now) {
    excluded.push({ title: row.title, reason: "past or missing start", external_id: row.external_id });
    continue;
  }
  included.push(row);
}

const unique = [...new Map(included.map(row => [row.external_id, row])).values()];
await writeFile(outputFile, buildSql(unique));
console.log(JSON.stringify({
  apiRows: apiRows.length,
  includedRows: unique.length,
  excludedRows: excluded.length,
  included: unique.map(row => ({ title: row.title, date: row.date, time: row.time, venue: row.venue_name, category: row.category, tags: row.tags, hasDescription: row.description.length > 40, hasTicketUrl: Boolean(row.ticket_url) })),
  excluded
}, null, 2));
