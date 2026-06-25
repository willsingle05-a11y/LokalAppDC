function renderProfile() {
  const tasteChips = state.tastes.map(taste => `<span class="chip active">${escapeHtml(taste)}</span>`).join("");
  const receipts = profileReceipts();
  const friends = profileFriendRows();
  app.innerHTML = `<section class="page">
    <div class="discover-heading"><div><p class="eyebrow">Your Lokal</p><h1>Profile</h1></div><button class="filter-button" data-settings>Settings</button></div>
    <div class="profile-card"><div class="profile-avatar">${escapeHtml(state.profile.initials)}</div><div><h2>${escapeHtml(state.profile.fullName)}</h2><p>@${escapeHtml(state.profile.username)} ${state.privateAccount ? "/ Private" : "/ Public"}</p><span class="lokal-score">${lokalScore()} <small>Lokal score</small></span><button class="text-button" data-settings>Settings</button></div></div>
    <p class="bio">${escapeHtml(state.bio)}</p>
    <p class="eyebrow">Your tastes</p><div class="chips profile-taste-chips">${tasteChips}<button class="chip" data-edit-tastes>Edit</button></div>
    <div class="stats section profile-stats"><button class="stat-card" data-profile-list="plans"><b>${profilePlanIds().length}</b><small>Plans</small></button><button class="stat-card" data-profile-list="friends"><b>${state.friends.size}</b><small>Friends</small></button></div>
    <p class="eyebrow">Friends</p><div class="follow-list profile-friends-list">${friends.map(friend => friendCard(friend)).join("")}</div><button class="text-button see-all-friends" data-profile-list="friends">See all friends</button>
    <p class="eyebrow">Your receipt</p><h2>Recently attended</h2>
    <div class="receipt-list">${receipts.map(receiptRow).join("") || `<p class="section-helper">Mark an event as attended and it will show here.</p>`}</div>
  </section>`;
}

function profileFriendRows(limit = 5) {
  return friendDirectory.filter(friend => state.friends.has(friend[1])).slice(0, limit);
}

function fullFriendName(initials) {
  return ({ AL: "Ana Lopez", MR: "Marcus Reed", DV: "Dev Shah", JS: "Jules Kim", PL: "Priya Lee" }[initials] || friendNames[initials] || initials);
}

function lokalScore() {
  return scoreBreakdown().total;
}

function cappedScore(value, multiplier, cap) {
  return Math.min(value * multiplier, cap);
}

function uniqueUserTexts(messages) {
  return Array.from(new Set(messages
    .filter(message => message?.type === "text" && String(message.text || "").trim().length >= 8)
    .map(message => String(message.text).trim().toLowerCase())));
}

function socialActivityUnits() {
  const groupTexts = Object.values(state.groupMessages || {}).flatMap(uniqueUserTexts);
  const groupEventShares = Object.entries(state.groupMessages || {}).flatMap(([group, messages]) =>
    messages.filter(message => message?.type === "event" && message.eventId).map(message => `${group}:${message.eventId}`)
  );
  const directTexts = Object.values(state.directMessages || {}).flatMap(messages =>
    messages.filter(message => message?.from === "You" && String(message.text || "").trim().length >= 8).map(message => String(message.text).trim().toLowerCase())
  );
  return new Set([...groupTexts, ...groupEventShares, ...directTexts]).size;
}

function receiptFriendUnits(receipts) {
  return receipts.reduce((sum, receipt) => sum + new Set(receipt.friends || []).size, 0);
}

function receiptEventKey(receipt) {
  return String(receipt?.eventId || receipt?.id || `${receipt?.title || ""}|${receipt?.venue || ""}|${receipt?.time || ""}`).toLowerCase();
}

