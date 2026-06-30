function activityCard(initials, copy, time) {
  return `<div class="activity-card"><span class="avatar">${initials}</span><div><p>${copy}</p><span class="activity-time">${time}</span></div></div>`;
}

let friendDirectory = demoProfileSeeds.map(profileToFriendRow);

const publicGroupMeta = {
  "Skyline Social": { count: "12 members", note: "Single-event group / Friday", icon: "S", style: "run", description: "A public group for Skyline Social so interested people can coordinate before Friday." },
  "District Book Club": { count: "326 members", note: "Next meetup: June 8", icon: "B", style: "book", description: "A public group for upcoming reads, meetups, and book-friendly plans around DC." },
  "DC Trivia Nights": { count: "684 members", note: "Three events this week", icon: "D", style: "art", description: "A public group for finding trivia nights and building teams around the city." },
  "DC Pickleball Crew": { count: "948 members", note: "Beginner games this weekend", icon: "P", style: "run", description: "A public group for finding casual pickleball games and open courts around DC." },
  "Capital Film Club": { count: "412 members", note: "Outdoor screenings + indies", icon: "F", style: "art", description: "A public group for film screenings, festivals, and low-key movie nights around the city." },
  "Volunteer DC": { count: "2.3k members", note: "Five ways to help this week", icon: "V", style: "book", description: "A public group for finding local volunteer projects and meeting people while helping out." },
  "H Street Food Walks": { count: "537 members", note: "New tasting route posted", icon: "H", style: "art", description: "A public group for casual food walks, new openings, and neighborhood recommendations." }
};

const groupCategoryHints = {
  "District Book Club": ["community"],
  "DC Trivia Nights": ["nightlife", "community"],
  "DC Pickleball Crew": ["sports", "fitness"],
  "Capital Film Club": ["performing-arts"],
  "Volunteer DC": ["community"],
  "H Street Food Walks": ["festivals", "nightlife"],
  "Culture club": ["performing-arts", "museums"],
  "Gallery hopping": ["performing-arts", "museums"],
  "Sunday coffee walk": ["community", "festivals"],
  "Skyline Social": ["nightlife"],
  "Friday crew": ["nightlife", "concerts"],
  "Capitol picnic crew": ["community", "festivals"]
};

function publicDirectoryNames() {
  return Object.keys(publicGroupMeta).filter(name => name !== "Skyline Social" && !state.joinedGroups.has(name) && !state.leftGroups.has(name));
}

function groupRecord(name) {
  return state.newGroups.find(group => group.name === name) || null;
}

function groupTypeLabel(name) {
  const record = groupRecord(name);
  if (publicGroupMeta[name] || record?.type === "Public") return "Public";
  if (record?.type === "Event chat") return "Event chat";
  return "Private";
}

function groupMeta(name) {
  return publicGroupMeta[name] || null;
}

function friendCard(friend, action = "profile") {
  const button = action === "add" ? `<button class="follow-button adventure-add" data-add-adventure="${friend[1]}" aria-label="Add ${friend[1]}">+</button>` : action === "group" ? `<button class="follow-button invite-added-friend" data-invite-friend="${friend[1]}">Add to group</button>` : "";
  return `<div class="follow-card friend-directory-card" data-friend-card data-search-text="${friend[1].toLowerCase()} ${friend[2].toLowerCase()} ${String(friend[4] || "").toLowerCase()}"><button class="friend-card-main" data-open-friend="${friend[1]}"><span class="avatar">${friend[0]}</span><span><b>${friend[1]}</b><small>${friend[2]}</small><em>${friend[3]}</em></span></button>${button}</div>`;
}

function userGroupNames() {
  return ["Friday crew", "Culture club", ...Array.from(state.joinedGroups), ...state.newGroups.map(group => group.name)].filter((name, index, groups) => !state.leftGroups.has(name) && groups.indexOf(name) === index);
}

