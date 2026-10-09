# Verification — 2026-10-03

The user explicitly authorized simulator/emulator verification. Native debug builds were installed and inspected, using synthetic local fixtures with original app storage backed up. This report supersedes the earlier static-only verdict.

## Scope and native evidence

- iOS: iPhone 17 simulator, iOS 26.5, 402 × 874 pt. Compact Today capture: iPhone SE, 375 × 667 pt.
- Android: owned Pixel 9 Pro AVD, API 36, arm64, 1280 × 2856 px.
- Runtime used an isolated JavaScript snapshot so unrelated changes from other chats would not enter these already-built native binaries. Exact source hashes: `qa/artifacts/decision-followup-runtime/build-manifest.json`. This is not a release-build or whole-current-worktree verdict.
- Nine surfaces: Today, decision wheel, Pause, Profile, Settings, category manager, new category with keyboard, Subscription Watch, subscription detail.
- iOS navigation/assertion matrix passed all nine in light, dark, and PRO with indigo, emerald, sunset, gold, violet and aqua. Rendered captures were inspected for hierarchy, contrast, backgrounds, borders, text, icons and modal backdrops. Some early indigo frames have a development Refreshing overlay; those obscured header regions are not visual pass evidence.
- Android light and dark surfaces were captured. Subscription detail was confirmed separately after correcting the automation's tutorial dismissal/scroll target. PRO indigo passed the remaining Settings/category/subscription routes in a separate resume after an offscreen Settings tap; all nine were captured and inspected. Logs retain the initial failed attempts.
- Arabic (ar-sa): full iOS navigation matrix passed. Localized numerals and user-entered names remain distinct; Arabic text alignment was reviewed. Fixed the Pause/shared top-line label overlapping fixed header buttons and confirmed a fresh native capture. This does not establish full mirrored layout or every RTL locale.
- German at accessibility-large: wheel, Pause, Profile, Settings, categories and category creation captured. Wheel status overlap was fixed by scaling snap-row geometry with system font scale; fresh capture confirms readable separate rows. A swipe inside the wheel scrolls the wheel; the outer form action viewport was not fully verified at this size.
- Compact German Today: Make a Decision is above the navigation bar after reducing hero height. Full compact matrix could not run because the XCTest driver failed to start; do not infer coverage from the main-device run.

## Behavior checked

- Exact scheduled deadline: awaiting count changes from one to two without relaunch on both platforms, and the awaiting count increases above Make a Decision.
- Today pills appear independently from checked/unchecked status in the wheel; future entries retain dates.
- Pause total equals the two synthetic amounts ($32 + $18 = $50); short countdown changes over time and longer waits use localized days.
- Progress Sections starts collapsed and expands to existing destinations.
- Free Profile shows a separate green full-access action; premium Profile prioritizes reports.
- Settings/category navigation and category modal cancel return paths work. Open All Settings is absent.
- Subscription agenda and detail show $9 monthly, $108 yearly, one day until next check, and explanation of recording renewal/skipping and external cancellation.
- Category empty-name validation was rendered; successful creation passed with a focused text field; the new item was found in the manager. Initial automation failures targeted the Name label rather than the input and used keyboard dismissal, so those attempts are not product-success evidence.

## Fixes prompted by runtime QA

- Overview/focus feed adapter fixes invisible zero-height native list rows while keeping all-mode drag behavior.
- Cadence reconciliation converges instead of repeatedly rewriting legacy 24-hour state to the current interval; additional ledger/order no-op updates are avoided.
- Missed due checks use the factual missed timestamp; deadline ticker ignores already-expired deadlines.
- Category row text aligns consistently; singular one-day subscription copy covers all eleven languages.
- Compact Today hero leaves room for the main action.
- Wheel rows and snapping grow with system font scale; RTL top-line labels reserve space for header controls.

## UX review and remaining gaps

One main action per affected state, distinct secondary controls, familiar Back/Cancel, unfinished-work visibility, honest progress and grouped Sections were reviewed against the five project principles and all seven UX laws. State/action inventory is in STATE-ACTIONS.md. Numerical first/middle/last iOS navigation icon centers differ by at most 0.17 pt and label centers by 1 pt (`ios-bar-measurement.json`), within the 2 pt tolerance for that capture.

The existing floating global add button can obscure content at intermediate scroll positions, including a Subscription Watch metric and the edge of the compact Today CTA. It is a broader shell issue and is not a clean visual pass. Android text injection hung the emulator/ADB; exact amount editing and category save are not certified on Android. Five additional PRO accents are not separately certified on Android. Empty Pause and Subscription Watch/detail passed on iOS light. Every other empty/modal state, minimum supported OS, physical devices, release attribution, real purchases/restores, notifications and haptics are not certified. Unsigned iOS debug builds report a notification Keychain entitlement error; no notification success claim is made.

## Repository gates

- Functional parity: PASS, 205 contracts, 1860 behavior fragments, 41 reachability patterns.
- Localization: PASS, all 11 app languages and native Face ID; tokens checked. Four new decision keys plus singular day key cover every dictionary; retired legacy Settings key removed.
- Theme configuration: PASS, light/dark/PRO and six PRO accents. Static configuration evidence is separate from screenshots.
- Final verify tests before audit: PASS, including engagement (157 tests), UI/session, attribution/cloud notifications and concurrent shopping-blocker tests. Analytics contract and native analytics config: PASS.
- Typecheck PASS; lint zero errors (existing warnings remain); security tests seven PASS; backend 27 PASS; release-runtime parity and app-size checks PASS when run separately.
- Full `npm run verify`: BLOCKED by 11 unmitigated npm dependency advisories at check:security-audit. This task did not change dependencies to bypass that gate.
- Diff whitespace: PASS. Changed-file list and zero-context UI diff reviewed for localization.

Evidence is retained under `qa/artifacts/decision-followup-runtime/`, including failed automation attempts. Local source/build logs are in `/tmp/almost-qa-*` and `/tmp/almost-final-*`. No production data, real purchase or publication was performed.

Cleanup: main iOS original storage restored; compact simulator and owned Android AVD fixture storage removed because original storage was absent. Original iOS text size restored to large. Backups retained; unrelated simulators were not modified. See restore-result.json.

## Count-only follow-up — 2026-10-03

Removed the title enumeration from Today; the existing localized awaiting count remains directly above Make a Decision. Card titles remain reachable in the wheel. No strings or handlers changed. The updated state/action inventory and parity contract retain all actions.

On the iPhone 17 simulator, Russian fixtures with 20 due cards passed the count-only assertions and opened the wheel in light, dark and PRO violet. Today and wheel screenshots were inspected: the counter fits one line, the main action is fully visible, and titles/Today pills remain in the wheel. Captures and logs are under `count-only-light`, `count-only-dark`, and `count-only-pro` in the artifact directory. Initial free-account fixtures displayed two due cards because the free feed limit applied; they are not twenty-card pass evidence. An initial blank startup was resolved by reinstalling the known debug binary and warming Metro before the successful runs.

Functional parity, localization (all eleven languages), themes and diff whitespace passed. UX review: unfinished work is compact and visible; one primary action remains; useful card selection is preserved. This follow-up covers Today and wheel in the isolated debug snapshot, not a complete release or Android rerun. Earlier report gaps remain. Original simulator storage was restored after these fixtures.