function scoreBreakdown() {
  const receipts = profileReceipts();
  const rsvpCount = Array.from(state.rsvps || []).filter(id => !state.removedPlans?.has(id)).length;
  const savedOnlyCount = Array.from(state.saved || []).filter(id => !state.rsvps.has(id) && !state.removedPlans?.has(id)).length;
  const breakdown = [
    { label: "Base profile", value: 100, detail: "Starting score for creating a profile." },
    { label: "Verified attendance", value: receipts.length * 15, detail: `${receipts.length} unique event receipt${receipts.length === 1 ? "" : "s"} - 15 each - no lifetime cap.` },
    { label: "Went with friends", value: receiptFriendUnits(receipts) * 5, detail: "5 points for each friend attached to an attended event receipt. It grows with real group plans, not random friend adds." },
    { label: "Upcoming plans", value: cappedScore(rsvpCount, 3, 30), detail: `${rsvpCount} RSVP${rsvpCount === 1 ? "" : "s"} - 3 each - capped at 30.` },
    { label: "Saved ideas", value: cappedScore(savedOnlyCount, 1, 20), detail: `${savedOnlyCount} saved event${savedOnlyCount === 1 ? "" : "s"} not already RSVP'd - 1 each - capped at 20.` },
    { label: "Friends", value: cappedScore(state.friends.size, 2, 30), detail: "Rewards having a real social graph without relying on group activity." },
    { label: "Conversation activity", value: cappedScore(socialActivityUnits(), 1, 30), detail: "Counts unique meaningful direct messages and event shares, not repeated short spam." }
  ];
  return { total: breakdown.reduce((sum, item) => sum + item.value, 0), items: breakdown };
}

function openFaqSheet() {
  const breakdown = scoreBreakdown();
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="FAQ"><button class="modal-close" aria-label="Close FAQ">&times;</button>
    <p class="eyebrow">FAQ</p><h2>How Lokal works</h2>
    <div class="score-safeguard"><b>Is there a max Lokal score?</b><p>No. There is no lifetime max score. The score can keep growing as someone attends more unique events. Lower-confidence actions like saves, RSVPs, follows, and messages are limited so they cannot be spammed.</p></div>
    <div class="score-breakdown">${breakdown.items.map(item => `<div class="score-row"><span><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.detail)}</small></span><strong>+${item.value}</strong></div>`).join("")}</div>
    <div class="score-safeguard"><b>How do you prevent cheating?</b><p>Each event can only count once, future events cannot be marked attended, repeated saves or RSVPs are deduped, and short duplicate messages do not inflate the score. In a real app, higher-value attendance would also use check-ins, ticket scans, organizer confirmation, or friend verification.</p></div>
  </section></div>`;
}

function profileReceipts() {
  const stored = state.receipts || [];
  const attendedRows = Array.from(state.attended || []).map(id => {
    const event = events.find(item => item.id === Number(id));
    if (!event) return null;
    return { id: event.id, title: event.title, time: event.time, venue: event.venue, price: event.price, cat: event.cat, desc: event.desc, friends: event.friends || [], attendedAt: event.startSort || Date.now() };
  }).filter(Boolean);
  return [...stored, ...attendedRows]
    .filter((receipt, index, all) => all.findIndex(item => receiptEventKey(item) === receiptEventKey(receipt)) === index)
    .sort((a, b) => (b.attendedAt || 0) - (a.attendedAt || 0));
}

function receiptRow(receipt) {
  const date = receipt.attendedAt ? new Date(receipt.attendedAt) : new Date();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  const people = receipt.friends?.length ? `with ${receipt.friends.map(fullFriendName).join(" + ")}` : "solo plan";
  return `<button class="receipt" data-receipt-event="${receipt.id}"><div class="date-block">${month}<b>${day}</b></div><div><h3>${escapeHtml(receipt.title)}</h3><p>${escapeHtml(receipt.cat)} / ${escapeHtml(receipt.venue)} / ${escapeHtml(people)}</p></div></button>`;
}

function bestFriendsList() {
  const base = { "Ana Lopez": 18, "Marcus Reed": 14, "Dev Shah": 11, "Jules Kim": 9, "Priya Lee": 7 };
  profileReceipts().forEach(receipt => (receipt.friends || []).forEach(initials => {
    const name = fullFriendName(initials);
    base[name] = (base[name] || 0) + 1;
  }));
  return Object.entries(base)
    .map(([name, score]) => ({ name, score, initials: friendInitials(name) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function markEventAttended(id) {
  const event = events.find(item => item.id === Number(id));
  if (!event) return { ok: false, message: "Event not found" };
  if (Number.isFinite(event.startSort) && event.startSort > Date.now()) return { ok: false, message: "You can add this after the event starts" };
  if (state.attended.has(event.id) || profileReceipts().some(receipt => receiptEventKey(receipt) === receiptEventKey(event))) return { ok: false, message: "This event is already counted once" };
  state.attended.add(event.id);
  state.rsvps.delete(event.id);
  const receipt = { id: event.id, eventId: event.id, title: event.title, time: event.time, venue: event.venue, price: event.price, cat: event.cat, desc: event.desc, friends: event.friends || [], attendedAt: event.startSort || Date.now() };
  state.receipts = [receipt, ...(state.receipts || []).filter(item => Number(item.id) !== Number(event.id))];
  localStorage.setItem("lokalAttended", JSON.stringify(Array.from(state.attended)));
  localStorage.setItem("lokalReceipts", JSON.stringify(state.receipts));
  return { ok: true, message: "Receipt, score, and best friends updated" };
}

function openReceipt(id) {
  const receipt = profileReceipts().find(item => String(item.id) === String(id));
  const event = events.find(item => item.id === Number(id)) || receipt;
  const people = receipt?.friends?.length ? receipt.friends.map(fullFriendName).join(", ") : "Just you";
  const eventButton = events.some(item => item.id === Number(id)) ? `<button class="wide-button" data-event="${event.id}">Open event details</button>` : "";
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(event.title)} receipt"><button class="modal-close" aria-label="Close receipt">&times;</button><p class="eyebrow">Event receipt</p><h2>${escapeHtml(event.title)}</h2><p class="event-meta">${escapeHtml(eventMetaLine(event))}</p><h3>${escapeHtml(eventLocationLine(event))}</h3><p class="lede">${escapeHtml(event.desc || "You marked this event as attended.")}</p><div class="attendee-line">${avatarStack(receipt?.friends || [])}<span>You went with ${escapeHtml(people)}.</span></div>${eventButton}</section></div>`;
}

