const LOKAL_SCORE_LEVELS = [
  { name: "New in Town", min: 0, next: 200 },
  { name: "Explorer", min: 200, next: 275 },
  { name: "District Scout", min: 275, next: 350 },
  { name: "Neighborhood Regular", min: 350, next: 450 },
  { name: "Plan Maker", min: 450, next: 575 },
  { name: "Ward Wanderer", min: 575, next: 725 },
  { name: "Metro Connector", min: 725, next: 900 },
  { name: "District Insider", min: 900, next: 1100 },
  { name: "Downtown Regular", min: 1100, next: 1350 },
  { name: "Capital Connector", min: 1350, next: 1650 },
  { name: "DC Tastemaker", min: 1650, next: 2000 },
  { name: "Certified Lokal", min: 2000, next: 2400 },
  { name: "District Icon", min: 2400, next: 2900 },
  { name: "Lokal Legend", min: 2900, next: 3600 },
  { name: "DC Hall of Fame", min: 3600, next: null }
];

function scoreLevel(score) {
  return LOKAL_SCORE_LEVELS.slice().reverse().find(level => score >= level.min) || LOKAL_SCORE_LEVELS[0];
}

function nextLevelName(level) {
  return LOKAL_SCORE_LEVELS.find(item => item.min === level.next)?.name || "";
}

