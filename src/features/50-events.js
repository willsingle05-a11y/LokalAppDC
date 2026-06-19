function openDetail(id) {
  const e = events.find(event => event.id === Number(id));
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${e.title}">
    <div class="detail-hero cat-${e.cat}"><button class="modal-close" aria-label="Close detail">&times;</button><p>${escapeHtml(primaryEventTag(e))} / ${e.area}</p><h1>${e.title}</h1></div>
    <div class="detail-body"><p class="event-meta">${e.time} / ${e.price}</p><h2>${e.venue}</h2>
    <div class="event-tags detail-tags">${eventTagChips(e, 6)}</div>
    ${e.friends.length ? `<div class="attendee-line">${avatarStack(e.friends)} ${e.friends.map(f => friendNames[f]).join(", ")} ${e.friends.length === 1 ? "saved this" : "are going"}</div>` : ""}
    <p class="detail-description">${e.desc}</p>
    <div class="detail-actions"><button class="action ${state.saved.has(e.id) ? "selected" : ""}" data-save="${e.id}">${state.saved.has(e.id) ? "Saved" : "Save"}</button><button class="action ${state.rsvps.has(e.id) ? "selected" : ""}" data-rsvp="${e.id}">${state.rsvps.has(e.id) ? "Going" : "RSVP"}</button><button class="primary" data-share="${e.id}">Share</button></div>
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
    <div class="share-preview"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.time)} / ${escapeHtml(e.venue)}</span><small>${escapeHtml(e.price)} / ${escapeHtml(eventTags(e).slice(0, 3).join(" · "))}</small><em>${escapeHtml(shareUrl)}</em></div>
    <div class="share-channel-grid">
      <a class="share-channel" href="sms:?&body=${smsBody}">Text</a>
      <button class="share-channel" data-native-share="${e.id}">Share sheet</button>
      <a class="share-channel" href="https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}" target="_blank" rel="noreferrer">Snapchat</a>
      <a class="share-channel" href="mailto:?subject=${encodeURIComponent(e.title)}&body=${smsBody}">Email</a>
    </div>
    <button class="wide-button" data-copy-event-share="${e.id}">Copy Lokal event</button>
  </section></div>`;
}

function shareMessageForEvent(event) {
  return `Want to go to ${event.title}? ${event.time} at ${event.venue} in ${event.area}. ${event.price}. Open it in Lokal: ${lokalEventShareUrl(event)}`;
}

function lokalEventShareUrl(event) {
  return `https://lokal.app/event/${encodeURIComponent(event.sourceId || event.id)}`;
}

function lokalEventSharePayload(event) {
  return [
    "Lokal event",
    event.title,
    `${event.time} / ${event.price}`,
    `${event.venue} / ${event.area}`,
    eventTags(event).slice(0, 5).join(", "),
    lokalEventShareUrl(event)
  ].filter(Boolean).join("\n");
}


