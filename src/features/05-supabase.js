const supabaseConfig = {
  url: "https://iglzcjtklryapmcpyoam.supabase.co",
  publishableKey: "sb_publishable_E4mdzzerAbcMxoVniRJcaQ_NuB98FvH"
};
const demoAuthConfig = { useMockOtp: true, mockOtp: "123456" };

function formatSupabaseTime(value) {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatSupabaseDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function rowIsExplicitlyFree(row) {
  const tags = Array.isArray(row.tags) ? row.tags.join(" ") : "";
  const text = `${row.price || ""} ${row.price_label || ""} ${row.title || ""} ${row.description || ""} ${tags} ${row.raw_json?.description || ""} ${Array.isArray(row.raw_json?.labels) ? row.raw_json.labels.join(" ") : ""}`.toLowerCase();
  return /\b(free|no cover|complimentary|free admission)\b/.test(text);
}

function normalizeSupabasePrice(value, isMinimum = false, isExplicitlyFree = false) {
  if (value === null || value === undefined || value === "") return "Price unknown";
  if (String(value).toLowerCase() === "free") return "Free";
  if (Number(value) === 0) return isExplicitlyFree ? "Free" : "Price unknown";
  const text = String(value);
  const price = text.startsWith("$") ? text : `$${text}`;
  return isMinimum ? `From ${price}` : price;
}

function normalizeSupabasePriceFromRow(row) {
  const isExplicitlyFree = rowIsExplicitlyFree(row);
  if (row.price !== undefined && row.price !== null && row.price !== "") return normalizeSupabasePrice(row.price, false, isExplicitlyFree);
  if (row.price_min !== undefined && row.price_min !== null && row.price_min !== "") {
    if (Number(row.price_min) === 0 && !isExplicitlyFree) return "Price unknown";
    if (row.price_max !== undefined && row.price_max !== null && row.price_max !== "" && Number(row.price_max) !== Number(row.price_min)) {
      return `${normalizeSupabasePrice(row.price_min, false, isExplicitlyFree)}-${normalizeSupabasePrice(row.price_max).replace("$", "")}`;
    }
    return normalizeSupabasePrice(row.price_min, true, isExplicitlyFree);
  }
  return "Price unknown";
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

function normalizeSupabaseDescription(row) {
  const description = cleanSupabaseDescription(row.description || row.desc);
  const address = rawEventApiAddress(row) || (isAddressOnlyVenue(row.venue_name || row.venue) ? (row.venue_name || row.venue) : "");
  if (!address || description.includes(address)) return description;
  return `${description}\n\nAddress: ${address}`;
}

function eventStartHourFromRow(row) {
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

function isEventUpcoming(event) {
  if (!Number.isFinite(event.startSort)) return true;
  return event.hasPreciseStart ? event.startSort >= Date.now() : event.startSort >= startOfTodaySortValue();
}

function normalizeImportedCategory(row) {
  const importedCategories = new Set(["concerts", "festivals", "performing-arts", "sports", "community", "expos", "museums"]);
  const tagList = Array.isArray(row.tags) ? row.tags : [];
  const text = `${row.category || ""} ${row.cat || ""} ${row.tag || ""} ${tagList.map(normalizeTagValue).join(" ")} ${row.title || ""} ${row.description || ""} ${row.venue_name || ""} ${row.venue || ""}`.toLowerCase();
  const directCategory = String(row.category || row.cat || "").toLowerCase();
  const tag = String(tagList.map(normalizeTagValue).find(item => importedCategories.has(String(item).toLowerCase())) || row.tag || "").toLowerCase();
  if (row.source !== "manual" && importedCategories.has(tag)) return tag;
  if (importedCategories.has(directCategory)) return directCategory;
  if (/museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history/.test(text)) return "museums";
  if (/concert|music|rock|pop|r&b|hip-hop|rap|jazz|latin|country|dj|band|singer|songwriter/.test(text)) return "concerts";
  if (/theatre|theater|performance art|performing|arts & theatre|comedy|film|cinema|dance/.test(text)) return "performing-arts";
  if (/baseball|basketball|football|soccer|hockey|sports|mlb|nba|nfl|nhl/.test(text)) return "sports";
  if (/festival|fair/.test(text)) return "festivals";
  if (/expo|conference|convention/.test(text)) return "expos";
  return "community";
}

function normalizeTagValue(value) {
  if (typeof value === "object" && value !== null) return value.label || value.name || value.title || value.value || "";
  return value;
}

function normalizeSupabaseTags(row, category) {
  const rawTags = Array.isArray(row.tags) ? row.tags : [];
  const labels = row.raw_json?.labels || row.raw_json?.phq_labels || [];
  const text = `${row.title || ""} ${row.description || ""} ${row.venue_name || ""} ${row.venue || ""} ${rawTags.join(" ")}`.toLowerCase();
  const priorityTags = /smithsonian|hirshhorn|renwick gallery|national portrait gallery|american art museum|national air and space museum|national museum of african american history|national museum of natural history|national museum of american history/.test(text) ? ["Smithsonian"] : [];
  return [category, ...priorityTags, ...rawTags, row.tag, ...labels]
    .map(normalizeTagValue)
    .map(tag => String(tag || "").trim())
    .filter(tag => tag && tag !== "[object Object]")
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
    time: row.date && row.time ? `${formatSupabaseDate(row.date)}, ${String(row.time).trim()}` : row.time || formatSupabaseTime(row.starts_at || row.start_time || row.start_at || row.date),
    startDate: row.date || "",
    startHour: eventStartHourFromRow(row),
    startSort: eventStartSortFromRow(row),
    hasPreciseStart: Boolean(row.starts_at || row.start_time || row.start_at),
    price: normalizeSupabasePriceFromRow(row),
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
    const response = await fetch(`${supabaseConfig.url}/rest/v1/events?select=*&order=starts_at.asc.nullslast,date.asc.nullslast`, {
      headers: { apikey: supabaseConfig.publishableKey }
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    if (rows.length) {
      const normalized = rows.map(normalizeSupabaseEvent);
      const upcoming = normalized.filter(isEventUpcoming);
      events = upcoming.filter(event => event.source === "manual" || event.venue !== "Location in description");
      const hiddenCount = rows.length - events.length;
      const shownLabel = `${events.length} upcoming event${events.length === 1 ? "" : "s"} shown`;
      state.eventSync = { status: "synced", label: hiddenCount > 0 ? `${shownLabel} / ${hiddenCount} older or incomplete row${hiddenCount === 1 ? "" : "s"} hidden` : shownLabel };
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

function normalizeSupabaseProfile(row) {
  return {
    initials: profileInitials(row.full_name || row.fullName || row.username || ""),
    fullName: row.full_name || row.fullName || "Lokal Friend",
    username: row.username || "lokalfriend",
    phone: row.phone || "",
    birthdate: row.birthdate || "",
    mutuals: row.mutuals || `${2 + (String(row.full_name || row.username || "").length % 7)} mutual friends`,
    bio: row.bio || row.home_city || "Washington, DC"
  };
}

function mergeFriendDirectory(profiles) {
  const rows = profiles.map(profileToFriendRow);
  const merged = [...friendDirectory, ...rows];
  friendDirectory = merged.filter((friend, index, all) => all.findIndex(item => item[1] === friend[1]) === index);
}

async function syncSupabaseProfiles() {
  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/profiles?select=id,username,full_name,birthdate,phone,bio,home_city,is_demo&is_demo=eq.true&order=full_name.asc`, {
      headers: { apikey: supabaseConfig.publishableKey }
    });
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
  const saved = { ...profile, phone: formatDisplayPhone(profile.phone), age: calculateAge(profile.birthdate), initials: profileInitials(profile.fullName), bio: state.bio };
  state.profile = saved;
  state.age = saved.age;
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

async function createLokalAccount({ fullName, phone, username, birthdate, password }) {
  if (!fullName || !phone || !username || !birthdate || !password) throw new Error("Complete every account field.");
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
  validateBirthday(birthdate);
  const formattedPhone = formatSignupPhone(phone);
  state.pendingSignupProfile = { fullName, phone: formattedPhone, username, birthdate };
  state.pendingSignupPhone = formattedPhone;
  if (demoAuthConfig.useMockOtp) return { demoOtp: true };
  const data = await supabaseAuthRequest("signup", {
    phone: formattedPhone,
    password,
    data: { full_name: fullName, username, birthdate }
  });
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
  finalizeLokalProfile(state.pendingSignupProfile);
  return data;
}