function tasteColor(taste) {
  const category = typeof categoryFromTaste === "function" ? categoryFromTaste(taste) : "";
  if (category && CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const palette = ["#00C9A7", "#FF7B54", "#B07EDB", "#5F9FC3", "#F59E0B", "#FF6B9D", "#7BC67E", "#7C6BFF"];
  const seed = Array.from(String(taste || "")).reduce((total, character) => total + character.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

function receiptThumbStyle(receipt) {
  const event = events.find(item => String(item.id) === String(receipt.id));
  const art = event ? eventArtImage(event) : genericEventArt({ cat: receipt.cat, title: receipt.title, venue: receipt.venue });
  return event?.image ? cleanEventThumbStyle(art) : `background-image: linear-gradient(160deg, rgba(0,0,0,.04), rgba(0,0,0,.3)), ${art};`;
}

function attendanceRow(receipt, index = 0) {
  const date = receipt.attendedAt ? new Date(receipt.attendedAt) : new Date();
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `<button class="attend-row" style="--i:${index}" data-receipt-event="${receipt.id}"><span class="attend-thumb" style="${receiptThumbStyle(receipt)}"></span><span class="attend-copy"><b>${escapeHtml(receipt.title)}</b><small>${escapeHtml(label)} / ${escapeHtml(receipt.cat || "event")}</small></span></button>`;
}

function groupReceiptsByMonth(receipts) {
  const groups = [];
  receipts.forEach(receipt => {
    const date = receipt.attendedAt ? new Date(receipt.attendedAt) : new Date();
    const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    let group = groups.find(item => item.label === label);
    if (!group) { group = { label, items: [] }; groups.push(group); }
    group.items.push(receipt);
  });
  return groups;
}

function attendanceHistorySection() {
  const receipts = profileReceipts();
  if (!receipts.length) return `<p class="section-helper">Mark an event as attended and it will show up here.</p>`;
  const expanded = Boolean(state.profileReceiptsExpanded);
  let order = 0;
  const body = expanded
    ? groupReceiptsByMonth(receipts).map(group => `<p class="eyebrow attend-month">${escapeHtml(group.label)}</p><div class="attend-list">${group.items.map(receipt => attendanceRow(receipt, order++)).join("")}</div>`).join("")
    : `<div class="attend-list">${receipts.slice(0, 3).map((receipt, index) => attendanceRow(receipt, index)).join("")}</div>`;
  const toggle = receipts.length > 3
    ? `<button class="text-button view-all-receipts" data-toggle-receipts>${expanded ? "Show less" : `View all ${receipts.length}`}</button>`
    : "";
  return `${body}${toggle}`;
}

function approvedVenueProfileName() {
  return Array.isArray(state.verifiedVenueNames) ? state.verifiedVenueNames[0] || "" : "";
}

function hasApprovedVenueProfile() {
  const venueName = accountVenueName();
  if (venueName && state.verifiedVenues?.has(venueImageKeyName(venueName))) return true;
  return Boolean(approvedVenueProfileName());
}

function hostedEventsForVenue() {
  const name = accountVenueName();
  if (!name) return [];
  return displayableDcEvents().filter(event => venueEventMatch(event, name)).sort(sortEventsByStart);
}

function hostedEventRow(event, index = 0) {
  const art = eventCardImageSrc(event);
  const style = event.image ? cleanEventThumbStyle(art) : `background-image: linear-gradient(160deg, rgba(0,0,0,.04), rgba(0,0,0,.3)), ${art};`;
  return `<button class="attend-row" style="--i:${index}" data-event="${event.id}"><span class="attend-thumb" style="${style}"></span><span class="attend-copy"><b>${escapeHtml(event.title)}</b><small>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</small></span></button>`;
}

function venueHostedSection() {
  const hosted = hostedEventsForVenue();
  if (!hosted.length) return `<p class="section-helper">Events you post or host will show up here after they are approved.</p>`;
  return `<div class="attend-list">${hosted.slice(0, 5).map((event, index) => hostedEventRow(event, index)).join("")}</div>`;
}

function venueInsightPanel() {
  return "";
}

function venueFocusSection() {
  const hosted = hostedEventsForVenue();
  const labels = [...new Set(hosted.map(event => discoverCategoryLabel(event.cat || "community")))].slice(0, 5);
  const chips = (labels.length ? labels : ["Event hosting", "Local audience", "Venue updates"]).map(label => `<span class="taste-pill" style="--c:${tasteColor(label)}">${escapeHtml(label)}</span>`).join("");
  return `<p class="eyebrow">Venue focus</p>
    <p class="section-subnote">These are based on the events connected to your venue.</p>
    <div class="chips profile-taste-chips">${chips}</div>`;
}

// Illustrated category picker — moved here from Discover's "Your top types".
// Tapping a tile toggles it straight into state.tastes.
function tasteCategoryGrid() {
  const selected = new Set(state.tastes);
  const tiles = categoryArtOptions.map(name => `<button class="taste-tile${selected.has(name) ? " selected" : ""}" data-taste-toggle="${escapeHtml(name)}" aria-pressed="${selected.has(name)}">
    <span class="taste-tile-art">${categoryArt[name]}</span>
    <b>${escapeHtml(name)}</b>
  </button>`).join("");
  return `<div class="taste-tiles">${tiles}</div>`;
}

function tasteIconLabel(taste) {
  if (categoryArt[taste]) return taste;
  const category = typeof categoryFromTaste === "function" ? categoryFromTaste(taste) : "";
  const byCategory = {
    concerts: "Concerts",
    "live-music": "Live music",
    food: "Food & drink",
    sports: "Sports",
    comedy: "Comedy",
    "visual-arts": "Visual arts",
    "performing-arts": "Performing arts",
    museums: "Museums",
    festivals: "Markets",
    "happy-hours": "Happy hours",
    "trivia-nights": "Trivia",
    kids: "Kids",
    community: "Community",
    nightlife: "Nightlife",
    culture: "Culture"
  };
  return byCategory[category] || "";
}

function profileTasteIconStrip() {
  const tastes = (state.tastes || [])
    .map(taste => ({ taste, label: tasteIconLabel(taste) }))
    .filter(item => item.label && categoryArt[item.label])
    .filter((item, index, all) => all.findIndex(other => other.label === item.label) === index)
    .slice(0, 5);
  if (!tastes.length) return "";
  return `<div class="pid-taste-icons" aria-label="Selected tastes">${tastes.map(({ taste, label }) => `<span class="pid-taste-icon" title="${escapeHtml(taste)}" aria-label="${escapeHtml(taste)}">${categoryArt[label]}</span>`).join("")}</div>`;
}

function userTasteSection(tastePills) {
  return `<p class="eyebrow">Your top tastes</p>
    <p class="section-subnote">Tap the ones you want more of. These shape your recommendations.</p>
    ${tasteCategoryGrid()}`;
}

function profileInsightPanel() {
  const receipts = profileReceipts();
  const categories = receipts.reduce((totals, receipt) => {
    const label = discoverCategoryLabel(receipt.cat || "community");
    totals[label] = (totals[label] || 0) + 1;
    return totals;
  }, {});
  const categoryRows = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topCount = Math.max(1, ...categoryRows.map(row => row[1]));
  return `<section class="section profile-insights compact-profile-section"><div class="section-heading"><div><p class="eyebrow">Stats</p><h2>Category mix</h2></div></div>
    <div class="category-bars">${categoryRows.map(([label, count], index) => `<div class="category-bar" style="--level:${Math.max(18, Math.round((count / topCount) * 100))}%; --delay:${index * 80}ms"><span><b>${escapeHtml(label)}</b><small>${count} visit${count === 1 ? "" : "s"}</small></span><i></i></div>`).join("") || `<p class="section-helper">Mark events as attended to build your category stats.</p>`}</div>
  </section>`;
}

function profileSummaryStrip(isVenueProfile = false) {
  if (isVenueProfile) {
    const hosted = hostedEventsForVenue();
    const upcoming = hosted.filter(event => !Number.isFinite(event.startSort) || event.startSort >= Date.now()).length;
    const pending = (state.pendingVenueRequests || []).length;
    return `<section class="profile-summary-strip">
      <div><b>${hosted.length}</b><small>Hosted events</small></div>
      <div><b>${upcoming}</b><small>Upcoming</small></div>
      <div><b>${pending}</b><small>Requests</small></div>
    </section>`;
  }
  const receipts = profileReceipts();
  const plans = profilePlanEvents();
  const venueCount = typeof followedVenueNames === "function" ? followedVenueNames().length : 0;
  return `<section class="profile-summary-strip">
    <button data-profile-list="attended"><b>${receipts.length}</b><small>Attended</small></button>
    <button data-profile-list="plans"><b>${plans.length}</b><small>Saved & RSVPs</small></button>
    <button data-profile-list="friends"><b>${state.friends.size}</b><small>Friends</small></button>
    <button data-profile-list="venues"><b>${venueCount}</b><small>Venues following</small></button>
  </section>`;
}

// Canvas profile list rows. Each one opens the list it counts, so this is a
// second route into the same sheets the summary strip already opens.
function profileListRows() {
  const rows = [
    ["attended", "Attended", profileReceipts().length, `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.6 2.6L16 9.5"/></svg>`],
    ["plans", "Want to go", profilePlanEvents().length, `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4h10a1 1 0 011 1v15l-6-4.4L6 20V5a1 1 0 011-1z"/></svg>`],
    ["venues", "Venues following", typeof followedVenueNames === "function" ? followedVenueNames().length : 0, `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 16.6s-3.6-2.4-3.6-4.8a1.95 1.95 0 013.6-1.1 1.95 1.95 0 013.6 1.1c0 2.4-3.6 4.8-3.6 4.8z" fill="currentColor" stroke="none"/></svg>`]
  ];
  return `<div class="profile-list-rows">${rows.map(([kind, label, count, icon]) => `<button class="profile-list-row" data-profile-list="${kind}">${icon}<b>${label}</b><span class="plr-count">${count}</span><span class="plr-caret">&rsaquo;</span></button>`).join("")}</div>`;
}

function profileScoreSection(score, level, progress, toNext) {
  return `<section class="section compact-profile-section profile-score-section">
    <button class="score-block compact-score-block" data-score-activity>
      <span><p class="eyebrow">Lokal score</p><b>${score}</b><small>${escapeHtml(level.name)}</small></span>
      <span class="score-mini-progress"><i style="width:${Math.round(progress * 100)}%"></i></span>
      <em>${level.next ? `${toNext} pts to ${escapeHtml(nextLevelName(level))}` : "Top level reached"}</em>
    </button>
  </section>`;
}

function profileTastesSection(content) {
  return `<section class="section compact-profile-section">${content}</section>`;
}

function profileHistorySection(isVenueProfile) {
  return `<section class="section compact-profile-section">
    <div class="section-heading"><div><p class="eyebrow">${isVenueProfile ? "Venue history" : "History"}</p><h2>${isVenueProfile ? "Events hosted" : "Events attended"}</h2></div></div>
    ${isVenueProfile ? venueHostedSection() : attendanceHistorySection()}
  </section>`;
}

function venueVerificationPanel() {
  return "";
}

function renderProfile() {
  const isVenueProfile = isVenueAccount();
  const venueName = accountVenueName() || currentAccountDisplayName();
  const venueDescription = state.profile.venueDescription || "Add a venue description so people know the kind of nights, crowds, and events you host.";
  const venueImage = currentVenueImage();
  const venueOwnerName = state.profile.ownerName || state.profile.fullName || "";
  const score = lokalScore();
  const level = scoreLevel(score);
  const progress = level.next ? Math.min(1, (score - level.min) / (level.next - level.min)) : 1;
  const toNext = level.next ? Math.max(0, level.next - score) : 0;
  const tastePills = state.tastes.map(taste => `<span class="taste-pill" style="--c:${tasteColor(taste)}">${escapeHtml(taste)}</span>`).join("");
  app.innerHTML = `<section class="page profile-page">
    <div class="discover-heading"><div><h1>${escapeHtml(isVenueProfile ? venueName : state.profile.fullName)}</h1></div><div class="profile-top-actions"><button class="filter-button" data-share-profile="${escapeHtml(state.profile.username)}">Share</button><button class="filter-button" data-settings>Edit</button></div></div>
    <div class="profile-id">
      <div class="pid-avatar">${(isVenueProfile ? venueImage : state.profile.avatarUrl) ? `<img src="${escapeHtml(isVenueProfile ? venueImage : state.profile.avatarUrl)}" alt="">` : escapeHtml(isVenueProfile ? currentAccountInitials() : state.profile.initials)}</div>
      <p class="pid-handle">${isVenueProfile ? escapeHtml(venueName) : `@${escapeHtml(state.profile.username)}`}</p>
      <p class="bio pid-bio">${escapeHtml(isVenueProfile ? venueDescription : state.bio)}</p>
      ${isVenueProfile ? "" : profileTasteIconStrip()}
      <p class="pid-since">${isVenueProfile ? `${hasApprovedVenueProfile() ? "Verified venue account" : "Venue verification pending"}${venueOwnerName ? ` / Managed by ${escapeHtml(venueOwnerName)}` : ""}` : (state.privateAccount ? "Private account" : "Public account")}</p>
    </div>
    ${isVenueProfile ? "" : profileScoreSection(score, level, progress, toNext)}
    ${profileSummaryStrip(isVenueProfile)}
    ${profileTastesSection(isVenueProfile ? venueFocusSection() : userTasteSection(tastePills))}
    ${isVenueProfile ? venueVerificationPanel() : ""}
    ${!isVenueProfile && state.friends.size < 3 ? `<div class="invite-banner"><div class="invite-banner-copy"><b>Lokal is better with friends.</b><p>Invite people you know and see what they're saving.</p></div><button class="invite-banner-btn" data-add-friends-link>Invite friends</button></div>` : ""}
    ${profileHistorySection(isVenueProfile)}
    ${isVenueProfile ? venueInsightPanel() : profileInsightPanel()}
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

function attendanceTimeKey(item) {
  const raw = Number(item?.startSort || item?.attendedAt || 0);
  if (Number.isFinite(raw) && raw > 0) return String(Math.floor(raw / 60000));
  return String(item?.time || "").toLowerCase().trim();
}

function sameTimeAttendanceCount(event) {
  const key = attendanceTimeKey(event);
  if (!key) return 0;
  return profileReceipts().filter(receipt => attendanceTimeKey(receipt) === key).length;
}

function scoreBreakdown() {
  const receipts = profileReceipts();
  const rsvpCount = Array.from(state.rsvps || []).filter(id => !state.removedPlans?.has(id)).length;
  const savedOnlyCount = Array.from(state.saved || []).filter(id => !state.rsvps.has(id) && !state.removedPlans?.has(id)).length;
  const followCount = (state.follows?.size || 0) + rsvpCount;
  const inviteCount = Number(state.inviteLinksSent || 0);
  const friendSignupCount = state.friendSignupCredits?.size || 0;
  const breakdown = [
    { label: "New in Town", value: 100, detail: "100 starting points for creating a profile and joining Lokal." },
    { label: "Verified attendance", value: receipts.length * 15, detail: `${receipts.length} unique event receipt${receipts.length === 1 ? "" : "s"} - 15 each - no lifetime cap.` },
    { label: "Went with friends", value: receiptFriendUnits(receipts) * 5, detail: "5 points for each friend attached to an attended event receipt. It grows with real group plans, not random friend adds." },
    { label: "Upcoming plans", value: cappedScore(rsvpCount, 3, 30), detail: `${rsvpCount} RSVP${rsvpCount === 1 ? "" : "s"} - 3 each - capped at 30.` },
    { label: "Saved ideas", value: cappedScore(savedOnlyCount, 1, 20), detail: `${savedOnlyCount} saved event${savedOnlyCount === 1 ? "" : "s"} not already RSVP'd - 1 each - capped at 20.` },
    { label: "Following events & venues", value: cappedScore(followCount, 1, 25), detail: `${followCount} followed event or venue signal${followCount === 1 ? "" : "s"} - 1 each - capped at 25.` },
    { label: "Friends", value: cappedScore(state.friends.size, 1, 30), detail: `${state.friends.size} friend${state.friends.size === 1 ? "" : "s"} - 1 each - capped at 30.` },
    { label: "Invite links sent", value: cappedScore(inviteCount, 1, 10), detail: `${inviteCount} invite link${inviteCount === 1 ? "" : "s"} sent - 1 each - capped at 10.` },
    { label: "Friend signups", value: cappedScore(friendSignupCount, 3, 30), detail: `${friendSignupCount} friend signup credit${friendSignupCount === 1 ? "" : "s"} - 3 each - capped at 30.` },
    { label: "Conversation activity", value: cappedScore(socialActivityUnits(), 1, 30), detail: "Counts unique meaningful direct messages and event shares, not repeated short spam." }
  ];
  return { total: breakdown.reduce((sum, item) => sum + item.value, 0), items: breakdown };
}

function scoreActionDateLabel(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function scoreActivityItems() {
  const items = [];
  profileReceipts().forEach(receipt => items.push({
    at: receipt.attendedAt || receipt.startSort || Date.now(),
    title: `Attended ${receipt.title}`,
    detail: [receipt.venue, receipt.cat].filter(Boolean).join(" / "),
    points: 15
  }));
  Array.from(state.rsvps || []).forEach(id => {
    const event = events.find(item => item.id === Number(id));
    if (!event || state.removedPlans?.has(event.id)) return;
    items.push({ at: event.startSort || Date.now(), title: `RSVP'd to ${event.title}`, detail: eventLocationLine(event), points: 3 });
  });
  Array.from(state.saved || []).forEach(id => {
    if (state.rsvps.has(id)) return;
    const event = events.find(item => item.id === Number(id));
    if (!event || state.removedPlans?.has(event.id)) return;
    items.push({ at: event.startSort || Date.now(), title: `Saved ${event.title}`, detail: eventLocationLine(event), points: 1 });
  });
  Array.from(state.follows || []).forEach(value => {
    const text = String(value || "");
    items.push({ at: Date.now() - 60000, title: text.startsWith("venue:") ? `Followed ${text.replace(/^venue:/, "")}` : `Followed ${text}`, detail: text.startsWith("venue:") ? "Venue follow" : "Event follow", points: 1 });
  });
  if (state.friends?.size) items.push({ at: Date.now() - 120000, title: `Connected with ${state.friends.size} friend${state.friends.size === 1 ? "" : "s"}`, detail: "Friend activity", points: Math.min(state.friends.size, 30) });
  if (Number(state.inviteLinksSent || 0) > 0) items.push({ at: Date.now() - 180000, title: `Sent ${state.inviteLinksSent} invite link${state.inviteLinksSent === 1 ? "" : "s"}`, detail: "Invite activity", points: Math.min(Number(state.inviteLinksSent || 0), 10) });
  if (state.friendSignupCredits?.size) items.push({ at: Date.now() - 240000, title: `${state.friendSignupCredits.size} friend signup credit${state.friendSignupCredits.size === 1 ? "" : "s"}`, detail: "Referral activity", points: Math.min(state.friendSignupCredits.size * 3, 30) });
  if (socialActivityUnits() > 0) items.push({ at: Date.now() - 300000, title: "Shared or messaged about plans", detail: "Social activity", points: Math.min(socialActivityUnits(), 30) });
  return items
    .filter(item => item.points > 0)
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, 12);
}

function openScoreActivitySheet() {
  const score = lokalScore();
  const level = scoreLevel(score);
  const items = scoreActivityItems().slice(0, 3);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Lokal score activity"><button class="modal-close" aria-label="Close score activity">&times;</button>
    <p class="eyebrow">Lokal score</p><h2>Recent score activity</h2>
    <p class="lede">${score} points / ${escapeHtml(level.name)}</p>
    ${items.length ? `<div class="score-breakdown score-activity-list">${items.map(item => `<div class="score-row score-activity-row"><span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(scoreActionDateLabel(item.at))}${item.detail ? ` / ${escapeHtml(item.detail)}` : ""}</small></span><strong>+${item.points}</strong></div>`).join("")}</div>` : `<p class="section-helper">No score-changing actions yet. Save, RSVP, follow, invite friends, or mark past events as attended to build your activity.</p>`}
  </section></div>`;
}

function openScoreGuideSheet() {
  const breakdown = scoreBreakdown();
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Lokal score guide"><button class="modal-close" aria-label="Close score guide">&times;</button>
    <p class="eyebrow">Settings</p><h2>Lokal score guide</h2>
    <div class="score-safeguard"><b>Is there a max Lokal score?</b><p>No. There is no lifetime max score. The score can keep growing as someone attends more unique events. Lower-confidence actions like saves, RSVPs, follows, and messages are limited so they cannot be spammed.</p></div>
    <div class="score-breakdown">${breakdown.items.map(item => `<div class="score-row"><span><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.detail)}</small></span><strong>+${item.value}</strong></div>`).join("")}</div>
    <div class="score-safeguard"><b>How do you prevent cheating?</b><p>Each event can only count once, future events cannot be marked attended, repeated saves or RSVPs are deduped, and short duplicate messages do not inflate the score. In a real app, higher-value attendance would also use check-ins, ticket scans, organizer confirmation, or friend verification.</p></div>
  </section></div>`;
}

function openFaqSheet() {
  openSimpleSheet("FAQ", "Use Discover to find events, save plans, RSVP, follow venues, and build your Lokal profile over time.");
}

function openFeedbackSheet() {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal settings-sheet feedback-sheet" role="dialog" aria-modal="true" aria-label="Send feedback"><button class="modal-close" aria-label="Close feedback">&times;</button>
    <p class="eyebrow">Help shape Lokal</p><h2>Send feedback</h2>
    <p class="lede">Tell us what felt confusing, what broke, or what would make the app more useful.</p>
    <label class="settings-field">What should we know?<textarea data-feedback-message maxlength="1200" placeholder="Type feedback here"></textarea></label>
    <p class="account-error" data-feedback-error></p>
    <button class="wide-button" data-submit-feedback>Submit feedback</button>
  </section></div>`;
}

function profileReceipts() {
  const legacyDemoReceiptIds = new Set(["receipt-songbyrd", "receipt-open-streets", "receipt-hirshhorn"]);
  const stored = state.receipts || [];
  const attendedRows = Array.from(state.attended || []).map(id => {
    const event = events.find(item => item.id === Number(id));
    if (!event) return null;
    return { id: event.id, title: event.title, time: event.time, venue: eventLocationLine(event), price: event.price, cat: event.cat, desc: event.desc, friends: event.friends || [], attendedAt: event.startSort || Date.now(), startSort: event.startSort || 0 };
  }).filter(Boolean);
  return [...stored, ...attendedRows]
    .filter(receipt => !legacyDemoReceiptIds.has(String(receipt?.id || "")))
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
  if (sameTimeAttendanceCount(event) >= 2) return { ok: false, message: "You can only mark two events at the same time" };
  state.attended.add(event.id);
  state.rsvps.delete(event.id);
  const receipt = { id: event.id, eventId: event.id, title: event.title, time: event.time, venue: eventLocationLine(event), price: event.price, cat: event.cat, desc: event.desc, friends: event.friends || [], attendedAt: event.startSort || Date.now(), startSort: event.startSort || 0 };
  state.receipts = [receipt, ...(state.receipts || []).filter(item => Number(item.id) !== Number(event.id))];
  localStorage.setItem("lokalAttended", JSON.stringify(Array.from(state.attended)));
  localStorage.setItem("lokalReceipts", JSON.stringify(state.receipts));
  if (typeof submitAttendanceReceipt === "function") submitAttendanceReceipt(receipt);
  return { ok: true, message: "Receipt, score, and best friends updated" };
}

function openReceipt(id) {
  const receipt = profileReceipts().find(item => String(item.id) === String(id));
  const event = events.find(item => item.id === Number(id)) || receipt;
  const people = receipt?.friends?.length ? receipt.friends.map(fullFriendName).join(", ") : "Just you";
  const eventButton = events.some(item => item.id === Number(id)) ? `<button class="wide-button" data-event="${event.id}">Open event details</button>` : "";
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(event.title)} receipt"><button class="modal-close" aria-label="Close receipt">&times;</button><p class="eyebrow">Event receipt</p><h2>${escapeHtml(event.title)}</h2><p class="event-meta">${escapeHtml(eventMetaLine(event))}</p><h3>${escapeHtml(eventLocationLine(event))}</h3><p class="lede">${escapeHtml(event.desc || "You marked this event as attended.")}</p><div class="attendee-line">${avatarStack(receipt?.friends || [])}<span>You went with ${escapeHtml(people)}.</span></div>${eventButton}</section></div>`;
}

function openSettings() {
  const isVenueProfile = isVenueAccount();
  const venueDescription = state.profile.venueDescription || "";
  const venueImage = currentVenueImage();
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal settings-sheet" role="dialog" aria-modal="true" aria-label="Profile settings"><button class="modal-close" aria-label="Close settings">&times;</button>
    <p class="eyebrow">Profile and account</p><h2>Settings</h2>
    <div class="settings-avatar"><div class="profile-avatar">${(isVenueProfile ? venueImage : state.profile.avatarUrl) ? `<img src="${escapeHtml(isVenueProfile ? venueImage : state.profile.avatarUrl)}" alt="">` : escapeHtml(isVenueProfile ? currentAccountInitials() : state.profile.initials)}</div></div>
    <p class="settings-group-label">Account</p>
    <label class="settings-field">${isVenueProfile ? "Venue name" : "Name"}<input value="${escapeHtml(isVenueProfile ? currentAccountDisplayName() : state.profile.fullName)}" readonly></label>
    <label class="settings-field">Public username<input value="@${escapeHtml(state.profile.username)}" readonly></label>
    ${isVenueProfile ? `<label class="settings-field">Venue image URL<input data-venue-image-input type="url" value="${escapeHtml(venueImage)}" placeholder="https://..."></label><label class="settings-field">Venue description<textarea data-venue-description-input placeholder="Tell people what your venue is known for.">${escapeHtml(venueDescription)}</textarea></label>` : `<label class="settings-field">Bio<input data-bio-input value="${escapeHtml(state.bio)}"></label>`}
    ${isVenueProfile ? "" : `<label class="privacy-toggle"><span><b>Private account</b><small>Only friends can see your saved interests and profile activity.</small></span><input data-private-account type="checkbox" ${state.privateAccount ? "checked" : ""}></label>`}
    <hr class="settings-divider">
    <p class="settings-group-label">Preferences</p>
    <label class="settings-field">Home city<input value="Washington, DC"></label>
    <label class="settings-field">Age<input data-age-input type="number" min="13" max="120" value="${state.age}"></label>
    <button class="share-group" data-settings-page="notifications"><span class="share-group-copy"><h3>Notification settings</h3><p>Friend requests, event recommendations, and saved-event reminders</p></span></button>
    <button class="share-group" data-settings-page="privacy"><span class="share-group-copy"><h3>Privacy and blocked accounts</h3><p>Control visibility and manage blocks</p></span></button>
    ${isVenueProfile ? "" : `<button class="share-group" data-settings-page="score-guide"><span class="share-group-copy"><h3>Lokal score guide</h3><p>See what types of activity affect your score</p></span></button>`}
    <hr class="settings-divider">
    <p class="settings-group-label">App</p>
    <label class="settings-field">Phone number<input value="${escapeHtml(formatDisplayPhone(state.profile.phone))}" readonly></label>
    ${isVenueProfile ? `<button class="share-group" data-venue-verify><span class="share-group-copy"><h3>Verify a venue</h3><p>Request owner access to post venue events</p></span></button>` : ""}
    <button class="share-group" data-settings-page="faq"><span class="share-group-copy"><h3>FAQ</h3><p>Get help with Lokal</p></span></button>
    <button class="wide-button" data-save-settings>Save changes</button>
        <hr class="settings-divider">
    <p class="settings-group-label">Legal</p>
    <a class="share-group" href="https://willsingle05-a11y.github.io/LokalAppDC/legal/terms.html" target="_blank" rel="noreferrer"><span class="share-group-copy"><h3>Terms of Service</h3><p>The rules for using Lokal</p></span></a>
    <a class="share-group" href="https://willsingle05-a11y.github.io/LokalAppDC/legal/privacy.html" target="_blank" rel="noreferrer"><span class="share-group-copy"><h3>Privacy Policy</h3><p>How we handle your information</p></span></a>
    <div class="settings-danger"><button class="settings-minor" data-signout>Sign out</button><button class="settings-minor danger" data-deactivate>Delete account</button></div>
  </section></div>`;
}

function openVenueVerificationSheet() {
  openSimpleSheet("Venue accounts unavailable", "Lokal is currently focused on personal accounts and event discovery.");
}

function openSimpleSheet(title, body, action = "") {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="${title}"><button class="modal-close" aria-label="Close ${title}">&times;</button><p class="eyebrow">Lokal</p><h2>${title}</h2><p class="lede">${body}</p>${action}</section></div>`;
}

// --- When? date filter (Lokal Design System, turn 3 / 3a) ---------------
// state.filter.date holds "Any date", a preset label, "YYYY-MM-DD",
// or "YYYY-MM-DD..YYYY-MM-DD". matchesDateFilter() reads all four.
const DATE_PRESETS = ["Any date", "Today", "This weekend", "This week"];
const CALENDAR_MONTH_SPAN = 12;

function calendarIsoDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function filterDateSelection() {
  const value = String(state.filter.date || "");
  const range = value.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  if (range) return { start: range[1], end: range[2] };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { start: value, end: value };
  return { start: "", end: "" };
}

function activeDatePreset() {
  const value = String(state.filter.date || "Any date");
  return DATE_PRESETS.includes(value) ? value : "";
}

// Month cursor is an offset from the current month, clamped to the span.
function calendarMonthOffset() {
  const offset = Number(state.filterCalMonth);
  if (!Number.isFinite(offset)) return 0;
  return Math.min(Math.max(Math.round(offset), 0), CALENDAR_MONTH_SPAN - 1);
}

function calendarMonthGrid(offset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const days = new Array(first.getDay()).fill(null);
  for (let number = 1; number <= total; number += 1) {
    const date = new Date(first.getFullYear(), first.getMonth(), number);
    days.push({ iso: calendarIsoDay(date), number, past: date < today, isToday: date.getTime() === today.getTime() });
  }
  while (days.length % 7) days.push(null);
  return { label: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }), days };
}

