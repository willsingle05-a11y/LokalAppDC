import "./styles/base.css";
import "./styles/round2.css";
import "./styles/redesign.css";

import coreSource from "./features/00-core.js?raw";
import demoProfilesSource from "./features/01-demo-profiles.js?raw";
import supabaseSource from "./features/05-supabase.js?raw";
import scoringSource from "./features/06-scoring.js?raw";
import blendedFeedSource from "./features/07-blended-feed.js?raw";
import discoverSource from "./features/10-discover.js?raw";
import socialSource from "./features/30-social.js?raw";
import profileSource from "./features/40-profile.js?raw";
import eventsSource from "./features/50-events.js?raw";
import onboardingSource from "./features/60-onboarding.js?raw";
import interactionsSource from "./features/90-interactions.js?raw";

const featureScripts = [
  ["00-core.js", coreSource],
  ["01-demo-profiles.js", demoProfilesSource],
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
