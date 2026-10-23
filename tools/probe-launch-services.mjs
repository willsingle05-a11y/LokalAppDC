// Read-only probes. Uses only the same public key shipped in the app.
import { readFile, writeFile } from "node:fs/promises";
const config = await readFile(new URL("../src/features/05-supabase.js", import.meta.url), "utf8");
const base = config.match(/url: "([^"]+)"/)[1];
const key = config.match(/publishableKey: "([^"]+)"/)[1];
const headers = { apikey: key };
const results = await Promise.all(["smithsonian", "ticketmaster"].map(async source => {
  const response = await fetch(`${base}/rest/v1/events?select=*&source=eq.${source}&order=updated_at.desc&limit=3`, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
  const rows = await response.json();
  return { source, columns: Object.keys(rows[0] || {}), rows: rows.map(row => ({ id: row.id, title: row.title, date: row.date, time: row.time, starts_at: row.starts_at, start_time: row.start_time, venue_name: row.venue_name, venue_address: row.venue_address, latitude: row.latitude, longitude: row.longitude, external_url: row.external_url, url: row.url, rawKeys: Object.keys(row.raw_json || {}), rawDate: row.raw_json?.startDate || row.raw_json?.start_date || row.raw_json?.dates || row.raw_json?.start })) };
}));
const legal = await Promise.all(["", "legal/privacy.html", "legal/terms.html", "legal/report.html"].map(async path => {
  const url = `https://willsingle05-a11y.github.io/LokalAppDC/${path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  return { url, status: response.status };
}));
const report = { checkedAt: new Date().toISOString(), results, legal };
const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
await writeFile(`docs/launch-service-probes-${dateKey}.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