function calendarEventCount(start, end) {
  if (!start) return 0;
  const list = typeof displayableDcEvents === "function" ? displayableDcEvents() : events;
  return list.filter(event => {
    const date = eventDateValue(event);
    if (!date) return false;
    const iso = calendarIsoDay(date);
    return iso >= start && iso <= (end || start);
  }).length;
}

function calendarDayLabel(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function calendarDayCell(day, selection) {
  if (!day) return `<span class="cal-cell"></span>`;
  const { start, end } = selection;
  const spans = Boolean(start && end && end > start);
  const isStart = day.iso === start;
  const isEnd = day.iso === end;
  const inside = spans && day.iso > start && day.iso < end;
  const band = [];
  if (spans && (inside || isStart || isEnd)) {
    band.push("cal-band");
    if (isStart) band.push("cal-band-start");
    else if (isEnd) band.push("cal-band-end");
  }
  const marks = [isStart || isEnd ? "cal-picked" : "", day.isToday ? "cal-today" : ""].filter(Boolean).join(" ");
  return `<span class="cal-cell ${band.join(" ")}"><button class="cal-day ${marks}" data-calendar-date="${day.iso}" aria-pressed="${isStart || isEnd}" aria-label="${calendarDayLabel(day.iso)}"${day.past ? " disabled" : ""}>${day.number}</button></span>`;
}

function dateFilterModule() {
  const offset = calendarMonthOffset();
  const month = calendarMonthGrid(offset);
  const selection = filterDateSelection();
  const preset = activeDatePreset() || (selection.start ? "" : "Any date");
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const nights = selection.end ? Math.round((new Date(`${selection.end}T00:00:00`) - new Date(`${selection.start}T00:00:00`)) / 86400000) + 1 : 0;
  const count = calendarEventCount(selection.start, selection.end);
  const summary = selection.start
    ? `<div class="cal-summary"><span>${escapeHtml(calendarDayLabel(selection.start))}${selection.end && selection.end !== selection.start ? ` &rarr; ${escapeHtml(calendarDayLabel(selection.end))}` : ""}</span><small>${nights > 1 ? `${nights} days · ` : ""}${count} ${count === 1 ? "event" : "events"}</small></div>`
    : `<p class="cal-hint">Tap a day, then tap another to build a range.</p>`;
  return `<div class="date-module" data-date-module>
    <div class="date-module-head"><h3>When?</h3>${selection.start ? `<button class="text-button" data-calendar-clear>Clear dates</button>` : ""}</div>
    <div class="date-presets">${DATE_PRESETS.map(option => `<button class="${option === preset ? "selected" : ""}" data-filter-option data-filter-key="date" data-filter-value="${option}">${option}</button>`).join("")}</div>
    <div class="cal-head"><b>${month.label}</b><span class="cal-nav"><button data-calendar-nav="-1" aria-label="Previous month"${offset === 0 ? " disabled" : ""}>&lsaquo;</button><button data-calendar-nav="1" aria-label="Next month"${offset >= CALENDAR_MONTH_SPAN - 1 ? " disabled" : ""}>&rsaquo;</button></span></div>
    <div class="cal-weekdays" aria-hidden="true">${weekdays.map(day => `<span>${day}</span>`).join("")}</div>
    <div class="cal-grid">${month.days.map(day => calendarDayCell(day, selection)).join("")}</div>
    ${summary}
  </div>`;
}

// Re-render just the date module so tapping a day never rebuilds the sheet
// and drops the other filter selections the user has already made.
function refreshDateModule() {
  const host = document.querySelector("[data-date-module]");
  if (!host) { openFilters(); return; }
  host.outerHTML = dateFilterModule();
}

function activeFilterValue(label) {
  const key = label.toLowerCase();
  if (key === "highlight") return state.highlightedOnly ? "Highlighted only" : "All events";
  return state.filter[key] || {
    date: "Any date",
    time: "Any time",
    neighborhood: "Any neighborhood",
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
  if (state.filter.neighborhood && state.filter.neighborhood !== "Any neighborhood") items.push(`Neighborhood: ${state.filter.neighborhood}`);
  if (state.filter.price && state.filter.price !== "Any price") items.push(`Price: ${state.filter.price}`);
  return items.length ? items : ["No filters selected"];
}

function openFilters() {
  const neighborhoodOptions = ["Any neighborhood", ...discoverNeighborhoodOptions(displayableDcEvents())];
  const blocks = [["Time",["Any time","Morning","Afternoon","Evening","Late night"]],["Highlight",["All events","Highlighted only"]],["Neighborhood",neighborhoodOptions],["Category",["All categories","concerts","live-music","happy-hours","trivia-nights","nightlife","festivals","kids","performing-arts","museums","sports","community"]],["Price",["Any price","Free","Under $20","Under $50"]]];
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal filter-sheet" role="dialog" aria-modal="true" aria-label="Discover filters"><button class="modal-close" aria-label="Close filters">&times;</button><p class="eyebrow">Discover</p><h2>Filters</h2>
    <div class="active-filter-summary"><p class="eyebrow">Currently showing</p>${activeFilterSummary().map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    ${dateFilterModule()}
    ${blocks.map(block => { const active = activeFilterValue(block[0]); return `<div class="filter-block"><p class="eyebrow">${block[0]}</p><div class="filter-options">${block[1].map(option => `<button class="${option === active ? "selected" : ""}" data-filter-option data-filter-key="${block[0].toLowerCase()}" data-filter-value="${option}">${option}</button>`).join("")}</div></div>`; }).join("")}
    <div class="filter-footer"><button class="text-button" data-clear-filters>Clear all</button><button class="wide-button" data-apply-filters>Show events</button></div></section></div>`;
}

/* ============================================================
   Notifications
   Only things that actually happened to this account belong here. Nothing is
   manufactured to fill the sheet: no seeded friend requests, no "just posted"
   recommendations invented from the feed. If the list is empty, it stays empty.
   ============================================================ */

const NOTIFICATION_SEEN_KEY = "lokalNotificationsSeen";

// A saved or RSVP'd event that starts today or tomorrow. Earned twice over: the
// user put it on their list, and the clock is what makes it newsworthy.
function notificationPlanReminders() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWindow = new Date(startOfToday.getTime() + 2 * 86400000);
  return events
    .filter(event => state.rsvps.has(event.id) || state.saved.has(event.id))
    .map(event => ({ event, date: typeof eventDateValue === "function" ? eventDateValue(event) : null }))
    .filter(entry => entry.date && entry.date >= startOfToday && entry.date < endOfWindow)
    .sort((a, b) => a.date - b.date)
    .map(entry => {
      const isToday = entry.date < new Date(startOfToday.getTime() + 86400000);
      return {
        id: `plan-${entry.event.id}`,
        eventId: entry.event.id,
        title: state.rsvps.has(entry.event.id)
          ? `You're going ${isToday ? "today" : "tomorrow"}`
          : `Saved event ${isToday ? "today" : "tomorrow"}`,
        body: `${eventDisplayTitle(entry.event)} at ${eventLocationLine(entry.event)}.`,
        meta: eventMetaLine(entry.event)
      };
    })
    .slice(0, 6);
}