function openTasteEditor() {
  const selected = new Set(state.tastes);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Edit tastes"><button class="modal-close" aria-label="Close tastes">&times;</button>
    <p class="eyebrow">Profile</p><h2>Edit tastes</h2><p class="lede">Pick up to 5 so Lokal can shape your feed without making it feel boxed in.</p>
    <div class="taste-limit" data-taste-count>${selected.size}/5 selected</div>
    <div class="taste-choice-grid">${tasteOptions.map(taste => `<button class="taste-choice ${selected.has(taste) ? "selected" : ""}" data-taste-choice="${escapeHtml(taste)}">${escapeHtml(taste)}</button>`).join("")}</div>
    <button class="wide-button" data-save-tastes>Save tastes</button>
  </section></div>`;
}

function openSettings() {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal settings-sheet" role="dialog" aria-modal="true" aria-label="Profile settings"><button class="modal-close" aria-label="Close settings">&times;</button>
    <p class="eyebrow">Profile and account</p><h2>Settings</h2>
    <div class="settings-avatar"><div class="profile-avatar">${escapeHtml(state.profile.initials)}</div><button class="text-button" data-change-photo>Change photo</button></div>
    <label class="settings-field">Name<input value="${escapeHtml(state.profile.fullName)}" readonly></label><label class="settings-field">Public username<input value="@${escapeHtml(state.profile.username)}" readonly></label><label class="settings-field">Home city<input value="Washington, DC"></label><label class="settings-field">Age<input data-age-input type="number" min="13" max="120" value="${state.age}"></label><label class="settings-field">Bio<input data-bio-input value="${escapeHtml(state.bio)}"></label><small class="section-helper">Ideas: where you're from, school, favorite activities, or what you like doing around the city.</small>
    <label class="privacy-toggle"><span><b>Private account</b><small>Only friends can see your saved interests and profile activity.</small></span><input data-private-account type="checkbox" ${state.privateAccount ? "checked" : ""}></label>
    <p class="settings-label">Account settings</p>
    <label class="settings-field">Phone number<input value="${escapeHtml(formatDisplayPhone(state.profile.phone))}" readonly></label><label class="settings-field">Phone signup status<input value="${state.phoneSignupEnabled ? "Enabled in Supabase" : "Demo OTP active / Supabase phone disabled"}" readonly></label>
    <p class="settings-label">More</p><button class="share-group" data-settings-page="notifications"><span class="share-group-copy"><h3>Notification settings</h3><p>Friend requests, event recommendations, and saved-event reminders</p></span></button><button class="share-group" data-settings-page="verification"><span class="share-group-copy"><h3>Become a Lokal</h3><p>Apply for manual verification</p></span></button><button class="share-group" data-settings-page="privacy"><span class="share-group-copy"><h3>Privacy and blocked accounts</h3><p>Control visibility and manage blocks</p></span></button><button class="share-group" data-settings-page="faq"><span class="share-group-copy"><h3>FAQ</h3><p>Get help with Lokal</p></span></button>
    <button class="wide-button" data-save-settings>Save changes</button><button class="danger-button" data-deactivate>Deactivate account</button>
  </section></div>`;
}

