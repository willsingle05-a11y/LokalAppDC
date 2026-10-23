import test from "node:test";
import assert from "node:assert/strict";
import { load } from "cheerio";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { createSourceTools, instant, readJsonValue, SOURCE_REGISTRY, marketOccurrences } from "./lib/event-sources.mjs";
const engine=createSourceTools(load);
const now=new Date("2026-10-23T14:00:00Z");
test("Eastern timestamps preserve DST and explicit offsets",()=>{
  assert.equal(instant("2026-11-07T20:00:00"),"2026-11-08T01:00:00.000Z");
  assert.equal(instant("2026-10-31T20:00:00"),"2026-11-01T00:00:00.000Z");
  assert.equal(instant("2026-11-07T20:00:00","-0500"),"2026-11-08T01:00:00.000Z");
  assert.equal(instant("2026-11-07"),null);
});
test("Smithsonian uses actual camelCase dates, IDs, images and source links",()=>{
  const source=SOURCE_REGISTRY.find(s=>s.id==="smithsonian");
  const parsed=engine.trumba([{eventID:123,title:"Tour &amp; Talk",locationType:"In-Person",location:"American Art Museum",startDateTime:"2026-11-07T14:00:00",startTimeZoneOffset:"-0500",endDateTime:"2026-11-07T15:00:00",endTimeZoneOffset:"-0500",permaLinkUrl:"https://www.si.edu/events?eventid=123",detailImage:{url:"https://www.trumba.com/image.jpg"},customFields:[{label:"Cost",value:"Free"}]}]);
  const row=engine.normalize(parsed[0],source,now);
  assert.equal(row.external_id,"smithsonian_123");
  assert.equal(row.starts_at,"2026-11-07T19:00:00.000Z");
  assert.equal(row.title,"Tour & Talk");
  assert.equal(row.image_url,"https://www.trumba.com/image.jpg");
  assert.equal(row.is_free,true);
});
test("missing dates, outside-DC and virtual events never gain fabricated dates",()=>{
  const s={id:"example",url:"https://example.com/events"};
  const e={name:"Event",startDate:"2026-11-07T19:00:00Z",url:"https://example.com/event/1",location:{name:"Venue",address:"123 Main St, Arlington, VA"}};
  assert.equal(engine.normalize(e,s,now),null);
  assert.equal(engine.normalize({...e,startDate:null,location:{name:"DC Venue",address:"123 H St NW, Washington, DC"}},s,now),null);
  assert.equal(engine.normalize({...e,eventAttendanceMode:"OnlineEventAttendanceMode"},s,now),null);
});
test("literal JSON parsing handles semicolons and braces inside strings without evaluating code",()=>{
  assert.deepEqual(readJsonValue('prefix [{"value":"a; } b"}]; dangerous()',7),[{value:"a; } b"}]);
});
test("official market schedules stop at season end and retain winter wall time",()=>{
  const market={ID:1,post_title:"Test Market",permalink:"https://example.com/market",custom:{market_address:{address:"1600 20th St NW, Washington, DC"},market_open_date:"20261001",market_close_date:"20261108",market_day:"Sunday",market_open_time:"8:30 AM",market_close_time:"1:30 PM"}};
  const rows=marketOccurrences(market,{id:"farmers-markets"},now,60);
  assert.equal(rows.length,3);
  assert.equal(instant(rows[2].startDate),"2026-11-08T13:30:00.000Z");
  assert.ok(rows.every(r=>r.startDate.slice(0,10)<="2026-11-08"));
});
test("date-only races preserve an unknown start instead of inventing 8am",()=>{
  const row=engine.normalize({name:"Race",external_id:"race-1",startDate:"2026-11-07",timeUnknown:true,location:{name:"Race site",address:"Washington, DC"},url:"https://example.com/race"},{id:"runguides",url:"https://example.com"},now);
  assert.equal(row.starts_at,null);
  assert.equal(row.date,"2026-11-07");
  assert.equal(row.time,"Time TBA");
  assert.equal(row.raw_json.time_unknown,true);
});
test("ongoing all-day exhibits keep their real start and end dates",()=>{
  const row=engine.normalize({name:"Exhibition",startDate:"2026-10-01T00:00:00-04:00",endDate:"2026-11-01T00:00:00-04:00",allDay:true,location:{name:"Museum",address:"Washington, DC"},url:"https://example.com/exhibition"},{id:"museum",url:"https://example.com"},now);
  assert.equal(row.starts_at,"2026-10-01T04:00:00.000Z");
  assert.equal(row.time,"All day");
});
const app={};
runInNewContext(await readFile(new URL("../src/features/05-supabase.js",import.meta.url),"utf8"),app);
test("the app keeps all-day events visible until their actual end",()=>{
  assert.equal(app.isEventInDiscoveryWindow({allDay:true,startSort:Date.now()-86400000,endSort:Date.now()+86400000}),true);
  assert.equal(app.hasReliableSupabaseStart({raw_json:{all_day:true}}),false);
});
test("the app preserves exact source price labels",()=>{
  assert.equal(app.normalizeSupabasePrice("From $33.21"),"From $33.21");
});
