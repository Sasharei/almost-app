# Hero cat badge — 2026-10-17

Follow-up: [all care states and silhouette dirt](cat-hero-care-2026-10-17.md). This document records the initial badge change.

Added a status badge inside the existing Home Hero cat care target. Earned hourly rewards show 🪙 + localized Collect; otherwise hunger at the existing attention threshold shows 🐟 + localized Feed. Hydrating, healthy, and party-protected cats have no hunger badge. Earned rewards remain visible during protection. After collection, hunger can become the next status; feeding clears hunger at the existing threshold. Uses the existing minute state update without extra timers, assets, persistence, notification scheduling or revenue/attribution changes.

State/action and UX source review: the Hero's savings action remains distinct, the cat and its badge share the original care callback, touch release activation and cancellation remain with the existing Pressable, and propagation cannot open the savings details. The care route still opens Food; collection remains in the existing care panel. Existing back/close, purchase, care and claim handlers are unchanged. Badge uses an icon and text, theme tokens, natural text wrapping and mirrored RTL ordering; it adds no animation. Home empty/populated states use the same Hero; focused decision mode continues to hide the whole Hero. No new loading, error or permission action is introduced. Apple Design, five UX principles and seven UX laws reviewed within this scope. Performance impact is limited to a small state-derived value and badge subtree; no runtime profiling performed.

Verification:
- Baseline `npm run check:functional-parity`: PASS (258 contracts).
- `node --test scripts/tests/cat-notification-regressions.test.js`: PASS (20 tests including new priority, threshold, care transition, unearned reward and exact protection expiry cases).
- `npm run verify`: PASS, exit 0. Includes functional parity (259 contracts), analytics/native configuration, attribution, notification tests, typecheck, lint, localization, themes, backend and release static gates. Lint reports 434 warnings, zero errors in the existing working tree. Size gate passes using the existing debug APK; this task did not build or install it.
- Localization: Feed added directly to all 12 dictionaries, covering all 13 supported locale choices; existing Collect copy reused. No added interpolation placeholders. `npm run check:localization`: PASS.
- `npm run check:themes`: PASS for light/dark/pro and six PRO accents.
- `git diff --name-only`, `git diff -U0`, `git diff --check`: reviewed; whitespace check PASS. Pre-existing changes were preserved.

Visual/runtime gap: no app or simulator/device session launched because current-conversation approval was not provided. Actual rendering in light/dark/pro, PRO accents, small screens, large text and RTL, native press/cancel, foreground refresh and complete care interactions remain visually/runtime unverified. Static checks are not visual evidence.

Cleanup: task log directory removed; native/backend tests remove their temporary fixtures and compiler caches in their cleanup paths. No screenshots, server processes or builds were created by this task. This concise summary and permanent regression tests are retained.
