function renderProfile() {
  const tasteChips = state.tastes.map(taste => `<span class="chip active">${escapeHtml(taste)}</span>`).join("");
  const receipts = profileReceipts();
  app.innerHTML = `<section class="page">
    <div class="discover-heading"><div><p class="eyebrow">Your Lokal</p><h1>Profile</h1></div><button class="filter-button" data-settings>Settings</button></div>
    <div class="profile-card"><div class="profile-avatar">${escapeHtml(state.profile.initials)}</div><div><h2>${escapeHtml(state.profile.fullName)}</h2><p>@${escapeHtml(state.profile.username)}</p><span class="lokal-score">${lokalScore()} <small>Lokal score</small></span><button class="text-button" data-settings>Settings</button></div></div>
    <p class="bio">${escapeHtml(state.bio)}</p>
    <p class="eyebrow">Your tastes</p><div class="chips profile-taste-chips">${tasteChips}<button class="chip" data-edit-tastes>Edit</button></div>
    <div class="stats section profile-stats"><button class="stat-card" data-profile-list="plans"><b>${profilePlanIds().length}</b><small>Plans</small></button><button class="stat-card" data-profile-list="groups"><b>${userGroupNames().length}</b><small>Groups</small></button></div>
    <p class="eyebrow">Best friends</p><div class="best-friends-list">${bestFriendsList().map((friend,index) => `<div class="best-friend-row"><b>${index + 1}</b><span class="avatar">${friend.initials}</span><span><strong>${friend.name}</strong><small>${friend.score} shared activit${friend.score === 1 ? "y" : "ies"}</small></span></div>`).join("")}</div>
    <p class="eyebrow">Your receipt</p><h2>Recently attended</h2>
    <div class="receipt-list">${receipts.map(receiptRow).join("") || `<p class="section-helper">Mark an event as attended and it will show here.</p>`}</div>
  </section>`;
}

function fullFriendName(initials) {
  return ({ AL: "Ana Lopez", MR: "Marcus Reed", DV: "Dev Shah", JS: "Jules Kim", PL: "Priya Lee" }[initials] || friendNames[initials] || initials);
}

function lokalScore() {
  return 100 + profileReceipts().length * 12 + state.rsvps.size * 2 + state.saved.size;
}

function profileReceipts() {
  const stored = state.receipts || [];
  const attendedRows = Array.from(state.attended || []).map(id => {
    const event = events.find(item => item.id === Number(id));
    if (!event) return null;
    return { id: event.id, title: event.title, time: event.time, venue: event.venue, price: event.price, cat: event.cat, desc: event.desc, friends: event.friends || [], attendedAt: event.startSort || Date.now() };
  }).filter(Boolean);
  return [...stored, ...attendedRows]
    .filter((receipt, index, all) => all.findIndex(item => String(item.id) === String(receipt.id)) === index)
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
  if (!event) return;
  state.attended.add(event.id);
  state.rsvps.delete(event.id);
  const receipt = { id: event.id, title: event.title, time: event.time, venue: event.venue, price: event.price, cat: event.cat, desc: event.desc, friends: event.friends || [], attendedAt: event.startSort || Date.now() };
  state.receipts = [receipt, ...(state.receipts || []).filter(item => Number(item.id) !== Number(event.id))];
  localStorage.setItem("lokalAttended", JSON.stringify(Array.from(state.attended)));
  localStorage.setItem("lokalReceipts", JSON.stringify(state.receipts));
}

