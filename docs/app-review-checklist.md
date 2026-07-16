# App Review Readiness Checklist

## Must Complete Before Submission

- Apple Developer account created.
- Bundle id `com.lokalapp.dc` registered.
- Signing team configured in Xcode.
- Production Privacy Policy URL published.
- Production Terms URL published.
- Support URL published.
- App icon replaced with final Lokal artwork.
- Splash screen replaced with final Lokal artwork.
- App Store screenshots created for required iPhone sizes.
- App Store metadata finalized.
- Review notes and test account finalized.
- Production auth path tested.
- Account deletion request tested.
- Venue verification request tested.
- Event submission request tested.
- Saved events and RSVP persistence tested.
- Demo action ledger tested in `public.app_action_events`.
- User-generated content moderation process documented.

## Apple Review Risk Areas

- Demo/bypass-only flows should not be visible in production builds.
- User-generated venue/event content needs review or moderation.
- Account deletion must be easy to find.
- Privacy labels must match actual data collection.
- Event prices, times, and links should not mislead users.

## Current Status

- Capacitor iOS wrapper exists.
- `npm.cmd run mobile:sync` succeeds.
- Account deletion request path exists and writes to Supabase once the migration is applied.
- Metadata, privacy policy, terms, and review notes have drafts.
- Demo actionability audit exists at `docs/demo-actionability-audit.md`.

## Remaining Paid or Mac-Only Work

- Apple Developer enrollment.
- Xcode signing.
- Archive upload to App Store Connect.
- TestFlight distribution.
