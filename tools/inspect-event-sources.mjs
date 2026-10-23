import { mkdir, writeFile } from "node:fs/promises";
import { load } from "cheerio";
const sources = {
  smithsonian: "https://www.si.edu/events",
  nuandroids: "https://www.nuandroids.com/events",
  wharf: "https://www.wharfdc.com/upcoming-events/",
  washingtonian: "https://www.washingtonian.com/calendar/",
  adamsmorgan: "https://adamsmorgan.com/events/",
  anacostia: "https://www.anacostiabid.org/events",
  riverfront: "https://www.capitolriverfront.org/events",
  downtown: "https://www.downtowndc.org/events/",
  dupont: "https://dupontcirclebid.org/events",
  georgetown: "https://www.georgetowndc.com/events/",
  mvt: "https://www.mountvernontriangle.org/events/",
  shaw: "https://www.shawmainstreets.org/events",
  southwest: "https://www.swbid.org/events",
  unionmarket: "https://unionmarketdc.com/events/",
  freshfarm: "https://www.freshfarm.org/markets",
  dcmusic: "https://www.dcmusic.live/",
};
await mkdir(".audit/sources", { recursive: true });
await Promise.all(Object.entries(sources).map(async ([id, url]) => {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "LokalDC/1.0 (+event discovery)" }, signal: AbortSignal.timeout(30000) });
    const html = await response.text();
    await writeFile(`.audit/sources/${id}.html`, html);
    const $ = load(html);
    console.log(JSON.stringify({id,url:response.url,status:response.status,title:$("title").text(),jsonld:$("script[type='application/ld+json']").map((_, el)=>$(el).text().slice(0,600)).get(),feeds:$("link[type='text/calendar'],link[type='application/rss+xml']").map((_,el)=>$(el).attr("href")).get(), scripts:$("script[src]").map((_,el)=>$(el).attr("src")).get().filter(s=>/event|trumba|calendar/.test(s)),links:$("a[href]").map((_,el)=>$(el).attr("href")).get().filter(s=>/ical|trumba|wp-json|\/event\/|\/do\/|shotgun/.test(s)).slice(0,12)}));
  } catch (error) { console.log(JSON.stringify({ id, error: error.message })); }
}));
