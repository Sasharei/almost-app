# Round 7 design continuation

## Overview

Recorded 2 October 2026 from the current `App.js` delta against `/tmp/almost-round7-before.js`, `src/components/PlatformSurface.js`, `src/utils/decisionAmountMemory.js`, and `src/locales/pauseCopy.js`. This is a bounded continuation of the incumbent native Operate interface and Almost identity. It does not replace the root `DESIGN.md`, establish a new visual world, or certify the whole application.

The existing product constraints remain authoritative: Almost records decisions and guides external financial action; it does not move money. Budget retains savings and debt destinations. The mandatory five UX principles, seven laws and state/action contract in `AGENTS.md` and `UX_RULES.md` apply throughout.

## Colors

Use the existing semantic roles (`background`, `card`, `surfaceMuted`, `text`, `muted`, `primary`, `onPrimary`, `success`, `error`). The decisive action uses `primary` with `onPrimary`; purchase recording uses the quieter `surfaceMuted` with `text`. Selected category labels use `primary` against `primarySurface`, rather than the background color as foreground.

Weekly saved and spent amounts use success and error roles, with explicit labels and per-day accessible descriptions. Rewards use neutral cards rather than saturated green unlocked panels. Only the next claimable reward gets the primary claim treatment; other eligible claims remain available with secondary styling.

Light, dark and PRO remain equal supported modes. The material layer preserves opaque semantic fills for controls and filters because their foreground contrast depends on the exact fill. This is a source-level safeguard, not proof of contrast across every rendered state or PRO accent.

## Typography

Retain the existing type system. Decision amount entry remains prominent, tabular and editable; the redundant static price is removed from its neighboring statistics card. That card instead groups the category and lifetime outcomes. Weekly totals use bold 24-point text; the forecast uses bold 28-point text with an approximation mark and monthly qualifier. These are local component measurements, not new global typography tokens.

Bug-report titles use a clearer 24/30 hierarchy, and field labels use 14-point sentence case. Pause-form title weight is reduced to 700 while preserving the existing hierarchy and localized content.

Category-prompt explanation uses ordinary 14/20 body text with regular weight, normal tracking and no uppercase transform. Its horizontal selector shows three wider categories at a time while retaining every option through scrolling. Confirmation uses the semantic primary fill; cancellation uses a quieter secondary surface. This is a local readability correction, not a three-category limit on the product.

## Layout

Floating header tools retain compact painted circles inside distinct 44-point iOS or 48-dp Android targets. Their offsets account for the larger target so visible placement is preserved; Android's supplied right offsets are 128/72/14 on Today and 70/14 elsewhere, keeping neighboring targets apart. The source is not evidence that every older app control meets the target contract. The profile edit action is adjacent to the name and remains available through the avatar. Reports sits directly below identity, with the existing unread badge rendered at that destination when present.

Progress keeps open/create goal as its primary action. Below it, two visible secondary cards expose the weekly savings/spending chart and monthly savings forecast. The remaining destinations stay grouped under the existing secondary section. Previews open the existing weekly and forecast detail handlers.

## Elevation & Depth

`PlatformSurface` retains the host view's layout, callbacks, refs, gestures and accessibility. Its material child is decorative and excluded from hit testing and accessibility. On iOS it selects the installed native SwiftUI surface when available, then Expo glass or blur fallback. Android and reduced-transparency mode use the provided solid theme background.

The iOS material uses role-specific tint density: controls/filters retain full semantic fill, sheets use a denser backing, cards use a lighter material, and nested content gets additional density. Appearance is inherited for transparent/lightly tinted nested surfaces to avoid incorrectly switching their material appearance. These wrappers must not become independent controls or alter transaction ownership.

## Shapes

Large card/row corner radii between 18 and 100 are normalized by the wrapper to 18 on iOS and 16 on Android. Explicit pill/circle geometry remains intact. Controls without an explicit height receive the platform minimum. Sheets preserve individual corner geometry in the decorative layer. iOS host borders are removed when a material background exists; the material supplies its subtle hairline edge. This is an implementation convention for these wrappers, not a directive to remove every functional boundary in the app.

## Components

| State or surface | Primary action | Preserved secondary actions and behavior |
| --- | --- | --- |
| Today, focused decision | Record saving using the chosen valid amount | Purchase is a full secondary button; Later and Edit are quieter rows; Back remains available. Saving and purchasing are disabled during invalid amount or active slider interaction. |
| Today, no cards | Add temptation | Existing all-cards route remains accessible. |
| All Temptations | Open a decision | Filters, add, edit and existing tools remain. Remembered amounts do not cause a known temptation to disappear under the starter-price filter. |
| Progress, empty/populated goal | Create/open goal | Weekly chart, forecast, Insights and other existing destinations remain secondary. Zero daily totals render no bar; small positive bars retain a minimum visible height. |
| Profile | Open reports | Unread status is conditional; edit name/avatar, Care, preferences, history and settings retain their callbacks. Global help/report floating tools yield while editing. |
| Pause, empty/populated | Create/select a paused entry | Empty-state Add purchase and floating plus both open the pending-entry form through `openNewPendingModal`. Existing save, spend, extend, edit, delete and dismissal paths remain the contract. Forms retain duration choices and validation. |
| Rewards | Claim next eligible reward | Other eligible claims, locked/in-progress information and existing challenge routes remain available. |
| Bug report | Send valid report | Cancel/back and scrolling fields remain; disabled and sending state continue through the existing handler. |

