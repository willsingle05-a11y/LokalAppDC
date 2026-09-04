const supabaseConfig = {
  url: "https://iglzcjtklryapmcpyoam.supabase.co",
  publishableKey: "sb_publishable_E4mdzzerAbcMxoVniRJcaQ_NuB98FvH",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbHpjanRrbHJ5YXBtY3B5b2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDI0ODgsImV4cCI6MjA5NTkxODQ4OH0.oxugfaHmc7Jvq5nay5U7eRaKYYlW5rexv2UIfcM4hvo"
};
const supabaseStorageKeys = {
  accessToken: "lokalSupabaseAccessToken",
  refreshToken: "lokalSupabaseRefreshToken",
  userId: "lokalSupabaseUserId",
  interactionUserId: "lokalInteractionUserId",
  pendingInteractions: "lokalPendingEventInteractions",
  pendingVenueFollows: "lokalPendingVenueFollows"
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

function formatSupabaseDateWithTbaTime(row) {
  const value = row?.date || String(row?.starts_at || row?.start_time || row?.start_at || "").slice(0, 10);
  return [formatSupabaseDate(value), "Time TBA"].filter(Boolean).join(", ") || "Time TBA";
}

function rowIsExplicitlyFree(row) {
  const tags = Array.isArray(row.tags) ? row.tags.join(" ") : "";
  const text = `${row.price || ""} ${row.price_label || ""} ${row.title || ""} ${row.description || ""} ${tags} ${row.raw_json?.description || ""} ${Array.isArray(row.raw_json?.labels) ? row.raw_json.labels.join(" ") : ""}`.toLowerCase();
  if (String(row.source || "").toLowerCase() === "dc-music-live") return /\b(free admission|free concert|free show|rsvp free|no cover)\b/.test(text);
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
  if (["concerts", "live-music"].includes(normalizeImportedCategory(row)) && String(row.source || "").toLowerCase() === "dc-music-live" && /^free$/i.test(String(row.price || row.raw_json?.source_price || "").trim())) return "Price unknown";
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
  let userId = localStorage.getItem(supabaseStorageKeys.interactionUserId);
  if (!userId) {
    userId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "00000000-0000-4000-8000-000000000000";
    localStorage.setItem(supabaseStorageKeys.interactionUserId, userId);
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

function queuePendingVenueFollow(record) {
  const pending = JSON.parse(localStorage.getItem(supabaseStorageKeys.pendingVenueFollows) || "[]");
  pending.push({ ...record, queued_at: new Date().toISOString() });
  localStorage.setItem(supabaseStorageKeys.pendingVenueFollows, JSON.stringify(pending.slice(-40)));
}

function supabaseJsonHeaders(extra = {}) {
  const bearerToken = localStorage.getItem(supabaseStorageKeys.accessToken) || supabaseConfig.anonKey || supabaseConfig.publishableKey;
  return {
    apikey: supabaseConfig.anonKey || supabaseConfig.publishableKey,
    Authorization: `Bearer ${bearerToken}`,
    "Content-Type": "application/json",
    ...extra
  };
}

function supabaseInteractionHeaders() {
  const token = localStorage.getItem(supabaseStorageKeys.accessToken) || supabaseConfig.anonKey;
  const headers = {
    apikey: supabaseConfig.anonKey || supabaseConfig.publishableKey,
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
  const dbType = kind === "rsvp" ? "going" : kind === "remove" ? "unsave" : kind;
  const record = {
    user_id: currentInteractionUserId(),
    event_id: supabaseEventId,
    kind: dbType,
    active,
    title: event?.title || "",
    category: event?.cat || "",
    tags: event?.tags || []
  };
  if (typeof recordAppAction === "function") {
    const actionName = dbType === "going"
      ? (active ? "event_rsvped" : "event_rsvp_removed")
      : dbType === "unsave" || !active
        ? "event_unsaved"
        : "event_saved";
    recordAppAction(actionName, {
      eventId: event?.id || "",
      supabaseEventId,
      title: event?.title || "",
      category: event?.cat || "",
      venue: event?.venue || "",
      neighborhood: event?.neighborhood || "",
      active
    });
  }
  try {
    const existing = await existingEventInteraction(record.user_id, record.event_id);
    if (active && !existing) {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/event_interactions`, {
        method: "POST",
        headers: { ...supabaseInteractionHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify([{ user_id: record.user_id, event_id: record.event_id, type: dbType }])
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

async function submitVenueVerificationRequest(profile) {
  const record = {
    requester_user_id: currentInteractionUserId(),
    requester_name: state.profile.fullName || "",
    requester_email: profile.email || state.profile.email || "",
    requester_phone: profile.phone || state.profile.phone || "",
    venue_name: profile.venueName,
    venue_address: profile.venueAddress,
    venue_website: profile.website || "",
    venue_image_url: profile.venueImageUrl || "",
    venue_description: profile.venueDescription || "",
    event_interests: profile.eventInterests || [],
    area_interests: profile.areaInterests || [],
    requester_role: profile.role || "",
    notes: profile.notes || "",
    status: "pending"
  };
  const response = await fetch(`${supabaseConfig.url}/rest/v1/venue_verification_requests`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([record])
  });
  if (!response.ok) throw new Error(`Venue verification request returned ${response.status}`);
  state.pendingVenueRequests = [record, ...(state.pendingVenueRequests || [])].slice(0, 20);
  localStorage.setItem("lokalPendingVenueRequests", JSON.stringify(state.pendingVenueRequests));
  return record;
}

async function submitOnboardingProfile(profile) {
  const record = {
    user_key: currentInteractionUserId(),
    account_type: profile.accountType || "person",
    full_name: profile.fullName || "",
    owner_name: profile.ownerName || profile.fullName || "",
    username: profile.username || "",
    email: profile.email || "",
    phone: profile.phone || "",
    birthdate: profile.birthdate || null,
    event_interests: profile.eventInterests || [],
    area_interests: profile.areaInterests || [],
    venue_name: profile.venueName || "",
    venue_address: profile.venueAddress || "",
    venue_website: profile.venueWebsite || "",
    venue_image_url: profile.venueImageUrl || "",
    venue_description: profile.venueDescription || ""
  };
  const response = await fetch(`${supabaseConfig.url}/rest/v1/onboarding_submissions`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([record])
  });
  if (!response.ok) throw new Error(`Onboarding submission returned ${response.status}`);
  if (typeof recordAppAction === "function") recordAppAction("onboarding_submitted", {
    accountType: record.account_type,
    eventInterestCount: record.event_interests.length,
    areaInterestCount: record.area_interests.length
  });
  return record;
}

async function submitAppInviteShare(invite = {}) {
  const record = {
    inviter_user_key: currentInteractionUserId(),
    inviter_name: invite.inviterName || state.profile?.fullName || "",
    inviter_username: invite.inviterUsername || state.profile?.username || "",
    invite_code: invite.code || currentReferralCode(),
    invite_url: invite.url || appInviteDetails().url,
    channel: invite.channel || "copy"
  };
  if (typeof recordAppAction === "function") recordAppAction("app_invite_shared", {
    inviteCode: record.invite_code,
    inviteUrl: record.invite_url,
    channel: record.channel
  });
  const response = await fetch(`${supabaseConfig.url}/rest/v1/app_invites`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([record])
  });
  if (!response.ok) throw new Error(`Invite share returned ${response.status}`);
  return record;
}

async function lookupReferralInvite(inviteCode) {
  if (!inviteCode) return null;
  const url = `${supabaseConfig.url}/rest/v1/app_invites?select=inviter_user_key,inviter_name,inviter_username&invite_code=eq.${encodeURIComponent(inviteCode)}&order=created_at.desc&limit=1`;
  const response = await fetch(url, { headers: supabaseJsonHeaders() });
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0] || null;
}

async function submitReferralJoin(profile = {}) {
  const inviteCode = localStorage.getItem("lokalIncomingReferralCode");
  const inviteRecord = await lookupReferralInvite(inviteCode);
  const inviterUserKey = localStorage.getItem("lokalIncomingInviterKey") || inviteRecord?.inviter_user_key || "";
  if (!inviteCode || !inviterUserKey || inviterUserKey === currentInteractionUserId()) return null;
  const record = {
    invite_code: inviteCode,
    inviter_user_key: inviterUserKey,
    inviter_name: localStorage.getItem("lokalIncomingInviterName") || inviteRecord?.inviter_name || "",
    invited_user_key: currentInteractionUserId(),
    invited_name: profile.fullName || state.profile?.fullName || "",
    invited_username: profile.username || state.profile?.username || "",
    invited_email: profile.email || state.profile?.email || "",
    status: "joined",
    points_awarded: 5
  };
  const response = await fetch(`${supabaseConfig.url}/rest/v1/app_referrals?on_conflict=invite_code,invited_user_key`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify([record])
  });
  if (!response.ok) throw new Error(`Referral join returned ${response.status}`);
  recordAppAction("referral_joined", {
    inviteCode,
    inviterUserKey,
    invitedUserKey: record.invited_user_key,
    invitedName: record.invited_name,
    points: 5
  });
  submitFriendRelationshipForUser(record.inviter_user_key, record.invited_name, "accepted", "referral").catch(error => console.warn("[supabase] inviter friendship not recorded", error));
  submitFriendRelationshipForUser(record.invited_user_key, record.inviter_name, "accepted", "referral").catch(error => console.warn("[supabase] invited friendship not recorded", error));
  if (record.inviter_name && friendDirectory.some(friend => friend[1] === record.inviter_name && friend[5])) {
    state.friends.add(record.inviter_name);
    state.friendSignupCredits.add(record.inviter_name);
    localStorage.setItem("lokalFriendSignupCredits", JSON.stringify(Array.from(state.friendSignupCredits)));
  }
  localStorage.removeItem("lokalIncomingReferralCode");
  localStorage.removeItem("lokalIncomingInviterKey");
  localStorage.removeItem("lokalIncomingInviterName");
  return record;
}

async function syncReferralPointNotifications() {
  const userKey = currentInteractionUserId();
  if (!userKey) return [];
  const url = `${supabaseConfig.url}/rest/v1/app_referrals?select=id,invited_name,points_awarded,created_at&inviter_user_key=eq.${encodeURIComponent(userKey)}&order=created_at.desc&limit=20`;
  try {
    const response = await fetch(url, { headers: supabaseJsonHeaders() });
    if (!response.ok) throw new Error(`Referral point lookup returned ${response.status}`);
    const rows = await response.json();
    rows.forEach(row => {
      const name = row.invited_name || "Someone";
      recordLokalPoints(row.points_awarded || 5, "Your friend joined Lokal", `referral-${row.id}`);
    });
    return rows;
  } catch (error) {
    console.warn("[supabase] referral points not synced", error);
    return [];
  }
}

async function submitAccountDeletionRequest(reason = "") {
  const record = {
    user_key: currentInteractionUserId(),
    account_type: state.profile?.accountType || "person",
    full_name: state.profile?.fullName || "",
    username: state.profile?.username || "",
    email: state.profile?.email || "",
    phone: state.profile?.phone || "",
    reason: reason || "",
    status: "pending"
  };
  const response = await fetch(`${supabaseConfig.url}/rest/v1/account_deletion_requests`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([record])
  });
  if (!response.ok) throw new Error(`Account deletion request returned ${response.status}`);
  localStorage.setItem("lokalAccountDeletionRequested", "1");
  return record;
}

async function submitFeedbackSubmission(message = "", context = "") {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) throw new Error("Feedback is empty");
  const record = {
    user_key: currentInteractionUserId(),
    account_type: state.profile?.accountType || "person",
    full_name: state.profile?.fullName || "",
    username: state.profile?.username || "",
    email: state.profile?.email || "",
    phone: state.profile?.phone || "",
    route: state.route || "",
    context: String(context || "").trim(),
    message: cleanMessage,
    status: "new"
  };
  const response = await fetch(`${supabaseConfig.url}/rest/v1/feedback_submissions`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([record])
  });
  if (!response.ok) throw new Error(`Feedback submission returned ${response.status}`);
  return record;
}

function recordAppAction(actionType, payload = {}) {
  if (!actionType) return;
  const record = {
    user_key: currentInteractionUserId(),
    action_type: actionType,
    route: state.route || "",
    profile_name: state.profile?.fullName || "",
    account_type: state.profile?.accountType || "person",
    payload
  };
  if (typeof trackAppEvent === "function") trackAppEvent(actionType, record);
  fetch(`${supabaseConfig.url}/rest/v1/app_action_events`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([record])
  }).catch(error => console.warn("[supabase] app action not recorded", actionType, error));
}

function socialUpsert(table, conflictColumns, record) {
  const url = `${supabaseConfig.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumns)}`;
  return fetch(url, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify([{ ...record, updated_at: new Date().toISOString() }])
  }).catch(error => console.warn(`[supabase] ${table} not recorded`, error));
}

function socialInsert(table, record) {
  return fetch(`${supabaseConfig.url}/rest/v1/${table}`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([record])
  }).catch(error => console.warn(`[supabase] ${table} not recorded`, error));
}

function submitFriendRelationship(friendName, status = "accepted", source = "app") {
  if (!friendName) return;
  return socialUpsert("friend_relationships", "user_key,friend_name", {
    user_key: currentInteractionUserId(),
    friend_name: friendName,
    status,
    source
  });
}

function submitFriendRelationshipForUser(userKey, friendName, status = "accepted", source = "referral") {
  if (!userKey || !friendName) return Promise.resolve();
  return socialUpsert("friend_relationships", "user_key,friend_name", {
    user_key: userKey,
    friend_name: friendName,
    status,
    source
  });
}

function submitGroupMembership(groupName, memberName = "You", status = "active", source = "app", role = "member") {
  if (!groupName || !memberName) return;
  return socialUpsert("group_memberships", "user_key,group_name,member_name", {
    user_key: currentInteractionUserId(),
    group_name: groupName,
    member_name: memberName,
    role,
    status,
    source
  });
}

function submitGroupMessage(groupName, message = {}) {
  if (!groupName) return;
  return socialInsert("group_messages", {
    user_key: currentInteractionUserId(),
    group_name: groupName,
    message_type: message.type || "text",
    message_text: message.text || "",
    event_id: message.eventId === undefined || message.eventId === null ? null : String(message.eventId)
  });
}

function submitDirectMessage(friendName, text) {
  if (!friendName || !String(text || "").trim()) return;
  return socialInsert("direct_messages", {
    user_key: currentInteractionUserId(),
    friend_name: friendName,
    direction: "outbound",
    message_text: String(text).trim()
  });
}

async function submitVenueFollow(venueName, active = true, source = "event_detail") {
  const cleanVenueName = String(venueName || "").trim();
  if (!cleanVenueName) return;
  const record = {
    user_key: currentInteractionUserId(),
    venue_name: cleanVenueName,
    active: Boolean(active),
    source
  };
  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/venue_follows?on_conflict=user_key%2Cvenue_name`, {
      method: "POST",
      headers: supabaseJsonHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify([{ ...record, updated_at: new Date().toISOString() }])
    });
    if (!response.ok) throw new Error(`Supabase venue follow returned ${response.status}`);
    return { synced: true };
  } catch (error) {
    queuePendingVenueFollow(record);
    console.warn("[supabase] venue follow queued locally:", error.message);
    return { queued: true, error };
  }
}

async function submitAttendanceReceipt(receipt) {
  if (!receipt?.id && !receipt?.eventId) return;
  const record = {
    user_key: currentInteractionUserId(),
    event_key: String(receipt.eventId || receipt.id),
    title: receipt.title || "",
    venue: receipt.venue || "",
    category: receipt.cat || "",
    event_time: receipt.time || "",
    attended_at: receipt.attendedAt ? new Date(receipt.attendedAt).toISOString() : new Date().toISOString(),
    active: true
  };
  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/event_attendance_receipts?on_conflict=user_key%2Cevent_key`, {
      method: "POST",
      headers: supabaseJsonHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify([{ ...record, updated_at: new Date().toISOString() }])
    });
    if (!response.ok) throw new Error(`Supabase attendance receipt returned ${response.status}`);
    return { synced: true };
  } catch (error) {
    console.warn("[supabase] attendance receipt not recorded:", error.message);
    return { queued: true, error };
  }
}

async function syncVenueVerificationStatus() {
  try {
    const userId = currentInteractionUserId();
    const url = `${supabaseConfig.url}/rest/v1/venue_verification_requests?select=venue_name,status,requester_user_id&requester_user_id=eq.${encodeURIComponent(userId)}&status=eq.approved&limit=200`;
    const response = await fetch(url, { headers: supabaseJsonHeaders() });
    if (!response.ok) return;
    const rows = await response.json();
    const names = [];
    rows.forEach(row => {
      if (row.requester_user_id !== userId) return;
      const key = venueImageKeyName(row.venue_name);
      if (key) state.verifiedVenues.add(key);
      if (row.venue_name && !names.some(name => venueImageKeyName(name) === key)) names.push(row.venue_name);
    });
    state.verifiedVenueNames = names;
    localStorage.setItem("lokalVerifiedVenues", JSON.stringify(Array.from(state.verifiedVenues)));
    localStorage.setItem("lokalVerifiedVenueNames", JSON.stringify(state.verifiedVenueNames));
    updateProfileShortcut();
  } catch {}
}

async function submitVenueEventPost(payload) {
  if (typeof isVerifiedVenueName === "function" && !isVerifiedVenueName(payload.venueName)) {
    throw new Error("Venue must be approved before posting events.");
  }
  const record = {
    requester_user_id: currentInteractionUserId(),
    venue_name: payload.venueName,
    venue_address: payload.venueAddress || "",
    title: payload.title,
    description: payload.description || "",
    category: payload.category || "community",
    tags: payload.tags || [],
    starts_at: payload.startsAt,
    ends_at: payload.endsAt || null,
    image_url: payload.imageUrl || "",
    ticket_url: payload.ticketUrl || "",
    price: payload.price || "",
    is_recurring: Boolean(payload.isRecurring),
    recurrence_frequency: payload.recurrenceFrequency || "",
    recurrence_until: payload.recurrenceUntil || null,
    status: "pending_review"
  };
  const response = await fetch(`${supabaseConfig.url}/rest/v1/venue_event_submissions`, {
    method: "POST",
    headers: supabaseJsonHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify([record])
  });
  if (!response.ok) throw new Error(`Venue event submission returned ${response.status}`);
  return record;
}

function cleanSupabaseDescription(value) {
  const cleaned = String(value || "")
    .replace(/^Sourced from [\w.-]+(?:\.com)?\s*-\s*/i, "")
    .replace(/^Sourced from [\w.-]+(?:\.com)?\.?\s*/i, "")
    .replace(/\s*Sourced from [\w.-]+(?:\.com)?\.?\s*/ig, " ")
    .replace(/\s*\[\.\.\.\]\s*$/g, "...")
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

function extractLocationFromDescription(value) {
  const description = cleanImportedText(value);
  const details = { venue: "", address: "", description };
  if (!description) return details;
  const labeled = description.match(/(?:^|\n)\s*(address|location|where|venue)\s*:\s*([^\n\r]+)/i);
  if (labeled) {
    const label = labeled[1].toLowerCase();
    const location = labeled[2].trim().replace(/[.;,]+$/g, "");
    if (location) {
      if (label === "address" || isAddressOnlyVenue(location)) details.address = location;
      else details.venue = location;
    }
    details.description = description
      .replace(new RegExp(`\\n?\\s*${labeled[1]}\\s*:\\s*${labeled[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return details;
}

function rawEventApiAddress(row) {
  return row.raw_json?.geo?.address?.formatted_address || row.raw_json?.entities?.find(entity => entity.formatted_address)?.formatted_address || extractLocationFromDescription(row.description || row.desc).address || "";
}

function rawEventApiVenueName(row) {
  const entity = row.raw_json?.entities?.find(item => ["venue", "place"].includes(item.type) && item.name && !isAddressOnlyVenue(item.name));
  return entity?.name || extractLocationFromDescription(row.description || row.desc).venue || inferVenueNameFromText(`${row.title || ""} ${row.description || ""} ${row.raw_json?.description || ""}`);
}

function rawImageUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.url || value.image_url || value.thumbnail_url || value.original_url || "";
}

function imageCandidateScore(value) {
  const url = rawImageUrl(value);
  if (!url) return -1;
  if (typeof value === "string") return /thumb|thumbnail|small|w_?\d{2,3}/i.test(value) ? 1 : 250000;
  const width = Number(value.width || value.w || value.size?.width || 0);
  const height = Number(value.height || value.h || value.size?.height || 0);
  let score = width && height ? width * height : 250000;
  if (/retina|large|original|master|source/i.test(url)) score += 250000;
  if (/tablet|desktop|hero|banner/i.test(url)) score += 100000;
  if (/thumb|thumbnail|small|icon|logo/i.test(url)) score -= 150000;
  return score;
}

function bestRawImageUrl(value) {
  const list = (Array.isArray(value) ? value : [value]).flat();
  return list
    .map(item => ({ url: rawImageUrl(item), score: imageCandidateScore(item) }))
    .filter(item => item.url)
    .sort((a, b) => b.score - a.score)[0]?.url || "";
}

function rawEventApiImage(row) {
  const direct = bestRawImageUrl([row.image_url, row.image, row.raw_json?.image_url, row.raw_json?.image]);
  if (direct) return direct;
  const eventImage = bestRawImageUrl(row.raw_json?.images);
  if (eventImage) return eventImage;
  const entities = Array.isArray(row.raw_json?.entities) ? row.raw_json.entities : [];
  return entities
    .map(entity => bestRawImageUrl([entity.image, entity.image_url, entity.logo, entity.thumbnail, entity.images]))
    .filter(Boolean)[0] || "";
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
  const extracted = extractLocationFromDescription(row.description || row.desc);
  const venue = cleanImportedText(row.venue_name || row.venue || row.location_name || "");
  const inferredVenue = rawEventApiVenueName(row) || extracted.venue || inferVenueNameFromText(`${row.title || ""} ${row.description || ""} ${row.raw_json?.description || ""}`);
  const genericVenue = isAddressOnlyVenue(venue) || (typeof isGenericLocationName === "function" && isGenericLocationName(venue));
  if (row.source !== "manual" && genericVenue) return inferredVenue || venue || "Location in description";
  return venue || inferredVenue || "Location in description";
}

function normalizeSupabaseArea(row) {
  const extracted = extractLocationFromDescription(row.description || row.desc);
  return row.neighborhood || row.area || extracted.address || "Washington, DC";
}

function supabaseLocationText(row) {
  return `${row.venue_address || ""} ${row.address || ""} ${rawEventApiAddress(row)} ${row.neighborhood || ""} ${row.area || ""} ${row.venue_name || ""} ${row.venue || ""} ${row.raw_json?.geo?.address?.locality || ""} ${row.raw_json?.geo?.address?.region || ""} ${row.raw_json?.geo?.address?.country_code || ""}`.toLowerCase();
}

function isSupabaseEventInDc(row) {
  const text = supabaseLocationText(row);
  const nonDcText = /\b(arlington|alexandria|bethesda|silver spring|national harbor|vienna|fairfax|falls church|rockville|hyattsville|college park|landover|tysons|mclean|reston|gaithersburg|laurel|bowie|annapolis|baltimore|md\b|va\b|virginia|maryland)\b/.test(text);
  const knownDcVenue = /\b(miracle theatre|sixth\s*&\s*i|mlk library|martin luther king jr memorial library|rock creek park tennis center|politics and prose|kennedy center|national theatre|warner theatre|the anthem|union stage|9:30 club|930 club|the atlantis|howard theatre|echostage|capital one arena|nationals park|carefirst arena)\b/.test(text);
  const dcText = knownDcVenue || /washington,\s*(dc|d\.c\.)|washington,\s*district of columbia|district of columbia|\bdc\b|\bd\.c\.\b|\bnw\b|\bne\b|\bsw\b|\bse\b/.test(text);
  if (nonDcText && !dcText) return false;
  if (dcText) return true;
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

function bestSupabaseDescription(row) {
  const values = [
    row.raw_json?.full_description,
    row.raw_json?.detail_description,
    row.raw_json?.description,
    row.description,
    row.desc,
    row.raw_json?.listing?.summary
  ].map(value => String(value || "").trim()).filter(Boolean);
  if (String(row.source || "").toLowerCase() !== "thingstododc") return values[0] || "";
  const complete = values
    .filter(value => !/\[\s*\.\.\.\s*\]|\.\.\.$/.test(value))
    .sort((a, b) => b.length - a.length)[0];
  return complete || values.sort((a, b) => b.length - a.length)[0] || "";
}

function normalizeSupabaseDescription(row) {
  const extracted = extractLocationFromDescription(bestSupabaseDescription(row));
  return cleanSupabaseDescription(extracted.description);
}

function hasReliableSupabaseStart(row) {
  // Discovery should only show events with a real scheduled start. Date-only
  // rows are kept in Supabase, but they should not appear in the app feed.
  const category = normalizeImportedCategory(row);
  const hasClockText = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.test(String(row.time || ""));
  const source = row.starts_at || row.start_time || row.start_at;
  if (category === "sports" && source && !hasClockText) {
    const parts = eventStartTimePartsFromRow(row);
    if (parts && parts.hour === 0 && parts.minute === 0) return false;
  }
  if (row.starts_at || row.start_time || row.start_at) return Number.isFinite(eventStartSortFromRow(row));
  return Boolean(row.date && eventStartTimePartsFromRow(row));
}

function eventStartTimePartsFromRow(row) {
  const source = row.starts_at || row.start_time || row.start_at;
  if (source) {
    const date = new Date(source);
    if (!Number.isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: false }).formatToParts(date);
      return {
        hour: Number(parts.find(part => part.type === "hour")?.value || 0) % 24,
        minute: Number(parts.find(part => part.type === "minute")?.value || 0)
      };
    }
  }
  const timeText = String(row.time || row.start_time || row.start_at || "");
  const match = timeText.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return { hour, minute: Number(match[2] || 0) };
}

function eventStartHourFromRow(row) {
  const parts = eventStartTimePartsFromRow(row);
  return parts ? parts.hour : null;
}

function eventStartSortFromRow(row) {
  const source = row.starts_at || row.start_time || row.start_at;
  if (source) {
    const date = new Date(source);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  const parts = row.date ? eventStartTimePartsFromRow(row) : null;
  if (row.date && parts) {
    const date = new Date(`${row.date}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date.getTime() + parts.hour * 60 * 60 * 1000 + parts.minute * 60 * 1000;
  }
  return Number.MAX_SAFE_INTEGER;
}

function startOfDiscoveryWindowSortValue() {
  return Date.now();
}

function endOfDiscoveryWindowSortValue() {
  const end = new Date();
  // 21-day window so concerts, live music, and museum events (most dated more
  // than a week out) appear alongside the daily recurring happy hours/trivia.
  end.setDate(end.getDate() + 21);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}
function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function discoveryWindowQueries() {
  const start = new Date(startOfDiscoveryWindowSortValue());
  const end = new Date(endOfDiscoveryWindowSortValue());
  const selectAndStatus = "select=*&status=eq.published";
  const today = localDateKey(start);
  return [
    `${selectAndStatus}&date=gte.${today}&date=lte.${localDateKey(end)}`,
    `${selectAndStatus}&starts_at=gte.${encodeURIComponent(start.toISOString())}&starts_at=lte.${encodeURIComponent(end.toISOString())}`
  ];
}


function isEventInDiscoveryWindow(event) {
  if (!Number.isFinite(event.startSort) || event.startSort === Number.MAX_SAFE_INTEGER) return false;
  return event.startSort >= startOfDiscoveryWindowSortValue() && event.startSort <= endOfDiscoveryWindowSortValue();
}

function normalizeImportedCategory(row) {
  const importedCategories = new Set(["concerts", "live-music", "festivals", "culture", "kids", "performing-arts", "sports", "community", "museums", "nightlife", "happy-hours", "trivia-nights", "food"]);
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
    kids: "kids",
    family: "kids",
    "family friendly": "kids",
    "family-friendly": "kids",
    "live music": "live-music",
    "live-music": "live-music",
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
  if (/\b(family|families|family[- ]friendly|kid|kids|children|children's|childrens|all[- ]ages|story\s*time|storytime|youth|bluey|disney|puppet|toddler)\b/.test(text)) return "kids";
  if (row.source === "thingstododc" && /\b(scavenger|hunt|game of clue|interactive)\b/.test(text)) return "community";
  if (/\b(embassy|ambassador|international|cultural|culture|heritage|foreign soil|ukraine house|egyptian cultural|venetian ball)\b/.test(text)) return "culture";
  if (directCategoryMap[directCategory]) return directCategoryMap[directCategory];
  if (["concerts", "live-music", "happy-hours", "trivia-nights", "nightlife", "food", "culture", "kids"].includes(directCategory)) return directCategory;
  if (/comedy|comedian|stand[- ]?up|improv/.test(classificationText)) return "performing-arts";
  if (/sports|baseball|basketball|football|hockey|soccer/.test(classificationText)) return "sports";
  if (/music|rock|pop|r&b|hip[- ]?hop|rap|jazz|latin|country|dance|electronic/.test(classificationText)) return "concerts";
  if (/arts|theatre|theater|performance|play|musical/.test(classificationText)) return "performing-arts";
  if (directCategoryMap[directCategory]) return directCategoryMap[directCategory];
  if (directCategory === "happy-hours") return "happy-hours";
  if (directCategory === "trivia-nights") return "trivia-nights";
  if (/museum|smithsonian|hirshhorn|renwick|portrait gallery|american art museum|air and space|natural history|american history/.test(text)) return "museums";
  if (/\b(9:30 club|930 club|the anthem|capital one arena|dar constitution hall|constitution hall|the howard theatre|howard theatre|echostage|nationals park|union stage)\b/.test(venueText)) return "concerts";
  if (/9:30 club|echostage|soundcheck|flash nightclub|decades|ultrabar|heist|saint yves|zebbie|madam'?s organ|black cat|dc9|the crown & crow|viceroy rooftop/.test(venueText) || /\b(nightlife|nightclub|dance club|club night|bar crawl|cocktail|speakeasy|lounge|rooftop|dance party|after dark|late night|dj set|pride party)\b/.test(text)) return "nightlife";
  if (/\b(comedy|stand up|stand-up|standup|improv|comic|comedian)\b|room 808|comedy club|comedy cellar|dc improv/.test(text)) return "performing-arts";
  if (directCategory === "expos" || directCategory === "expo") return "community";
  if (importedCategories.has(directCategory)) return directCategory;
  if (/signature theatre|kennedy center|warner theatre|lincoln theatre|theatre|theater|performance art|performing|arts & theatre|comedy|film|cinema|dance|musical|opera|stage play|pippin|what became of us/.test(text)) return "performing-arts";
  if (/concert/.test(text)) return "concerts";
  if (/music|r&b|hip-hop|rap|jazz|latin|country|rock|pop|dj|band|singer|songwriter/.test(text)) return "live-music";
  if (/baseball|basketball|football|soccer|hockey|sports|mlb|nba|nfl|nhl/.test(text)) return "sports";
  if (/embassy|ambassador|international|cultural|culture|heritage|foreign soil/.test(text)) return "culture";
  if (/\b(family|families|family[- ]friendly|kid|kids|children|children's|childrens|all[- ]ages|story\s*time|storytime|youth|bluey|disney|puppet|toddler)\b/.test(text)) return "kids";
  if (/festival|fair/.test(text)) return "festivals";
  if (/expo|conference|convention/.test(text)) return "community";
  if (/showcase/.test(text)) return "performing-arts";
  if (/band|artist|singer|songwriter/.test(text)) return "live-music";
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
  if (/museum|smithsonian|hirshhorn|renwick gallery|portrait gallery|american art museum|air and space|natural history|american history/.test(text)) inferredTags.push("Museums");
  if (/smithsonian|hirshhorn|renwick gallery|national portrait gallery|american art museum|national air and space museum|national museum of african american history|national museum of natural history|national museum of american history/.test(text)) inferredTags.push("Smithsonian");
  if (["concerts", "live-music"].includes(category)) inferredTags.push(...concertDetailTags(row));
  if (/\b(theatre|theater|performance art|performing|arts? & theatre|gallery|art|arts|exhibit|exhibition|musical|opera)\b/.test(text)) inferredTags.push("Arts");
  if (/comedy|stand up|stand-up|improv/.test(text)) inferredTags.push("Comedy");
  if (/film|cinema|screening|movie/.test(text)) inferredTags.push("Film");
  const sportTags = sportsLeagueTags(row);
  if (sportTags.length || /baseball|basketball|football|soccer|hockey|sports|mlb|nba|nfl|nhl|mls|wnba|nationals|mystics|wizards|capitals|commanders|d\.?c\.? united|dc united/.test(text)) inferredTags.push("Sports", ...sportTags);
  if (category === "nightlife" && (/flash nightclub|decades|ultrabar|heist|saint yves|zebbie|madam'?s organ|the crown & crow|viceroy rooftop/.test(venueText) || /\b(nightlife|nightclub|club promo|club night|bar crawl|cocktail|speakeasy|lounge|rooftop party|dance party|after dark|late night|pride party)\b/.test(text))) inferredTags.push("Nightlife");
  if (/food|drink|wine|beer|cocktail|restaurant|brunch|market/.test(text)) inferredTags.push("Food & Drink");
  if (rowIsExplicitlyFree(row)) inferredTags.push("Free");
  if (category === "performing-arts") inferredTags.push(...performingArtsDetailTags(row));
  const categoryAliases = {
    concerts: ["concert", "concerts"],
    "live-music": ["live music", "music"],
    "performing-arts": ["arts", "art", "performing arts", "performance"],
    museums: ["museums", "museum"],
    festivals: ["festivals", "festival"],
    culture: ["culture", "cultural"],
    kids: ["kids", "kid friendly", "family friendly", "family"],
    sports: ["sports", "sport"],
    community: ["community", "expos", "expo"],
    nightlife: ["nightlife", "night out"],
    "happy-hours": ["happy hour", "happy hours"],
    "trivia-nights": ["trivia", "trivia night", "trivia nights"],
    food: ["food", "food & drink", "food and drink"]
  }[category] || [];
  const locationAliases = [
    "adams morgan", "u street", "shaw", "navy yard", "penn quarter", "h street", "logan circle",
    "dupont", "dupont circle", "georgetown", "noma", "no ma", "union market", "noma / union market area",
    "capitol hill", "anacostia", "columbia heights", "petworth", "the wharf", "wharf", "downtown",
    "mount vernon", "mount vernon triangle", "foggy bottom", "west end", "cleveland park", "woodley park",
    "brookland", "ivy city", "barracks row", "southwest", "national mall", "kalorama", "van ness",
    "cathedral heights", "park view", "takoma", "takoma dc", "washington dc", "washington, dc"
  ];
  const rowLocations = [row.neighborhood, row.area, row.venue_address, row.address]
    .map(value => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const broadCategoryAliases = [
    "concert", "concerts", "live music", "music", "arts", "art", "performing arts", "performance",
    "museums", "kids", "kid friendly", "family friendly", "family", "sports", "sport", "community", "expos", "expo", "nightlife", "night out",
    "happy hour", "happy hours", "trivia", "trivia night", "trivia nights", "food", "food & drink", "food and drink",
    "festival", "festivals", "culture", "cultural", "free"
  ];
  return [...inferredTags, ...rawTags, row.tag, ...labels]
    .map(normalizeTagValue)
    .map(tag => String(tag || "").trim())
    .filter(tag => tag && tag !== "[object Object]")
    .filter(tag => !categoryAliases.includes(tag.toLowerCase()))
    .filter(tag => !broadCategoryAliases.includes(tag.toLowerCase()))
    .filter(tag => !locationAliases.includes(tag.toLowerCase()) && !rowLocations.includes(tag.toLowerCase()))
    .filter(tag => !["concerts", "live-music"].includes(category) || !["concert", "concerts", "live music", "music", "arts", "art", "free", "nightlife", "night out"].includes(tag.toLowerCase()))
    .filter(tag => category !== "performing-arts" || !["arts", "art", "performing-arts", "performing arts", "museum", "museums", "smithsonian", "performance", "theater", "theatre", "stage show", "touring show", "family show", "live show", "ticketed", "opera"].includes(tag.toLowerCase()))
    .filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 8);
}

// Venue images pulled from the Supabase `venues` table (venues.image_url),
// used as a fallback when an event has no image of its own. Matched by a
// normalized venue name, mirroring the server-side venue_image_key().
let venueImageMap = {};
function venueImageKeyName(value) {
  // Mirrors the server-side public.venue_image_key() so client matches line up.
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/^the\s+/, "")
    .replace(/\s+(bar|cafe|lounge|tavern|dc)$/, "")
    .replace(/[^a-z0-9]+/g, "");
}
let venueImageKeys = [];
function venueImageForRow(row) {
  const key = venueImageKeyName(row.venue_name || row.venue);
  if (!key) return "";
  if (venueImageMap[key]) return venueImageMap[key];
  // Fuzzy fallback: event venue names are often more specific than the venue row
  // (e.g. "Atlas Brew Works Navy Yard" vs "Atlas Brew Works"). Match when one
  // normalized name is a prefix/substring of the other. Keys are sorted longest
  // first so the most specific venue wins.
  for (const vk of venueImageKeys) {
    if (vk.length < 6) continue;
    if (key.startsWith(vk) || vk.startsWith(key) || key.includes(vk) || vk.includes(key)) return venueImageMap[vk];
  }
  return "";
}
async function syncSupabaseVenueImages() {
  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/venues?select=*&limit=4000`, { headers: { apikey: supabaseConfig.publishableKey } });
    if (!response.ok) return;
    const rows = await response.json();
    const map = {};
    const directoryRows = [];
    rows.forEach(venue => {
      const key = venueImageKeyName(venue.name);
      const img = String(venue.image_url || "").trim(); // some rows have stray leading CR/LF
      if (key && /^(https?:|data:)/i.test(img)) map[key] = img;
      if (venue.name) {
        directoryRows.push({
          name: venue.name,
          address: venue.address || "",
          neighborhood: venue.neighborhood || "",
          venue_type: venue.venue_type || "",
          website_url: venue.website_url || "",
          image_url: /^(https?:|data:)/i.test(img) ? img : ""
        });
      }
    });
    venueImageMap = map;
    venueImageKeys = Object.keys(map).sort((a, b) => b.length - a.length);
    venueDirectory = [...venueDirectory, ...directoryRows]
      .filter((venue, index, all) => venue.name && all.findIndex(item => venueImageKeyName(item.name) === venueImageKeyName(venue.name)) === index);
  } catch {}
}

function normalizeSupabaseEvent(row, index) {
  row = normalizeSupabaseEventCorrections(row);
  const category = normalizeImportedCategory(row);
  const tags = normalizeSupabaseTags(row, category);
  const eventImage = rawEventApiImage(row);
  const venueImage = venueImageForRow(row);
  const hasReliableStart = hasReliableSupabaseStart(row);
  return {
    id: 1000 + index,
    sourceId: row.id,
    source: row.source || "manual",
    detailsUrl: row.ticket_url || row.external_url || row.url || "",
    title: row.title || row.name || "Untitled Lokal event",
    venue: normalizeSupabaseVenue(row),
    venueAddress: row.venue_address || row.address || rawEventApiAddress(row) || "",
    area: normalizeSupabaseArea(row),
    time: hasReliableStart ? (row.date && row.time ? formatSupabaseDateAndTime(row.date, row.time) : formatSupabaseTime(row.starts_at || row.start_time || row.start_at || row.date)) : (category === "sports" ? formatSupabaseDateWithTbaTime(row) : "Ongoing / time varies"),
    startDate: row.date || "",
    startHour: eventStartHourFromRow(row),
    startSort: eventStartSortFromRow(row),
    hasPreciseStart: hasReliableStart && Boolean(row.starts_at || row.start_time || row.start_at),
    isRecurring: Boolean(row.is_recurring),
    price: ["happy-hours", "trivia-nights", "museums"].includes(category) ? "" : normalizeSupabasePriceFromRow(row),
    cat: category,
    tag: tags[0] || row.tag || row.category || "Local event",
    tags,
    image: eventImage || venueImage,
    imageFit: eventImage ? "" : venueImage ? "contain" : "",
    imageKind: eventImage ? "" : venueImage ? "venue" : "",
    friends: Array.isArray(row.friends) ? row.friends : [],
    desc: normalizeSupabaseDescription(row)
  };
}

function normalizeSupabaseEventCorrections(row) {
  const title = String(row?.title || "").toLowerCase();
  const venue = String(row?.venue_name || row?.venue || "").toLowerCase();
  const externalId = String(row?.external_id || "");
  const georgetownHomeFootballSchedule = [
    { opponent: "lafayette", date: "2026-08-27", time: "7:00 PM", start: "2026-08-27T19:00:00-04:00", end: "2026-08-27T22:00:00-04:00", status: "cancelled" },
    { opponent: "lehigh", date: "2026-09-05", time: "12:30 PM", start: "2026-09-05T12:30:00-04:00", end: "2026-09-05T15:30:00-04:00" },
    { opponent: "columbia", date: "2026-09-26", time: "12:30 PM", start: "2026-09-26T12:30:00-04:00", end: "2026-09-26T15:30:00-04:00" },
    { opponent: "cornell", date: "2026-10-03", time: "12:30 PM", start: "2026-10-03T12:30:00-04:00", end: "2026-10-03T15:30:00-04:00" },
    { opponent: "bucknell", date: "2026-10-10", time: "12:30 PM", start: "2026-10-10T12:30:00-04:00", end: "2026-10-10T15:30:00-04:00" },
    { opponent: "holy cross", date: "2026-11-07", time: "12:30 PM", start: "2026-11-07T12:30:00-04:00", end: "2026-11-07T15:30:00-04:00" }
  ];
  const howardHomeFootballSchedule = [
    { opponent: "richmond", date: "2026-09-05", time: "6:00 PM", start: "2026-09-05T18:00:00-04:00", end: "2026-09-05T21:00:00-04:00", venue: "Greene Stadium", area: "Shaw", address: "Greene Stadium, Washington, DC" },
    { opponent: "hampton", date: "2026-10-03", time: "3:00 PM", start: "2026-10-03T15:00:00-04:00", end: "2026-10-03T18:00:00-04:00", venue: "Audi Field", area: "Navy Yard", address: "Audi Field, 100 Potomac Ave SW, Washington, DC 20024" },
    { opponent: "morehouse", date: "2026-10-17", time: "3:30 PM", start: "2026-10-17T15:30:00-04:00", end: "2026-10-17T18:30:00-04:00", venue: "Greene Stadium", area: "Shaw", address: "Greene Stadium, Washington, DC" },
    { opponent: "south carolina state", date: "2026-11-05", time: "5:00 PM", start: "2026-11-05T17:00:00-04:00", end: "2026-11-05T20:00:00-04:00", venue: "Greene Stadium", area: "Shaw", address: "Greene Stadium, Washington, DC" },
    { opponent: "delaware state", date: "2026-11-14", time: "1:00 PM", start: "2026-11-14T13:00:00-05:00", end: "2026-11-14T16:00:00-05:00", venue: "Greene Stadium", area: "Shaw", address: "Greene Stadium, Washington, DC" }
  ];
  const source = String(row?.source || "").toLowerCase();
  const isGeorgetownFootball = (
    title.includes("georgetown hoyas football")
    || title.includes("georgetown football")
    || source === "guhoyas"
  ) && venue.includes("cooper field");
  if (isGeorgetownFootball) {
    const officialGame = georgetownHomeFootballSchedule.find(game => title.includes(game.opponent) || externalId.includes(`_${game.opponent.replace(/\s+/g, "_")}_`));
    if (officialGame) {
      return {
        ...row,
        date: officialGame.date,
        time: officialGame.time,
        starts_at: officialGame.start,
        ends_at: row.ends_at || officialGame.end,
        status: officialGame.status || row.status,
        ticket_url: "https://am.ticketmaster.com/guhoyas/buy/footballtickets",
        external_url: "https://guhoyas.com/sports/football/schedule/2026",
        url: "https://guhoyas.com/sports/football/schedule/2026",
        neighborhood: row.neighborhood || "Georgetown",
        venue_address: row.venue_address || "Cooper Field, 1401 West Road NW, Washington, DC 20057",
        is_free: false
      };
    }
  }
  const isHowardFootball = title.includes("howard") && title.includes("football");
  if (isHowardFootball) {
    const officialGame = howardHomeFootballSchedule.find(game => title.includes(game.opponent) || externalId.includes(`_${game.opponent.replace(/\s+/g, "_")}`));
    if (officialGame) {
      return {
        ...row,
        date: officialGame.date,
        time: officialGame.time,
        starts_at: officialGame.start,
        ends_at: row.ends_at || officialGame.end,
        ticket_url: "https://hubison.com/sports/football/schedule/2026",
        external_url: "https://hubison.com/sports/football/schedule/2026",
        url: "https://hubison.com/sports/football/schedule/2026",
        venue_name: officialGame.venue,
        venue: officialGame.venue,
        neighborhood: officialGame.area,
        venue_address: officialGame.address,
        is_free: false
      };
    }
  }
  return row;
}

// PostgREST caps every response at 1000 rows regardless of the requested limit,
// so a single fetch silently drops most of an over-subscribed discovery window
// (thousands of daily happy-hour/trivia/music rows push later-dated events past
// the cap). Page through with offset until a short page signals the end. A stable
// id tiebreaker keeps slices from overlapping or skipping across pages.
async function fetchSupabaseEventPages(query) {
  const pageSize = 1000;
  const order = "starts_at.asc.nullslast,date.asc.nullslast,id.asc";
  const rows = [];
  for (let offset = 0; offset < 20000; offset += pageSize) {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/events?${query}&order=${order}&limit=${pageSize}&offset=${offset}`, {
      cache: "no-store",
      headers: { apikey: supabaseConfig.publishableKey, "Cache-Control": "no-cache" }
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function syncSupabaseEvents(showToast = false) {
  state.eventSync = { status: "loading", label: "Checking shared events..." };
  state.eventsLoadTimedOut = false;
  setTimeout(() => {
    if (state.eventSync.status === "loading") {
      state.eventsLoadTimedOut = true;
      if (state.route === "home") renderHome();
    }
  }, 5000);
  if (state.route === "home") renderHome();
  await syncSupabaseVenueImages();
  await syncVenueVerificationStatus();
  try {
    const rowSets = await Promise.all(discoveryWindowQueries().map(fetchSupabaseEventPages));
    const rows = [...new Map(rowSets.flat().map(row => [row.id, row])).values()];
    if (rows.length) {
      const dcRows = rows.filter(isSupabaseEventInDc);
      const normalized = dcRows.map(normalizeSupabaseEvent);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      state.todayStoryEvents = normalized
        .filter(event => Number.isFinite(event.startSort) && event.startSort < Number.MAX_SAFE_INTEGER)
        .filter(event => sameCalendarDate(new Date(event.startSort), today));
      const discoveryWindowEvents = normalized.filter(isEventInDiscoveryWindow);
      events = discoveryWindowEvents;
      state.eventSync = { status: "synced", label: `${events.length} upcoming DC event${events.length === 1 ? "" : "s"}` };
    } else {
      events = [];
      state.todayStoryEvents = [];
      state.eventSync = { status: "empty", label: "No upcoming DC events found yet" };
    }
  } catch {
    events = [];
    state.todayStoryEvents = [];
    state.eventSync = { status: "error", label: "Events could not load" };
  }
  // The venue name clusters are derived from the loaded events, so they have to
  // be rebuilt whenever the event set is replaced.
  if (typeof venueCanonicalReset === "function") venueCanonicalReset();
  reconcileUserPlans();
  await syncSupabaseFriendInterests();
  if (state.route === "home") renderHome();
  openSharedEventFromUrl();
  if (showToast) toast(state.eventSync.label);
}

function openSharedEventFromUrl() {
  if (state.sharedEventOpened) return;
  const params = new URLSearchParams(location.search);
  const eventParam = params.get("event");
  if (!eventParam) return;
  const shouldOpen = params.get("openEvent") === "1" || params.get("shared") === "1";
  if (!shouldOpen) {
    params.delete("event");
    const nextSearch = params.toString();
    history.replaceState(null, "", `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`);
    state.sharedEventOpened = true;
    return;
  }
  const sharedEvent = events.find(event => String(event.sourceId || event.id) === String(eventParam) || String(event.id) === String(eventParam));
  if (!sharedEvent) return;
  state.sharedEventOpened = true;
  params.delete("event");
  params.delete("openEvent");
  params.delete("shared");
  const nextSearch = params.toString();
  history.replaceState(null, "", `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`);
  openDetail(sharedEvent.id);
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
  if (state.route === "social") renderSocial();
}

function normalizeSupabaseProfile(row) {
  const fullName = row.full_name || row.fullName || row.display_name || "Lokal Friend";
  return {
    id: row.id || row.user_id || "",
    initials: row.avatar_initials || profileInitials(fullName || row.username || ""),
    fullName,
    username: row.username || "lokalfriend",
    phone: row.phone || "",
    birthdate: row.birthdate || "",
    mutuals: row.mutuals || `${2 + (String(fullName || row.username || "").length % 7)} mutual friends`,
    bio: row.bio || row.home_city || (Array.isArray(row.neighborhoods) ? row.neighborhoods.join(", ") : "") || "Washington, DC",
    isSeeded: row.is_demo === true
  };
}

function mergeFriendDirectory(profiles) {
  const currentUserId = typeof currentInteractionUserId === "function" ? currentInteractionUserId() : "";
  const rows = profiles
    .filter(profile => profile && profile.id && profile.isSeeded !== true)
    .map(profileToFriendRow)
    .filter(friend => friend[5] && String(friend[5]) !== String(currentUserId));
  friendDirectory = rows.filter((friend, index, all) => all.findIndex(item => item[5] === friend[5] || item[1] === friend[1]) === index);
  state.friends = new Set(Array.from(state.friends || []).filter(name => friendDirectory.some(friend => friend[1] === name && friend[5])));
}

function currentFriendProfiles() {
  return friendDirectory
    .filter(friend => state.friends.has(friend[1]))
    .map(friend => ({ initials: friend[0], name: friend[1], username: friend[2], id: friend[5] }))
    .filter(friend => friend.id);
}

function eventSourceIdMap() {
  const map = new Map();
  events.forEach(event => {
    const sourceId = interactionEventId(event);
    if (sourceId) map.set(String(sourceId), event);
  });
  return map;
}

async function syncSupabaseFriendInterests() {
  const friends = currentFriendProfiles();
  const eventMap = eventSourceIdMap();
  if (!friends.length || !eventMap.size) {
    state.friendEventInterests = new Map();
    state.friendEventInterestsLoaded = true;
    return;
  }
  const friendById = new Map(friends.map(friend => [String(friend.id), friend]));
  const eventIds = Array.from(eventMap.keys());
  const friendIds = friends.map(friend => friend.id);
  const chunks = [];
  for (let index = 0; index < eventIds.length; index += 80) chunks.push(eventIds.slice(index, index + 80));
  const next = new Map();
  try {
    for (const eventChunk of chunks) {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/rpc/friend_event_interests`, {
        method: "POST",
        headers: supabaseJsonHeaders(),
        body: JSON.stringify({ friend_ids: friendIds, event_ids: eventChunk.map(Number) })
      });
      if (!response.ok) throw new Error(`Supabase friend interests returned ${response.status}`);
      const rows = await response.json();
      rows.forEach(row => {
        const friend = friendById.get(String(row.user_id));
        const event = eventMap.get(String(row.event_id));
        if (!friend || !event) return;
        const key = String(event.sourceId || event.id);
        if (!next.has(key)) next.set(key, []);
        const list = next.get(key);
        if (!list.some(item => item.name === friend.name)) list.push(friend);
      });
    }
    state.friendEventInterests = next;
    state.friendEventInterestsLoaded = true;
  } catch (error) {
    console.warn("[supabase] friend event interests unavailable:", error.message);
    state.friendEventInterestsLoaded = false;
  }
}

async function syncSupabaseProfiles() {
  try {
    let response = await fetch(`${supabaseConfig.url}/rest/v1/profiles?select=id,username,full_name,birthdate,phone,bio,home_city,is_demo&or=(is_demo.is.false,is_demo.is.null)&order=full_name.asc`, {
      headers: { apikey: supabaseConfig.publishableKey }
    });
    let rows = response.ok ? await response.json() : [];
    if (!response.ok || !rows.length) {
      response = await fetch(`${supabaseConfig.url}/rest/v1/Profiles?select=id,username,display_name,birthdate,bio,avatar_initials,taste_tags,neighborhoods,is_demo&or=(is_demo.is.false,is_demo.is.null)&order=display_name.asc`, {
        headers: { apikey: supabaseConfig.publishableKey }
      });
      rows = response.ok ? await response.json() : [];
    }
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    if (rows.length) mergeFriendDirectory(rows.map(normalizeSupabaseProfile));
  } catch {
    friendDirectory = [];
  }
  await syncSupabaseFriendInterests();
  if (state.route === "home") renderHome();
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
  const label = document.querySelector("#profile-shortcut .account-label");
  if (shortcut) shortcut.textContent = currentAccountInitials();
  if (label) label.textContent = currentAccountDisplayName().split(/\s+/).slice(0, 3).join(" ");
}

function finalizeLokalProfile(profile) {
  const age = calculateAge(profile.birthdate);
  const chosenTastes = profile.eventInterests?.length ? profile.eventInterests : state.tastes;
  const saved = {
    ...profile,
    phone: formatDisplayPhone(profile.phone),
    age,
    initials: profileInitials(profile.fullName),
    bio: state.bio,
    tastes: age >= 21 ? chosenTastes : chosenTastes.filter(taste => !["Happy hours", "Nightlife"].includes(taste)),
    areas: profile.areaInterests || [],
    accountType: "person",
    ownerName: "",
    venueName: "",
    venueAddress: "",
    venueWebsite: "",
    venueImageUrl: "",
    venueDescription: "",
    lokalScore: 100
  };
  state.profile = saved;
  state.age = saved.age;
  state.tastes = saved.tastes;
  state.friends = new Set();
  state.receipts = [];
  state.attended = new Set();
  state.saved = new Set();
  state.rsvps = new Set();
  state.savedSources = new Set();
  state.rsvpSources = new Set();
  localStorage.setItem("lokalReceipts", "[]");
  localStorage.setItem("lokalAttended", "[]");
  localStorage.setItem("lokalSavedSources", "[]");
  localStorage.setItem("lokalRsvpSources", "[]");
  state.verifiedVenues = new Set();
  state.verifiedVenueNames = [];
  state.pendingVenueRequests = [];
  state.venueVerificationDismissed = false;
  ["lokalVerifiedVenues", "lokalVerifiedVenueNames", "lokalPendingVenueRequests", "lokalVenueVerificationDismissed"].forEach(key => localStorage.removeItem(key));
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

// One rule, applied everywhere a password is set: long enough, and not a bare
// string of digits — it has to contain letters.
const SIGNUP_PASSWORD_MIN = 8;

function validateSignupPassword(password) {
  const value = String(password || "");
  if (value.length < SIGNUP_PASSWORD_MIN) throw new Error(`Use a password with at least ${SIGNUP_PASSWORD_MIN} characters.`);
  if (!/[a-zA-Z]/.test(value)) throw new Error("Your password needs to include at least one letter.");
}

// An email address gets one Lokal account. Checked against the profiles table
// before signup runs, so the duplicate is caught while the user is still on the
// form rather than surfacing as a Supabase error three screens later.
async function emailAlreadyRegistered(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!value) return false;
  const stored = getLokalCredentials();
  if (stored?.email && stored.email === value && localStorage.getItem("lokalHasAccount") === "true") return true;
  try {
    // ilike with no wildcards is a case-insensitive equality, which is what we
    // want — stored addresses are not normalised to lower case everywhere.
    const url = `${supabaseConfig.url}/rest/v1/profiles?select=id&email=ilike.${encodeURIComponent(value)}&limit=1`;
    const response = await fetch(url, { headers: supabaseJsonHeaders() });
    if (!response.ok) return false;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    // Offline or blocked: don't block a legitimate signup on a failed lookup.
    // Supabase still rejects a duplicate address at signup time.
    return false;
  }
}

function isDuplicateAccountError(error) {
  return /already registered|already exists|already been registered|already has a lokal account|duplicate key|user_repeated_signup/i.test(String(error?.message || ""));
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
      owner_name: profile.ownerName || profile.fullName || "",
      birthdate: profile.birthdate,
      phone: profile.phone,
      email: profile.email,
      event_interests: profile.eventInterests,
      area_interests: profile.areaInterests,
      account_type: profile.accountType || "person",
      venue_name: profile.venueName || null,
      venue_address: profile.venueAddress || null,
      venue_website: profile.venueWebsite || null,
      venue_image_url: profile.venueImageUrl || null,
      venue_description: profile.venueDescription || null,
      home_city: "Washington, DC",
      lokal_score: 100,
      is_demo: false
    }])
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Supabase created the login but could not save profile preferences.");
  }
}

