# Decision, payment, care, history and rewards

Scope: six user screenshots; existing working-tree changes are preserved.
Skill: emil-design-eng. Policy: UX_RULES.md and global UX policy. No simulator, emulator or device launch authorized.

## State/action inventory before edits
- Today overview: decide / open scheduled card; secondary tools, cat care and all cards. Empty: add card. Focus: save selected amount; secondary spend, defer, edit, back. Invalid amount: localized inline error and disabled save/spend; slider interaction locks submission. Preserve amount on cancellation. Hide global quick action in focus (explicit user request).
- Almost Pay: confirm current item and amount; secondary budget disclosure, screen confirmation fallback and cancel. Checking/authentication/processing: busy state prevents duplicate submission. Failure: existing retry/fallback. Success: one existing commit, then reward/result.
- Care: selected care action with visible effect and cost; tabs, daily/hourly reward, skins, party, reports and back retained. Full/unaffordable states preserve current handlers/disabled rules.
- Recent history: inspect entries; secondary delete using the existing balance/stat rollback handler; close/back. Empty: existing localized text.
- Chest: open real reward; success: continue; dismiss remains available. Failed grant retains retry; no fabricated progress or reward amount. Reduced motion omits particles and movement.

Existing functional contracts cover decision amount/edit, Almost Pay cancel/commit, care and reward actions. Baseline: 185 contracts passed before edits.

## Design and motion review

| Before | After | Why |
| --- | --- | --- |
| Focus inherited the overview scroll position | List keyed by focus/card, with layout-time offset reset | Start the decision at its title; preserve amount on cancelled confirmation |
| Small price under each scheduled card title | Bold trailing price beside the title | Use the available row width and make the amount easy to scan |
| Tall stats, secondary actions before amount, competing floating shortcut | Compact wrapping stats, bold exact amount, save first, secondary actions below; shortcut hidden only in focus | One obvious next action without removing spend/defer/edit |
| Pay used original template title; bottom inset outside sheet material | Existing resolved override title; scroll and safe area inside sheet | Keep the selected card identity and continuous bottom surface |
| Fade-only sheet appearance | Shared native-driver translate/opacity entry, shorter exit, reduced-motion fade | Familiar bottom-sheet movement independent of backdrop |
| Three care text rows and unused space | Effects wrap horizontally as a group; cost vertically centered | Use available width without fixing card height |
| Recent events lacked deletion | 44-point delete control calls existing history rollback handler | Restore quick deletion with unchanged accounting |
| Simple reward burst | Licensed raster flare, glow and staggered stars plus existing chest/coin artwork | Richer finite celebration without adding reward delays |

Seven-law source review: Fitts (existing accessible controls; new delete 44×44), Hick (save/confirm/open as distinct primary actions), Zeigarnik and goal-gradient (existing real chest tap progress and busy/success states retained), Jakob (sheet/back/cancel conventions), Von Restorff (bold amount and primary save), Miller (stats, amount and secondary actions grouped). No removal of purchase, attribution, restoration, persistence or care functionality.

Text review: existing localized keys reused; budget disclosure uses semantic status instead of color-name shorthand. No new translation keys or placeholders. User-entered titles remain unchanged. Localization validator covers en/es/fr/ru/de/pt/it/ar/zh/ko/ja, including Arabic variants through existing fallback.

Theme/layout source review: semantic colors retained for controls/text; transparent CC0 effect sprites do not form opaque black rectangles; effect layers ignore pointer input and accessibility. Stats wrap on narrow widths, prices have bounded width, and care effects wrap. Actual clipping, localized baselines, large text, RTL geometry, contrast on rendered materials and frame rate remain unverified.

## Verification

- Before edits: functional parity 185 contracts passed.
- After edits: functional parity 187 contracts; localization; themes light/dark/pro and all 6 PRO accents: passed (static checks).
- Almost Pay title regression: 2 tests / 5 scenarios passed (override, item override, localization, user content, null item).
- `npm run verify`: attribution contract, native analytics config, 18 attribution tests, 41 UI-session tests and 138 engagement tests passed. Stopped at the dependency security audit: 9 unmitigated advisories. This task does not alter package dependencies or lockfiles; the title regression is added to test:ui-session.
- Remaining gates run separately: typecheck passed; lint 0 errors (existing warnings); security unit tests 7/7; backend tests 27/27; release parity/size passed. Size gate inspects the existing APK, not a newly built binary.
- No simulator, emulator or device app session launched. No runtime visual PASS claimed for any theme or PRO accent. No upload or publication performed.

- iOS and Android Metro/Hermes exports completed without a device launch. This validates JS/assets, not native visual behavior.
- Final source state re-exported successfully for both platforms with `--no-minify --no-bytecode`; new effect assets resolve. Final typecheck and changed-file lint also passed (0 errors).
