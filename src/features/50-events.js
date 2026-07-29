function openDetail(id, opts = {}) {
  const e = events.find(event => event.id === Number(id));
  const otherOccurrences = occurrencesForEvent(e).filter(occurrence => occurrence.id !== e.id);
  const occurrencesBlock = otherOccurrences.length
    ? `<div class="detail-occurrences"><p class="eyebrow">More dates</p><div class="occurrence-list">${otherOccurrences.map(occurrence => `<button class="occurrence-row" data-event="${occurrence.id}"><span>${escapeHtml(occurrence.time)}</span><small>${escapeHtml(eventLocationLine(occurrence))}</small></button>`).join("")}</div></div>`
    : "";
  const recurrence = eventRecurrence(e);
  const displayTitle = eventDisplayTitle(e);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const shareButton = canNativeShare
    ? `<button class="primary" data-share="${e.id}">Share event</button>`
    : `<button class="primary" data-copy-detail-link="${e.id}">Copy link</button>`;
  const showRsvpHint = (Number(localStorage.getItem("lokalRsvpHintCount")) || 0) <= 3;
  const heroImage = eventArtImage(e);
  const heroStyle = e.image
    ? `background-image: linear-gradient(180deg, rgba(13,24,22,.08), rgba(13,24,22,.62)); background-color: #f7fafc;`
    : `background-image: linear-gradient(180deg, rgba(13,24,22,.18), rgba(13,24,22,.72)), ${heroImage};`;
  const heroImg = e.image ? `<img class="detail-hero-img" src="${escapeHtml(eventCardImageSrc(e))}" alt="" loading="lazy">` : "";
  const priceLabel = eventPriceLabel(e);
  const detailDescription = `${priceLabel ? `<span class="detail-description-price">Price: ${escapeHtml(priceLabel)}</span>` : ""}${e.desc}`;
  const isThingsToDoEvent = String(e.source || "").toLowerCase() === "thingstododc";
  const descriptionBlock = isThingsToDoEvent
    ? `<div class="detail-description-wrap things-to-do-description collapsed"><p class="detail-description expandable-description" data-expand-description role="button" tabindex="0" aria-expanded="false" aria-label="Show full description">${detailDescription}</p></div>`
    : `<p class="detail-description">${detailDescription}</p>`;
  const venueFollowKey = `venue:${e.venue}`;
  const isFollowingVenue = state.follows.has(venueFollowKey);
  const isSaved = state.saved.has(e.id);
  const isGoing = state.rsvps.has(e.id);
  const websiteUrl = eventWebsiteUrl(e);
  const websiteLabel = e.detailsUrl ? "Tickets and details" : websiteUrl ? "Venue website" : "Lokal event page";
  const websiteHelper = e.detailsUrl ? "Opens the event listing" : websiteUrl ? "Opens the venue website" : "Opens the Lokal listing";
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(e.title)}">
    <div class="detail-hero cat-${e.cat}${e.image ? " has-image" : ""}" style="${heroStyle}">${heroImg}<button class="modal-close" aria-label="Close detail">&times;</button></div>
    <div class="detail-body"><div class="detail-title-block"><p class="event-meta">${escapeHtml(primaryEventTag(e))}</p><h1>${escapeHtml(displayTitle)}</h1>${priceLabel ? `<p class="detail-price">${escapeHtml(priceLabel)}</p>` : ""}</div>
    <div class="event-tags detail-tags">${eventTagChips(e, 6)}</div>
    <button class="detail-info-row" data-add-calendar="apple" data-calendar-event="${e.id}">
      <span class="dir-art"></span>
      <span class="dir-copy"><b>${escapeHtml(eventMetaLine(e))}</b><small>Add to your calendar${recurrence ? ` / ${escapeHtml(recurrence.label)}` : ""}</small></span>
      <span class="dir-action">Add</span>
    </button>
    <button class="detail-info-row ${isFollowingVenue ? "selected" : ""}" data-follow-venue="${escapeHtml(venueFollowKey)}">
      <span class="dir-art"></span>
      <span class="dir-copy"><b>${escapeHtml(eventLocationLine(e))}</b><small>${isFollowingVenue ? "You follow this venue" : "Follow for new events here"}</small></span>
      <span class="dir-action">${isFollowingVenue ? "Following" : "Follow"}</span>
    </button>
    <button class="detail-info-row" data-ticket="${e.id}">
      <span class="dir-art"></span>
      <span class="dir-copy"><b>${escapeHtml(websiteLabel)}</b><small>${escapeHtml(websiteHelper)}</small></span>
      <span class="dir-action">Open</span>
    </button>
    ${eventInterestSignal(e, true)}
    <p class="eyebrow detail-about-label">About</p>
    ${descriptionBlock}
    ${eventSourceCredit(e)}
    ${occurrencesBlock}
    <div class="detail-action-row">
      <button class="detail-action" data-add-calendar="google" data-calendar-event="${e.id}"><span class="cal-ic">${icons.calendar}</span>Google Calendar</button>
      ${canNativeShare
        ? `<button class="detail-action" data-share="${e.id}">Share event</button>`
        : `<button class="detail-action" data-copy-detail-link="${e.id}">Copy link</button>`}
    </div>
    ${showRsvpHint ? `<p class="rsvp-hint">Save = bookmark for later. Going = you're planning to go.</p>` : ""}
    <div class="detail-decide-bar">
      <button class="${isSaved ? "selected" : ""}" data-save="${e.id}">${isSaved ? "Saved ✓" : "Save"}</button>
      <button class="decide-going ${isGoing ? "selected" : ""}" data-rsvp="${e.id}">${isGoing ? "Going ✓" : "Going"}</button>
    </div></div>
  </section></div>`;
}

// Canvas confirmation screen — shown once an RSVP turns on.
function openGoingConfirmation(id) {
  const e = events.find(event => event.id === Number(id));
  if (!e) return;
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal going-sheet" role="dialog" aria-modal="true" aria-label="You're going">
    <button class="modal-close" aria-label="Close">&times;</button>
    <div class="going-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6.5 12.5l3.6 3.6L17.5 8.7"></path></svg></div>
    <h2>You're going</h2>
    <p class="lede">It's in Your Plans. We'll nudge you an hour before doors.</p>
    <div class="going-card">
      <span class="gc-thumb"><img src="${eventCardImageSrc(e)}" alt="" loading="lazy"></span>
      <span><b>${escapeHtml(eventDisplayTitle(e))}</b><small>${escapeHtml(eventMetaLine(e))}</small></span>
    </div>
    <div class="going-actions">
      <button class="wide-button" data-event="${e.id}">View event</button>
      <button class="wide-button secondary" data-add-calendar="apple" data-calendar-event="${e.id}">Add to calendar</button>
      <button class="wide-button going-invite" data-share="${e.id}">Invite friends</button>
    </div>
  </section></div>`;
}

