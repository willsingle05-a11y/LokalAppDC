import { readFile, writeFile } from "node:fs/promises";

const [sourceFile = "data/trivia-nights.json"] = process.argv.slice(2);
const scheduleSqlIndex = process.argv.indexOf("--schedule-sql");
if (scheduleSqlIndex < 0 || !process.argv[scheduleSqlIndex + 1]) {
  throw new Error("Usage: node tools/import-trivia-nights.mjs <source.json> --schedule-sql <output.sql>");
}

const schedules = JSON.parse(await readFile(sourceFile, "utf8"));
const outputFile = process.argv[scheduleSqlIndex + 1];
const json = JSON.stringify(schedules).replace(/'/g, "''");
const sql = `
insert into public.recurring_trivia_schedules (
  source_key, venue_name, venue_address, neighborhood, recurrence_kind, weekday,
  ordinal_week, starts_at, host, description, tags, source_name, social_source
)
select
  item->>'source_key', item->>'venue_name', item->>'venue_address', item->>'neighborhood',
  item->>'recurrence_kind', (item->>'weekday')::smallint, (item->>'ordinal_week')::smallint,
  (item->>'starts_at')::time, item->>'host', item->>'description',
  array(select jsonb_array_elements_text(item->'tags')), item->>'source_name', item->>'social_source'
from jsonb_array_elements('${json}'::jsonb) as item
on conflict (source_key) do update set
  venue_name = excluded.venue_name,
  venue_address = excluded.venue_address,
  neighborhood = excluded.neighborhood,
  recurrence_kind = excluded.recurrence_kind,
  weekday = excluded.weekday,
  ordinal_week = excluded.ordinal_week,
  starts_at = excluded.starts_at,
  host = excluded.host,
  description = excluded.description,
  tags = excluded.tags,
  source_name = excluded.source_name,
  social_source = excluded.social_source,
  is_active = true,
  updated_at = now();

select public.refresh_recurring_trivia_events(60);
`;

await writeFile(outputFile, sql);
console.log(`Wrote ${outputFile} for ${schedules.length} trivia schedules.`);
