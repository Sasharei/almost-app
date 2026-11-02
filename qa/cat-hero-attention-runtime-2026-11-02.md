# Home cat indicator: simulator QA, 2 November 2026

## Verdict

INCOMPLETE / NO-GO for claiming the full requested matrix. Three scoped scenarios passed, one routing defect reproduced twice, remaining requested cases blocked by simulator control failures. This is not a whole-app release verdict.

## Build and environment

- Current dirty working tree, base commit 265d040db491b4948d365676e98c5b226fc8c2aa. Almost Savings 8.0.2 (136), bundle com.sasarei.almostclean.
- Stable Xcode 27.2 (27B52), Debug x86_64 native shell, iPhone SE (3rd generation), iOS 17.0, 375 x 667 points / 750 x 1334 pixels, English, synthetic local state.
- Separate task simulators: AF249470-42DD-413B-8999-274A2A74FCB4 (SE / iOS 17) and 21D4C68E-7F4E-4C94-8CE3-F42D0D96B350 (iPhone 17 / iOS 26.5). Other devices and data were preserved.
- Native build succeeded with xcodebuild workspace ios/Almost.xcworkspace, scheme Almost, Debug, iphonesimulator, ARCHS=x86_64, ONLY_ACTIVE_ARCH=YES, CODE_SIGNING_ALLOWED=NO, dedicated DerivedData.
- Initial build failed in ReactCodegen with TypeError reading charAt. A process-only NODE_OPTIONS preload mapped glob.sync to fast-glob for the retry. No dependency source or project configuration was changed by this QA task.
- Current full JavaScript was bundled by a separate Metro server. The initial request exceeded the native development-server timeout; a local HTTP server subsequently served the completed eager Metro bundle. Developer warning overlays were hidden in a disposable test bundle for later interaction checks. Badge, state, care and reward logic were unmodified.
- A separate PRO visual fixture was prepared with only automatic cosmetic theme fallback disabled. It was never executed, so PRO receives no visual PASS. No subscription purchase, entitlement grant or production data change was performed.

## Observed results

| Scenario | Result | Evidence observed before mandatory cleanup |
| --- | --- | --- |
| Light, fullness 20%, mood/cleanliness 100%, no pending reward, daily already collected | PASS | Original-resolution native screenshot: red exclamation beside the cat, contained in the hero and separated from cat and speech. Feed context visible. |
| Actual Fish action, back to Home | PASS | Maestro executed the real food action and Back. Native screenshot showed no red mark or Feed context. Persisted fullness was 44, mood/cleanliness 100, pending reward 0. |
| Dark, mood 20%, other stats 100%, no reward | PASS | Original-resolution native screenshot: same contained red mark, readable white exclamation, Play context. |
| Tap Play context / cat | FAIL, reproduced twice | Care opened with food options and no selected Games tab. Manually selecting Games exposed the real toy options. |
| Actual toy action and disappearance | BLOCKED | Simulator stopped responding before a toy action could be completed. |
| Low cleanliness and actual cleaning / disappearance | BLOCKED | Not executed. |
| Pending coins, daily bonus, combined rewards and disappearance after collection | BLOCKED | Fixtures prepared but not executed. |
| PRO and six accents | BLOCKED | No rendered evidence; fixture preparation is not execution. |

## Defect CAT-QA-001 (Medium)

With low mood and the Home Play context, tapping the cat opens Food rather than Games. Reproduced in two separate dark synthetic sessions. This adds an unnecessary manual tab change to the intended care journey. The marker itself is visible and correctly reflects low mood.

Source evidence matches the observed failure: openTamagotchiOverlay stores the incoming play value, while the tab model and renderTamagotchiTabContent use games. No product fix was made because this follow-up requested verification. Food, Games, Clean, Back, reward and appearance controls remain available in the inspected hierarchy.

## Blocker and coverage limits

CoreSimulator / Device Hub later stopped providing device content. Repeated screenshot, spawn/control and task-device shutdown/reboot requests timed out. Maestro driver startup also timed out on two attempts; its earlier real food flow succeeded. A failed screenshot-path command was an automation error and was not counted as a product defect. No evidence established an application crash or a cause for the simulator failure. The shared CoreSimulator service was not restarted because other tasks had active devices.

Only the scoped hero was visually reviewed in light and dark on the compact phone. Healthy cleared state is proven after feeding. PRO, accents, rewards, actual play/clean completion, iOS 26.5 application rendering, RTL, large text, screen reader navigation, Android and Release behavior remain unverified. Unsigned Debug showed existing notification/keychain entitlement warnings and a Shopping Pause error outside this feature. No performance or purchase/attribution runtime claim is made.

## Static verification

PASS: npm run check:functional-parity (268 contracts), npm run check:localization (12 languages), npm run check:themes (light/dark/PRO and six accents), node --test scripts/tests/cat-notification-regressions.test.js (23 tests). No application source or localized text was changed in this QA follow-up. Static gates are not visual evidence. Full npm run verify passed in the preceding implementation turn and was not repeated for this read-only QA.

## Cleanup

Task Metro, pinned-bundle HTTP server and task Maestro processes were stopped. Dedicated build products, caches, fixtures, patched disposable bundles, screenshots, hierarchy dumps and raw logs were removed, including the task-specific Maestro staging and Xcode runner output directories. Only this concise report is retained.

The two task-created simulator registrations and their synthetic application data remain: their shutdown/reboot commands timed out, so simulator cleanup could not be completed without restarting a shared service. No existing simulator data, shared caches, other tasks, signing data or release artifacts were deleted. These two registrations are explicit remaining cleanup candidates once device control recovers.
