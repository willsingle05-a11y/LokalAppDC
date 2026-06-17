import fs from "node:fs";

const envText = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || process.env.TM_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or Supabase key.");
if (!TICKETMASTER_API_KEY) throw new Error("Missing TICKETMASTER_API_KEY. Add it to .env before running this script.");

function ticketmasterId(row) {
  const raw = row.external_id || row.ticket_url || "";
  const fromExternalId = String(raw).replace(/^ticketmaster_/, "");
  if (/^[A-Za-z0-9_-]+$/.test(fromExternalId)) return fromExternalId;
  const match = String(row.ticket_url || "").match(/\/event\/([A-Za-z0-9_-]+)/);
  return match?.[1] || "";
}

function positivePrice(...values) {
  return values.map(value => Number(value)).find(value => Number.isFinite(value) && value > 0) || null;
}

function priceRange(event) {
  const range = (event.priceRanges || []).find(item => positivePrice(item.min, item.lowPrice, item.price, item.minPrice));
  if (!range) return { min: null, max: null };
  return {
    min: positivePrice(range.min, range.lowPrice, range.price, range.minPrice),
    max: positivePrice(range.max, range.highPrice, range.maxPrice)
  };
}

function primaryCategory(event) {
  const classification = (event.classifications || []).find(item => item.primary) || event.classifications?.[0] || {};
  const segment = classification.segment?.name?.toLowerCase() || "";
  const genre = classification.genre?.name?.toLowerCase() || "";
  const text = `${segment} ${genre} ${classification.subGenre?.name || ""}`.toLowerCase();
  if (/comedy|arts|theatre|theater/.test(text)) return "performing-arts";
  if (/sports|baseball|basketball|football|hockey|soccer/.test(text)) return "sports";
  if (/music|rock|pop|r&b|hip-hop|rap|jazz|latin|country|dance|electronic/.test(text)) return "concerts";
  return "";
}

async function supabase(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function ticketmasterEvent(id) {
  const url = new URL(`https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(id)}.json`);
  url.searchParams.set("apikey", TICKETMASTER_API_KEY);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ticketmaster ${id}: ${response.status} ${await response.text()}`);
  return response.json();
}

const rows = await supabase("events?select=id,external_id,ticket_url&source=eq.ticketmaster&order=id.asc");
let updated = 0;

for (const row of rows) {
  const id = ticketmasterId(row);
  if (!id) continue;
  const event = await ticketmasterEvent(id);
  const range = priceRange(event);
  const category = primaryCategory(event);
  const payload = {
    raw_json: event,
    updated_at: new Date().toISOString()
  };
  if (range.min) payload.price_min = range.min;
  if (range.max) payload.price_max = range.max;
  if (category) payload.category = category;
  await supabase(`events?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify(payload) });
  updated += 1;
  console.log(`Updated ${row.id}: ${event.name || id}${range.min ? ` from $${range.min}` : " price unknown"}`);
}

console.log(`Enriched ${updated} Ticketmaster events.`);
