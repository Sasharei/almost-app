# Native practice tutorial QA — 2026-10-03/04

The reported dead buttons were reproduced and fixed. The SVG dim mask intercepted iOS touches despite its SVG-level pointer setting. It now sits inside a native `View pointerEvents="none"`. The tour also used a stacking level above in-tree product dialogs; it now sits at 900 below the existing dialog hosts at 1000. Outside-spotlight responder blockers remain active. Two additive functional assertions protect these fixes.

## Environment

- App/package: `com.sasarei.almostclean`, version 8.0.0; Android versionCode 128.
- Existing native debug installations with current working-tree JavaScript served by Metro on port 8081. HEAD was `160fd606bd2f9a41d8357d0bc014f166385ca6a8`; this dirty working tree is the tested implementation, not a release build of that commit.
- iOS 26.5, Almost Shopping Pause QA 26.5, UUID `9D59A3C2-2DDE-4844-9311-A2A747CF3F55`, 1206×2622 native captures.
- Android 16 / API 36, `sdk_gphone64_arm64`, AVD Almost_Decision_Followup_QA, serial `emulator-5554`, 1280×2856 native captures.
- Maestro drove actual native controls, keyboard input, gestures and app stop/relaunch. No browser reconstruction was used as evidence.
- Synthetic local purchase records, English, USD. Original local product storage was backed up, restored after testing, and compared byte-for-byte on both devices. No store purchase or subscription transaction was made. The iOS notification prompt was denied during the pause path.

## Executed scenarios

| Scenario | iOS | Android | Evidence directory under `artifacts/practice-tutorial/` |
| --- | --- | --- | --- |
| Highlighted Make a decision → actual card → amount field | PASS | PASS | `ios-core`, `android-core-confirm` |
| Numeric keyboard, editing amount to 7, actual Done button → decision | PASS | PASS | `ios-core`, `android-core-confirm` |
| Bought: category dialog, confirmation cancel, retry, two-stage confirm, committed result | PASS | PASS | `ios-spend`, `ios-double-confirm`, `android-confirm` |
| Think later: committed pause, result, Finish | PASS | PASS | `ios-pause-continue`, `ios-pause-finish`, `android-pause-resume` |
| Resisted: confirmation cancel, retry, two-stage confirm, committed saved result, Finish | PASS | PASS | `ios-save-confirm`, `ios-save-finish`, `android-save-confirm`, `android-save-finish` |
| Help → replay → Skip → app stop/relaunch suppresses automatic tutorial | PASS | PASS | `ios-replay-confirm`, `android-replay-confirm` |
| Actual slider drag advances amount stage to decision; Skip at decision | PASS | PASS | `ios-slider-confirm`, `android-slider` |
| Tap outside spotlight leaves first stage unchanged and does not open picker | PASS | PASS | `ios-slider-confirm`, `android-slider` |

Commands, native screenshots and platform logs are retained in those directories. Runner stdout and static verification output are in [logs](../../artifacts/practice-tutorial/logs). Original failed reproduction is retained in `reproduce`, and its passing rerun after the native pointer wrapper in `wrapper-fix`.

Exploratory failures are retained, not treated as product failures or passing tests: an outdated selected-card selector, Cancel instead of Keep saving, a deferred paywall covering Help, transient confirmation animation, and an iOS coordinate that hit Skip instead of the blocked navigation. The final flows use actual stable control IDs where available. Maestro did not accept interpolated percentage swipe coordinates; platform-specific integer coordinates are used. Android's default eraseText was slow, so the final input flows erase a bounded number of characters.

## Visual and UX review

Native light and dark captures were inspected during testing. Final slider before/after pairs were also inspected at original resolution. The spotlight exposes the real controls, copy and footer remain contained, and decision actions retain distinct primary/secondary/tertiary emphasis. Confirm/cancel dialogs own the foreground. The focused four-stage flow retains honest progress, a visible Skip, actual product handlers and a final committed-result state. The five project UX principles and seven-law checklist were reviewed within this scope.

Representative captures:

- [iOS amount spotlight](../../artifacts/practice-tutorial/ios-slider-confirm/2026-10-03_235934/slider/takeScreenshot/slider-before.png)
- [iOS decision spotlight](../../artifacts/practice-tutorial/ios-slider-confirm/2026-10-03_235934/slider/takeScreenshot/slider-after.png)
- [Android amount spotlight](../../artifacts/practice-tutorial/android-slider/2026-10-03_235855/slider-android/takeScreenshot/slider-before.png)
- [Android decision spotlight](../../artifacts/practice-tutorial/android-slider/2026-10-03_235855/slider-android/takeScreenshot/slider-after.png)
- [Android saved result](../../artifacts/practice-tutorial/android-save-finish/2026-10-03_235813/save-finish/takeScreenshot/save-result.png)

## Static gates and limits

- Functional parity PASS: 217 contracts, 1,941 fragments, 41 reachability patterns.
- Localization PASS: all 12 dictionaries and native permission text. This follow-up adds no user-facing strings.
- Themes PASS: light, dark, PRO and six PRO accents.
- Analytics/native configuration checks and 244 attribution/cloud/UI/engagement/shopping tests passed during `npm run verify`.
- Typecheck PASS; lint has zero errors and 459 existing repository warnings.
- `npm run verify` remains blocked by 11 dependency security advisories at `check:security-audit`; dependencies were not changed for this fix.
- PRO native visual coverage is unverified: the test profiles have no Premium entitlement and the app falls back to light. Static PRO checks do not establish a visual PASS.
- Runtime coverage is bounded to these two debug phone configurations and English. Empty/create, missing-target recovery, invalid input, hardware Back, all other languages/RTL, large text, screen-reader navigation, tablets and release attribution/subscription flows were not executed in this follow-up. No full-app or release-readiness claim is made.

## Rerun

Use the explicit devices above. Back up their current local storage first; `seed.py` uses the original backup paths in `/tmp` and is a fixture helper for this session, not a general reset script. Core, save, confirm, result, replay and platform slider flows are checked in beside this report. The slider coordinates are specific to these observed phone layouts. Native artifacts are local and ignored by Git.
