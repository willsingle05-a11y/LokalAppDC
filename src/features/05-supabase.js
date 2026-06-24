const supabaseConfig = {
  url: "https://iglzcjtklryapmcpyoam.supabase.co",
  publishableKey: "sb_publishable_E4mdzzerAbcMxoVniRJcaQ_NuB98FvH"
};
const demoAuthConfig = { useMockOtp: false, mockOtp: "123456" };
const supabaseStorageKeys = {
  accessToken: "lokalSupabaseAccessToken",
  userId: "lokalSupabaseUserId",
  demoUserId: "lokalDemoInteractionUserId",
  pendingInteractions: "lokalPendingEventInteractions"
};

function formatSupabaseTime(value) {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(date);
}

function formatSupabaseDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function formatSupabaseDateAndTime(dateValue, timeValue) {
  const date = formatSupabaseDate(dateValue);
  const time = String(timeValue || "").trim();
  return [date, time].filter(Boolean).join(", ") || "Date to be announced";
}

function rowIsExplicitlyFree(row) {
  const tags = Array.isArray(row.tags) ? row.tags.join(" ") : "";
  const text = `${row.price || ""} ${row.price_label || ""} ${row.title || ""} ${row.description || ""} ${tags} ${row.raw_json?.description || ""} ${Array.isArray(row.raw_json?.labels) ? row.raw_json.labels.join(" ") : ""}`.toLowerCase();
  return row.is_free === true || /\b(free|no cover|complimentary|free admission)\b/.test(text);
}

function formatTicketPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function normalizeSupabasePrice(value, isMinimum = false, isExplicitlyFree = false) {
  if (value === null || value === undefined || value === "") return "Price unknown";
  if (String(value).toLowerCase() === "free") return "Free";
  if (Number(value) === 0) return isExplicitlyFree ? "Free" : "Price unknown";
  const price = Number.isFinite(Number(value)) ? formatTicketPrice(value) : (String(value).startsWith("$") ? String(value) : `$${value}`);
  return isMinimum ? `From ${price}` : price;
}

function positivePriceValue(...values) {
  return values.map(value => Number(value)).find(value => Number.isFinite(value) && value > 0);
}

function ticketmasterPriceRange(row) {
  const sources = [
    row.raw_json,
    row.raw_json?._embedded?.events?.[0],
    row.raw_json?.event,
    row.raw_json?.ticketmaster
  ].filter(Boolean);
  for (const source of sources) {
    const ranges = Array.isArray(source.priceRanges) ? source.priceRanges : [];
    const range = ranges.find(item => positivePriceValue(item?.min, item?.lowPrice, item?.price, item?.minPrice));
    if (range) {
      return {
        min: positivePriceValue(range.min, range.lowPrice, range.price, range.minPrice),
        max: positivePriceValue(range.max, range.highPrice, range.maxPrice)
      };
    }
    const offers = Array.isArray(source.offers) ? source.offers : [];
    const offer = offers.find(item => positivePriceValue(item?.lowPrice, item?.price, item?.minPrice));
    if (offer) {
      return {
        min: positivePriceValue(offer.lowPrice, offer.price, offer.minPrice),
        max: positivePriceValue(offer.highPrice, offer.maxPrice)
      };
    }
  }
  return null;
}

function formatListedPriceRange(range) {
  if (!range?.min) return "";
  if (range.max && range.max !== range.min) return `${formatTicketPrice(range.min)}-${formatTicketPrice(range.max)}`;
  return `From ${formatTicketPrice(range.min)}`;
}

function normalizeSupabasePriceFromRow(row) {
  const isExplicitlyFree = rowIsExplicitlyFree(row);
  const listedTicketmasterPrice = String(row.source || "").toLowerCase() === "ticketmaster" ? formatListedPriceRange(ticketmasterPriceRange(row)) : "";
  if (listedTicketmasterPrice) return listedTicketmasterPrice;
  if (row.price !== undefined && row.price !== null && row.price !== "") return normalizeSupabasePrice(row.price, false, isExplicitlyFree);
  const listedApiPrice = formatListedPriceRange(ticketmasterPriceRange(row));
  if (listedApiPrice) return listedApiPrice;
  if (row.price_min !== undefined && row.price_min !== null && row.price_min !== "") {
    if (Number(row.price_min) === 0 && !isExplicitlyFree) return "Price unknown";
    if (row.price_max !== undefined && row.price_max !== null && row.price_max !== "" && Number(row.price_max) !== Number(row.price_min)) {
      return `${normalizeSupabasePrice(row.price_min, false, isExplicitlyFree)}-${normalizeSupabasePrice(row.price_max, false, isExplicitlyFree)}`;
    }
    return normalizeSupabasePrice(row.price_min, true, isExplicitlyFree);
  }
  return "Price unknown";
}

function persistSupabaseSession(accessToken) {
  if (!accessToken) return;
  const userId = decodeJwtPayload(accessToken).sub;
  localStorage.setItem(supabaseStorageKeys.accessToken, accessToken);
  if (userId) localStorage.setItem(supabaseStorageKeys.userId, userId);
}

