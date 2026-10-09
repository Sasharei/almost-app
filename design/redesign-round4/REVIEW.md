# Redesign continuation — 2026-10-01

## State/action review

- **Today:** review the first due decision; when empty, add a temptation; when finished, see completed work without another fake due task. Savings details, cat care, catalog, history, budget, subscriptions, streak, rewards and advanced tools remain discoverable. Series belongs below Hero and shows real completed/remaining progress, including zero fill.
- **Decision:** amount entry and the slider sit in the lower part of the screen, directly above the single prominent save action. Edit, postpone and purchase remain secondary choices. Invalid amounts disable save/purchase; numeric input retains Done. Canceled purchase retains the current decision. Back returns to the originating Today/catalog state. Slider ownership remains stable during changing values and out-of-track movement; release restores parent scrolling.
- **Care:** speech precedes a three-column stage. Skins and daily reward flank the cat with flexible widths and equal minimum heights. Food/games/clean, all items, coin balances, hourly collection, skin purchase, bonus claims and clean gestures remain wired. Collected/locked/insufficient-resource states keep their existing behavior.
- **Catalog:** filtering, checking, editing, long-press reordering, archive/restore, deletion, reward eligibility, locked offers and advanced tools remain available. The series is removed from the draggable data rather than left as an invisible row. Cards and neutral controls use system material; repeated checks have lower visual emphasis.
- **Insights:** category/full-insights links open a dedicated detail shell, preserving category histories, forecast calculation/contributions, disclosures, locked previews and impulse insights. The forecast is a large top surface on the Insights overview. Weekly and balance destinations retain their handlers.
- **History:** search, all event buckets/counts, sorting, loading more, deletion and confirmation remain. Filter, sort and delete controls use the native material abstraction. No history data is truncated or deleted by this work.
- **Back:** iOS uses a left-edge UIScreenEdgePanGestureRecognizer. The existing screen-specific Back listeners are also used by this gesture. Modal gestures call the modal's own cancellation/dismissal handler. Older builds retain a directional responder fallback, reset for every gesture.

The source review covered Fitts, Hick, Zeigarnik, Jakob, goal-gradient, Von Restorff and Miller; controls retain accessibility roles/actions, callbacks and state prerequisites. Primary controls preserve their validated opaque theme colors; forms and reduced-transparency mode remain opaque. Neutral filter controls and visible list cards use SwiftUI material through the native bridge. This is a source review, not a visual approval.

## Regression evidence

The Today regression tests cover a save/spend recorded after the minute ticker, legacy schedule aliases with newer completion timestamps, local day boundaries, unchanged future schedules, null interactions and edits/resets that are not decisions. History reconstruction now retains separate actual save/spend timestamps.

The independent static reviewer identified and then confirmed fixes for repeated fallback swipes, a no-op Insights link and percentage-width overflow in the care stage. No runtime or screenshots were used for that verdict.

## Verification

- Functional parity: PASS, 183 contracts. Four layout/material/routing contracts were updated for the user's explicit series relocation and request for glass rows and removal of the old Progress shell. The overview goal/edit and Insights assertions now target the actual redesigned destinations, retaining chest callbacks, continuation, accessibility and reduced-transparency assertions.
- Localization: PASS for en, es, fr, ru, de, pt, it, ar, zh, ko and ja. Display labels reuse existing localized keys, including the goal edit action; no new untranslated UI copy.
- Themes: PASS for light, dark and PRO, including six configured PRO accents.
- Typecheck/lint: PASS (lint has repository warnings, no errors).
- Attribution contract/native analytics configuration and attribution/UI-session/engagement suites: PASS in verify before its security audit stage.
- Added Today regressions: 11/11 PASS.
- Security secret tests, backend tests and release runtime/size checks: PASS when run separately after verify stopped.
- Full verify: BLOCKED by nine unmitigated npm dependency advisories. Dependencies and audit assertions were not weakened or changed.
- iOS native build: PASS on stable Xcode 26.6, generic iOS Debug destination with code signing disabled and no launch. The changed Swift view manager and Objective-C bridge compiled. Swift syntax parse also passed. The initial build under configured Xcode 27.1 beta failed in RevenueCat PaywallColor.swift; the stable-toolchain retry completed successfully.

## Unverified coverage

No simulator, emulator or device app session was launched, per AGENTS.md. New rendering in light/dark/PRO, all accents, long localized labels, RTL, Dynamic Type, small screens, touch continuation and native edge gestures still need runtime review. The supplied screenshots establish the prior light-theme defects only. A successful static check or build does not establish visual success or release attribution/purchase validation.

API references: [SwiftUI Glass](https://developer.apple.com/documentation/swiftui/glass), [UIScreenEdgePanGestureRecognizer](https://developer.apple.com/documentation/uikit/uiscreenedgepangesturerecognizer).
