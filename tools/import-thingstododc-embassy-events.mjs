import { writeFile } from "node:fs/promises";

const CATEGORY_URL = "https://thingstododc.com/events/embassy-culture/";
const LOAD_MORE_URL = "https://thingstododc.com/wp-content/themes/thingstodo/load-more.php";
const SOURCE = "thingstododc";
const TIMEZONE = "America/New_York";
const OUTPUT_INDEX = process.argv.indexOf("--sql");
const outputFile = OUTPUT_INDEX >= 0 ? process.argv[OUTPUT_INDEX + 1] : "supabase/sql/import-thingstododc-embassy-events.sql";

function decodeHtml(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&hellip;/g, "...")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(String(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function absoluteUrl(value) {
  return new URL(decodeHtml(value), CATEGORY_URL).toString();
}

async function fetchText(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "User-Agent": "LokalDC/1.0 event import",
          ...(options.headers || {})
        }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, attempt * 900));
    }
  }
  throw new Error(`Could not fetch ${url}: ${lastError?.message || lastError}`);
}

function listingEvents(html) {
  const rows = [];
  const rowPattern = /<div class="w-row event-list-row top">([\s\S]*?)(?=<div class="w-row event-list-row top">|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>|$)/g;
  let match;
  while ((match = rowPattern.exec(html))) {
    const row = match[1];
    const href = row.match(/<a href="([^"]+)"[^>]*>\s*(?:<img|<h3)/i)?.[1] || row.match(/href="([^"]+\/event\/[^"]+)"/i)?.[1];
    const title = row.match(/<h3 class="event-listing-title">([\s\S]*?)<\/h3>/i)?.[1];
    const dateLabel = row.match(/<strong class="event-listing-date">\s*([\s\S]*?)\s*<\/strong>/i)?.[1] || row.match(/<h4 class="event-listing-date">\s*([\s\S]*?)\s*<\/h4>/i)?.[1];
    const image = row.match(/<img class="event-thumb" src="([^"]+)"/i)?.[1];
    const summary = row.match(/<p class="event-location">([\s\S]*?)<\/p>/i)?.[1];
    if (href && title) rows.push({ url: absoluteUrl(href), title: stripTags(title), dateLabel: stripTags(dateLabel || ""), image_url: image ? absoluteUrl(image) : "", summary: stripTags(summary || "") });
  }
  return rows;
}

async function loadListingRows() {
  const html = await fetchText(CATEGORY_URL);
  const initial = listingEvents(html);
  const moreText = await fetchText(LOAD_MORE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "count=11&termID=44&action=moreCat"
  }).catch(() => "");
  let more = [];
  if (moreText) {
    try {
      const payload = JSON.parse(moreText);
      more = listingEvents(payload.message || "");
    } catch {}
  }
  return [...new Map([...initial, ...more].map(row => [row.url, row])).values()];
}

