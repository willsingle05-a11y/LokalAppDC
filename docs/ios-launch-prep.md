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

- Remove demo/bypass-only flows from the public product.
- Add Privacy Policy and Terms URLs.
- Add or document account deletion.
- Confirm Supabase auth/profile/onboarding writes in production mode.
- Prepare screenshots, subtitle, keywords, support URL, and review notes.