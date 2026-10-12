# iOS 8.0.1 (133) — paywall resubmission

Destination: Almost Savings, App Store ID `6756276744`, bundle `com.sasarei.almostclean`. Android is unchanged.

## Change

The approved iOS paywall removes the free-trial toggle. Eligible annual trials apply automatically, with the actual StoreKit trial duration and post-trial annual price shown. Ineligible customers purchase the regular package. Display and purchase use the same offer resolver; missing trial packages never silently fall back to paid purchases. Compact cards, an unclipped annual Best Value badge and subscription management in the footer preserve all existing actions.

## Metadata and assets

`metadata-baseline.json` preserves the exact existing promotional text and release notes for all 14 App Store locales. Both fields remain unchanged. All promotional text is within 170 characters and release notes within 4,000. `app-review-notes.txt` explains the Guideline 3.1.2(c) correction to Apple.

Existing `ASO 2026-10-09 savings-header` and `ASO 2026-10-09 savings-search` are assigned to version 8.0.1 and retained for the resubmission. Assigned assets are automatically included with the app-version review: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-assets-from-asset-library

## Verification

- `npm run verify`: PASS, including functional parity, localization (12 app languages), themes, attribution, native analytics, typecheck, lint, security, backend tests and release checks. Existing lint and size-growth warnings remain.
- `npm run check:applovin-cost`: PASS with the existing private release configuration.
- Seven iOS paywall package-selection regression tests: PASS.
- UX state/action and seven-law review: the purchase CTA remains the single primary action; plan selection and restore/manage/legal/dismiss actions remain functional. Loading, error/retry and accessibility states were reviewed in the browser harness.
- Approved browser preview reviewed in light, dark and PRO themes with all six PRO accents, supported app languages, compact screens and large text. Browser rendering is not native-device evidence. No simulator, emulator, native device app launch or StoreKit purchase was performed.
- The unrelated existing Maestro seed script uses injected globals. A scoped ESLint declaration fixes its previously failing lint check without altering the script or app behavior.

## Build and submission

Submitted successfully on 2026-10-12 at 11:28:45 UTC (14:28:45 Riyadh). Version **8.0.1 (133)** and the new submission **dc4d8e82-87cb-4c82-8936-8358bbd72825** are **WAITING_FOR_REVIEW**. Header and Search Results assets independently read back as **WAITING_FOR_REVIEW** with the same submission-time modification timestamp. All 14 promotional texts and release notes remain byte-identical to the baseline. Release mode remains **MANUAL**.

The build uses Xcode 26.6 (17F113), iOS SDK 26.5. Archive/export, final distribution signatures and production entitlements for the app and four extensions, native analytics configuration and the 96,449,956-byte IPA size all passed. No device was launched. Compiler compatibility flags are recorded in the manifest.

Apple returned HTTP 500 when resolving the prior rejected review item. Its submission was canceled and a new submission created with the same version, selected build 133, metadata and assigned assets. Both submission and selected-build state were read back successfully.

Temporary IPA copies, build intermediates, task cache, raw logs, validation dumps, scripts and screenshots were removed. The active build 133 archive with dSYMs remains in the standard Xcode archive folder for this review/re-export and crash symbolication; uploaded build 132 dSYMs are also preserved. The approved HTML design source remains as a design reference. Unrelated older artifacts and user screenshots were preserved.

Build 132 was uploaded successfully but Apple blocked App Review submission because its beta Xcode 27.1 SDK is not supported. The same application code was rebuilt with the installed Xcode 26.6 as build 133. Build 132 temporary artifacts and full archive were removed; its uploaded-build dSYMs remain for crash symbolication.
