document.addEventListener("click", async event => {
  if (event.target.classList.contains("modal-backdrop")) { modalRoot.innerHTML = ""; return; }
  const t = event.target.closest("button");
  if (!t) return;
  let handled = t.classList.contains("modal-close") || Object.keys(t.dataset).length > 0;
  const mark = () => { handled = true; };
  if (t.dataset.route) { mark(); state.discoverCategoryView = ""; state.discoverGenreFilter = ""; state.neighborhoodFilter = ""; state.openFilterSheet = ""; state.feedShown = 10; setRoute(t.dataset.route); }
  if (t.dataset.homeFilter) { state.discoverCategoryView = ""; state.discoverGenreFilter = ""; state.openFilterSheet = ""; state.feedShown = 10; state.homeFilter = t.dataset.homeFilter; if (!["all", "free"].includes(state.homeFilter)) state.filter.category = "All categories"; renderHome(); }
  if (t.dataset.openFilter !== undefined) { mark(); state.openFilterSheet = state.openFilterSheet === t.dataset.openFilter ? "" : t.dataset.openFilter; renderHome(); }
  if (t.dataset.toggleWhat !== undefined) { mark(); const value = t.dataset.toggleWhat; state.whatFilter.has(value) ? state.whatFilter.delete(value) : state.whatFilter.add(value); state.feedShown = 10; renderHome(); }
  if (t.dataset.toggleWhere !== undefined) { mark(); const value = t.dataset.toggleWhere; state.whereFilter.has(value) ? state.whereFilter.delete(value) : state.whereFilter.add(value); state.feedShown = 10; renderHome(); }
  if (t.dataset.toggleWhen !== undefined) { mark(); const value = t.dataset.toggleWhen; state.whenFilter.has(value) ? state.whenFilter.delete(value) : state.whenFilter.add(value); state.feedShown = 10; renderHome(); }
  if (t.dataset.clearWhat !== undefined) { mark(); state.whatFilter.clear(); state.feedShown = 10; renderHome(); }
  if (t.dataset.clearWhere !== undefined) { mark(); state.whereFilter.clear(); state.feedShown = 10; renderHome(); }
  if (t.dataset.clearWhen !== undefined) { mark(); state.whenFilter.clear(); state.filter.date = "Any date"; state.filter.time = "Any time"; state.feedShown = 10; renderHome(); }
  if (t.dataset.mapFilter) { state.mapFilter = t.dataset.mapFilter; renderMap(); }
  if (t.dataset.discoverCategory) { mark(); if (t.dataset.discoverCategory !== "for-you") { state.discoverGenreFilter = ""; state.feedShown = 10; state.discoverCategoryView = t.dataset.discoverCategory; renderHome(); } }
  if (t.dataset.discoverBack !== undefined) { mark(); state.discoverCategoryView = ""; state.discoverGenreFilter = ""; state.feedShown = 10; renderHome(); }
  if (t.dataset.categoryGenre !== undefined) { mark(); state.discoverGenreFilter = t.dataset.categoryGenre; state.feedShown = 10; renderHome(); }
  if (t.dataset.feedMore !== undefined) { mark(); state.feedShown = (state.feedShown || 10) + 10; renderHome(); }
  if (t.dataset.neighborhood !== undefined) { mark(); state.neighborhoodFilter = t.dataset.neighborhood; state.feedShown = 10; renderHome(); }
  if (t.dataset.daytime !== undefined) { mark(); const colon = t.dataset.daytime.indexOf(":"); const dim = t.dataset.daytime.slice(0, colon); const val = t.dataset.daytime.slice(colon + 1); if (dim === "date") state.filter.date = val || "Any date"; else if (dim === "time") state.filter.time = val || "Any time"; state.feedShown = 10; renderHome(); }
  if (t.dataset.pickDate !== undefined) { mark(); openDatePickerSheet(); }
  if (t.dataset.pickTime !== undefined) { mark(); openTimePickerSheet(); }
  if (t.dataset.applyDate !== undefined) { mark(); const from = document.querySelector("[data-date-from]")?.value; const to = document.querySelector("[data-date-to]")?.value; state.filter.date = from ? (to && to > from ? `${from}..${to}` : from) : "Any date"; state.feedShown = 10; modalRoot.innerHTML = ""; renderHome(); toast(from ? "Date filter applied" : "Date cleared"); }
  if (t.dataset.clearDate !== undefined) { mark(); state.filter.date = "Any date"; state.feedShown = 10; modalRoot.innerHTML = ""; renderHome(); toast("Date cleared"); }
  if (t.dataset.applyTime !== undefined) { mark(); const from = document.querySelector("[data-time-from]")?.value; const to = document.querySelector("[data-time-to]")?.value; state.filter.time = from ? `custom:${from}-${to || from}` : "Any time"; state.feedShown = 10; modalRoot.innerHTML = ""; renderHome(); toast(from ? "Time filter applied" : "Time cleared"); }
  if (t.dataset.clearTime !== undefined) { mark(); state.filter.time = "Any time"; state.feedShown = 10; modalRoot.innerHTML = ""; renderHome(); toast("Time cleared"); }
  if (t.dataset.dayExplore) { mark(); state.filter.date = t.dataset.dayExplore; state.homeFilter = "all"; state.discoverCategoryView = ""; state.feedShown = 10; setRoute("home"); toast("Showing events for that day"); }
  if (t.dataset.event) { mark(); const hintCount = Number(localStorage.getItem("lokalRsvpHintCount")) || 0; if (hintCount <= 3) localStorage.setItem("lokalRsvpHintCount", String(hintCount + 1)); openDetail(t.dataset.event); }
  if (t.classList.contains("modal-close")) { mark(); modalRoot.innerHTML = ""; }
  if (t.dataset.quickSave) {
    mark();
    const id = Number(t.dataset.quickSave);
    state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
    const isSaved = state.saved.has(id);
    setPlanSource("saved", id, isSaved);
    saveEventInteraction(id, "save", isSaved);
    if (state.route === "social") renderSocial(); else if (state.route === "home") renderHome();
    toast(isSaved ? "Saved for later" : "Removed from saved");
    return;
  }
  if (t.dataset.save) {
    const id = Number(t.dataset.save);
    const inDetail = Boolean(t.closest(".detail-actions"));
    state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
    const isSaved = state.saved.has(id);
    setPlanSource("saved", id, isSaved);
    const flashSaved = button => { if (!button) return; button.classList.add("just-saved"); setTimeout(() => button.classList.remove("just-saved"), 1500); };
    if (inDetail) { openDetail(id); const button = document.querySelector(`[data-save="${id}"]`); if (button && isSaved) { button.classList.add("btn-pop"); flashSaved(button); } }
    else document.querySelectorAll(`[data-save="${id}"]`).forEach(button => { button.classList.toggle("is-saved", isSaved); if (isSaved) flashSaved(button); });
    saveEventInteraction(id, "save", isSaved);
    // Saving confirms inline (the "Saved ✓" chip); only the removal needs a toast.
    if (!isSaved) toast("Removed from saved");
  }
  if (t.dataset.rsvp) {
    const id = Number(t.dataset.rsvp);
    state.rsvps.has(id) ? state.rsvps.delete(id) : state.rsvps.add(id);
    const isRsvp = state.rsvps.has(id);
    setPlanSource("rsvp", id, isRsvp);
    openDetail(id);
    if (isRsvp) document.querySelector(`[data-rsvp="${id}"]`)?.classList.add("btn-pop");
    saveEventInteraction(id, "rsvp", isRsvp);
    toast(isRsvp ? "You're going! Added to Your Plans." : "RSVP removed");
  }
  if (t.dataset.copyDetailLink !== undefined) { mark(); const shareEvent = events.find(item => item.id === Number(t.dataset.copyDetailLink)); try { await navigator.clipboard?.writeText(lokalEventShareUrl(shareEvent)); } catch {} const original = t.textContent; t.textContent = "Link copied ✓"; setTimeout(() => { t.textContent = original; }, 2000); toast("Link copied"); }
  if (t.dataset.addRecurring) { mark(); addRecurringEventToCalendar(t.dataset.addRecurring); }
  if (t.dataset.attended) { mark(); const result = markEventAttended(Number(t.dataset.attended)); openDetail(t.dataset.attended); toast(result.message); }
  if (t.dataset.receiptEvent) { mark(); openReceipt(t.dataset.receiptEvent); }
  if (t.dataset.share) openShareSheet(t.dataset.share);
  if (t.dataset.calendarPlan) { mark(); openDetail(t.dataset.calendarPlan); }
  if (t.dataset.calendarDay) { mark(); openCalendarPlans(t.dataset.calendarDay); }
  if (t.dataset.plannerWeek) { mark(); state.plannerWeekOffset += Number(t.dataset.plannerWeek); renderSocial(); }
  if (t.dataset.nativeShare) { mark(); const eventToShare = events.find(item => item.id === Number(t.dataset.nativeShare)); const payload = lokalEventSharePayload(eventToShare); try { if (navigator.share) await navigator.share({ title: eventToShare.title, text: payload, url: lokalEventShareUrl(eventToShare) }); else await navigator.clipboard?.writeText(payload); toast(navigator.share ? "Share sheet opened" : "Lokal event copied"); } catch { toast("Share canceled"); } }
  if (t.dataset.copyEventShare) { mark(); const eventToShare = events.find(item => item.id === Number(t.dataset.copyEventShare)); try { await navigator.clipboard?.writeText(lokalEventSharePayload(eventToShare)); } catch {} toast("Lokal event copied"); }
  if (t.dataset.postStory) { mark(); const eventId = Number(t.dataset.postStory); state.storyPosts = [{ eventId, postedAt: Date.now() }, ...state.storyPosts.filter(post => post.eventId !== eventId)].slice(0, 12); localStorage.setItem("lokalStoryPosts", JSON.stringify(state.storyPosts)); modalRoot.innerHTML = ""; if (state.route === "home") renderHome(); toast("Added to your story"); }
  if (t.dataset.shareProfile) { mark(); const profileUrl = `https://lokal.app/${String(t.dataset.shareProfile).toLowerCase().replace(/[^a-z0-9]+/g, "")}`; try { await navigator.clipboard?.writeText(profileUrl); } catch {} toast("Profile link copied"); }
  if (t.dataset.groupShare) { const group = t.dataset.groupShare; const eventId = Number(t.dataset.eventId); state.groupMessages[group] = [{ type: "event", eventId }, ...(state.groupMessages[group] || [])]; openGroup(group); toast(`Event sent to ${group}`); }
  if (t.dataset.copyLink !== undefined) { mark(); try { await navigator.clipboard?.writeText(location.href); } catch {} toast("Demo link copied"); }
  if (t.dataset.addFriendsLink !== undefined) { mark(); openSimpleSheet("Add friends", "Share this link to invite someone to Lokal. After installing the app, they will be connected to your profile.", `<label class="settings-field">App invite URL<input value="https://lokal.app/join" readonly></label><button class="wide-button" data-copy-app-invite>Copy invite link</button>`); }
  if (t.dataset.copyAppInvite !== undefined) { mark(); try { await navigator.clipboard?.writeText("https://lokal.app/join"); } catch {} toast("App invite link copied"); }
  if (t.dataset.restart !== undefined) { localStorage.removeItem("lokalAccountCreated"); state.onboardStep = 0; document.querySelector(".onboarding")?.remove(); renderOnboarding(); }
  if (t.dataset.notifications !== undefined) openNotifications();
  if (t.dataset.moreFilters !== undefined) openFilters();
  if (t.dataset.refreshEvents !== undefined) syncSupabaseEvents(true);
  if (t.dataset.location !== undefined) toast("Location enabled for nearby events");
  if (t.dataset.mapArea !== undefined) { mark(); const input = document.querySelector("[data-map-search]"); state.mapSearch = input?.value.trim() || ""; applyMapSearch(); renderMap(); toast(state.mapSearch ? `Showing ${state.mapSearch}` : "Showing all DC events"); }
  if (t.dataset.mapZoom) { mark(); if (t.dataset.mapZoom === "reset") { state.mapZoom = 1; state.mapSearch = ""; state.mapCenter = { x: 50, y: 50 }; } renderMap(); }
  if (t.dataset.createGroup !== undefined) openCreateGroup();
  if (t.dataset.groupType) { state.groupType = t.dataset.groupType; document.querySelectorAll(".group-type").forEach(button => button.classList.toggle("selected", button.dataset.groupType === state.groupType)); }
  if (t.dataset.saveGroup !== undefined) { const input = document.querySelector("[data-group-name]"); const name = input?.value.trim() || "New Lokal group"; const labels = { private: "Private", event: "Event chat", public: "Public" }; if (state.leftGroups.has(name)) { toast("Choose a different group name"); return; } state.newGroups.unshift({ name, type: labels[state.groupType] }); if (state.groupType !== "public" && !state.privateGroupMembers[name]) state.privateGroupMembers[name] = ["You"]; modalRoot.innerHTML = ""; state.socialTab = "groups"; renderSocial(); toast(`${name} created`); }
  if (t.dataset.openGroup) openGroup(t.dataset.openGroup);
  if (t.dataset.openFriend) openFriend(t.dataset.openFriend);
  if (t.dataset.invite !== undefined) openInvite(t.dataset.groupName);
  if (t.dataset.backGroup) openGroup(t.dataset.backGroup);
  if (t.dataset.copyInvite !== undefined) toast("Invite link copied");
  if (t.dataset.addInvite !== undefined) { mark(); t.textContent = "Added"; t.classList.add("selected"); toast("Friend invited"); }
  if (t.dataset.invitePeopleOption) { const group = t.dataset.groupName; addFriendToPrivateGroup(group, t.dataset.invitePeopleOption); if (state.route === "social") renderSocial(); const selected = document.querySelector("[data-selected-invite-people]"); const input = document.querySelector("[data-invite-people-search]"); if (selected && !selected.textContent.includes(t.dataset.invitePeopleOption)) selected.insertAdjacentHTML("beforeend", `<span>${t.dataset.invitePeopleOption}</span>`); if (input) input.value = ""; const results = document.querySelector("[data-invite-people-results]"); if (results) { results.hidden = true; results.innerHTML = ""; } toast(`${t.dataset.invitePeopleOption} added to ${group}`); }
  if (t.dataset.groupFriendOption) { const selected = document.querySelector("[data-selected-group-friends]"); const input = document.querySelector("[data-create-friends]"); if (selected && !selected.textContent.includes(t.dataset.groupFriendOption)) selected.insertAdjacentHTML("beforeend", `<span>${t.dataset.groupFriendOption}</span>`); if (input) input.value = ""; const autocomplete = document.querySelector("[data-autocomplete]"); if (autocomplete) { autocomplete.hidden = true; autocomplete.innerHTML = ""; } toast(`${t.dataset.groupFriendOption} added to group`); }
  if (t.dataset.addAdventure) { const name = t.dataset.addAdventure; acceptFriendship(name); t.textContent = "Add to group"; t.setAttribute("aria-label", `Add ${name} to group`); t.dataset.inviteFriend = name; delete t.dataset.addAdventure; t.classList.add("selected"); toast(`${name} added as friend`); return; }
  if (t.dataset.seeAllFriends !== undefined) openAllFriends();
  if (t.dataset.viewMoreGroups !== undefined) { state.showAllGroups = !state.showAllGroups; renderSocial(); }
  if (t.dataset.schedule !== undefined) { mark(); openSimpleSheet("Schedule an event", "Add an event for the group and let members know when it is happening.", `<label class="settings-field">Event name<input placeholder="Event name"></label><label class="settings-field">Date and time<input type="datetime-local"></label><button class="wide-button" data-confirm-schedule>Schedule event</button>`); }
  if (t.dataset.confirmSchedule !== undefined) { mark(); modalRoot.innerHTML = ""; toast("Event scheduled for the group"); }
  if (t.dataset.shareGroupEvent !== undefined) { mark(); const group = t.dataset.shareGroupEvent; openSimpleSheet("Share an event", "Choose an event to send to this group.", `<div class="interest-list">${groupSharePicker(group)}</div>`); }
  if (t.dataset.sendEvent !== undefined) { mark(); const group = t.dataset.groupName; const eventId = Number(t.dataset.sendEvent); state.groupMessages[group] = [{ type: "event", eventId }, ...(state.groupMessages[group] || [])]; openGroup(group); toast("Event added to group messages"); }
  if (t.dataset.joinGroup) { if (state.leftGroups.has(t.dataset.joinGroup)) { toast("You left this group"); return; } state.joinedGroups.add(t.dataset.joinGroup); if (state.route === "social") renderSocial(); openGroup(t.dataset.joinGroup); toast("Group joined"); }
  if (t.dataset.groupOptions) { modalRoot.innerHTML += `<div class="options-menu"><button data-pin-group="${t.dataset.groupOptions}">${state.pinnedGroups.has(t.dataset.groupOptions) ? "Unpin group" : "Pin group"}</button><button data-leave-group="${t.dataset.groupOptions}">Leave group</button></div>`; }
  if (t.dataset.pinGroup) { state.pinnedGroups.has(t.dataset.pinGroup) ? state.pinnedGroups.delete(t.dataset.pinGroup) : state.pinnedGroups.add(t.dataset.pinGroup); modalRoot.innerHTML = ""; renderSocial(); toast("Group list updated"); }
  if (t.dataset.leaveGroup) { removeGroupMembership(t.dataset.leaveGroup); modalRoot.innerHTML = ""; renderSocial(); toast("You left the group"); }
  if (t.dataset.profileLeaveGroup) { removeGroupMembership(t.dataset.profileLeaveGroup); renderProfile(); openProfileList("groups"); toast(`Left ${t.dataset.profileLeaveGroup}`); }
  if (t.dataset.seeMorePublicGroups !== undefined) openPublicGroupDirectory();
  if (t.dataset.removePlan) { if (!state.removedPlans) state.removedPlans = new Set(); const id = Number(t.dataset.removePlan); state.removedPlans.add(id); state.rsvps.delete(id); state.saved.delete(id); saveEventInteraction(id, "remove", false); renderProfile(); openProfileList("plans"); toast("Plan removed"); }
  if (t.dataset.groupView) { document.querySelectorAll("[data-group-view]").forEach(button => button.classList.toggle("selected", button.dataset.groupView === t.dataset.groupView)); document.querySelectorAll("[data-group-panel]").forEach(panel => panel.hidden = panel.dataset.groupPanel !== t.dataset.groupView); }
  if (t.dataset.sendMessage !== undefined) { mark(); const input = document.querySelector("[data-message]"); const group = t.dataset.groupName; if (input?.value.trim()) { state.groupMessages[group] = [{ type: "text", text: input.value.trim() }, ...(state.groupMessages[group] || [])]; openGroup(group); toast("Message sent"); } else toast("Type a message first"); }
  if (t.dataset.manageFollowing !== undefined) { mark(); openFollowingManager(); }
  if (t.dataset.follow) { state.follows.has(t.dataset.follow) ? state.follows.delete(t.dataset.follow) : state.follows.add(t.dataset.follow); const inManager = Boolean(t.closest(".modal")); ({ home: renderHome, social: renderSocial, profile: renderProfile }[state.route] || renderSocial)(); if (inManager) openFollowingManager(); toast(state.follows.has(t.dataset.follow) ? "Added to your feed" : "Removed from your feed"); }
  if (t.dataset.followVenue) { mark(); const key = t.dataset.followVenue; const on = !state.follows.has(key); on ? state.follows.add(key) : state.follows.delete(key); t.classList.toggle("selected", on); t.textContent = on ? "Following" : "Follow"; toast(on ? `Following ${key.slice(6)}` : "Unfollowed venue"); }
  if (t.dataset.venueEvents) { mark(); openVenueEvents(t.dataset.venueEvents); }
  if (t.dataset.dismissVenueVerification !== undefined) {
    mark();
    state.venueVerificationDismissed = true;
    localStorage.setItem("lokalVenueVerificationDismissed", "1");
    renderProfile();
    toast("Venue tools hidden");
  }
  if (t.dataset.venueVerify !== undefined) { mark(); openVenueVerificationSheet(); }
  if (t.dataset.submitVenueVerification !== undefined) {
    mark();
    const sheet = t.closest(".venue-form-sheet");
    const error = sheet.querySelector("[data-venue-verify-error]");
    const payload = {
      venueName: sheet.querySelector("[data-verify-venue-name]")?.value.trim(),
      venueAddress: sheet.querySelector("[data-verify-venue-address]")?.value.trim(),
      website: sheet.querySelector("[data-verify-venue-website]")?.value.trim(),
      role: sheet.querySelector("[data-verify-role]")?.value.trim(),
      email: sheet.querySelector("[data-verify-email]")?.value.trim(),
      phone: sheet.querySelector("[data-verify-phone]")?.value.trim(),
      notes: sheet.querySelector("[data-verify-notes]")?.value.trim()
    };
    if (!payload.venueName || !payload.venueAddress || !payload.role || !payload.email) { error.textContent = "Add venue name, address, your role, and contact email."; return; }
    t.disabled = true;
    error.textContent = "";
    try {
      await submitVenueVerificationRequest(payload);
      modalRoot.innerHTML = "";
      renderProfile();
      toast("Venue verification sent for review");
    } catch {
      error.textContent = "Could not submit yet. Try again in a minute.";
      t.disabled = false;
    }
  }
  if (t.dataset.postVenueEvent) { mark(); openVenueEventPostSheet(t.dataset.postVenueEvent); }
  if (t.dataset.submitVenueEvent !== undefined) {
    mark();
    const sheet = t.closest(".venue-form-sheet");
    const error = sheet.querySelector("[data-post-event-error]");
    const venueName = sheet.querySelector("[data-post-venue-name]")?.value.trim();
    const title = sheet.querySelector("[data-post-event-title]")?.value.trim();
    const startsAt = sheet.querySelector("[data-post-starts-at]")?.value;
    const isRecurring = Boolean(sheet.querySelector("[data-post-recurring]")?.checked);
    const recurrenceFrequency = sheet.querySelector("[data-post-recurrence-frequency]")?.value || "";
    if (!venueName || !title || !startsAt) { error.textContent = "Add an event name and start date/time."; return; }
    if (isRecurring && !recurrenceFrequency) { error.textContent = "Choose how often this recurring event repeats."; return; }
    const tags = String(sheet.querySelector("[data-post-tags]")?.value || "").split(",").map(tag => tag.trim()).filter(Boolean);
    t.disabled = true;
    error.textContent = "";
    try {
      await submitVenueEventPost({
        venueName,
        venueAddress: sheet.querySelector("[data-post-venue-address]")?.value.trim(),
        title,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: sheet.querySelector("[data-post-ends-at]")?.value ? new Date(sheet.querySelector("[data-post-ends-at]").value).toISOString() : "",
        category: sheet.querySelector("[data-post-category]")?.value,
        tags,
        ticketUrl: sheet.querySelector("[data-post-ticket-url]")?.value.trim(),
        price: sheet.querySelector("[data-post-price]")?.value.trim(),
        imageUrl: sheet.querySelector("[data-post-image-url]")?.value.trim(),
        description: sheet.querySelector("[data-post-description]")?.value.trim(),
        isRecurring,
        recurrenceFrequency,
        recurrenceUntil: sheet.querySelector("[data-post-recurrence-until]")?.value || ""
      });
      modalRoot.innerHTML = "";
      if (state.route === "profile") renderProfile();
      else openVenueEvents(venueName);
      toast("Event submitted for Lokal review");
    } catch {
      error.textContent = "Could not submit this event yet. Try again in a minute.";
      t.disabled = false;
    }
  }
  if (t.dataset.friend !== undefined) toast("Friend connection settings");
  if (t.dataset.filterOption !== undefined) { const parent = t.closest(".filter-options"); parent.querySelectorAll("button").forEach(button => button.classList.remove("selected")); t.classList.add("selected"); if (t.dataset.filterKey === "date" && t.dataset.filterValue !== "Choose a date") { state.filter.date = t.dataset.filterValue; state.filterDatePickerOpen = false; } if (t.dataset.filterValue === "Choose a date") { state.filterDatePickerOpen = true; document.querySelector("[data-calendar]").hidden = false; } }
  if (t.dataset.calendarDate) { const selected = String(state.filter.date || ""); const range = selected.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/); const start = range ? "" : /^\d{4}-\d{2}-\d{2}$/.test(selected) ? selected : ""; const next = t.dataset.calendarDate; state.filter.date = start && next > start ? `${start}..${next}` : next; state.filterDatePickerOpen = true; openFilters(); }
  if (t.dataset.calendarClear !== undefined) { state.filter.date = "Any date"; state.filterDatePickerOpen = true; openFilters(); }
  if (t.dataset.applyFilters !== undefined) { document.querySelectorAll("[data-filter-option].selected").forEach(option => { const key = option.dataset.filterKey; const value = option.dataset.filterValue; if (key === "highlight") state.highlightedOnly = value === "Highlighted only"; else if (!(key === "date" && value === "Choose a date" && /^(\d{4}-\d{2}-\d{2})(\.\.\d{4}-\d{2}-\d{2})?$/.test(state.filter.date || ""))) state.filter[key] = value; }); state.filterDatePickerOpen = false; modalRoot.innerHTML = ""; renderHome(); toast("Feed updated"); }
  if (t.dataset.profileList) openProfileList(t.dataset.profileList);
  if (t.dataset.toggleReceipts !== undefined) { mark(); state.profileReceiptsExpanded = !state.profileReceiptsExpanded; renderProfile(); }
  if (t.dataset.editTastes !== undefined) { mark(); openTasteEditor(); }
  if (t.dataset.tasteChoice) {
    mark();
    const selected = [...document.querySelectorAll("[data-taste-choice].selected")];
    if (!t.classList.contains("selected") && selected.length >= 5) { toast("Choose up to 5 tastes"); return; }
    t.classList.toggle("selected");
    const count = document.querySelector("[data-taste-count]");
    if (count) count.textContent = `${document.querySelectorAll("[data-taste-choice].selected").length}/5 selected`;
  }
  if (t.dataset.saveTastes !== undefined) {
    mark();
    const choices = [...document.querySelectorAll("[data-taste-choice].selected")].map(button => button.dataset.tasteChoice);
    if (!choices.length) { toast("Pick at least one taste"); return; }
    state.tastes = choices;
    state.profile = { ...state.profile, tastes: choices };
    localStorage.setItem("lokalProfile", JSON.stringify(state.profile));
    modalRoot.innerHTML = "";
    renderProfile();
    toast("Tastes updated");
  }
  if (t.dataset.acceptRequest) { const request = state.pendingRequests.find(item => item.id === t.dataset.acceptRequest); state.pendingRequests = state.pendingRequests.filter(item => item.id !== t.dataset.acceptRequest); if (request?.type === "group" && !state.leftGroups.has(request.name)) { state.joinedGroups.add(request.name); openGroup(request.name); } else if (request?.type === "friend") { acceptFriendship(request.name); if (state.route === "social") renderSocial(); openFriend(request.name); } toast(request?.type === "friend" ? `${request.name} is now your friend` : "Request accepted"); }
  if (t.dataset.declineRequest) { state.pendingRequests = state.pendingRequests.filter(item => item.id !== t.dataset.declineRequest); openNotifications(); toast("Request declined"); }
  if (t.dataset.notificationProfile !== undefined) { modalRoot.innerHTML = ""; setRoute("profile"); toast("Profile activity opened"); }
  if (t.dataset.notificationGroup) { modalRoot.innerHTML = ""; openGroup(t.dataset.notificationGroup); toast(`Opened ${t.dataset.notificationGroup}`); }
  if (t.dataset.story !== undefined) openStory(t.dataset.story);
  if (t.dataset.storyPrev !== undefined) openStory(Number(t.dataset.storyPrev) - 1);
  if (t.dataset.storyNext !== undefined) openStory(Number(t.dataset.storyNext) + 1);
  if (t.dataset.directInbox !== undefined) { mark(); openDirectInbox(); }
  if (t.dataset.openDirectChat) { mark(); openDirectChat(t.dataset.openDirectChat); }
  if (t.dataset.messageFriend) { mark(); toast("Direct messages are not part of this demo flow"); }
  if (t.dataset.sendDirectMessage) { mark(); const name = t.dataset.sendDirectMessage; const input = document.querySelector("[data-direct-message]"); if (input?.value.trim()) { state.directMessages[name] = [...(state.directMessages[name] || []), { from: "You", text: input.value.trim() }]; openDirectChat(name); toast("Message sent"); } else toast("Type a message first"); }
  if (t.dataset.inviteFriend) { mark(); openSimpleSheet("Invite to a group", `Search for the group you want to add ${t.dataset.inviteFriend} to.`, `<label class="search-box social-search"><span>&#8981;</span><input data-friend-group-search data-friend-name="${t.dataset.inviteFriend}" placeholder="Search your groups" aria-label="Search your groups for ${t.dataset.inviteFriend}"></label><div class="share-group-results" data-friend-group-results><p class="section-helper">Start typing to find a group.</p></div>`); }
  if (t.dataset.confirmInviteGroup !== undefined) { mark(); addFriendToPrivateGroup(t.dataset.confirmInviteGroup, t.dataset.friendName); if (state.route === "social") renderSocial(); modalRoot.innerHTML = ""; toast(`${t.dataset.friendName} added to ${t.dataset.confirmInviteGroup}`); }
  if (t.dataset.changePhoto !== undefined) { mark(); openSimpleSheet("Change photo", "Choose a profile photo from your device.", `<button class="wide-button" data-confirm-photo>Choose photo</button>`); }
  if (t.dataset.confirmPhoto !== undefined) { mark(); modalRoot.innerHTML = ""; toast("Photo chooser opened"); }
  if (t.dataset.settingsPage) { mark(); if (t.dataset.settingsPage === "faq") { openFaqSheet(); } else { const pages = { notifications:["Notification settings","Choose which updates you receive: friend requests, event recommendations, and saved-event reminders."], verification:["Become a Lokal","Apply for a manually verified curator profile to publish local lists and recommendations."], privacy:["Privacy and blocked accounts","Manage who can see your profile and review accounts you have blocked."] }; openSimpleSheet(...pages[t.dataset.settingsPage]); } }
  if (t.dataset.signout !== undefined) { mark(); openSimpleSheet("Sign out", "You'll be signed out of this demo session.", `<button class="wide-button" data-confirm-signout>Sign out</button>`); }
  if (t.dataset.confirmSignout !== undefined) { mark(); modalRoot.innerHTML = ""; toast("Signed out (demo)"); }
  if (t.dataset.deactivate !== undefined) { mark(); openSimpleSheet("Delete account", "This would permanently remove your Lokal profile.", `<button class="danger-button" data-confirm-deactivate>Delete account</button>`); }
  if (t.dataset.confirmDeactivate !== undefined) { mark(); modalRoot.innerHTML = ""; toast("Account deactivation confirmed for demo"); }
  if (t.dataset.settings !== undefined || t.dataset.editProfile !== undefined) openSettings();
  if (t.dataset.saveSettings !== undefined) { const input = document.querySelector("[data-age-input]"); const bio = document.querySelector("[data-bio-input]"); const privateInput = document.querySelector("[data-private-account]"); if (input) state.age = Math.max(13, Number(input.value) || 27); if (bio?.value.trim()) state.bio = bio.value.trim(); state.privateAccount = Boolean(privateInput?.checked); state.profile = { ...state.profile, age: state.age, bio: state.bio, tastes: state.tastes, privateAccount: state.privateAccount }; localStorage.setItem("lokalProfile", JSON.stringify(state.profile)); modalRoot.innerHTML = ""; renderProfile(); toast(state.age < 21 ? "Profile updated. 21+ picks hidden." : state.privateAccount ? "Profile updated. Account is private." : "Profile updated"); }
  if (t.dataset.ticket !== undefined) toast("External ticket link opened in the real app");
  if (t.dataset.socialTab) { state.socialTab = t.dataset.socialTab; renderSocial(); }
  if (t.dataset.hype) { const id = Number(t.dataset.hype); state.hype.has(id) ? state.hype.delete(id) : state.hype.add(id); renderSocial(); toast(state.hype.has(id) ? "Added to your radar" : "Removed from your radar"); }
  if (t.dataset.mapEvent) { const e = events.find(x => x.id === Number(t.dataset.mapEvent)); const card = document.querySelector("#map-card"); card.innerHTML = eventRow(e); card.classList.add("visible"); }
  if (t.dataset.select) { t.classList.toggle("selected"); t.classList.contains("selected") ? state.selections.add(t.dataset.select) : state.selections.delete(t.dataset.select); t.closest(".onboard-card").querySelector("[data-next]").disabled = state.selections.size === 0; }
  if (t.dataset.signupInterest || t.dataset.signupArea) {
    mark();
    t.classList.toggle("selected");
    const draft = (state.signupDraft = state.signupDraft || {});
    const key = t.dataset.signupInterest ? "interests" : "areas";
    const value = t.dataset.signupInterest || t.dataset.signupArea;
    const chosen = new Set(draft[key] || []);
    chosen.has(value) ? chosen.delete(value) : chosen.add(value);
    draft[key] = [...chosen];
  }
  if (t.dataset.onboardStart !== undefined) { mark(); state.signupDraft = { ...(state.signupDraft || {}), accountType: t.dataset.accountType || "person" }; document.querySelector(".onboarding")?.remove(); state.onboardStep = 1; renderOnboarding(); }
  if (t.dataset.onboardBack !== undefined) { mark(); document.querySelector(".onboarding")?.remove(); state.onboardStep = Math.max(0, (state.onboardStep || 1) - 1); renderOnboarding(); }
  if (t.dataset.onboardVenue !== undefined) {
    mark();
    const card = t.closest(".onboard-card");
    const error = card.querySelector("[data-account-error]");
    const venueName = card.querySelector("[data-onboard-venue-name]").value.trim();
    const venueAddress = card.querySelector("[data-onboard-venue-address]").value.trim();
    const website = card.querySelector("[data-onboard-venue-website]").value.trim();
    if (!venueName || !venueAddress) { error.textContent = "Enter the venue name and address."; return; }
    state.signupDraft.venueName = venueName;
    state.signupDraft.venueAddress = venueAddress;
    state.signupDraft.website = website;
    document.querySelector(".onboarding")?.remove();
    state.onboardStep = 2;
    renderOnboarding();
  }
  if (t.dataset.onboardName !== undefined) {
    mark();
    const card = t.closest(".onboard-card");
    const error = card.querySelector("[data-account-error]");
    const first = card.querySelector("[data-onboard-first]").value.trim();
    const last = card.querySelector("[data-onboard-last]").value.trim();
    if (!first || !last) { error.textContent = "Enter your first and last name."; return; }
    state.signupDraft.firstName = first;
    state.signupDraft.lastName = last;
    document.querySelector(".onboarding")?.remove();
    state.onboardStep = 2;
    renderOnboarding();
  }
  if (t.dataset.onboardContact !== undefined) {
    mark();
    const card = t.closest(".onboard-card");
    const error = card.querySelector("[data-account-error]");
    const email = card.querySelector("[data-onboard-email]").value.trim();
    const phone = card.querySelector("[data-onboard-phone]").value.trim();
    try { validateSignupEmail(email); formatSignupPhone(phone); }
    catch (contactError) { error.textContent = contactError.message; return; }
    state.signupDraft.email = email;
    state.signupDraft.phone = phone;
    document.querySelector(".onboarding")?.remove();
    state.onboardStep = 3;
    renderOnboarding();
  }
  if (t.dataset.onboardFinish !== undefined) {
    mark();
    const card = t.closest(".onboard-card");
    const error = card.querySelector("[data-account-error]");
    const draft = state.signupDraft || {};
    const eventInterests = draft.interests || [];
    const areaInterests = draft.areas || [];
    if (!eventInterests.length) { error.textContent = "Pick at least one interest so we can tune your feed."; return; }
    const isVenue = draft.accountType === "venue";
    const fullName = isVenue ? draft.venueName : `${draft.firstName || ""} ${draft.lastName || ""}`.trim();
    const username = (isVenue ? draft.venueName : ((draft.firstName || "lokal") + (draft.lastName || ""))).toLowerCase().replace(/[^a-z0-9]+/g, "");
    finalizeLokalProfile({
      fullName,
      email: draft.email,
      phone: formatSignupPhone(draft.phone),
      username,
      birthdate: "2000-01-01",
      eventInterests,
      areaInterests,
      accountType: isVenue ? "venue" : "person",
      venueName: isVenue ? draft.venueName : "",
      venueAddress: isVenue ? draft.venueAddress : "",
      venueWebsite: isVenue ? draft.website : ""
    });
    if (isVenue) {
      try {
        await submitVenueVerificationRequest({
          venueName: draft.venueName,
          venueAddress: draft.venueAddress,
          website: draft.website,
          role: "Venue owner or manager",
          email: draft.email,
          phone: draft.phone,
          notes: "Submitted during venue onboarding."
        });
      } catch {}
    }
    localStorage.setItem("lokalAccountCreated", "true");
    document.querySelector(".onboarding")?.remove();
    state.onboardStep = 0;
    isVenue ? renderProfile() : renderHome();
    toast(isVenue ? "Venue profile created. Verification pending." : "Welcome to Lokal");
    if (!isVenue) showDiscoverHint();
  }
  if (t.dataset.createAccount !== undefined) {
    mark();
    const card = t.closest(".onboard-card");
    const error = card.querySelector("[data-account-error]");
    const eventInterests = [...card.querySelectorAll("[data-signup-interest].selected")].map(button => button.dataset.signupInterest);
    const areaInterests = [...card.querySelectorAll("[data-signup-area].selected")].map(button => button.dataset.signupArea);
    t.disabled = true;
    error.textContent = "";
    try {
      const result = await createLokalAccount({
        fullName: card.querySelector("[data-signup-full-name]").value.trim(),
        email: card.querySelector("[data-signup-email]").value.trim(),
        phone: card.querySelector("[data-signup-phone]").value.trim(),
        username: card.querySelector("[data-signup-username]").value.trim(),
        birthdate: card.querySelector("[data-signup-birthdate]").value,
        password: card.querySelector("[data-signup-password]").value,
        eventInterests,
        areaInterests
      });
      document.querySelector(".onboarding").remove();
      finalizeLokalProfile(state.pendingSignupProfile);
      state.onboardStep++;
      renderOnboarding();
      toast(result.access_token ? "100 Lokal points for joining" : "100 Lokal points for joining. Check your email to confirm it.");
    } catch (accountError) {
      error.textContent = accountError.message;
      t.disabled = false;
    }
  }
  if (t.dataset.verifyPhone !== undefined) { const card = t.closest(".onboard-card"); const error = card.querySelector("[data-account-error]"); t.disabled = true; error.textContent = ""; try { await verifyLokalPhone(card.querySelector("[data-signup-code]").value); document.querySelector(".onboarding").remove(); state.onboardStep++; renderOnboarding(); toast("Phone number verified"); } catch (verificationError) { error.textContent = verificationError.message; t.disabled = false; } }
  if (t.dataset.next !== undefined) { document.querySelector(".onboarding").remove(); state.onboardStep++; state.selections.clear(); if (state.onboardStep < 3) renderOnboarding(); else { localStorage.setItem("lokalAccountCreated","true"); toast("100 Lokal points for joining"); showDiscoverHint(); } }
  if (!handled && !t.disabled) toast("Action opened");
});

