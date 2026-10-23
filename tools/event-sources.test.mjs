import test from "node:test";
import assert from "node:assert/strict";
import { load } from "cheerio";
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
