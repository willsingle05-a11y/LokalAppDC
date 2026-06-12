function openDetail(id) {
  const e = events.find(event => event.id === Number(id));
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${e.title}">
    <div class="detail-hero cat-${e.cat}"><button class="modal-close" aria-label="Close detail">&times;</button><p>${e.tag} / ${e.area}</p><h1>${e.title}</h1></div>
    <div class="detail-body"><p class="event-meta">${e.time} / ${e.price}</p><h2>${e.venue}</h2>
    ${e.friends.length ? `<div class="attendee-line">${avatarStack(e.friends)} ${e.friends.map(f => friendNames[f]).join(", ")} ${e.friends.length === 1 ? "saved this" : "are going"}</div>` : ""}
    <p class="detail-description">${e.desc}</p>
    <div class="detail-actions"><button class="action ${state.saved.has(e.id) ? "selected" : ""}" data-save="${e.id}">${state.saved.has(e.id) ? "Saved" : "Save"}</button><button class="action ${state.rsvps.has(e.id) ? "selected" : ""}" data-rsvp="${e.id}">${state.rsvps.has(e.id) ? "Going" : "RSVP"}</button><button class="primary" data-share="${e.id}">Share to group</button></div>
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
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal share-sheet" role="dialog" aria-modal="true" aria-label="Share ${e.title}">
    <button class="modal-close" aria-label="Close sharing">&times;</button>
    <p class="eyebrow">Send a plan</p><h2>Share ${e.title}</h2><p class="lede">Pick a group below or search by name. No message needed.</p>
    <label class="search-box social-search"><span>⌕</span><input data-share-group-search data-event-id="${e.id}" placeholder="Search groups (optional)" aria-label="Search your groups"></label>
    <div class="share-group-results" data-share-group-results>${shareGroupResultsHtml(e.id)}</div>
  </section></div>`;
}


