# Android 7 cat-care memory follow-up — 1 November 2026

Scope: Android 7/API 24 release rendering and repeated care/room navigation. No attribution, consent, purchase, heap-limit or display-text changes. Unrelated workspace changes are preserved.

## Repair

Baseline APK `b811a3d561b6a3d803193249d6ab063bd580b627ec8eac7a7e40663155e3fbed` exhausted the unchanged 48 MiB Java growth limit entering care (Today already allocated about 40,284 KiB).

- Android care glow now uses a tinted 256×256 alpha mask instead of a screen-sized SVG backing bitmap; iOS retains its SVG. Generator: `scripts/build-almi-care-glow.py`.
- API 24/25 uses Fresco for the same animated WebP poses, preserving stable image identity. Low-memory legacy heaps use a 1 MiB decoded-image cache and drawable-sized frames; RN networking/cache integration is preserved. API 26+/iOS retain Expo Image.
- Density-correct 1x/2x/3x skin placeholders avoid Android resource upscaling. Legacy dirt is bounded to 512×512. All room layers request display-sized decoding; legacy room assets are bounded to 768px backgrounds/384px furniture. Generator: `scripts/build-almi-android-previews.py` (Pillow).
- The fully covered home mascot releases its decoder while preserving layout; it returns when care closes. While the room sheet is open, the visible care avatar uses the selected skin preview and remains visible above the sheet. The care animation resumes on close. No poses, skins, room items or actions are removed. Legacy shop window animation is disabled to reduce overlapping allocation.

Intermediate versions were rejected: backdrop/image-resize changes alone still hit decoder OOM; unmounting the visible care avatar under the partial room sheet hid the cat; density-correct previews passed ordinary navigation but still failed after Food/Games/Clean transitions. The final room-image bounds address that remaining allocation pressure.

## Verification

Release build command: `SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_ALLOW_FAILURE=true ./gradlew app:assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain --no-daemon --offline --max-workers=2 -x app:uploadCrashlyticsMappingFileRelease`.
Final APK SHA256: `fb04e3bb734e3a09e2692731d1062a6a1124f4d1770922dfff43f59fbd7447be`.

`npm run check:functional-parity`: 267 contracts, 2314 fragments, 45 reachability patterns pass. The existing hero contract includes the additive visibility prop and a strict legacy-only covered-state guard; no user action contract is removed. `npm run check:localization`: all 12 supported languages pass; no task copy changes. `npm run check:themes`: light/dark/PRO, six accents pass. Fifteen UI rendering regressions pass. The existing hero animation/dirt test follows its new fragment container and retains all assertions. Typecheck and targeted lint pass (existing App warnings remain).

`npm run verify` reaches the security audit with preceding suites passing, including analytics/native attribution gates. It remains blocked by five pre-existing backend dependency vulnerabilities (2 moderate, 3 high). `test:security` (7), `backend:test` (27) and `check:release` pass separately. Final APK is 83.8 MB, under the 100 MB check; the repository artifact baseline is smaller, so its size warning remains. No upload/publication occurred.

## Emulator results

AVD Almost_Glass_API24_20261009, ARM64 Android 7, software GPU, original 1280×2856/480 dpi, unchanged Java growth limit 48 MiB. Synthetic returning-user English fixture with dirty cat and five room items; no real account or purchase.

Final expanded scenario: Today → Care → Food → Games → Clean → Room → close → Back. Final build completed five expanded cycles in light (PID 11451) and three in dark (PID 13981), preserving each process throughout. No fatal/OOM lines in either final log. An additional earlier light cycle also passed; it is excluded from the main count. Two UiAutomator/ADB read failures required fresh semantic reads; the last light return was completed and verified manually with the same PID. These transport failures are not counted as app crashes or silently ignored.

Open-room allocated Dalvik heap: light 43,416–44,556 KiB (42.4–43.5 MiB), dark 43,809–44,228 KiB (42.8–43.2 MiB). The rejected prior build used 47,583–47,629 KiB in light and still crashed after tab switches. These are sampled allocated heap values, not peak RSS or a claim of general performance improvement.

Final care recording: 30.003 seconds, 720 samples at 24 fps. Cat ROI (640×1428 video, crop 150×190 at 220,260, reduced to 75×95) contains at least 1,235 blue-cat pixels in every frame (median 1,767; missing threshold 40; zero missing samples). First/worst frames were inspected: the poses differ and the cat, dirt and room remain visible. No disappearing-cat flash was found. This does not establish all-device or whole-app flicker coverage. Bundle source-map contents match the current App/room/dirt/backdrop sources.

## UX and coverage

Reviewed using Apple Design, the five action principles and all seven UX laws within the rendering scope. Care retains contextual Food/Games/Clean primary actions, secondary room/skins/reward routes and Back. Room retains selection, ownership/shortfall/confirmation, cancel, equip/remove and close handlers. Decorative imagery cannot intercept input; semantic targets and sibling tab geometry remain intact. No unrelated redesign.

Final light/dark room screenshots and dark care animation frames were reviewed: scene layers, backgrounds, controls, selection borders and theme surfaces remain visible; sibling controls retain their geometry. The main care actions and navigation stay reachable. PRO/accent native review requires a Premium test entitlement and is not claimed; static theme checks are not visual evidence. Physical devices, iOS and purchase lifecycle are outside this follow-up. Broader existing Android 7 limitations: missing newer emoji glyphs, bottom system-bar overlap on tall room sheet, and weak dark care title contrast over the bright room artwork. These are separate from decoder stability.

Cleanup complete: removed task screenshots, recordings, heap dumps, raw logs, fixture database, Python venv/backups, APK/profiles and task-new build intermediates plus generated JS bundles. Dedicated temporary directory and pointer no longer exist. Test-only Almost install removed; existing Crossed app/data preserved. Display restored to 1280×2856/480 dpi, adbd returned to non-root, own emulator stopped. Other simulators were stopped with the user's explicit approval, preserving device data. Existing mapping/native debug symbols/source maps are retained for crash symbolication; shared pre-existing build files/caches and other tasks' artifacts are preserved.


Subsequent dependency repair: the five backend audit blockers and additional app/tooling blockers were fixed, and full `npm run verify` now passes. See [dependency verification](backend-dependency-security-2026-11-01.md). The historical runtime results above remain unchanged.
