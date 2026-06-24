import { readFile, writeFile } from "node:fs/promises";

const [inputFile, outputFile = "data/trivia-nights.json"] = process.argv.slice(2);
if (!inputFile) throw new Error("Usage: node tools/parse-trivia-csv.mjs <input.csv> [output.json]");

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ordinalMap = { first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, fifth: 5, "5th": 5, last: -1 };
const neighborhoodMap = {
  admo: "Adams Morgan", "the wharf": "Wharf", "east hilll": "Capitol Hill", "east hill": "Capitol Hill",
  "u street": "U Street", "georgia ave": "Petworth", "h street": "H Street", "mount vernon triangle": "Mount Vernon Triangle"
};

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; value = "";
    } else value += character;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/â€™/g, "'").trim();
}

function normalizeNeighborhood(value) {
  const cleaned = clean(value);
  return neighborhoodMap[cleaned.toLowerCase()] || cleaned || "Washington, DC";
}

function parseTime(value) {
  const normalized = clean(value).replace(/;/g, ":").toLowerCase();
  const match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const suffix = match[3] || "pm";
  if (suffix === "pm" && hour !== 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function recurrenceRules(value) {
  const text = clean(value).toLowerCase();
  if (/every other|biweekly|fortnightly/.test(text)) return [];
  const ordinal = text.match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (ordinal) return [{ kind: "monthly-ordinal", weekday: weekdays.indexOf(ordinal[2]), ordinal: ordinalMap[ordinal[1]] }];
  return weekdays.filter(day => new RegExp(`\\b${day}\\b`).test(text)).map(day => ({ kind: "weekly", weekday: weekdays.indexOf(day), ordinal: null }));
}

function hostForDay(company, weekday) {
  const text = clean(company);
  const dayName = weekdays[weekday].slice(0, 3).toUpperCase();
  const daySpecific = [...text.matchAll(/([^\n()]+?)\s*\(\s*([A-Z]{3,9})\s*\)/g)].find(match => match[2].startsWith(dayName));
  return clean(daySpecific?.[1] || text.replace(/\s*\([^)]*\)/g, ""));
}

function tagsFor(row, host) {
  const text = `${row.prize} ${row.rounds} ${row.teamSize} ${host}`.toLowerCase();
  const tags = [host || "Independent host"];
  if (row.prize) tags.push("Prizes");
  if (row.teamSize) tags.push("Team play");
  if (/music/.test(text)) tags.push("Music round");
  if (/picture/.test(text)) tags.push("Picture round");
  if (/bonus|toss up|lightning/.test(text)) tags.push("Bonus rounds");
  return [...new Set(tags)].filter(Boolean).slice(0, 5);
}

const rows = parseCsv(await readFile(inputFile, "utf8"));
const [header, ...dataRows] = rows;
const column = Object.fromEntries(header.map((name, index) => [clean(name).toLowerCase(), index]));
const schedules = [];
const skipped = [];

for (const values of dataRows) {
  const get = name => clean(values[column[name]] || "");
  const day = get("day");
  const venue = get("bar");
  const time = parseTime(get("time"));
  const recurrence = recurrenceRules(day);
  if (!venue || !time || !recurrence.length) { skipped.push({ venue, day, time: get("time") }); continue; }
  const row = {
    venue,
    neighborhood: normalizeNeighborhood(get("neighborhood")),
    prize: get("prize"),
    teamSize: get("team size limit"),
    rounds: get("# of rounds"),
    social: get("social media"),
    company: get("company")
  };
  for (const rule of recurrence) {
    const host = hostForDay(row.company, rule.weekday);
    const description = [
      host ? `Trivia hosted by ${host}.` : "Recurring trivia night.",
      row.prize ? `Prizes: ${row.prize}` : "",
      row.teamSize ? `Team size: ${row.teamSize}.` : "",
      row.rounds ? `Format: ${row.rounds}.` : ""
    ].filter(Boolean).join(" ");
    schedules.push({
      source_key: `${slug(venue)}-${rule.kind === "weekly" ? weekdays[rule.weekday].slice(0, 3) : `${rule.ordinal}-${weekdays[rule.weekday].slice(0, 3)}`}-${time.replace(":", "")}`,
      venue_name: venue,
      venue_address: `${row.neighborhood}, Washington, DC`,
      neighborhood: row.neighborhood,
      recurrence_kind: rule.kind,
      weekday: rule.weekday,
      ordinal_week: rule.ordinal,
      starts_at: time,
      host,
      description,
      tags: tagsFor(row, host),
      source_name: "DC Trivia Spread Sheet",
      social_source: row.social || null
    });
  }
}

await writeFile(outputFile, `${JSON.stringify(schedules, null, 2)}\n`);
console.log(`Parsed ${schedules.length} trivia schedules. Skipped ${skipped.length} ambiguous rows.`);
if (skipped.length) console.log(JSON.stringify(skipped, null, 2));