async function createLokalAccount({ fullName, email, phone, username, birthdate, password, eventInterests = [], areaInterests = [], accountType = "person", ownerName = "", venueName = "", venueAddress = "", venueWebsite = "", venueImageUrl = "", venueDescription = "" }) {
  if (!fullName || !email || !phone || !username || !birthdate || !password) throw new Error("Complete every account field.");
  validateSignupPassword(password);
  validateSignupEmail(email);
  validateBirthday(birthdate);
  const formattedPhone = formatSignupPhone(phone);
  // The single choke point for account creation, so the one-account-per-email
  // rule holds no matter which signup path got here.
  if (await emailAlreadyRegistered(email)) throw new Error("That email already has a Lokal account. Log in instead, or use a different address.");
  state.pendingSignupProfile = { fullName, email, phone: formattedPhone, username, birthdate, eventInterests, areaInterests, accountType, ownerName, venueName, venueAddress, venueWebsite, venueImageUrl, venueDescription };
  state.pendingSignupPhone = formattedPhone;
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
      area_interests: areaInterests,
      account_type: accountType,
      owner_name: ownerName || fullName,
      venue_name: venueName,
      venue_address: venueAddress,
      venue_website: venueWebsite,
      venue_image_url: venueImageUrl,
      venue_description: venueDescription,
      lokal_score: 100
    }
  });
  if (data.access_token) {
    persistSupabaseSession(data.access_token);
    await syncSupabaseSignupProfile(data.access_token, state.pendingSignupProfile);
    if (typeof identifyAppUser === "function") identifyAppUser(currentInteractionUserId(), {
      email,
      username,
      full_name: fullName,
      account_type: accountType
    });
    if (typeof recordAppAction === "function") recordAppAction("signup_completed", {
      accountType,
      eventInterestCount: eventInterests.length,
      areaInterestCount: areaInterests.length
    });
    return data;
  }
  // Supabase returns no session when the project requires email confirmation.
  // Try a password grant anyway: if confirmation is off, the account is signed in
  // for real, which is what lets someone's plans follow them to a second phone.
  // If it is on, the local session carries them and the confirmation mail does
  // the rest — either way signup does not stall on it.
  try {
    const session = await supabaseAuthRequest("token?grant_type=password", { email, password });
    if (session.access_token) {
      persistSupabaseSession(session.access_token);
      await syncSupabaseSignupProfile(session.access_token, state.pendingSignupProfile);
      if (typeof identifyAppUser === "function") identifyAppUser(currentInteractionUserId(), {
        email,
        username,
        full_name: fullName,
        account_type: accountType
      });
      if (typeof recordAppAction === "function") recordAppAction("signup_completed", {
        accountType,
        eventInterestCount: eventInterests.length,
        areaInterestCount: areaInterests.length
      });
    }
  } catch (sessionError) {
    console.warn("[supabase] signup did not return a session", sessionError);
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
  const data = await supabaseAuthRequest("verify", { phone: state.pendingSignupPhone, token: token.trim(), type: "sms" });
  if (data.access_token) {
    persistSupabaseSession(data.access_token);
    state.pendingSignupProfile = { ...state.pendingSignupProfile, id: decodeJwtPayload(data.access_token).sub };
  }
  finalizeLokalProfile(state.pendingSignupProfile);
  return data;
}