let storyTouchStart = null;
modalRoot.addEventListener("touchstart", event => {
  if (event.target.closest("[data-story-sheet]")) storyTouchStart = event.changedTouches[0].clientX;
}, { passive: true });
modalRoot.addEventListener("touchend", event => {
  const sheet = event.target.closest("[data-story-sheet]");
  if (!sheet || storyTouchStart === null) return;
  const distance = event.changedTouches[0].clientX - storyTouchStart;
  storyTouchStart = null;
  if (Math.abs(distance) < 45) return;
  openStory(Number(sheet.dataset.storySheet) + (distance < 0 ? 1 : -1));
}, { passive: true });

document.addEventListener("input", event => {
  const input = event.target;
  if (input.matches("[data-signup-phone]")) {
    const digits = input.value.replace(/\D/g, "").slice(0, 10);
    input.value = digits.length > 6 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : digits.length > 3 ? `(${digits.slice(0, 3)}) ${digits.slice(3)}` : digits.length ? `(${digits}` : "";
  }
  if (input.matches("[data-group-search]")) {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll("[data-group-card]").forEach(card => { const match = card.dataset.searchText.includes(query); card.style.display = match ? "" : "none"; if (match) visible++; });
    const empty = document.querySelector("[data-group-empty]"); if (empty) empty.style.display = visible ? "none" : "block";
  }
  if (input.matches("[data-public-group-search]")) {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll("[data-public-directory-card]").forEach(card => { const match = card.dataset.searchText.includes(query); card.style.display = match ? "" : "none"; if (match) visible++; });
    const empty = document.querySelector("[data-public-group-empty]"); if (empty) empty.style.display = visible ? "none" : "block";
  }
  if (input.matches("[data-friend-search]")) {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll("[data-friend-card]").forEach(card => { const match = card.dataset.searchText.includes(query); card.style.display = match ? "" : "none"; if (match) visible++; });
    const empty = document.querySelector("[data-friend-empty]"); if (empty) empty.style.display = visible ? "none" : "block";
  }
  if (input.matches("[data-create-friends]")) {
    const query = input.value.trim().toLowerCase();
    const autocomplete = document.querySelector("[data-autocomplete]");
    const matches = query ? friendDirectory.filter(friend => friend[1].toLowerCase().includes(query) || friend[2].toLowerCase().includes(query)).slice(0, 5) : [];
    autocomplete.hidden = !matches.length;
    autocomplete.innerHTML = matches.map(friend => `<button data-group-friend-option="${friend[1]}">${friend[1]} <small>${friend[2]}</small></button>`).join("");
  }
  if (input.matches("[data-invite-people-search]")) {
    const query = input.value.trim().toLowerCase();
    const results = document.querySelector("[data-invite-people-results]");
    const matches = query ? friendDirectory.filter(friend => friend[1].toLowerCase().includes(query) || friend[2].toLowerCase().includes(query)).slice(0, 5) : [];
    results.hidden = !matches.length;
    results.innerHTML = matches.map(friend => `<button data-invite-people-option="${friend[1]}" data-group-name="${input.dataset.groupName}">${friend[1]} <small>${friend[2]}</small></button>`).join("");
  }
  if (input.matches("[data-category-genre-search]")) {
    state.discoverGenreFilter = input.value;
    renderHome();
    const nextInput = document.querySelector("[data-category-genre-search]");
    if (nextInput) { nextInput.focus(); nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length); }
  }
  if (input.matches("[data-neighborhood-search]")) {
    state.neighborhoodFilter = input.value;
    state.feedExpanded = false;
    renderHome();
    const nextInput = document.querySelector("[data-neighborhood-search]");
    if (nextInput) { nextInput.focus(); nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length); }
  }
  if (input.matches("[data-discover-search]")) {
    const query = input.value.trim().toLowerCase();
    const visible = renderDiscoverEventSearch(query);
    document.querySelectorAll("#app .following-chip").forEach(card => { const match = !query || card.dataset.searchText.includes(query); card.style.display = match ? "" : "none"; });
    const venueMatches = query ? venueSearchMatches(query, 8) : [];
    const venuesHtml = venueMatches.map(venue => { const on = state.follows.has(`venue:${venue.name}`); return `<div class="follow-card venue-result"><button class="venue-result-main" data-venue-events="${escapeHtml(venue.name)}"><span class="group-icon">${escapeHtml(venue.name.slice(0, 1).toUpperCase())}</span><span><b>${escapeHtml(venue.name)}</b><small>${escapeHtml([venue.neighborhood, venue.address].filter(Boolean).join(" / ") || "Venue")}</small></span></button><button class="follow-button ${on ? "selected" : ""}" data-follow-venue="venue:${escapeHtml(venue.name)}">${on ? "Following" : "Follow"}</button></div>`; }).join("");
    const results = document.querySelector("[data-discover-results]");
    if (results) { results.hidden = !query || !venueMatches.length; results.innerHTML = venuesHtml; }
    const feed = document.querySelector(".feed-section");
    if (feed) feed.classList.toggle("search-empty-feed", Boolean(query) && visible === 0 && venueMatches.length === 0);
  }
  if (input.matches("[data-share-group-search]")) {
    const query = input.value.trim();
    const eventId = input.dataset.eventId;
    const results = document.querySelector("[data-share-group-results]");
    results.innerHTML = shareGroupResultsHtml(eventId, query);
  }
  if (input.matches("[data-friend-group-search]")) {
    const query = input.value.trim().toLowerCase();
    const friend = input.dataset.friendName;
    const groups = userGroupNames().filter(name => name.toLowerCase().includes(query));
    const results = document.querySelector("[data-friend-group-results]");
    results.innerHTML = !query ? `<p class="section-helper">Start typing to find a group.</p>` : groups.length ? groups.map(name => `<button class="share-group" data-confirm-invite-group="${name}" data-friend-name="${friend}"><span class="group-icon">${name[0]}</span><span class="share-group-copy"><h3>${name}</h3><p>Add ${friend} to this group</p></span><span class="share-arrow">+</span></button>`).join("") : `<p class="section-helper">No groups match that search.</p>`;
  }
  if (input.matches("[data-map-search]")) {
    state.mapSearch = input.value;
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Enter" && event.target.matches("[data-map-search]")) {
    state.mapSearch = event.target.value.trim();
    applyMapSearch();
    renderMap();
    toast(state.mapSearch ? `Showing ${state.mapSearch}` : "Showing all DC events");
  }
});

