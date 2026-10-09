# Almost Savings 8.0.1 — notification fix

Verified 2026-10-09. Apple app 6756276744; Google package com.sasarei.almostclean.

## Store status

- **Apple 8.0.1 (130): WAITING_FOR_REVIEW.** Defective 8.0.0 (129) submission removed. Existing version record, screenshots, review instructions, all localizations and MANUAL release mode preserved. Submission: 23910b92-3483-4b7f-97ee-5dd621e51aab. New build processed to VALID and attached before resubmission.
- **Google 8.0.1 (131): Changes in review.** Console accepted the submission; automatic quick checks run before Google starts review. Existing managed publishing is off: full rollout in the existing targeted countries follows approval. Previously published 8.0.0 (128) remains live while the update is reviewed.
- Android **en-US release notes match live 8.0.0 byte-for-byte**, as requested. All 14 note locales persisted and were read back from Google. Apple notes also saved/read back in 14 locales; existing 8.0 feature announcement retained with a localized notification-fix sentence.

## Artifacts and validation

- iOS: `builds/ios-export-130/Almost.ipa`, `builds/Almost-8.0.1-130.xcarchive`. Archive/export/upload passed. Production signatures, exact version/build and entitlements checked for the app and four extensions; Family Controls checked in app and three ShoppingBlocker extensions. Push environment is production. Exported JS matches the new archive and contains the anti-spam policy. Source commit 169924ed860da99c74c7c1e7f20423e855808f8f.
- Android: `builds/Almost-8.0.1-131-store.aab`, `builds/Almost-8.0.1-131-native-debug-symbols.zip`, provenance alongside AAB. Source commit d12ed75. Final signed AAB is 86,460,045 bytes; Google server SHA-256 matches the local file. Mapping and full native debug symbols attached in Console. Device support is unchanged, as verified by the Console preview.
- Android packaging follows the earlier store release: embedded native debug symbols are delivered separately. All 1,855 retained files match the generated AAB byte-for-byte, and all 36 symbol files match the separate ZIP. Upload key preserved. Final size gate passed below 100 MB. Uncommitted API upload edits were discarded; neither intermediate Android 130 nor API-staged 131 was published. Console submission uses the validated 131 file.
- `npm run release:gate` passed, including full verification, functional parity, localization, themes, attribution/native analytics and AppLovin cost checks. All 55 notification tests passed. iOS archive native analytics also checked. Android release build and iOS archive/export passed. Final signed Android size and signature checks passed. Existing lint/deprecation/size-growth warnings remain.

## Scope and limits

Automatic local notifications use the shared cap of four per local day with at least two hours between planned deliveries; deduplication, quiet hours and finite scheduling remain. Explicit user deadlines retain their timing. See [notification audit](../../qa/notification-audit-2026-10-09.md).

Screens, actions and visual hierarchy are unchanged by release preparation. Application localization is unchanged except version/build values; localization, theme and functional parity validators passed. No simulator, emulator or device app session was launched in this task. Actual OS notification delivery/batching and visual theme coverage were not reverified. Neither store's review is claimed approved and the update is not claimed publicly live.

Historical unrelated release audit gaps are recorded in [the existing QA report](../../qa/release-fixes-2026-10-08/REPORT.md); this notification hotfix does not close them.

`release-manifest.json` records artifact hashes and exact states. `checks/` contains local API readbacks, verification logs and Google review screenshot. Credentials are excluded.
