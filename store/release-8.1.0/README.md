# Almost Savings 8.1.0 (137)

Release submitted to both stores on 2 November 2026. Apple is WAITING_FOR_REVIEW and Google Play is Changes in review. Both are configured to release after approval. Public availability is not claimed.

## Store operations

Google Play production release 85 is in **Changes in review**, with automated quick checks running. Managed publishing is off. After approval, rollout is 100% of the existing targeted countries. No supported devices were lost. The shipping AAB SHA-256 and all 14 localized release-note texts were read back through the API and matched the prepared files. ReTrace mapping and native debug symbols are attached in the console.

App Store Connect version `38f3bf6d-607d-4f87-8956-8dbc03f7093c` uses automatic release after approval. Release notes and evergreen promotional text cover all 14 existing locales and were read back byte-identically. Other listing text and screenshot associations are preserved. Apple required the new age-rating field `socialMedia`; it was set to false in the draft app-info declaration after verifying that the feed is personal and the app has no social-network/user-to-user messaging features. Other age-rating answers were preserved; before/after evidence is in `app-store-age-rating-change.json`. IPA upload and processing completed without errors or warnings. Build `105682ff-7b5a-431b-aa3a-4f6900e311f2` is VALID and selected. Review submission `393e63f1-9c93-425d-b7db-85216b1fd2d0` was accepted at 09:50:10 UTC (12:50:10 Riyadh) and both submission/version are WAITING_FOR_REVIEW. Final readback verified the selected build, release mode and all 14 locales.

Release notes describe Almi customization, care and room decoration, all temptations together in the main feed, and bug fixes. Promotional text describes pausing impulse purchases, recording the money users choose not to spend, and working toward personal goals with Almi. It does not describe a bank balance or promise automatic transfers.

## Versions, source and artifacts

Version 8.1.0 and build 137 agree across package/lockfile, Expo, Android Gradle, iOS and all extensions. Existing uncommitted application changes were included and preserved. Immutable source: `refs/codex/release-snapshots/8.1.0-137`, commit `960f1da0b6e553d9a59b2b23c50652277d2f6c66`. All 930 runtime/build/source files match that snapshot byte-for-byte.

- Android shipping AAB: 98,058,999 bytes. Size and release signature pass. Native symbols and ProGuard mapping were extracted for separate Play upload. All other 1,938 unsigned entries are byte-identical to the original Gradle AAB. No runtime files, assets, languages, ABIs or features were removed.
- Android QA Release APK has byte-identical JavaScript and all 87 native libraries compared with the shipping AAB.
- iOS shipping IPA: 112,911,441 bytes after lossless ZIP recompression. Every entry is byte-identical to the Xcode-exported IPA. App Store distribution signatures, profiles, version/build and stable Xcode build 27B52 pass for the application and four extensions. Production push and Family Controls entitlements are preserved.
- Xcode 27.2 (27B52) is the official stable release of 29 October 2026, checked against https://developer.apple.com/news/releases/ and https://developer.apple.com/xcode/system-requirements . Final IPA metadata reports iphoneos27.2 and 27B52.

## Verification

`npm run verify` passed in the original repository, isolated release source and final repository with the new shipping AAB. This includes functional parity, attribution/native analytics, localization, themes, typecheck, lint, security and backend tests. Existing warnings remain.

Functional parity passes 268 contracts, 2,334 behavior fragments and 45 reachability patterns. Localization passes all 12 app languages, native permission strings and shortcuts. New store text covers all 14 store locales. Static theme checks pass light/dark/PRO and six PRO accents. Final archived iOS plist and merged Android release manifest pass native analytics checks. Version bump and packaging introduce no app layout, action or display-copy changes.

Release runtime was observed on a dedicated iPhone 17 / iOS 26.5 simulator and Android 16 Google Play emulator. Both used Release configuration. The user explicitly authorized simulator/emulator execution in this chat.

- iOS: first-run onboarding with analytics and notifications declined; tutorial restart/recovery, feed card, amount slider, Almost Pay cancellation and double-confirmation, recorded $9 saving, result, optional reminder dismissal and persistence after relaunch. Almi feeding updated fullness; room previews and insufficient-balance state worked. Skins opened the paywall. Real products, prices and trial loaded; empty restore and Sandbox authentication cancellation returned correctly.
- Android: clean onboarding with analytics and notifications declined, intro skip, main feed, Almi, daily chest/reward and updated coin balance, room preview selection and insufficient-balance state, skins and paywall Billing error, dismissal and cold relaunch. A task-specific wrapper around the official Android Emulator enabled native UI verification after Maestro driver disconnects.
- Original-resolution iOS room and Android first-launch captures were inspected. Native rendering was sampled for feed/care/room/skins/paywall in light appearance. Apple Design, action hierarchy and seven UX laws were reviewed within the packaging/release scope. Full dark/PRO/accent, compact, RTL and accessibility-text matrices were not rerun. No complete visual or runtime performance PASS is claimed.

Known sampled coverage/findings: initial iOS tutorial required its recovery/restart action before the full decision journey passed; simulator Shopping Pause showed a synchronization error; Android feed's floating add control overlaps the trailing Freeze control in the sampled viewport. These app UI behaviors were not introduced or changed by this version/packaging task. Physical-device Shopping Pause, room purchase/equip with sufficient coins and activating premium skins remain untested.

## Explicit user decisions

1. AppLovin: both app-scoped tracking URLs and the Reporting API key are valid, but both 45-day platform reports returned HTTP 200/code 200 with zero results. The nonempty-report gate fails. The user confirmed AppLovin has long been inactive and authorized this release to proceed. No permanent check or attribution assertion was changed.
2. iOS size: the user explicitly authorized releasing the 112.9 MB IPA despite the existing 100 MB project budget. No budget/check was changed.
3. Purchases: iOS requires an unavailable Sandbox Apple Account, and Android returns BILLING_UNAVAILABLE. Successful subscription transactions and server revenue postbacks were not verified. The user explicitly authorized release with this coverage gap on both platforms. No real paid transaction was made.

Release verdict: GO WITH KNOWN RISK under those explicit decisions, not a complete purchase or visual validation verdict.

## Cleanup and retention

Cleanup is complete. Task emulator, build/test processes and orphan altool network log stream are stopped. The dedicated temporary directory, isolated worktree, dependency copies, build intermediates, QA screenshots, hierarchies, logs, fixtures, emulator overlay and helper application are removed. Task Xcode distribution logs are removed. Shared caches and other tasks' outputs were not cleared.

The task iOS simulator is shut down with its registration/data preserved. The existing Android AVD data was unchanged by the read-only task overlay. Other device sessions were not operated.

`builds/` retains only shipping IPA/AAB, Android native symbols, ProGuard mapping, Android JavaScript source map and release provenance for the active submission and crash symbolication. The iOS archive/dSYMs remain at `/Users/sasarei/Library/Developer/Xcode/Archives/2026-11-02/Almost-8.1.0-137.xcarchive`. Concise release metadata and immutable source ref are retained. Raw QA evidence is not retained under repository policy.