function friendInitials(name) {
  if (name === "You") return "JM";
  return friendDirectory.find(friend => friend[1] === name)?.[0] || name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function addFriendToPrivateGroup(group, name) {
  if (!state.privateGroupMembers[group]) state.privateGroupMembers[group] = ["You"];
  if (!state.privateGroupMembers[group].includes(name)) state.privateGroupMembers[group].push(name);
}

function removeGroupMembership(name) {
  state.leftGroups.add(name);
  state.joinedGroups.delete(name);
  state.pinnedGroups.delete(name);
  state.newGroups = state.newGroups.filter(group => group.name !== name);
}

function groupSuggestedEvents(name, limit = 4) {
  const hints = groupCategoryHints[name] || [];
  const nameText = name.toLowerCase();
  const scored = events.map(event => {
    const text = `${event.title} ${event.venue} ${event.area} ${event.cat} ${event.tag} ${eventTags(event).join(" ")}`.toLowerCase();
    let score = 0;
    if (hints.includes(event.cat)) score += 6;
    if (nameText.includes("run") && /run|fitness|wellness|yoga/.test(text)) score += 8;
    if (nameText.includes("film") && /film|cinema|movie|screening/.test(text)) score += 8;
    if (nameText.includes("food") && /food|market|restaurant|chef|brunch|wine|cocktail/.test(text)) score += 8;
    if (nameText.includes("trivia") && /trivia|bar|nightlife|pub/.test(text)) score += 8;
    if (nameText.includes("gallery") && /gallery|museum|exhibit|art/.test(text)) score += 8;
    if (nameText.includes("culture") && /museum|theater|theatre|film|gallery|comedy|performance/.test(text)) score += 7;
    if (nameText.includes("skyline") && /rooftop|nightlife|cocktail|party/.test(text)) score += 8;
    if (nameText.includes("coffee") && /coffee|morning|market|walk|community/.test(text)) score += 7;
    return { event, score };
  }).filter(item => item.score > 0);
  const fallback = events.filter(event => matchesFilter(event, "all")).slice(0, limit);
  const ranked = scored.sort((a, b) => b.score - a.score || sortEventsByStart(a.event, b.event)).map(item => item.event);
  return [...ranked, ...fallback]
    .filter((event, index, all) => all.findIndex(item => item.id === event.id) === index)
    .slice(0, limit);
}

function groupEventList(name) {
  const suggested = groupSuggestedEvents(name);
  return suggested.map(event => `<div class="interest-event"><span><b>${escapeHtml(event.title)}</b><small>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</small></span><button class="text-button" data-event="${event.id}">Open</button></div>`).join("") || `<p class="section-helper">No matching events yet.</p>`;
}

function groupSharePicker(name) {
  const suggested = groupSuggestedEvents(name, 6);
  return suggested.map(event => `<button class="interest-event" data-send-event="${event.id}" data-group-name="${escapeHtml(name)}"><span><b>${escapeHtml(event.title)}</b><small>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</small></span></button>`).join("") || `<p class="section-helper">No matching events yet.</p>`;
}

function currentUserName() {
  return state.profile.fullName || "Jordan Miller";
}

function acceptFriendship(name) {
  const you = currentUserName();
  state.friends.add(name);
  if (!state.friendConnections[you]) state.friendConnections[you] = [];
  if (!state.friendConnections[name]) state.friendConnections[name] = [];
  if (!state.friendConnections[you].includes(name)) state.friendConnections[you].push(name);
  if (!state.friendConnections[name].includes(you)) state.friendConnections[name].push(you);
}

function groupContent() {
  const card = (name, type, detail, note, icon, style = "") => {
    if (state.leftGroups.has(name)) return "";
    const suggestions = groupSuggestedEvents(name, 2);
    const chips = suggestions.map(event => primaryEventTag(event)).filter(Boolean).slice(0, 2);
    return `<button class="community-card ${state.pinnedGroups.has(name) ? "pinned" : ""}" data-group-card data-search-text="${`${name} ${type} ${detail} ${note} ${chips.join(" ")}`.toLowerCase()}" data-open-group="${name}"><span class="group-icon ${style}">${icon}</span><span><b>${name}</b><small>${type} / ${type === "Private" && state.privateGroupMembers[name] ? `${state.privateGroupMembers[name].length} members` : detail}</small><em>${state.pinnedGroups.has(name) ? "Pinned / " : ""}${note}</em><span class="group-mini-tags">${chips.map(tag => `<i>${escapeHtml(tag)}</i>`).join("")}</span></span><span class="group-access ${type === "Private" ? "private" : ""}">${type === "Private" ? "Chat" : type === "Event chat" ? "Plan" : "View"}</span></button>`;
  };
  const group = (name, type, detail, note, icon, style = "") => ({ name, type, detail, note, icon, style });
  const renderGroup = item => card(item.name, item.type, item.detail, item.note, item.icon, item.style);
  const joinedPublicGroups = Array.from(state.joinedGroups).filter(name => name !== "Skyline Social" && !state.leftGroups.has(name) && publicGroupMeta[name]).map(name => group(name,"Public",publicGroupMeta[name].count,"Joined public group",publicGroupMeta[name].icon,publicGroupMeta[name].style));
  const baseGroups = [group("Friday crew","Private","6 members","Ready to start chatting","F"), ...state.newGroups.map(item => group(item.name,item.type,item.type === "Public" ? "1 member" : "Created just now",item.type === "Event chat" ? "Attach an event and invite people" : "Invite people to get started",item.name[0].toUpperCase())), group("Culture club","Private","8 members","Ready to start chatting","C","art"), group("Skyline Social","Public","12 members","Single-event group / Friday","S","run"), ...joinedPublicGroups, group("Capitol picnic crew","Private","5 members","Last active Monday","P"), group("Gallery hopping","Private","4 members","Last active May 24","G","art"), group("Sunday coffee walk","Private","7 members","Last active May 18","S","run")];
  const pinnedGroups = baseGroups.filter(item => state.pinnedGroups.has(item.name)).sort((a, b) => Number(a.type === "Public") - Number(b.type === "Public"));
  const recentGroups = baseGroups.filter(item => !state.pinnedGroups.has(item.name) && !["Capitol picnic crew","Gallery hopping","Sunday coffee walk"].includes(item.name));
  const archivedGroups = baseGroups.filter(item => ["Capitol picnic crew","Gallery hopping","Sunday coffee walk"].includes(item.name) && !state.pinnedGroups.has(item.name));
  const moreGroups = state.showAllGroups ? archivedGroups.map(renderGroup).join("") : "";
  const publicCatalog = publicDirectoryNames().slice(0, 3).map(name => { const meta = publicGroupMeta[name]; return card(name,"Public",meta.count,meta.note,meta.icon,meta.style); }).join("");
  return `<label class="search-box social-search"><span>&#8981;</span><input data-group-search placeholder="Search private or public groups" aria-label="Search groups"></label><p class="eyebrow">Pinned groups</p><div class="group-list">${pinnedGroups.map(renderGroup).join("") || `<p class="section-helper">Pin a group to keep it at the top.</p>`}</div><p class="eyebrow group-divider">Recent groups</p><div class="group-list">${recentGroups.map(renderGroup).join("")}${moreGroups}</div><button class="text-button view-more-groups" data-view-more-groups>${state.showAllGroups ? "Show fewer groups" : "View more groups"}</button><p class="eyebrow group-divider">Suggested public groups</p><div class="community-grid">${publicCatalog || `<p class="section-helper">You have joined all suggested public groups.</p>`}</div><button class="text-button see-more-public" data-see-more-public-groups>See more public groups</button><p class="search-empty" data-group-empty>No groups match that search.</p>`;
}

function publicDirectoryCard(name) {
  const meta = publicGroupMeta[name];
  return `<button class="community-card" data-public-directory-card data-search-text="${`${name} ${meta.description}`.toLowerCase()}" data-open-group="${name}"><span class="group-icon ${meta.style}">${meta.icon}</span><span><b>${name}</b><small>Public / ${meta.count}</small><em>${meta.note}</em></span><span class="group-access">View</span></button>`;
}

function openPublicGroupDirectory() {
  const groups = publicDirectoryNames();
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="All public groups"><button class="modal-close" aria-label="Close public groups">&times;</button><p class="eyebrow">Explore groups</p><h2>Public groups</h2><label class="search-box social-search"><span>&#8981;</span><input data-public-group-search placeholder="Search public groups" aria-label="Search public groups"></label><div class="community-grid public-directory">${groups.map(publicDirectoryCard).join("")}</div><p class="search-empty" data-public-group-empty>No public groups match that search.</p></section></div>`;
}

function groupMessage(message) {
  if (message.type === "event") {
    const event = events.find(item => item.id === message.eventId);
    return `<div class="message me event-message"><small>You shared an event / now</small><button class="message-event-link" data-event="${event.id}"><b>${event.title}</b><span>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</span><em>Open event &rarr;</em></button></div>`;
  }
  return `<div class="message me">${message.text}<small>You / now</small></div>`;
}

function openGroup(name) {
  const publicMeta = publicGroupMeta[name];
  const record = groupRecord(name);
  const type = groupTypeLabel(name);
  const isPublic = type === "Public";
  const isEventChat = type === "Event chat";
  const members = state.privateGroupMembers[name] || ["You", "Ana Lopez", "Marcus Reed"];
  const description = publicMeta?.description || (isEventChat ? "A single-plan thread for deciding who is going, sharing tickets, and keeping the event details in one place." : "A group thread for choosing plans, sharing events, and coordinating with people you know.");
  const count = publicMeta?.count || (isPublic ? "1 member" : `${members.length} members`);
  const eventList = groupEventList(name);
  if (isPublic && !state.joinedGroups.has(name) && !record) {
    modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal group-detail" role="dialog" aria-modal="true" aria-label="${name} preview"><button class="modal-close" aria-label="Close group preview">&times;</button><p class="eyebrow">Public group</p><h2>${name}</h2><p class="group-description">${description}</p><p class="lede">${count}</p><p class="eyebrow group-divider">Upcoming in this group</p><div class="interest-list">${eventList}</div><button class="wide-button" data-join-group="${name}">Join group</button></section></div>`;
    return;
  }
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal group-detail" role="dialog" aria-modal="true" aria-label="${name} group"><button class="modal-close" aria-label="Close group">&times;</button>
    <p class="eyebrow">${isPublic ? "Public group" : isEventChat ? "Event chat" : "Private group"}</p><h2>${name}</h2>
    <p class="group-description">${description}</p>
    <p class="public-member-count">${count}</p>
    ${isPublic ? "" : `<p class="eyebrow group-divider">People in this group</p><div class="private-group-members">${members.map(member => `<div class="private-group-member"><span class="avatar">${friendInitials(member)}</span><b>${member}</b></div>`).join("")}</div>`}
    <div class="group-detail-actions"><button class="secondary" data-invite data-group-name="${name}">+ Invite people</button><button class="secondary" data-share-group-event="${name}">+ Share event</button></div>
    <p class="eyebrow group-divider">Messages</p><div class="message-list">${(state.groupMessages[name] || []).map(groupMessage).join("") || `<p class="message-empty">No messages yet. Share an event or start the conversation.</p>`}</div><div class="message-compose"><input data-message placeholder="Message the group" aria-label="Message the group"><button class="primary" data-send-message data-group-name="${name}">Send</button></div>
    <p class="eyebrow group-divider">${isEventChat ? "Plan options" : "Suggested events"}</p><div class="interest-list">${eventList}</div>
    <button class="options-button" data-group-options="${name}">&bull;&bull;&bull;</button>
  </section></div>`;
}

function openInvite(name = "Friday crew") {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal invite-sheet" role="dialog" aria-modal="true" aria-label="Invite people"><button class="modal-close" aria-label="Close invite">&times;</button><button class="text-button" data-back-group="${name}">&larr; Back to group</button><p class="eyebrow">Invite people</p><h2>Share ${name}.</h2><label class="settings-field">Invite URL<input value="https://lokal.app/join/${slug}" readonly></label><button class="wide-button" data-copy-invite>Copy invite link</button><label class="search-box social-search"><span>&#8981;</span><input data-invite-people-search data-group-name="${name}" placeholder="Search friends" aria-label="Search invite friends"></label><div class="autocomplete invite-autocomplete" data-invite-people-results hidden></div><div class="selected-group-friends" data-selected-invite-people></div></section></div>`;
}

function openCreateGroup() {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal create-sheet" role="dialog" aria-modal="true" aria-label="Create a group"><button class="modal-close" aria-label="Close group creation">&times;</button>
    <p class="eyebrow">New group</p><h2>Bring people together.</h2><p class="lede">Start a private crew or a public community.</p>
    <div class="group-type-grid"><button class="group-type selected" data-group-type="private">Private crew</button><button class="group-type" data-group-type="event">Event chat</button><button class="group-type" data-group-type="public">Public group</button></div>
    <input data-group-name placeholder="Group name" aria-label="Group name"><input data-create-friends placeholder="Add friends" aria-label="Add group friends"><div class="autocomplete" data-autocomplete hidden></div><div class="selected-group-friends" data-selected-group-friends></div>
    <button class="wide-button" data-save-group>Create group</button>
  </section></div>`;
}

function rankingContent() {
  const ranking = [
    { id: 4, score: 94, trend: "+12 this week", note: "3 friends are going", badge: "Friday favorite" },
    { id: 8, score: 86, trend: "+8 this week", note: "Ana + Dev saved it", badge: "Free pick" },
    { id: 3, score: 79, trend: "+6 this week", note: "2 friends are going", badge: "Neighborhood buzz" },
    { id: 7, score: 71, trend: "+4 this week", note: "Jules saved it", badge: "Rising" }
  ];
  return `<div class="ranking-intro"><p class="eyebrow">Your circle's pulse</p><h2>Trending with friends</h2><p>Ranked by saves, RSVPs, and the plans your groups keep talking about.</p></div>
  <div class="ranking-list">${ranking.map((item, index) => {
    const event = events.find(e => e.id === item.id);
    const hyped = state.hype.has(item.id);
    return `<article class="ranking-card">
      <button class="rank-main" data-event="${event.id}">
        <span class="rank-number">${index + 1}</span>
        <span class="rank-copy"><span class="rank-badge">${item.badge}</span><h3>${event.title}</h3><p>${event.time} / ${escapeHtml(eventLocationLine(event))}</p><small>${item.note}</small></span>
        <span class="rank-score"><b>${item.score + (hyped ? 2 : 0)}</b><small>pulse</small></span>
      </button>
      <div class="rank-footer"><span>${item.trend}</span><button class="hype-button ${hyped ? "selected" : ""}" data-hype="${event.id}">${hyped ? "You're in" : "Want in"}</button></div>
    </article>`;
  }).join("")}</div>`;
}

function friendsContent() {
  const myFriends = friendDirectory.filter(friend => state.friends.has(friend[1])).slice(0, 5);
  const suggestions = friendDirectory.filter(friend => !state.friends.has(friend[1])).slice(0, 5);
  return `<label class="search-box social-search"><span>&#8981;</span><input data-friend-search placeholder="Search friends by name or username" aria-label="Search friends"></label>
  <p class="eyebrow">My friends</p><div class="follow-list">${myFriends.map(friend => friendCard(friend)).join("")}</div><button class="text-button see-all-friends" data-see-all-friends>See all friends</button>
  <p class="eyebrow group-divider">Find adventure partners</p><div class="follow-list">${suggestions.map(friend => friendCard(friend, "add")).join("") || `<p class="section-helper">You have added everyone suggested for now.</p>`}</div><p class="search-empty" data-friend-empty>No people match that search.</p>`;
}

function directMessageRow(name) {
  const friend = friendDirectory.find(item => item[1] === name) || ["FR", name, "@lokalfriend", ""];
  const messages = state.directMessages[name] || [];
  const latest = messages[messages.length - 1];
  return `<button class="direct-chat-row" data-open-direct-chat="${name}"><span class="avatar">${friend[0]}</span><span><b>${name}</b><small>${latest ? latest.text : "Start a conversation"}</small></span><em>&rsaquo;</em></button>`;
}

function openDirectInbox() {
  const names = Array.from(new Set([...Object.keys(state.directMessages), ...Array.from(state.friends)])).filter(name => state.friends.has(name));
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Direct messages"><button class="modal-close" aria-label="Close messages">&times;</button><p class="eyebrow">Friends</p><h2>Messages</h2><div class="direct-chat-list">${names.map(directMessageRow).join("")}</div></section></div>`;
}

function openDirectChat(name) {
  const messages = state.directMessages[name] || [];
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet direct-chat-sheet" role="dialog" aria-modal="true" aria-label="${name} chat"><button class="modal-close" aria-label="Close ${name} chat">&times;</button><button class="text-button" data-direct-inbox>&larr; All messages</button><p class="eyebrow">Direct message</p><h2>${name}</h2><div class="direct-chat-messages">${messages.map(message => `<div class="message ${message.from === "You" ? "me" : ""}">${message.text}<small>${message.from} / now</small></div>`).join("") || `<p class="message-empty">No messages yet. Start the conversation.</p>`}</div><div class="message-compose"><input data-direct-message data-friend-name="${name}" placeholder="Message ${name}" aria-label="Message ${name}"><button class="primary" data-send-direct-message="${name}">Send</button></div></section></div>`;
}

function openAllFriends() {
  const friends = friendDirectory.filter(friend => state.friends.has(friend[1]));
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="All friends"><button class="modal-close" aria-label="Close all friends">&times;</button><p class="eyebrow">Friends</p><h2>All friends</h2><div class="follow-list">${friends.map(friend => friendCard(friend)).join("")}</div></section></div>`;
}

function followingContent() {
  const accounts = [["songbyrd","S","Songbyrd Music House","Venue","Concerts, DJ nights, and neighborhood picks"],["dcafterdark","D","@dcafterdark","Local curator","Late-night lists and weekend roundups"],["smithsonian","M","Smithsonian After Hours","Venue collection","Museum events worth planning around"],["eaterdc","E","@eater_dc","Food curator","Pop-ups, openings, and neighborhood food guides"]];
  return `<div class="ranking-intro"><p class="eyebrow">Public following</p><h2>Your local feed</h2><p>Follow venues, public groups, and curators to shape what shows up in Discover.</p></div>
  <div class="follow-list">${accounts.map(account => { const followed = state.follows.has(account[0]); return `<div class="follow-card"><span class="group-icon">${account[1]}</span><span><b>${account[2]}</b><small>${account[3]}</small><em>${account[4]}</em></span><button class="follow-button ${followed ? "selected" : ""}" data-follow="${account[0]}">${followed ? "Following" : "Follow"}</button></div>`; }).join("")}</div>`;
}

function personalizedEvents(limit = 3) {
  const tastes = (state.tastes || []).map(taste => taste.toLowerCase());
  const cats = (state.tastes || []).map(taste => typeof categoryFromTaste === "function" ? categoryFromTaste(taste) : "").filter(Boolean);
  const pool = displayableDcEvents().filter(event => matchesFilter(event, "all", false));
  const scored = pool.map(event => {
    const text = `${event.cat} ${eventTags(event).join(" ")} ${event.title}`.toLowerCase();
    let score = 0;
    cats.forEach(category => { if (event.cat === category) score += 4; });
    tastes.forEach(taste => { if (taste && text.includes(taste)) score += 2; });
    return { event, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || sortEventsByStart(a.event, b.event));
  // collapse recurring occurrences so a single event isn't recommended repeatedly
  return dedupeFeedEvents([...scored.map(item => item.event), ...pool]
    .filter((event, index, all) => all.findIndex(item => item.id === event.id) === index))
    .slice(0, limit);
}

function personalizedSection() {
  const picks = personalizedEvents(3);
  if (!picks.length) return "";
  return `<section class="section saved-plans-section personalized-block"><div class="section-heading"><div><p class="eyebrow personalized-eyebrow">Personalized for you</p><h2>Picked for your tastes</h2></div></div><div class="event-stack personalized-list">${picks.map(event => eventRow(event)).join("")}</div></section>`;
}

function savedSuggestionRail() {
  const picks = personalizedEvents(3);
  if (!picks.length) return "";
  return `<div class="saved-suggestion-rail">${picks.map(event => eventRow(event, "suggestion", { showBadge: false })).join("")}</div>`;
}

function openFollowingManager() {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Manage following"><button class="modal-close" aria-label="Close following">&times;</button>${followingContent()}</section></div>`;
}

function savedEmptyState() {
  return `<div class="saved-empty">
    <div class="saved-empty-icon" aria-hidden="true">&#128197;</div>
    <h3>Nothing saved yet</h3>
    <p>Browse Discover and tap the heart on anything that catches your eye.</p>
    <button class="explore-cta saved-empty-cta" data-route="home">Browse events</button>
  </div>`;
}

function combinedPlannerList(plans) {
  if (!plans.length) return savedEmptyState();
  return `<div class="planner-list">${plans.map(event => {
    const status = state.rsvps.has(event.id) ? "RSVP" : "Saved";
    return `<article class="planner-card planner-${event.cat}">
    <button class="planner-main" data-event="${event.id}"><span class="planner-dot ${event.cat}"></span><span><b>${escapeHtml(event.title)}</b><small>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</small></span></button>
    <div class="planner-actions"><span>${status}</span><button class="text-button" data-share="${event.id}">Share</button></div>
  </article>`;
  }).join("")}</div>`;
}

function renderSocial() {
  const allPlans = savedPlannerEvents("all");
  app.innerHTML = `<section class="page">
    <div class="discover-heading"><div><h1>Your Plans</h1></div></div>
    <section class="section suggested-saved-section"><div class="section-heading"><div><p class="eyebrow">Suggested for you</p><h2>Top 3</h2></div></div>${savedSuggestionRail()}</section>
    <section class="section planner-calendar-section"><div class="section-heading"><div><p class="eyebrow">This week</p><h2>Your Plans</h2></div></div>${plannerCalendar(allPlans)}</section>
    <section class="section saved-plans-section"><div class="section-heading"><div><h2>Your Plans</h2></div></div>${combinedPlannerList(allPlans)}</section>
    <button class="explore-cta" data-route="home">Explore events &rarr;</button>
  </section>`;
}

function savedPlannerEvents(mode = "all") {
  const savedIds = state.saved || new Set();
  const rsvpIds = state.rsvps || new Set();
  return events
    .filter(event => !state.removedPlans?.has(event.id))
    .filter(event => mode === "saved" ? savedIds.has(event.id) : mode === "rsvp" ? rsvpIds.has(event.id) : savedIds.has(event.id) || rsvpIds.has(event.id))
    .sort(sortEventsByStart);
}

function plannerList(plans, emptyText, statusLabel) {
  if (!plans.length) return `<p class="section-helper empty-planner">${emptyText}</p>`;
  return `<div class="planner-list">${plans.map(event => `<article class="planner-card planner-${event.cat}">
    <button class="planner-main" data-event="${event.id}"><span class="planner-dot ${event.cat}"></span><span><b>${escapeHtml(event.title)}</b><small>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</small></span></button>
    <div class="planner-actions"><span>${statusLabel}</span><button class="text-button" data-share="${event.id}">Share</button></div>
  </article>`).join("")}</div>`;
}

function plannerCalendar(plans) {
  if (!plans.length) return `<p class="section-helper empty-planner">Save or RSVP to an event and it will appear in Your Plans.</p>`;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + state.plannerWeekOffset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const weekLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const days = [];
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const iso = date.toISOString().slice(0, 10);
    const dayPlans = plans.filter(event => eventDateValue(event)?.toISOString().slice(0, 10) === iso);
    days.push({ date: new Date(date), iso, plans: dayPlans });
  }
  return `<div class="planner-week-controls"><button class="secondary" data-planner-week="-1">Previous week</button><span>${escapeHtml(weekLabel)}</span><button class="secondary" data-planner-week="1">Next week</button></div>
  <div class="planner-legend">${["concerts","live-music","happy-hours","trivia-nights","nightlife","performing-arts","museums","sports","festivals","community","expos"].map(cat => `<span><i class="${cat}"></i>${escapeHtml(discoverCategoryLabel(cat))}</span>`).join("")}</div>
  <div class="planner-calendar">${days.map(day => {
    const label = day.date.toLocaleDateString("en-US", { weekday: "short" });
    return `<article class="planner-day ${day.plans.length ? "" : "empty"}">
      <div class="planner-day-head"><span>${label}</span><b>${day.date.getDate()}</b></div>
      <div class="planner-day-events">${day.plans.length ? day.plans.map(event => `<button class="planner-day-event planner-${event.cat}" data-event="${event.id}"><i class="${event.cat}"></i><span><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</small></span></button>`).join("") : `<button class="day-explore" data-day-explore="${day.iso}">Explore &rarr;</button>`}</div>
    </article>`;
  }).join("")}</div>`;
}

