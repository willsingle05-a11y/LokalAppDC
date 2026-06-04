function activityCard(initials, copy, time) {
  return `<div class="activity-card"><span class="avatar">${initials}</span><div><p>${copy}</p><span class="activity-time">${time}</span></div></div>`;
}

const friendDirectory = [
  ["AL","Ana Lopez","@analopes","8 mutual friends"],
  ["MR","Marcus Reed","@marcusdc","5 mutual friends"],
  ["JS","Jules Kim","@julesk","6 mutual friends"],
  ["DV","Dev Shah","@devaroundtown","3 mutual friends"],
  ["ET","Elena Torres","@elenaarounddc","7 mutual friends"],
  ["PL","Priya Lee","@priyaleedc","4 mutual friends"],
  ["NW","Nia Williams","@nianights","2 mutual friends"],
  ["CB","Chris Bennett","@chrisb","5 mutual friends"],
  ["SK","Sofia Kim","@sofiak","3 mutual friends"]
];

const publicGroupMeta = {
  "Skyline Social": { count: "12 members", note: "Single-event group / Friday", icon: "S", style: "run", description: "A public group for Skyline Social so interested people can coordinate before Friday." },
  "DC Run Club": { count: "1.2k members", note: "Sunday route posted", icon: "R", style: "run", description: "A public community for DC runners to find routes, meetups, and post-run plans." },
  "District Book Club": { count: "326 members", note: "Next meetup: June 8", icon: "B", style: "book", description: "A public group for upcoming reads, meetups, and book-friendly plans around DC." },
  "DC Trivia Nights": { count: "684 members", note: "Three events this week", icon: "D", style: "art", description: "A public group for finding trivia nights and building teams around the city." },
  "DC Pickleball Crew": { count: "948 members", note: "Beginner games this weekend", icon: "P", style: "run", description: "A public group for finding casual pickleball games and open courts around DC." },
  "Capital Film Club": { count: "412 members", note: "Outdoor screenings + indies", icon: "F", style: "art", description: "A public group for film screenings, festivals, and low-key movie nights around the city." },
  "Volunteer DC": { count: "2.3k members", note: "Five ways to help this week", icon: "V", style: "book", description: "A public group for finding local volunteer projects and meeting people while helping out." },
  "H Street Food Walks": { count: "537 members", note: "New tasting route posted", icon: "H", style: "art", description: "A public group for casual food walks, new openings, and neighborhood recommendations." }
};

function publicDirectoryNames() {
  return Object.keys(publicGroupMeta).filter(name => name !== "Skyline Social" && !state.joinedGroups.has(name) && !state.leftGroups.has(name));
}