function openReceipt(id) {
  const receipt = profileReceipts().find(item => String(item.id) === String(id));
  const event = events.find(item => item.id === Number(id)) || receipt;
  const people = receipt?.friends?.length ? receipt.friends.map(fullFriendName).join(", ") : "Just you";
  const eventButton = events.some(item => item.id === Number(id)) ? `<button class="wide-button" data-event="${event.id}">Open event details</button>` : "";
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(event.title)} receipt"><button class="modal-close" aria-label="Close receipt">&times;</button><p class="eyebrow">Event receipt</p><h2>${escapeHtml(event.title)}</h2><p class="event-meta">${escapeHtml(event.time || "")} / ${escapeHtml(event.price || "")}</p><h3>${escapeHtml(event.venue || "")}</h3><p class="lede">${escapeHtml(event.desc || "You marked this event as attended.")}</p><div class="attendee-line">${avatarStack(receipt?.friends || [])}<span>You went with ${escapeHtml(people)}.</span></div>${eventButton}</section></div>`;
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
    <p class="settings-label">Account settings</p>
    <label class="settings-field">Phone number<input value="${escapeHtml(formatDisplayPhone(state.profile.phone))}" readonly></label><label class="settings-field">Phone signup status<input value="${state.phoneSignupEnabled ? "Enabled in Supabase" : "Demo OTP active / Supabase phone disabled"}" readonly></label>
    <p class="settings-label">More</p><button class="share-group" data-settings-page="notifications"><span class="share-group-copy"><h3>Notification settings</h3><p>Groups, messages, and event reminders</p></span></button><button class="share-group" data-settings-page="verification"><span class="share-group-copy"><h3>Become a Lokal</h3><p>Apply for manual verification</p></span></button><button class="share-group" data-settings-page="privacy"><span class="share-group-copy"><h3>Privacy and blocked accounts</h3><p>Control visibility and manage blocks</p></span></button><button class="share-group" data-settings-page="faq"><span class="share-group-copy"><h3>FAQ</h3><p>Get help with Lokal</p></span></button>
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
  const chosenDate = /^\d{4}-\d{2}-\d{2}$/.test(state.filter.date || "") ? state.filter.date : "";
  return `<div class="calendar" data-calendar ${chosenDate ? "" : "hidden"}><p class="calendar-helper">Choose any date from today through ${end.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.</p>${months.map(month => `<div class="calendar-month"><p class="eyebrow">${month.label}</p><div class="calendar-grid">${month.days.map(day => `<button class="${day.iso === chosenDate ? "selected" : ""}" data-calendar-date="${day.iso}">${day.label}</button>`).join("")}</div></div>`).join("")}</div>`;
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
  const blocks = [["Date",["Any date","Today","This weekend","This week","Choose a date"]],["Time",["Any time","Morning","Afternoon","Evening","Late night"]],["Highlight",["All events","Highlighted only"]],["Category",["All categories","concerts","festivals","performing-arts","sports","community","expos"]],["Price",["Any price","Free","Under $20","Under $50"]]];
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal filter-sheet" role="dialog" aria-modal="true" aria-label="Discover filters"><button class="modal-close" aria-label="Close filters">&times;</button><p class="eyebrow">Discover</p><h2>Filter events.</h2>
    <div class="active-filter-summary"><p class="eyebrow">Currently showing</p>${activeFilterSummary().map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    ${blocks.map(block => { const active = activeFilterValue(block[0]); return `<div class="filter-block"><p class="eyebrow">${block[0]}</p><div class="filter-options">${block[1].map(option => `<button class="${option === active || (block[0] === "Date" && option === "Choose a date" && /^\d{4}-\d{2}-\d{2}$/.test(state.filter.date || "")) ? "selected" : ""}" data-filter-option data-filter-key="${block[0].toLowerCase()}" data-filter-value="${option}">${option}</button>`).join("")}</div></div>`; }).join("")}${rollingCalendar()}<button class="wide-button" data-apply-filters>Show events</button></section></div>`;
}

function openNotifications() {
  const requests = state.pendingRequests.map(request => `<div class="notification-card request-notification"><b>${request.type === "group" ? `${request.from} invited you to ${request.name}` : `${request.from} sent you a friend request`}</b><p>${request.detail}</p><small>${request.time}</small><div class="request-actions"><button data-accept-request="${request.id}">Accept</button><button data-decline-request="${request.id}">Decline</button></div></div>`).join("");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal notification-sheet" role="dialog" aria-modal="true" aria-label="Notifications"><button class="modal-close" aria-label="Close notifications">&times;</button><p class="eyebrow">Updates</p><h2>Notifications</h2>${requests}<button class="notification-card" data-notification-group="Culture club"><b>New message in Culture club</b><p>Jules shared a gallery opening for Thursday.</p><small>34 minutes ago</small></button><div class="notification-card"><b>Jazz on the Hill starts soon</b><p>Your saved event begins at 7:30 PM.</p><small>Tonight</small></div></section></div>`;
}

function profilePlanIds() {
  return Array.from(new Set([1, 3, 5, ...state.saved, ...state.rsvps])).filter(id => !state.removedPlans?.has(id));
}

function openProfileList(type) {
  const plans = profilePlanIds();
  const rows = type === "groups"
    ? userGroupNames().map(name => `<div class="managed-list-row"><span><b>${name}</b><small>Group conversation</small></span><div><button class="text-button" data-open-group="${name}">Open conversation</button><button class="text-button danger-text" data-profile-leave-group="${name}">Leave group</button></div></div>`).join("")
    : plans.map(id => {
      const event = events.find(item => item.id === id);
      if (!event) return "";
      return `<div class="managed-list-row managed-plan-row"><button class="managed-plan-main" data-event="${event.id}"><span><b>${event.title}</b><small>${event.time} / ${event.venue}</small></span></button><div><button class="text-button" data-event="${event.id}">Open plan</button><button class="text-button danger-text" data-remove-plan="${event.id}">Remove plan</button></div></div>`;
    }).join("");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="${type} list"><button class="modal-close" aria-label="Close list">&times;</button><p class="eyebrow">Your profile</p><h2>${type[0].toUpperCase()+type.slice(1)}</h2><div class="managed-list">${rows || `<p class="section-helper">Nothing here yet.</p>`}</div></section></div>`;
}
