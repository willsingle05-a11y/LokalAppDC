// Inspirational lines that rotate on the welcome screen (CSS-animated).
const ONBOARD_ROTATOR_LINES = ["The city is in motion.", "Find your people.", "Find your home in DC.", "Never miss the moment."];
const ONBOARD_INTEREST_OPTIONS = ["Live music", "Concerts", "Nightlife", "Happy hours", "Trivia", "Museums", "Performing arts", "Comedy", "Sports", "Festivals", "Food & drink", "Markets", "Community", "Free events"];
const ONBOARD_AREA_OPTIONS = ["Adams Morgan", "U Street", "Shaw", "Navy Yard", "Penn Quarter", "H Street", "Logan Circle", "Dupont", "Georgetown", "NoMa", "Capitol Hill", "Anacostia", "Columbia Heights", "Petworth", "The Wharf", "Downtown"];

function onboardProgressDots(active) {
  return `<div class="onboard-progress" aria-label="Step ${active} of 3">${[1, 2, 3].map(n => `<span class="${n <= active ? "on" : ""}"></span>`).join("")}</div>`;
}

// Streamlined signup: an immersive, animated welcome, then three quick steps
// (name -> contact -> interests & neighborhoods). Interests + neighborhoods feed
// feed curation. Answers accumulate in state.signupDraft across steps.
function renderOnboarding() {
  state.signupDraft = state.signupDraft || {};
  const d = state.signupDraft;
  const step = state.onboardStep || 0;

  if (step === 0) {
    document.body.insertAdjacentHTML("beforeend", `<div class="onboarding onboard-immersive">
      <div class="welcome-bg"></div>
      <div class="welcome-scrim"></div>
      <div class="welcome-content">
        <div class="welcome-top"><span class="welcome-brand">LOKAL</span><span class="welcome-place">Washington, DC</span></div>
        <div class="welcome-message">
          <p class="welcome-eyebrow">Welcome to your city</p>
          <div class="welcome-rotator" aria-label="${escapeHtml(ONBOARD_ROTATOR_LINES.join(" "))}">${ONBOARD_ROTATOR_LINES.map(line => `<span>${escapeHtml(line)}</span>`).join("")}</div>
          <p class="welcome-tagline">Discover what's happening, and who's already going.</p>
        </div>
        <div class="welcome-choice-row">
          <button class="welcome-cta" data-onboard-start data-account-type="person">Join as a person</button>
          <button class="welcome-cta secondary" data-onboard-start data-account-type="venue">Join as a venue</button>
        </div>
      </div>
    </div>`);
    return;
  }

  let inner = "";
  if (step === 1 && d.accountType === "venue") {
    inner = `<h1 class="onboard-title">Tell us about your venue.</h1>
      <p class="lede">This starts your venue profile and sends verification to Lokal for review.</p>
      <div class="onboard-fields">
        <label class="float-field"><span>Venue name</span><input data-onboard-venue-name value="${escapeHtml(d.venueName || "")}" autocomplete="organization" placeholder="Dacha Beer Garden"></label>
        <label class="float-field"><span>Venue address</span><input data-onboard-venue-address value="${escapeHtml(d.venueAddress || "")}" autocomplete="street-address" placeholder="1600 7th St NW"></label>
        <label class="float-field"><span>Website</span><input data-onboard-venue-website type="url" value="${escapeHtml(d.website || "")}" placeholder="https://..."></label>
        <label class="float-field"><span>Venue description</span><textarea data-onboard-venue-description placeholder="Beer garden, patio crowd, trivia, watch parties...">${escapeHtml(d.venueDescription || "")}</textarea></label>
      </div>
      <p class="account-error" data-account-error></p>
      <button class="wide-button" data-onboard-venue>Continue</button>`;
  } else if (step === 1) {
    inner = `<h1 class="onboard-title">First, what's your name?</h1>
      <p class="lede">So friends know it's really you.</p>
      <div class="onboard-fields">
        <label class="float-field"><span>First name</span><input data-onboard-first value="${escapeHtml(d.firstName || "")}" autocomplete="given-name" placeholder="Alex"></label>
        <label class="float-field"><span>Last name</span><input data-onboard-last value="${escapeHtml(d.lastName || "")}" autocomplete="family-name" placeholder="Rivera"></label>
      </div>
      <p class="account-error" data-account-error></p>
      <button class="wide-button" data-onboard-name>Continue</button>`;
  } else if (step === 2) {
    inner = `<h1 class="onboard-title">How can we reach you?</h1>
      <p class="lede">Your email and number keep your saves and plans in sync.</p>
      <div class="onboard-fields">
        <label class="float-field"><span>Email</span><input data-onboard-email type="email" value="${escapeHtml(d.email || "")}" autocomplete="email" placeholder="you@email.com"></label>
        <label class="float-field"><span>Phone number</span><input data-onboard-phone type="tel" inputmode="tel" value="${escapeHtml(d.phone || "")}" autocomplete="tel" placeholder="(202) 555-0100"></label>
      </div>
      <p class="account-error" data-account-error></p>
      <button class="wide-button" data-onboard-contact>Continue</button>`;
  } else if (d.accountType === "venue") {
    const interests = new Set(d.interests || []);
    const areas = new Set(d.areas || []);
    inner = `<h1 class="onboard-title">What do you host?</h1>
      <p class="lede">Choose the event types and neighborhood that fit your venue.</p>
      <div class="select-grid preference-grid compact-select-grid onboard-tiles">${ONBOARD_INTEREST_OPTIONS.map(o => `<button class="select-tile${interests.has(o) ? " selected" : ""}" data-signup-interest="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("")}</div>
      <p class="settings-label">Venue neighborhood</p>
      <div class="select-grid preference-grid compact-select-grid onboard-tiles">${ONBOARD_AREA_OPTIONS.map(o => `<button class="select-tile${areas.has(o) ? " selected" : ""}" data-signup-area="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("")}</div>
      <p class="account-error" data-account-error></p>
      <button class="wide-button" data-onboard-finish>Enter venue dashboard</button>`;
  } else {
    const interests = new Set(d.interests || []);
    const areas = new Set(d.areas || []);
    inner = `<h1 class="onboard-title">What are you into?</h1>
      <p class="lede">Pick a few — we'll tune your feed to match.</p>
      <div class="select-grid preference-grid compact-select-grid onboard-tiles">${ONBOARD_INTEREST_OPTIONS.map(o => `<button class="select-tile${interests.has(o) ? " selected" : ""}" data-signup-interest="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("")}</div>
      <p class="settings-label">Neighborhoods you explore</p>
      <div class="select-grid preference-grid compact-select-grid onboard-tiles">${ONBOARD_AREA_OPTIONS.map(o => `<button class="select-tile${areas.has(o) ? " selected" : ""}" data-signup-area="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("")}</div>
      <p class="account-error" data-account-error></p>
      <button class="wide-button" data-onboard-finish>Enter Lokal</button>`;
  }

  document.body.insertAdjacentHTML("beforeend", `<div class="onboarding onboard-steps">
    <section class="onboard-card onboard-step-card">
      <div class="onboard-head"><button class="onboard-back" data-onboard-back aria-label="Back">&#8249;</button>${onboardProgressDots(step)}</div>
      ${inner}
    </section>
  </div>`);
}

function renderPhoneVerification() {
  document.body.insertAdjacentHTML("beforeend", `<div class="onboarding"><section class="onboard-card"><div class="onboard-logo">LOKAL</div><p class="step-count">VERIFY YOUR NUMBER</p><h1>${demoAuthConfig.useMockOtp ? "Demo verification." : "Check your messages."}</h1><p class="lede">${demoAuthConfig.useMockOtp ? `This shareable demo does not send texts. Use code <b>${demoAuthConfig.mockOtp}</b> for the mock profile tied to ${state.pendingSignupPhone}.` : `Enter the verification code sent to ${state.pendingSignupPhone}.`}</p><div class="account-fields"><input data-signup-code inputmode="numeric" autocomplete="one-time-code" placeholder="Verification code" aria-label="Verification code"><p class="account-error" data-account-error></p></div><button class="wide-button" data-verify-phone>Verify phone number</button></section></div>`);
}

function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message; el.classList.add("show");
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

function showWelcomeBanner() {
  if (!localStorage.getItem("lokalAccountCreated") || document.querySelector(".onboarding")) return;
  const existing = document.querySelector(".welcome-banner");
  if (existing) existing.remove();
  const firstName = state.profile.fullName.split(" ")[0] || "there";
  document.body.insertAdjacentHTML("afterbegin", `<div class="welcome-banner">Keep Exploring, <span>${escapeHtml(firstName)}</span></div>`);
  setTimeout(() => document.querySelector(".welcome-banner")?.classList.add("visible"), 30);
  setTimeout(() => document.querySelector(".welcome-banner")?.classList.remove("visible"), 2100);
  setTimeout(() => document.querySelector(".welcome-banner")?.remove(), 2600);
}

function showDiscoverHint() {
  if (localStorage.getItem("lokalOnboardingShown")) return;
  if (!localStorage.getItem("lokalAccountCreated")) return;
  if (document.querySelector(".onboarding") || document.querySelector(".discover-hint")) return;
  localStorage.setItem("lokalOnboardingShown", "true");
  document.body.insertAdjacentHTML("beforeend", `<div class="discover-hint" role="status"><p>Tap any event to save it, RSVP, or share with friends. Use the chips above to filter by what you're in the mood for.</p></div>`);
  const hint = document.querySelector(".discover-hint");
  if (!hint) return;
  setTimeout(() => hint.classList.add("visible"), 30);
  const dismiss = () => { hint.classList.remove("visible"); setTimeout(() => hint.remove(), 300); };
  hint.addEventListener("click", dismiss);
  setTimeout(dismiss, 6000);
}

function setRoute(route) {
  if (route === "map") route = "home";
  state.route = route;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  ({ home: renderHome, social: renderSocial, profile: renderProfile }[route] || renderHome)();
}