function friendCard(friend, action = "profile") {
  const button = action === "add" ? `<button class="follow-button adventure-add" data-add-adventure="${friend[1]}" aria-label="Add ${friend[1]}">+</button>` : action === "group" ? `<button class="follow-button invite-added-friend" data-invite-friend="${friend[1]}">Add to group</button>` : "";
  return `<div class="follow-card friend-directory-card" data-friend-card data-search-text="${friend[1].toLowerCase()} ${friend[2].toLowerCase()}"><button class="friend-card-main" data-open-friend="${friend[1]}"><span class="avatar">${friend[0]}</span><span><b>${friend[1]}</b><small>${friend[2]}</small><em>${friend[3]}</em></span></button>${button}</div>`;
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

function groupContent() {
  const card = (name, type, detail, note, icon, style = "") => state.leftGroups.has(name) ? "" : `<button class="community-card ${state.pinnedGroups.has(name) ? "pinned" : ""}" data-group-card data-search-text="${name.toLowerCase()} ${type.toLowerCase()}" data-open-group="${name}"><span class="group-icon ${style}">${icon}</span><span><b>${name}</b><small>${type} / ${type === "Private" && state.privateGroupMembers[name] ? `${state.privateGroupMembers[name].length} members` : detail}</small><em>${state.pinnedGroups.has(name) ? "Pinned / " : ""}${note}</em></span><span class="group-access ${type === "Private" ? "private" : ""}">${type === "Private" ? "•••" : "View"}</span></button>`;
  const group = (name, type, detail, note, icon, style = "") => ({ name, type, detail, note, icon, style });
  const renderGroup = item => card(item.name, item.type, item.detail, item.note, item.icon, item.style);
  const joinedPublicGroups = Array.from(state.joinedGroups).filter(name => name !== "Skyline Social" && !state.leftGroups.has(name)).map(name => group(name,"Public",publicGroupMeta[name].count,"Joined public group",publicGroupMeta[name].icon,publicGroupMeta[name].style));
  const baseGroups = [group("Friday crew","Private","6 members","Ready to start chatting","F"), ...state.newGroups.map(item => group(item.name,item.type,"Created just now","Invite people to get started",item.name[0].toUpperCase())), group("Culture club","Private","8 members","Ready to start chatting","C","art"), group("Skyline Social","Public","12 members","Single-event group / Friday","S","run"), ...joinedPublicGroups, group("Capitol picnic crew","Private","5 members","Last active Monday","P"), group("Gallery hopping","Private","4 members","Last active May 24","G","art"), group("Sunday coffee walk","Private","7 members","Last active May 18","S","run")];
  const pinnedGroups = baseGroups.filter(item => state.pinnedGroups.has(item.name)).sort((a, b) => Number(a.type === "Public") - Number(b.type === "Public"));
  const recentGroups = baseGroups.filter(item => !state.pinnedGroups.has(item.name) && !["Capitol picnic crew","Gallery hopping","Sunday coffee walk"].includes(item.name));
  const archivedGroups = baseGroups.filter(item => ["Capitol picnic crew","Gallery hopping","Sunday coffee walk"].includes(item.name) && !state.pinnedGroups.has(item.name));
  const moreGroups = state.showAllGroups ? archivedGroups.map(renderGroup).join("") : "";
  const publicCatalog = publicDirectoryNames().slice(0, 3).map(name => { const meta = publicGroupMeta[name]; return card(name,"Public",meta.count,meta.note,meta.icon,meta.style); }).join("");
  return `<label class="search-box social-search"><span>⌕</span><input data-group-search placeholder="Search private or public groups" aria-label="Search groups"></label><p class="eyebrow">Pinned groups</p><div class="group-list">${pinnedGroups.map(renderGroup).join("") || `<p class="section-helper">Pin a group to keep it at the top.</p>`}</div><p class="eyebrow group-divider">Recent groups</p><div class="group-list">${recentGroups.map(renderGroup).join("")}${moreGroups}</div><button class="text-button view-more-groups" data-view-more-groups>${state.showAllGroups ? "Show fewer groups" : "View more groups"}</button><p class="eyebrow group-divider">Suggested public groups</p><div class="community-grid">${publicCatalog || `<p class="section-helper">You have joined all suggested public groups.</p>`}</div><button class="text-button see-more-public" data-see-more-public-groups>See more public groups</button><p class="search-empty" data-group-empty>No groups match that search.</p>`;
}

function publicDirectoryCard(name) {
  const meta = publicGroupMeta[name];
  return `<button class="community-card" data-public-directory-card data-search-text="${`${name} ${meta.description}`.toLowerCase()}" data-open-group="${name}"><span class="group-icon ${meta.style}">${meta.icon}</span><span><b>${name}</b><small>Public / ${meta.count}</small><em>${meta.note}</em></span><span class="group-access">View</span></button>`;
}

function openPublicGroupDirectory() {
  const groups = publicDirectoryNames();
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="All public groups"><button class="modal-close" aria-label="Close public groups">&times;</button><p class="eyebrow">Explore groups</p><h2>Public groups</h2><label class="search-box social-search"><span>⌕</span><input data-public-group-search placeholder="Search public groups" aria-label="Search public groups"></label><div class="community-grid public-directory">${groups.map(publicDirectoryCard).join("")}</div><p class="search-empty" data-public-group-empty>No public groups match that search.</p></section></div>`;
}

function groupMessage(message) {
  if (message.type === "event") {
    const event = events.find(item => item.id === message.eventId);
    return `<div class="message me event-message"><small>You shared an event / now</small><button class="message-event-link" data-event="${event.id}"><b>${event.title}</b><span>${event.time} / ${event.venue}</span><em>Open event →</em></button></div>`;
  }
  return `<div class="message me">${message.text}<small>You / now</small></div>`;
}

function openGroup(name) {
  const publicMeta = publicGroupMeta[name];
  const isPublic = Boolean(publicMeta);
  const members = state.privateGroupMembers[name] || ["You", "Ana Lopez", "Marcus Reed"];
  if (isPublic && !state.joinedGroups.has(name)) {
    modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal group-detail" role="dialog" aria-modal="true" aria-label="${name} preview"><button class="modal-close" aria-label="Close group preview">&times;</button><p class="eyebrow">Public group</p><h2>${name}</h2><p class="group-description">${publicMeta.description}</p><p class="lede">${publicMeta.count}</p><button class="wide-button" data-join-group="${name}">Join group</button></section></div>`;
    return;
  }
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal group-detail" role="dialog" aria-modal="true" aria-label="${name} group"><button class="modal-close" aria-label="Close group">&times;</button>
    <p class="eyebrow">${isPublic ? "Public group" : "Group"}</p><h2>${name}</h2>
    <p class="group-description">${isPublic ? publicMeta.description : "Our running thread for the next night out. Share ideas, keep tickets together, and see who is interested."}</p>
    ${isPublic ? `<p class="public-member-count">${publicMeta.count}</p>` : ""}
    ${isPublic ? "" : `<p class="eyebrow group-divider">People in this group</p><div class="private-group-members">${members.map(member => `<div class="private-group-member"><span class="avatar">${friendInitials(member)}</span><b>${member}</b></div>`).join("")}</div>`}
    <div class="group-detail-actions"><button class="secondary" data-invite data-group-name="${name}">+ Invite people</button>${isPublic ? `<button class="secondary" data-schedule>+ Schedule event</button>` : `<button class="secondary" data-share-group-event="${name}">+ Share event</button>`}</div>
    <p class="eyebrow group-divider">Messages</p><div class="message-list">${(state.groupMessages[name] || []).map(groupMessage).join("") || `<p class="message-empty">No messages yet. Share an event or start the conversation.</p>`}</div><div class="message-compose"><input data-message placeholder="Message the group" aria-label="Message the group"><button class="primary" data-send-message data-group-name="${name}">Send</button></div>
    <p class="eyebrow group-divider">Events</p><div class="interest-list"><div class="interest-event"><span><b>Skyline Social</b><small>Friday / 4 people interested</small></span><button class="text-button" data-event="4">Open</button></div><div class="interest-event"><span><b>Fresh Air Cinema</b><small>Sunday / 3 people interested</small></span><button class="text-button" data-event="8">Open</button></div></div>
    <button class="options-button" data-group-options="${name}">•••</button>
  </section></div>`;
}

function openInvite(name = "Friday crew") {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal invite-sheet" role="dialog" aria-modal="true" aria-label="Invite people"><button class="modal-close" aria-label="Close invite">&times;</button><button class="text-button" data-back-group="${name}">← Back to group</button><p class="eyebrow">Invite people</p><h2>Share ${name}.</h2><label class="settings-field">Invite URL<input value="https://lokal.app/join/${slug}" readonly></label><button class="wide-button" data-copy-invite>Copy invite link</button><label class="search-box social-search"><span>⌕</span><input data-invite-people-search data-group-name="${name}" placeholder="Search friends" aria-label="Search invite friends"></label><div class="autocomplete invite-autocomplete" data-invite-people-results hidden></div><div class="selected-group-friends" data-selected-invite-people></div></section></div>`;
}

