import { readFile, writeFile } from "node:fs/promises";

const [outputFile, ...inputFiles] = process.argv.slice(2);
if (!outputFile || !inputFiles.length) throw new Error("Usage: node tools/parse-happy-hour-csvs.mjs output.json input.csv [...input.csv]");

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayKey = { monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun" };

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim()); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
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

function isWeekdayHeader(row) {
  const values = row.map(value => String(value || "").trim().toLowerCase());
  return weekdays.filter(day => values.includes(day)).length >= 3;
}

function dayColumns(row) {
  const values = row.map(value => String(value || "").trim().toLowerCase());
  const positions = new Map();
  weekdays.forEach(day => {
    const index = values.indexOf(day);
    if (index >= 0) positions.set(day, index);
  });
  return positions;
}

function looksLikeVenueHeader(row, nextRows) {
  const first = String(row[0] || "").trim();
  if (!first || /^(date|time|title|description|monday|tuesday|wednesday|thursday|friday|saturday|sunday|closed|no hh|all day|all night)$/i.test(first) || /weekly schedule based off/i.test(first)) return false;
  if (isWeekdayHeader(row)) return !weekdays.includes(first.toLowerCase());
  return nextRows.some(isWeekdayHeader);
}

function looksLikeSpecials(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text || /^(all night|all day|closed|no hh)$/i.test(text) || /^\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*-\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?$/i.test(text)) return false;
  return /\$|%|\boff\b|happy hour|cocktail|beer|wine|food|drink|rail|draft|bottle|app(?:s|etizers)?|taco|burger|wing|pizza|shot|pitcher|frozen|deal|discount|bogo|special|liquor|seltzer|margarita|spritz|daiquiri|whiskey|vodka|tequila|punch/.test(text);
}

function normalizeClock(token, fallbackMeridiem = "pm") {
  const match = String(token || "").trim().toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3] || fallbackMeridiem;
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeRanges(value) {
  const text = String(value || "").toLowerCase();
  if (!text || /closed|no hh|all night|weekly schedule|unique schedule/.test(text)) return [];
  const matches = [...text.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/g)];
  return matches.map(match => {
    const startToken = match[1];
    const endToken = match[2];
    const endMeridiem = /am|pm/.exec(endToken)?.[0] || "pm";
    const startHour = Number(/\d{1,2}/.exec(startToken)?.[0] || 0);
    const endHour = Number(/\d{1,2}/.exec(endToken)?.[0] || 0);
    const startFallback = !/am|pm/.test(startToken) && endMeridiem === "am" && startHour > endHour ? "pm" : endMeridiem;
    const start = normalizeClock(startToken, startFallback);
    let end = normalizeClock(endToken, endMeridiem);
    if (!start || !end) return null;
    if (end <= start && endMeridiem === "pm" && !/am/.test(endToken)) end = normalizeClock(endToken, "am");
    return { start, end };
  }).filter(Boolean);
}

function tagsFor(specials, startsAt, venueName = "") {
  const text = `${specials || ""} ${venueName || ""}`.toLowerCase();
  const tags = [];
  const add = (tag, pattern) => { if (pattern.test(text)) tags.push(tag); };
  add("Cocktails", /cocktail|martini|margarita|spritz|daiquiri|mixed drink/);
  add("Margaritas", /margarita/);
  add("Spritzes", /spritz/);
  add("Whiskey", /whiskey|old fashioned/);
  add("Tequila", /tequila|paloma/);
  add("Wine", /wine|ros[eé]|bottle/);
  add("Beer", /beer|draft|lager|ipa|pint|cans?/);
  add("Draft beer", /draft|lager|ipa|pint/);
  add("Bites", /food|apps?|snack|slider|bites|grilled cheese|fries/);
  add("Burgers", /burger/);
  add("Tacos", /taco/);
  add("Wings", /wing/);
  add("Pizza", /pizza/);
  add("Shots", /shots?/);
  add("Pitchers", /pitcher/);
  add("Frozen drinks", /frozen/);
  add("Rooftop", /rooftop|12 stories/);
  add("Patio", /patio|terrace|outdoor/);
  add("Beer garden", /beer garden|wundergarten|brig/);
  add("Karaoke", /karaoke/);
  add("Arcade", /arcade/);
  add("Billiards", /billiards/);
  add("Late night", /late|11pm|midnight|\b2am\b/);
  add("Half-price", /half\s*(?:off|price)|50%/);
  const hour = Number(startsAt.slice(0, 2));
  tags.push(hour < 16 ? "Early evening" : hour >= 18 ? "Evening" : "After work");
  return [...new Set(tags)].slice(0, 7);
}

