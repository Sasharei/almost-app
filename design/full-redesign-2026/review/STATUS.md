# Native redesign review — 2026-09-30

The redesign preserves existing React Native hosts, callbacks and accessibility properties while adding decorative native SwiftUI glass surfaces on iOS and Material 3 navigation on Android. The surface inventory records 413 migrated surfaces and 527 interactive/accessibility attributes. Today utilities, series controls and direct Progress routes remain discoverable.

## Navigation defect

Android's Material navigation applied its own system bottom inset inside the React-managed 80 dp navigation frame. This left 32 dp for the content, clipping icons and overlapping labels. The native host now explicitly measures and lays out its child, and React alone owns the bottom safe area. Programmatic selection updates do not dispatch user reselection events.

`android-navigation-light.png` and `android-navigation-fixed.xml` are actual emulator observations. All five icons have equal square bounds, labels sit below icons and share a baseline. The light and dark Today screens were inspected; debug warnings obscure portions of the dark screenshot.

## Verification

- Functional parity: PASS, 166 contracts, 1635 fragments, 40 reachability patterns.
- Localization: PASS, all 11 application languages.
- Themes: PASS, light/dark/pro and six PRO accents.
- TypeScript: PASS. ESLint: zero errors; 397 existing warnings.
- iOS and Android native debug builds: succeeded.
- Analytics, native analytics configuration and attribution tests: passed in `verify` before its security gate.
- Full `verify`: blocked by seven existing npm security advisories; no dependency audit exclusions were introduced.

The latest fixed-size iOS switch alignment could not receive a final visual confirmation because Simulator screenshot and accessibility requests timed out. Large-text Android review was inconclusive during a stalled Metro reload; emulator font scale was restored to 1.0. PRO visual review was not completed because the test account lacks Premium. Tablet layouts, complete screen/state coverage and real release purchase/attribution paths are not verified. This report does not certify the full redesign as complete.