function openCreateGroup() {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal create-sheet" role="dialog" aria-modal="true" aria-label="Create a group"><button class="modal-close" aria-label="Close group creation">&times;</button>
    <p class="eyebrow">New group</p><h2>Bring people together.</h2><p class="lede">Start a private crew or a public community.</p>
    <div class="group-type-grid"><button class="group-type selected" data-group-type="private">Private crew</button><button class="group-type" data-group-type="public">Public group</button></div>
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
        <span class="rank-copy"><span class="rank-badge">${item.badge}</span><h3>${event.title}</h3><p>${event.time} / ${event.area}</p><small>${item.note}</small></span>
        <span class="rank-score"><b>${item.score + (hyped ? 2 : 0)}</b><small>pulse</small></span>
      </button>
      <div class="rank-footer"><span>${item.trend}</span><button class="hype-button ${hyped ? "selected" : ""}" data-hype="${event.id}">${hyped ? "You're in" : "Want in"}</button></div>
    </article>`;
  }).join("")}</div>`;
}

function friendsContent() {
  const myFriends = friendDirectory.filter(friend => state.friends.has(friend[1])).slice(0, 5);
  const suggestions = friendDirectory.filter(friend => !state.friends.has(friend[1])).slice(0, 5);
  return `<label class="search-box social-search"><span>⌕</span><input data-friend-search placeholder="Search friends by name or username" aria-label="Search friends"></label>
  <p class="eyebrow">My friends</p><div class="follow-list">${myFriends.map(friend => friendCard(friend)).join("")}</div><button class="text-button see-all-friends" data-see-all-friends>See all friends</button>
  <p class="eyebrow group-divider">Find adventure partners</p><div class="follow-list">${suggestions.map(friend => friendCard(friend, "add")).join("") || `<p class="section-helper">You have added everyone suggested for now.</p>`}</div><p class="search-empty" data-friend-empty>No people match that search.</p>`;
}

