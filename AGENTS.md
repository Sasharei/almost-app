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

## Final Verification

- For non-trivial changes, run `npm run verify` after the targeted checks.
- In the final response, mention the localization check, theme check, and any visual theme review that was run or could not be run.
