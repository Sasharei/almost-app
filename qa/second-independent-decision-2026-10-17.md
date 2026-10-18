# Simulator verification — 17 October 2026

Scope: onboarding → practical tutorial → two independent committed card decisions → automatic frequency configuration → automatic paywall → next-day Today. Local changes only; no purchase, upload, publication, production configuration or price changes. Pre-existing unrelated changes preserved.

## Environment and method

- iPhone 17, iOS 26.5 Simulator; Almost Savings 8.0.1 (133), unsigned Debug x86_64 app running on the ARM simulator runtime.
- Native build: `xcodebuild -workspace ios/Almost.xcworkspace -scheme Almost -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath <task-temp>/build -jobs 3 ARCHS=x86_64 ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO build` — PASS.
- Two dedicated fresh synthetic QA profiles. User approved simulator launch and accepting onboarding terms. UI actions through native computer-use controls. Local storage inspection used only to verify actual outcomes; counters and cadence records were not seeded or rewritten.
- First cold Metro load timed out while compiling App.js; warm reload succeeded. This was an environment failure, not a clean cold-start PASS.

## Executed journey

- English/USD onboarding, coffee scenario, synthetic Just save goal, optional analytics declined; notification permission allowed.
- Practical tutorial: select Afternoon coffee refill, interact with the amount slider, record a simulated saving and finish the tutorial. No real money transferred. Independent count stays zero.
- Mandatory automatic frequency prompt opens after the result. Daily/10:00 saved; manualConfigured and nextCheckAt persisted.
- Next real unfinished card opens in Today/focus. All, back, amount entry, save/spend/later and edit actions remain wired.
- Cancelled spend confirmation does not increment the counter. Actual spend on Coffee and pastry combo yields count 1. Frequency configuration saved. No early paywall; restart preserves progress.
- Actual save on Coffee to-go yields count 2 and a durable pending offer. Result screens, mandatory frequency setup, hints, series/reward and native review take priority.
- Background/resume during the frequency prompt preserves it and does not increment the counter or show the paywall.
- Paywall visibly opens with count 2; pending is consumed. Dismissed without purchase.

## Next-day check

A temporary bundle adapter shifted only application-module Date constructors/now by +25h and +27h. Framework/native/system clocks, stored decisions, counters and original cadence records were not replaced. The adapter and bundles are disposable QA tools, not application changes.

- +25h: Today visibly offers **Review 3 cards / Awaiting a decision: 3**. All three configured cards are **Today, Not checked today**, with previous amounts and decision history intact.
- +27h: Today still offers all three cards; actual scheduler records show one missed cycle after each preserved deadline. No repeat paywall on restart.
- Existing Daily cadence is **26 hours after a decision**; the selected 10:00 notification time is separate. This policy was preserved, not changed to a 24-hour interval.

## Defects corrected during QA

- Native review handoff could finish with eligibility true but no signal to retry the pending paywall. The existing guard now wakes readiness on registration and expiration; no readiness polling added.
- Coach placement could push Save behind the bottom bar. Main decision actions now precede the hint, and native presentation bounds exclude bottom navigation.
- A hint below the viewport now requests one nonanimated reveal per target, yields to active gestures, and measures again before reporting shown. Scheduling a scroll never counts as presentation.

## Checks and coverage

- Baseline and final `check:functional-parity`; `npm run verify` including analytics/native configuration, attribution, app/backend tests, typecheck, lint, localization, themes and release parity/size gates — PASS.
- Targeted paywall/coach regression suite — 47/47 PASS, including guard expiration, navigation occlusion and one-time gesture-aware reveal.
- No UI copy changed during simulator fixes. Existing coach dictionary keys reused; localization validator passes all supported languages.
- Theme validator passes light/dark/pro and six PRO accents. Actual light/dark Today and decision rendering inspected; light paywall and mandatory scheduler inspected. Full PRO/accent, RTL and large-type visual matrix remains unverified; no subscription was purchased to unlock PRO.
- Apple Design and all five UX principles/seven UX laws reviewed within the changed flow: real progress, one primary decision action, preserved exits/options, >=44pt dismiss control, no decorative motion, nonanimated reveal compatible with reduced motion. Performance scope is bounded receipts and event-driven readiness, not a measured release performance audit.
- Unsigned Debug emits Expo notification Keychain entitlement warnings. Actual push delivery and release attribution/subscription paths on iOS and Android are not validated. Existing Shopping pause error is visible outside this task's flow.


## Final-code repeat

On the second fresh profile, onboarding and tutorial completed normally; a restart after the tutorial loaded the final coach fix without modifying saved state. Native layout now shows both the coach (including Not now) and primary decision button above bottom navigation. Coach target persistence is written only after measured presentation. The reveal waits until the initial focus scroll reset has finished and does not animate or repeat against a gesture.

The actual independent spend produces count 1 / pending false / shown 0. Daily was configured. The native review prompt appeared before the second decision in this repeat and was dismissed without rating; the card remained accessible. The actual independent save produces count 2 / pending true / shown 0. Goal result, saving result, automatic Daily configuration, coin explanation, chest opening and series summary completed first. The automatic paywall then appeared without tapping a premium entry; state becomes count 2 / pending false / shown 1. Continue with limited version returns to the app without purchase.

Final `npm run verify`, 47 targeted paywall/coach tests and `git diff --check` pass. Existing lint warnings and pre-existing APK size-growth warning remain non-failing. No broad production/release runtime PASS is claimed.

Final-code next-day repeat also PASS: +25h shows Review 3 cards and all three Today / Not checked today entries; +27h shows Review 3 cards again. Storage assertions confirm unchanged last decision timestamps and independent offer state, manual Daily configuration on all three cards, missedCycles = 1, lastMissedCheckAt equal to the prior deadline, and nextCheckAt advanced by the existing 26-hour interval. A preliminary QA assertion incorrectly expected nextCheckAt not to advance after an elapsed cycle; inspecting the actual scheduler corrected that test expectation, without changing product code or data.

The coach itself was visually checked in light mode. Dark Today/decision checks and static themes pass; the entire coach/modal/theme/accent/locale matrix is not claimed. Scrolled focus exposes the existing floating header icons above card content; broader sticky-header spacing remains outside this fix.

## Cleanup completed

Both task-created simulator app sessions stopped and simulators shut down; RCT_jsLocation overrides removed. Metro and temporary bundle/clock servers stopped; ports 8097/8098 have no task listeners. The dedicated task temporary directory was deleted and absence confirmed, including Debug DerivedData/build products, screenshots, raw logs, storage observations, clock adapters/bundles and Python caches. Superseded task text summary removed. Maintained source/regression tests and this report remain. Synthetic simulator profiles are preserved to respect the no-erasure rule; existing user data, shared caches, other tasks' outputs, release artifacts and symbol files were not deleted.
