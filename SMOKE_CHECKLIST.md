# Smoke Checklist

## Runtime Parity

- Run `npm run check:release` and confirm all checks pass.
- Confirm `newArchEnabled` is `false` in Expo config, Android, and iOS runtime config files.
- Confirm `ui_refresh_v1_enabled` rollout key is wired (Remote Config module available path and fallback path).

## Launch and Navigation

- Launch app -> splash completes -> home renders without errors.
- Verify liquid tab bar renders as a rounded glass capsule with active bubble and icon+label on each visible tab.
- Feed loads and scrolls; open/close history modal.
- Add a custom temptation below 150 -> appears in feed.
- At 150+ custom temptations: adding shows a warning but still opens the creator.
- At 200 custom temptations: adding shows a limit alert and does not create a new item.
- A temptation with a frequency shows a countdown that updates over time.
- Text and text inputs render with Inter fonts.
- Orientation stays portrait on phone/tablet builds.
- Android: verify UI at font scale 0.85 / 1.0 / 1.15 / 1.3.
- Android: verify UI at default and large display size.
- Open frequency reminder modal and confirm time wheel digits stay clipped inside the picker.
- Open usage streak/save overlays and confirm animated digits do not leak outside their cards.
- Open long quick modals (custom temptation, new goal, pending) and confirm content is scrollable.
- Verify at least one problematic session with native device screen recording and compare to Session Replay.

## Sensor and Animation Guardrails

- Home inactive -> move to another tab/screen -> verify no visible sensor-driven updates continue in Daily Goal card.
- Background app for at least 20 seconds -> return -> verify Daily Goal card resumes without animation jump or listener duplication.
- Open Usage Streak weekly reward modal and keep open for 15+ seconds -> verify animation settles without runaway CPU spikes.
- Open Usage Streak restore prompt and keep open for 15+ seconds -> verify pulse animation remains smooth and does not accelerate.

## Liquid Glass Fallback Matrix

- iOS 26+ (native build): verify tab bar background and active bubble render via native `LiquidGlassNativeView`.
- iOS <26: verify tab bar falls back to blur + gradient layers with no crashes.
- Android: verify tab bar uses fallback blur/overlay and keeps 60fps while switching tabs quickly.

## Performance and Memory

- iOS: run a 3-5 minute active session and confirm no `cpu_resource` warnings are generated.
- Android: run a 3-5 minute active session and confirm no sustained jank during modal overlays.
- Compare memory before/after animated overlays and verify footprint returns near baseline after closing overlays.
