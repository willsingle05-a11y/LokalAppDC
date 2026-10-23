import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
test("feature scripts parse together in the actual app import order", async () => {
  const files = [...main.matchAll(/from "\.\/features\/([^"?]+)\?raw"/g)].map(match => match[1]);
  const sources = await Promise.all(files.map(file => readFile(new URL(`../src/features/${file}`, import.meta.url), "utf8")));
  assert.equal(files.length, 12);
  assert.doesNotThrow(() => new Script(sources.join("\n")));
});

const interactions = await readFile(new URL("../src/features/90-interactions.js", import.meta.url), "utf8");
const branch = interactions.slice(interactions.indexOf("  if (t.dataset.confirmDeactivate !== undefined)"), interactions.indexOf("  if (t.dataset.settings !== undefined"));
const executeDeletion = new (Object.getPrototypeOf(async function() {}).constructor)("t", "submitAccountDeletionRequest", "modalRoot", "toast", "mark", branch);
test("deletion request only confirms after persistence succeeds", async () => {
  const button = { dataset: { confirmDeactivate: "" }, disabled: false };
  const modal = { innerHTML: "confirmation" };
  const messages = [];
  let finish;
  const pending = executeDeletion(button, () => new Promise(resolve => { finish = resolve; }), modal, message => messages.push(message), () => {});
  assert.equal(button.disabled, true);
  assert.deepEqual(messages, []);
  assert.equal(modal.innerHTML, "confirmation");
  finish();
  await pending;
  assert.equal(modal.innerHTML, "");
  assert.match(messages[0], /requested.*pending/);
});
test("failed deletion request allows retry and does not claim success", async () => {
  const button = { dataset: { confirmDeactivate: "" }, disabled: false };
  const modal = { innerHTML: "confirmation" };
  const messages = [];
  await executeDeletion(button, async () => { throw new Error("HTTP 403"); }, modal, message => messages.push(message), () => {});
  assert.equal(button.disabled, false);
  assert.equal(modal.innerHTML, "confirmation");
  assert.match(messages[0], /could not be submitted/);
});

const embassy = await readFile(new URL("./import-thingstododc-embassy-events.mjs", import.meta.url), "utf8");
const embassyFunctions = embassy.slice(0, embassy.indexOf("const listings = await")).replace(/^import .*;\r?\n/gm, "");
const parser = {};
runInNewContext(embassyFunctions, Object.assign(parser, { process: { argv: [], env: process.env }, URL }));
test("embassy listings retain Eastern wall time across daylight saving change", () => {
  assert.equal(parser.parseDetailDate("October 31, 2026 @ 8:00PM").starts_at, "2026-11-01T00:00:00.000Z");
  assert.equal(parser.parseDetailDate("November 7, 2026 @ 8:00PM").starts_at, "2026-11-08T01:00:00.000Z");
  assert.equal(parser.parseListingDate("Sat, Nov 7, 2026 at 8:00PM").starts_at, "2026-11-08T01:00:00.000Z");
});
