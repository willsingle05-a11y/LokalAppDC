// Triggers trusted, allowlisted source collectors in the authenticated Edge Function.
// No database password or service-role key is needed on GitHub runners.
import { readFile, mkdir, writeFile } from "node:fs/promises";
const config=await readFile(new URL("../src/features/05-supabase.js",import.meta.url),"utf8");
const base=process.env.SUPABASE_URL||config.match(/url: "([^"]+)"/)[1];
const token=process.env.SUPABASE_ANON_KEY||config.match(/anonKey: "([^"]+)"/)[1];
const apikey=config.match(/publishableKey: "([^"]+)"/)[1];
const sources=process.argv.slice(2).filter(s=>!s.startsWith("--"));
if(!sources.length)throw new Error("Pass one or more source IDs");
await mkdir(".audit",{recursive:true});
const results=[];
for(const source of sources){
  try{
    const response=await fetch(`${base}/functions/v1/rapid-function`,{method:"POST",headers:{apikey,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({sources:[source],days:60}),signal:AbortSignal.timeout(150000)});
    const result=await response.json();
    results.push({source,httpStatus:response.status,...result});
    console.log(JSON.stringify(results.at(-1)));
  }catch(error){results.push({source,error:error.message});console.error(JSON.stringify(results.at(-1)));}
}
await writeFile(".audit/production-sync-results.json",JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
if(results.some(r=>r.error||!r.ok))process.exitCode=1;
