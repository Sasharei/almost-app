# Premium activation overview — verification, 2026-10-18

Updated the existing six Premium stories without changing App.js integration, purchase/restore callbacks, entitlements or attribution.

Product context was checked against BudgetScreen, ImpulseMapCard, profile reports and Premium/free limits in the current working tree. Budget describes savings/debt allocation, an external bank transfer and screenshot proof. Reports and impulse activity come from recorded decisions. Goals, custom categories and full history retain their actual Premium meaning. The final story names the current destinations. All twelve supported translation dictionaries were updated.

Replaced the old fixed scene images with the existing Almi mascot and theme-native concept diagrams, without invented balances or counterfeit screenshots. Source assets were preserved. No generated raster assets were necessary.

UX review: one labeled Next/Back to Almost primary action; secondary previous, close and optional playback; manual reading by default. Artwork taps, horizontal swipes and optional automatic playback remain. The artwork owns horizontal gestures separately from the text scroll view. Primary controls activate on release. The footer does not shrink; very large text scrolls. Ancillary branding, diagram labels and footer scaling are bounded so the main reading viewport remains usable; body copy is uncapped. Reduced motion/screen-reader guards remain in source.

## Checks

- Baseline functional parity: PASS (265 contracts).
- Final `npm run verify`: PASS, exit 0. Includes functional parity (266 contracts, 2280 fragments, 45 reachability patterns), analytics/native analytics contracts, attribution tests, localization, themes, typecheck, security, backend tests and release checks.
- Localization: PASS for all 12 dictionaries and native permission/shortcut checks.
- Themes: PASS for light/dark/PRO and all six configured accents.
- `git diff --check`: PASS. Inspected changed filenames and zero-context diff; story display text is represented in dictionaries. Existing unrelated working-tree changes were preserved.
- ESLint: 0 errors, 438 repository warnings. Size check used an existing Android debug APK, not a new release artifact.
- Native iOS simulator Debug x86_64 build: BUILD SUCCEEDED. An intermediate PCH diagnostic recovered in that successful build; an unnecessary second build attempt was cancelled.

## Visual and runtime evidence

Actual production component in a temporary native opaque-Modal harness with the current theme palettes, localization, fonts and motion/safe-area providers; no mocked screenshot rendering and no real transaction.

- iPhone 17 / iOS 26.5 and iPhone SE 3 / iOS 17: six story states, Next, Previous and final dismissal passed.
- All six stories reviewed in light; dark and all six PRO accents reviewed with the full story matrix. Final confirmation of welcome/budget and close passed for dark and every PRO accent after the gesture/layout fixes.
- German and Arabic: full six-state navigation and rendering passed; Arabic hierarchy and arrows follow RTL.
- Maximum accessibility text size: German/Arabic navigation, scroll and final dismissal passed. The compact iPhone SE confirmation caught and fixed excessive ancillary header growth; final body scrolling and footer visibility reviewed.
- iPhone SE: artwork swipes in both directions, playback auto-advance, pause and close passed after moving horizontal gestures out of native scrolling.
- Initial attempts exposed the scroll/gesture conflict and a large-text layout issue; both fixed and confirmed. Separate test setup failures included a queued system deep-link alert, driver startup contention and slow cold loading of harness fonts. Final relevant flows exited 0.

Limits: Android runtime, VoiceOver/TalkBack, OS reduced-motion/transparency/contrast toggles and a real StoreKit/RevenueCat purchase/restore transaction were not exercised. Native purchase integration was preserved and checked statically. No release performance claim or production attribution validation is made.

Durable product/design context: `.impeccable/surfaces/premium-unlock.md`.

Cleanup: temporary harness, server, bundles/assets, native build outputs, screenshots, raw logs, driver results and confirmed task-owned system temporary directories removed. Only this concise report and the maintained design context remain. The two task simulators were shut down; content size and JS-server overrides restored. Installed app/data containers and simulator registrations were retained without erasing user data. Other active simulators and tasks were not modified.
