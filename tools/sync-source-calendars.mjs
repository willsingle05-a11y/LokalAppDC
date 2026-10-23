import { load } from "cheerio";
import calendar from "node-ical";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { SOURCE_REGISTRY, createSourceTools } from "./lib/event-sources.mjs";
const args=new Map(process.argv.slice(2).filter(a=>a.startsWith("--")).map(a=>{const i=process.argv.indexOf(a);return [a,process.argv[i+1]];}));
const requested=args.get("--source")?.split(",");
const sources=SOURCE_REGISTRY.filter(s=>!requested||requested.includes(s.id));
if(requested&&sources.length!==requested.length)throw new Error("Unknown requested source");
await mkdir(".audit",{recursive:true});
const app=await readFile("src/features/05-supabase.js","utf8");
const base=process.env.SUPABASE_URL||app.match(/url: "([^"]+)"/)[1];
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||app.match(/publishableKey: "([^"]+)"/)[1];
const response=await fetch(`${base}/rest/v1/venues?select=name,address,neighborhood&limit=1000`,{headers:{apikey:key},signal:AbortSignal.timeout(30000)});
const venues=response.ok?await response.json():[];
const engine=createSourceTools(load,fetch,calendar),results=[];
for(const source of sources){
  try{
    const result=await engine.collect(source,{ticketmasterKey:process.env.TICKETMASTER_API_KEY,venues});
    await writeFile(`.audit/${source.id.replace(/[^a-z0-9]/gi,"-")}.json`,JSON.stringify(result.rows,null,2));
    const {rows,...summary}=result;results.push(summary);console.log(JSON.stringify(summary));
  }catch(error){const result={source:source.id,error:error.message};results.push(result);console.log(JSON.stringify(result));}
}
await writeFile(".audit/source-calendar-results.json",JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
if(results.some(r=>r.error))process.exitCode=1;