function directMessageRow(name) {
  const friend = friendDirectory.find(item => item[1] === name) || ["FR", name, "@lokalfriend", ""];
  const messages = state.directMessages[name] || [];
  const latest = messages[messages.length - 1];
  return `<button class="direct-chat-row" data-open-direct-chat="${name}"><span class="avatar">${friend[0]}</span><span><b>${name}</b><small>${latest ? latest.text : "Start a conversation"}</small></span><em>›</em></button>`;
}

function openDirectInbox() {
  const names = Array.from(new Set([...Object.keys(state.directMessages), ...Array.from(state.friends)])).filter(name => state.friends.has(name));
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="Direct messages"><button class="modal-close" aria-label="Close messages">&times;</button><p class="eyebrow">Friends</p><h2>Messages</h2><div class="direct-chat-list">${names.map(directMessageRow).join("")}</div></section></div>`;
}

function openDirectChat(name) {
  const messages = state.directMessages[name] || [];
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet direct-chat-sheet" role="dialog" aria-modal="true" aria-label="${name} chat"><button class="modal-close" aria-label="Close ${name} chat">&times;</button><button class="text-button" data-direct-inbox>← All messages</button><p class="eyebrow">Direct message</p><h2>${name}</h2><div class="direct-chat-messages">${messages.map(message => `<div class="message ${message.from === "You" ? "me" : ""}">${message.text}<small>${message.from} / now</small></div>`).join("") || `<p class="message-empty">No messages yet. Start the conversation.</p>`}</div><div class="message-compose"><input data-direct-message data-friend-name="${name}" placeholder="Message ${name}" aria-label="Message ${name}"><button class="primary" data-send-direct-message="${name}">Send</button></div></section></div>`;
}

function openAllFriends() {
  const friends = friendDirectory.filter(friend => state.friends.has(friend[1]));
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal list-sheet" role="dialog" aria-modal="true" aria-label="All friends"><button class="modal-close" aria-label="Close all friends">&times;</button><p class="eyebrow">Friends</p><h2>All friends</h2><div class="follow-list">${friends.map(friend => friendCard(friend)).join("")}</div></section></div>`;
}

