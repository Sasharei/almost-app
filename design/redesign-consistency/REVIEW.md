# Redesign consistency — 2026-10-02

Mode: Operate. Continue the incumbent Today/Progress design, preserve product data and actions.

## State/action inventory before editing
- Quick coin entry: amount + category, one selected Save/Spend submit; other mode secondary. Keep coin drag, manual numeric entry, validation, keyboard dismissal, cancel/back and result animation. Empty/error/selected/processing states keep explicit labels.
- Today: decide next card primary; all cards, Care, savings, history, daily reward, level, rhythm, rating, active challenge and subscription tools remain discoverable. User explicitly authorizes retiring the old Today/carousel entry and post-series automatic scroll, not removing underlying useful destinations.
- Progress: goal/create goal primary; subscriptions widget opens existing watch/detail with add/edit/cancel/reminder paths. Zero subscriptions shows Add; populated shows real next renewal and totals.
- Challenges: next eligible claim/start primary; active progress and Cancel secondary; locked/empty explanations retained. All challenge definitions and progress retained.
- Help: read selected guide, Close primary. Tab selection secondary; text and illustration scroll together; long localized text, safe areas and large fonts must not overlap.
- Reward/chest/spend/save: reveal/continue primary as appropriate; dismiss and reduced motion preserved. Opaque content surfaces establish contrast; decorations must not clip at inner card edges.

Baseline functional parity: 192 contracts passed. Simulator launch was not yet authorized at baseline; the user later explicitly approved iOS Simulator in this conversation. Android/device sessions remain unapproved. Seven-law UX source: project UX_RULES.md and /Users/sasarei/.codex/rules/UX_RULES.md. Static checks are not visual evidence.

## Added scope: onboarding and first savings tutorial
- Onboarding: preserve four steps, language/currency selection, privacy/ATT choices, persona and goal selection, keyboard validation, Back/Skip, purchases, and completion persistence. Current selected option + Continue is primary; Back/Skip and secondary sheets remain subordinate. Add the existing SwiftUI material bridge to navigation/control chrome, without rebuilding the content or altering attribution.
- First savings tutorial: understand save → goal → budget confirmation; one Open Today action. Preserve backdrop/system Back, one-time persistence and dismissal analytics. All four explanations stay visible in a scrollable body. No transaction occurs in the illustration. Finite illustrative motion must settle; Reduce Motion shows the static final state immediately.

| Before | After | Why |
| --- | --- | --- |
| Fixed, absolutely positioned mock buttons with truncated labels | Two naturally sized illustration columns, labels below, finite coin transfer | Prevent text/art collisions and explain one operation |
| Infinite coin spins and jar pulses | One transfer sequence, subtle settlement, reduced-motion fallback | Show cause and effect without competing with reading |
| Translucent tutorial body darkened by underlying screen | Opaque semantic content with native material limited to controls | Reliable contrast |
| Onboarding controls use plain backgrounds | Existing SwiftUI material host for controls/dock, same layout and handlers | Match the new app without a wholesale redesign |


## First-run queue and copy audit

Initial state: show three persona-ranked starter cards while there are no manually configured timers. The primary action opens the next decision; Save/Spend/Pause remain reachable in its focused view. Completed cards are selected before filtering completion, so completing one never pulls a fourth card into the series. Configuring the first timer preserves unchecked targets in the active series; configured future timers remain upcoming. The same daily plan drives the queue and series counter.

The first-use guide explains the actual decision labels, reminders, goals/virtual coins and confirmation of real transfers. One primary action opens Today; the body scrolls without moving the footer. The cat column starts at the same top inset as the savings heading, and grows naturally for speech.

Copy: updated first-run/Today copy in all 11 languages. Removed long dashes from display literals (punctuation-recognition regexes deliberately remain). Repaired 891 mixed-language fallback values: 653 recovered from the existing translation of the equivalent English source; 238 rewritten directly. Corrected the discovered afternoon-coffee/pastry mistranslations. Placeholder validation now also rejects Cyrillic contamination and long dashes in non-Cyrillic fallback dictionaries. This is structural coverage and targeted editorial correction, not a claim of native-speaker review of every legacy phrase.

## Verification evidence