function shareableGroupNames() {
  return userGroupNames().filter(name => !state.leftGroups.has(name));
}

function shareGroupResultsHtml(eventId, query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const groups = shareableGroupNames().filter(name => !normalizedQuery || name.toLowerCase().includes(normalizedQuery));
  if (!groups.length) return `<p class="section-helper">No groups match that search.</p>`;
  return groups.map(name => `<button class="share-group" data-group-share="${escapeHtml(name)}" data-event-id="${eventId}"><span class="group-icon">${escapeHtml(name[0])}</span><span class="share-group-copy"><h3>${escapeHtml(name)}</h3><p>Send event link to group messages</p></span><span class="share-arrow">+</span></button>`).join("");
}

function openShareSheet(id) {
  const e = events.find(event => event.id === Number(id));
  const displayTitle = eventDisplayTitle(e);
  const shareText = shareMessageForEvent(e);
  const shareUrl = lokalEventShareUrl(e);
  const smsBody = encodeURIComponent(shareText);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal share-sheet" role="dialog" aria-modal="true" aria-label="Share ${escapeHtml(displayTitle)}">
    <button class="modal-close" aria-label="Close sharing">&times;</button>
    <p class="eyebrow">Send a Lokal event</p><h2>Share ${escapeHtml(displayTitle)}</h2><p class="lede">Copy the event card or send it through your favorite app.</p>
    <div class="share-preview"><b>${escapeHtml(displayTitle)}</b><span>${escapeHtml(e.time)} / ${escapeHtml(eventLocationLine(e))}</span><small>${escapeHtml([eventPriceLabel(e), eventTags(e).slice(0, 3).join(" · ")].filter(Boolean).join(" / "))}</small><em>${escapeHtml(shareUrl)}</em></div>
    <div class="share-channel-grid">
      <a class="share-channel" href="sms:?&body=${smsBody}">Text</a>
      <button class="share-channel" data-native-share="${e.id}">Share sheet</button>
      <button class="share-channel" data-post-story="${e.id}">Post to story</button>
      <a class="share-channel" href="https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}" target="_blank" rel="noreferrer">Snapchat</a>
      <a class="share-channel" href="mailto:?subject=${encodeURIComponent(e.title)}&body=${smsBody}">Email</a>
    </div>
    <button class="wide-button" data-copy-event-share="${e.id}">Copy Lokal event</button>
  </section></div>`;
}

function shareMessageForEvent(event) {
  const price = eventPriceLabel(event);
  return `Want to go to ${eventDisplayTitle(event)}? ${event.time} at ${eventLocationLine(event)}.${price ? ` ${price}.` : ""} Open it in Lokal: ${lokalEventShareUrl(event)}`;
}

function lokalEventShareUrl(event) {
  const base = location.protocol.startsWith("http") ? `${location.origin}${location.pathname}` : "https://willsingle05-a11y.github.io/LokalAppDC/";
  const url = new URL(base);
  const existing = new URLSearchParams(location.search);
  if (existing.get("bypassSignup")) url.searchParams.set("bypassSignup", existing.get("bypassSignup"));
  url.searchParams.set("event", String(event.sourceId || event.id));
  url.searchParams.set("openEvent", "1");
  return url.toString();
}

function lokalEventSharePayload(event) {
  return [
    "Lokal event",
    eventDisplayTitle(event),
    eventMetaLine(event),
    eventLocationLine(event),
    eventTags(event).slice(0, 5).join(", "),
    lokalEventShareUrl(event)
  ].filter(Boolean).join("\n");
}

// --- Add a recurring event to the user's calendar as a repeating series ---
function icsEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsStamp(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}T${p(date.getHours())}${p(date.getMinutes())}00`;
}

