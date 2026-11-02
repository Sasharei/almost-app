# Almi animation timer fix, 2026-11-02

Scope: mascot animation scheduling in App.js and maintained regression tests in scripts/tests/ui-design-regressions.test.js. Existing unrelated workspace edits were preserved.

Fix: one effect owns idle and reaction timers. Parent callback identity, equivalent skin maps and care-pressure updates do not restart reaction deadlines. Completed or cancelled reactions return immediately to a different idle animation. Replacement and unmount clear stale timers. Native image identity and decoding configuration remain unchanged.

Verification:
- node --test scripts/tests/ui-design-regressions.test.js: 18 passed, including 3 new virtual-clock regressions.
- npm run test:ui-session: 136 passed.
- npm run check:functional-parity: passed, 268 contracts. The first full run briefly failed the unrelated decision-average-memory-shared contract during concurrent workspace changes; a subsequent check and full run passed this gate.
- npm run check:localization: passed for all 12 current language dictionaries and native resources. This task changed no user-facing strings.
- npm run check:themes: passed for light, dark, pro and 6 PRO accents.
- npm run check:analytics-contract and npm run check:native-analytics-config: passed.
- npm run typecheck: passed.
- npm run verify: 510 tests passed before lint stopped on 5 undefined-symbol errors in another task's untracked .status-gradient-qa.js. No lint errors were reported in the two files changed by this task. Lint also reported 445 warnings across application code.
- npm run lint passed earlier in this task, before that temporary QA file appeared.
- npm run test:security: 7 passed.
- npm run backend:test: 38 passed on retry. The first invocation exited 134 without output.
- npm run check:release: passed against the existing debug APK; this does not verify a newly built release or store eligibility.
- git diff --check on the two affected source/test files: passed.

UX/source review: care tabs retain their selected primary care action, secondary navigation/customization/reward actions, existing disabled prerequisites, cleaning gesture and accessibility alternative, cancellation and dismissal. No layout, hierarchy, colors or text were changed. All seven UX rules were reviewed within this motion-only scope. Main-screen idle cycling shares the same timer fix.

Limitations: no simulator, emulator or device session was launched. Actual native decoding, visible animation transitions, all-theme rendering and release performance remain unverified. No performance improvement is claimed from virtual-clock tests. Selected Xcode reported 27.2 (27B52); no Xcode installation or selection was changed.

Cleanup: removed the dedicated /tmp/almost-mascot-check.9IsYkI directory, including logs, inspected diff, compiler/test temporary files and task-specific Node compile cache. Kept only maintained regression tests and this concise verification summary. Other tasks' files, caches, assets and build outputs were preserved.