function openCalendarPlans(iso) {
  const plans = savedPlannerEvents("all").filter(event => eventDateValue(event)?.toISOString().slice(0, 10) === iso);
  if (plans.length === 1) {
    openDetail(plans[0].id);
    return;
  }
  const date = new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Plans for ${date}"><button class="modal-close" aria-label="Close plans">&times;</button><p class="eyebrow">Your Plans</p><h2>${escapeHtml(date)}</h2><p class="lede">Choose an event to view the details.</p><div class="planner-list">${plans.map(event => `<article class="planner-card planner-${event.cat}"><button class="planner-main" data-event="${event.id}"><span class="planner-dot ${event.cat}"></span><span><b>${escapeHtml(event.title)}</b><small>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</small></span></button></article>`).join("")}</div></section></div>`;
}

function friendInterestEvents(name, limit = 4) {
  const profile = friendDirectory.find(friend => friend[1] === name);
  const seed = `${name} ${profile?.[4] || ""}`.toLowerCase();
  const preferred = events.filter(event => {
    const text = `${event.title} ${event.venue} ${event.area} ${event.cat} ${event.tag} ${eventTags(event).join(" ")}`.toLowerCase();
    if (/ana|priya|jules/.test(seed)) return /concert|music|museum|art|gallery|food|market|nightlife/.test(text);
    if (/marcus|dev/.test(seed)) return /sports|run|fitness|nightlife|concert|food/.test(text);
    if (/elena|sofia|nia/.test(seed)) return /museum|arts|comedy|food|festival|community/.test(text);
    return /concert|food|museum|nightlife/.test(text);
  });
  return [...preferred, ...events].filter((event, index, all) => all.findIndex(item => item.id === event.id) === index).sort(sortEventsByStart).slice(0, limit);
}