function notificationItems() {
  const requests = (state.pendingRequests || [])
    .filter(request => request.type === "friend")
    .map(request => ({ id: request.id, request }));
  return [...requests, ...notificationPlanReminders()];
}

function notificationSignature() {
  return notificationItems().map(item => item.id).join("|");
}

function unreadNotificationCount() {
  const items = notificationItems();
  if (!items.length) return 0;
  return localStorage.getItem(NOTIFICATION_SEEN_KEY) === notificationSignature() ? 0 : items.length;
}

// The bell dot is markup that ships with index.html, so the only honest way to
// hide it is to toggle a class from whatever the current list actually holds.
function refreshNotificationBadge() {
  document.querySelectorAll("[data-notifications]").forEach(button => {
    button.classList.toggle("has-unread", unreadNotificationCount() > 0);
  });
}

function openNotifications() {
  const items = notificationItems();
  const cards = items.map(item => item.request
    ? `<div class="notification-card request-notification"><b>${escapeHtml(item.request.from)} sent you a friend request</b><p>${escapeHtml(item.request.detail)}</p><small>${escapeHtml(item.request.time)}</small><div class="request-actions"><button data-accept-request="${item.request.id}">Accept</button><button data-decline-request="${item.request.id}">Decline</button></div></div>`
    : `<button class="notification-card" data-event="${item.eventId}"><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.body)}</p><small>${escapeHtml(item.meta)}</small></button>`).join("");
  const empty = `<div class="notification-empty"><b>You're all caught up</b><p>Friend requests and reminders for events you've saved or RSVP'd to will show up here.</p></div>`;
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal notification-sheet" role="dialog" aria-modal="true" aria-label="Notifications"><button class="modal-close" aria-label="Close notifications">&times;</button><p class="eyebrow">Updates</p><h2>Notifications</h2>${cards || empty}</section></div>`;
  localStorage.setItem(NOTIFICATION_SEEN_KEY, notificationSignature());
  refreshNotificationBadge();
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
  if (type === "venues") {
    openFollowedVenuesList();
    return;
  }
  const rows = type === "friends"
    ? friendDirectory.filter(friend => state.friends.has(friend[1])).map(friend => friendCard(friend)).join("")
    : type === "attended"
      ? profileReceipts().map((receipt, index) => attendanceRow(receipt, index)).join("")
    : plans.map(event => {
      return `<div class="managed-list-row managed-plan-row"><button class="managed-plan-main" data-event="${event.id}"><span><b>${event.title}</b><small>${event.time} / ${escapeHtml(eventLocationLine(event))}</small></span></button><div><button class="text-button" data-event="${event.id}">Open plan</button><button class="text-button danger-text" data-remove-plan="${event.id}">Remove plan</button></div></div>`;
    }).join("");
  const title = type === "attended" ? "Attended" : type[0].toUpperCase()+type.slice(1);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="${type} list"><button class="modal-close" aria-label="Close list">&times;</button><p class="eyebrow">Your profile</p><h2>${title}</h2><div class="managed-list">${rows || `<p class="section-helper">Nothing here yet.</p>`}</div></section></div>`;
}

function followedVenueRows(query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  const names = typeof followedVenueNames === "function" ? followedVenueNames() : [];
  const rows = names.map(name => {
    const venue = (typeof venueDirectory !== "undefined" ? venueDirectory : []).find(item => venueImageKeyName(item.name) === venueImageKeyName(name)) || { name };
    const searchText = `${venue.name || name} ${venue.neighborhood || ""} ${venue.address || ""} ${venue.venue_type || ""}`.toLowerCase();
    return { name, venue, searchText };
  }).filter(item => !normalized || item.searchText.includes(normalized));
  return rows.map(({ name, venue, searchText }) => `<div class="follow-card followed-venue-card" data-followed-venue-card data-search-text="${escapeHtml(searchText)}"><button class="followed-venue-main" data-venue-events="${escapeHtml(name)}">${venueAvatarHtml(name, "group-icon")}<span><b>${escapeHtml(venue.name || name)}</b><small>${escapeHtml([venue.neighborhood, venue.address].filter(Boolean).join(" / ") || "Venue")}</small><em>Open venue page</em></span></button><button class="follow-button selected" data-follow-venue="venue:${escapeHtml(name)}">Unfollow venue</button></div>`).join("");
}

function openFollowedVenuesList(query = "") {
  const rows = followedVenueRows(query);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet followed-venues-sheet" role="dialog" aria-modal="true" aria-label="Venues following"><button class="modal-close" aria-label="Close venues following">&times;</button><p class="eyebrow">Your profile</p><h2>Venues following</h2><label class="search-box social-search"><span>&#8981;</span><input data-followed-venue-search value="${escapeHtml(query)}" placeholder="Search venues you follow" aria-label="Search venues you follow"></label><div class="managed-list" data-followed-venue-list>${rows || `<p class="section-helper">You are not following any matching venues yet.</p>`}</div></section></div>`;
}
