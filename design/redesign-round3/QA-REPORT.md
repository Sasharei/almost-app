# Redesign correction round 3 — 2026-10-01

## Implemented
- Compact aligned glass header utilities: 28pt painted bug/help, 32pt plus, 48pt transparent targets.
- Today hero reserves a fixed 252pt height; separate savings-details and 132pt cat-to-care targets.
- Today queue uses actual local-day save/spend timestamps and one shared schedule resolver. Completed due/later entries are suppressed; future checks remain upcoming. Untouched catalog entries remain in All Temptations.
- Decision shows localized next-check date/time. Slider captures the gesture, locks parent scrolling, releases on completion/cancellation, and calls bounded system selection haptics.
- Care rebuilt with centered character, compact item rows, honest zero status tracks, dirt spots on the character without a rectangular veil, glass Back and a centered 620pt maximum tablet column.
- Preference selection paint is 28pt inside accessible 44/48pt targets; all full-list selectors and Premium guards retained.
- Direct Insights from Progress, accessible weekly/balance/forecast detail routes and modern sheets; compact bottom-sheet goal form.

## Static checks
Functional parity: 183 contracts, 1740 wiring fragments, 41 reachability patterns passed. Localization: all 11 app languages and native Face ID strings passed; changed presentation reuses translated keys. Themes: light/dark/pro and six PRO accents passed the static validator. Typecheck passed. Lint: zero errors, 398 existing warnings. Analytics/native analytics contracts, attribution, UI-session and engagement suites passed inside verify. Security tests and backend tests passed separately; runtime parity and existing artifact size check passed.

Full npm run verify is NOT green: it stops at nine unmitigated npm audit advisories in the existing dependency tree. No assertions or dependency gates were weakened. This round did not produce a release artifact.

## Runtime evidence
Devices: iPhone iOS 26.5, Android Almost_Redesign_Review emulator, and iPad Air 11-inch iOS 26.5. User expressly authorized simulator/emulator use. Test data is synthetic. No purchases or entitlement overrides were used.

- Phone Today/cat-to-care/back, care categories, profile preference selection and direct Insights were exercised. Care and profile were captured light/dark on both phone platforms. Required dark captures were explicitly corrected after QA found stale theme state or development warnings.
- Android upcoming detail displays date/time. Slightly diagonal slider gestures changed amount 9 to 15 on Android and 6 to 9 on iOS without changing either page position; before/after iOS screenshots were visually inspected. Screenshot evidence cannot establish felt haptics.
- Weekly money movement, balance and forecast sheets were opened/closed on Android light and iOS dark.
- Android synthetic TestCar save passed Almost Pay double-confirmation and success screens. After returning, Today was visible and TestCar was absent from the displayed queue; local-day filtering also has unit coverage (nine tests passed under Los Angeles, Riyadh and Kiritimati time zones).
- Additional iOS catalog navigation found and corrected a null interaction crash in the shared date resolver. An untouched catalog card now opens its decision detail successfully; the regression has dedicated unit coverage.
- iPad new goal opened and cancelled. A synthetic Round 3 QA goal with target 100 was entered and created through the normal free first-goal path. Its resulting goal and success acknowledgement were captured.
- iPad Care was captured in a bounded centered column. Repeated controls and zero tracks were inspected.

See review/final for current screenshots. Independent FINISH-REVIEW.md identified five material fixes; FINISH-VERDICT.md scores all five resolved. Its disposition applies to those fixes and captured scope, not every app state.

## Remaining runtime coverage
PRO and its six accents were checked statically, not visually (Premium remains enforced). Android tablet, large text, RTL and phone-specific new-goal keyboard/success coverage were not verified. Physical haptic sensation cannot be verified with these simulators. Slider cancellation remains a runtime coverage gap; release/cancel callbacks are preserved and checked statically. Prior unrelated release/attribution and purchase paths were not retested in release builds; infrastructure was preserved.

## UX / parity
Affected states were reviewed against the five primary/secondary/progressive-disclosure principles and Fitts, Hick, Zeigarnik, Jakob, goal-gradient, Von Restorff and Miller. Existing care actions, gestures, navigation, validation, selectors, charts, persistence, analytics and Premium guards remain wired. Visual-only contract fragments were updated to the new glass geometry and dirt presentation; action invariants remain intact.
