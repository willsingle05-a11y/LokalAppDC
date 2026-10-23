// Deployed as rapid-function so the existing authenticated cron keeps working.
import { load } from "npm:cheerio@1.2.0/slim";
import { SOURCE_REGISTRY, createSourceTools } from "../../../tools/lib/event-sources.mjs";

const base = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export async function handle(request: Request) {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  const body = await request.json().catch(() => ({}));
  const requested = body.sources || ["ticketmaster", "smithsonian"];
  if (!Array.isArray(requested) || !requested.length || requested.length > SOURCE_REGISTRY.length || requested.some(id => !SOURCE_REGISTRY.some(s => s.id === id))) return json({ error: "Unknown source" }, 400);
  const days = Math.min(90, Math.max(21, Number(body.days) || 60));
  const engine = createSourceTools(load);
  const directory = await fetch(`${base}/rest/v1/venues?select=name,address,neighborhood&limit=1000`, { headers });
  const venues = directory.ok ? await directory.json() : [];
  const results = [];
  for (const id of [...new Set(requested)]) {
    const started = Date.now();
    try {
      const source = SOURCE_REGISTRY.find(s => s.id === id)!;
      const result = await engine.collect(source, { days, venues, ticketmasterKey: Deno.env.get("TICKETMASTER_API_KEY") || "" });
      if (!result.rows.length) throw new Error(`No valid upcoming events (${result.parsed} parsed, ${result.errors.length} detail failures). Existing events were preserved.`);
      let upserted = 0;
      for (let offset = 0; offset < result.rows.length; offset += 100) {
        const response = await fetch(`${base}/rest/v1/events?on_conflict=source,external_id`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(result.rows.slice(offset, offset + 100)) });
        if (!response.ok) throw new Error(`Database upsert HTTP ${response.status}: ${(await response.text()).slice(0,400)}`);
        upserted += result.rows.slice(offset, offset + 100).length;
      }
      results.push({ source: id, status: result.errors.length ? "partial" : "success", parsed: result.parsed, upserted, detailFailures: result.errors.length, duration_ms: Date.now() - started });
    } catch (error) {
      results.push({ source: id, status: "error", error: error instanceof Error ? error.message : String(error), duration_ms: Date.now() - started });
    }
  }
  // A failed write must never be reported as a successful sync.
  const ok = results.every(result => result.status === "success");
  return json({ ok, results }, ok ? 200 : 502);
}

Deno.serve(handle);