const activeMapPointers = new Map();
let mapDragStart = null;
let mapPinchStart = null;

function mapPointerDistance() {
  const points = [...activeMapPointers.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

document.addEventListener("pointerdown", event => {
  const canvas = event.target.closest("[data-map-canvas]");
  if (!canvas || event.target.closest("input, button")) return;
  event.preventDefault();
  try { canvas.setPointerCapture(event.pointerId); } catch {}
  activeMapPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (activeMapPointers.size >= 2) {
    mapPinchStart = { distance: mapPointerDistance(), zoom: state.mapZoom };
    mapDragStart = null;
    return;
  }
  mapDragStart = { x: event.clientX, y: event.clientY };
  canvas.classList.add("dragging");
});
document.addEventListener("pointermove", event => {
  if (!activeMapPointers.has(event.pointerId)) return;
  event.preventDefault();
  activeMapPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const canvas = document.querySelector("[data-map-canvas]");
  if (activeMapPointers.size >= 2 && mapPinchStart?.distance) {
    const distance = mapPointerDistance();
    setMapZoom(mapPinchStart.zoom * (distance / mapPinchStart.distance));
    renderMap();
    return;
  }
  if (!mapDragStart) return;
  const deltaX = mapDragStart.x - event.clientX;
  const deltaY = mapDragStart.y - event.clientY;
  mapDragStart = { x: event.clientX, y: event.clientY };
  panMap(deltaX, deltaY);
  renderMap();
  canvas?.classList.add("dragging");
});
function endMapPointer(event) {
  if (event.pointerId !== undefined) activeMapPointers.delete(event.pointerId);
  mapPinchStart = activeMapPointers.size >= 2 ? { distance: mapPointerDistance(), zoom: state.mapZoom } : null;
  mapDragStart = activeMapPointers.size === 1 ? [...activeMapPointers.values()][0] : null;
  if (activeMapPointers.size === 0) mapDragStart = null;
  document.querySelector("[data-map-canvas]")?.classList.remove("dragging");
}
document.addEventListener("pointerup", endMapPointer);
document.addEventListener("pointercancel", endMapPointer);
document.addEventListener("wheel", event => {
  const canvas = event.target.closest("[data-map-canvas]");
  if (!canvas || event.target.closest("input")) return;
  event.preventDefault();
  if (event.ctrlKey) {
    setMapZoom(state.mapZoom - event.deltaY * 0.006);
  } else {
    panMap(event.deltaX, event.deltaY);
  }
  renderMap();
}, { passive: false });

document.querySelectorAll("[data-icon]").forEach(el => el.innerHTML = icons[el.dataset.icon]);
const startupParams = new URLSearchParams(location.search);
if (startupParams.has("newUser")) {
  ["lokalAccountCreated", "lokalProfile", "lokalAttended", "lokalReceipts"].forEach(key => localStorage.removeItem(key));
  history.replaceState(null, "", location.pathname);
}
if (startupParams.has("bypassSignup")) {
  localStorage.setItem("lokalAccountCreated", "true");
  history.replaceState(null, "", location.pathname);
}
setRoute("home");
updateProfileShortcut();
if (!localStorage.getItem("lokalAccountCreated")) renderOnboarding();
syncSupabaseEvents();
syncSupabaseProfiles();
syncSupabaseGroups();
updateProfileShortcut();
checkPhoneSignupStatus();
showWelcomeBanner();
showDiscoverHint();