- Functional parity: 193 contracts, 1781 behavior fragments and 41 reachability patterns pass.
- Localization: all 11 languages and native permission strings pass, including placeholder parity.
- Themes: static palette/contrast checks pass for light, dark, pro and configured accent palettes.
- `verify`: attribution 18 tests, UI/session 46 tests, engagement 149 tests pass; analytics and native analytics contracts pass. Stops at the existing 10 unmitigated npm audit advisories. No security exception was added.
- Downstream gates run separately: TypeScript passes, lint has no errors (existing warnings remain), security 7 tests and backend 27 tests pass; release parity/size check passes against the existing Android artifact. These do not establish new native release-build validation.
- iOS JavaScript production export succeeds. Simulator uses the installed Debug 7.2.1 (127) native shell and current Metro JavaScript. No physical-device build was installed.

## Visual/runtime review

Dedicated simulator: Almost Native Surface Review, iOS 26.5, D06F6A5C-E069-4194-B6CC-CAAC59653090. Original AsyncStorage copied to `/tmp/almost-oct2-simulator-storage-backup` before fixtures. Synthetic profile only.

Accepted screenshots and observed behavior:
- `screenshots/2026-10-02_185437`: Russian first-use guide, Today with persona cards and raised cat speech, wrapped help tabs. Guide action labels were subsequently tied to the exact localized decision buttons.
- `screenshots/2026-10-02_190018`: dark Today, Progress, Subscription Watch, Rewards, Challenges, help, quick entry. Readable surfaces, buttons and icons; no inner illustration/text collisions in the inspected views.
- `screenshots/2026-10-02_190751`: opened chest and series completion. Opaque background, clear 25-coin result, complete chest/cat silhouettes. Continue preserves the Today scroll position; the subsequent rating prompt is dismissible.
- Series reward claimed and cold app restart succeeded. The original autocollect hook-order regression is additionally covered by the executable startup/hydration tests; a physical-device native crash log was not available.

PRO runtime limitation: the six accent runs completed their navigation steps, but the non-Premium fixture was correctly reset to the light theme by entitlement enforcement. Files labelled `pro-*` are **not accepted as PRO visual evidence**. Some captures during development refresh are also blank; they are not passes. PRO rendering remains unverified; no purchase or entitlement bypass was performed.

Other coverage gaps: Android and real devices not launched; very large Dynamic Type, all localized long strings and RTL not exhaustively exercised. The floating global shortcut can still cover content while scrolling on other legacy screens; on Challenges it was moved into the header with its original tap and long-press handlers to protect Start/Claim actions.

## Seven-law completion review

Fitts: primary buttons and dismiss targets retained; challenge actions and tutorial footer reachable. Hick/Von Restorff: one emphasized next action, secondary cancel/mode/navigation controls differentiated. Zeigarnik/goal-gradient: real series targets/progress and active challenge progress retained; no invented completion. Jakob: predictable Progress/Rewards routes, modal Back/Close and native onboarding control material. Miller: three initial cards, grouped tools, wrapped guide sections, four concise tutorial explanations. Happy/cancel paths and storage/handler invariants are covered by targeted tests and the simulator flows above. Visual approval remains qualified by the stated PRO/size/platform gaps.

## Final pass and cleanup

- Final production JavaScript export: `/tmp/almost-oct2-complete`, success; TypeScript, localization, theme and functional-parity gates repeated successfully. Lint: 0 errors, 445 existing warnings. `git diff --check` passes.
- `screenshots/2026-10-02_192547`: inspected clean onboarding language/currency and optional analytics screens. Continue advances, footer/buttons/illustrations do not overlap at the tested size. Filename `onboarding-profile` actually records the analytics step.
- `screenshots/2026-10-02_192636/Theme routes and surfaces/takeScreenshot/final-light-coin.png` actually captures the final Challenges screen because UI rendering lagged behind the automated step names. Pixels, not filenames, establish evidence: add shortcut is in the header, and the first Start challenge button is unobstructed. The file named `final-light-challenges.png` shows Rewards, not Challenges. Do not treat this run as fresh quick-entry visual coverage.
- A subsequent exact-text Challenges navigation retry failed after launch; no additional pass is claimed from that retry. The directly inspected final Challenges capture above is accepted.
- Original simulator AsyncStorage restored byte-for-byte from the pre-QA backup; temporary development bundle location removed. Test app stopped. No user device data changed.
