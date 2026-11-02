# First series reward: Almi care tutorial

The first successful series coin collection queues a two-step guide. After the chest and series summary close and other blocking presentations settle, the existing Almi menu opens on Food. Step 1 introduces the companion, coin collection, rewards, care, room decor and appearance. Step 2 scrolls to the real Food/Games/Clean tabs and outlines them. Finish leaves the existing care controls available. This includes rewards credited during decisions or recovered on hydration, even when the chest owes no additional coins. The guide never grants coins, buys anything, changes attribution or submits a purchase.

| State | Primary action | Secondary paths |
| --- | --- | --- |
| Storage loading or unavailable | Existing application actions | Retry hydration next launch on read failure |
| Queued after payout | Finish the existing reward presentation | Existing cancel/back paths |
| Introduction, step 1 of 2 | Show care | Skip or leave the menu |
| Care, step 2 of 2 | Care for Almi | Skip, back, use real care tabs |
| Finished or skipped | Existing care actions | Rewards, appearance, room, back, cleaning gestures |

Pending handoff survives restart. Finish, Skip and leaving the menu persist completion. An existing completed series with a positive reward in storage is migrated to completion, so it does not trigger the first-reward guide retroactively. A failed storage read does not assume the tutorial is unseen. Payouts and the existing RevenueCat/AppsFlyer ownership remain unchanged.

Applied Apple Design, Impeccable onboarding guidance, the five UX principles and all seven UX rules. New controls provide immediate press feedback, commit on release, use minimum 48-point targets, follow text scaling and RTL alignment, and retain one primary action per guide step. Scrolling respects Reduce Motion. The added surfaces use existing theme roles and opaque backgrounds. Existing care actions and callbacks were inventoried against the passing baseline and protected by an additional functional contract.

Verification:

- Nine maintained tests: real claim and duplicate claim, already credited rewards with zero additional payout, zero-coin claims, hydration race, pending recovery, completion/skip, legacy paid-claim migration, storage failure, all 12 dictionaries and progress placeholders, and both review-prompt priority guards.
- Final `npm run verify`: PASS after the precredited-reward correction. Gates include functional parity (268 contracts), localization (12 languages), light/dark/PRO themes with six accents, analytics/native attribution, security, typecheck, lint and backend tests. Existing lint warnings remain. The size gate uses the existing Android release artifact and retains its growth warning.
- Current native Debug builds succeeded for iOS and Android. Selected stable Xcode: 27.2 (27B52). Build-only compatibility settings were temporary; no dependency source was changed for this task. Initial disk-space failures were resolved by removing confirmed task-owned outputs.
- iPhone 17 simulator, iOS 26.5: Russian light and dark guide layouts, pending handoff, both steps, real tab highlight, Finish, Games/Clean selection, Back and restart after completion reviewed. The outline uses a non-interactive overlay because the native iOS surface removes its own border. An existing StoreKit review competed during the initial chest run; pending/active guide priority now defers both app and native reviews and is covered by tests. No review was submitted.
- Android API 36: English light layouts, real tab outline and touch transition to step 2 reviewed. The final first-claim scenario uses a separate task-owned emulator because a shared emulator was being switched by another active task. That run exposed the precredited-reward case and led to the correction above.

UX review: one primary action per guide step, secondary Skip and normal Back, honest two-step progress, familiar care tabs, grouped related controls, aligned tab labels and adequate targets. Existing reward, appearance, room and care actions remain wired. No release performance improvement is claimed.

Coverage limits: native PRO/accent, iPad, RTL and enlarged-text layouts were not visually reviewed. Static theme/localization checks cover their resources but are not visual evidence. Native builds were Debug; production attribution, purchase flows and release performance were not exercised. Existing Debug billing/notification warnings were visible. The full iOS first-claim path after the review-priority correction was not rerun.

Final isolated Android API 36 result: PASS using the current JavaScript and physical `adb input tap` actions. A fresh ready-series fixture was credited once by existing recovery logic, the chest was collected, Continue automatically opened step 1, Show care displayed step 2 with aligned highlighted tabs, and Finish removed the guide. Stored completion was `done`, balance was exactly 30, and the claimed series reward was 30. Restart returned to Today without replay. The Maestro attempt was stopped because its animation-settling waits were slow; the final pass used direct device touches and screenshots instead.

Cleanup completed: task Metro and test processes stopped; task iOS simulators and isolated Android AVD removed; the task-installed Almost app and its transfer file removed from the preexisting shared emulator. Task build intermediates, CMake Debug outputs, fixtures, screenshots, raw logs and the dedicated temporary directory were removed. Existing devices, other tasks, release artifacts, signing data and shared dependency caches were preserved. Only this concise summary and maintained source/tests are retained.
