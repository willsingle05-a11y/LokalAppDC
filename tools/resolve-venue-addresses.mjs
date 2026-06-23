import { readFile, writeFile } from "node:fs/promises";

const [inputFile, outputFile] = process.argv.slice(2);
if (!inputFile || !outputFile) throw new Error("Usage: node tools/resolve-venue-addresses.mjs input.json output.json");

function text(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function dcAddress(address) {
  const value = text(address);
  return /\bWashington,?\s*(DC|D\.C\.)\b|\bDC\s*20\d{3}\b|\b200\d{2}\b/i.test(value) ? value : "";
}

function addressFromJsonLd(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(addressFromJsonLd).find(Boolean) || "";
  if (typeof value !== "object") return "";
  const address = value.address;
  if (address && typeof address === "object") {
    const candidate = [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode]
      .filter(Boolean)
      .join(", ");
    const verified = dcAddress(candidate);
    if (verified) return verified;
  }
  for (const nested of Object.values(value)) {
    const found = addressFromJsonLd(nested);
    if (found) return found;
  }
  return "";
}

function addressFromHtml(html) {
  for (const script of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const found = addressFromJsonLd(JSON.parse(script[1].trim()));
      if (found) return { address: found, confidence: "official-jsonld" };
    } catch {}
  }
  const match = html.match(/\b\d{1,5}\s+[A-Za-z0-9.'#& -]+\s+(?:NW|NE|SW|SE)\b[^<\n]{0,90}\b(?:Washington,?\s*(?:DC|D\.C\.)|DC\s*20\d{3}|200\d{2})\b/i);
  const address = dcAddress(match?.[0]);
  return address ? { address, confidence: "official-page-text" } : null;
}

async function resolve(row) {
  if (!row.website_url) return { ...row, status: "no-website" };
  try {
    const response = await fetch(row.website_url, {
      headers: { "User-Agent": "Lokal venue directory address verifier" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow"
    });
    if (!response.ok) return { ...row, status: `http-${response.status}` };
    const match = addressFromHtml(await response.text());
    return match ? { ...row, ...match, source_url: response.url, status: "resolved" } : { ...row, status: "no-address-found" };
  } catch (error) {
    return { ...row, status: "fetch-failed", error: error.message };
  }
}

const venues = JSON.parse(await readFile(inputFile, "utf8"));
const results = [];
for (const venue of venues) {
  results.push(await resolve(venue));
  await new Promise(resolve => setTimeout(resolve, 350));
}

await writeFile(outputFile, JSON.stringify(results, null, 2));
console.log(`Resolved ${results.filter(item => item.status === "resolved").length} of ${results.length} venues.`);