function openSimpleSheet(title, body, action = "") {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="${title}"><button class="modal-close" aria-label="Close ${title}">&times;</button><p class="eyebrow">Lokal</p><h2>${title}</h2><p class="lede">${body}</p>${action}</section></div>`;
}

function rollingCalendar() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 2);
  const months = [];
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    let month = months.find(item => item.key === key);
    if (!month) {
      month = { key, label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }), days: [] };
      months.push(month);
    }
    month.days.push({ iso: date.toISOString().slice(0, 10), label: date.getDate() });
  }
  const selected = String(state.filter.date || "");
  const range = selected.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  const selectedStart = range ? range[1] : /^\d{4}-\d{2}-\d{2}$/.test(selected) ? selected : "";
  const selectedEnd = range ? range[2] : "";
  const calendarVisible = Boolean(selectedStart) || state.filterDatePickerOpen;
  const dateClass = iso => {
    if (iso === selectedStart || iso === selectedEnd) return "selected";
    if (selectedStart && selectedEnd && iso > selectedStart && iso < selectedEnd) return "in-range";
    return "";
  };
  const label = selectedEnd ? `${selectedStart} to ${selectedEnd}` : selectedStart ? `${selectedStart} selected. Choose another day to make a range, or show events for this day.` : "Choose one day, or choose a start and end date for a range.";
  return `<div class="calendar" data-calendar ${calendarVisible ? "" : "hidden"}><p class="calendar-helper">${label}</p>${selectedStart ? `<button class="text-button calendar-clear" data-calendar-clear>Clear dates</button>` : ""}${months.map(month => `<div class="calendar-month"><p class="eyebrow">${month.label}</p><div class="calendar-grid">${month.days.map(day => `<button class="${dateClass(day.iso)}" data-calendar-date="${day.iso}">${day.label}</button>`).join("")}</div></div>`).join("")}</div>`;
}

function activeFilterValue(label) {
  const key = label.toLowerCase();
  if (key === "highlight") return state.highlightedOnly ? "Highlighted only" : "All events";
  return state.filter[key] || {
    date: "Any date",
    time: "Any time",
    category: "All categories",
    price: "Any price"
  }[key];
}

function activeFilterSummary() {
  const items = [];
  if (state.homeFilter !== "all") items.push(`Feed: ${state.homeFilter}`);
  if (state.filter.date && state.filter.date !== "Any date") items.push(`Date: ${state.filter.date}`);
  if (state.filter.time && state.filter.time !== "Any time") items.push(`Time: ${state.filter.time}`);
  if (state.highlightedOnly) items.push("Highlighted only");
  if (state.filter.category && state.filter.category !== "All categories") items.push(`Category: ${state.filter.category}`);
  if (state.filter.price && state.filter.price !== "Any price") items.push(`Price: ${state.filter.price}`);
  return items.length ? items : ["No filters selected"];
}

function openFilters() {
  const blocks = [["Date",["Any date","Today","This weekend","This week","Choose a date"]],["Time",["Any time","Morning","Afternoon","Evening","Late night"]],["Highlight",["All events","Highlighted only"]],["Category",["All categories","concerts","live-music","happy-hours","trivia-nights","nightlife","festivals","performing-arts","museums","sports","community","expos"]],["Price",["Any price","Free","Under $20","Under $50"]]];
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal filter-sheet" role="dialog" aria-modal="true" aria-label="Discover filters"><button class="modal-close" aria-label="Close filters">&times;</button><p class="eyebrow">Discover</p><h2>Filter events.</h2>
    <div class="active-filter-summary"><p class="eyebrow">Currently showing</p>${activeFilterSummary().map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    ${blocks.map(block => { const active = activeFilterValue(block[0]); return `<div class="filter-block"><p class="eyebrow">${block[0]}</p><div class="filter-options">${block[1].map(option => `<button class="${option === active || (block[0] === "Date" && option === "Choose a date" && /^(\d{4}-\d{2}-\d{2})(\.\.\d{4}-\d{2}-\d{2})?$/.test(state.filter.date || "")) ? "selected" : ""}" data-filter-option data-filter-key="${block[0].toLowerCase()}" data-filter-value="${option}">${option}</button>`).join("")}</div></div>`; }).join("")}${rollingCalendar()}<button class="wide-button" data-apply-filters>Show events</button></section></div>`;
}

