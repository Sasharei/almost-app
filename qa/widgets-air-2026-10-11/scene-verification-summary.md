# New widget state verification — 2026-10-11

Scope: the iOS scenes in Almost Savings 8.0.1 (132), on the connected physical iPhone Air / iOS 27.2. Android and a store rollout were not part of this follow-up. Product source and installed Almost user data were not changed.

## Functional evidence

- `npm run test:widgets`: PASS, 6 tests. New regressions check exact TTL boundaries, fresh-event priority over absence, stale/future/missing timestamps, alternating absence captions, malformed JSON, unsupported version, missing/empty copy and no-data fallback.
- Compiled the actual iOS Foundation state resolver and executed 74 synthetic cases on iPhone Air in a separate signed Release diagnostic app, `com.sasarei.almostclean.WidgetSceneQA`: PASS. Used a private diagnostic preferences suite, never Almost's App Group.
- Executed the actual provider `getTimeline` scheduling code on macOS Foundation with a deterministic clock and minimal entry/context stubs. All 69 valid-input schedules match the JS deadline model in entry count, scenes and timestamps; the seven-day terminal entry is balance, with a reload request 12 hours before the schedule ends. Only the clock/entry loading were substituted for this unit test.
- Scene rules verified: savings_guard 6h; spending_fire 4h; empty_treasury 6h; absence starts at 24h, appears for 6h per day, alternates short/long captions and returns to balance. Fresh financial scenes have priority. A financial scene is not restarted by re-syncing old event timestamps. Financial copy requires a positive expense and known budget; missing budget does not invent an empty treasury.
- All 12 supported languages contain all five scene captions and the Open action.

## Rendering evidence and limits

- Native SwiftUI rendered 360 images on iPhone Air: five captions × three sizes × light/dark/six PRO accents × en/de/ar. Every render produced an image without crash or missing artwork. Viewed 18 selected outputs at native resolution, covering every scene, every size, all themes/accents, German and Arabic. Also reviewed settled on-screen small savings and large dark/German fire scenes.
- The diagnostic app used the real widget view and PNG assets. Because WidgetFamily is read-only outside WidgetKit, a diagnostic environment key supplied the family. The app supplied the widget background directly; no product files were changed. These are app-hosted native renders, not 360 home-screen WidgetKit end-to-end runs.
- Sampled captions are readable and contained; mascot artwork keeps its proportions. Small scenes intentionally crop the character's lower body. Each temporary scene retains the full-widget Home destination and caption/Open accessibility label; normal Save/Spend/summary actions return with balance. No new actions, hierarchy or text were introduced into the product. RTL text was exercised in the diagnostic host; OS-hosted RTL positioning is not certified by this check.
- Actual system scheduling after waiting 4/6/24 hours, timeline delivery while the app is killed, reboot recovery, every pixel of all 360 renders, large accessibility text and oldest supported iOS remain unverified. WidgetKit delivery timing is controlled by iOS. This is a PASS for tested state selection/schedule construction and sampled native rendering, not a full release certification.

## Repository gates and cleanup

- Functional parity, localization, themes, analytics/native configuration and targeted test lint: PASS. No product display text changed. `git diff --check`: PASS.
- `npm run verify` passed test/typecheck/security-audit stages, then stopped on the same 15 pre-existing lint errors in `qa/immunity-runtime-2026-10-10/seed.js`. Remaining security/backend/release checks ran separately and passed. No unrelated QA files or validation policy were changed.
- Added permanent regressions only in `scripts/tests/almi-widget.test.js`. Removed the diagnostic app from iPhone and confirmed Almost Savings remains 8.0.1 (132). Deleted task screenshots, all 360 render files, synthetic snapshots, raw logs, generated diagnostic project and build outputs under `/tmp/almost-widget-scenes-oct11`. Retained this concise report and maintained tests. No simulator/emulator, purchases or uploads were used.
