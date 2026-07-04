function openDetail(id) {
  const e = events.find(event => event.id === Number(id));
  const otherOccurrences = occurrencesForEvent(e).filter(occurrence => occurrence.id !== e.id);
  const occurrencesBlock = otherOccurrences.length
    ? `<div class="detail-occurrences"><p class="eyebrow">More dates</p><div class="occurrence-list">${otherOccurrences.map(occurrence => `<button class="occurrence-row" data-event="${occurrence.id}"><span>${escapeHtml(occurrence.time)}</span><small>${escapeHtml(eventLocationLine(occurrence))}</small></button>`).join("")}</div></div>`
    : "";
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
    <button class="wide-button attended-button ${state.attended.has(e.id) ? "selected" : ""}" data-attended="${e.id}">${state.attended.has(e.id) ? "Added to receipt" : "I went to this"}</button>
    <button class="wide-button" data-ticket>Get tickets / details</button></div>
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