function fallbackInteractionUserId() {
  let userId = localStorage.getItem(supabaseStorageKeys.demoUserId);
  if (!userId) {
    userId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "00000000-0000-4000-8000-000000000000";
    localStorage.setItem(supabaseStorageKeys.demoUserId, userId);
  }
  return userId;
}

function currentInteractionUserId() {
  const token = localStorage.getItem(supabaseStorageKeys.accessToken);
  return decodeJwtPayload(token || "").sub || state.profile?.id || localStorage.getItem(supabaseStorageKeys.userId) || fallbackInteractionUserId();
}

function interactionEventId(event) {
  const value = event?.sourceId || event?.id;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function queuePendingEventInteraction(record) {
  const pending = JSON.parse(localStorage.getItem(supabaseStorageKeys.pendingInteractions) || "[]");
  pending.push({ ...record, queued_at: new Date().toISOString() });
  localStorage.setItem(supabaseStorageKeys.pendingInteractions, JSON.stringify(pending.slice(-40)));
}

function supabaseInteractionHeaders() {
  const token = localStorage.getItem(supabaseStorageKeys.accessToken);
  const headers = {
    apikey: supabaseConfig.publishableKey,
    "Content-Type": "application/json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function existingEventInteraction(userId, eventId) {
  const url = `${supabaseConfig.url}/rest/v1/event_interactions?select=id&user_id=eq.${encodeURIComponent(userId)}&event_id=eq.${encodeURIComponent(eventId)}&limit=1`;
  const response = await fetch(url, { headers: supabaseInteractionHeaders() });
  if (!response.ok) throw new Error(`Supabase interaction lookup returned ${response.status}`);
  const rows = await response.json();
  return rows[0] || null;
}

async function saveEventInteraction(eventId, kind = "save", active = true) {
  const event = events.find(item => item.id === Number(eventId));
  const supabaseEventId = interactionEventId(event);
  if (!supabaseEventId) return { skipped: "no-supabase-event-id" };
  const record = {
    user_id: currentInteractionUserId(),
    event_id: supabaseEventId,
    kind,
    active,
    title: event?.title || "",
    category: event?.cat || "",
    tags: event?.tags || []
  };
  try {
    const existing = await existingEventInteraction(record.user_id, record.event_id);
    if (active && !existing) {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/event_interactions`, {
        method: "POST",
        headers: { ...supabaseInteractionHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify([{ user_id: record.user_id, event_id: record.event_id }])
      });
      if (!response.ok) throw new Error(`Supabase interaction insert returned ${response.status}`);
    }
    if (!active && existing) {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/event_interactions?user_id=eq.${encodeURIComponent(record.user_id)}&event_id=eq.${encodeURIComponent(record.event_id)}`, {
        method: "DELETE",
        headers: supabaseInteractionHeaders()
      });
      if (!response.ok) throw new Error(`Supabase interaction delete returned ${response.status}`);
    }
    return { synced: true };
  } catch (error) {
    queuePendingEventInteraction(record);
    console.warn("[supabase] event interaction queued locally:", error.message);
    return { queued: true, error };
  }
}

function cleanSupabaseDescription(value) {
  const cleaned = String(value || "")
    .replace(/^Sourced from [\w.-]+(?:\.com)?\s*-\s*/i, "")
    .replace(/^Sourced from [\w.-]+(?:\.com)?\.?\s*/i, "")
    .replace(/\s*Sourced from [\w.-]+(?:\.com)?\.?\s*/ig, " ")
    .trim();
  return cleaned || "More details are coming soon.";
}

function cleanImportedText(value) {
  return String(value || "")
    .replace(/^Sourced from [\w.-]+(?:\.com)?\s*-\s*/i, "")
    .replace(/^Sourced from [\w.-]+(?:\.com)?\.?\s*/i, "")
    .replace(/\s*Sourced from [\w.-]+(?:\.com)?\.?\s*/ig, " ")
    .trim();
}

function isAddressOnlyVenue(value) {
  return /United States of America|Washington, DC 20|Street |Avenue |Road |Northwest|Northeast|Southwest|Southeast|^\d+\s/i.test(String(value || ""));
}

function rawEventApiAddress(row) {
  return row.raw_json?.geo?.address?.formatted_address || row.raw_json?.entities?.find(entity => entity.formatted_address)?.formatted_address || "";
}

function rawEventApiVenueName(row) {
  const entity = row.raw_json?.entities?.find(item => ["venue", "place"].includes(item.type) && item.name && !isAddressOnlyVenue(item.name));
  return entity?.name || inferVenueNameFromText(`${row.title || ""} ${row.description || ""} ${row.raw_json?.description || ""}`);
}

function rawImageUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.url || value.image_url || value.thumbnail_url || value.original_url || "";
}

