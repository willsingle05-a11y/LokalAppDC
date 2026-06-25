import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) throw new Error("Usage: node tools/import-dc-music-shows.mjs <shows.csv> <output.sql>");

const TIMEZONE = "America/New_York";
const CURRENT_YEAR = 2026;
const TODAY_MONTH = 6;
const TODAY_DAY = 25;

const concertVenues = new Set([
  "nationals park",
  "capital one arena",
  "the anthem",
  "dar constitution hall",
  "constitution hall",
  "the howard theatre",
  "howard theatre",
  "the howard",
  "echostage",
  "9:30 club",
  "930 club",
  "union stage"
]);

const dcVenues = new Map(Object.entries({
  "9:30 club": { address: "815 V St NW, Washington, DC 20001", neighborhood: "Shaw" },
  "anacostia arts center": { address: "1231 Good Hope Rd SE, Washington, DC 20020", neighborhood: "Anacostia" },
  "arena stage": { address: "1101 6th St SW, Washington, DC 20024", neighborhood: "Wharf" },
  "atlas performing arts center": { address: "1333 H St NE, Washington, DC 20002", neighborhood: "H Street" },
  "barracks row": { address: "Barracks Row SE, Washington, DC", neighborhood: "Capitol Hill" },
  "big bear cafe": { address: "1700 1st St NW, Washington, DC 20001", neighborhood: "Bloomingdale" },
  "black cat": { address: "1811 14th St NW, Washington, DC 20009", neighborhood: "U Street" },
  "blues alley": { address: "1073 Wisconsin Ave NW, Washington, DC 20007", neighborhood: "Georgetown" },
  "bossa bistro + lounge": { address: "2463 18th St NW, Washington, DC 20009", neighborhood: "Adams Morgan" },
  "capital one arena": { address: "601 F St NW, Washington, DC 20004", neighborhood: "Penn Quarter" },
  "capital turnaround": { address: "770 M St SE, Washington, DC 20003", neighborhood: "Navy Yard" },
  "city state brewing company": { address: "705 Edgewood St NE, Washington, DC 20017", neighborhood: "Brookland" },
  "comet ping pong": { address: "5037 Connecticut Ave NW, Washington, DC 20008", neighborhood: "Chevy Chase DC" },
  "constitution hall": { address: "1776 D St NW, Washington, DC 20006", neighborhood: "Downtown" },
  "culture dc": { address: "Washington, DC", neighborhood: "Washington, DC" },
  "dc improv": { address: "1140 Connecticut Ave NW, Washington, DC 20036", neighborhood: "Dupont Circle" },
  "dc jazz collective": { address: "Washington, DC", neighborhood: "Washington, DC" },
  "dc9 nightclub": { address: "1940 9th St NW, Washington, DC 20001", neighborhood: "U Street" },
  "dumbarton concerts": { address: "3133 Dumbarton St NW, Washington, DC 20007", neighborhood: "Georgetown" },
  "dupont circle bid": { address: "Dupont Circle NW, Washington, DC", neighborhood: "Dupont Circle" },
  "echostage": { address: "2135 Queens Chapel Rd NE, Washington, DC 20018", neighborhood: "Ivy City" },
  "fat pete's bbq": { address: "3407 Connecticut Ave NW, Washington, DC 20008", neighborhood: "Cleveland Park" },
  "flash": { address: "645 Florida Ave NW, Washington, DC 20001", neighborhood: "Shaw" },
  "galactic panther": { address: "1303 King St, Alexandria, VA 22314", neighborhood: "Outside DC", outside: true },
  "georgetown piano bar": { address: "3287 M St NW, Washington, DC 20007", neighborhood: "Georgetown" },
  "hard rock cafe": { address: "999 E St NW, Washington, DC 20004", neighborhood: "Penn Quarter" },
  "hill center": { address: "921 Pennsylvania Ave SE, Washington, DC 20003", neighborhood: "Capitol Hill" },
  "hirshhorn museum": { address: "Independence Ave SW & 7th St SW, Washington, DC 20560", neighborhood: "National Mall" },
  "jojo restaurant and bar": { address: "1518 U St NW, Washington, DC 20009", neighborhood: "U Street" },
  "lincoln theatre": { address: "1215 U St NW, Washington, DC 20009", neighborhood: "U Street" },
  "madam's organ": { address: "2461 18th St NW, Washington, DC 20009", neighborhood: "Adams Morgan" },
  "miracle theatre": { address: "535 8th St SE, Washington, DC 20003", neighborhood: "Capitol Hill" },
  "mlk library": { address: "901 G St NW, Washington, DC 20001", neighborhood: "Penn Quarter" },
  "murphy's grand irish pub": { address: "713 King St, Alexandria, VA 22314", neighborhood: "Outside DC", outside: true },
  "national cathedral": { address: "3101 Wisconsin Ave NW, Washington, DC 20016", neighborhood: "Cathedral Heights" },
  "national city christian church": { address: "5 Thomas Cir NW, Washington, DC 20005", neighborhood: "Logan Circle" },
  "national gallery of art": { address: "Constitution Ave NW, Washington, DC 20565", neighborhood: "National Mall" },
  "nationals park": { address: "1500 S Capitol St SE, Washington, DC 20003", neighborhood: "Navy Yard" },
  "nmaa": { address: "950 Independence Ave SW, Washington, DC 20560", neighborhood: "National Mall" },
  "nmai": { address: "4th St SW, Washington, DC 20560", neighborhood: "National Mall" },
  "noma bid": { address: "NoMa, Washington, DC", neighborhood: "NoMa" },
  "palisades hub": { address: "5200 Cathedral Ave NW, Washington, DC 20016", neighborhood: "Palisades" },
  "pearl street warehouse": { address: "33 Pearl St SW, Washington, DC 20024", neighborhood: "Wharf" },
  "penn social": { address: "801 E St NW, Washington, DC 20004", neighborhood: "Penn Quarter" },
  "pie shop": { address: "1339 H St NE, Washington, DC 20002", neighborhood: "H Street" },
  "rhizome dc": { address: "6950 Maple St NW, Washington, DC 20012", neighborhood: "Takoma DC" },
  "roofers union": { address: "2446 18th St NW, Washington, DC 20009", neighborhood: "Adams Morgan" },
  "saam": { address: "8th St NW & G St NW, Washington, DC 20001", neighborhood: "Penn Quarter" },
  "songbyrd music house": { address: "2477 18th St NW, Washington, DC 20009", neighborhood: "Adams Morgan" },
  "st. vincent wine": { address: "3212 Georgia Ave NW, Washington, DC 20010", neighborhood: "Park View" },
  "takoma station tavern": { address: "6914 4th St NW, Washington, DC 20012", neighborhood: "Takoma DC" },
  "the anthem": { address: "901 Wharf St SW, Washington, DC 20024", neighborhood: "Wharf" },
  "the artemis": { address: "3605 14th St NW, Washington, DC 20010", neighborhood: "Columbia Heights" },
  "the atlantis": { address: "2047 9th St NW, Washington, DC 20001", neighborhood: "Shaw" },
  "the fridge": { address: "516 1/2 8th St SE, Washington, DC 20003", neighborhood: "Capitol Hill" },
  "the hamilton live": { address: "600 14th St NW, Washington, DC 20005", neighborhood: "Downtown" },
  "the howard": { address: "620 T St NW, Washington, DC 20001", neighborhood: "Shaw" },
  "the howard theatre": { address: "620 T St NW, Washington, DC 20001", neighborhood: "Shaw" },
  "the kennedy center": { address: "2700 F St NW, Washington, DC 20566", neighborhood: "Foggy Bottom" },
  "the phillips collection": { address: "1600 21st St NW, Washington, DC 20009", neighborhood: "Dupont Circle" },
  "the pocket": { address: "1508 North Capitol St NW, Washington, DC 20002", neighborhood: "NoMa" },
  "the tabard inn": { address: "1739 N St NW, Washington, DC 20036", neighborhood: "Dupont Circle" },
  "transmission": { address: "Washington, DC", neighborhood: "Washington, DC" },
  "union stage": { address: "740 Water St SW, Washington, DC 20024", neighborhood: "Wharf" },
  "warner theatre": { address: "513 13th St NW, Washington, DC 20004", neighborhood: "Downtown" },
  "west end library": { address: "2301 L St NW, Washington, DC 20037", neighborhood: "West End" },
  "westminster presbyterian church": { address: "400 I St SW, Washington, DC 20024", neighborhood: "Southwest" },
  "woodrow wilson plaza": { address: "1300 Pennsylvania Ave NW, Washington, DC 20004", neighborhood: "Downtown" },
  "zebbie's garden": { address: "1223 Connecticut Ave NW, Washington, DC 20036", neighborhood: "Dupont Circle" }
}));

