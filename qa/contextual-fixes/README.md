# Contextual confirmations and Shopping Pause QA — 2026-10-04

Scope: durable Screen Time selection, active pause details, goal-earned feedback, contextual Today CTA, persistent biometric opt-out, currency precision, next-subscription amount, long titles and large amounts. The existing dirty working tree was preserved.

## State / action review

| State | Primary action | Secondary actions / feedback |
| --- | --- | --- |
| Today, pending checks | Open the next decision; short remaining-count label | Savings details, pause details, other cards remain reachable |
| Shopping Pause, authorization missing | Allow Screen Time | Settings / close; revoked tokens require fresh selection |
| Shopping Pause, apps saved | Start with a valid goal | Change selected apps / close; saved choices survive restart |
| Active pause | Continue saving | Progress details, close, explicitly confirmed end |
| Goal earned | Choose one store for a 30-minute pass | Close / end; current history is revalidated before unlock |
| Pass active | Continue | Expiry time, end / close |
| Confirmation | Biometric confirmation, or two sequential taps after opt-out | Cancel; explanatory opt-out alert never records a transaction |
| Opt-out explanation | Keep biometrics | Explicit “Use two taps” persists the choice for every control |
| Loading / failure | Wait / retry as applicable | No duplicate commits, readable error, cancel / close retained |
| Subscription Watch | Open subscriptions | Next charge includes the per-charge amount rather than a monthly equivalent |

Reviewed against Fitts, Hick, Zeigarnik, Jakob, goal-gradient, Von Restorff and Miller. No existing navigation or commit handlers removed. New title inputs are limited to 120 characters; existing long names are preserved and abbreviated only for display, with full accessible labels on affected surfaces. Money uses currency minor units. Hero amount size follows measured copy width; long wheel titles retain readable type.

## Automated evidence

- Functional parity: 221 contracts, 1957 fragments, 41 reachability patterns passed.
- Localization: all 12 supported dictionaries and native Face ID permission strings passed.
- Themes: light / dark / PRO and six PRO accents passed the static validator.
- Attribution / native analytics contracts and attribution tests passed.
- UI session tests: 66 passed, including five new regression cases for rounding, contextual counts, opt-out fanout, delayed hydration/reload and failed persistence.
- Engagement: 157 passed. Shopping blocker: four passed, including execution of the Swift savings ledger.
- Typecheck, security unit tests, backend tests and runtime parity / size checks passed separately.
- `npm run verify` stops at the security audit: 11 unmitigated dependency advisories. That gate remains intact; no rollout performed.
- Native Swift module and extensions compiled in the isolated ARM simulator QA workspace. OCR was excluded there because its existing device-only library cannot link in that simulator workspace. This is not a production release build.

## Native visual evidence and limits

Dedicated simulator: `9D59A3C2-2DDE-4844-9311-A2A747CF3F55`, iPhone 17 Pro / iOS 26.5. User explicitly authorized simulator launches in this conversation. Synthetic data only; the simulator storage was backed up before fixture seeding.

Actual app: contextual CTA and pause-details opening / closing exercised. Extreme decision screenshot exposed unreadable shrinking of the card title, subsequently corrected. The save path opened its existing category prerequisite; it was not counted as a successful confirmation test.

Component fixture: uses the actual Today header, Subscription Watch card, pause panel and Almost Pay sheet. Synthetic controller does not validate Screen Time restrictions. The hero mascot uses a QA placeholder icon, not the production transparent mascot. Fixture source: `preview-entry.fixture`; generate temporary roots with `node qa/contextual-fixes/create-preview.cjs` (does not launch anything).

Artwork confirmed in active details: `artifacts/contextual-fixes-final/light-pause-art.png`. Other screenshots are under `artifacts/contextual-fixes-*`. Failed Maestro runs are retained as failures; a reported tap without a verified dismissal is not a passed cancel path. Metro's large-module compilation can exceed the native development-server timeout and must be warmed before a run.

Physical iPhone coverage remains necessary for actual Screen Time token persistence after restart/revocation, the earned one-store pass, expiry/relocking and Face ID permission denial. Native widget extreme-content checks cover source layout constraints only; widgets and Android were not visually exercised with this fixture. Static theme validation is not visual evidence.

## Balance-drop regression

A spend after a same-day save called `rebuildSavingsFromHistory(nextHistory)`. The event log is bounded by `MAX_HISTORY_EVENTS`; imported/legacy balances can also differ from retained events. Replacing the lifetime balance with this partial sum can therefore erase unrelated savings. The reversal now applies only `removedAmountUSD` to the current saved/progress balances, preserving the existing same-day correction, goal adjustments, history removal and challenge refresh. Lifetime peaks are not rewritten from an incomplete log.

Four tests execute the actual App callback with realistic retained-history mismatches, prior-day/unrelated/future entries, goal deltas, multiple reversed saves and a zero balance. All four failed before the change and pass afterwards. Synthetic reproduction: balance 2970, retained unrelated saves 1610, reversed save 6; old result 1610, fixed result 2964. This proves the mechanism, not the exact contents of the user's phone. No speculative restoration of the user's balance was performed.

Native theme fixture run `artifacts/contextual-fixes-themes/2026-10-04_192350` completed for light, dark and all six PRO accents: pause panel, subscription card, confirmation, verified cancel/back, first-tap cancel and two-tap commit. Review found annual-total truncation; measured-width typography was subsequently applied and confirmed in light, dark and PRO gold (`artifacts/contextual-fixes-layout-confirmed/2026-10-04_193430`). Full totals fit and sibling value baselines align. The corrected long decision card is confirmed in `artifacts/contextual-fixes-card-final/2026-10-04_193554`. Earlier warm run covers full hero amounts and Arabic earned-goal state. Physical Face ID enrollment/denial was not exercised.

Temporary fixture roots were removed, QA AppDelegate source and simulator storage/preferences restored, and the QA app stopped. The fixture is reproducible from the checked-in template. The first focus-fixture attempt lacked GestureHandlerRootView; the fixture wrapper was corrected and the final run passed.
