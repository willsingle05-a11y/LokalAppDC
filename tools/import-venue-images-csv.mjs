import { readFile, writeFile } from "node:fs/promises";

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) throw new Error("Usage: node tools/import-venue-images-csv.mjs <venues.csv> <output.sql>");

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

const rows = parseCsv(await readFile(inputFile, "utf8"));
const [header, ...data] = rows;
const normalizedHeader = header.map(value => value.trim().toLowerCase());
const venueIndex = normalizedHeader.findIndex(value => ["venue", "name"].includes(value));
const addressIndex = normalizedHeader.findIndex(value => value === "address");
const priceIndex = normalizedHeader.findIndex(value => value === "price");
const imageIndex = normalizedHeader.findIndex(value => ["image url", "image"].includes(value));
if (venueIndex < 0 || imageIndex < 0) throw new Error("CSV needs Venue/Name and either Image Url or Image columns.");

const images = data
  .map(row => ({
    venue: String(row[venueIndex] || "").trim(),
    address: addressIndex >= 0 ? String(row[addressIndex] || "").trim() : "",
    price: priceIndex >= 0 ? String(row[priceIndex] || "").trim() : "",
    image_url: String(row[imageIndex] || "").trim()
  }))
  .filter(row => row.venue && /^(data:image\/(jpeg|jpg|png|webp);base64,|https?:\/\/)/i.test(row.image_url));
const json = JSON.stringify(images).replace(/'/g, "''");
const sql = `
insert into public.venues (
  name,
  address,
  venue_type,
  neighborhood,
  source_name,
  source_key,
  raw_data,
  image_url,
  imported_at,
  created_at,
  updated_at
)
select
  item->>'venue',
  nullif(item->>'address', ''),
  case when nullif(item->>'address', '') is not null then 'museum' else null end,
  case when nullif(item->>'address', '') is not null then 'DC' else null end,
  case when nullif(item->>'address', '') is not null then 'Lokal museum venue import' else 'Lokal venue image import' end,
  'venue:' || public.venue_image_key(item->>'venue'),
  jsonb_strip_nulls(jsonb_build_object(
    'address', nullif(item->>'address', ''),
    'price', nullif(item->>'price', '')
  )),
  item->>'image_url',
  now(),
  now(),
  now()
from jsonb_array_elements('${json}'::jsonb) item
where nullif(item->>'address', '') is not null
on conflict (source_key) do update
set address = coalesce(excluded.address, public.venues.address),
    venue_type = coalesce(excluded.venue_type, public.venues.venue_type),
    neighborhood = coalesce(excluded.neighborhood, public.venues.neighborhood),
    source_name = excluded.source_name,
    raw_data = public.venues.raw_data || excluded.raw_data,
    image_url = excluded.image_url,
    updated_at = now();

update public.venues venue
set image_url = item->>'image_url',
    updated_at = now()
from jsonb_array_elements('${json}'::jsonb) item
where public.venue_image_key(venue.name) = public.venue_image_key(item->>'venue');

select public.refresh_venue_event_images();
`;
await writeFile(outputFile, sql);
console.log(`Prepared ${images.length} venue image updates.`);
