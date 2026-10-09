# Wallet Live Activity cat image QA — 2026-10-08

Fix: replace the 1024×1024 1x cat with separate 24pt, 40pt and 48pt raster assets, each populated at 1x/2x/3x. Preserve the original general widget asset. No displayed copy or expense behavior changed.

## Runtime evidence

Built an isolated native release QA app with the exact production Live Activity Swift view, attributes and asset catalog. Used a synthetic 100 SAR receipt; no Apple Pay transaction or application ledger was touched. iPhone 17 Pro simulator, iOS 27.0.

Baseline with old image references: grey square reproduced visually in compact Dynamic Island. WidgetKit logged `1024x1024`, `Max size exceeded: 1346.400000x576.000000; using placeholder image`.

Fixed version: cat and 100 SAR visible in compact Dynamic Island in light and dark system appearance. No overlap, clipping or unreadable content. WidgetKit successfully archived 144×144, 120×120 and 72×72 images without the size-exceeded fault. PRO accents do not enter this system surface; it uses original image colors and system/white text. Expanded and Lock Screen images compiled and archived successfully, but those presentations were not visually verified. Full application theme screens and physical-device payment flows were not exercised.

Simulator screenshots from simctl omit Dynamic Island overlays on this runtime; visual evidence was inspected using the Simulator window via computer-use screenshots.

## Checks

- `npm run test:bank-expenses`: 10/10 passed, including image pixel sizes at all scales.
- Localization, themes and functional parity: passed. No new display strings.
- UX review: existing action hierarchy, deep link, accessibility and receipt content preserved; change only corrects image rendering.
- `npm run verify`: blocked by existing backend security audit failure (one critical dependency vulnerability).

## Reproduction

`python3 qa/wallet-island-image-2026-10-08/harness-build.py --baseline` creates and builds the native QA app under /tmp. Omit `--baseline` for the corrected view. Requires Xcode and the installed Homebrew Ruby xcodeproj gem. The script does not boot or launch a simulator. Install/launch only with permission. Background the QA app to inspect the system island; it displays synthetic data only.
