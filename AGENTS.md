# Almost Working Rules

These rules are mandatory for every Codex change in this repository.

## Simulator and Emulator Gate

- Never start, boot, open, or otherwise launch an iOS Simulator, Android Emulator, or connected-device app session without the user's explicit approval in the current conversation.
- Do not run commands that implicitly launch a simulator or emulator, including `npm run ios`, `npm run android`, `expo run:ios`, `expo run:android`, `react-native run-ios`, or `react-native run-android`, unless the user has explicitly asked for that launch.
- Static checks, dependency installation, CocoaPods installation, and non-launching build commands remain allowed when they are needed for the requested work.

## P0 Attribution and Revenue Safety Gate

- Treat install attribution and approved subscription/revenue postbacks as release-critical infrastructure on both iOS and Android. Never make them depend on product-analytics consent, settings hydration, onboarding choices, profile toggles, or a stored legacy preference.
- ATT controls access to IDFA only. An undetermined, denied, restricted, unavailable, or delayed ATT result must never delay or disable AppsFlyer startup, install reporting, SKAN/privacy-preserving attribution, or partner postbacks.
- Keep AppsFlyer partner postbacks enabled for every configured network. Runtime code must clear partner filters before SDK initialization and must never introduce an `all` sharing block, a default-off partner-sharing state, or a user setting that can suppress install postbacks.
- Keep RevenueCat as the single server-side owner of subscription and purchase lifecycle postbacks to AppsFlyer. Never restore a RevenueCat AppsFlyer sharing block, and never add a duplicate client-side `af_purchase` path.
- Advertising-network payloads must remain allowlisted and privacy-minimized. Do not send saved-item content, goals, personal-finance amounts, or other sensitive product data; ATT-gated identifiers may be used only after the corresponding platform authorization.
- Any change to analytics, attribution, consent, onboarding, settings, purchases, native SDK configuration, or storage migration must preserve these invariants on both platforms. Before declaring the change complete, run `npm run check:analytics-contract`, `npm run check:native-analytics-config`, and the normal repository verification gates. Do not weaken or remove these attribution assertions without the user's explicit approval.
- When a release changes this infrastructure, validate fresh-install and purchase/subscription paths in an actual release build on both iOS and Android before rollout. Debug builds are not sufficient evidence when attribution is disabled in development.

## Localization Gate

- After every code change, run `npm run check:localization`.
- Before finishing, inspect `git diff --name-only` and `git diff -U0` to decide whether UI-facing text changed. Treat strings in `App.js`, `src/components/**`, `src/constants/**`, paywalls, onboarding, profile/settings, widgets, notifications, alerts, buttons, labels, empty states, tutorial copy, and premium copy as UI text.
- New or changed UI text must be represented in the app localization dictionaries instead of being added as hardcoded display text.
- Every UI text update must cover all existing app languages: `en`, `es`, `fr`, `ru`, `de`, `ar`, and `zh`. The `ar` dictionary covers both `ar-sa` and `ar-ae`.
- Placeholder tokens such as `{{amount}}`, `{{title}}`, and `{{count}}` must stay identical across languages for the same key.
- If a UI text change is intentional but translation work cannot be completed in the same turn, stop and report the exact missing languages/keys instead of leaving silent fallback text.

## Theme Visual Gate

- After every code change, run `npm run check:themes`.
- If the change can affect UI, layout, color, typography, surfaces, modals, navigation, paywalls, cards, charts, widgets, or visual state, review the affected screen in all theme modes from `THEME_IDS`: `light`, `dark`, and `pro`.
- For PRO theme changes, also verify the affected UI with the configured PRO accent options when the accent color can affect the result.
- The visual review must check readable contrast, missing backgrounds, clipped or overlapping text, disabled/active states, modal backdrops, borders, shadows, and icon visibility.
- Compare repeated controls as a set: sibling labels must share a visual baseline or center, and equal-role controls must keep equal heights. Treat one raised, lowered, wrapped, or optically off-center item as a failed visual check, including across localized labels.
- Check space distribution inside every surface: flag unexplained empty regions, tiny metrics stranded in corners, and lopsided visual weight unless the asymmetry is clearly intentional and supports the reading order.
- Prefer simulator or device screenshots for affected screens. If the app cannot be run locally, state the blocker and still run the static theme check.

