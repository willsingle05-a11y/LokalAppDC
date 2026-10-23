// Shared by the Node importer and the Supabase Edge Function. No runtime-specific imports.
export const TIMEZONE = "America/New_York";
const DAY = 86400000;
export function instant(value, offset = "") {
  if (!value || !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(value))) return null;
  let text = String(value);
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    if (offset && /^[+-]\d{4}$/.test(offset)) text += `${offset.slice(0,3)}:${offset.slice(3)}`;
    else {
      const wanted = Date.parse(text + "Z");
      let candidate = wanted;
      for (let i = 0; i < 3; i++) {
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(candidate));
        const p = Object.fromEntries(parts.map(p => [p.type, p.value]));
        const represented = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
        const delta = wanted - represented;
        candidate += delta;
        if (!delta) break;
      }
      return Number.isFinite(candidate) ? new Date(candidate).toISOString() : null;
    }
  }
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
export function dateKey(value) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date(value));
}
export function isDc(address) {
  const text = String(address || "");
  if (/\b(?:MD|VA|maryland|virginia|arlington|alexandria|bethesda|silver spring|chantilly|new york|front royal|national harbor|upper marlboro)\b/i.test(text)) return false;
  return /\b(?:DC|D\.C\.|district of columbia|washington)\b/i.test(text) || /\b(?:NW|NE|SW|SE)\b/.test(text);
}
export const SOURCE_REGISTRY = [
  {id:"smithsonian",url:"https://www.trumba.com/calendars/smithsonian-events.json",kind:"trumba",category:"museums"},
  {id:"ticketmaster",url:"https://app.ticketmaster.com/discovery/v2/events.json",kind:"ticketmaster"},
  {id:"nuandroids",url:"https://www.nuandroids.com/events",kind:"nuandroids",category:"nightlife"},
  {id:"wharf",url:"https://www.wharfdc.com/upcoming-events/",kind:"rdfa",neighborhood:"Wharf",category:"community",dcScoped:true},
  {id:"washingtonian",url:"https://portal.cityspark.com/PortalScripts/Washingtonian",kind:"cityspark"},
  {id:"Adams Morgan Partnership",url:"https://adamsmorgan.com/events/calendar",kind:"citycenter",neighborhood:"Adams Morgan",dcScoped:true},
  {id:"Dupont Circle BID",url:"https://dupontcirclebid.org/events/calendar",kind:"citycenter",neighborhood:"Dupont Circle",dcScoped:true},
  {id:"Capitol Riverfront BID",url:"https://navyyarddc.org/events",kind:"webflow",neighborhood:"Navy Yard",dcScoped:true,detailPattern:"/event/"},
  {id:"Georgetown BID",url:"https://www.georgetowndc.com/events/",kind:"structured",neighborhood:"Georgetown",dcScoped:true,detailPattern:"/event/"},
  {id:"Mount Vernon Triangle CID",url:"https://www.mountvernontriangle.org/events/list/",kind:"structured",neighborhood:"Mount Vernon Triangle",dcScoped:true,detailPattern:"/event/"},
  {id:"Union Market District",url:"https://unionmarketdc.com/events/",kind:"structured",neighborhood:"Union Market",dcScoped:true,detailPattern:"/event/"},
  {id:"Southwest BID",url:"https://swbid.org/events/",kind:"structured",neighborhood:"Southwest",dcScoped:true,detailPattern:"/event/"},
  {id:"Anacostia BID",url:"https://anacostiabizdir.com/event-calendar/",kind:"structured",neighborhood:"Anacostia",dcScoped:true,detailPattern:"/event/"},
  {id:"Shaw Main Streets",url:"https://www.shawmainstreets.org/events",kind:"structured",neighborhood:"Shaw",dcScoped:true,detailPattern:"/events/"},
  {id:"farmers-markets",url:"https://www.freshfarm.org/markets",kind:"markets",category:"food"},
  {id:"dc-music-live",url:"https://www.dcmusic.live/",kind:"music",category:"live-music"},
  {id:"edibledc",url:"https://edibledc.com/events/?ical=1",kind:"ical",category:"food"},
  {id:"eventsdc",url:"https://eventsdc.com/api/events",kind:"eventsdc",dcScoped:true},
  {id:"runguides",url:"https://www.runguides.com/washington-dc/runs/5k/all",kind:"runguides",category:"sports"},
  {id:"thingstododc",url:"https://thingstododc.com/events/",kind:"embassy",category:"culture"},
  {id:"Downtown DC BID",url:"https://www.downtowndc.org/events/?view=list",kind:"structured",neighborhood:"Downtown",dcScoped:true,detailPattern:"/events/"},
];

