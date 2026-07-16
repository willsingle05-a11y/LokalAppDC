# Lokal iOS Launch Prep

The repo now has a Capacitor iOS wrapper started. Capacitor is free/open-source; the paid step comes later when you create an Apple Developer account for App Store/TestFlight distribution.

## Current native setup

- App name: Lokal
- Bundle id: com.lokalapp.dc
- Web build folder: dist
- iOS project folder: ios/
- Capacitor config: capacitor.config.json

## Free steps already completed

1. Installed Capacitor packages:
   - @capacitor/core
   - @capacitor/cli
   - @capacitor/ios
2. Added Capacitor config.
3. Generated the iOS project with `cap add ios`.
4. Built the Vite app.
5. Synced the built app into `ios/App/App/public`.

## Useful commands

- `npm.cmd run build` builds the web app.
- `cmd /c npx cap sync ios` copies the latest build into the iOS project.
- `npm.cmd run mobile:sync:prod` builds with `VITE_APP_MODE=production` and syncs the iOS project without the desktop demo sidebar.
- `cmd /c npx cap open ios` opens the project in Xcode on a Mac.

## When you create the Apple Developer account

1. Open the `ios/App/App.xcodeproj` or workspace from a Mac with Xcode.
2. Set your Apple Team under Signing & Capabilities.
3. Confirm bundle id `com.lokalapp.dc` is available in Apple Developer.
4. Set app icon and launch screen assets.
5. Archive the app in Xcode.
6. Upload to App Store Connect.
7. Test through TestFlight.
8. Submit for App Review.

## Before App Store submission

- Use `npm.cmd run mobile:sync:prod` for App Store-oriented builds so the desktop demo controls are hidden.
- Remove or disable remaining demo/bypass-only flows from the public product before submission.
- Publish Privacy Policy and Terms URLs using the drafts in this folder.
- Test the in-app account deletion request path.
- Confirm Supabase auth/profile/onboarding writes in production mode.
- Prepare screenshots, subtitle, keywords, support URL, and review notes.

## Launch prep docs

- `docs/app-store-metadata-draft.md`
- `docs/privacy-policy-draft.md`
- `docs/terms-of-service-draft.md`
- `docs/app-review-checklist.md`
