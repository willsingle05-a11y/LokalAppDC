import { readFile } from "node:fs/promises";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const sourceFile = process.argv[2] || "data/happy-hours.json";
const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function isDcProper(row) {
  const address = String(row.venue_address || "").toLowerCase();
  const excluded = /arlington|alexandria|bethesda|silver spring|national harbor|falls church|maryland|virginia|\bmd\b|\bva\b/;
  return !excluded.test(address) && /washington|\bdc\b|\bd\.c\.\b|\b200\d{2}\b/.test(address);
}

function timeIsValid(value) {
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value || ""));
}

function normalize(row) {
  const weekday = typeof row.weekday === "number" ? row.weekday : weekdayNames.indexOf(String(row.weekday || "").toLowerCase());
  if (!row.venue_name || !row.venue_address || !row.source_url || weekday < 0 || weekday > 6 || !timeIsValid(row.starts_at) || !timeIsValid(row.ends_at)) return null;
  if (!isDcProper(row)) return null;
  return {
    source_key: row.source_key || `${row.venue_name}-${weekday}-${row.starts_at}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    venue_name: row.venue_name.trim(),
    venue_address: row.venue_address.trim(),
    neighborhood: row.neighborhood?.trim() || null,
    weekday,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    title: row.title?.trim() || "Happy hour",
    specials: row.specials?.trim() || null,
    price_label: row.price_label?.trim() || "Happy hour specials",
    tags: [...new Set(["Happy hour", "Food & Drink", ...(row.tags || [])])],
    source_name: row.source_name || "venue-official",
    source_url: row.source_url,
    source_updated_at: row.source_updated_at || null,
    verified_at: new Date().toISOString(),
    is_active: row.is_active !== false
  };
}

const rows = JSON.parse(await readFile(sourceFile, "utf8"));
const normalized = rows.map(normalize).filter(Boolean);
console.log(`Validated ${normalized.length} DC happy-hour rows from ${rows.length} source rows.`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upsert the validated rows.");
  process.exit(0);
}

const response = await fetch(`${SUPABASE_URL}/rest/v1/happy_hours?on_conflict=source_key`, {
  method: "POST",
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal"
  },
  body: JSON.stringify(normalized)
});

if (!response.ok) throw new Error(`Supabase happy-hour upsert failed: ${response.status} ${await response.text()}`);
console.log(`Upserted ${normalized.length} verified DC happy-hour rows.`);
