const demoProfileSeeds = [
  { initials: "AL", fullName: "Ana Lopez", username: "analopes", phone: "+12025550101", birthdate: "1998-04-18", mutuals: "8 mutual friends", bio: "New to DC / Live music + food" },
  { initials: "MR", fullName: "Marcus Reed", username: "marcusdc", phone: "+12025550102", birthdate: "1995-09-03", mutuals: "5 mutual friends", bio: "DC local / Fitness + markets" },
  { initials: "JS", fullName: "Jules Kim", username: "julesk", phone: "+12025550103", birthdate: "1999-01-27", mutuals: "6 mutual friends", bio: "DC local / Music + nightlife" },
  { initials: "DV", fullName: "Dev Shah", username: "devaroundtown", phone: "+12025550104", birthdate: "1997-07-14", mutuals: "3 mutual friends", bio: "Exploring DC / Art + film" },
  { initials: "ET", fullName: "Elena Torres", username: "elenaarounddc", phone: "+12025550105", birthdate: "1996-11-21", mutuals: "7 mutual friends", bio: "Capitol Hill / Patios + galleries" },
  { initials: "PL", fullName: "Priya Lee", username: "priyaleedc", phone: "+12025550106", birthdate: "2000-05-09", mutuals: "4 mutual friends", bio: "New to DC / Food + art" },
  { initials: "NW", fullName: "Nia Williams", username: "nianights", phone: "+12025550107", birthdate: "1998-08-12", mutuals: "2 mutual friends", bio: "Shaw / Comedy, dancing, and late-night food" },
  { initials: "CB", fullName: "Chris Bennett", username: "chrisb", phone: "+12025550108", birthdate: "1994-12-30", mutuals: "5 mutual friends", bio: "Navy Yard / Sports, rooftops, and trivia" },
  { initials: "SK", fullName: "Sofia Kim", username: "sofiak", phone: "+12025550109", birthdate: "2001-03-05", mutuals: "3 mutual friends", bio: "Adams Morgan / Coffee walks + shows" },
  { initials: "AM", fullName: "Avery Morgan", username: "averymoves", phone: "+12025550110", birthdate: "1997-02-16", mutuals: "6 mutual friends", bio: "Logan Circle / Run clubs and low-key hangs" },
  { initials: "TH", fullName: "Theo Harris", username: "theohdc", phone: "+12025550111", birthdate: "1995-06-22", mutuals: "4 mutual friends", bio: "H Street / DJs, pop-ups, and soccer bars" },
  { initials: "MK", fullName: "Maya Kapoor", username: "mayainthecity", phone: "+12025550112", birthdate: "1999-10-02", mutuals: "7 mutual friends", bio: "Dupont / Museums, wine bars, and book clubs" },
  { initials: "LB", fullName: "Leo Brooks", username: "leobrooks", phone: "+12025550113", birthdate: "1996-01-19", mutuals: "2 mutual friends", bio: "Brookland / Community events and farmers markets" },
  { initials: "GT", fullName: "Grace Turner", username: "gracetdc", phone: "+12025550114", birthdate: "1998-07-08", mutuals: "5 mutual friends", bio: "Georgetown / Gallery openings and live jazz" },
  { initials: "RJ", fullName: "Ryan James", username: "ryanrounddc", phone: "+12025550115", birthdate: "1993-04-25", mutuals: "3 mutual friends", bio: "U Street / Concerts, comedy, and pickup games" },
  { initials: "IC", fullName: "Isabel Cruz", username: "isabelcruzdc", phone: "+12025550116", birthdate: "2000-09-18", mutuals: "4 mutual friends", bio: "Columbia Heights / Food halls and dance nights" },
  { initials: "OA", fullName: "Owen Adams", username: "owenout", phone: "+12025550117", birthdate: "1997-12-11", mutuals: "6 mutual friends", bio: "NoMa / Outdoor movies, markets, and patios" },
  { initials: "ZH", fullName: "Zara Hassan", username: "zaralokal", phone: "+12025550118", birthdate: "1999-05-28", mutuals: "8 mutual friends", bio: "Mount Pleasant / Art, volunteering, and coffee" },
  { initials: "BM", fullName: "Ben Miller", username: "benindc", phone: "+12025550119", birthdate: "1994-03-31", mutuals: "2 mutual friends", bio: "Capitol Riverfront / Nats games and rooftops" },
  { initials: "CW", fullName: "Camila Wright", username: "camilaw", phone: "+12025550120", birthdate: "1998-11-04", mutuals: "5 mutual friends", bio: "Petworth / Trivia, karaoke, and street fairs" },
  { initials: "SN", fullName: "Sam Nguyen", username: "samfinds", phone: "+12025550121", birthdate: "1996-08-29", mutuals: "7 mutual friends", bio: "Union Market / New restaurants and design events" },
  { initials: "HK", fullName: "Harper King", username: "harpergoes", phone: "+12025550122", birthdate: "2001-02-07", mutuals: "3 mutual friends", bio: "Tenleytown / College events and free concerts" },
  { initials: "EP", fullName: "Eli Parker", username: "eliparker", phone: "+12025550123", birthdate: "1995-10-14", mutuals: "4 mutual friends", bio: "Southwest / Theater, waterfront walks, and jazz" },
  { initials: "QD", fullName: "Quinn Davis", username: "quinndc", phone: "+12025550124", birthdate: "1999-06-06", mutuals: "5 mutual friends", bio: "Ivy City / DJs, breweries, and bike rides" },
  { initials: "FT", fullName: "Fatima Thompson", username: "fatimathompson", phone: "+12025550125", birthdate: "1997-09-20", mutuals: "6 mutual friends", bio: "Woodley Park / Wellness, parks, and museums" },
  { initials: "JP", fullName: "Jonah Patel", username: "jonahp", phone: "+12025550126", birthdate: "1994-01-10", mutuals: "2 mutual friends", bio: "Downtown / Networking, sports, and happy hours" },
  { initials: "RO", fullName: "Riley Ochoa", username: "rileyo", phone: "+12025550127", birthdate: "2000-12-02", mutuals: "3 mutual friends", bio: "Anacostia / Community markets and live music" },
  { initials: "MH", fullName: "Mina Hughes", username: "minahughes", phone: "+12025550128", birthdate: "1998-05-17", mutuals: "5 mutual friends", bio: "Cleveland Park / Book clubs and gallery days" },
  { initials: "KT", fullName: "Kai Thomas", username: "kaithomas", phone: "+12025550129", birthdate: "1996-07-26", mutuals: "4 mutual friends", bio: "Takoma / Festivals, yoga, and volunteer days" },
  { initials: "LS", fullName: "Lena Scott", username: "lenascott", phone: "+12025550130", birthdate: "1999-03-13", mutuals: "6 mutual friends", bio: "Bloomingdale / Brunch, patios, and local shows" }
];

function profileToFriendRow(profile) {
  const initials = profile.initials || profileInitials(profile.fullName || profile.full_name || "");
  const fullName = profile.fullName || profile.full_name || "Lokal Friend";
  const username = String(profile.username || "").replace(/^@/, "");
  const mutuals = profile.mutuals || `${2 + (fullName.length % 7)} mutual friends`;
  const bio = profile.bio || "Washington, DC";
  return [initials, fullName, `@${username}`, mutuals, bio];
}
