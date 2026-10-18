# Almost Savings 8.0.2 (136)

Release prepared and submitted on 2026-10-18. Previous live version on both platforms: 8.0.1.

- Apple: WAITING_FOR_REVIEW; release mode AFTER_APPROVAL. Submission `cf60505f-769e-43a7-905b-3d2bfd6fe9c7`. Build 136 is VALID and selected.
- Google Play: Changes in review. Quick checks are running; delivery to review queues after their successful completion. Managed publishing is off; rollout after approval is 100% of the existing targeted countries. No device support was lost.
- Release notes cover all 14 existing locales on each store. Apple promotional text also covers all 14 locales. All texts were read back and matched the prepared text. Google bundle SHA-256 was verified against the final local AAB.

## Changes in this task

Version 8.0.2 and build 136 are synchronized across package/lockfile, Expo, Android, iOS and extensions. Existing uncommitted application changes were included without committing or resetting the user's branch. Exact source is preserved at `refs/codex/release-snapshots/8.0.2-136` (`0488f6147b5e61bdce9f5fcaae84c0b84e33fcbd`). The source-manifest hashes match the current application source.

The AppLovin reporting gate timeout was increased from 20 to 90 seconds after a valid live report took 61.5 seconds. Validation was preserved; the gate subsequently accepted ten app-scoped cost rows across both platforms.

## Verification

- `npm run verify`: PASS, including functional parity, attribution contracts, native analytics, localization, themes, typecheck, lint, security and backend tests. Functional parity: 266 contracts, 2,280 behavior fragments, 45 reachability patterns. Existing warnings remain.
- `npm run release:gate`: PASS in the clean isolated Android source snapshot, including the live AppLovin API check.
- Explicit localization, theme and functional-parity gates: PASS. Task-added display text is store metadata, localized across all existing store locales; no in-app copy or UI layout was changed by this task.
- Final iOS IPA: 95,966,438 bytes, size PASS; App Store distribution signatures/profiles for app and four extensions PASS. Production push and Family Controls entitlements preserved. Archived native analytics check PASS.
- Final Android AAB: 85,949,532 bytes, size/signature PASS. All 1,849 runtime/configuration entries match the original Gradle bundle byte-for-byte; native symbols were preserved and uploaded. ReTrace mapping is attached. Merged release manifest analytics check PASS.
- Android test APK has byte-identical JavaScript and 81 native libraries to the submitted AAB.
- `git diff --check`: PASS. Inspected changed filenames and version/string diffs. Existing work from other tasks was preserved.

## Runtime, UX and limits

Actual Release configuration was tested on a dedicated iPhone 17 / iOS 26.5 simulator and Android 16 emulator. First launch, onboarding with product analytics declined, tutorial skip, Profile and paywall opening were observed. iOS loaded products; restore with no active subscription displayed the expected empty result; store authentication cancellation returned to the paywall. AppsFlyer and RevenueCat endpoint activity was observed on iOS independently of declined product analytics. Android displayed the subscription loading error state without a signed-in Play account; a successful Android purchase was not established.

Successful subscription purchase and its server revenue postback were explicitly skipped at the user's instruction after sandbox authentication repeatedly returned to the login prompt. This is a known accepted coverage gap, not a passing transaction test. No real paid transaction was made. Release verdict: GO WITH KNOWN RISK under that explicit instruction.

Original-resolution English/light onboarding, home/profile and paywall states were inspected selectively. The complete light/dark/PRO accent, localization, compact-device and accessibility matrix was not rerun; no full visual PASS or performance improvement is claimed. The simulator showed a Shopping Pause synchronization error; real-device Screen Time behavior was not verified in this pass. No unrelated UI redesign was undertaken.

Initial iOS Maestro hierarchy execution failed in the driver; native UI control provided the observed iOS flow evidence. The initial Android flow used an obsolete skip label; the corrected flow used observed text and passed. Raw screenshots and driver/build logs are disposable and removed under the repository cleanup policy.

## Retained release material

`builds/` retains the shipping IPA, shipping AAB, Android native symbols and provenance for the active store reviews and crash symbolication. The iOS Release archive with dSYMs remains at `/Users/sasarei/Library/Developer/Xcode/Archives/2026-10-18/Almost-8.0.2-136.xcarchive`. Exact source is retained by the Git ref above. Task simulator/emulator registrations and data are preserved without erasure; both were shut down. Other tasks' devices and artifacts were left alone.

The Google Play Console publishing window remains available to view the active review. Temporary source copies, build intermediates, dependency copies, screenshots, logs, fixtures and helpers from this task are removed; only this concise summary, the release metadata/manifest and active release material remain.