function parseListingDate(label) {
  const match = String(label || "").match(/^(?:[A-Za-z]{3},\s*)?([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (!match) return {};
  const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const month = months[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const period = match[6].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  const pad = value => String(value).padStart(2, "0");
  const date = `${year}-${pad(month)}-${pad(day)}`;
  return {
    date,
    time: new Date(year, month - 1, day, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    starts_at: `${date}T${pad(hour)}:${pad(minute)}:00-04:00`
  };
}

function parseDetailDate(text) {
  const match = String(text || "").match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+@\s+(\d{1,2}):(\d{2})(AM|PM)/i);
  if (!match) return {};
  const months = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
  const month = months[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const period = match[6].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  const pad = value => String(value).padStart(2, "0");
  const date = `${year}-${pad(month)}-${pad(day)}`;
  return {
    date,
    time: new Date(year, month - 1, day, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    starts_at: `${date}T${pad(hour)}:${pad(minute)}:00-04:00`
  };
}

function extractFirst(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function extractImage(html, fallback = "") {
  const slide = html.match(/inner-event-slider[\s\S]*?<img src="([^"]+)"/i)?.[1];
  const og = html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] || html.match(/content="([^"]+)"\s+property="og:image"/i)?.[1];
  return slide ? absoluteUrl(slide) : og ? absoluteUrl(og) : fallback;
}

function extractCalendarLocation(html) {
  const href = html.match(/ical\.php\?[^"]*location=([^"&]*)/i)?.[1];
  if (!href) return {};
  const decoded = decodeURIComponent(decodeHtml(href).replace(/\+/g, " ")).replace(/\s+/g, " ").trim();
  const pieces = decoded.split(",").map(part => part.trim()).filter(Boolean);
  return {
    venue: pieces[0] || "",
    address: pieces.slice(1).join(", ")
  };
}

function extractDetailHeader(html) {
  const marker = html.indexOf("event-detail");
  const section = marker >= 0 ? html.slice(marker, marker + 2600) : html;
  const text = stripTags(section);
  const title = text.match(/Event Categories >\s*(.*?)\s+([A-Z][a-z]+,\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\s+@\s+\d{1,2}:\d{2}(?:AM|PM))/)?.[1]
    || text.match(/Event Categories >\s*(.*?)\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+[A-Za-z]{3})/)?.[1]
    || "";
  const detailDate = text.match(/([A-Z][a-z]+,\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\s+@\s+\d{1,2}:\d{2}(?:AM|PM))/)?.[1] || "";
  return { title: title.trim(), detailDate };
}

function extractPrice(html) {
  const prices = [...html.matchAll(/<div class="price">\s*\$?([0-9]+(?:\.[0-9]{2})?)\s*<\/div>/gi)].map(match => Number(match[1])).filter(Number.isFinite);
  if (!prices.length) return { price: "", price_min: "", price_max: "", is_free: false };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { price: min === max ? `$${min}` : `$${min} - $${max}`, price_min: min, price_max: max, is_free: false };
}

function normalizeAddress(value = "") {
  const address = stripTags(value).replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();
  if (/^connecticut ave\.?$/i.test(address)) return "Connecticut Ave NW, Washington, DC";
  return address;
}

function neighborhoodFor(address, venue) {
  const text = `${address} ${venue}`.toLowerCase();
  if (/van ness|international dr|tilden st|linnean ave|embassy of israel/.test(text)) return "Van Ness";
  if (/kalorama|wyoming ave|sheridan cir|massachusetts ave nw|mansion on o|washington golf/.test(text)) return "Kalorama";
  if (/whitehaven|reservoir rd|embassy of france/.test(text)) return "Georgetown";
  if (/cleveland park|lowell st/.test(text)) return "Cleveland Park";
  if (/dupont|connecticut ave|new hampshire ave/.test(text)) return "Dupont Circle";
  return "Washington DC";
}

function dcProperAddress(address) {
  const text = String(address || "").toLowerCase();
  if (/online|virtual|zoom|rockville|maryland|md\s+\d{5}/.test(text)) return false;
  return /washington,\s*(dc|district of columbia)|\bdc\s+\d{5}\b|\b(nw|ne|sw|se)\b|\b(northwest|northeast|southwest|southeast)\b|embassy row|connecticut ave/.test(text);
}

function tagsFor(row) {
  const text = `${row.title} ${row.description}`.toLowerCase();
  const tags = ["Embassy", "Cultural", "International"];
  if (/food|dinner|cuisine|wine|drink|tasting|refreshment/.test(text)) tags.push("Food tasting");
  if (/dance|music|concert|performance|entertainment/.test(text)) tags.push("Live entertainment");
  if (/ball|masquerade|gala/.test(text)) tags.push("Formal");
  if (/garden|outdoor|patio/.test(text)) tags.push("Outdoor");
  if (/tour|architecture|history|guided/.test(text)) tags.push("Tour");
  if (/new year|celebration|party|festival/.test(text)) tags.push("Celebration");
  return [...new Set(tags)].slice(0, 6);
}

function titleVenueGuess(title) {
  const text = title.toLowerCase();
  if (text.includes("egypt")) return "Embassy of Egypt";
  if (text.includes("ethiopia")) return "Embassy of Ethiopia";
  if (text.includes("france")) return "Embassy of France";
  if (text.includes("italy") || text.includes("venetian")) return "Embassy of Italy";
  if (text.includes("vietnam")) return "Residence of the Ambassador from Vietnam";
  if (text.includes("israel")) return "Embassy of Israel";
  return "";
}

async function scrapeDetail(listing) {
  const html = await fetchText(listing.url);
  const detailHeader = extractDetailHeader(html);
  const calendarLocation = extractCalendarLocation(html);
  const title = detailHeader.title || listing.title;
  const dateLabel = extractFirst(html, [
    /<h4 class="event-listing-date">\s*([\s\S]*?)\s*<\/h4>/i,
    /<strong class="event-listing-date">\s*([\s\S]*?)\s*<\/strong>/i
  ]) || listing.dateLabel;
  const venue = calendarLocation.venue || extractFirst(html, [
    /<h4 class="event-location">\s*([\s\S]*?)<\/h4>/i,
    /<div class="event-location[^"]*">\s*([\s\S]*?)<\/div>/i
  ]) || titleVenueGuess(title);
  const address = normalizeAddress(calendarLocation.address || extractFirst(html, [
    /<h4 class="event-location">[\s\S]*?<\/h4>\s*<h4 class="event-location">\s*([\s\S]*?)<\/h4>/i,
    /<div class="event-address[^"]*">\s*([\s\S]*?)<\/div>/i
  ]));
  const description = extractFirst(html, [
    /<div class="event-description[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="w-col w-col-4">/i,
    /<div class="inner-event-description[^"]*">([\s\S]*?)<\/div>/i,
    /<div class="w-richtext">([\s\S]*?)<\/div>/i
  ]) || listing.summary;
  const price = extractPrice(html);
  const parsedDetail = parseDetailDate(detailHeader.detailDate);
  const parsed = parsedDetail.date ? parsedDetail : parseListingDate(dateLabel || listing.dateLabel);
  const externalId = listing.url.replace(/^https?:\/\/thingstododc\.com\/event\//, "").replace(/\/$/, "");
  return {
    title: title.replace(/\s+\|\s*Things To Do DC$/i, ""),
    venue_name: venue.replace(/\s+,?\s*$/g, "") || titleVenueGuess(title) || "Things To Do DC",
    venue_address: address,
    neighborhood: neighborhoodFor(address, venue),
    date: parsed.date || "",
    time: parsed.time || dateLabel,
    starts_at: parsed.starts_at || "",
    timezone: TIMEZONE,
    description: description || listing.summary,
    category: "festivals",
    tag: "Embassy",
    tags: [],
    image_url: extractImage(html, listing.image_url),
    source: SOURCE,
    external_id: externalId,
    ticket_url: listing.url,
    external_url: listing.url,
    raw_json: { listing },
    status: "published",
    ...price
  };
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSql(rows) {
  const json = JSON.stringify(rows).replace(/'/g, "''");
  return `-- ThingsToDoDC Embassy & Culture import. Generated by tools/import-thingstododc-embassy-events.mjs.
-- Safe to re-run: upserts by source + external_id.

insert into public.venues (
  name, address, venue_type, neighborhood, source_name, source_key, raw_data, imported_at, created_at, updated_at
)
select distinct
  item->>'venue_name',
  item->>'venue_address',
  'Embassy / Cultural Venue',
  item->>'neighborhood',
  'ThingsToDoDC Embassy & Culture',
  'thingstododc:' || (item->>'external_id'),
  jsonb_build_object('thingstododc_embassy_import', true, 'source_url', item->>'external_url'),
  now(), now(), now()
from jsonb_array_elements('${json}'::jsonb) item
where nullif(item->>'venue_name', '') is not null
  and nullif(item->>'venue_address', '') is not null
on conflict (name, address) do update
set source_name = coalesce(public.venues.source_name, excluded.source_name),
    source_key = coalesce(public.venues.source_key, excluded.source_key),
    venue_type = excluded.venue_type,
    neighborhood = excluded.neighborhood,
    raw_data = public.venues.raw_data || excluded.raw_data,
    updated_at = now();

insert into public.events (
  title, description, category, tag, tags, venue_name, venue, neighborhood, venue_address,
  date, time, starts_at, timezone, price, price_min, price_max, is_free,
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
  item->>'timezone',
  nullif(item->>'price', ''),
  nullif(item->>'price_min', '')::numeric,
  nullif(item->>'price_max', '')::numeric,
  coalesce((item->>'is_free')::boolean, false),
  item->>'source',
  item->>'external_id',
  item->>'ticket_url',
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

const listings = await loadListingRows();
const scraped = [];
const excluded = [];
for (const listing of listings) {
  const row = await scrapeDetail(listing);
  row.tags = tagsFor(row);
  if (!row.date || !row.starts_at) {
    excluded.push({ title: row.title, reason: "missing date/time", url: row.external_url });
    continue;
  }
  if (!dcProperAddress(row.venue_address)) {
    excluded.push({ title: row.title, reason: `not DC physical venue: ${row.venue_address || row.venue_name}`, url: row.external_url });
    continue;
  }
  scraped.push(row);
}

const unique = [...new Map(scraped.map(row => [row.external_id, row])).values()];
await writeFile(outputFile, buildSql(unique));
console.log(JSON.stringify({
  listingRows: listings.length,
  includedRows: unique.length,
  excludedRows: excluded.length,
  included: unique.map(row => ({ title: row.title, date: row.date, time: row.time, venue: row.venue_name, address: row.venue_address, price: row.price, tags: row.tags })),
  excluded
}, null, 2));
