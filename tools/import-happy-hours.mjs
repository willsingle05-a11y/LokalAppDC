import { readFile, writeFile } from "node:fs/promises";

process.env.TZ = "America/New_York";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const sourceFile = process.argv[2] || "data/happy-hours.json";
const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isDcProper(row) {
  const address = String(row.venue_address || "").toLowerCase();
  const neighborhood = String(row.neighborhood || "").toLowerCase();
  const excluded = /arlington|alexandria|bethesda|silver spring|national harbor|falls church|maryland|virginia|\bmd\b|\bva\b/;
  const dcNeighborhoods = /dupont|navy yard|adams morgan|georgetown|logan circle|wharf|noma|columbia heights|capitol hill|shaw/;
  return !excluded.test(address) && (/washington|\bdc\b|\bd\.c\.\b|\b200\d{2}\b/.test(address) || dcNeighborhoods.test(neighborhood));
}

function timeIsValid(value) {
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value || ""));
}

function formatClock(value) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(`2000-01-01T${String(value).slice(0, 5)}`));
}

function happyHourTags(row) {
  const text = `${row.venue_name || ""} ${row.specials || ""} ${(row.tags || []).join(" ")}`.toLowerCase();
  const tags = [];
  const add = (tag, pattern) => { if (pattern.test(text) && !tags.includes(tag)) tags.push(tag); };
  add("Cocktails", /cocktail|martini|margarita|spritz|old fashioned/);
  add("Margaritas", /margarita/);
  add("Spritzes", /spritz/);
  add("Whiskey", /whiskey|old fashioned/);
  add("Tequila", /tequila|paloma/);
  add("Wine", /wine|rosé|rose|bottle/);
  add("Beer", /beer|draft|lager|ipa|pint/);
  add("Draft beer", /draft|lager|ipa|pint/);
  add("Bites", /food|snack|appetizer|small plate|slider|grilled cheese|fries/);
  add("Burgers", /burger/);
  add("Tacos", /taco/);
  add("Wings", /wing/);
  add("Pizza", /pizza/);
  add("Oysters", /oyster/);
  add("Rooftop", /rooftop/);
  add("Patio", /patio|outdoor|terrace/);
  add("Beer garden", /beer garden|wundergarten|brig/);
  add("Karaoke", /karaoke/);
  add("Arcade", /arcade/);
  add("Billiards", /billiards/);
  add("Late night", /late|11pm|midnight|\b2am\b/);
  add("Half-price", /half\s*(?:off|price)|50%/);
  const startHour = Number(String(row.starts_at || "").slice(0, 2));
  if (startHour >= 18) tags.push("Evening");
  else if (startHour <= 16) tags.push("Early evening");
  else tags.push("After work");
  return [...new Set([...tags, ...(row.tags || [])])]
    .filter(tag => !["happy hour", "happy hours", "weekday deal", "sports", "sport"].includes(String(tag).toLowerCase()))
    .slice(0, 7);
}

