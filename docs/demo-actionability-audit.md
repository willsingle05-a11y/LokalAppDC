# Demo Actionability Audit

This document tracks whether visible demo actions are backed by Supabase, GitHub source, or a production-ready local state path.

## Backed By Dedicated Supabase Tables

- Onboarding profile submissions: `public.onboarding_submissions`
- Supabase auth profile sync: `public.profiles`
- Save, RSVP, and remove plan interactions: `public.event_interactions`
- Venue verification requests: `public.venue_verification_requests`
- Venue event submissions: `public.venue_event_submissions`
- Account deletion requests: `public.account_deletion_requests`
- Accepted friend relationships: `public.friend_relationships`
- Group creates, joins, invites, and leaves: `public.group_memberships`
- Group chat/event shares: `public.group_messages`
- Direct messages: `public.direct_messages`

## Backed By Generic Supabase Action Ledger

These actions are now logged to `public.app_action_events` so demo behavior is auditable before each area gets a final production table:

- Story posting
- Profile sharing
- Group/event sharing
- Add friends and invite actions
- Location enable intent
- Group pin actions
- Following and unfollowing users/venues
- Venue tools dismissal
- Profile photo changes
- Sign out
- Settings save
- Taste preference updates
- Friend request declines

## Still Needs Production-Specific Work

- Real native photo upload should use a Supabase Storage bucket instead of image URLs.
- Friend requests need a full pending-request workflow rather than only accepted relationship persistence.
- Group pinning can stay in the action ledger until group preference settings get a final table.
- Production auth should replace demo bypass links for App Store submission.
- Privacy policy and terms URLs need to be published outside the repo.

## GitHub Backing

All action code, schemas, and docs are versioned in GitHub. New schema files:

- `supabase/sql/app-action-events.sql`
- `supabase/sql/account-deletion-requests.sql`
- `supabase/sql/social-actions.sql`
