# Almost 7.2.0 store release pack

This folder contains the version-specific text and handoff checklist for the iOS and Android release.

## Release identifiers

| Platform | Public version | Build identifier |
| --- | --- | --- |
| App Store Connect | `7.2.0` | `126` |
| Google Play | `7.2.0` | version code `126` |

The previous App Store build is `7.1.1 (125)`, so iOS build `126` is locally consistent. The Android project targets API 36.

If the build is created with EAS, check the resulting build number/version code before upload: `eas.json` uses remote app-version state and automatic build-number increments.

## App Store Connect

Use [app-store-connect-localizations.csv](./app-store-connect-localizations.csv) for every localization currently configured in App Store Connect. Paste `promotional_text` into **Promotional Text** and `whats_new` into **What's New in This Version**.

The configured App Store localizations are:

- English (U.S.)
- Arabic
- Chinese (Traditional)
- French
- German
- Italian
- Japanese
- Korean
- Portuguese (Brazil)
- Portuguese (Portugal)
- Russian
- Spanish (Mexico)
- Spanish (Spain)

Use [app-store-review-notes.txt](./app-store-review-notes.txt) to replace the stale review note that still refers to version 5.3.0.

Before submitting:

1. Create iOS version `7.2.0` and save all 13 localized promotional texts and release notes.
2. Upload and select build `126` after processing finishes.
3. Confirm the App Review contact phone and email. They appear empty on the currently approved version and are not safe to guess.
4. Replace the old App Review note with the supplied 7.2.0 note.
5. Recheck the new age-rating questions in **App Information**. App Store Connect warns that the social-media questions become required on September 7, 2026.
6. Confirm the subscription products are available to the submitted build and that restore/manage-subscription paths work.
7. Choose automatic or manual release intentionally, then submit the version to App Review.

Apple requires **What's New in This Version** for updates. It supports localization and up to 4,000 characters. Promotional Text is optional, localizable, and limited to 170 characters.

## Google Play

Paste [google-play-release-notes.txt](./google-play-release-notes.txt) into **What's new in this release?** after uploading the Android App Bundle. The file uses Play Console language tags and keeps each locale under the 500-character limit.

Before submitting:

1. Build a signed release AAB from a clean committed tree with `npm run release:android`.
2. Upload the AAB and confirm version name `7.2.0`, version code `126`, and target API 36 in Play Console.
3. Paste the localized release notes.
4. Review Play Console pre-review checks, Data safety, advertising ID, content rating, and subscription declarations for unresolved warnings.
5. Save the production release and send the changes for review. Use managed publishing if approval and public rollout should be separate.

The release-notes file adds `ja-JP`. If Japanese is not yet listed among the Play Store listing languages, add that store-listing translation first; Play Console only accepts release-note tags for languages supported by the listing.

Google Play allows up to 500 Unicode characters per language for release notes and says they should describe updates rather than serve as promotional copy.

The publishable Android build script intentionally stops until the environment contains `APPLOVIN_REPORTING_API_KEY` and exactly two app-scoped `APPLOVIN_TRACKING_URLS` values (Android and iOS). Follow [ATTRIBUTION_RELEASE_GATE.md](../../ATTRIBUTION_RELEASE_GATE.md) without committing or printing those secrets. The local check on September 2, 2026 could not pass this production-only step because those values were not present.

The same release-gate document defines the physical-device fresh-install and purchase evidence required before rollout. Static checks and store metadata do not replace that evidence.

## Repository verification

Run these gates before producing the final artifacts:

```sh
npm run check:functional-parity
npm run check:analytics-contract
npm run check:native-analytics-config
npm run check:localization
npm run check:themes
npm run verify
```

Do not launch a simulator or emulator without explicit approval.
