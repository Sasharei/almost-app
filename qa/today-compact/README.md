# Compact Today — 2026-10-03

User approved shrinking the hero, shortening Series, showing active Shopping Pause progress, putting the actual waiting count inside Make a decision, and moving Shopping Pause management/stop to Profile → Settings.

## Behavior / UX

- Overview: Make a decision is the main emphasized action. Savings breakdown and mascot care remain reachable. The incumbent speech bubble stays visible above the original-size cat on the right; mascot care retains its tap action. The hero removes only 16 points of bottom whitespace, preserving its inner composition.
- Series: actual completed/total and coins remain visible. Tap explains the series while unfinished; ready/claimed states retain chest/reward callbacks.
- Active pause: real savings/target, clamped progress, remaining amount; no app-selection instructions or management shortcut.
- Permission/selection recovery: only the relevant recovery action appears; a ready pass offers direct one-app unlock. Visit-active state shows expiry. Stop remains in profile settings with confirmation.
- Loading/error: working/disabled state and localized retry; no competing retry/setup actions. Empty/inactive setup and opt-out remain reachable. Large text and exceptional states may scroll rather than clip or shrink touch targets.
- Seven-law review: familiar navigation; 48px or larger controls; grouped actual progress; one emphasized decision action; explanations disclosed progressively; no removed savings/reward/stop capability.

## Visual evidence

Latest native evidence: `native-light-en.png` and `native-dark.png` from iPhone 17 Pro / iOS 26.5 (402×874 points). The restored incumbent hero, compact Series, active pause progress and decision action fit above navigation at standard text size. Speech, cat, borders and progress remain readable in light and dark. PRO attempts reverted to light after the QA account failed live entitlement validation, so native PRO visual coverage is unverified. Older browser screenshots and measurements describe the superseded design, not this latest hero.

The user authorized simulator launch and restarting CoreSimulator. Stable Xcode with an ARM simulator resolved the prior x86 framebuffer crash. The app uses the repository's actual JavaScript through Metro. To work around device-only MLKit binary linkage, the separate `/tmp/almost-today-arm-qa` native build omits OCR; no OCR changes were made in the repository. Its Shopping Blocker bridge reads synthetic UI status (two selected apps, €40/€100) for visual verification. These captures verify actual native layout, **not** Screen Time authorization, shielding, unlock behavior, OCR, or a production/release build. Large Dynamic Type and smallest native iPhones remain unverified; exceptional states may scroll rather than clip controls.

## Verification

Localization (11 languages), themes, functional parity, typecheck and lint run. Existing attribution, UI/session, engagement and Shopping Pause tests passed through npm verify before it stopped on 11 existing npm audit advisories. Lint has 458 existing warnings, no errors. New text uses existing localized keys; placeholder tokens unchanged.