function normalizeSource(row) {
  const weekday = typeof row.weekday === "number" ? row.weekday : weekdayNames.indexOf(String(row.weekday || "").toLowerCase());
  const neighborhood = row.neighborhood?.trim() || "Washington, DC";
  const venueAddress = row.venue_address?.trim() || `${neighborhood}, Washington, DC`;
  if (!row.venue_name || weekday < 0 || weekday > 6 || !timeIsValid(row.starts_at) || !timeIsValid(row.ends_at) || row.is_active === false) return null;
  if (!isDcProper({ venue_address: venueAddress, neighborhood })) return null;
  return {
    sourceKey: row.source_key || `${row.venue_name}-${weekday}-${row.starts_at}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    venueName: row.venue_name.trim(),
    venueAddress,
    neighborhood,
    weekday,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    title: row.title?.trim() || `${row.venue_name.trim()} happy hour`,
    specials: row.specials?.trim() || `Happy hour at ${row.venue_name.trim()}. See the venue source for current specials.`,
    price: row.price_label?.trim() || "Happy hour specials",
    tags: happyHourTags(row),
    sourceUrl: row.source_url || null,
    logoUrl: row.logo_url || null,
    sourceUpdatedAt: row.source_updated_at || null
  };
}

function upcomingEventRows(source) {
  const rows = [];
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + dayOffset);
    if (date.getDay() !== source.weekday) continue;
    const iso = localDateKey(date);
    const startsAt = `${iso}T${source.startsAt}:00-04:00`;
    const crossesMidnight = source.endsAt <= source.startsAt;
    const endDate = new Date(`${iso}T12:00:00`);
    if (crossesMidnight) endDate.setDate(endDate.getDate() + 1);
    const endsAt = `${localDateKey(endDate)}T${source.endsAt}:00-04:00`;
    rows.push({
      source: "happy-hours",
      external_id: `${source.sourceKey}-${iso}`,
      title: source.title,
      description: source.specials,
      category: "happy-hours",
      tag: "Happy hour",
      tags: source.tags,
      venue_name: source.venueName,
      venue: source.venueName,
      venue_address: source.venueAddress,
      neighborhood: source.neighborhood,
      date: iso,
      time: `${formatClock(source.startsAt)} - ${formatClock(source.endsAt)}`,
      starts_at: startsAt,
      ends_at: endsAt,
      price: source.price,
      ticket_url: source.sourceUrl,
      external_url: source.sourceUrl,
      timezone: "America/New_York",
      is_free: false,
      status: "published",
      last_seen_at: new Date().toISOString(),
      raw_json: { happy_hour: true, source_updated_at: source.sourceUpdatedAt }
    });
  }
  return rows;
}

function buildUpsertSql(eventRows) {
  const json = JSON.stringify(eventRows).replace(/'/g, "''");
  return `
insert into public.events (
  source, external_id, title, description, category, tag, tags, venue_name, venue,
  venue_address, neighborhood, date, time, price, ticket_url, external_url, timezone,
  is_free, status, last_seen_at, raw_json, starts_at, ends_at, is_recurring
)
select
  item->>'source', item->>'external_id', item->>'title', item->>'description',
  item->>'category', item->>'tag', array(select jsonb_array_elements_text(item->'tags')),
  item->>'venue_name', item->>'venue', item->>'venue_address', item->>'neighborhood',
  (item->>'date')::date, item->>'time', item->>'price', item->>'ticket_url',
  item->>'external_url', item->>'timezone', coalesce((item->>'is_free')::boolean, false),
  item->>'status', (item->>'last_seen_at')::timestamptz, item->'raw_json',
  (item->>'starts_at')::timestamptz, (item->>'ends_at')::timestamptz, true
from jsonb_array_elements('${json}'::jsonb) as item
on conflict (source, external_id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  tag = excluded.tag,
  tags = excluded.tags,
  venue_name = excluded.venue_name,
  venue = excluded.venue,
  venue_address = excluded.venue_address,
  neighborhood = excluded.neighborhood,
  date = excluded.date,
  time = excluded.time,
  price = excluded.price,
  ticket_url = excluded.ticket_url,
  external_url = excluded.external_url,
  timezone = excluded.timezone,
  is_free = excluded.is_free,
  status = excluded.status,
  last_seen_at = excluded.last_seen_at,
  raw_json = excluded.raw_json,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_recurring = true,
  updated_at = now();
`;
}

function buildScheduleUpsertSql(schedules) {
  const rows = schedules.map(schedule => ({
    source_key: schedule.sourceKey,
    venue_name: schedule.venueName,
    venue_address: schedule.venueAddress,
    neighborhood: schedule.neighborhood,
    weekday: schedule.weekday,
    starts_at: schedule.startsAt,
    ends_at: schedule.endsAt,
    specials: schedule.specials,
    price_label: schedule.price,
    tags: schedule.tags,
    source_url: schedule.sourceUrl,
    logo_url: schedule.logoUrl,
    source_name: "Lokal curated happy-hour CSV"
  }));
  const json = JSON.stringify(rows).replace(/'/g, "''");
  return `
insert into public.recurring_happy_hour_schedules (
  source_key, venue_name, venue_address, neighborhood, weekday, starts_at, ends_at,
  specials, price_label, tags, source_url, logo_url, source_name
)
select
  item->>'source_key', item->>'venue_name', item->>'venue_address', item->>'neighborhood',
  (item->>'weekday')::smallint, (item->>'starts_at')::time, (item->>'ends_at')::time,
  item->>'specials', item->>'price_label', array(select jsonb_array_elements_text(item->'tags')),
  item->>'source_url', item->>'logo_url', item->>'source_name'
from jsonb_array_elements('${json}'::jsonb) as item
on conflict (source_key) do update set
  venue_name = excluded.venue_name,
  venue_address = excluded.venue_address,
  neighborhood = excluded.neighborhood,
  weekday = excluded.weekday,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  specials = excluded.specials,
  price_label = excluded.price_label,
  tags = excluded.tags,
  source_url = excluded.source_url,
  logo_url = excluded.logo_url,
  source_name = excluded.source_name,
  is_active = true,
  updated_at = now();

select public.refresh_recurring_happy_hour_events(60);
`;
}

const sourceRows = JSON.parse(await readFile(sourceFile, "utf8"));
const schedules = sourceRows.map(normalizeSource).filter(Boolean);
const eventRows = schedules.flatMap(upcomingEventRows);
console.log(`Validated ${eventRows.length} upcoming DC happy-hour event rows from ${sourceRows.length} source rows.`);

const sqlIndex = process.argv.indexOf("--sql");
if (sqlIndex >= 0) {
  const output = process.argv[sqlIndex + 1];
  if (!output) throw new Error("Use --sql <output-file> to write the Supabase upsert query.");
  await writeFile(output, buildUpsertSql(eventRows));
  console.log(`Wrote ${output}.`);
  process.exit(0);
}

const scheduleSqlIndex = process.argv.indexOf("--schedule-sql");
if (scheduleSqlIndex >= 0) {
  const output = process.argv[scheduleSqlIndex + 1];
  if (!output) throw new Error("Use --schedule-sql <output-file> to write the recurring schedule upsert query.");
  await writeFile(output, buildScheduleUpsertSql(schedules));
  console.log(`Wrote ${output} for ${schedules.length} recurring schedules.`);
  process.exit(0);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upsert the validated events.");
  process.exit(0);
}

const response = await fetch(`${SUPABASE_URL}/rest/v1/events?on_conflict=source,external_id`, {
  method: "POST",
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal"
  },
  body: JSON.stringify(eventRows)
});

if (!response.ok) throw new Error(`Supabase event upsert failed: ${response.status} ${await response.text()}`);
console.log(`Upserted ${eventRows.length} verified DC happy-hour events.`);
