# Cat menu button colors, 2026-11-02

Scoped stable semantic surface fills to the cat menu using SolidSurfaceProvider. Adaptive native glass no longer renders behind its controls or cards. Other screens retain their existing material policy. Existing worktree edits were preserved.

Action and UX review: the selected care tab retains its primary care action; full/disabled, tool selection, cleaning, reward ready/waiting, and celebration states retain their existing prerequisites and handlers. Daily bonus, hourly collection, report, skins, room navigation, tabs, close/back/swipe, and accessibility actions remain reachable. Press feedback and release/cancel handling are unchanged. Target sizes, grouping, progress, hierarchy, text and layout are unchanged. Existing tamagotchi-menu functional contracts cover these actions and passed before and after the edit.

Verification:
- node --test scripts/tests/surface-contrast.test.js: 5 tests passed. Covers stable material selection, themed color composition, contrast, light/dark/PRO and six PRO accents, plus reduced transparency.
- npm run check:functional-parity: passed.
- npm run check:localization: passed for all 12 supported locales. This fix adds no display strings or accessibility labels.
- npm run check:themes: passed.
- npm run verify: passed, including typecheck, lint, analytics/native configuration, app/backend tests and release static gates.
- The size gate examined a pre-existing release AAB, not a build of this fix. No new build, upload or device/simulator session was started.

Visual/runtime coverage: source and component regression checks only. Actual flashing, press/cancel behavior, full theme rendering, long translations, RTL and large text were not observed on a device or simulator because launch requires explicit approval. No measured performance claim. The change removes adaptive material work in the menu without changing business state or timers.

Cleanup: task-owned raw logs, temporary compiler outputs and caches under the dedicated /tmp/almost-cat-buttons-* directory were deleted. Only this concise verification summary and the maintained regression test are retained. No temporary server was started.
