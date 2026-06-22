import { readFile } from "node:fs/promises";

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
  const excluded = /arlington|alexandria|bethesda|silver spring|national harbor|falls church|maryland|virginia|\bmd\b|\bva\b/;
  return !excluded.test(address) && /washington|\bdc\b|\bd\.c\.\b|\b200\d{2}\b/.test(address);
}

function timeIsValid(value) {
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value || ""));
}

function formatClock(value) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(`2000-01-01T${String(value).slice(0, 5)}`));
}

function happyHourTags(row) {
  const text = `${row.venue_name || ""} ${row.specials || ""} ${(row.tags || []).join(" ")}`.toLowerCase();
  const tags = ["Happy hour", "Weekday deal"];
  const add = (tag, pattern) => { if (pattern.test(text) && !tags.includes(tag)) tags.push(tag); };
  add("Cocktails", /cocktail|martini|margarita|spritz|old fashioned/);
  add("Wine", /wine|rosé|rose|bottle/);
  add("Beer", /beer|draft|lager|ipa|pint/);
  add("Food deals", /food|snack|appetizer|small plate|burger|oyster|taco|pizza/);
  add("Oysters", /oyster/);
  add("Rooftop", /rooftop/);
  add("Patio", /patio|outdoor|terrace/);
  add("Hotel bar", /hotel/);
  const startHour = Number(String(row.starts_at || "").slice(0, 2));
  if (startHour >= 18) tags.push("Evening");
  else if (startHour <= 16) tags.push("Early evening");
  else tags.push("After work");
  return [...new Set([...tags, ...(row.tags || [])])].slice(0, 7);
}

function normalizeSource(row) {
  const weekday = typeof row.weekday === "number" ? row.weekday : weekdayNames.indexOf(String(row.weekday || "").toLowerCase());
  if (!row.venue_name || !row.venue_address || !row.source_url || weekday < 0 || weekday > 6 || !timeIsValid(row.starts_at) || !timeIsValid(row.ends_at) || row.is_active === false) return null;
  if (!isDcProper(row)) return null;
  return {
    sourceKey: row.source_key || `${row.venue_name}-${weekday}-${row.starts_at}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    venueName: row.venue_name.trim(),
    venueAddress: row.venue_address.trim(),
    neighborhood: row.neighborhood?.trim() || "Washington, DC",
    weekday,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    title: row.title?.trim() || `${row.venue_name.trim()} happy hour`,
    specials: row.specials?.trim() || `Happy hour at ${row.venue_name.trim()}. See the venue source for current specials.`,
    price: row.price_label?.trim() || "Happy hour specials",
    tags: happyHourTags(row),
    sourceUrl: row.source_url,
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

const sourceRows = JSON.parse(await readFile(sourceFile, "utf8"));
const eventRows = sourceRows.map(normalizeSource).filter(Boolean).flatMap(upcomingEventRows);
console.log(`Validated ${eventRows.length} upcoming DC happy-hour event rows from ${sourceRows.length} source rows.`);

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
