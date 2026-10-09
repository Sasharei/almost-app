# Currency selector — implementation and verification

Implemented after the user approved the simplified proposal on 2026-10-05.

## Delivered

- Shared currency picker for onboarding and the existing settings currency route. Onboarding shows one current-currency field instead of 34 horizontal chips.
- Search by ISO code, localized currency name, or English currency name; case and diacritics are ignored. Search is local and offline.
- Current selection appears once at the top when not searching. All 34 currencies remain reachable; PHP is Philippine peso (₱).
- Selecting a row calls the existing currency callback and returns. Cancel/Back does not write currency. Onboarding preserves its tap sound, language choices, Continue, Terms, and manual-choice priority.
- Full currency names and new UI/accessibility copy are bundled for all 12 translation dictionaries. Both Arabic app locales resolve to Arabic copy; layout mirrors and currency codes stay LTR.
- First supported system language initializes a fresh app; language-derived currency defaults apply until a manual choice. Existing saved settings take precedence (see AUTO_DEFAULTS.md).

## State/action and UX source review

| State | Primary action | Secondary actions | Result |
| --- | --- | --- | --- |
| Onboarding language/currency | Continue | Change language, open currency picker, Terms | Existing flow retained |
| Settings currency or picker default | Choose currency | Search, Back | One-tap apply and return; all choices retained |
| Search results | Choose matching currency | Edit/clear query, Back | Current selection can also be found |
| Empty search | Clear search | Edit query, Back | Currency remains unchanged |
| Return after choice | Continue (onboarding), existing settings task | Reopen selection | Original callback/persistence paths retained |
| Rates loading/error | Choose currency | Search, Back | Local catalog remains available independently |

Fitts: full-width rows and minimum 48px back/search-clear targets. Hick: secondary picker hides the long catalog from the onboarding common path. Jakob: familiar searchable single selection. Miller: current selection plus complete sorted list, names and stable ISO codes. Von Restorff: current selection has a check and theme emphasis; onboarding Continue remains the primary CTA. Zeigarnik and goal-gradient: existing honest onboarding progress retained, no added required stage. No capability or navigation destination was removed.

Source review covered light/dark/PRO semantic color roles, RTL, full names, fixed symbol/code/check columns, keyboard tap handling, cancel, empty and selected states. Rows allow text wrapping and larger fonts rather than truncating currency names. Native screenshots and runtime measurements are still required to verify wrapping, equal-role geometry, keyboard insets, screen-reader focus, and contrast in rendered states on both platforms and all accents. Static checks are not visual evidence.

## Checks

- check:functional-parity: pass, 228 contracts, 2007 fragments, 41 reachability patterns. Currency callback was moved into the shared component; new route/shared-action assertions cover both ends.
- check:localization: pass for en/es/fr/ru/de/pt/it/ar/zh/zh-Hant/ko/ja and native permission resources. Added dictionary registered with validator; every dictionary names all 34 currencies.
- check:themes: pass, light/dark/PRO and six PRO accent configurations.
- currency-selector tests: 5 pass (catalog/localization, search, select/return, cancel/clear, onboarding sound). The callback adapter executes component wiring; it is not native rendering evidence.
- npm run verify: bank parser, functional parity, analytics/native analytics contracts, attribution, cloud notifications, UI session, engagement, shopping blocker passed. Stopped at check:security-audit due existing dependency advisories; dependencies/lockfile were not changed for this task.
- Remaining gates run separately: typecheck, scoped lint, full lint (0 errors, 460 warnings), test:security, backend:test, check:release pass. Size check used the existing debug APK; no fresh native build or release validation was performed.
- git diff --name-only and git diff -U0 inspected, with task-start backups used to isolate these edits from unrelated pre-existing/concurrent changes. All new display strings live in the registered localization dictionary.

No simulator, emulator, or device app session was started: project policy requires explicit approval for launch. Visual/runtime theme coverage remains unverified. Performance scope was assessed: a virtualized local 34-item list, no new network request; no runtime improvement claim or unsolicited full audit.