// Apply a profile onto app state without wiping the user's saved events/plans
// (unlike finalizeLokalProfile, which clears them for a fresh signup).
function setActiveProfile(profile) {
  const saved = {
    ...profile,
    phone: formatDisplayPhone(profile.phone),
    age: profile.birthdate ? calculateAge(profile.birthdate) : (state.profile?.age || 27),
    initials: profileInitials(profile.fullName || "Lokal"),
    bio: state.bio,
    tastes: profile.eventInterests?.length ? profile.eventInterests : state.tastes,
    areas: profile.areaInterests || [],
    accountType: "person",
    ownerName: "",
    venueName: "",
    venueAddress: "",
    venueWebsite: "",
    venueImageUrl: "",
    venueDescription: "",
    lokalScore: profile.lokalScore || 100
  };
  state.profile = saved;
  state.age = saved.age;
  state.tastes = saved.tastes;
  localStorage.setItem("lokalProfile", JSON.stringify(saved));
  updateProfileShortcut();
  return saved;
}

// Resolve a login identifier (email / phone / username) into the credentials that
// Supabase's password grant understands. Usernames are looked up to their email.
async function resolveLoginCredentials(identifier) {
  const value = String(identifier || "").trim();
  if (value.includes("@")) return { email: value.toLowerCase() };
  const digits = value.replace(/\D/g, "");
  if (!/[a-z]/i.test(value) && digits.length >= 10) return { phone: formatSignupPhone(value) };
  const email = await lookupEmailByUsername(value);
  if (!email) throw new Error("We couldn't find that username. Try logging in with your email instead.");
  return { email };
}