function openFriend(name) {
  const profile = friendDirectory.find(friend => friend[1] === name) || ["FR", name, "@lokalfriend", "0 mutual friends", "Washington, DC"];
  const isFriend = state.friends.has(name);
  const theirEvents = friendInterestEvents(name);
  const tastes = theirEvents.flatMap(eventTags).filter((tag, index, all) => all.findIndex(item => item.toLowerCase() === tag.toLowerCase()) === index).slice(0, 5);
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal friend-profile" role="dialog" aria-modal="true" aria-label="${name} profile"><button class="modal-close" aria-label="Close friend profile">&times;</button>
    <div class="friend-profile-head"><div class="profile-avatar">${profile[0]}</div><div><p class="eyebrow">${isFriend ? "Friend profile" : "Profile preview"}</p><h2>${escapeHtml(name)}</h2><p>${escapeHtml(profile[2])} / ${escapeHtml(profile[4] || "Washington, DC")}</p></div></div>
    <div class="friendship-status ${isFriend ? "" : "pending"}"><b>${isFriend ? "Friends" : "Not friends yet"}</b><p>${isFriend ? `${name} shares event interests with you.` : "Add them to see more profile activity in a full app."}</p></div>
    <div class="friend-profile-actions"><button class="secondary" data-share-profile="${name}">Share profile</button></div>
    <p class="eyebrow">Interested in</p><div class="chips profile-taste-chips">${tastes.map(taste => `<span class="chip active">${escapeHtml(taste)}</span>`).join("")}</div>
    <p class="eyebrow group-divider">Events on their radar</p><div class="interest-list">${theirEvents.map(event => `<div class="interest-event"><span><b>${escapeHtml(event.title)}</b><small>${escapeHtml(event.time)} / ${escapeHtml(eventLocationLine(event))}</small></span><button class="text-button" data-event="${event.id}">Open</button></div>`).join("")}</div>
  </section></div>`;
}

