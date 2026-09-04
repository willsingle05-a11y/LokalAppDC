function profileToFriendRow(profile) {
  const initials = profile.initials || profile.avatar_initials || profileInitials(profile.fullName || profile.full_name || profile.display_name || "");
  const fullName = profile.fullName || profile.full_name || profile.display_name || "";
  const username = String(profile.username || "").replace(/^@/, "");
  const mutuals = profile.mutuals || "";
  const bio = profile.bio || profile.home_city || (Array.isArray(profile.neighborhoods) ? profile.neighborhoods.join(", ") : "") || "Washington, DC";
  return [initials, fullName, username ? `@${username}` : "", mutuals, bio, profile.id || profile.user_id || ""];
}