async function lookupEmailByUsername(username) {
  try {
    const url = `${supabaseConfig.url}/rest/v1/profiles?select=email&username=eq.${encodeURIComponent(username.toLowerCase())}&limit=1`;
    const response = await fetch(url, { headers: supabaseJsonHeaders() });
    if (!response.ok) return "";
    const rows = await response.json();
    return rows?.[0]?.email || "";
  } catch {
    return "";
  }
}

// Pull the user's stored profile after a successful login and hydrate app state.
// Falls back to any locally saved profile if the row can't be read.
async function hydrateProfileAfterLogin(accessToken, identifier) {
  const userId = decodeJwtPayload(accessToken).sub;
  let row = null;
  try {
    const url = `${supabaseConfig.url}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`;
    const response = await fetch(url, { headers: supabaseJsonHeaders() });
    if (response.ok) row = (await response.json())?.[0] || null;
  } catch {}
  if (row) {
    setActiveProfile({
      id: userId,
      fullName: row.full_name || row.owner_name || identifier,
      email: row.email || (identifier.includes("@") ? identifier : ""),
      phone: row.phone || "",
      username: row.username || "",
      birthdate: row.birthdate || "",
      eventInterests: row.event_interests || [],
      areaInterests: row.area_interests || [],
      accountType: row.account_type || "person",
      ownerName: row.owner_name || "",
      venueName: row.venue_name || "",
      venueAddress: row.venue_address || "",
      venueWebsite: row.venue_website || "",
      venueImageUrl: row.venue_image_url || "",
      venueDescription: row.venue_description || "",
      lokalScore: row.lokal_score || 100
    });
    state.profile.id = userId;
    return;
  }
  const savedProfile = JSON.parse(localStorage.getItem("lokalProfile") || "null");
  if (savedProfile) { state.profile = savedProfile; state.profile.id = userId; updateProfileShortcut(); }
  else setActiveProfile({ id: userId, fullName: identifier, email: identifier.includes("@") ? identifier : "", username: identifier, accountType: "person" });
}

