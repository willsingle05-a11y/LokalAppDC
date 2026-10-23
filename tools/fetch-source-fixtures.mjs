import { mkdir, writeFile } from "node:fs/promises";
import { load } from "cheerio";
await mkdir(".audit/sources", { recursive: true });
for (const argument of process.argv.slice(2)) {
  const [id, ...rest] = argument.split("=");
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid fixture name");
  const url = rest.join("=");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": "LokalDC/1.0" } });
    const html = await response.text();
    await writeFile(`.audit/sources/${id}.html`, html);
    const $ = load(html);
    console.log(JSON.stringify({id,url:response.url,status:response.status,title:$("title").text(),text:$("main,#content,article").text().replace(/\s+/g," ").slice(0,1000),jsonld:$("script[type='application/ld+json']").map((_,e)=>$(e).text().slice(0,2200)).get(),markers:html.match(/.{0,70}(?:trumba|webName|application\/json|startDate|datePublished|datetime|field_venue|event-venue|cityspark|\.ics|market_season).{0,180}/gi)?.slice(0,12)}));
  } catch(error) { console.log(JSON.stringify({id,error:error.message})); }
}