function icsStampUtc(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
}

// First on/after the event date that matches the rule, so DTSTART is a valid
// instance even if the stored date drifts from the detected cadence.
function firstRecurrenceDate(startDate, recurrence) {
  const base = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  const matches = date => {
    const code = ICS_WEEKDAY_CODES[date.getDay()];
    if (recurrence.freq === "WEEKLY") return recurrence.byday.includes(code);
    return recurrence.byday.some(token => {
      const parsed = token.match(/^(-?\d+)([A-Z]{2})$/);
      if (!parsed || parsed[2] !== code) return false;
      const ordinal = Number(parsed[1]);
      const nth = Math.floor((date.getDate() - 1) / 7) + 1;
      const isLast = new Date(date.getTime() + 7 * 86400000).getMonth() !== date.getMonth();
      return ordinal === -1 ? isLast : nth === ordinal;
    });
  };
  for (let i = 0; i < 400; i++) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    if (matches(day)) return day;
  }
  return base;
}

function buildEventIcs(event, recurrence) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(event.startDate || ""))) return null;
  const first = firstRecurrenceDate(event.startDate, recurrence);
  if (!first) return null;
  const hasTime = Number.isFinite(event.startHour);
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate(), hasTime ? event.startHour : 9, 0, 0);
  const rrule = [`FREQ=${recurrence.freq}`];
  if (recurrence.interval > 1) rrule.push(`INTERVAL=${recurrence.interval}`);
  if (recurrence.byday && recurrence.byday.length) rrule.push(`BYDAY=${recurrence.byday.join(",")}`);
  const description = [String(event.desc || "").replace(/<[^>]*>/g, "").trim(), lokalEventShareUrl(event)].filter(Boolean).join("\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lokal//DC Events//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT"];
  lines.push(`UID:lokal-${event.sourceId || event.id}-${recurrence.freq.toLowerCase()}@lokal.app`);
  lines.push(`DTSTAMP:${icsStampUtc(new Date())}`);
  if (hasTime) {
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    lines.push(`DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`);
  } else {
    const p = n => String(n).padStart(2, "0");
    lines.push(`DTSTART;VALUE=DATE:${start.getFullYear()}${p(start.getMonth() + 1)}${p(start.getDate())}`);
  }
  lines.push(`RRULE:${rrule.join(";")}`);
  lines.push(`SUMMARY:${icsEscape(event.title)}`);
  lines.push(`DESCRIPTION:${icsEscape(description)}`);
  lines.push(`LOCATION:${icsEscape(eventLocationLine(event))}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadIcsFile(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function eventCalendarStart(event) {
  if (Number.isFinite(event.startSort) && event.startSort !== Number.MAX_SAFE_INTEGER) return new Date(event.startSort);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(event.startDate || ""))) return new Date(`${event.startDate}T${String(event.startHour || 9).padStart(2, "0")}:00:00`);
  return null;
}

function buildSingleEventIcs(event) {
  const start = eventCalendarStart(event);
  if (!start) return null;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const description = [String(event.desc || "").replace(/<[^>]*>/g, "").trim(), lokalEventShareUrl(event)].filter(Boolean).join("\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lokal//DC Events//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT"];
  lines.push(`UID:lokal-${event.sourceId || event.id}-single@lokal.app`);
  lines.push(`DTSTAMP:${icsStampUtc(new Date())}`);
  lines.push(`DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`);
  lines.push(`SUMMARY:${icsEscape(event.title)}`);
  lines.push(`DESCRIPTION:${icsEscape(description)}`);
  lines.push(`LOCATION:${icsEscape(eventLocationLine(event))}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function googleCalendarUrl(event) {
  const start = eventCalendarStart(event);
  if (!start) return "";
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const recurrence = eventRecurrence(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Lokal event",
    dates: `${icsStampUtc(start)}/${icsStampUtc(end)}`,
    details: [String(event.desc || "").replace(/<[^>]*>/g, "").trim(), lokalEventShareUrl(event)].filter(Boolean).join("\n"),
    location: eventLocationLine(event)
  });
  if (recurrence) {
    const rrule = [`FREQ=${recurrence.freq}`];
    if (recurrence.interval > 1) rrule.push(`INTERVAL=${recurrence.interval}`);
    if (recurrence.byday?.length) rrule.push(`BYDAY=${recurrence.byday.join(",")}`);
    params.set("recur", `RRULE:${rrule.join(";")}`);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function addEventToCalendar(id, provider = "apple") {
  const event = events.find(item => item.id === Number(id));
  if (!event) return;
  if (provider === "google") {
    const url = googleCalendarUrl(event);
    if (!url) { toast("This event is missing a date to schedule."); return; }
    window.open(url, "_blank", "noopener,noreferrer") || window.location.assign(url);
    return;
  }
  const recurrence = eventRecurrence(event);
  const ics = recurrence ? buildEventIcs(event, recurrence) : buildSingleEventIcs(event);
  if (!ics) { toast("This event is missing a date to schedule."); return; }
  const slug = String(event.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "event";
  downloadIcsFile(`${slug}.ics`, ics);
  toast(recurrence ? `Calendar file ready — repeats ${recurrence.label}.` : "Calendar file ready.");
}

function addRecurringEventToCalendar(id) {
  const event = events.find(item => item.id === Number(id));
  if (!event) return;
  const recurrence = eventRecurrence(event);
  if (!recurrence) { toast("This event doesn't repeat on a set schedule."); return; }
  const ics = buildEventIcs(event, recurrence);
  if (!ics) { toast("This event is missing a date to schedule."); return; }
  const slug = String(event.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "event";
  downloadIcsFile(`${slug}.ics`, ics);
  toast(`Added to your calendar — repeats ${recurrence.label}.`);
}


