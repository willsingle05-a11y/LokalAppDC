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

function openShareSheet(id) {
  const e = events.find(event => event.id === Number(id));
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal share-sheet" role="dialog" aria-modal="true" aria-label="Share ${e.title}">
    <button class="modal-close" aria-label="Close sharing">&times;</button>
    <p class="eyebrow">Send a plan</p><h2>Share ${e.title}</h2><p class="lede">Search for the group you want to send this event to.</p>
    <label class="search-box social-search"><span>⌕</span><input data-share-group-search data-event-id="${e.id}" placeholder="Search your groups" aria-label="Search your groups"></label>
    <div class="share-group-results" data-share-group-results><p class="section-helper">Start typing to find a group.</p></div>
  </section></div>`;
}


