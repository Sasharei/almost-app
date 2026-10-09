# Modal redesign — 7 October 2026

Scope: audit all React Native modal hosts and finish legacy modal surfaces within the existing Almost design. `modal-inventory.json` records 91 hosts, owners, style families and original action expressions. No change to prices, entitlements, reward computation, persistence, analytics, attribution or modal priority/queue ownership.

The worktree contained extensive user changes before this task. `task-only.diff` records this task's App.js changes relative to a start-of-task snapshot; it is not a diff against HEAD.

## State and action review

| Family / states | Primary | Secondary / recovery | Treatment |
|---|---|---|---|
| New level / achievement / custom-card success | Acknowledge and continue | Level: share (including reward badge); backdrop and platform Back | Shared themed result dialog, bounded width, safe-area-aware scroll, existing mascot and finite reduced-motion-aware burst. Remove the decorative pseudo-progress tracks; display actual level only. |
| Level sharing: preview, preparing, sharing | Existing share handler; disabled during sharing | Close / backdrop / Back | Themed primary and secondary actions, bounded scrollable preview. Preserve ViewShot refs, image readiness, real reward calculation and native share flow. |
| Feature discovery / Premium reminder | Acknowledge | Backdrop and Back | Semantic theme surface, compact grouped header, complete localized copy, scroll, existing feature illustrations and descriptions. No arbitrary minimum-height gap. |
| Mood detail / potential detail | Acknowledge | Backdrop / Back | Standard sheet geometry and legible theme colors. Mood label and description preserved. Potential calculations and complete explanation retained. |
| Daily challenge / saving rating / savings trend / focus digest | Existing accept/claim/review/detail action depending on state | Existing dismiss, period/mode and alternative actions | Match existing card/sheet geometry; retain all data and handlers. Empty/disabled/review logic unchanged. |
| Forms: goal creation/linking/renewal, quick entry, frequency, category and income | Save/create/link/renew for valid input | Cancel/backdrop/Back, existing selection/editor paths | Shared containers follow 20-point sheet radius and bounded tablet widths. Preserve keyboard scrolling, validation, premium gates, placeholders and all inputs. |
| Subscription due / amount / pause-freeze / hungry reminder / save confirmation | Existing context-specific confirm/continue | Existing defer/cancel/edit routes | Consistent modal radius. Save confirmation uses primary theme fill and a neutral secondary button, rather than two competing semantic fills. |
| Rating, budget/FAB tutorial | Existing submit/continue | Skip/close/back and existing tutorial progression | Modal geometry and platform-sized action targets; underlying workflows retained. |
| Already updated screens: paywall, banking, shopping pause, currency, onboarding, Care, history, budget proof, subscription list, PRO accents, jar detail, chest ritual, savings/goal celebration | Existing state-specific action | Existing cancel/retry/restore/manage/help paths | Preserve purpose-specific designs, full-screen content, financial data, input and payment handling. Native platform alerts retain their familiar platform appearance. |

## Seven-law review (source evidence)

- Fitts: new result actions use at least 52-point targets; touched secondary controls retain platform minimums. Share text can shrink/reflow beside its reward badge.
- Hick / Von Restorff: results have one filled acknowledgment action; sharing is secondary. Confirmation distinguishes confirm from cancel. Feature discovery has one primary.
- Zeigarnik / goal-gradient: reward amount, actual level, real chest reveal steps and form progress stay data-driven. Removed invented progress bars from the level celebration.
- Jakob: retain familiar dialogs/sheets, back/cancel, native sharing and current navigation destinations.
- Miller: result artwork, title, explanation and actions are grouped; feature location/preview remain grouped and readable without truncation.
- Existing validation, error/retry, loading and disabled states remain owned by their original controllers; no controls or routes removed.

## Verification limits

The native QA harness uses source-extracted, unmodified component declarations and actual native RN controls/materials on iOS and Android, with synthetic state and callbacks. Its callback assertions establish presentation wiring, not production reward accounting, subscription purchases or end-to-end modal queue behavior. Full-app navigation and native captures are reported separately in RESULTS.md. Static checks do not establish visual conformance.

Performance policy assessed: this is presentation work, not a performance audit. The new result effect reuses the existing finite native-driver burst and reduced-motion preference. No release performance improvement is claimed.