// --- Stored credentials for same-device log out / log back in ---------------
// We keep the user's email, phone, and username in the clear (identifiers, not
// secrets) plus a SHA-256 hash of their password — never the raw password — so a
// returning user can log back in on this device without a Supabase round-trip.
// Cross-device login still authenticates against Supabase, which holds the real
// (bcrypt) password.
async function hashLokalPassword(password) {
  try {
    const bytes = new TextEncoder().encode(String(password));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    // Non-secure contexts lack crypto.subtle; fall back to a tagged marker so the
    // match logic still works (only ever compared against itself).
    return `plain:${String(password)}`;
  }
}

async function storeLokalCredentials({ email, phone, username, password }) {
  const record = {
    email: String(email || "").trim().toLowerCase(),
    phone: String(phone || "").trim(),
    username: String(username || "").trim().toLowerCase(),
    passwordHash: password ? await hashLokalPassword(password) : ""
  };
  localStorage.setItem("lokalCredentials", JSON.stringify(record));
}

function getLokalCredentials() {
  try { return JSON.parse(localStorage.getItem("lokalCredentials") || "null"); } catch { return null; }
}

async function localCredentialMatch(identifier, password) {
  const credentials = getLokalCredentials();
  if (!credentials || !credentials.passwordHash) return false;
  const id = String(identifier || "").trim().toLowerCase();
  const idDigits = id.replace(/\D/g, "");
  const phoneDigits = String(credentials.phone || "").replace(/\D/g, "");
  const identifierMatches = (credentials.email && id === credentials.email)
    || (credentials.username && id === credentials.username)
    || (phoneDigits.length >= 10 && idDigits.length >= 10 && idDigits.slice(-10) === phoneDigits.slice(-10));
  if (!identifierMatches) return false;
  return (await hashLokalPassword(password)) === credentials.passwordHash;
}