function openFriend(name) {
  const profile = { "Ana Lopez": ["AL","@analopes","New to DC / Live music + food"], "Marcus Reed": ["MR","@marcusdc","DC local / Fitness + markets"], "Dev Shah": ["DV","@devaroundtown","Exploring DC / Art + film"], "Jules Kim": ["JS","@julesk","DC local / Music + nightlife"], "Priya Lee": ["PL","@priyaleedc","New to DC / Food + art"] }[name] || ["FR","@lokalfriend","Washington, DC"];
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal friend-profile" role="dialog" aria-modal="true" aria-label="${name} profile"><button class="modal-close" aria-label="Close friend profile">&times;</button>
    <div class="friend-profile-head"><div class="profile-avatar">${profile[0]}</div><div><p class="eyebrow">Friend profile</p><h2>${name}</h2><p>${profile[1]} / ${profile[2]}</p></div></div>
    <div class="friend-profile-actions"><button class="secondary" data-message-friend="${name}">Message</button><button class="secondary" data-invite-friend="${name}">Invite to group</button></div>
    <p class="eyebrow">Recently went to</p><div class="friend-feed"><div class="friend-feed-card"><div class="date-block">May<b>24</b></div><div><h3>Flashband at Songbyrd</h3><p>Live music / Adams Morgan / with 3 friends</p></div></div><div class="friend-feed-card"><div class="date-block">May<b>18</b></div><div><h3>Open Streets DC</h3><p>Community / Shaw</p></div></div></div>
    <p class="eyebrow group-divider">Saved for later</p><div class="interest-list"><div class="interest-event"><span><b>Skyline Social</b><small>Friday / Viceroy Rooftop</small></span><button class="text-button" data-event="4">Open</button></div><div class="interest-event"><span><b>Fresh Air Cinema</b><small>Sunday / Alethia Tanner Park</small></span><button class="text-button" data-event="8">Open</button></div></div>
  </section></div>`;
}

function followingContent() {
  const accounts = [["songbyrd","S","Songbyrd Music House","Venue","Concerts, DJ nights, and neighborhood picks"],["dcafterdark","D","@dcafterdark","Local curator","Late-night lists and weekend roundups"],["runclub","R","DC Run Club","Public group","Routes, meetups, and post-run coffee"],["smithsonian","M","Smithsonian After Hours","Venue collection","Museum events worth planning around"],["eaterdc","E","@eater_dc","Food curator","Pop-ups, openings, and neighborhood food guides"]];
  return `<div class="ranking-intro"><p class="eyebrow">Public following</p><h2>Your local feed</h2><p>Follow venues, public groups, and curators to shape what shows up in Discover.</p></div>
  <div class="follow-list">${accounts.map(account => { const followed = state.follows.has(account[0]); return `<div class="follow-card"><span class="group-icon">${account[1]}</span><span><b>${account[2]}</b><small>${account[3]}</small><em>${account[4]}</em></span><button class="follow-button ${followed ? "selected" : ""}" data-follow="${account[0]}">${followed ? "Following" : "Follow"}</button></div>`; }).join("")}</div>`;
}

function renderSocial() {
  const socialContent = state.socialTab === "friends" ? friendsContent() : groupContent();
  const isFriends = state.socialTab === "friends";
  app.innerHTML = `<section class="page">
    <p class="eyebrow">Social</p><div class="social-title-row"><h1>${isFriends ? "Friends" : "Groups"}</h1>${isFriends ? `<button class="dm-inbox-button" data-direct-inbox aria-label="Open direct messages">✎</button>` : ""}</div><p class="lede">${isFriends ? "Find people you know and open their profile before adding them." : "Keep event chats, friend crews, and public communities in one place."}</p>
    ${isFriends ? "" : `<button class="wide-button" data-create-group>+ Create a group</button>`}
    <div class="tabs social-tabs"><button class="tab-button ${state.socialTab === "groups" ? "active" : ""}" data-social-tab="groups">Groups</button><button class="tab-button ${state.socialTab === "friends" ? "active" : ""}" data-social-tab="friends">Friends</button></div>
    <section class="section" id="social-content">${socialContent}</section>
  </section>`;
}