export function createSourceTools(load, fetchImpl = fetch, calendar = null) {
  const clean = value => load(`<body>${String(value ?? "")}</body>`)("body").text().replace(/\s+/g," ").trim();
  const url = (value, base) => { if(!value)return null;try {const u=new URL(value,base);return ["https:","http:"].includes(u.protocol)?u.href:null;}catch{return null;} };
  async function get(address) {
    let error;
    for(let attempt=0;attempt<3;attempt++) {
      try {
        const response=await fetchImpl(address,{headers:{"User-Agent":"LokalDC/1.0 (+Washington DC event discovery)"},signal:AbortSignal.timeout(25000)});
        if(!response.ok){const error=new Error(`HTTP ${response.status} from ${new URL(address).hostname}`);error.retryable=![403,404,429].includes(response.status);throw error;}
        return await response.text();
      }catch(e){error=e;if(e.retryable===false)break;if(attempt<2)await new Promise(r=>setTimeout(r,500*(attempt+1)));}
    }
    throw error;
  }
  function inferCategory(text, fallback="community") {
    if(/basketball|football|soccer|baseball|hockey|\bgo-go\b|\bnwsl\b|marathon|\b5k\b/i.test(text))return "sports";
    if(/comedy|stand.up/i.test(text))return "performing-arts";
    if(/concert|live music|jazz|orchestra/i.test(text))return "live-music";
    if(/farmers.? market|tasting|brunch|food|wine/i.test(text))return "food";
    if(/exhibition|museum|gallery|art tour/i.test(text))return "museums";
    if(/festival/i.test(text))return "festivals";
    if(/theatre|theater|ballet|musical/i.test(text))return "performing-arts";
    return fallback;
  }
  function normalize(event, source, now=new Date(), days=60) {
    const location=Array.isArray(event.location)?event.location.find(l=>l?.['@type']!=="VirtualLocation"):event.location;
    if(/OnlineEventAttendanceMode/.test(event.eventAttendanceMode||"")||/EventCancelled/.test(event.eventStatus||""))return null;
    const place=typeof location==="string"?{name:location}:location||{};
    const a=typeof place.address==="string"?place.address:[place.address?.streetAddress,place.address?.addressLocality,place.address?.addressRegion,place.address?.postalCode].filter(Boolean).join(", ");
    let address=clean(a||event.venue_address||"");
    const venue=clean(place.name||event.venue_name||"");
    if(!isDc(address)&&source.dcScoped&&venue&&!/\b(?:MD|VA|online|virtual|zoom)\b/i.test(`${address} ${venue}`))address=[address,source.neighborhood,"Washington, DC"].filter(Boolean).join(", ");
    if(!isDc(address)||!venue)return null;
    const timeUnknown=event.timeUnknown===true&&/^\d{4}-\d{2}-\d{2}$/.test(event.startDate||"");
    const start=instant(event.startDate),end=instant(event.endDate);
    if((!start&&!timeUnknown)||!event.name)return null;
    const allDay=event.allDay===true;
    if(timeUnknown){if(event.startDate<dateKey(now)||event.startDate>dateKey(new Date(+now+days*DAY)))return null;}
    else if((Date.parse(start)<+now&&!(allDay&&end&&Date.parse(end)>+now))||Date.parse(start)>+now+days*DAY)return null;
    const link=url(event.url||event['@id'],source.url);
    if(!link)return null;
    const offers=Array.isArray(event.offers)?event.offers[0]:event.offers||{};
    const priceValue=offers.price??offers.lowPrice;
    const price=priceValue!==undefined&&priceValue!==null&&priceValue!==""&&Number.isFinite(Number(priceValue))?Number(priceValue):null;
    const free=event.isAccessibleForFree===true||price===0;
    const image=Array.isArray(event.image)?event.image[0]:event.image;
    return {source:source.id,external_id:String(event.external_id||event.identifier||`${link}#${start||event.startDate}`),title:clean(event.name),description:clean(event.description),category:inferCategory(`${clean(event.name)} ${clean(event.description).slice(0,500)}`,source.category),tag:source.category||"Local event",tags:[source.neighborhood,source.id==="smithsonian"?"Smithsonian":null].filter(Boolean),venue_name:venue,venue,venue_address:address,neighborhood:source.neighborhood||null,date:timeUnknown?event.startDate:dateKey(start),time:timeUnknown?"Time TBA":allDay?"All day":new Intl.DateTimeFormat("en-US",{timeZone:TIMEZONE,hour:"numeric",minute:"2-digit"}).format(new Date(start)),starts_at:start,ends_at:end,timezone:TIMEZONE,is_free:free,price:free?"Free":price===null?null:`From $${price}`,price_min:price,price_max:offers.highPrice===undefined?null:Number(offers.highPrice)||null,ticket_url:url(offers.url||link,source.url),external_url:link,url:link,image_url:url(typeof image==="object"?image?.url||image?.contentUrl:image,source.url),latitude:Number(place.geo?.latitude)||null,longitude:Number(place.geo?.longitude)||null,status:"published",raw_json:{source_url:link,all_day:allDay,time_unknown:timeUnknown,source_event:event},last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  }
  function structured(html, pageUrl) {
    const $=load(html), found=[];
    const walk=value=>{if(!value||typeof value!=="object")return;if(Array.isArray(value)){value.forEach(walk);return;}if([value['@type']].flat().some(t=>/Event$/.test(t||""))&&value.startDate)found.push({...value,url:value.url||pageUrl});Object.values(value).forEach(v=>{if(v&&typeof v==="object")walk(v);});};
    $("script[type='application/ld+json']").each((_,e)=>{try{walk(JSON.parse($(e).text()));}catch{try{walk(JSON.parse(clean($(e).text())));}catch{}}});
    return found;
  }
  function trumba(rows) {
    return rows.filter(e=>!e.canceled&&!/online/i.test(e.locationType||"")).map(e=>{
      const fields=Object.fromEntries((e.customFields||[]).map(f=>[f.label,clean(f.value)]));
      const venue=clean(e.location||fields['Event Location']);
      const known=/american art museum|portrait gallery|african american history|american history museum|natural history museum|asian art museum|hirshhorn|renwick|anacostia community museum|national postal museum|arts and industries|national zoo|african art museum|american indian museum|air and space museum|smithsonian castle|freer|sackler|national mall/i.test(venue);
      const address=clean(e.address||fields.Address||fields['Event Location']||"");
      return {external_id:`smithsonian_${e.eventID}`,name:e.title,description:e.description,startDate:instant(e.startDateTime,e.startTimeZoneOffset),endDate:instant(e.endDateTime,e.endTimeZoneOffset),allDay:e.allDay===true,location:{name:venue,address:known&&!/chantilly|udvar|new york|virginia|maryland/i.test(`${venue} ${address}`)?`${address}, Washington, DC`:address},url:e.permaLinkUrl||e.webLink,image:e.detailImage?.url||e.eventImage?.url,offers:{price:/^free\b/i.test(fields.Cost||"")?0:undefined,url:e.webLink||e.permaLinkUrl}};
    });
  }
  function rdfa(html,pageUrl) {
    const $=load(html),events=[];
    $("[typeof='Event'],[itemtype$='/Event']").each((_,el)=>{
      const root=$(el),prop=name=>{const e=root.find(`[property='${name}'],[itemprop='${name}']`).first();return e.attr("content")||e.attr("datetime")||e.attr("href")||e.text();};
      const place=root.find("[property='location'],[itemprop='location']");
      events.push({name:prop("name"),description:prop("description"),startDate:prop("startDate"),endDate:prop("endDate"),location:{name:clean(place.text())||prop("streetAddress"),address:prop("streetAddress")},url:url(prop("url"),pageUrl),image:prop("image")});
    });
    return events;
  }
  async function collect(source, {now=new Date(),days=60,ticketmasterKey="",venues=[]}={}) {
    let raw=[];let parsed=0;const errors=[];let emptyConfirmed=false;
    if(source.kind==="trumba")raw=trumba(JSON.parse(await get(`${source.url}?startdate=${dateKey(now).replaceAll("-","")}&days=${days}`)));
    else if(source.kind==="ticketmaster") {
      if(!ticketmasterKey)throw new Error("TICKETMASTER_API_KEY is missing");
      for(let page=0;page<5;page++){
        const params=new URLSearchParams({apikey:ticketmasterKey,stateCode:"DC",countryCode:"US",size:"200",page:String(page),sort:"date,asc",startDateTime:now.toISOString().replace(/\.\d{3}Z$/,"Z"),endDateTime:new Date(+now+days*DAY).toISOString().replace(/\.\d{3}Z$/,"Z")});
        const data=JSON.parse(await get(`${source.url}?${params}`));
        for(const e of data._embedded?.events||[]){const v=e._embedded?.venues?.[0]||{};raw.push({external_id:`ticketmaster_${e.id}`,name:e.name,description:e.info||e.pleaseNote||"",startDate:e.dates?.start?.dateTime,endDate:null,location:{name:v.name,address:{streetAddress:v.address?.line1,addressLocality:v.city?.name,addressRegion:v.state?.stateCode},geo:v.location},url:e.url,image:e.images?.filter(i=>i.width>=500).sort((a,b)=>b.width-a.width)[0]?.url,offers:{price:e.priceRanges?.[0]?.min,highPrice:e.priceRanges?.[0]?.max,url:e.url},eventStatus:e.dates?.status?.code==="cancelled"?"EventCancelled":"EventScheduled"});}
        if(page+1>=(data.page?.totalPages||1))break;
        if(page===4&&data.page.totalPages>5)throw new Error("Ticketmaster exceeds the 1,000-result API window; split the date range before importing");
      }
    } else if(source.kind==="ical") {
      if(!calendar)throw new Error("Calendar parser is unavailable");
      const parsedCalendar=calendar.sync.parseICS(await get(source.url));
      for(const event of Object.values(parsedCalendar)){
        if(event.type!=="VEVENT"||event.status==="CANCELLED")continue;
        const instances=calendar.expandRecurringEvent(event,{from:now,to:new Date(+now+days*DAY),expandOngoing:true});
        for(const e of instances){const location=String(e.location||event.location||"");raw.push({external_id:`${event.uid}:${new Date(e.start).toISOString()}`,name:e.summary||event.summary,description:e.description||event.description,startDate:new Date(e.start).toISOString(),endDate:e.end?new Date(e.end).toISOString():undefined,allDay:e.isFullDay===true,location:{name:location.split(",")[0],address:location},url:e.url||event.url,image:event.attach?.val||event.attach?.[0]?.val});}
      }
    } else if(source.kind==="eventsdc") {
      const format=d=>`${dateKey(d)} 00:00:00`;
      const params=new URLSearchParams({field_end_date_value:format(now),field_start_date_value:format(new Date(+now+days*DAY))});
      const events=JSON.parse(await get(`${source.url}?${params}`));
      const known={"2":["Walter E. Washington Convention Center","801 Allen Y. Lew Place NW, Washington, DC"],"11":["Carnegie Library","801 K St NW, Washington, DC"],"12":["RFK Stadium","2400 East Capitol St SE, Washington, DC"],"13":["The Fields at RFK Campus","401 Oklahoma Ave NE, Washington, DC"],"14":["Festival Grounds at RFK Campus","2400 East Capitol St SE, Washington, DC"],"15":["Skate Park at RFK Campus","2400 East Capitol St SE, Washington, DC"],"16":["DC Armory","2001 East Capitol St SE, Washington, DC"],"17":["Nationals Park","1500 S Capitol St SE, Washington, DC"],"18":["CareFirst Arena","1100 Oak Dr SE, Washington, DC"],"19":["Gateway DC","2700 Martin Luther King Jr Ave SE, Washington, DC"],"20":["R.I.S.E. Demonstration Center","2730 Martin Luther King Jr Ave SE, Washington, DC"]};
      for(const e of events){
        const link=`https://eventsdc.com/node/${e.nid}`,html=await get(link),$=load(html),text=clean($("main").html());
        const id=String(Array.isArray(e.field_venue)?e.field_venue[0]:e.field_venue||"");
        const k=known[id];
        const inferred=venues.filter(v=>v.name&&v.name.length>7&&text.toLowerCase().includes(v.name.toLowerCase())&&isDc(v.address)).sort((a,b)=>b.name.length-a.name.length)[0];
        const place=k?{name:k[0],address:k[1]}:inferred?{name:inferred.name,address:inferred.address}:null;
        if(!place){errors.push({url:link,error:"No verified event venue"});continue;}
        raw.push({external_id:String(e.nid),name:e.title,description:$(".field--name-field-description").first().text()||$("meta[property='og:description']").attr("content"),startDate:e.field_start_date,endDate:e.field_end_date,location:place,url:$("link[rel='canonical']").attr("href")||link,image:$("meta[property='og:image']").attr("content"),offers:{url:$("main a").filter((_,a)=>/buy tickets|register now/i.test($(a).text())).first().attr("href")}});
      }
    } else if(source.kind==="runguides") {
      const api="https://runguides-api-6dce8eac15ab.herokuapp.com";
      const location=JSON.parse(await get(`${api}/api/v1/location_view_search?name=washington-dc`)).location_view;
      if(!location?.id)throw new Error("RunGuides location payload changed");
      for(let page=0;page<10;page++){
        const params=new URLSearchParams({current_location_view_id:String(location.id),"geo_boundary[long1]":String(location.north_east_longitude),"geo_boundary[lat2]":String(location.south_west_latitude),"geo_boundary[long2]":String(location.south_west_longitude),"geo_boundary[lat1]":String(location.north_east_latitude),method:"redis",offset:String(page*50),limit:"50","category_ids[]":"4"});
        const result=JSON.parse(await get(`${api}/events/search?${params}`)),events=[...(result.listings||[]),...(result.featured_listings||[])];
        for(const e of events){if(e.is_virtual||e.covid_virtual||e.date_tbd)continue;const address=[e.listing_city||e.geocoded_city,e.listing_state||e.geocoded_state].filter(Boolean).join(", ");if(!isDc(address))continue;const day=String(e.listing_date||e.event_date||"").slice(0,10);raw.push({external_id:String(e.id),name:e.name||e.title,description:`${clean(e.race_info_text||e.tagline)} Start time has not been published by this calendar; confirm with the organizer.`,startDate:day,timeUnknown:true,location:{name:e.name||e.title,address},url:url(e.website||e.event_url,source.url),image:e.flyer||e.flyer_100||e.mobile_flyer});}
        if(events.length<50||result.results_maxed===false)break;
        if(page===9)throw new Error("RunGuides pagination exceeded safety limit");
      }
    } else {
      const html=await get(source.url),$=load(html);
      emptyConfirmed=source.id==="Shaw Main Streets"&&/Check back soon for upcoming events/i.test($("body").text());
      if(source.kind==="rdfa")raw=rdfa(html,source.url);
      else if(source.kind==="nuandroids") {
        const data=JSON.parse($("#__NEXT_DATA__").text());
        const events=data.props?.pageProps?.eventsProp;
        if(!Array.isArray(events))throw new Error("NuAndroids event payload changed");
        for(const e of events.slice(0,30)){
          const detailUrl=e.externalUrl||url(`/event/${e.slug?.current}`,source.url);
          if(!detailUrl)continue;
          try{const details=structured(await get(detailUrl),detailUrl);if(details.length)raw.push(...details.map(d=>({...d,external_id:String(e._id),image:d.image||e.image})));else errors.push({url:detailUrl,error:"No structured venue data on ticket page"});}catch(error){errors.push({url:detailUrl,error:error.message});if(/HTTP (403|429)/.test(error.message))break;}
        }
      } else if(source.kind==="embassy") {
        const links=[...new Set($(".event-list-row a[href]").map((_,e)=>url($(e).attr("href"),source.url)).get().filter(link=>link?.includes("/event/")))];
        if(!links.length)throw new Error("Things To Do DC listing markup changed");
        for(const link of links){const body=await get(link),$=load(body),top=$(".event-details-top");const href=top.find("a[href*='ical.php']").first().attr("href");if(!href){errors.push({url:link,error:"No source calendar date"});continue;}const params=new URL(href).searchParams;const convert=v=>{const m=String(v||"").trim().match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);return m?`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`:null;};const location=clean(top.find(".event-detail-row").eq(1).text());const venue=String(params.get("location")||"").split(",")[0].trim();raw.push({external_id:new URL(link).pathname.replace(/^\/event\//,"").replace(/\/$/,""),name:top.find("h1,h2,.event-detail-heading").first().text(),description:$(".event-description2").first().text(),startDate:convert(params.get("start_date")),endDate:convert(params.get("end_date")),location:{name:venue,address:location},url:link,image:$("meta[property='og:image']").attr("content"),offers:{price:undefined}});}
      } else if(source.kind==="webflow") {
        const links=[...new Set($("a[href*='/event/']").map((_,e)=>url($(e).attr("href"),source.url)).get())];
        for(const link of links){const body=await get(link),$=load(body),main=$("main"),text=clean(main.html());const match=text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})\s*(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);if(!match)continue;const date=new Date(`${match[1]} 12:00:00 GMT`).toISOString().slice(0,10);const clock=t=>{const m=t.match(/(\d+):(\d+)\s*([ap])m/i);return `${String(+m[1]%12+(m[3].toLowerCase()==="p"?12:0)).padStart(2,"0")}:${m[2]}:00`;};const blocks=main.find(".event_icon").map((_,e)=>clean($(e).parent().text())).get();const location=blocks.at(-1)||"";raw.push({name:main.find("h1").text(),description:main.find(".w-richtext").first().text()||main.find("p").first().text(),startDate:`${date}T${clock(match[2])}`,endDate:`${date}T${clock(match[3])}`,location:{name:location,address:`${location}, Washington, DC`},url:link,image:$("meta[property='og:image']").attr("content")});}
      } else if(source.kind==="cityspark") {
        const match=html.match(/var cSparkLocals\s*=\s*/);
        if(!match)throw new Error("Washingtonian calendar payload changed");
        const payload=readJsonValue(html,match.index+match[0].length);
        const candidates=[...(payload.Events||[]),...(payload.Promos||[])];
        for(const e of candidates){if(e.isVirtual)continue;for(const occurrence of e.Occurances?.length?e.Occurances:[{Start:e.StartUTC,End:e.EndUTC}])raw.push({name:e.Name,description:e.Description||e.Summary,external_id:`${e.Id}:${occurrence.Start}`,startDate:occurrence.Start,endDate:occurrence.End,allDay:e.AllDay===true,location:{name:e.Location||e.Venue||e.VenueName,address:[e.Address,e.CityState,e.Zip].filter(Boolean).join(", "),geo:{latitude:e.latitude,longitude:e.longitude}},url:e.PrimaryUrl||e.TicketUrl||`https://www.washingtonian.com/calendar/#/details/${e.Id}`,image:e.LargeImg,offers:{url:e.TicketUrl,price:e.Free?0:e.Price}});}
      } else if(source.kind==="citycenter") {
        let listing=$;
        if(!$("a[href*='/do/']").length){const endpoint=html.match(/https:\/\/xapi\.citylightstudio\.net\/_bbq\/_bbq_results\.php\?[^'"\s]+/)?.[0];if(endpoint)listing=load(await get(endpoint));}
        const detailLinks=[...new Set(listing("a[href*='/do/']").map((_,e)=>url(listing(e).attr("href"),source.url)).get())];
        for(const link of detailLinks){try{const body=await get(link);raw.push(...citycenter(body,link,source));}catch(error){errors.push({url:link,error:error.message});}}
      } else if(source.kind==="markets") raw=markets(html,source,now,days);
      else if(source.kind==="music")raw=music(html,source,venues);
      else {
        raw=structured(html,source.url);
        const links=[...new Set($("a[href]").map((_,e)=>url($(e).attr("href"),source.url)).get().filter(link=>link&&new URL(link).hostname===new URL(source.url).hostname&&link.includes(source.detailPattern||"/event/")&&link!==source.url))];
        if(!raw.length)for(const link of links.slice(0,50)){try{raw.push(...structured(await get(link),link));}catch(error){errors.push({url:link,error:error.message});}}
      }
    }
    parsed=raw.length;
    const rows=[...new Map(raw.map(e=>normalize(e,source,now,days)).filter(Boolean).map(e=>[e.external_id,e])).values()];
    return {source:source.id,parsed,included:rows.length,rejected:parsed-rows.length,errors,rows,emptyConfirmed};
  }
  function citycenter(html,link,source){
    const $=load(html),main=$("main");
    const title=clean(main.find("h1").first().text());
    const text=clean(main.html());
    const dates=[...text.matchAll(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}(?::\d{2})?\s*[ap]m)(?:\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*[ap]m))?/gi)];
    const locationNode=main.find("h2,h3").filter((_,e)=>/^Location$/i.test(clean($(e).text()))).first();
    const location=clean(locationNode.next().text());
    return dates.map(m=>{const month=new Date(`${m[1]} 1, 2000`).getMonth()+1;const date=`${m[3]}-${String(month).padStart(2,"0")}-${m[2].padStart(2,"0")}`;const clock=t=>{const c=t.match(/(\d+)(?::(\d+))?\s*([ap])m/i);return `${String(+c[1]%12+(c[3].toLowerCase()==="p"?12:0)).padStart(2,"0")}:${c[2]||"00"}:00`;};return {name:title,description:clean(main.find(".details,.detail-description").text())||text.split("Details").at(-1),startDate:`${date}T${clock(m[4])}`,endDate:m[5]?`${date}T${clock(m[5])}`:null,location:{name:location.split(/(?=\d{2,5}\s)/)[0].trim(),address:`${location}, Washington, DC`},url:link,image:main.find("img").first().attr("src")};});
  }
  function markets(html,source,now,days){
    const match=html.match(/const markets\s*=\s*/);if(!match)throw new Error("FRESHFARM market payload changed");
    const records=readJsonValue(html,match.index+match[0].length);const events=[];
    for(const market of records){const c=market.custom||{};if(!isDc(c.market_address?.address))continue;events.push(...marketOccurrences(market,source,now,days));}return events;
  }
  function music(html,source,venues=[]){
    const $=load(html),script=$("script").map((_,e)=>$(e).text()).get().find(s=>s.includes("streamController.enqueue("));
    if(!script)throw new Error("DC Music Live structured payload changed");
    const start=script.indexOf("enqueue(")+8;const packed=readJsonValue(script,start);const flattened=JSON.parse(packed);const restored=unflatten(flattened);const events=[];
    const visit=(v)=>{if(!v||typeof v!=="object")return;if(Array.isArray(v)){v.forEach(visit);return;}if(v._id&&(v.startDate||v.date||v.showDate)){events.push(v);return;}Object.values(v).forEach(visit);};visit(restored);
    const key=v=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");
    return events.filter(e=>!/\bclosed\b/i.test(e.title||"")).map(e=>{const venue=venues.find(v=>key(v.name)===key(e.venueName)||key(v.name)===key(e.venue));return {name:e.title||e.name||e.artist,description:e.description,startDate:e.startDate||e.date||e.showDate,endDate:e.endDate,external_id:String(e._id),location:{name:e.venue?.name||e.venueName,address:e.venue?.address||e.address||venue?.address},url:e.eventLink||e.ticketLink||e.url,image:e.imgSrc||e.image||e.imageUrl,offers:{url:e.ticketLink,price:e.price}};});
  }
  return {get,collect,normalize,structured,trumba,rdfa,clean,citycenter,markets,music};
}

export function readJsonValue(text,start){
  // Parse a literal JSON value only; never evaluate source JavaScript.
  let inString=false,escaped=false,depth=0;
  const first=text[start];
  for(let i=start;i<text.length;i++){
    const c=text[i];if(inString){if(escaped)escaped=false;else if(c==="\\")escaped=true;else if(c==='"'){inString=false;if(first==='"')return JSON.parse(text.slice(start,i+1));}continue;}
    if(c==='"')inString=true;else if(c==="{"||c==="[")depth++;else if(c==="}"||c==="]"){depth--;if(depth===0)return JSON.parse(text.slice(start,i+1));}
  }throw new Error("Incomplete JSON payload");
}
export function unflatten(values){
  const cache=new Map();
  const restore=i=>{if(i<0)return null;if(cache.has(i))return cache.get(i);const v=values[i];if(v===null||typeof v!=="object")return v;const out=Array.isArray(v)?[]:{};cache.set(i,out);if(Array.isArray(v)){if(typeof v[0]==="string"){if(v[0]==="Date")return values[v[1]];return null;}v.forEach(x=>out.push(restore(x)));}else for(const [key,value]of Object.entries(v))out[key.startsWith("_")?restore(+key.slice(1)):key]=restore(value);return out;};return restore(0);
}
export function marketOccurrences(market,source,now,days){
  const c=market.custom||{},start=String(c.market_open_date||""),end=String(c.market_close_date||"");
  if(!/^\d{8}$/.test(start)||!/^\d{8}$/.test(end)||!c.market_open_time||!c.market_close_time)return [];
  const daysOfWeek=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weekdays=[c.market_day,c.market_day_2].filter(Boolean).map(d=>daysOfWeek.indexOf(d));
  const clock=value=>{const text=String(value);const match=text.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?$/i);if(!match)return null;const hour=match[3]?+match[1]%12+(/PM/i.test(match[3])?12:0):+match[1];return `${String(hour).padStart(2,"0")}:${match[2]||"00"}:00`;};
  const open=clock(c.market_open_time),close=clock(c.market_close_time);if(!open||!close)return [];
  const rows=[],today=dateKey(now),base=new Date(`${today}T12:00:00Z`);
  // Honor an active closure banner rather than synthesizing dates through it.
  if((c.market_individual_banner==="1"||c.market_banner==="1")&&/closed|not operate|cancel/i.test(c.market_banner_text||""))return [];
  for(let day=0;day<=days;day++){
    const d=new Date(+base+day*DAY),key=d.toISOString().slice(0,10),compact=key.replaceAll("-","");
    if(compact<start||compact>end||!weekdays.includes(d.getUTCDay()))continue;
    rows.push({external_id:`freshfarm_${market.ID||market.id}_${key}`,name:`${market.post_title} Farmers Market`,description:c.market_about_content_text||c.market_teaser_text,startDate:`${key}T${open}`,endDate:`${key}T${close}`,location:{name:`${market.post_title} Farmers Market`,address:c.market_address?.address,geo:{latitude:c.market_address?.lat,longitude:c.market_address?.lng}},url:market.permalink,image:market.about_content_image?.url,isAccessibleForFree:true});
  }return rows;
}
