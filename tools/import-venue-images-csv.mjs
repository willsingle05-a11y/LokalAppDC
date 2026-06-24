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
const venueIndex = header.findIndex(value => value.trim().toLowerCase() === "venue");
const imageIndex = header.findIndex(value => value.trim().toLowerCase() === "image url");
if (venueIndex < 0 || imageIndex < 0) throw new Error("CSV needs Venue and Image Url columns.");

const images = data
  .map(row => ({ venue: String(row[venueIndex] || "").trim(), image_url: String(row[imageIndex] || "").trim() }))
  .filter(row => row.venue && /^(data:image\/(jpeg|jpg|png|webp);base64,|https?:\/\/)/i.test(row.image_url));
const json = JSON.stringify(images).replace(/'/g, "''");
const sql = `
update public.venues venue
set image_url = item->>'image_url',
    updated_at = now()
from jsonb_array_elements('${json}'::jsonb) item
where public.venue_image_key(venue.name) = public.venue_image_key(item->>'venue');

select public.refresh_venue_event_images();
`;
await writeFile(outputFile, sql);
console.log(`Prepared ${images.length} venue image updates.`);