function addressFromHeader(row) {
  return row.find(value => /\b\d{1,5}\s+.+\s+(?:NW|NE|SW|SE)\b/i.test(String(value || ""))) || "";
}

function websiteFromHeader(row) {
  return row.find(value => /^(?:https?:\/\/)?(?:www\.)?[\w-]+\.[a-z]{2,}/i.test(String(value || ""))) || "";
}

function neighborhoodFor(file) {
  const value = file.toLowerCase();
  if (value.includes("dupont")) return "Dupont Circle";
  if (value.includes("navy yard")) return "Navy Yard";
  if (value.includes("adams morgan")) return "Adams Morgan";
  if (value.includes("georgetown")) return "Georgetown";
  if (value.includes("logan circle")) return "Logan Circle";
  if (value.includes("wharf")) return "Wharf";
  if (value.includes("noma")) return "NoMa";
  if (value.includes("colombia heights")) return "Columbia Heights";
  if (value.includes("capital hill")) return "Capitol Hill";
  return "Shaw";
}

function parseFile(rows, file) {
  const sourceRows = [];
  let venue = null;
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (looksLikeVenueHeader(row, rows.slice(index + 1, index + 4))) {
      venue = {
        name: String(row[0] || "").trim(),
        address: addressFromHeader(row),
        website: websiteFromHeader(row),
        neighborhood: neighborhoodFor(file)
      };
      if (!isWeekdayHeader(row)) continue;
    }
    if (!venue || !isWeekdayHeader(row)) continue;
    const columns = dayColumns(row);
    const next = rows[index + 1] || [];
    const afterNext = rows[index + 2] || [];
    const labelled = /^(description|time|title)$/i.test(next[0] || "");
    let times = new Map();
    let descriptions = new Map();
    let titles = new Map();
    const capture = line => {
      const label = String(line[0] || "").trim().toLowerCase();
      columns.forEach((column, day) => {
        const value = String(line[column] || "").trim();
        if (!value) return;
        if (label === "time") times.set(day, value);
        else if (label === "description") descriptions.set(day, value);
        else if (label === "title") titles.set(day, value);
      });
    };
    if (labelled) {
      let consumed = 0;
      while (/^(description|time|title)$/i.test(rows[index + consumed + 1]?.[0] || "")) {
        capture(rows[index + consumed + 1]);
        consumed++;
      }
      index += consumed;
    } else {
      columns.forEach((column, day) => times.set(day, String(next[column] || "").trim()));
      columns.forEach((column, day) => descriptions.set(day, String(afterNext[column] || "").trim()));
      const sharedSpecial = next.find(value => value && !timeRanges(value).length && !/closed|no hh/i.test(value));
      if (sharedSpecial) columns.forEach((_, day) => { if (!descriptions.get(day)) descriptions.set(day, sharedSpecial); });
      index += 2;
    }
    columns.forEach((column, day) => {
      const schedule = times.get(day) || "";
      const specials = descriptions.get(day) || descriptions.values().next().value || "";
      const title = titles.get(day) || "";
      if (title && !/happy\s*hour/i.test(title)) return;
      if (!looksLikeSpecials(specials)) return;
      timeRanges(schedule).forEach((range, slot) => {
        sourceRows.push({
          source_key: `${slug(venue.name)}-${dayKey[day]}${slot ? `-${slot + 1}` : ""}`,
          venue_name: venue.name,
          venue_address: venue.address,
          neighborhood: venue.neighborhood,
          weekday: day,
          starts_at: range.start,
          ends_at: range.end,
          specials,
          price_label: specials.match(/\$\d+(?:\.\d+)?/) ? `Specials from ${specials.match(/\$\d+(?:\.\d+)?/)[0]}` : "Happy hour specials",
          tags: tagsFor(specials, range.start, venue.name),
          source_url: venue.website ? (venue.website.startsWith("http") ? venue.website : `https://${venue.website}`) : "",
          source_name: file
        });
      });
    });
  }
  return sourceRows;
}

const existing = JSON.parse(await readFile(outputFile, "utf8").catch(() => "[]"));
const parsed = [];
for (const file of inputFiles) parsed.push(...parseFile(parseCsv(await readFile(file, "utf8")), file));
const merged = [...existing, ...parsed].reduce((all, row) => {
  const index = all.findIndex(item => item.source_key === row.source_key);
  if (index >= 0) all[index] = { ...all[index], ...row, venue_address: row.venue_address || all[index].venue_address, source_url: row.source_url || all[index].source_url };
  else all.push(row);
  return all;
}, []);
await writeFile(outputFile, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Parsed ${parsed.length} recurring happy-hour schedules; wrote ${merged.length} source rows.`);
