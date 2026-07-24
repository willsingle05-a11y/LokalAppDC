import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const [inputFile, outputDirectory, publicBaseUrl] = process.argv.slice(2);
if (!inputFile || !outputDirectory || !publicBaseUrl) {
  throw new Error("Usage: node tools/extract-venue-images-csv.mjs <venues.csv> <output-directory> <public-storage-base-url>");
}

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
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const rows = parseCsv(await readFile(inputFile, "utf8"));
const [header, ...data] = rows;
const venueIndex = header.findIndex(value => value.trim().toLowerCase() === "venue");
const imageIndex = header.findIndex(value => value.trim().toLowerCase() === "image url");
if (venueIndex < 0 || imageIndex < 0) throw new Error("CSV needs Venue and Image Url columns.");

await mkdir(outputDirectory, { recursive: true });
const images = [];
for (const row of data) {
  const venue = String(row[venueIndex] || "").trim();
  const value = String(row[imageIndex] || "").trim();
  const match = value.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/is);
  if (!venue || !match) continue;

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const path = `${slug(venue)}.${extension}`;
  await writeFile(join(outputDirectory, path), Buffer.from(match[2], "base64"));
  images.push({ venue, image_url: `${publicBaseUrl.replace(/\/$/, "")}/${path}` });
}

const sql = `update public.venues venue\nset image_url = item->>'image_url',\n    updated_at = now()\nfrom jsonb_array_elements('${JSON.stringify(images).replace(/'/g, "''")}'::jsonb) item\nwhere public.venue_image_key(venue.name) = public.venue_image_key(item->>'venue');\n\nselect public.refresh_venue_event_images();\n`;
await writeFile(join(outputDirectory, "update-venue-images.sql"), sql);
console.log(`Extracted ${images.length} venue images to ${basename(outputDirectory)}.`);
