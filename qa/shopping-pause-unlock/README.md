# Shopping Pause unlock repair — 2026-10-04

The reported path was earned savings → repeat app selection → choose one app for a 30-minute pass → prolonged loading → return to app selection without a pass.

## Findings and change

`startMonitoring` ran on the UI thread inside the App Group file transaction. The DeviceActivity monitor also enters that transaction at interval start. Synchronous extension callbacks could wait on the app's lock while the app waited on the system. Pass scheduling now runs on a serial background queue outside the transaction. Eligibility is checked before registration and again before committing. Consumption and shield removal happen only after registration succeeds. Failed commits cancel the registration outside the lock and retain the durable earned credit. Stopping monitoring also happens outside the transaction.

The app treated every non-approved authorization value as revocation. Apple's AuthorizationCenter initially reports `notDetermined`: https://developer.apple.com/documentation/familycontrols/authorizationcenter/authorizationstatus. Initialization now preserves selection and shields. Only confirmed `denied` marks the selection invalid. Monitor callbacks reconcile the stored pass without consulting the extension's newly initialized authorization center. Actual denial in the app still requires fresh selection while preserving the savings goal.

## State/action and UX review

The existing empty/setup, permission, selected-app, goal-entry, saving, earned, picker, processing, error/retry, open-pass, expiry and stop states were reviewed. Primary actions remain permission → select apps → start → continue saving → choose one app → confirm unlock → continue. Cancel, close, settings, retry and confirmed stop remain wired. The Today error state no longer displays a stale loading hint. No styles, theme tokens, translation values or accessibility labels changed. This change preserves the selected apps across initialization and makes progress honest by consuming credit only after a registered pass is committed.

Source review covers all seven UX rules and preserves existing useful actions. Static checks are not visual/runtime evidence. Native behavior and supported theme rendering must be distinguished from the unit tests below.

## Automated evidence

- Eight shopping tests pass. Actual Foundation Swift ledger and reconciliation code compile and execute on macOS with system framework substitutes where required.
- Native pass methods execute against a synchronous reentrant monitor substitute: successful one-app pass, repeat grant rejection, registration failure, state-write failure, permission change between registration and commit. No test allows scheduling/stopping IPC while the transaction lock is held.
- Reconciliation covers initialization, cold monitor callback, serialized state/restart, expiry, confirmed denial and reauthorization. Savings tests cover baseline exclusion, consumed IDs, deduplication, edits and localized goal input.
- Functional parity: 221 contracts, 1,957 behavior fragments, 41 reachability patterns pass.
- Localization (all 12 supported dictionaries) and themes (light/dark/PRO, six accents) pass. No user-facing strings changed.
- Attribution/native analytics checks, attribution tests, UI-session tests, engagement tests, TypeScript, ESLint (existing warnings), security storage tests, backend tests and release static checks pass.
- Full `npm run verify` stops at 11 existing npm audit advisories. The later verification gates were run separately.
- Full x86_64 simulator workspace build passes with a temporary RevenueCat initializer relocation for the beta Swift compiler. Dependency contents and permissions were restored byte-for-byte afterward. No shipping dependency patch was retained.

## Simulator coverage

User authorized simulator testing in this conversation. The iOS 26.5 x86_64 runtime stalled at a black boot screen. The same simulator booted successfully in ARM mode. ARM testing uses an existing isolated QA workspace with OCR targets excluded because of its device-only MLImage library; the shopping module and all three extensions remain included. Shipping project files do not receive these QA build workarounds.

Both beta-SDK and stable-SDK ARM QA builds passed. iOS 27.1 failed simulator data migration. iOS 26.5 rejected manually signed builds with NSPOSIXErrorDomain 163 / SBMainWorkspace launch denial. Restoring the executables' normal simulator linker signatures allowed the stable-SDK build to launch through Metro, but that launchable configuration lacks the App Group capability needed for the native shopping store. The native sync consequently fails and cannot enter setup or a pass. This is a local runtime verification blocker, not a demonstrated reproduction of the user's device failure.

| Scenario | Evidence/result |
| --- | --- |
| Launch current JS with corrected native shopping module | Observed on iOS 26.5 ARM, stable Xcode QA build |
| Today → Shopping Pause | Observed; opens the localized error panel |
| Retry after native-store failure | Observed; returns to actionable error without hanging |
| Close after failure → Today | Observed; returns to Today and retains access to retry |
| Error display after UI fix | Observed in light and dark; obsolete loading text disappears |
| Permission, real picker cancellation, app selection, target entry, earned pass and expiry | Blocked by native capability access in the launchable simulator build; not runtime PASS |
| Restart of a real native pass, multiple apps, repeat pass, denial/revocation | Not runtime verified; covered in the native code tests with system substitutes |
| JS cancellation, changed savings, native rejection, retry, pending unlock followed by stop | Actual controller code executed with a native-module substitute; tests pass |
| PRO and its six accents | Static validator passes; runtime visual coverage blocked by the QA installation's Premium gate. No subscription purchased |

`light-ru-runtime-error.png` shows the native app's actionable error panel. `dark-ru-error-card.png` shows the corrected Today card without obsolete loading text. The initial light Today rendering was also inspected through the simulator UI. These screenshots do not prove system app shielding or grant/expiry behavior.

Test storage was backed up before completing an unrelated demo reminder and changing themes, then restored after checking the feature. No real payment, purchase, upload, device launch or publication occurred.

A signed iPhone build is still required to verify the complete Screen Time path, extension execution, 30-minute expiry while terminated/locked, reboot and actual authorization revocation. No production simulator bypass or fake success path was added.

## Separate existing UX findings

The demo subscription-due prompt offers only paid/skipped and deliberately ignores close requests. It can interrupt access to other flows until a decision is recorded. The dark theme's contextual PRO paywall heading extends past its light artwork onto a dark background with unreadable dark text. These surfaces were not changed in this repair; they need a separate review.
