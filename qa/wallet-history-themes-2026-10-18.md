# Apple Pay history → category editor: Simulator QA, 18 October 2026

Tested fresh native Debug 8.0.1 (133), current dirty working tree over `738ad71`, Xcode 27.1 beta, x86_64/Rosetta. Dedicated iPhone 17 Simulator, iOS 26.5, 402×874 pt; English, default text size. Existing simulators and their data were not used for the test.

Native dylib SHA256: `517f285cae44c885d4d4782ad94754bc7108c65da9eb2ef6bd6d5937ff78d544`. Final QA JS bundle SHA256: `8bfdcca98e4a231d85ae961b4ab7e22a1848eac910b6b06d075d0a3928a13396`. Fingerprints of the affected application files remained unchanged during QA. No application source was edited in this task.

Fixture: one synthetic saved Apple Pay receipt, `qa-wallet-001`, merchant `QA Wallet Store`, USD 12.50, inserted into the real local native SQLite ledger. Theme and synthetic Premium cache were seeded locally. Final QA bundle used an empty RevenueCat key and localhost backend override; the native Metro loading banner was hidden in that temporary bundle only. An initial preparation run exposed Expo restoring the key from `.env`; it was excluded from the final test matrix. No purchase was performed. This is not a real Wallet/Shortcuts capture test or subscription entitlement test.

## Executed results

| Scenario | Result |
|---|---|
| E2E-001, light: recent Home history → selected receipt → Shopping to Food → Save | PASS |
| E2E-002, dark: same receipt after process restart → Food to Transport → Save | PASS |
| E2E-003, PRO indigo: same receipt after process restart → Transport to Health → Save | PASS |
| VIS-001…005, PRO emerald/sunset/gold/violet/aqua: cold launch, persisted Health entry, open editor and category picker | PASS |
| EXP-001, additional Progress/category-history route | BLOCKED before entry: Maestro XCUITest driver could not connect to its localhost port; no category-history result is claimed |

Each of the three E2E cases also opened the updated receipt through Home’s **View all** modal and Profile’s **History**, verified the editor, selected a different draft category (Rent), cancelled editing, and verified that the saved category remained in history. Modal dismissal completed before the next editor opened. The source label remained Automatic · Apple Pay. SQLite checks after each save and the final cold launches found exactly one receipt, the same ID, saved status, USD, and numeric amount 12.50; final category was Health. No duplicate expense appeared. Five additional PRO launches read that persisted Health category.

Totals for this scoped matrix: 8 passed, 0 product failures, 1 supplementary infrastructure block. Preparation/navigation-only flows are excluded from these counts.

## Visual and UX review

Opened original-resolution screenshots of the actual Home/Profile histories, selected-receipt editors and category pickers. Reviewed light/dark/PRO indigo and all five other PRO accents independently. Editor labels and input text were readable, surfaces and borders present, and Save expense visually primary; Delete and Close remained secondary. Category controls kept equal heights and centered labels; the longer Transport history title and Apple Pay metadata fit. Scrolling exposed additional category choices. No clipping, overlapping editor controls or stacked history modal was observed in the reviewed settled states.

Applied Apple Design and all seven project UX rules. Save, category choice, dismissal and cancellation remained functional. On the inspected native bar, first/middle/last icon and label centers were approximately 64/201/339 pt, with visual differences below about 2 pt; this is manual pixel review, not a complete cold/immediate/settled navigation geometry audit. Reopened the dark Transport history and gold editor for the adversarial review before cleanup.

Reviewed evidence included `light-category-selected`, `light-from-profile`, `light-cancel-preserved`, corresponding dark/PRO captures, and `accent-history`, `accent-editor`, `accent-picker` for each PRO accent. Screenshots, raw logs and temporary flows are intentionally removed under the repository cleanup policy; this summary is retained instead of links to deleted files.

## Commands and limits

- Fresh native build: `xcodebuild -workspace ios/Almost.xcworkspace -scheme Almost -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath <task-temp>/build -jobs 3 ARCHS=x86_64 ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO build` — BUILD SUCCEEDED.
- Device-selected Maestro flows exercised the actual app and native update bridge, with assertions and separate screenshot inspection.
- `npm run check:functional-parity` — PASS, 265 contracts / 2264 behavior fragments.
- `npm run check:localization` — PASS, all 12 dictionaries, native permission strings and shortcuts. No product text changed in this QA task.
- `npm run check:themes` — PASS, light/dark/pro and six PRO accents.
- `npm run check:analytics-contract` and `npm run check:native-analytics-config` — PASS.

Not covered: real Apple Pay automation delivery, release attribution/purchase paths, Android, other iOS runtimes and compact devices, RTL/other runtime locales, large text/VoiceOver, keyboard editing, reduced motion/transparency settings, save-error/retry paths, category-history/statistics/daily-summary entry routes. No general release GO or performance claim is made. The requested recent/full/Profile history scenario passed in all three themes on the named Simulator build.

## Cleanup

Cleanup completed and checked: removed the task DerivedData, bundles, compiler/Metro caches, screenshots, hierarchy dumps, raw logs, temporary flows and fixtures, plus the confirmed task-owned XCUITest output directory in the system temporary folder. Stopped the task Metro/workers and temporary bundle server. The synthetic receipt, seeded profile/Premium/preferences and developer bundle location were removed from the dedicated test installation; that simulator was shut down. Its registration and installed native shell were preserved under the no-device-erasure rule. Other simulators, servers (including another task's listener on 8097), shared dependencies/caches and build outputs were left untouched. Only this concise text summary is retained from this QA task.
