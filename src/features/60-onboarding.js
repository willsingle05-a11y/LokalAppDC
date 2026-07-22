// Inspirational lines that rotate on the welcome screen (CSS-animated).
const ONBOARD_ROTATOR_LINES = ["The city is in motion.", "Find your people.", "Find your home in DC.", "Never miss the moment."];

// The little person mark used on the welcome letter and the login/reset screens.
const LOKAL_MARK_SVG = `<svg width="40" height="40" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="18" cy="12" r="5" stroke="#2D5A2D" stroke-width="1.8"/>
  <path d="M8 30c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#2D5A2D" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M18 22v8M14 28l4 2 4-2" stroke="#2D5A2D" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// A warm, hand-typed welcome letter from the founders. Each block is typed out in
// sequence with a blinking cursor; green segments (g:true) are the emphasized words.
// `role` drives styling/placement: greeting + body flow as the message; from + sign
// are the closing signature. Edit the blocks freely — the markup is generated from
// this array, so adding or removing a block never desyncs the layout.
const WELCOME_LETTER_BLOCKS = [
  { role: "greeting", speed: 46, segs: [{ t: "hey, friend" }] },
  { role: "body", speed: 30, segs: [{ t: "As " }, { t: "DC locals", g: true }, { t: ", we know this city has so much more than meets the eye, but most people just never find it." }] },
  { role: "body", speed: 32, segs: [{ t: "So...we built Lokal because we want to get the most out of our " }, { t: "lives;", g: true }, { t: " to experience more with more " }, { t: "people", g: true }, { t: "." }] },
  { role: "body", speed: 34, segs: [{ t: "And we bet you are here because you feel the same way." }] },
  { role: "body", speed: 34, segs: [{ t: "come " }, { t: "join the community", g: true }, { t: " :)" }] },
  { role: "from", speed: 40, segs: [{ t: "your friends," }] },
  { role: "sign", speed: 44, segs: [{ t: "Jack, Will & Reese" }] }
];

const WELCOME_LETTER_ROLE_CLASS = { greeting: "letter-line", body: "letter-mono", from: "letter-from", sign: "letter-sign" };

// Build the letter markup straight from WELCOME_LETTER_BLOCKS. Message blocks
// (greeting/body) stack in the flowing body; the signature (from/sign) sits in the
// footer above the buttons. Each paragraph carries its array index as data-letter.
function welcomeLetterMarkup() {
  const bodyHtml = WELCOME_LETTER_BLOCKS
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.role !== "from" && block.role !== "sign")
    .map(({ block, index }, position) => `${position > 0 ? '<div class="letter-sp"></div>' : ""}<p class="${WELCOME_LETTER_ROLE_CLASS[block.role] || "letter-mono"}" data-letter="${index}"></p>`)
    .join("");
  const footHtml = WELCOME_LETTER_BLOCKS
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.role === "from" || block.role === "sign")
    .map(({ block, index }) => `<p class="${WELCOME_LETTER_ROLE_CLASS[block.role]}" data-letter="${index}"></p>`)
    .join("");
  return `<div class="letter-screen">
        <div class="letter-logo">${LOKAL_MARK_SVG}</div>
        <div class="letter-body">${bodyHtml}</div>
        <div class="letter-foot">
          ${footHtml}
          <button class="letter-btn letter-cta show" data-onboard-start data-account-type="person">get started</button>
          <button class="letter-venue-link letter-cta show" data-onboard-start data-account-type="venue">have a venue? join here</button>
        </div>
      </div>`;
}

function welcomeLetterTotal(segs) {
  return segs.reduce((sum, seg) => sum + [...seg.t].length, 0);
}

// Build the partial HTML for a block, revealing `upTo` characters, wrapping the
// emphasized segments in a green span.
function welcomeLetterHtml(segs, upTo) {
  let count = 0;
  let html = "";
  for (const seg of segs) {
    let piece = "";
    for (const character of [...seg.t]) {
      if (count >= upTo) break;
      piece += escapeHtml(character);
      count++;
    }
    if (piece) html += seg.g ? `<span class="letter-g">${piece}</span>` : piece;
    if (count >= upTo) break;
  }
  return html;
}

// Runs the typewriter reveal after the welcome letter is inserted. Tapping the
// letter (anywhere but a button) fast-forwards to the end; reduced-motion users
// get the whole letter instantly.
async function playWelcomeLetter() {
  const screen = document.querySelector(".onboard-letter-screen");
  if (!screen || screen.dataset.played) return;
  screen.dataset.played = "1";
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const reveal = () => { screen.querySelectorAll(".letter-cta").forEach(node => node.classList.add("show")); };
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let skip = reduce;
  screen.addEventListener("click", event => { if (!event.target.closest("button")) skip = true; });

  const typeBlock = async (block, index) => {
    const el = screen.querySelector(`[data-letter="${index}"]`);
    if (!el) return;
    const total = welcomeLetterTotal(block.segs);
    if (skip) { el.innerHTML = welcomeLetterHtml(block.segs, total); return; }
    const cursor = document.createElement("span");
    cursor.className = "letter-cur";
    for (let i = 1; i <= total; i++) {
      if (skip) break;
      el.innerHTML = welcomeLetterHtml(block.segs, i);
      el.appendChild(cursor);
      await sleep(block.speed + (Math.random() * 16 - 8));
    }
    el.innerHTML = welcomeLetterHtml(block.segs, total);
  };

  await sleep(skip ? 0 : 380);
  for (const [index, block] of WELCOME_LETTER_BLOCKS.entries()) {
    await typeBlock(block, index);
    if (!skip) await sleep(block.speed * 4);
  }
  reveal();
}

// Returning users who have logged out land here: re-enter email / username / phone
// + password. Warm styling mirrors the welcome letter.
function renderLogin() {
  document.querySelector(".onboarding")?.remove();
  const lastIdentifier = localStorage.getItem("lokalLastIdentifier") || "";
  document.body.insertAdjacentHTML("beforeend", `<div class="onboarding onboard-letter-screen auth-screen">
    <div class="letter-screen auth-card">
      <div class="letter-logo">${LOKAL_MARK_SVG}</div>
      <h1 class="auth-title">welcome back</h1>
      <p class="auth-sub">log in to pick up right where you left off.</p>
      <div class="auth-fields">
        <label class="letter-field"><span>email, username, or phone</span><input data-login-id type="text" autocomplete="username" value="${escapeHtml(lastIdentifier)}" placeholder="you@email.com"></label>
        <label class="letter-field"><span>password</span><input data-login-password type="password" autocomplete="current-password" placeholder="your password"></label>
      </div>
      <button class="letter-link-right" data-show-forgot>forgot password?</button>
      <p class="account-error" data-account-error></p>
      <button class="letter-btn show" data-login-submit>log in</button>
      <p class="auth-swap">new to lokal? <button class="letter-inline-link" data-show-signup>create an account</button></p>
    </div>
  </div>`);
}

// Password recovery — sends a Supabase reset email.
function renderForgotPassword() {
  document.querySelector(".onboarding")?.remove();
  const lastIdentifier = localStorage.getItem("lokalLastIdentifier") || "";
  const prefill = lastIdentifier.includes("@") ? lastIdentifier : "";
  document.body.insertAdjacentHTML("beforeend", `<div class="onboarding onboard-letter-screen auth-screen">
    <div class="letter-screen auth-card">
      <div class="letter-logo">${LOKAL_MARK_SVG}</div>
      <h1 class="auth-title">reset your password</h1>
      <p class="auth-sub">enter your email and we'll send you a link to set a new one.</p>
      <div class="auth-fields">
        <label class="letter-field"><span>email</span><input data-reset-email type="email" autocomplete="email" value="${escapeHtml(prefill)}" placeholder="you@email.com"></label>
      </div>
      <p class="account-error" data-account-error></p>
      <button class="letter-btn show" data-reset-submit>send reset link</button>
      <p class="auth-swap"><button class="letter-inline-link" data-show-login>&#8249; back to log in</button></p>
    </div>
  </div>`);
}
const ONBOARD_INTEREST_OPTIONS = ["Live music", "Concerts", "Nightlife", "Happy hours", "Trivia", "Museums", "Performing arts", "Comedy", "Sports", "Festivals", "Food & drink", "Markets", "Community", "Free events"];
const ONBOARD_AREA_OPTIONS = ["Adams Morgan", "U Street", "Shaw", "Navy Yard", "Penn Quarter", "H Street", "Logan Circle", "Dupont", "Georgetown", "NoMa", "Capitol Hill", "Anacostia", "Columbia Heights", "Petworth", "The Wharf", "Downtown"];

function onboardProgressDots(active) {
  return `<div class="onboard-progress" aria-label="Step ${active} of 3">${[1, 2, 3].map(n => `<span class="${n <= active ? "on" : ""}"></span>`).join("")}</div>`;
}

function startOnboardingFlow(accountType = "person") {
  state.signupDraft = { accountType: accountType || "person" };
  state.onboardStep = 1;
  document.querySelector(".onboarding")?.remove();
  requestAnimationFrame(() => renderOnboarding());
}

// Streamlined signup: an immersive, animated welcome, then three quick steps
// (name -> contact -> interests & neighborhoods). Interests + neighborhoods feed
// feed curation. Answers accumulate in state.signupDraft across steps.
function renderOnboarding() {
  state.signupDraft = state.signupDraft || {};
  const d = state.signupDraft;
  const step = state.onboardStep || 0;

  if (step === 0) {
    document.body.insertAdjacentHTML("beforeend", `<div class="onboarding onboard-letter-screen">${welcomeLetterMarkup()}</div>`);
    document.querySelectorAll("[data-onboard-start]").forEach(button => button.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      startOnboardingFlow(button.dataset.accountType || "person");
    }, { once: true }));
    playWelcomeLetter();
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
        <label class="float-field"><span>Venue image URL</span><input data-onboard-venue-image type="url" value="${escapeHtml(d.venueImageUrl || "")}" placeholder="https://..."></label>
        <label class="float-field"><span>Venue description</span><textarea data-onboard-venue-description placeholder="Beer garden, patio crowd, trivia, watch parties...">${escapeHtml(d.venueDescription || "")}</textarea></label>
      </div>
      <p class="account-error" data-account-error></p>
      <button class="wide-button" data-onboard-venue>Continue</button>`;
  } else if (step === 1) {
    inner = `<h1 class="onboard-title">First, what should we call you?</h1>
      <p class="lede">So your friends know it's really you.</p>
      <div class="onboard-fields">
        <label class="float-field"><span>First name</span><input data-onboard-first value="${escapeHtml(d.firstName || "")}" autocomplete="given-name" placeholder="Alex"></label>
        <label class="float-field"><span>Last name</span><input data-onboard-last value="${escapeHtml(d.lastName || "")}" autocomplete="family-name" placeholder="Rivera"></label>
      </div>
      <p class="account-error" data-account-error></p>
      <button class="wide-button" data-onboard-name>Continue</button>`;
  } else if (step === 2) {
    const isVenueContact = d.accountType === "venue";
    inner = `<h1 class="onboard-title">${isVenueContact ? "Who manages this venue?" : "Let's set up your login."}</h1>
      <p class="lede">${isVenueContact ? "Add the owner or manager contact attached to this venue account." : "This is how you'll get back in and keep your plans in sync — even on a new phone."}</p>
      <div class="onboard-fields">
        ${isVenueContact ? `<label class="float-field"><span>First name</span><input data-onboard-first value="${escapeHtml(d.firstName || "")}" autocomplete="given-name" placeholder="Alex"></label>
        <label class="float-field"><span>Last name</span><input data-onboard-last value="${escapeHtml(d.lastName || "")}" autocomplete="family-name" placeholder="Rivera"></label>` : ""}
        <label class="float-field"><span>Email</span><input data-onboard-email type="email" value="${escapeHtml(d.email || "")}" autocomplete="email" placeholder="you@email.com"></label>
        <label class="float-field"><span>Phone number</span><input data-onboard-phone type="tel" inputmode="numeric" maxlength="14" value="${escapeHtml(d.phone || "")}" autocomplete="tel" placeholder="(202) 555-0100"></label>
        <label class="float-field"><span>Password</span><input data-onboard-password type="password" value="${escapeHtml(d.password || "")}" autocomplete="new-password" placeholder="At least 8 characters"></label>
        <label class="float-field"><span>Confirm password</span><input data-onboard-password-confirm type="password" value="${escapeHtml(d.password || "")}" autocomplete="new-password" placeholder="Re-enter your password"></label>
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
      <p class="section-subnote">Choose one primary location.</p>
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

function resetAppScroll() {
  const scrollers = [
    window,
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.querySelector(".demo-stage"),
    document.querySelector(".app-shell"),
    document.querySelector("#app")
  ].filter(Boolean);
  const reset = () => scrollers.forEach(scroller => {
    if (scroller === window) scroller.scrollTo({ top: 0, left: 0, behavior: "auto" });
    else {
      scroller.scrollTop = 0;
      scroller.scrollLeft = 0;
    }
  });
  reset();
  requestAnimationFrame(reset);
  setTimeout(reset, 80);
}
