import "./styles/base.css";
import "./styles/round2.css";
import "./styles/redesign.css";
import "./styles/lokal-ds.css";

import coreSource from "./features/00-core.js?raw";
import demoProfilesSource from "./features/01-demo-profiles.js?raw";
import boMascotSource from "./features/02-bo-mascot.js?raw";
import supabaseSource from "./features/05-supabase.js?raw";
import scoringSource from "./features/06-scoring.js?raw";
import blendedFeedSource from "./features/07-blended-feed.js?raw";
import discoverSource from "./features/10-discover.js?raw";
import socialSource from "./features/30-social.js?raw";
import profileSource from "./features/40-profile.js?raw";
import eventsSource from "./features/50-events.js?raw";
import onboardingSource from "./features/60-onboarding.js?raw";
import interactionsSource from "./features/90-interactions.js?raw";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY || "";
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

function installPostHog() {
  if (!posthogKey || window.posthog?.__loaded) return;
  !function(t, e) {
    var o, n, p, r;
    e.__SV || (window.posthog = e, e._i = [], e.init = function(i, s, a) {
      function g(t, e) {
        var o = e.split(".");
        2 == o.length && (t = t[o[0]], e = o[1]);
        t[e] = function() { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); };
      }
      (p = t.createElement("script")).type = "text/javascript";
      p.crossOrigin = "anonymous";
      p.async = true;
      p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
      (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
      var u = e;
      void 0 !== a ? u = e[a] = [] : a = "posthog";
      u.people = u.people || [];
      u.toString = function(t) {
        var e = "posthog";
        return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e;
      };
      u.people.toString = function() { return u.toString(1) + ".people (stub)"; };
      o = "init capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags reloadFeatureFlags getFeatureFlag getFeatureFlagPayload get_property".split(" ");
      for (n = 0; n < o.length; n++) g(u, o[n]);
      e._i.push([i, s, a]);
    }, e.__SV = 1);
  }(document, window.posthog || []);

  window.posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    capture_pageview: false,
    autocapture: true,
    capture_performance: true
  });
}

installPostHog();

const posthogSeenUsers = new Set();

function posthogDirectCapture(name, properties = {}) {
  if (!posthogKey || !name) return;
  const distinctId = properties.user_key || properties.userId || properties.user_id || localStorage.getItem("lokalDemoInteractionUserId") || "lokal-anonymous";
  const payload = JSON.stringify({
    api_key: posthogKey,
    event: name,
    distinct_id: String(distinctId),
    properties
  });
  const url = `${posthogHost}/capture/`;
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    return;
  }
  fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

window.identifyAppUser = function identifyAppUser(userId, properties = {}) {
  if (!window.posthog || !userId) return;
  const cleanId = String(userId);
  const traits = {
    app: "lokal",
    account_type: properties.account_type || properties.accountType || "",
    ...properties
  };
  if (!posthogSeenUsers.has(cleanId)) {
    window.posthog.identify(cleanId, traits);
    posthogSeenUsers.add(cleanId);
  } else {
    window.posthog.people?.set?.(traits);
  }
};

window.trackAppEvent = function trackAppEvent(name, properties = {}) {
  if (!name) return;
  const userId = properties.user_key || properties.userId || properties.user_id || "";
  const eventProperties = {
    app: "lokal",
    app_mode: import.meta.env.VITE_APP_MODE || "development",
    route: document.body.dataset.route || properties.route || "",
    ...properties
  };
  if (window.posthog?.__loaded && window.posthog?.capture) {
    if (userId) window.identifyAppUser(userId, properties);
    window.posthog.capture(name, eventProperties);
    return;
  }
  posthogDirectCapture(name, eventProperties);
};

window.trackAppPageView = function trackAppPageView(route, properties = {}) {
  window.trackAppEvent("$pageview", {
    route,
    $current_url: window.location.href,
    $pathname: window.location.pathname,
    ...properties
  });
};

window.trackAppEvent("app_opened", { route: document.body.dataset.route || "boot" });

const appSessionStartedAt = Date.now();
let appSessionLastTrackedAt = appSessionStartedAt;

function trackAppSessionDuration(reason) {
  const now = Date.now();
  const durationSeconds = Math.round((now - appSessionStartedAt) / 1000);
  if (durationSeconds < 5 || now - appSessionLastTrackedAt < 15000) return;
  appSessionLastTrackedAt = now;
  window.trackAppEvent("app_session_ended", {
    duration_seconds: durationSeconds,
    reason,
    route: document.body.dataset.route || ""
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") trackAppSessionDuration("hidden");
});
window.addEventListener("pagehide", () => trackAppSessionDuration("pagehide"));

const featureScripts = [
  ["00-core.js", coreSource],
  ["01-demo-profiles.js", demoProfilesSource],
  ["02-bo-mascot.js", boMascotSource],
  ["05-supabase.js", supabaseSource],
  ["06-scoring.js", scoringSource],
  ["07-blended-feed.js", blendedFeedSource],
  ["10-discover.js", discoverSource],
  ["30-social.js", socialSource],
  ["40-profile.js", profileSource],
  ["50-events.js", eventsSource],
  ["60-onboarding.js", onboardingSource],
  ["90-interactions.js", interactionsSource]
];

const appSource = featureScripts
  .map(([name, source]) => `\n// ${name}\n${source}`)
  .join("\n");

const script = document.createElement("script");
script.textContent = `${appSource}\n//# sourceURL=/src/lokal-vite-app.js`;
document.body.appendChild(script);

// Hold the splash until the app has actually booted, with a short floor so it
// reads as a brand moment instead of a flash on a warm cache.
const splash = document.getElementById("lokal-splash");
if (splash) {
  const MIN_VISIBLE = 2100;
  const shownAt = performance.now();
  const dismiss = () => {
    const remaining = Math.max(0, MIN_VISIBLE - (performance.now() - shownAt));
    setTimeout(() => {
      splash.classList.add("is-hiding");
      setTimeout(() => splash.remove(), 500);
    }, remaining);
  };
  if (document.readyState === "complete") dismiss();
  else window.addEventListener("load", dismiss, { once: true });
}
