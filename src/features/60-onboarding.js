function renderOnboarding() {
  const signupEventOptions = ["Live music", "Nightlife", "Museums", "Sports", "Comedy", "Restaurants", "Performing arts", "Festivals", "Free events", "Markets"];
  const signupAreaOptions = ["Adams Morgan", "U Street", "Shaw", "Navy Yard", "Penn Quarter", "H Street", "Logan Circle", "Dupont", "Georgetown", "NoMa", "Capitol Hill", "Anacostia"];
  const steps = [
    { type: "welcome", title: "Your city,<br>in motion.", text: "Find the things worth leaving the house for, and see what your friends are into." },
    { type: "account", title: "Create your account.", text: "Pick what you like and where you want to explore. Lokal will use this to shape your feed." },
    { type: "contacts", title: "Find your people.", text: "See what friends save, build groups, and make plans without starting a new group chat." }
  ];
  const s = steps[state.onboardStep];
  const content = s.type === "welcome" ? `<div class="intro-art"><span>LOKAL</span></div><button class="wide-button" data-next>Get started</button>`
    : s.type === "account" ? `<div class="account-fields"><input data-signup-full-name placeholder="Full name" aria-label="Full name" autocomplete="name"><input data-signup-email placeholder="Email" type="email" aria-label="Email" autocomplete="email"><input data-signup-phone placeholder="Phone number" type="tel" inputmode="numeric" aria-label="Phone number" autocomplete="tel"><input data-signup-username placeholder="Public username" aria-label="Public username" autocomplete="username"><label class="birth-field">Birthday<input data-signup-birthdate type="date" aria-label="Birthday" autocomplete="bday"></label><input data-signup-password placeholder="Create a password" type="password" aria-label="Create a password" autocomplete="new-password"><small>Birthday must be in the past and age 14+. Phone numbers use (xxx) xxx-xxxx format.</small></div><p class="settings-label">Event interests</p><div class="select-grid preference-grid compact-select-grid">${signupEventOptions.map(o => `<button class="select-tile" data-signup-interest="${o}">${o}</button>`).join("")}</div><p class="settings-label">Areas to explore</p><div class="select-grid preference-grid compact-select-grid">${signupAreaOptions.map(o => `<button class="select-tile" data-signup-area="${o}">${o}</button>`).join("")}</div><p class="account-error" data-account-error></p><button class="wide-button" data-create-account>Create account</button>`
    : `<div class="contacts-art">${avatarStack(["AL","MR","DV","JS"])}</div><button class="wide-button" data-next>Sync contacts</button><button class="skip-button" data-next>Maybe later</button>`;
  document.body.insertAdjacentHTML("beforeend", `<div class="onboarding"><section class="onboard-card"><div class="onboard-logo">LOKAL</div><p class="step-count">${state.onboardStep === 0 ? "WELCOME TO LOKAL" : `STEP ${state.onboardStep} OF ${steps.length - 1}`}</p><h1>${s.title}</h1><p class="lede">${s.text}</p>${content}</section></div>`);
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
  const existing = document.querySelector(".welcome-banner");
  if (existing) existing.remove();
  const firstName = state.profile.fullName.split(" ")[0] || "there";
  document.body.insertAdjacentHTML("afterbegin", `<div class="welcome-banner">Keep Exploring, <span>${escapeHtml(firstName)}</span></div>`);
  setTimeout(() => document.querySelector(".welcome-banner")?.classList.add("visible"), 30);
  setTimeout(() => document.querySelector(".welcome-banner")?.classList.remove("visible"), 2100);
  setTimeout(() => document.querySelector(".welcome-banner")?.remove(), 2600);
}

function setRoute(route) {
  if (route === "map") route = "home";
  state.route = route;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  ({ home: renderHome, social: renderSocial, profile: renderProfile }[route] || renderHome)();
}
