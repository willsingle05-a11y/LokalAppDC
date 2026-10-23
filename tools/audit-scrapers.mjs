// Scrapes into a temporary directory only; never applies SQL to the database.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const exec = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), "lokal-scraper-audit-"));
const sources = ["eventsdc-events", "edibledc-events", "runguides-races", "thingstododc-embassy-events"];
const results = await Promise.all(sources.map(async source => {
  const started = Date.now();
  try {
    const { stdout } = await exec(process.execPath, [`tools/import-${source}.mjs`, "--sql", join(directory, `${source}.sql`)], { timeout: 180000, maxBuffer: 10 * 1024 * 1024, windowsHide: true });
    const data = JSON.parse(stdout);
    return { source, status: data.includedRows ? "events-found" : "zero-upcoming-events", elapsedMs: Date.now() - started, ...data };
  } catch (error) {
    return { source, status: "error", elapsedMs: Date.now() - started, error: error.stderr || error.message };
  }
}));
const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
await writeFile(`docs/launch-scraper-probes-${dateKey}.json`, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + "\n");
console.log(JSON.stringify(results.map(({ included, excluded, ...summary }) => summary), null, 2));
if (results.some(result => result.status === "error")) process.exitCode = 1;
