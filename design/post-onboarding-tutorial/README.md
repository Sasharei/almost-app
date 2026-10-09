# Post-onboarding practice tutorial

Surface-local implementation record for [PracticeTutorial.js](../../src/components/PracticeTutorial.js), [practiceTutorial.js](../../src/utils/practiceTutorial.js), and the real feed controls in [App.js](../../App.js) and [DecisionCardWheel.js](../../src/components/DecisionCardWheel.js). [PRODUCT.md](../../PRODUCT.md), [DESIGN.md](../../DESIGN.md), and [UX_RULES.md](../../UX_RULES.md) remain authoritative; this surface introduces no global identity or token system.

## Purpose and mode

**Operate mode:** teach the current app through actual actions on existing cards. The user explicitly requested a dark gray overlay that blocks unrelated controls, highlights the current real control, and advances only after interaction, with an available Skip. The former detached text pages are replaced by this practice flow.

The overlay uses a normal absolute native view, not a native Modal. An SVG mask paints the dimming and outline; responder rectangles intercept touches outside the measured opening. Touches and gestures inside the opening reach the mounted app control. Highlight geometry is invalidated when targets disappear, remount, or the session resets. Native product dialogs retain their existing controls above the overlay.

No synthetic purchase, saved amount, bank transfer, or entitlement is created for demonstration. Recording a decision uses the existing product handler and has its usual real effect. Copy asks the user to select the outcome that actually occurred; resisting a purchase does not mean money was transferred to a bank.

## State and action contract

| State | Primary action | Secondary actions and transition |
| --- | --- | --- |
| Hidden / prerequisites pending | Existing app action | Automatic opening waits for completed onboarding, ready active feed, and existing startup/modal/celebration handoff conditions. |
| 1: Open | Tap the real Make a decision control | Skip or platform Back exits. Opening the decision advances to card selection. |
| 1: No cards | Tap the real Add control | Existing creation dialog, validation, and access gates remain intact. Closing the dialog returns to step 1; no fake card is inserted. |
| 2: Card | Engage the highlighted card in the real picker | Tap, user scroll completion, and existing accessibility adjustments advance. Automatic selection alone does not count. |
| 3: Amount | Check or adjust the real amount | Valid input confirmation/blur or completed slider interaction advances. Invalid values remain in this step; the existing localized validation stays visible. |
| 4: Decision | Record the truthful purchase outcome | Save retains primary emphasis; Spent and Later retain distinct secondary treatments. The tutorial does not force a financial outcome. |
| Pending / native confirmation | Complete the existing product dialog or operation | Unrelated underlying controls remain blocked. No invented progress percentage. Cancellation, failure, or an uncommitted result returns to the decision step. |
| Result | Finish | Read-only spotlight on the actual feed summary, with outcome-specific explanation; Skip remains available. This state requires a committed result from the real handler. |
| Target unavailable | Restart after the recovery explanation appears | Initially shows loading; after the measurement timeout, Restart resets the flow. Skip remains available. No stale opening exposes unrelated UI. |

Progress reports four real action stages; the read-only result remains at step 4. There is no generic Next button or backdrop dismissal. Platform Back exits rather than fabricating completion. Skip removes tutorial blocking; product capabilities remain available in normal use. Help offers a replay action that returns to the feed and resets the tutorial after modal handoff. Progress is session-local, not persisted as a resumable task. Reset generations reject late results from an older session.

## Completion, copy, and access

- Automatic eligibility reads `almost.practiceTutorial.v1`, accepting `1`, `true`, and `done`. The new version lets users who saw the legacy explainer receive practical guidance. Opening alone does not mark it seen.
- Finish, Skip, and platform Back write the versioned key and legacy `STORAGE_KEYS.FEED_INTRO_SHOWN`. A close guard prevents duplicate reporting. Existing `screen_intro_shown` / `screen_intro_closed` analytics are retained. Storage failures retain the caller's fallback behavior; cross-launch suppression cannot be guaranteed if persistence fails.
- All new `practice*` text uses dictionaries, alongside existing `guideStep` and `onboardingSkip`. The 12 dictionaries are `en`, `es`, `fr`, `ru`, `de`, `pt`, `it`, `ar`, `zh`, `zh-Hant`, `ko`, and `ja`; interpolation tokens remain consistent. Arabic keeps the app's existing regional language handling.
- Unrelated controls are hidden from accessibility navigation during guidance. The current real controls retain their handlers and accessibility actions. Step changes announce localized context. Native validation, purchase/access dialogs, cancel paths, and attribution/revenue behavior remain product-owned.

## Local visual treatment and UX review

The dim mask is `rgba(25,28,35,0.80)` with a 6-unit spotlight inset and a 2-unit outline in the current theme primary color. The tooltip uses semantic `card`, `text`, `muted`, `border`, `primary`, and `onPrimary` roles. It has a maximum width of 480, 16-unit outer insets, radius 16, and scrollable copy above a fixed Skip footer. Restart/Finish and Skip have minimum 48-unit heights. These are local native units, not new global tokens.

Measurement accounts for safe areas, viewport, keyboard, and text scaling. A tall target can expose its actual visible slice instead of requiring the entire form to fit above the keyboard; the feed reveals the target, then allows within-target scrolling. Tooltip placement uses available space above or below the spotlight. Geometry remains physical LTR while text alignment follows language direction.

Source review addresses the five project principles and seven-law policy: usable existing targets (Fitts), one focused task per state with grouped truthful outcome choices (Hick/Miller), honest four-stage progress and exit/recovery (Zeigarnik/goal-gradient), existing native controls and dialogs (Jakob), and a distinct spotlight plus preserved action hierarchy (Von Restorff). This is source evidence, not observed native behavior or a visual pass.

## Verification evidence and gaps

The implementation handoff reported passing localization checks for all 12 dictionaries and native permission text, theme contracts for light/dark/PRO and six PRO accents, functional parity (217 contracts, 1,939 fragments, 41 patterns), 57 targeted UI/session tests, typecheck, and lint with zero errors (459 repository-wide warnings). The source finish reviewer reported the targeted geometry, stale-session, slider completion, pending-state, and footer fixes resolved.

The final `npm run verify` passed attribution (18), cloud (8), engagement (157), and shopping (4) tests before stopping at dependency security audit with 11 advisories. Separate security tests (7), backend tests (27), and static release parity/size checks passed. The release checks used an existing debug artifact; they do not establish a new build or native runtime result. These results were supplied by the implementation task; documentation editing did not rerun verification or change application behavior or strings.

The user subsequently authorized iOS Simulator and Android Emulator testing. The dead-button reproduction, native pointer wrapper and dialog stacking fixes, executed paths, original native captures and remaining gaps are recorded in [the native QA report](../../qa/practice-tutorial-runtime/README.md). The tested controls and outcome/cancel/skip/replay paths passed on iOS 26.5 and Android 16. Light and dark native captures were inspected. PRO native rendering, RTL, large text, screen-reader navigation, tablets, empty/create/recovery and release attribution/subscription coverage remain unverified; static checks do not establish those results.
