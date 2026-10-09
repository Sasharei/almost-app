# Mobile redesign — second review, 1 October 2026

Scope: user's annotated screenshots and the second correction request. Applied impeccable, ux-interaction-review and mobile-app-qa, plus project/global UX_RULES.md. Action/state inventory is in STATE-ACTIONS.md. Work is in the existing checkout; pre-existing unrelated changes were preserved.

## Changes

- Header removes the redundant blank row. Visible utilities are 36 pt, add is 40 pt, with 48 pt touch regions and non-overlapping hit areas. Global callbacks and labels remain intact.
- Today speech is inside the coloured card, with its tail above the cat. The card accommodates complete localized speech without a separate row stretching the feed. Savings is a button again.
- Today checks authoritative due dates against now and local calendar midnight. Stale missed-cycle counts no longer promote tomorrow's item into today's due queue. Untouched catalog cards remain in All Temptations; more than three configured schedules suppress unscheduled fallback cards.
- Savings opens the existing full period/mode chart sheet and retains historical period navigation and category totals. Recent list contains up to three recent spending and three saving decisions; empty history has localized feedback. The list sits below the chart/category section, outside the horizontal chart scroller.
- Coin uses a continuous modal surface. iOS native Liquid Glass at full opacity reflects its local amount fill, not an exposed hole into the feed. Removed the obsolete iOS preparation wait that could leave the sheet invisible. Android excludes the feed snapshot from the coin backdrop. Exact amount, slider, accessibility adjustment, categories and cancel remain wired.
- Category chips use intrinsic widths, single-line labels and full-screen horizontal scrolling. Quick-entry floating control grows from 52 to 64; geometry/tutorials use the same constant.
- Profile and Settings expose horizontal language/currency/theme choices with selected state. Full lists and Premium theme handlers remain reachable from the labeled rows. Existing persistence handlers are reused.
- Cat care has a compact split hero, restrained localized speech, grouped status and care controls, and revised item surfaces. Food/play/clean handlers, cleaning gesture, coins, daily reward, skins, stat details and back remain in the existing flow.
- Budget details becomes a labeled secondary control below the title rather than overlapping the global header utilities. Shared hero layouts remain vertical in Progress/Budget/report screens.

## UX laws

Fitts: compact visible glass controls keep 48 pt hit regions; selectors at least 44 pt; quick-entry control 64 pt. Hick/Miller: selectors grouped by preference; full option lists are secondary routes, Today excludes untouched catalog. Zeigarnik: authoritative scheduled date, honest empty queue, visible selected category/theme and validation state. Jakob: native toolbar controls, sheets, radio selection, back/cancel; native Liquid Glass on supported iOS. Goal-gradient: existing numerical savings/progress and full charts preserved. Von Restorff: due decision/empty-state action, chosen save/spend mode, reports and relevant care action keep primary emphasis; utilities are smaller secondary controls.

## Static verification

Functional parity: 182 contracts, 1730 fragments and 41 reachability patterns pass. Only obsolete visual assertions for the removed cutout/extra header row were replaced; action invariants were retained and strengthened. Localization and theme gates pass: 11 supported languages, light/dark/PRO with six configured PRO accents. Added text reuses existing localized keys; diff reviewed for labels, hints and accessibility copy. Six schedule regression tests pass in Asia/Riyadh, Europe/Berlin and Pacific/Auckland. Typecheck and ESLint pass with zero errors (398 whole-checkout warnings). Attribution contract, native analytics config, attribution/session/engagement tests pass. Security unit tests, backend tests, runtime parity and artifact-size checks pass separately.

Full npm run verify stops at nine pre-existing npm security advisories. No dependency manifest or lockfile was changed in this second correction pass; no security assertions/exemptions were weakened. Size evidence refers to the repository's available build artifacts, not a newly produced release build.

## Native evidence and limits

Native iOS 26.5: D06F6A5C-E069-4194-B6CC-CAAC59653090. Android 17: emulator-5554, Almost_Redesign_Review. Existing debug clients; Metro bundles refreshed to the final source. Raw command logs and screenshots are under artifacts/redesign-round2 (ignored). Maestro scripts are under qa/redesign-round2.

Dark action review passed on both platforms: Today details, saved/spent chart modes and weeks, coin presentation and mode switching/cancel, profile, care Food/Games/Clean/back, help/cancel, bug-report/cancel, profile editor/cancel, Progress/Pause and locked Budget. iOS empty savings and Android populated chart ($105 synthetic test data) both reviewed. Initial test failures exposed two implementation issues (invisible iOS coin, recent list inside chart); both were fixed and confirmed in native reruns.

PRO and unlocked Budget runtime reviews are blocked by absent Premium in test profiles. No purchases, entitlement bypasses or uploads were performed. Emulator billing unavailable/notifications warnings remain separate environment issues; debug notices sometimes obscure navigation and are not production design evidence. 


Light theme action review passed on both platforms after dismissing native debug notices and waiting for startup to settle. Today/card speech, inline Profile preferences, coin, Food/Games/Clean care states, Progress/Pause and locked Budget were captured and visually reviewed. Header controls remain on the title/back row; primary and secondary targets retain distinct hierarchy. Android direct Russian/English and AED/USD selection, full language list and Settings inline preferences were exercised; native text and converted totals updated correctly. Final localization/theme/functional-parity checks were rerun and passed.

The iOS manual-entry double-tap could not be confirmed with Maestro (amount text and coin coordinates, multiple inter-tap timings). Native Simulator computer-use also timed out. This is an explicit unverified gesture, not a passing functional test or a demonstrated production regression. Existing double-tap and accessibility handlers remain intact; all modal open/mode/cancel paths above passed.

Selected native evidence is saved in [review/](review/). Dark chart has Android populated history and iOS empty history; native Liquid Glass is iOS-specific, Android uses the intentional vector/opaque fallback. Remaining visual/runtime limits are PRO accents, unlocked Premium Budget and the iOS manual-entry gesture.

Android manual entry, zero-amount validation, manual cancel back to coin and modal cancel back to Today passed; category scrolling also passed on both platforms. iOS slider responded to native gestures; Android amount input prefill must be erased before testing zero. Some early tab screenshots captured the previous screen before the transition settled; navigation rerun now waits for the destination title before recording evidence.

Settled Android navigation rerun passed with destination-title assertions for Progress (You are closer), Pause (All quiet for now), and locked Budget (Take the next step). Updated native evidence is included in review/. No publication or release build was performed.

Final Android header/navigation pass confirmed both header-help and header-bug-report on Progress, Pause and locked Budget, in addition to destination title assertions. Latest screenshots replace earlier transition captures in review/.
