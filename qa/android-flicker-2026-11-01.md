# Android rendering repair — 1 November 2026

Scope: Almi/home companion, care window and its tabs, room previews, card amount editors, Android navigation/FAB rendering. Source: working tree based on `265d040`; existing unrelated work was preserved. No version bump or app publication.

## Changes and state/action review

- Retain Almi's native image identity across poses and selected skins. Android uses a 180 ms image cross-fade so the outgoing drawable remains during first-frame decoding. Use disk caching to avoid retaining decoded animation sets on older Android heaps.
- Remove Android image fades from room backgrounds, objects, catalog thumbnails and the shop cat.
- Keep the care window and tab content opaque on Android; preserve their existing movement. Avoid transaction-wide LayoutAnimation under Android Fabric when opening/updating card editors.
- Disable live Android root capture for the fallback tab bar and FAB. The FAB uses opaque light/dark/PRO backings, preserving its plus/currency icon and parent touch handlers. Manual amount input also respects the existing Android blur safety switch.

Primary actions remain the existing contextual save/spend confirmation, selected care action and room review/purchase/place/remove action. Existing navigation, Back/close/cancel, insufficient-balance feedback, cleaning gestures/accessibility action, rewards, skin routes and confirmation/persistence callbacks are retained. Existing functional contracts cover these actions and were checked before and after changes; no contracts were weakened.

Apple Design and the five UX principles/seven UX laws were reviewed within this rendering scope: no actions or data coverage removed; no primary/secondary hierarchy or hit target changes. Opacity cross-fades are compatible with reduced-motion feedback; existing reduced-transparency handling is preserved and Android now uses solid materials.

## Verification

- `npm run check:functional-parity`: pass, 267 contracts.
- `npm run check:localization`: pass for all 12 current languages, native permission strings and shortcut checks. No user-facing copy changed in this task.
- `npm run check:themes`: pass, light/dark/PRO and six PRO accents.
- `node --test scripts/tests/ui-design-regressions.test.js`: pass, 12 tests. New cases execute image rendering across pose/skin changes, platform layout-animation routing, FAB rendering and the manual amount backdrop safety switch. The original pose identity and Android Fabric tests fail against the captured pre-fix source.
- `npm run typecheck`: pass. Full lint: no errors (existing warnings); targeted lint: no errors.
- `npm run verify`: blocked at backend dependency security audit: 2 moderate and 3 high vulnerabilities. All preceding suites pass, including analytics contract, native analytics configuration, attribution, UI session and engagement tests. No dependency changes were made for this unrelated failure.
- Remaining checks run separately: security tests (7), backend tests (27), runtime parity and app size checks pass.
- Android `app:assembleRelease`, ARM64: pass. Final build disables Sentry auto-upload and excludes the Crashlytics mapping upload task.

## Runtime observations

- API 36 / Android 16, Almost_Release_802_QA, 1080×2400, 420 dpi, software GPU, release 8.0.2 (136). Before repair, captured care frames show Almi disappearing while dirt remains. At 30 samples/second, 21 of the first 480 samples in a 16-second window have no cat pixels in the tracked region. This is sampled video evidence, not a display-FPS measurement.
- Stable image identity alone still left intermittent missing frames. Adding image cross-fades and removing root blur capture produced zero missing-cat samples in a subsequent 30-second recording (895 samples). Care Food/Games/Clean and room/insufficient-balance states were visually inspected. The later disk-cache policy is validated separately below.
- API 24 initially exposed root-blur/SVG bitmap OOMs, then decoded-frame memory pressure in the intermediate build that used memory caching. The final policy uses disk cache and disables root capture.

Final APK: SHA-256 `a859867c0facfde7eae18b4271f08e306ff95bd0275a69790237ac87cc31e7ad`. Signature verification passes; 29 ARM64 native libraries are packaged, including React Native, Hermes and libc++. A prior incremental package omitted stripped native libraries and was rejected; forcing native stripping and packaging repaired it.

Final-build runtime results:

- API 36: final signed APK launches successfully. Care rendering with the final disk policy was recorded; all 229 samples in the resulting 7.635-second recording contain the cat. This complements the longer 895-sample intermediate recording. Light care/room states and return to Today were inspected at native resolution. The final build also passed visual inspection of the card Spent amount picker, custom amount input/keyboard and Back/cancel paths; no spend/save transaction was committed during this runtime check.
- API 24: dark returning-user Today/FAB/navigation render, but entering care still causes an SVG bitmap OOM on this emulator's 48 MB Java growth limit (720×1280 logical override, physical 1280×2856). The final crash is ordinary SVG drawing, without the removed live-blur capture stack. This remains an unresolved compatibility/memory risk; API 24 care is **not** a pass. The first-run practice overlay also exposed an OOM in this configuration; returning-user fixtures skipped that unrelated flow for the targeted check. No heap limits were raised to hide the failures.
- The emulator GUI also stalled independently; final API 36 checks use the same software GPU without its GUI window. Maestro/UiAutomator intermittently failed to acquire idle state, so semantic automation failures are not counted as passes and stale hierarchy dumps were not accepted as visual evidence.

Cleanup complete: removed task recordings/screenshots, raw logs, backups, fixture files, temporary Python environment and the dedicated `/tmp/almost-android-flicker.XE2IlJ` directory (absence confirmed); removed the generated APK and package metadata/profiles. Removed task media from both emulators. Uninstalled only the task-installed Almost app on API 24, reset its display overrides (physical density 480 confirmed), disabled adb root and stopped both task emulator sessions. API 36 app/user data and the unrelated emulator session were preserved. Shared pre-existing build/cache outputs were not indiscriminately removed; release mapping, native debug symbols and source maps are retained for crash symbolication. Only this concise report is retained as QA evidence.

Coverage limits: no physical-device or iOS runtime testing; no subscription purchase, restore or production rollout. PRO rendering requires a Premium test entitlement and is not inferred from static theme checks. No startup, general frame-rate or memory speedup is claimed from static checks.

## Readiness

The targeted missing-cat flicker is repaired and verified on API 36. Universal Android/release readiness is **not** established: the API 24 care OOM remains open, and the full repository verification gate is blocked by the existing backend dependency audit. PRO/accent native visuals remain unverified.


Android 7 follow-up: the previously unresolved low-memory care crash was repaired and the final expanded emulator scenario passed; see [Android 7 memory follow-up](android7-cat-memory-2026-11-01.md). This is subsequent evidence, not a change to the historical results above.
