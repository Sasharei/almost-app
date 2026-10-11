# Immunity runtime QA — 2026-10-10

Status: language/palette matrix PASS (96/96 functional and 96/96 original-resolution visual checks). Actual party activation, navigation back and cold relaunch PASS.

## Build and environment

Dedicated synthetic simulator `Almost Immunity QA Oct10`, iPhone 17 Pro, iOS 26.1, 402 × 874 pt / 1206 × 2622 px. No physical device, Android, upload or publication used.

Current worktree JavaScript was bundled in Release mode into a copy of the cached native Release simulator app (native shell version 8.0.0). The QA entry supplies synthetic RevenueCat premium information; actual purchases and restoration were not invoked. This is a UI/logic validation build, not a newly archived production binary. Exact source/bundle hashes: [build-provenance.json](build-provenance.json).

Fixture: synthetic name `Immunity QA`; all three needs at 0%; future immunity timer initially 36 hours; last visit 72 hours ago; sufficient synthetic coins and cleaning supplies. Immunity freezes existing values rather than restoring them, so 0% values and dirt remain expected while care-request speech is suppressed.

## Requested matrix

12 locales: en, es, fr, ru, de, pt, it, ar, zh, zh-Hant, ko, ja.

8 palettes: Light, Dark, PRO Indigo / Emerald / Sunset / Gold / Violet / Aqua. Each case cold launches the actual native app, opens Almi, expands the immunity explanation, scrolls to the party benefit and records persisted protection/needs.

Functional records: [native-results.json](native-results.json). Separate original-resolution visual review records: [manual-review.json](manual-review.json). Each case has full screenshots and native hierarchies under `evidence/<case>-expanded.*` and `evidence/<case>-party.*`, Unscaled crops were used for review; retained originals are linked in [EVIDENCE.md](EVIDENCE.md). OCR is supplemental and is not the visual verdict. Spanish/Arabic and some CJK OCR copy warnings were resolved by original-resolution visual inspection; no missing or clipped target copy was observed.

All 96 expanded cards and party benefits fit their surfaces without overlap. Card width is 370 pt; height adapts to the text (Portuguese 216.33 pt, most languages 199.33 pt, Arabic 171.33 pt). Light, Dark and each PRO accent retain readable text, backgrounds, shield, timer and disclosure. All three stat labels remain aligned. Protected care speech contains ordinary/general lines rather than requests to feed, play or clean.

## Activation and re-entry

Russian/Light actual party interaction PASS. Before activation, with all needs at 0% and no immunity, speech said “Хочу 🍓. Да, это подсказка.” The party button activated a 48-hour timer and debited the synthetic balance from 15550 to 15300. Returning home showed “Ты вернулся - ура.” Reopening Almi showed “Продолжай так же.” After termination and cold launch, home showed “Наконец-то! Я скучал.” and Almi showed “Как настрой?” No feed/play/clean request appeared in these protected states. The persisted timer survived relaunch and all three original values remained 0% (freeze, not refill).

[State evidence](activation-results.json); original screens: [before](evidence/activation-before.png), [immediate](evidence/activation-immediate.png), [home after](evidence/activation-home-after.png), [care after](evidence/activation-care-after.png), [home relaunch](evidence/activation-home-relaunch.png), [care relaunch](evidence/activation-care-relaunch.png).

## UX review scope

The protection card is informational with one secondary disclosure action, “How it works”; it introduces no competing primary call to action. The timer conveys actual remaining protection. The shield/title/body are grouped; all three preserved stat labels are visible together; the party action retains its cost and handler. Back and disclosure targets are usable. Requests for unavailable care needs are removed only while protection exists; manual care remains accessible. Fitts, Hick, Zeigarnik, Jakob, goal-gradient, Von Restorff and Miller were reviewed for this affected protection state. No unrelated screen redesign was performed. A broader existing Today-screen issue was observed: the floating $ control overlaps part of the secondary “view all” label in the German fixture ([screenshot](evidence/de-light-home.png)). It is outside the immunity change and is not covered by this target PASS.

## Verification commands

- `npm run check:localization`: PASS, all 12 locales, permission and shortcut resources included.
- `npm run check:themes`: PASS, Light/Dark/PRO and all 6 PRO accents.
- `npm run check:functional-parity`: PASS, 252 contracts / 2148 behavior fragments / 45 reachability patterns.
- Previous implementation verification in this chat: 60 notification regression tests and `npm run verify` passed, with existing ESLint warnings.

## Infrastructure observations

An initial Maestro copy assertion failed because the immunity Pressable groups the accessibility content; the description is rendered in pixels but not exposed as a separate AX label. Native touch/hierarchy operations and original screenshots were used instead of treating this selector failure as a product failure.

The native hierarchy can expose the React tree while the launch splash is still visible. Early home captures were therefore splash evidence, not proof of home speech. The first four locales were recaptured after launch completion; all 12 settled home captures were visually reviewed and showed neutral return greetings. Redundant splash/raw/crop captures were removed; full originals remain. The harness was synchronized past that overlay. Initial touches before splash completion sometimes had no effect; these attempts are preserved in `openAttempts` and were not counted as successful taps.

## Coverage limits

The language/palette matrix covers the named simulator, default text size and current JS bundle. Compact phones, accessibility text sizes, older supported iOS versions, native/fallback comparisons, real-device behavior and remote push delivery are outside this completed target matrix and must not be inferred from it. This report does not certify an entire production release.
