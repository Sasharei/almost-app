# Shopping Pause regression repair — 2026-10-03

## Changes

- Existing users receive a once-only automatic invitation after startup settles, even without savings history. New users receive it after the first committed purchase or saving. The initial cohort and invitation status persist across restart.
- The invitation offers setup as its primary action; Later and Close are secondary. Accepting does not silently grant permission. System permission, picker cancel, validation, stop and manual settings entry remain available.
- Automatic presentation waits for onboarding, tutorials, native/modal hosts, queued prompts, review handoffs, action feedback and celebrations. Purchases qualify for the invitation but never earn savings credit.
- Apple's picker expands selected categories into app tokens using `FamilyActivitySelection(includeEntireCategory: true)`. Mixed app/category selections no longer disable Continue. Only app tokens are kept, so one earned pass still opens one app. Websites are excluded, with localized explanation.
- Updated picker guidance and validation in all 11 app languages.

## Evidence

- Four shopping tests passed, including first-purchase eligibility without credit and compilation/execution of the actual native savings ledger.
- Functional parity passed: 208 contracts. Localization, themes, analytics and native analytics checks passed. Typecheck and lint passed; existing lint warnings remain.
- Full iOS simulator QA workspace build passed, including native module and embedded extensions, with x86_64 and iOS 27.1 SDK. Build log: `/tmp/almost-shopping-fix-x86-build.log`.
- QA required temporarily moving RevenueCat's existing private designated initializer into its struct to avoid Xcode 27's synthesized-initializer conflict. The original Pods source was restored after the build. No dependency version or purchase/attribution behavior changed.
- ARM simulator linking is blocked by the existing ML Kit device-only ARM binary; x86_64 QA was used instead.
- User explicitly authorized simulator launch in this conversation. Isolated devices were created for iOS 27.0, 26.5 and 26.1. The x86_64 simulator attempts did not finish boot/application installation in this session; screenshot `simulator-boot-blocker.png` shows the iOS boot screen. Simulator UI automation also timed out. This is a runtime/visual blocker, not a passing end-to-end result.
- Full `npm run verify` reaches the security audit and fails on the existing 11 unmitigated npm advisories. Gates were not weakened.

## UX review and remaining checks

Source review follows the seven-law policy: 48-point actions, one emphasized action per offer/setup state, honest setup and savings progress, native selection and cancellation, grouped decisions and visible context. Review of actual light/dark/PRO rendering, PRO accents, large text and RTL remains blocked by simulator startup. Static theme checks are not visual evidence.

Still required: real iPhone confirmation that selecting one app, a category containing apps, and a mixed selection enables Continue; website-only/empty selection stays disabled; first-spend invitation waits for feedback, dismissal persists and current users receive it once; permission, 30-minute one-app visit and automatic reshield work in a signed release build. No release was uploaded or submitted.
