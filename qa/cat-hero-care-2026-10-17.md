# Hero cat care and dirt — 2026-10-17

Follow-up to the initial Hero badge work. Food, play and clean badges now choose the lowest actionable care stat, using production thresholds and the existing neglect rule. Earned hourly coins keep priority. Party protection suppresses all care requests through its exact expiry; it does not erase existing dirt. Repairing a need reveals the next actionable need or removes the badge. Hydration keeps the badge hidden; empty and populated Today states share this Hero; focused decision mode still hides the Hero.

The original Hero rendered only an Image and dropped its existing cleanliness-derived value. Restored that value through Feed → Today Header → TamagotchiHeroImage. A warm brown Image tint blends over the original selected skin using the very same transparent source and contain geometry. Dirt increases with the production cleanliness curve; full cleanliness makes the tint invisible. No colored View/rectangle, original rectangular dirt veil, floating dirt spots, new asset, masking dependency or animation timer is added to the Hero. Both image layers remain mounted across cleanliness updates. This is a silhouette tint, rather than the former rectangular veil and spots.

Existing savings details and cat target remain separate. The cat retains press feedback, release activation, cancellation and propagation prevention. Its badge opens Food, Play or Clean; earned rewards and ordinary care entry retain Food and its existing reward card. Existing clean gestures, tool purchase/refill, accessibility cleaning action, party, feeding, toys, claims and dismissal handlers are preserved. Button label includes the selected next action. Text wraps with natural height; RTL ordering and theme tokens remain. No animation is added. Apple Design, five UX principles and seven-law UX checklist reviewed in source within the changed Hero and entry route scope.

Verification:
- Baseline `npm run check:functional-parity`: PASS (259 contracts).
- `node --test scripts/tests/cat-notification-regressions.test.js`: PASS (23 tests). Added actual care thresholds, relative need priority, neglect/protection, silhouette-only rendering structure, monotonic cleanliness tint and selected/default tab routing checks. These tests are logic/tree evidence, not screenshots.
- `npm run verify`: PASS, exit 0. Includes functional parity (260 contracts), analytics/native config, attribution, notification and other regression suites, typecheck, lint, localization, themes, backend and static release gates. Lint has 434 warnings and zero errors in this working tree. App size gate reads the pre-existing debug APK and warns about its baseline growth; no app build or installation was performed.
- Localization: two new strings in all 12 dictionaries covering all 13 supported locale choices; no placeholders introduced. `check:localization`: PASS.
- Theme static check: PASS for light/dark/pro and six PRO accent options. Badge text retains existing card/text colors; dirt does not cover badge or savings text.
- `git diff --name-only`, `git diff -U0` reviewed for changed UI copy; `git diff --check`: PASS. Pre-existing changes preserved.

Native implementation source check: installed React Native ImageProps defines tint as affecting non-transparent pixels; Android uses SRC_IN and iOS uses template-image rendering. The local classic GIF/WebP assets report alpha. Actual animated tint rendering is still unverified.

Runtime/visual limits: no simulator/device app launch was authorized or performed. Actual rendering in all themes/PRO accents, animated-layer alignment, small screens, large text, RTL, touch/cancel, complete play/clean interactions and foreground refresh remain unverified. No static result is claimed as visual evidence.

Performance checklist assessment: no startup, network, data access, pagination or list changes. Reuses the selected source and adds one tinted image layer; no dependency, asset processing, JS animation loop or extra timer. Runtime decoding/compositing, memory, scroll/input responsiveness and release before/after measurements remain unverified without an authorized app session. No speedup claimed.

Cleanup: removed the task-owned temporary directory with raw verification log and diff. Native/backend tests clean their own temporary fixtures/caches. No screenshots, persistent server, new build or app session was created. Only this summary and intentional regression coverage are retained.