const outsideVenuePatterns = [
  /bethesda|silver spring|alexandria|arlington|vienna|falls church|wolf trap|strathmore|birchmere|merriweather|jiffy lube|national harbor|rams head|tally ho|nova live|eaglebank|northwest stadium|capital one hall|fillmore silver spring|hank dietle|new deal cafe|filene center|jammin java|laporta|lena's|blackwall hitch|daniel o'connell|light horse|renegade va|state theatre|barns at wolf trap/i
];

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      row.push(value);
      if (row.some(item => item.trim())) rows.push(row);
      row = []; value = "";
    } else value += character;
  }
  row.push(value);
  if (row.some(item => item.trim())) rows.push(row);
  return rows;
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function key(value) {
  return String(value || "").toLowerCase().replace(/^the\s+/, "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/[^a-z0-9]+/g, "");
}

function parseUpcomingDate(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = CURRENT_YEAR;
  if (month < TODAY_MONTH || (month === TODAY_MONTH && day < TODAY_DAY)) year += 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTime(value) {
  const clean = String(value || "").trim();
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return { label: clean, hour: null, minute: null };
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  const minute = Number(match[2] || 0);
  return { label: clean.replace(/\s+/g, " ").toUpperCase(), hour, minute };
}

function nthSunday(year, month, nth) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstSunday = 1 + ((7 - first.getUTCDay()) % 7);
  return firstSunday + ((nth - 1) * 7);
}

function dcUtcOffsetHours(year, month, day, hour) {
  const dstStartDay = nthSunday(year, 3, 2);
  const dstEndDay = nthSunday(year, 11, 1);
  if (month > 3 && month < 11) return 4;
  if (month < 3 || month > 11) return 5;
  if (month === 3) return day > dstStartDay || (day === dstStartDay && hour >= 2) ? 4 : 5;
  return day < dstEndDay || (day === dstEndDay && hour < 2) ? 4 : 5;
}

function startsAtIso(date, time) {
  if (!date || time.hour === null) return null;
  const [year, month, day] = date.split("-").map(Number);
  const offsetHours = dcUtcOffsetHours(year, month, day, time.hour);
  const localAsUtc = new Date(Date.UTC(year, month - 1, day, time.hour + offsetHours, time.minute || 0, 0));
  return localAsUtc.toISOString();
}

function priceFields(value) {
  const clean = String(value || "").trim();
  if (!clean) return { price: null, price_min: null, price_max: null, is_free: false };
  if (/^free$/i.test(clean)) return { price: "Free", price_min: 0, price_max: null, is_free: true };
  const prices = [...clean.matchAll(/\$?([0-9]+(?:\.[0-9]{1,2})?)/g)].map(match => Number(match[1])).filter(Number.isFinite);
  if (!prices.length) return { price: clean, price_min: null, price_max: null, is_free: false };
  return { price: clean.startsWith("$") ? clean : `$${clean}`, price_min: Math.min(...prices), price_max: prices.length > 1 ? Math.max(...prices) : null, is_free: false };
}

function genreTags(title, category, venue) {
  const text = `${title} ${venue}`.toLowerCase();
  const tags = [];
  const add = (label, pattern) => { if (pattern.test(text) && !tags.includes(label)) tags.push(label); };
  add("Hip-Hop", /hip[- ]?hop|rap|freedia|rashaad/);
  add("Jazz", /jazz|trio|quartet|blues alley|jojo|mccoy|swing/);
  add("Blues", /blues/);
  add("Rock", /rock|punk|metal|staring in spaces|blanket approval/);
  add("Indie", /indie|songbyrd|black cat|dc9|comet ping pong/);
  add("Electronic", /electronic|dj|dance|echostage|flash|zebbie/);
  add("Folk", /folk|singer|songwriter|acoustic/);
  add("Classical", /orchestra|symphony|chamber|cathedral|piano|concerts/);
  add("R&B", /r&b|soul/);
  if (category === "concerts") tags.unshift("Major Venue");
  if (!tags.length) tags.push(category === "concerts" ? "Ticketed Show" : "Local Stage");
  return [...new Set(tags)].slice(0, 6);
}

const rawRows = parseCsv(await readFile(inputFile, "utf8"));
const headerIndex = rawRows.findIndex(row => row.map(item => item.trim()).join("|") === "Title|Date|Time|Venue|Price|Sold Out|Ticket Link");
if (headerIndex < 0) throw new Error("Could not find Title,Date,Time,Venue,Price,Sold Out,Ticket Link header.");
const header = rawRows[headerIndex].map(item => item.trim());
const data = rawRows.slice(headerIndex + 1);
const col = Object.fromEntries(header.map((name, index) => [name, index]));

const included = [];
const excluded = new Map();
for (const row of data) {
  const title = String(row[col.Title] || "").trim();
  const venue = String(row[col.Venue] || "").trim();
  if (!title || !venue) continue;
  const venueKey = key(venue);
  const known = dcVenues.get(venueKey) || dcVenues.get(venue.toLowerCase());
  const outside = known?.outside || outsideVenuePatterns.some(pattern => pattern.test(venue));
  if (outside || !known) {
    excluded.set(venue, (excluded.get(venue) || 0) + 1);
    continue;
  }
  const date = parseUpcomingDate(row[col.Date]);
  if (!date) continue;
  const time = parseTime(row[col.Time]);
  const start = startsAtIso(date, time);
  const venueLower = venue.toLowerCase();
  const category = concertVenues.has(venueKey) || concertVenues.has(venueLower) ? "concerts" : "live-music";
  const prices = priceFields(row[col.Price]);
  const soldOut = /^yes$/i.test(String(row[col["Sold Out"]] || "").trim());
  const external_id = `dc-music-live:${slug(`${title}-${date}-${time.label}-${venue}`)}`;
  included.push({
    external_id,
    title,
    venue,
    venue_name: venue,
    venue_address: known.address,
    neighborhood: known.neighborhood,
    date,
    time: time.label || null,
    starts_at: start,
    timezone: TIMEZONE,
    category,
    tags: genreTags(title, category, venue),
    description: `${title} at ${venue}.${soldOut ? " This show is marked sold out in the source sheet." : ""}`,
    price: prices.price,
    price_min: prices.price_min,
    price_max: prices.price_max,
    is_free: prices.is_free,
    status: "published",
    source: "dc-music-live",
    ticket_url: null,
    external_url: null,
    raw_json: {
      import_source: "DC_Music.xlsx - All Shows.csv",
      source_price: row[col.Price] || null,
      source_ticket_link: row[col["Ticket Link"]] || null,
      sold_out: soldOut
    }
  });
}

const unique = [...new Map(included.map(row => [row.external_id, row])).values()];
const json = JSON.stringify(unique).replace(/'/g, "''");
const sql = `
insert into public.venues (
  name, address, venue_type, neighborhood, source_name, source_key, raw_data, imported_at, created_at, updated_at
)
select distinct
  item->>'venue_name',
  item->>'venue_address',
  case when item->>'category' = 'concerts' then 'Concert Venue' else 'Live Music Venue' end,
  item->>'neighborhood',
  'DC Music Live import',
  'venue:' || public.venue_image_key(item->>'venue_name'),
  jsonb_build_object('music_import', true),
  now(), now(), now()
from jsonb_array_elements('${json}'::jsonb) item
where nullif(item->>'venue_name', '') is not null
on conflict (name, address) do update
set source_name = coalesce(public.venues.source_name, excluded.source_name),
    source_key = coalesce(public.venues.source_key, excluded.source_key),
    venue_type = coalesce(public.venues.venue_type, excluded.venue_type),
    neighborhood = coalesce(public.venues.neighborhood, excluded.neighborhood),
    raw_data = public.venues.raw_data || excluded.raw_data,
    updated_at = now();

insert into public.events (
  title, venue, venue_name, venue_address, neighborhood, date, time, starts_at, timezone,
  description, category, tags, price, price_min, price_max, is_free, status,
  source, external_id, ticket_url, external_url, raw_json, last_seen_at, created_at, updated_at
)
select
  item->>'title', item->>'venue', item->>'venue_name', item->>'venue_address', item->>'neighborhood',
  (item->>'date')::date, nullif(item->>'time', ''), nullif(item->>'starts_at', '')::timestamptz, item->>'timezone',
  item->>'description', item->>'category', array(select jsonb_array_elements_text(item->'tags')),
  nullif(item->>'price', ''), nullif(item->>'price_min', '')::numeric, nullif(item->>'price_max', '')::numeric,
  coalesce((item->>'is_free')::boolean, false), item->>'status',
  item->>'source', item->>'external_id', nullif(item->>'ticket_url', ''), nullif(item->>'external_url', ''),
  item->'raw_json', now(), now(), now()
from jsonb_array_elements('${json}'::jsonb) item
on conflict (source, external_id) do update set
  title = excluded.title,
  venue = excluded.venue,
  venue_name = excluded.venue_name,
  venue_address = excluded.venue_address,
  neighborhood = excluded.neighborhood,
  date = excluded.date,
  time = excluded.time,
  starts_at = excluded.starts_at,
  timezone = excluded.timezone,
  description = excluded.description,
  category = excluded.category,
  tags = excluded.tags,
  price = excluded.price,
  price_min = excluded.price_min,
  price_max = excluded.price_max,
  is_free = excluded.is_free,
  status = excluded.status,
  ticket_url = excluded.ticket_url,
  external_url = excluded.external_url,
  raw_json = excluded.raw_json,
  last_seen_at = now(),
  updated_at = now();

select public.refresh_venue_event_images();
`;
await writeFile(outputFile, sql);
console.log(JSON.stringify({ inputRows: data.length, includedRows: included.length, uniqueRows: unique.length, categoryCounts: unique.reduce((acc, row) => { acc[row.category] = (acc[row.category] || 0) + 1; return acc; }, {}), includedVenues: new Set(unique.map(row => row.venue_name)).size, excludedVenues: [...excluded.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 40) }, null, 2));