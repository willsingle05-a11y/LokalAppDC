// A run of weekdays reads better as a range than as a list.
function weekdayRunLabel(days) {
  if (!days.length) return "";
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (days.length === 7) return "Every day";
  const contiguous = days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  if (contiguous && days.length > 2) return `${short[days[0]]}–${short[days[days.length - 1]]}`;
  return days.map(day => short[day]).join(", ");
}

// Recurring events used to print one row per occurrence — dozens of them. The
// detail card only needs the readable cadence and time window.
function detailScheduleBlock(event) {
  const all = occurrencesForEvent(event);
  if (all.length < 2) return "";
  const dated = all
    .map(item => ({ item, date: eventDateValue(item) }))
    .filter(entry => entry.date)
    .sort((a, b) => a.date - b.date);
  if (dated.length < 2) return "";

  const weekdays = [...new Set(dated.map(entry => entry.date.getDay()))].sort((a, b) => a - b);
  const timeLabel = recurringTimeWindowLabel(event);
  return `<div class="detail-schedule">
    <div class="detail-schedule-head detail-schedule-simple">
      <span class="detail-schedule-copy detail-schedule-inline"><b>${escapeHtml(weekdayRunLabel(weekdays))}</b>${timeLabel ? `<small>| ${escapeHtml(timeLabel)}</small>` : ""}</span>
    </div>
  </div>`;
}

function recurringTimeWindowLabel(event) {
  const text = typeof eventDisplayTime === "function" ? String(eventDisplayTime(event) || "") : "";
  return text.replace(/^[A-Za-z]{3,9},\s+[A-Za-z]{3,9}\s+\d{1,2},\s*/i, "").trim();
}

/* ============================================================
   Event detail — a full-height sheet that travels up from the bottom edge.
   Layout follows the reference screens: hero photo, big title, description,
   then the facts grouped into cards on a recessed background, with Save/Going
   pinned to the bottom.
   ============================================================ */

// Single quotes inside the url() on purpose — this string lands in a double-
// quoted style="" attribute, and a double quote here would close it early.
function heroImageSrcBackdrop(src) {
  return src ? `--detail-hero-backdrop: url('${String(src).replace(/['"\\]/g, encodeURIComponent)}');` : "";
}