## Functional Parity Gate for Design Changes

- Design work is behavior-preserving by default. Layout, styling, hierarchy, copy presentation, and motion may change; available actions, navigation destinations, gestures, handlers, validation, persistence, analytics, purchase/restore/manage flows, and accessibility actions must continue to work.
- Before editing a screen or component for design, inventory its user-visible actions and add or confirm the corresponding invariants in `scripts/ui-functional-contracts.json`. Run `npm run check:functional-parity` before the edit to establish a passing baseline and again after the edit.
- Never remove, hide, disable, replace with a no-op, or make unreachable an existing action or user flow merely to simplify the design.
- If a design proposal genuinely requires removing or changing functionality, stop and ask the user for explicit permission. Name the exact behavior, why the design requires the change, and the user impact. Do not implement the removal until permission is given.
- Updating or weakening `scripts/ui-functional-contracts.json` to permit removed behavior also requires that same explicit user permission. A visual refactor is not sufficient justification.
- Preserve callback wiring when moving UI. For every changed interactive surface, compare the before/after handlers and verify the happy path plus cancel/back/retry paths where they exist.
- After every code change, run `npm run check:functional-parity` in addition to the localization and theme gates.

## Final Verification

- For non-trivial changes, run `npm run verify` after the targeted checks.
- In the final response, mention the functional parity check, localization check, theme check, and any visual theme review that was run or could not be run.

## QA and Test Cleanup (Mandatory)

Cleanup is a mandatory completion gate after every test, QA, build or debugging task, including failed checks. Disposable artifacts must not be retained by default.

- Before starting checks, identify their temporary output locations in both the repository and system temporary directories. Prefer a dedicated task directory so cleanup cannot affect other work.
- After checks finish and before completing the task, delete all unnecessary task-generated screenshots, recordings, accessibility dumps, raw logs, temporary fixtures and backups, exported test data, bundles, coverage output, temporary workspaces, task-specific caches and build intermediates. An ignored file is still subject to cleanup; adding it to `.gitignore` is not cleanup.
- Keep only a concise text verification summary with commands, outcomes and any unresolved failure details. Do not retain raw QA evidence solely because it was used for review or a failed check. Remove or update references to deleted evidence. Retain an artifact only when the user explicitly requests it or it is still required for an active release, upload or other unfinished work; remove it when that work finishes.
- Preserve application source, assets, localization resources, permanent automated tests and their intentional fixtures, signing material, user data and release-critical symbol files needed for crash symbolication. Temporary test fixtures are disposable; maintained regression fixtures are source files.
- Delete only confirmed disposable files owned by the task. Do not interrupt or delete outputs of another active task, indiscriminately clear shared caches or dependencies, or erase simulator/device data. Identify older artifacts from other tasks as cleanup candidates without assuming they are unused.
- Stop temporary servers, watchers and other background processes started solely for the completed checks before removing their files. Preserve sessions the user requested to keep available.
- Confirm that temporary output directories were removed or emptied, and report cleanup completion and any retained artifact with its reason. If a required cleanup cannot be performed, report the exact blocker instead of silently leaving files behind.


## Mandatory seven-law UX review (all application work)

Read and follow [UX_RULES.md](UX_RULES.md) before planning, implementing or reviewing application UI/interaction changes. It contains the mandatory Fitts, Hick, Zeigarnik, Jakob, goal-gradient, Von Restorff and Miller rules, state/action contract and completion checklist. Apply it to every affected state; preserve useful functionality and result quality, verify localization and supported themes, and report evidence and unverified visual/runtime coverage. Include the policy in authorized agent handoffs. Existing project execution and release restrictions remain in force.

The shared maintained source on this host is `/Users/sasarei/.codex/rules/UX_RULES.md`; the project copy preserves access when the repository is used elsewhere. For future policy updates, keep these copies synchronized.
