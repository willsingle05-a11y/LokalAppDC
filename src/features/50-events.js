function openDetail(id) {
  const e = events.find(event => event.id === Number(id));
  const otherOccurrences = occurrencesForEvent(e).filter(occurrence => occurrence.id !== e.id);
  const occurrencesBlock = otherOccurrences.length
    ? `<div class="detail-occurrences"><p class="eyebrow">More dates</p><div class="occurrence-list">${otherOccurrences.map(occurrence => `<button class="occurrence-row" data-event="${occurrence.id}"><span>${escapeHtml(occurrence.time)}</span><small>${escapeHtml(eventLocationLine(occurrence))}</small></button>`).join("")}</div></div>`
    : "";
  const recurrence = eventRecurrence(e);
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
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(e.title)}">
    <div class="detail-hero cat-${e.cat}${e.image ? " has-image" : ""}" style="${heroStyle}">${heroImg}<button class="modal-close" aria-label="Close detail">&times;</button></div>
    <div class="detail-body"><div class="detail-title-block"><p class="event-meta">${escapeHtml(primaryEventTag(e))}</p><h1>${escapeHtml(e.title)}</h1><p class="event-meta">${escapeHtml(eventMetaLine(e))}</p><h2>${escapeHtml(eventLocationLine(e))}</h2>${priceLabel ? `<p class="detail-price">${escapeHtml(priceLabel)}</p>` : ""}</div>
    <div class="event-tags detail-tags">${eventTagChips(e, 6)}</div>
    ${eventInterestSignal(e, true)}
    <p class="detail-description">${e.desc}</p>
    ${occurrencesBlock}
    <div class="detail-actions"><button class="action ${state.saved.has(e.id) ? "selected" : ""}" data-save="${e.id}">${state.saved.has(e.id) ? "Saved ✓" : "Save"}</button><button class="action rsvp-action ${state.rsvps.has(e.id) ? "selected" : ""}" data-rsvp="${e.id}">${state.rsvps.has(e.id) ? "Going ✓" : "RSVP"}</button>${shareButton}</div>
    ${showRsvpHint ? `<p class="rsvp-hint">Save = bookmark for later. RSVP = you're planning to go.</p>` : ""}
    ${recurrence ? `<button class="wide-button calendar-recur-button" data-add-recurring="${e.id}"><span class="cal-ic">${icons.calendar}</span>Add to calendar · ${escapeHtml(recurrence.label)}</button>` : ""}
    <button class="wide-button attended-button ${state.attended.has(e.id) ? "selected" : ""}" data-attended="${e.id}">${state.attended.has(e.id) ? "Added to receipt" : "I went to this"}</button>
    <button class="wide-button" data-ticket="${e.id}">${e.detailsUrl ? "Get tickets / details" : "Open shareable event page"}</button></div>
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
  const shareText = shareMessageForEvent(e);
  const shareUrl = lokalEventShareUrl(e);
  const smsBody = encodeURIComponent(shareText);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal share-sheet" role="dialog" aria-modal="true" aria-label="Share ${e.title}">
    <button class="modal-close" aria-label="Close sharing">&times;</button>
    <p class="eyebrow">Send a Lokal event</p><h2>Share ${e.title}</h2><p class="lede">Copy the event card or send it through your favorite app.</p>
    <div class="share-preview"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.time)} / ${escapeHtml(eventLocationLine(e))}</span><small>${escapeHtml([eventPriceLabel(e), eventTags(e).slice(0, 3).join(" · ")].filter(Boolean).join(" / "))}</small><em>${escapeHtml(shareUrl)}</em></div>
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
  return `Want to go to ${event.title}? ${event.time} at ${eventLocationLine(event)}.${price ? ` ${price}.` : ""} Open it in Lokal: ${lokalEventShareUrl(event)}`;
}

function lokalEventShareUrl(event) {
  return `https://lokal.app/event/${encodeURIComponent(event.sourceId || event.id)}`;
}

function lokalEventSharePayload(event) {
  return [
    "Lokal event",
    event.title,
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