function openDetail(id, opts = {}) {
  const e = events.find(event => event.id === Number(id));
  if (!e) return;
  const otherOccurrences = occurrencesForEvent(e).filter(occurrence => occurrence.id !== e.id);
  const recurrence = eventRecurrence(e);
  // Three levels, most informative first: compact repeat cadence, then the text
  // summary, then a short list of the next few dates.
  const schedule = detailScheduleBlock(e);
  const occurrenceSummary = typeof eventOccurrenceSummary === "function"
    ? eventOccurrenceSummary(e, recurrence, otherOccurrences)
    : null;
  const occurrencesBlock = schedule
    ? schedule
    : occurrenceSummary
      ? `<div class="detail-occurrences detail-occurrences-summary"><p class="eyebrow">More dates</p><div class="occurrence-summary"><b>${escapeHtml(occurrenceSummary.title)}</b>${occurrenceSummary.detail ? `<small>${escapeHtml(occurrenceSummary.detail)}</small>` : ""}</div></div>`
      : otherOccurrences.length
        ? `<div class="detail-occurrences"><p class="eyebrow">More dates</p><div class="occurrence-list">${otherOccurrences.slice(0, 5).map(occurrence => `<button class="occurrence-row" data-event="${occurrence.id}"><span>${escapeHtml(typeof eventCardTimeLine === "function" ? eventCardTimeLine(occurrence) : occurrence.time)}</span><small>${escapeHtml(eventLocationLine(occurrence))}</small></button>`).join("")}</div></div>`
        : "";
  const displayTitle = eventDisplayTitle(e);
  const showRsvpHint = (Number(localStorage.getItem("lokalRsvpHintCount")) || 0) <= 3;
  const hasUsableHeroPhoto = eventHasUsablePhoto(e);
  const fallbackHeroImage = eventFallbackImageSrc(e);
  const heroImageSrc = hasUsableHeroPhoto ? eventCardImageSrc(e) : fallbackHeroImage;
  // A blurred copy of the artwork fills the frame behind the image, so photos
  // read edge-to-edge while venue logos still show whole instead of cropping.
  const heroStyle = `background-color: #f7fafc;${heroImageSrcBackdrop(hasUsableHeroPhoto ? eventCardImageSrc(e) : fallbackHeroImage)}`;
  const heroImg = heroImageSrc ? `<img class="detail-hero-img${hasUsableHeroPhoto ? "" : " is-fallback-image"}" src="${escapeHtml(heroImageSrc)}" data-fallback-src="${escapeHtml(fallbackHeroImage)}" onerror="this.onerror=null;this.src=this.dataset.fallbackSrc;this.classList.add('is-fallback-image');" alt="" loading="lazy">` : "";
  const priceLabel = eventPriceLabel(e);
  // Price lives in the Date and time card now, so it is not repeated here.
  const detailDescription = String(e.desc || "");
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
  const categoryLabel = typeof eventArtLabel === "function" ? eventArtLabel(e) : "";
  modalRoot.innerHTML = `<div class="modal-backdrop detail-backdrop"><section class="modal event-detail-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(e.title)}">
    <div class="detail-topbar">
      <span class="detail-grabber" aria-hidden="true"></span>
      <div class="detail-topbar-row">
        <button class="detail-topbar-btn modal-close" aria-label="Close detail">&times;</button>
        <span class="detail-topbar-title">Event</span>
        <button class="detail-topbar-btn detail-topbar-share" data-share="${e.id}" aria-label="Share ${escapeHtml(displayTitle)}">${cardShareIcon}</button>
      </div>
    </div>
    <div class="detail-scroll">
      <div class="detail-hero cat-${e.cat}${heroImg ? " has-image" : ""}" style="${heroStyle}">${heroImg}</div>
      <div class="detail-body">
        <div class="detail-title-block">
          ${categoryLabel ? `<p class="event-meta">${escapeHtml(categoryLabel)}</p>` : ""}
          <h1>${escapeHtml(displayTitle)}</h1>
        </div>
        ${descriptionBlock}
        ${eventSourceCredit(e)}

        <div class="detail-group">
          <div class="detail-group-row detail-group-static">
            <span class="detail-group-label">Date and time</span>
            <b>${escapeHtml(eventMetaLine(e))}</b>
            ${recurrence ? `<small>${escapeHtml(recurrence.label)}</small>` : ""}
            <span class="detail-group-links">
              <button class="detail-group-link" data-add-calendar="apple" data-calendar-event="${e.id}">Add to calendar</button>
              <button class="detail-group-link" data-add-calendar="google" data-calendar-event="${e.id}">Google Calendar</button>
            </span>
          </div>
          ${occurrencesBlock}
        </div>

        <div class="detail-group">
          <button class="detail-group-row${isFollowingVenue ? " selected" : ""}" data-follow-venue="${escapeHtml(venueFollowKey)}">
            <span class="detail-group-label">Location</span>
            <b>${escapeHtml(eventLocationLine(e))}</b>
            <span class="detail-group-link">${isFollowingVenue ? "Following venue ✓" : "Follow venue"}</span>
          </button>
          <button class="detail-group-row" data-ticket="${e.id}">
            <span class="detail-group-label">${escapeHtml(websiteLabel)}</span>
            <b>${priceLabel ? escapeHtml(priceLabel) : "Open the full listing"}</b>
            <span class="detail-group-link">Open listing</span>
          </button>
        </div>

        ${eventInterestSignal(e, true)}
        ${showRsvpHint ? `<p class="rsvp-hint">Save = bookmark for later. Going = you're planning to go.</p>` : ""}
      </div>
    </div>
    <div class="detail-decide-bar">
      <button class="${isSaved ? "selected" : ""}" data-save="${e.id}">${isSaved ? "Saved ✓" : "Save"}</button>
      <button class="decide-going ${isGoing ? "selected" : ""}" data-rsvp="${e.id}">${isGoing ? "Going ✓" : "Going"}</button>
    </div>
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

function eventOccurrenceSummary(event, recurrence, otherOccurrences) {
  if (!event || !otherOccurrences.length) return null;
  const allOccurrences = occurrencesForEvent(event);
  const timeText = String(event.time || "").replace(/^[A-Za-z]{3,9},\s+[A-Za-z]{3,9}\s+\d{1,2},\s*/i, "").trim();
  const weekdayCodes = occurrenceWeekdayCodes(allOccurrences);
  if (weekdayCodes.length > 1) {
    return { title: formatRecurringWeekdays(weekdayCodes), detail: timeText };
  }
  if (recurrence?.label) {
    return { title: recurrence.label.replace(/^every /i, "Every "), detail: timeText };
  }
  if (weekdayCodes.length === 1) {
    return { title: formatRecurringWeekdays(weekdayCodes), detail: timeText };
  }
  return null;
}

function occurrenceWeekdayCodes(occurrences) {
  return occurrences
    .map(occurrence => eventDateValue(occurrence))
    .filter(Boolean)
    .map(date => ICS_WEEKDAY_CODES[date.getDay()])
    .filter((code, index, all) => code && all.indexOf(code) === index)
    .sort((a, b) => ICS_WEEKDAY_CODES.indexOf(a) - ICS_WEEKDAY_CODES.indexOf(b));
}

function formatRecurringWeekdays(codes) {
  const key = codes.join(",");
  if (key === "SU,MO,TU,WE,TH,FR,SA") return "Daily";
  if (key === "MO,TU,WE,TH,FR") return "Every weekday";
  if (key === "SU,SA") return "Every weekend";
  const ranges = [];
  let start = 0;
  for (let index = 1; index <= codes.length; index += 1) {
    const previous = ICS_WEEKDAY_CODES.indexOf(codes[index - 1]);
    const current = ICS_WEEKDAY_CODES.indexOf(codes[index]);
    if (index === codes.length || current !== previous + 1) {
      ranges.push(codes.slice(start, index));
      start = index;
    }
  }
  const parts = ranges.map(range => {
    const names = range.map(code => ICS_CODE_LABEL[code]);
    if (names.length >= 3) return `${names[0]} through ${names[names.length - 1]}`;
    return names.join(" & ");
  });
  return `Every ${parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`}`;
}

function shareGroupResultsHtml(eventId, query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const groups = shareableGroupNames().filter(name => !normalizedQuery || name.toLowerCase().includes(normalizedQuery));
  if (!groups.length) return `<p class="section-helper">No groups match that search.</p>`;
  return groups.map(name => `<button class="share-group" data-group-share="${escapeHtml(name)}" data-event-id="${eventId}"><span class="group-icon">${escapeHtml(name[0])}</span><span class="share-group-copy"><h3>${escapeHtml(name)}</h3><p>Send event link to group messages</p></span><span class="share-arrow">+</span></button>`).join("");
}

// One action only: hand someone the Lokal link. The per-network buttons
// (Snapchat, email, SMS, post-to-story) are gone — the OS share sheet already
// covers every one of them, and the link is the whole point of sharing.
function openShareSheet(id) {
  const e = events.find(event => event.id === Number(id));
  if (!e) return;
  const displayTitle = eventDisplayTitle(e);
  const shareUrl = lokalEventShareUrl(e);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal share-sheet" role="dialog" aria-modal="true" aria-label="Share ${escapeHtml(displayTitle)}">
    <button class="modal-close" aria-label="Close sharing">&times;</button>
    <p class="eyebrow">Send a Lokal event</p><h2>Share ${escapeHtml(displayTitle)}</h2><p class="lede">Anyone who opens this link lands on the event in Lokal.</p>
    <div class="share-preview"><b>${escapeHtml(displayTitle)}</b><span>${escapeHtml(eventMetaLine(e))}</span><small>${escapeHtml(eventLocationLine(e))}</small><em>${escapeHtml(shareUrl)}</em></div>
    <button class="wide-button" data-${canNativeShare ? `native-share="${e.id}"` : `copy-event-share="${e.id}"`}>${canNativeShare ? "Send link" : "Copy link"}</button>
  </section></div>`;
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
    addCalendarPlan(event.id);
    window.open(url, "_blank", "noopener,noreferrer") || window.location.assign(url);
    toast("Added to Your Plans as a calendar item.");
    return;
  }
  const recurrence = eventRecurrence(event);
  const ics = recurrence ? buildEventIcs(event, recurrence) : buildSingleEventIcs(event);
  if (!ics) { toast("This event is missing a date to schedule."); return; }
  addCalendarPlan(event.id);
  const slug = String(event.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "event";
  downloadIcsFile(`${slug}.ics`, ics);
  toast(recurrence ? `Calendar file ready — repeats ${recurrence.label}.` : "Calendar file ready.");
}

function addCalendarPlan(id) {
  const eventId = Number(id);
  if (!Number.isFinite(eventId)) return;
  state.calendarAdds.add(eventId);
  localStorage.setItem("lokalCalendarAdds", JSON.stringify(Array.from(state.calendarAdds)));
  setPlanSource("calendar", eventId, true);
  if (state.route === "social") renderSocial();
}

function addRecurringEventToCalendar(id) {
  const event = events.find(item => item.id === Number(id));
  if (!event) return;
  const recurrence = eventRecurrence(event);
  if (!recurrence) { toast("This event doesn't repeat on a set schedule."); return; }
  const ics = buildEventIcs(event, recurrence);
  if (!ics) { toast("This event is missing a date to schedule."); return; }
  addCalendarPlan(event.id);
  const slug = String(event.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "event";
  downloadIcsFile(`${slug}.ics`, ics);
  toast(`Added to your calendar — repeats ${recurrence.label}.`);
}