function openNotifications() {
  const requests = state.pendingRequests
    .filter(request => request.type === "friend")
    .map(request => `<div class="notification-card request-notification"><b>${escapeHtml(request.from)} sent you a friend request</b><p>${escapeHtml(request.detail)}</p><small>${escapeHtml(request.time)}</small><div class="request-actions"><button data-accept-request="${request.id}">Accept</button><button data-decline-request="${request.id}">Decline</button></div></div>`)
    .join("");
  const recommended = notificationEventPicks().map((event, index) => `<button class="notification-card" data-event="${event.id}"><b>${index === 0 ? "New event you might like" : "Fresh pick for you"}</b><p>${escapeHtml(event.title)} was just posted at ${escapeHtml(eventLocationLine(event))}.</p><small>${escapeHtml(eventMetaLine(event))}</small></button>`).join("");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal notification-sheet" role="dialog" aria-modal="true" aria-label="Notifications"><button class="modal-close" aria-label="Close notifications">&times;</button><p class="eyebrow">Updates</p><h2>Notifications</h2>${requests || `<p class="section-helper">No new friend requests right now.</p>`}${recommended}</section></div>`;
}

function notificationEventPicks() {
  const tasteText = (state.tastes || []).join(" ").toLowerCase();
  return events
    .filter(event => typeof isDisplayableDcEvent !== "function" || isDisplayableDcEvent(event))
    .filter(event => matchesFilter(event, "all", false))
    .map(event => {
      const text = `${event.title} ${event.cat} ${event.tag} ${eventTags(event).join(" ")}`.toLowerCase();
      const score = (tasteText.includes("music") && /concert|music|jazz|dj|r&b|rock|pop/.test(text) ? 5 : 0)
        + (tasteText.includes("food") && /food|market|chef|restaurant|brunch/.test(text) ? 5 : 0)
        + (tasteText.includes("art") && /museum|arts|gallery|film|comedy|theater/.test(text) ? 5 : 0)
        + (state.saved.has(event.id) || state.rsvps.has(event.id) ? -10 : 0);
      return { event, score };
    })
    .sort((a, b) => b.score - a.score || sortEventsByStart(a.event, b.event))
    .map(item => item.event)
    .slice(0, 2);
}

function profilePlanIds() {
  return profilePlanEvents().map(event => event.id);
}

function profilePlanEvents() {
  const ids = Array.from(new Set([...state.saved, ...state.rsvps]))
    .filter(id => !state.removedPlans?.has(id));
  return ids
    .map(id => events.find(item => String(item.id) === String(id)))
    .filter(Boolean)
    .sort(sortEventsByStart);
}

function openProfileList(type) {
  const plans = profilePlanEvents();
  const rows = type === "friends"
    ? friendDirectory.filter(friend => state.friends.has(friend[1])).map(friend => friendCard(friend)).join("")
    : plans.map(event => {
      return `<div class="managed-list-row managed-plan-row"><button class="managed-plan-main" data-event="${event.id}"><span><b>${event.title}</b><small>${event.time} / ${escapeHtml(eventLocationLine(event))}</small></span></button><div><button class="text-button" data-event="${event.id}">Open plan</button><button class="text-button danger-text" data-remove-plan="${event.id}">Remove plan</button></div></div>`;
    }).join("");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="${type} list"><button class="modal-close" aria-label="Close list">&times;</button><p class="eyebrow">Your profile</p><h2>${type[0].toUpperCase()+type.slice(1)}</h2><div class="managed-list">${rows || `<p class="section-helper">Nothing here yet.</p>`}</div></section></div>`;
}