function rawEventApiImage(row) {
  const direct = rawImageUrl(row.image_url) || rawImageUrl(row.image) || rawImageUrl(row.raw_json?.image_url);
  if (direct) return direct;
  const eventImage = Array.isArray(row.raw_json?.images) ? row.raw_json.images.map(rawImageUrl).find(Boolean) : rawImageUrl(row.raw_json?.images);
  if (eventImage) return eventImage;
  const entity = row.raw_json?.entities?.find(item => rawImageUrl(item.image) || rawImageUrl(item.image_url) || rawImageUrl(item.logo) || rawImageUrl(item.thumbnail) || (Array.isArray(item.images) && item.images.map(rawImageUrl).find(Boolean)));
  if (!entity) return "";
  return rawImageUrl(entity.image) || rawImageUrl(entity.image_url) || rawImageUrl(entity.logo) || rawImageUrl(entity.thumbnail) || (Array.isArray(entity.images) ? entity.images.map(rawImageUrl).find(Boolean) : rawImageUrl(entity.images)) || "";
}

function inferVenueNameFromText(value) {
  const text = cleanImportedText(value);
  const patterns = [
    /\bat\s+([A-Z][A-Za-z0-9&'’.\- ]{2,70}?)(?:[.,!|]| for | with | featuring | in Washington| in D\.C\.|$)/,
    /\b@\s*([A-Z][A-Za-z0-9&'’.\- ]{2,70}?)(?:[.,!|]|$)/,
    /\|\s*([A-Z0-9][A-Za-z0-9&'’.\- ]{2,45}?)\s*(?:\||$)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && !isAddressOnlyVenue(candidate) && !/hosted by|washington d\.?c\.?$/i.test(candidate)) return candidate;
  }
  return "";
}

function normalizeSupabaseVenue(row) {
  const venue = cleanImportedText(row.venue_name || row.venue || row.location_name || "");
  if (row.source !== "manual" && isAddressOnlyVenue(venue)) return rawEventApiVenueName(row) || "Location in description";
  return venue || rawEventApiVenueName(row) || "Location in description";
}

function supabaseLocationText(row) {
  return `${row.venue_address || ""} ${row.address || ""} ${rawEventApiAddress(row)} ${row.neighborhood || ""} ${row.area || ""} ${row.location || ""} ${row.venue_name || ""} ${row.venue || ""} ${row.raw_json?.geo?.address?.locality || ""} ${row.raw_json?.geo?.address?.region || ""} ${row.raw_json?.geo?.address?.country_code || ""}`.toLowerCase();
}

function isSupabaseEventInDc(row) {
  const text = supabaseLocationText(row);
  const nonDcText = /\b(arlington|alexandria|bethesda|silver spring|national harbor|vienna|fairfax|falls church|rockville|hyattsville|college park|landover|tysons|mclean|reston|gaithersburg|laurel|bowie|annapolis|baltimore|md\b|va\b|virginia|maryland)\b/.test(text);
  const dcText = /washington,\s*(dc|d\.c\.)|washington,\s*district of columbia|district of columbia|\bdc\b|\bd\.c\.\b|\bnw\b|\bne\b|\bsw\b|\bse\b/.test(text);
  if (nonDcText && !dcText) return false;
  if (row.latitude !== null && row.latitude !== undefined && row.longitude !== null && row.longitude !== undefined) {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return lat >= 38.79 && lat <= 38.995 && lng >= -77.12 && lng <= -76.90;
  }
  if (row.lat !== null && row.lat !== undefined && row.lng !== null && row.lng !== undefined) {
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return lat >= 38.79 && lat <= 38.995 && lng >= -77.12 && lng <= -76.90;
  }
  return dcText;
}

function normalizeSupabaseDescription(row) {
  const description = cleanSupabaseDescription(row.description || row.desc);
  const address = rawEventApiAddress(row) || (isAddressOnlyVenue(row.venue_name || row.venue) ? (row.venue_name || row.venue) : "");
  if (!address || description.includes(address)) return description;
  return `${description}\n\nAddress: ${address}`;
}

function hasReliableSupabaseStart(row) {
  if (row.date || row.time || row.start_time || row.start_at) return true;
  if (row.source === "smithsonian" && !row.raw_json) return false;
  return Boolean(row.starts_at);
}

function eventStartHourFromRow(row) {
  if (!hasReliableSupabaseStart(row)) return null;
  const source = row.starts_at || row.start_time || row.start_at;
  if (source) {
    const date = new Date(source);
    if (!Number.isNaN(date.getTime())) return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(date)) % 24;
  }
  const timeText = String(row.time || "");
  const match = timeText.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[2].toUpperCase() === "PM") hour += 12;
  return hour;
}

function eventStartSortFromRow(row) {
  if (!hasReliableSupabaseStart(row)) return Number.POSITIVE_INFINITY;
  const source = row.starts_at || row.start_time || row.start_at;
  if (source) {
    const date = new Date(source);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  if (row.date) {
    const hour = eventStartHourFromRow(row) || 0;
    const date = new Date(`${row.date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.getTime() + hour * 60 * 60 * 1000;
  }
  return Number.MAX_SAFE_INTEGER;
}

function startOfTodaySortValue() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function endOfDiscoveryWindowSortValue() {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

function isEventInDiscoveryWindow(event) {
  if (!Number.isFinite(event.startSort)) return true;
  return event.startSort >= startOfTodaySortValue() && event.startSort <= endOfDiscoveryWindowSortValue();
}

function normalizeImportedCategory(row) {
  const importedCategories = new Set(["concerts", "festivals", "performing-arts", "sports", "community", "expos", "museums", "nightlife", "happy-hours", "trivia-nights"]);
  const tagList = Array.isArray(row.tags) ? row.tags : [];
  const text = `${row.category || ""} ${row.Category || ""} ${row.cat || ""} ${row.tag || ""} ${tagList.map(normalizeTagValue).join(" ")} ${row.title || ""} ${row.description || ""} ${row.venue_name || ""} ${row.venue || ""}`.toLowerCase();
  const venueText = `${row.venue_name || ""} ${row.venue || ""} ${row.location_name || ""}`.toLowerCase();
  const classificationText = [
    ...(Array.isArray(row.raw_json?.classifications) ? row.raw_json.classifications : []),
    ...(Array.isArray(row.raw_json?._embedded?.events?.[0]?.classifications) ? row.raw_json._embedded.events[0].classifications : [])
  ].map(item => [item?.segment?.name, item?.genre?.name, item?.subGenre?.name, item?.type?.name, item?.subType?.name].filter(Boolean).join(" ")).join(" ").toLowerCase();
  const directCategory = String(row.category || row.cat || "").toLowerCase();
  const tag = String(tagList.map(normalizeTagValue).find(item => importedCategories.has(String(item).toLowerCase())) || row.tag || "").toLowerCase();
  const directCategoryMap = {
    "arts & theatre": "performing-arts",
    theatre: "performing-arts",
    theater: "performing-arts",
    comedy: "performing-arts",
    "performance art": "performing-arts",
    baseball: "sports",
    basketball: "sports",
    football: "sports",
    hockey: "sports",
    soccer: "sports",
    museum: "museums",
    museums: "museums",
    rock: "concerts",
    pop: "concerts",
    "r&b": "concerts",
    "hip-hop/rap": "concerts",
    jazz: "concerts",
    latin: "concerts",
    country: "concerts",
    "dance/electronic": "concerts",
    religious: text.includes("gospel") || text.includes("music") || text.includes("festival of praise") ? "concerts" : "performing-arts"
  };
  if (/comedy|comedian|stand[- ]?up|improv/.test(classificationText)) return "performing-arts";
  if (/sports|baseball|basketball|football|hockey|soccer/.test(classificationText)) return "sports";
  if (/music|rock|pop|r&b|hip[- ]?hop|rap|jazz|latin|country|dance|electronic/.test(classificationText)) return "concerts";
  if (/arts|theatre|theater|performance|play|musical/.test(classificationText)) return "performing-arts";
  if (directCategoryMap[directCategory]) return directCategoryMap[directCategory];
  if (directCategory === "happy-hours") return "happy-hours";
  if (directCategory === "trivia-nights") return "trivia-nights";
  if (/museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history/.test(text)) return "museums";
  if (/9:30 club|echostage|soundcheck|flash nightclub|decades|ultrabar|heist|saint yves|zebbie|madam'?s organ|black cat|dc9|the crown & crow|viceroy rooftop/.test(venueText) || /\b(nightlife|nightclub|dance club|club night|bar crawl|cocktail|speakeasy|lounge|rooftop|dance party|after dark|late night|dj set|pride party)\b/.test(text)) return "nightlife";
  if (/\b(comedy|stand up|stand-up|standup|improv|comic|comedian)\b|room 808|comedy club|comedy cellar|dc improv/.test(text)) return "performing-arts";
  if (importedCategories.has(directCategory)) return directCategory;
  if (/signature theatre|kennedy center|warner theatre|lincoln theatre|theatre|theater|performance art|performing|arts & theatre|comedy|film|cinema|dance|musical|opera|stage play|pippin|what became of us/.test(text)) return "performing-arts";
  if (/concert|music|r&b|hip-hop|rap|jazz|latin|country|rock|pop|dj|band|singer|songwriter/.test(text)) return "concerts";
  if (/baseball|basketball|football|soccer|hockey|sports|mlb|nba|nfl|nhl/.test(text)) return "sports";
  if (/festival|fair/.test(text)) return "festivals";
  if (/expo|conference|convention/.test(text)) return "expos";
  if (/showcase/.test(text)) return "performing-arts";
  if (/band|artist|singer|songwriter/.test(text)) return "concerts";
  if (row.source !== "manual" && importedCategories.has(tag) && tag !== "community") return tag;
  return "community";
}

function normalizeTagValue(value) {
  if (typeof value === "object" && value !== null) return value.label || value.name || value.title || value.value || "";
  return value;
}

function sportsLeagueTags(row) {
  const rawTags = Array.isArray(row.tags) ? row.tags.join(" ") : "";
  const labels = Array.isArray(row.raw_json?.labels) ? row.raw_json.labels.join(" ") : "";
  const text = `${row.category || ""} ${row.title || ""} ${row.description || ""} ${row.venue_name || ""} ${row.venue || ""} ${rawTags} ${labels}`.toLowerCase();
  const tags = [];
  const add = (...items) => items.forEach(item => { if (!tags.includes(item)) tags.push(item); });
  if (/\b(mlb|major league baseball|washington nationals|nationals|nats\b|baseball)\b/.test(text)) add("MLB", "Baseball");
  if (/\b(nba|washington wizards|wizards)\b/.test(text)) add("NBA", "Basketball");
  if (/\b(wnba|washington mystics|mystics)\b/.test(text)) add("WNBA", "Basketball");
  if (/\b(nfl|washington commanders|commanders|football)\b/.test(text)) add("NFL", "Football");
  if (/\b(nhl|washington capitals|capitals|caps\b|hockey)\b/.test(text)) add("NHL", "Hockey");
  if (/\b(mls|d\.?c\.? united|dc united|soccer)\b/.test(text)) add("MLS", "Soccer");
  if (/\b(washington spirit|nwsl)\b/.test(text)) add("NWSL", "Soccer");
  return tags;
}

function seededPerformingArtsFallbackTags(seedText) {
  const pool = ["Curtain Call", "Limited Run", "Tour Stop", "Ensemble", "Solo Set", "Matinee", "Late Show", "New Work", "Classic Story", "Reserved Seating"];
  const seed = Array.from(String(seedText || "lokal")).reduce((total, char) => total + char.charCodeAt(0), 0);
  return [pool[seed % pool.length], pool[(seed + 4) % pool.length]];
}

function seededConcertFallbackTags(seedText) {
  const pool = ["Tour Stop", "Club Show", "New Release", "Small Room", "Late Set", "Featured Artist", "Dance Floor", "Local Stage", "Vocal Set", "Deep Cuts"];
  const seed = Array.from(String(seedText || "lokal")).reduce((total, char) => total + char.charCodeAt(0), 0);
  return [pool[seed % pool.length], pool[(seed + 5) % pool.length]];
}

function concertDetailTags(row) {
  const rawTags = Array.isArray(row.tags) ? row.tags.join(" ") : "";
  const labels = Array.isArray(row.raw_json?.labels) ? row.raw_json.labels.join(" ") : "";
  const text = `${row.category || ""} ${row.title || ""} ${row.description || ""} ${row.venue_name || ""} ${row.venue || ""} ${labels}`.toLowerCase();
  const tags = [];
  const add = (label, pattern) => { if (pattern.test(text) && !tags.includes(label)) tags.push(label); };
  add("Hip-Hop", /\b(hip[- ]?hop|rap|rapper|conway|chris travis)\b/);
  add("R&B", /r&b|rhythm and blues|jill scott|bayou/);
  add("Jazz", /jazz|bebop|swing/);
  add("Go-Go", /go[- ]?go|northeast groovers|wpgc/);
  add("Pop", /\bpop\b|dorian electra|fulton lee|flawed mangoes|daniela andrade/);
  add("Rock", /music - rock|\brock band\b|\balt[- ]rock\b|\bindie rock\b|the church|the kills|of montreal/);
  add("Indie", /indie|alt[- ]|alternative|of montreal|son little|bixby|flawed mangoes/);
  add("Folk", /folk|americana|singer[- ]songwriter|josiah and the bonnevilles|orville peck/);
  add("Country", /music - country|country music|orville peck|kolby cooper/);
  add("Electronic", /electronic|edm|dance music|dj set|rufus|rüfüs|echostage|soundcheck/);
  add("Latin", /latin|reggaeton|salsa|bachata|cumbia|paco amoroso|ca7riel/);
  add("Soul", /soul|funk|big freedia|tank and the bangas/);
  add("DJ Set", /\bdj\b|deejay|turntable|vinyl/);
  add("Album Tour", /album|record release|new release|listening session|playlist/);
  add("Tour Stop", /\btour\b|world tour|north america/);
  add("Local Artist", /dc artist|local artist|local lineup|hometown/);
  add("Free", /free admission|free event|free concert|free show|rsvp free|no cover/);
  add("18+", /\b18\+\b|ages 18/);
  add("21+", /\b21\+\b|ages 21/);
  add("Club Show", /9:30 club|930 club|the atlantis|union stage|black cat|dc9|songbyrd/);
  add("Big Room", /the anthem|echostage|arena|stadium|audi field/);
  const fallback = seededConcertFallbackTags(`${row.title || ""} ${row.venue_name || ""} ${row.venue || ""}`).filter(() => tags.length < 2);
  return [...tags, ...fallback]
    .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 6);
}

function performingArtsDetailTags(row) {
  const rawTags = Array.isArray(row.tags) ? row.tags.join(" ") : "";
  const labels = Array.isArray(row.raw_json?.labels) ? row.raw_json.labels.join(" ") : "";
  const text = `${row.category || ""} ${row.title || ""} ${row.description || ""} ${row.venue_name || ""} ${row.venue || ""} ${rawTags} ${labels}`.toLowerCase();
  const tags = [];
  const add = (label, pattern) => { if (pattern.test(text) && !tags.includes(label)) tags.push(label); };
  add("Comedy", /comedy|stand[- ]?up|standup|improv|comic|open mic/);
  add("Broadway", /broadway|moulin rouge|suffs|lion king|wicked|hamilton/);
  add("Play", /\b(play|drama)\b|othello|hamlet|macbeth/);
  add("Musical", /musical|moulin rouge|suffs|wicked|hamilton|lion king/);
  add("Opera", /\bopera\b(?! house)/);
  add("Touring Production", /touring|tour\b/);
  add("Family Friendly", /family|kids|children|bluey|disney/);
  add("Dance", /dance|ballet|choreo/);
  add("Film", /film|cinema|screening|movie/);
  add("Gallery", /gallery|exhibit|exhibition|installation|visual art/);
  add("Classical", /symphony|orchestra|classical|chamber music/);
  add("Cabaret", /cabaret/);
  add("Drag", /\bdrag\b|drag queen|drag brunch/);
  add("Magic", /magic|illusionist/);
  add("Storytelling", /storytelling|story slam|moth/);
  add("Spoken Word", /spoken word|poetry/);
  const fallback = seededPerformingArtsFallbackTags(`${row.title || ""} ${row.venue_name || ""} ${row.venue || ""}`).filter(() => tags.length < 2);
  return [...tags, ...fallback]
    .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 5);
}

function normalizeSupabaseTags(row, category) {
  const rawTags = Array.isArray(row.tags) ? row.tags : [];
  const labels = row.raw_json?.labels || row.raw_json?.phq_labels || [];
  if (["happy-hours", "trivia-nights"].includes(category)) {
    return [...rawTags, ...labels]
      .map(normalizeTagValue)
      .map(tag => String(tag || "").trim())
      .filter(tag => tag && tag !== "[object Object]")
      .filter(tag => !/^(happy hours?|weekday deal)$/i.test(tag) && !/sport/i.test(tag))
      .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index)
      .slice(0, 8);
  }
  const text = `${row.category || ""} ${row.Category || ""} ${row.title || ""} ${row.description || ""} ${row.venue_name || ""} ${row.venue || ""} ${rawTags.join(" ")}`.toLowerCase();
  const venueText = `${row.venue_name || ""} ${row.venue || ""} ${row.location_name || ""}`.toLowerCase();
  const inferredTags = [];
  const categoryLabels = { concerts: "", festivals: "Festivals", "performing-arts": "", sports: "Sports", community: "Community", expos: "Expos", museums: "Museums", nightlife: "Nightlife", "happy-hours": "", "trivia-nights": "" };
  if (/museum|smithsonian|hirshhorn|renwick gallery|portrait gallery|american art museum|air and space|natural history|american history/.test(text)) inferredTags.push("Museums");
  if (/smithsonian|hirshhorn|renwick gallery|national portrait gallery|american art museum|national air and space museum|national museum of african american history|national museum of natural history|national museum of american history/.test(text)) inferredTags.push("Smithsonian");
  if (category === "concerts") inferredTags.push(...concertDetailTags(row));
  if (/theatre|theater|performance art|performing|arts & theatre|gallery|art|exhibit|exhibition|musical|opera/.test(text)) inferredTags.push("Arts");
  if (/comedy|stand up|stand-up|improv/.test(text)) inferredTags.push("Comedy");
  if (/film|cinema|screening|movie/.test(text)) inferredTags.push("Film");
  const sportTags = sportsLeagueTags(row);
  if (sportTags.length || /baseball|basketball|football|soccer|hockey|sports|mlb|nba|nfl|nhl|mls|wnba|nationals|mystics|wizards|capitals|commanders|d\.?c\.? united|dc united/.test(text)) inferredTags.push("Sports", ...sportTags);
  if (/9:30 club|echostage|soundcheck|flash nightclub|decades|ultrabar|heist|saint yves|zebbie|madam'?s organ|black cat|dc9|the crown & crow|viceroy rooftop/.test(venueText) || /\b(nightlife|nightclub|dance club|club night|bar crawl|cocktail|speakeasy|lounge|rooftop|dance party|after dark|late night|dj set|pride party)\b/.test(text)) inferredTags.push("Nightlife");
  if (/food|drink|wine|beer|cocktail|restaurant|brunch|market/.test(text)) inferredTags.push("Food & Drink");
  if (rowIsExplicitlyFree(row)) inferredTags.push("Free");
  if (category === "performing-arts") inferredTags.push(...performingArtsDetailTags(row));
  return [...inferredTags, categoryLabels[category] || "", ...rawTags, row.tag, ...labels]
    .map(normalizeTagValue)
    .map(tag => String(tag || "").trim())
    .filter(tag => tag && tag !== "[object Object]")
    .filter(tag => category !== "concerts" || !["concert", "concerts", "live music", "music", "arts", "art", "free"].includes(tag.toLowerCase()))
    .filter(tag => category !== "performing-arts" || !["arts", "art", "performing-arts", "performing arts", "museum", "museums", "smithsonian", "performance", "theater", "theatre", "stage show", "touring show", "family show", "live show", "ticketed", "opera"].includes(tag.toLowerCase()))
    .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 8);
}

function normalizeSupabaseEvent(row, index) {
  const category = normalizeImportedCategory(row);
  const tags = normalizeSupabaseTags(row, category);
  return {
    id: 1000 + index,
    sourceId: row.id,
    source: row.source || "manual",
    title: row.title || row.name || "Untitled Lokal event",
    venue: normalizeSupabaseVenue(row),
    area: row.neighborhood || row.area || row.location || "Washington, DC",
    time: hasReliableSupabaseStart(row) ? (row.date && row.time ? formatSupabaseDateAndTime(row.date, row.time) : formatSupabaseTime(row.starts_at || row.start_time || row.start_at || row.date)) : "Ongoing / time varies",
    startDate: row.date || "",
    startHour: eventStartHourFromRow(row),
    startSort: eventStartSortFromRow(row),
    hasPreciseStart: hasReliableSupabaseStart(row) && Boolean(row.starts_at || row.start_time || row.start_at),
    price: ["happy-hours", "trivia-nights"].includes(category) ? "" : normalizeSupabasePriceFromRow(row),
    cat: category,
    tag: tags[0] || row.tag || row.category || "Local event",
    tags,
    image: rawEventApiImage(row),
    friends: Array.isArray(row.friends) ? row.friends : [],
    desc: normalizeSupabaseDescription(row)
  };
}

async function syncSupabaseEvents(showToast = false) {
  state.eventSync = { status: "loading", label: "Checking shared events..." };
  if (state.route === "home") renderHome();
  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/events?select=*&status=eq.published&order=starts_at.asc.nullslast,date.asc.nullslast`, {
      headers: { apikey: supabaseConfig.publishableKey }
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    if (rows.length) {
      const dcRows = rows.filter(isSupabaseEventInDc);
      const normalized = dcRows.map(normalizeSupabaseEvent);
      const discoveryWindowEvents = normalized.filter(isEventInDiscoveryWindow);
      events = discoveryWindowEvents;
      const hiddenCount = rows.length - events.length;
      const shownLabel = `${events.length} next-week DC event${events.length === 1 ? "" : "s"} shown`;
      state.eventSync = { status: "synced", label: hiddenCount > 0 ? `${shownLabel} / ${hiddenCount} outside-window or outside-DC row${hiddenCount === 1 ? "" : "s"} hidden` : shownLabel };
    } else {
      events = [...demoEvents];
      state.eventSync = { status: "fallback", label: "Shared table connected / showing sample events until rows are added" };
    }
  } catch {
    events = [...demoEvents];
    state.eventSync = { status: "fallback", label: "Showing sample events / shared table unavailable" };
  }
  if (state.route === "home") renderHome();
  if (showToast) toast(state.eventSync.label);
}

function normalizeSupabaseGroup(row) {
  return {
    name: row.name || "Lokal group",
    type: row.type || "Public",
    count: row.member_count ? `${row.member_count} members` : row.member_count_label || "New group",
    note: row.note || "New public group",
    icon: row.icon || String(row.name || "L").slice(0, 1).toUpperCase(),
    style: row.style || "",
    description: row.description || "A public Lokal group for finding plans around DC."
  };
}

function mergeSupabaseGroups(rows) {
  rows.map(normalizeSupabaseGroup).forEach(group => {
    publicGroupMeta[group.name] = group;
  });
}

async function syncSupabaseGroups() {
  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/demo_groups?select=name,type,member_count,member_count_label,note,icon,style,description,is_demo&is_demo=eq.true&order=name.asc`, {
      headers: { apikey: supabaseConfig.publishableKey }
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    if (rows.length) mergeSupabaseGroups(rows);
  } catch {}
  if (state.route === "social") renderSocial();
}

function normalizeSupabaseProfile(row) {
  const fullName = row.full_name || row.fullName || row.display_name || "Lokal Friend";
  return {
    initials: row.avatar_initials || profileInitials(fullName || row.username || ""),
    fullName,
    username: row.username || "lokalfriend",
    phone: row.phone || "",
    birthdate: row.birthdate || "",
    mutuals: row.mutuals || `${2 + (String(fullName || row.username || "").length % 7)} mutual friends`,
    bio: row.bio || row.home_city || (Array.isArray(row.neighborhoods) ? row.neighborhoods.join(", ") : "") || "Washington, DC"
  };
}

function mergeFriendDirectory(profiles) {
  const rows = profiles.map(profileToFriendRow);
  const merged = [...friendDirectory, ...rows];
  friendDirectory = merged.filter((friend, index, all) => all.findIndex(item => item[1] === friend[1]) === index);
}

async function syncSupabaseProfiles() {
  try {
    let response = await fetch(`${supabaseConfig.url}/rest/v1/profiles?select=id,username,full_name,birthdate,phone,bio,home_city,is_demo&is_demo=eq.true&order=full_name.asc`, {
      headers: { apikey: supabaseConfig.publishableKey }
    });
    if (!response.ok) {
      response = await fetch(`${supabaseConfig.url}/rest/v1/Profiles?select=id,username,display_name,birthdate,bio,avatar_initials,taste_tags,neighborhoods,is_demo&is_demo=eq.true&order=display_name.asc`, {
        headers: { apikey: supabaseConfig.publishableKey }
      });
    }
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    if (rows.length) mergeFriendDirectory(rows.map(normalizeSupabaseProfile));
  } catch {
    mergeFriendDirectory(demoProfileSeeds);
  }
  if (state.route === "social") renderSocial();
}

function formatSignupPhone(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  throw new Error("Enter a 10 digit phone number with area code.");
}

function formatDisplayPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return value || "";
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

function calculateAge(birthdate) {
  const birthday = new Date(`${birthdate}T12:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  if (today < new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())) age--;
  return age;
}

function validateBirthday(birthdate) {
  const birthday = new Date(`${birthdate}T12:00:00`);
  const today = new Date();
  if (!birthdate || Number.isNaN(birthday.getTime())) throw new Error("Enter a valid birthday.");
  if (birthday >= today) throw new Error("Birthday must be a date in the past.");
  if (calculateAge(birthdate) < 14) throw new Error("You must be at least 14 years old to use Lokal.");
}

function profileInitials(fullName) {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "L";
}

function updateProfileShortcut() {
  const shortcut = document.querySelector("#profile-shortcut .avatar");
  if (shortcut) shortcut.textContent = state.profile.initials;
}

function finalizeLokalProfile(profile) {
  const saved = {
    ...profile,
    phone: formatDisplayPhone(profile.phone),
    age: calculateAge(profile.birthdate),
    initials: profileInitials(profile.fullName),
    bio: state.bio,
    tastes: profile.eventInterests?.length ? profile.eventInterests : state.tastes,
    areas: profile.areaInterests || []
  };
  state.profile = saved;
  state.age = saved.age;
  state.tastes = saved.tastes;
  localStorage.setItem("lokalProfile", JSON.stringify(saved));
  updateProfileShortcut();
}

async function supabaseAuthRequest(path, body) {
  const response = await fetch(`${supabaseConfig.url}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseConfig.publishableKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Supabase could not complete that request.");
  return data;
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

function validateSignupEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
}

async function syncSupabaseSignupProfile(accessToken, profile) {
  const userId = decodeJwtPayload(accessToken).sub;
  if (!userId) return;
  state.pendingSignupProfile = { ...profile, id: userId };
  const response = await fetch(`${supabaseConfig.url}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: supabaseConfig.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify([{
      id: userId,
      username: profile.username,
      full_name: profile.fullName,
      birthdate: profile.birthdate,
      phone: profile.phone,
      email: profile.email,
      event_interests: profile.eventInterests,
      area_interests: profile.areaInterests,
      home_city: "Washington, DC",
      is_demo: false
    }])
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Supabase created the login but could not save profile preferences.");
  }
}

async function createLokalAccount({ fullName, email, phone, username, birthdate, password, eventInterests = [], areaInterests = [] }) {
  if (!fullName || !email || !phone || !username || !birthdate || !password) throw new Error("Complete every account field.");
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
  validateSignupEmail(email);
  validateBirthday(birthdate);
  const formattedPhone = formatSignupPhone(phone);
  state.pendingSignupProfile = { fullName, email, phone: formattedPhone, username, birthdate, eventInterests, areaInterests };
  state.pendingSignupPhone = formattedPhone;
  if (demoAuthConfig.useMockOtp) return { demoOtp: true };
  const data = await supabaseAuthRequest("signup", {
    email,
    password,
    data: {
      full_name: fullName,
      username,
      birthdate,
      phone: formattedPhone,
      email,
      event_interests: eventInterests,
      area_interests: areaInterests
    }
  });
  if (data.access_token) {
    persistSupabaseSession(data.access_token);
    await syncSupabaseSignupProfile(data.access_token, state.pendingSignupProfile);
  }
  return data;
}

async function checkPhoneSignupStatus() {
  try {
    const response = await fetch(`${supabaseConfig.url}/auth/v1/settings`, { headers: { apikey: supabaseConfig.publishableKey } });
    const settings = await response.json();
    state.phoneSignupEnabled = Boolean(settings?.external?.phone);
  } catch {
    state.phoneSignupEnabled = false;
  }
}

async function verifyLokalPhone(token) {
  if (!token.trim()) throw new Error("Enter the verification code.");
  if (demoAuthConfig.useMockOtp) {
    if (token.trim() !== demoAuthConfig.mockOtp) throw new Error("For demo profiles, use verification code 123456.");
    finalizeLokalProfile(state.pendingSignupProfile);
    return { demoOtp: true };
  }
  const data = await supabaseAuthRequest("verify", { phone: state.pendingSignupPhone, token: token.trim(), type: "sms" });
  if (data.access_token) {
    persistSupabaseSession(data.access_token);
    state.pendingSignupProfile = { ...state.pendingSignupProfile, id: decodeJwtPayload(data.access_token).sub };
  }
  finalizeLokalProfile(state.pendingSignupProfile);
  return data;
}
