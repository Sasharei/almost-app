# Almost Working Rules

These rules are mandatory for every Codex change in this repository.

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
