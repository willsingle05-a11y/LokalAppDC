import { readFile, writeFile } from "node:fs/promises";

const [sourceFile = "data/happy-hours.json", ...onlyVenues] = process.argv.slice(2);
const rows = JSON.parse(await readFile(sourceFile, "utf8"));
const approvedOverrides = {
  "Solly's": "https://www.sollystavern.com/images/SollysLOGONEW.jpg",
  "Solly's U Street Tavern": "https://www.sollystavern.com/images/SollysLOGONEW.jpg",
  "Kirwan's on the Wharf": "https://images.squarespace-cdn.com/content/v1/5a81db396f4ca36e2493fa2e/1518462379427-ESGVPOVMY0DP4EL89IFF/kirwans-on-the-wharf-190.png?format=750w",
  "Kramerbooks & Afterwords": "https://cdn1.bookmanager.com/i/1562584//Kramers_Wordmark_Red_RGB.png?mtime=1738880236"
};
const fallbackOnlyVenues = new Set(["Shenanigans"]);
const selectedVenues = new Set(onlyVenues.map(value => value.toLowerCase()));
const shouldProcess = row => !selectedVenues.size || selectedVenues.has(String(row.venue_name || "").toLowerCase());

function attributes(markup) {
  return Object.fromEntries([...markup.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(([, key, value]) => [key.toLowerCase(), value]));
}

function absoluteUrl(value, pageUrl) {
  try { return new URL(value, pageUrl).href; } catch { return ""; }
}

function jsonLdLogos(html, pageUrl) {
  const logos = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const values = Array.isArray(JSON.parse(match[1])) ? JSON.parse(match[1]) : [JSON.parse(match[1])];
      for (const value of values) {
        const logo = value?.logo || value?.publisher?.logo;
        const url = typeof logo === "string" ? logo : logo?.url;
        if (url) logos.push(absoluteUrl(url, pageUrl));
      }
    } catch { /* Ignore malformed structured data. */ }
  }
  return logos.filter(Boolean);
}

function logoCandidates(html, pageUrl) {
  const candidates = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const rel = String(attrs.rel || "").toLowerCase();
    const href = absoluteUrl(attrs.href || "", pageUrl);
    if (!href) continue;
    if (rel.includes("apple-touch-icon")) candidates.push({ url: href, score: 100 });
    else if (rel.includes("icon")) {
      const size = Number(String(attrs.sizes || "").match(/(\d+)/)?.[1] || 0);
      candidates.push({ url: href, score: 50 + Math.min(size, 256) / 10 });
    }
  }
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = String(attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    const image = absoluteUrl(attrs.content || "", pageUrl);
    if (image && /^(og:logo|logo|organization:logo)$/.test(key)) candidates.push({ url: image, score: 95 });
  }
  for (const url of jsonLdLogos(html, pageUrl)) candidates.push({ url, score: 90 });
  return candidates.sort((a, b) => b.score - a.score);
}

async function logoFor(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "LokalAppDC/1.0 venue-logo-resolver" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) return "";
  const type = response.headers.get("content-type") || "";
  if (!type.includes("html")) return "";
  const candidates = logoCandidates(await response.text(), response.url || url);
  return candidates[0]?.url || "";
}

const byUrl = new Map();
for (const row of rows) if (shouldProcess(row) && row.source_url && !approvedOverrides[row.venue_name] && !fallbackOnlyVenues.has(row.venue_name)) byUrl.set(row.source_url, null);
const sources = [...byUrl.keys()];
let cursor = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < sources.length) {
    const url = sources[cursor++];
    try { byUrl.set(url, await logoFor(url)); }
    catch { byUrl.set(url, ""); }
  }
}));

let resolved = 0;
for (const row of rows) {
  if (!shouldProcess(row)) continue;
  const logoUrl = fallbackOnlyVenues.has(row.venue_name) ? "" : (approvedOverrides[row.venue_name] || (row.source_url ? byUrl.get(row.source_url) : ""));
  if (logoUrl) {
    row.logo_url = logoUrl;
    resolved++;
  } else delete row.logo_url;
}

await writeFile(sourceFile, `${JSON.stringify(rows, null, 2)}\n`);
console.log(`Resolved ${resolved} official logo references across ${sources.length} source websites.`);