Pause help takes its heading from the localized pending-tab label so help and navigation name the same destination. Rewards overview and detail use distinct ScrollView keys to reset entry scroll position; the detail heading identifies the active Rewards or Challenges pane. Existing reward actions and tab choices remain intact.

Runtime review found that Pause's empty-state Add purchase opened the ordinary quick-custom temptation flow. The callback now opens the same pending-entry form as Pause's floating plus. This corrects the destination to match the current task; the Today and locked-flow quick-temptation routes remain available. The lead reports additive functional-parity contract 191 for this route; final execution results belong in the verification record.

Amount memory is shared by displayed cards, manual decisions and automatic collection. Positive amounts from supported decision-history events produce an arithmetic mean per template. The resolver prefers that history mean, then stored average, last amount and catalog fallback. Recording an amount updates the stored sample count and average; stable identifiers and transaction routes are retained. This is an intentional behavior correction, requiring regression evidence in addition to visual review.

Pause copy is centralized for introduction, extension, related mood/push messages, rewards and challenge text across `en`, `es`, `fr`, `ru`, `de`, `pt`, `it`, `ar`, `zh`, `ko` and `ja`. Existing internal `FRIDGE_*` names and storage identifiers remain stable. Placeholders such as `{{title}}` and `{{count}}` remain part of the translation contract. This record does not claim a linguistic review of every translation or that every unrelated legacy string has been audited.

### Evidence and remaining verification

This documentation pass inspected existing captures without operating a simulator or device. The iOS light `ios-preview/.../profile.png` shows adjacent Edit and prominent Open reports; its `progress-week.png` shows separate saved/spent totals and daily bars. Android dark `android/.../android-dark-progress.png` shows an opaque themed weekly card, active goal and forecast entry. The Progress captures contain a visible Refreshing overlay and are interim evidence, not clean final approval captures.

Additional capture and command artifacts exist under `ios-preview`, `ios-coffee` and `android`. Their presence alone does not establish that all assertions or end-to-end paths passed. Runtime testing and final gate reporting are owned by the lead agent; use `REVIEW.md` and subsequent final results for their status. No web visual detector ran. No publication, real purchase or report submission is claimed.

Later clean iOS captures are available under `ios-hidden/2026-10-02_130045/round7-hidden/takeScreenshot/` for the profile editor, Pause creation, help and bug-report modal. The lead reports these as evidence of the corrected hidden-menu states. This documentation pass also inspected `ios-amount-final/2026-10-02_125928/round7-amount-now/takeScreenshot/decision-average-30.png`: the amount field visibly reads exactly 30, with saving emphasized, purchase secondary, and Later/Edit remaining accessible. These captures extend state-specific evidence only. The theme matrix is still underway; no matrix PASS is claimed here.

The seven-law source review is reflected in adequate targets (Fitts), a single emphasized action and progressive secondary choices (Hick/Von Restorff), visible real state and honest amounts/progress (Zeigarnik/goal-gradient), familiar native controls/back patterns (Jakob), and adjacent/grouped context (Miller). Complete runtime coverage of loading, error/retry, success, keyboard, back/cancel, unread reports, reduced transparency/motion and assistive technology is not established by this document. Neither are every screen size, long translation, RTL, large text, light/dark/PRO combination or six PRO accent variants. Static checks must not be cited as visual proof.

## Do's and Don'ts

- Do keep one primary action per affected state and preserve the full user-action inventory.
- Do use semantic theme fills and keep decorative material outside the interaction/accessibility tree.
- Do keep weekly totals, forecast qualifiers and remembered amounts tied to their real data sources.
- Do preserve native dismissal, slider ownership, amount validation, purchase/restore/manage routes, attribution and RevenueCat ownership invariants.
- Do run functional parity, localization, themes and normal verification, plus analytics/native configuration checks where required, before the implementation is marked complete.
- Don't use this bounded continuation or interim screenshots as an audit certificate for the full application.
- Don't rewrite root design tokens from local measurements or treat untested theme, locale and device states as verified.

Final evidence update: the clean dark Profile/Progress/Pause matrix and latest light Help/Rewards flow were inspected by the lead. PRO fell back to light without entitlement and is unverified. See REVIEW.md for exact captures and remaining coverage; the whole application is not certified.