// Restore the retained local session (profile kept through logout) without hitting
// Supabase — used when the entered credentials match what's stored on this device.
function restoreLocalSession(identifier) {
  const savedProfile = JSON.parse(localStorage.getItem("lokalProfile") || "null");
  if (savedProfile) {
    state.profile = savedProfile;
    if (Number.isFinite(savedProfile.age)) state.age = savedProfile.age;
    if (Array.isArray(savedProfile.tastes)) state.tastes = savedProfile.tastes;
  }
  localStorage.setItem("lokalAccountCreated", "true");
  localStorage.setItem("lokalHasAccount", "true");
  if (identifier) localStorage.setItem("lokalLastIdentifier", identifier);
  updateProfileShortcut();
}

async function loginLokalUser({ identifier, password }) {
  const value = String(identifier || "").trim();
  if (!value || !password) throw new Error("Enter your login and password.");
  // Same-device re-login: match the stored credentials and restore the retained
  // profile locally — no Supabase round-trip, so it works even if email confirmation
  // is pending or the network is flaky.
  if (await localCredentialMatch(value, password)) {
    restoreLocalSession(value);
    if (typeof identifyAppUser === "function") identifyAppUser(currentInteractionUserId(), {
      account_type: state.profile?.accountType || "person",
      full_name: state.profile?.fullName || ""
    });
    if (typeof recordAppAction === "function") recordAppAction("login_completed", { method: "local" });
    return { local: true };
  }
  // Otherwise (new device, or credentials not stored here) authenticate against Supabase.
  const credentials = await resolveLoginCredentials(value);
  const data = await supabaseAuthRequest("token?grant_type=password", { ...credentials, password });
  if (!data.access_token) throw new Error("That login didn't work. Check your details and try again.");
  persistSupabaseSession(data.access_token);
  if (data.refresh_token) localStorage.setItem(supabaseStorageKeys.refreshToken, data.refresh_token);
  await hydrateProfileAfterLogin(data.access_token, value);
  localStorage.setItem("lokalAccountCreated", "true");
  localStorage.setItem("lokalHasAccount", "true");
  localStorage.setItem("lokalLastIdentifier", value);
  if (typeof identifyAppUser === "function") identifyAppUser(currentInteractionUserId(), {
    account_type: state.profile?.accountType || "person",
    full_name: state.profile?.fullName || "",
    email: state.profile?.email || ""
  });
  if (typeof recordAppAction === "function") recordAppAction("login_completed", { method: "supabase" });
  return data;
}

async function sendPasswordReset(email) {
  const value = String(email || "").trim();
  validateSignupEmail(value);
  await supabaseAuthRequest("recover", { email: value });
  return true;
}

function clearSupabaseSession() {
  [supabaseStorageKeys.accessToken, supabaseStorageKeys.refreshToken, supabaseStorageKeys.userId].forEach(key => localStorage.removeItem(key));
}

// Ends the active session: drops the Supabase tokens and clears the "signed in"
// flag so the login screen shows next. Keeps the profile and stored credentials so
// the user can log straight back in on this device (this is an opt-in logout, not a
// wipe). lokalHasAccount / lokalLastIdentifier stay set to prefill the login screen.
function logoutLokalUser() {
  clearSupabaseSession();
  localStorage.removeItem("lokalAccountCreated");
  localStorage.removeItem("lokalOnboardingShown");
  localStorage.setItem("lokalHasAccount", "true");
}
