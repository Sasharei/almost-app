---
name: Almost
description: A supportive native system that turns mindful spending decisions into verified financial progress.
colors:
  light-background: "#F5F6FA"
  light-surface: "#FFFFFF"
  light-text: "#1F2230"
  light-muted: "#687083"
  light-border: "#DDE1EA"
  light-primary: "#485ED7"
  light-primary-surface: "#E6E8FF"
  light-surface-muted: "#EBEDF4"
  dark-background: "#0C1019"
  dark-surface: "#191F2B"
  dark-text: "#F3F5FA"
  dark-muted: "#ADB6C8"
  dark-primary: "#AAB6FF"
  dark-border: "#303A4A"
  dark-on-primary: "#141A2C"
  pro-base-background: "#F0EEFB"
  pro-base-text: "#261F44"
  pro-base-primary: "#6549C8"
  pro-background: "#ECEFFD"
  pro-surface: "#FAFAFF"
  pro-text: "#171C46"
  pro-primary: "#3E4FD7"
  savings: "#28D985"
  savings-dark: "#35E295"
  debt: "#FF657B"
  debt-dark: "#FF7B8D"
  on-savings: "#042B1B"
  on-debt: "#30030A"
  information: "#356A9A"
typography:
  display:
    fontFamily: "Inter_700Bold, Inter, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    letterSpacing: "-0.2px"
  headline:
    fontFamily: "Inter_700Bold, Inter, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    letterSpacing: "-0.2px"
  title:
    fontFamily: "Inter_400Regular, Inter, sans-serif"
    fontSize: "21px"
    fontWeight: 900
    lineHeight: 1.24
  body:
    fontFamily: "Inter_400Regular, Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.33
  secondary:
    fontFamily: "Inter_300Light, Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 300
    lineHeight: 1.33
  label:
    fontFamily: "Inter_600SemiBold, Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "0.4px"
rounded:
  control: "10px"
  card: "16px"
  sheet: "20px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.light-text}"
    textColor: "{colors.light-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
    height: "52px"
  button-savings:
    backgroundColor: "{colors.savings}"
    textColor: "{colors.on-savings}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
    height: "52px"
  button-debt:
    backgroundColor: "{colors.debt}"
    textColor: "{colors.on-debt}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
    height: "52px"
  card:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.card}"
    padding: "16px"
  input:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "48px"
---

# Design System: Almost

## Overview

**Creative North Star: "The Verified Step"**

Almost should feel like a calm, credible companion at the moment a user turns an intention into action. The interface uses cool neutral grounds, bright semantic surfaces, decisive type hierarchy, and a small number of recognizable product assets. It is supportive without posing as a bank, and expressive without letting illustration compete with the task.

The visual system is native, compact, and behavior-first. Each screen presents one dominant state or action, then uses secondary cards and lightweight line icons to explain what happens next. Light, dark, and PRO are equal product modes rather than recolored afterthoughts.

**Key Characteristics:**

- Cool neutral backgrounds with clear, bright content surfaces.
- Heavy Inter numerals and titles paired with quieter explanatory text.
- Semantic savings, debt, and information colors used only where meaning is stable.
- Soft cards, restrained ambient depth, and platform-sized touch targets.
- Existing Almost assets used as progress objects or helpers, never as unrelated decoration.

## Colors

The palette is semantic and theme-aware: neutral roles build hierarchy, while savings green, debt red, and information blue carry persistent meaning.

### Primary

- **Almost Ink:** Anchors high-emphasis text and retained ink-filled destination controls.
- **Almost Periwinkle:** The current light-theme primary role used by focused actions, navigation and preference selection; its pale primary surface supports selected chips.
- **Night Periwinkle:** The dark primary role paired with dark on-primary text.
- **PRO Base Violet:** The base PRO theme role before the chosen accent palette is applied.
- **PRO Indigo:** The configured indigo PRO accent palette. Alternate PRO accents must replace the same semantic role without changing layout or contrast expectations.

### Secondary

- **Verified Savings:** Marks savings confirmation, verified accumulation, and the savings destination.
- **Responsible Debt:** Marks debt-payment actions and debt-specific progress; it is not a generic warning decoration.

### Tertiary

- **Guidance Blue:** Supports informational icons, proof guidance, and cool progress assets.

### Neutral

- **Cool Ground:** The light-mode app background; it separates white surfaces without decorative gradients.
- **Bright Surface:** Cards, sheets, and field surfaces in light mode.
- **Night Ground / Night Surface:** Dark-mode background and card pair; both must remain visibly distinct.
- **PRO Ground / PRO Surface:** Cool indigo-tinted foundations for PRO.
- **Muted Copy:** Secondary explanations, metadata, and helper labels. It must pass readable contrast on its actual surface.

### Named Rules

**The Semantic Destination Rule.** Green means savings and verified accumulation; red means debt payment or debt burden. Do not swap them for novelty.

**The Theme Role Rule.** Components consume semantic theme roles rather than hardcoding a light-only palette.

## Typography

**Display Font:** Inter Bold with the bundled Inter family fallback.

**Body Font:** Inter Regular with lighter Inter for secondary copy.

**Character:** Broad, clean, and numerically confident. The retained shared type ramp uses bundled Inter. Newer Today, Profile and Settings surfaces also carry native text styles with explicit sizes and weights; this is an implementation observation, not a new display-font rule to inherit. Hierarchy comes from weight and scale rather than all-caps labels or decorative display faces.

### Hierarchy

- **Display** (700, 34px): Primary screen headings and major statements.
- **Screen:** Newer screen titles use native 800-weight text, 29px on iOS and 26px on Android, with platform-specific tracking.
- **Amount:** Today uses native 800-weight tabular text at 36px with 39px line height.
- **Headline** (700, 24px): Shared section-level titles.
- **Title** (900, 19–21px): High-emphasis card titles and destination names.
- **Body** (400, 15px, 20px line height): Normal explanation and form content.
- **Secondary** (300–600, 12–15px): Metadata, helper copy, and amount qualifiers.
- **Label** (600–900, 12–16px): Actions, segmented controls, and compact utility text.

Financial values use tabular numerals wherever totals, comparisons, or changing progress are shown.

### Named Rules

**The Number Leads Rule.** On money surfaces, the amount is the strongest text; its qualifier stays adjacent and subordinate.

**The Sentence Case Rule.** Use sentence case for actions and labels. Uppercase is reserved for existing compact status patterns, not page hierarchy.

## Layout

Almost uses a single-column native reading order on phones with a compact 4/8/12/16/24/32/40 spacing rhythm. Primary card groups use 12–16px internal padding and 10–14px gaps. Short devices reduce illustration height and padding before reducing action clarity.

Equal-role controls share a height and visual baseline. The shared touch-target contract is a minimum 44px on iOS and 48px on Android. Smaller painted elements sit inside transparent targets: floating header glass paints at 28px, Care Back and Progress add at 32px, inside 48px press regions. Preference selections paint a compact 28px inner surface within 44/48px rows. This is not evidence that every older control has been audited to that minimum. Sheets dock to the bottom, remain scrollable under the keyboard, and preserve backdrop, cancel, and platform Back behavior. RTL and font scaling must reflow rather than clip.

Care uses a centered single column bounded to 620px with 18px side padding and coherent shared edges for its controls, status, rewards and full-width item rows. New Goal uses a centered bottom sheet bounded to 560px. These are measured surface constraints, not new global breakpoints.

## Elevation & Depth

The system uses tonal layering for content and native glass for floating navigation utilities. Background, card, muted surface, and elevated surface colors provide most depth; ambient shadows reinforce only important cards, action buttons, and modal sheets. Shadows stay soft and close to the surface, with low opacity and no hard offset. Floating header controls use the platform glass implementation with themed translucent or solid fallbacks; card content does not inherit their glass treatment.

### Shadow Vocabulary

- **Card Ambient:** 5–7px downward offset, 10–14px blur, 4–6% opacity for important summary and focus cards.
- **Action Lift:** 6px downward offset, 10px blur, roughly 8% opacity for a single primary action.
- **Modal Separation:** The theme surface sits over a neutral 46% black backdrop.

### Named Rules

**The Tonal-First Rule.** Establish hierarchy with semantic surfaces and borders before adding shadow.

## Shapes

Controls use gently curved 10px corners; cards use 16px; bottom sheets use 20px; true segmented controls, chips, and small status capsules use a full pill. Hairline borders keep translucent or same-tone surfaces legible. Signature progress art may use custom silhouettes, but its enclosing surface follows the card radius.

## Components

### Buttons

- **Shape:** 10px for standard controls and 16px for large destination actions; never below the platform touch target.
- **Primary:** High-contrast theme ink or semantic destination fill with a bold sentence-case label.
- **Press / Focus:** Native opacity or small press-scale feedback; preserve focus and accessibility state.
- **Secondary:** Theme surface with a visible semantic border and no competing elevation.

### Chips

- **Style:** Retained destination controls use full pills on a muted theme surface. Inline preferences use quieter 8px-radius inner chips with 5px vertical and 10px horizontal padding; their transparent outer press regions preserve platform targets.
- **State:** Selected state uses theme text as the fill and the theme background as foreground; unselected state remains transparent inside the group.

### Floating Header Utilities

Small painted circles provide secondary navigation without competing with the current action. The transparent 48px press region owns the callback and accessible label; its centered inner glass surface is non-interactive. Keep neighboring target bounds distinct.

### Cards / Containers

- **Corner Style:** 16px.
- **Background:** The active theme card or elevated surface.
- **Shadow Strategy:** Tonal separation first, low ambient shadow only for structural priority.
- **Border:** Theme hairline border where adjacent tones are close.
- **Internal Padding:** 12px on short devices, typically 14–16px elsewhere.

### Inputs / Fields

- **Style:** Theme surface, 1px border, 10px corners, 14px horizontal padding, and numeric keyboard for money fields.
- **Focus:** Preserve native focus behavior and readable border contrast.
- **Error / Disabled:** Use semantic error or disabled theme roles; never signal state by opacity alone.

### Navigation

Navigation uses existing product icons and compact labels. The active destination is a distinct filled or elevated state, and equal-role items retain equal heights and baselines across languages.

### Destination Focus Card

The Budget focus card shows exactly one destination at a time. It pairs a destination icon, one explanatory progress object, the key amount, two supporting metrics, and one external-transfer confirmation action. Savings reuses the Hero Widget `GoalJarGraphic`; its fill is the accepted savings-transfer share of the user's logged savings, so confirming a transfer adds visible coins. Four varied, staggered coin paths run as a continuous ambient loop. Debt uses a literal start-to-zero payoff meter with the paid percentage; the empty state shows a debt document with an add action and explanatory copy. Motion must honor reduced-motion preference.

### Proof Sheet

The proof flow makes the external-bank handoff explicit, then asks for the expected amount and a screenshot. Destination summary, bank instruction, amount input, proof source, verification status, cancel, and submit remain reachable in one scrollable native sheet. The sheet is flush with the physical bottom edge, uses only top corner radii, and carries its theme surface through the bottom safe area.


### Today Savings and Care

Today keeps its savings hero at 252px rather than changing height with speech. Its 132px cat has a separate Care action; the savings amount opens savings details. The right-hand 220px column accommodates an 84px speech region when speech exists. This fixed container is a surface-specific composition, not a reusable card-height token.

Care centers the existing cat at 160px; the enclosing wrap is 180px wide and the image remains transparent. Dirt is expressed as local body spots rather than a rectangular veil. Status tracks derive directly from the real clamped percentage: zero is empty. Full-width 64px-minimum care rows retain labels, benefits, cost and availability. Selected categories keep a visible selection mark and contrast appropriate to their fill. Skins, bonus, collection and category actions remain reachable.

**The Honest Track Rule.** Progress tracks show the real clamped value; zero has no visible fill.

### Insights and New Goal

Progress exposes a direct secondary Insights route while keeping the active goal dominant. Details retain their charts, modes and period navigation. New Goal is a bottom sheet with theme surfaces, a drag-handle visual, labeled name/amount/emoji inputs, a filled Create action and quieter Cancel. Its fields use 48px minimum height. Preserve keyboard scrolling, validation, emoji limits, backdrop dismissal and platform Back.

Documentation evidence is bounded to the correction batch: phone iOS/Android light and dark captures, plus iPad light Care and New Goal. The parent reports opening, cancelling and creating a synthetic $100 goal through the normal free path on iPad. No PRO/accent runtime, Android tablet, large text, RTL, phone New Goal or physical haptic coverage is established here. Static parity, localization (11 languages), themes (three modes/six accents), typecheck and lint passed as reported; full verification remains blocked by nine existing dependency advisories. See `design/redesign-round3/STATE-ACTIONS.md`, `QA-REPORT.md` and `FINISH-VERDICT.md` for state-specific scope. The created-goal success capture is `review/final/tablet-ios-goal-created.png` within that round directory.

### Decision and Secondary Surfaces — 2026-10-03

This follow-up captures current source patterns within the established visual system; it does not introduce new global tokens. On Today, the localized due-decision count and all due card names sit above Make a Decision, which opens the first due card. The decision wheel marks Today with localized text, heavier weight and a primary-surface badge, separate from its checked state. Empty Today retains Add a temptation as the primary action.

Progress and Insights start with Sections collapsed. The labeled disclosure and expanded accessibility state preserve access to existing details while keeping the current goal or insight dominant. Subscription Watch uses a themed card with a distinct next-check inset, real monthly/yearly totals and up to three preview rows; opening the full agenda preserves the complete list. Its empty state prioritizes Add subscription. Subscription detail uses one outer scroll owner and retains import, metrics and dismissal.

Pause summarizes money awaiting decisions and groups cards by deadline. Its row timers update every second: below one day they use localized HH:mm:ss, longer intervals use localized day counts, and expiry has explicit copy. The populated list opens card details; empty Pause prioritizes Add a temptation. Detail retains Decline, Spend, Extend, Edit, Delete and Back.

Free Profile uses the existing success role with a computed readable foreground for Get full access; Reports stays reachable with a quieter muted surface. Premium Profile gives Reports primary emphasis. Settings uses grouped app, personal and data controls. Language, currency and theme choice screens remain reachable while a payday draft is open, and payday retains Save/Cancel. Payday choices have explicit platform-sized minimum width and height. The legacy Open All Settings branch and duplicate Profile shell were removed by the user's explicit request; live settings, history, editing and support destinations remain.

Category management leads with Add category; selecting a row reveals the editor and scrolls it into view, respecting reduced motion. Save becomes primary while editing, and Add becomes secondary. Cancel returns to the list. Creation and category-decision forms retain labeled fields, validation, existing premium limits, keyboard scrolling, selection callbacks and familiar dismissal. The shared price/form family and subscription sheet use the incumbent sheet shapes and heading hierarchy. Other purpose-specific sheets retain their existing implementations; source review does not establish complete visual parity.

Evidence for this follow-up is source and static only. The task verification reports functional parity (203 contracts), localization (11 languages), themes (three modes/six accents), typecheck, lint with zero errors, 48 UI tests and 149 engagement tests passing, plus attribution, cloud, security, backend and release-parity checks. Full `npm run verify` stopped at 11 existing dependency audit advisories. Release-parity checks do not establish that a current release artifact was built. No simulator, emulator or connected-device session was launched, and no screenshots were taken for this batch. Actual rendering, contrast, gestures, timer behavior, keyboard behavior, long translations, large text, RTL and all theme/accent visual states remain unverified. Earlier captures apply only to their original batches. See `design/redesign-decision-followup/STATE-ACTIONS.md` for the state/action contract.

### Premium Offer — approved pricing columns

The built Premium offer follows the approved `plans-row` direction within the existing Almost world: the established cat over blue clouds and hills, a bold dark/indigo headline, a themed rounded content surface and geometric outline icons. These are paywall-specific composition rules, not a replacement for the global visual system. Source authority is `src/components/PremiumPaywallModalV2.js`, `PaywallOfferIcon.js` and `src/constants/paywallCompactCopy.js`; the approved concept and surface contract are under `.impeccable/mocks/decision/paywall-redesign/` and `design/paywall-redesign/brief.md`.

- **Reading order:** Hero, three short benefits, All benefits disclosure and eligible trial switch, cancellation reassurance, three equal monthly/yearly/weekly cards, then one pinned purchase action with complete billing text and restoration/legal links. Expanded benefits preserve every original insight route. Subscription management remains in the scroll content above the pinned action and must be fully reachable.
- **Responsive rhythm:** Ordinary hero minimum 208pt; compact normal-text hero 88pt when viewport height is below 720pt; tablet hero 176pt when height is at least 900pt. Content uses 20pt horizontal inset, reduced to 16pt in compact mode. Cards stretch equally in a row, with 8pt gaps and 174pt minimum height (140pt compact). Font scale at or above 1.25 stacks cards and secondary option/link groups; the content scrolls rather than disappearing. The sheet is bounded to 620pt width and to 850pt height on tall viewports. The pinned CTA is 48pt up to 820pt viewport height, 50pt up to 900pt and 52pt above that. These thresholds are observed implementation behavior, not global device breakpoints.
- **Type and shape:** Ordinary hero is 29/32pt at 800 weight, compact hero 18/21pt. Benefit titles are 14/18pt at 700 weight; details are 11/14pt. Plan names are 15/19pt; prices are 22/27pt at 800 weight (20/24pt compact). Annual equivalents and dock links remain 11/14pt; billing disclosure is 11pt. Plan cards have 14pt corners and 1.5pt borders, their ribbons 10pt corners; the overlapping content surface has 32pt top corners (20pt compact). New disclosures, expanded benefit rows and dock links keep 44pt iOS / 48pt Android minimum targets. A small radio or icon is a painted affordance inside the larger card/control target.
- **Color and emphasis:** Content consumes the active theme's background, card, border, text, muted and primary roles. Hero artwork retains its established palette. Eligible annual trial uses a specific reassurance green: light `#176747` on `#E6F5ED`, dark `#6CE3BC` on `#133D31`. The single CTA uses the active primary role with a computed readable foreground; selection also has a check mark and radio accessibility state. Keep these paywall trial colors local rather than redefining savings semantics throughout the app.
- **Offer truth:** Native offer metadata owns eligibility, exact trial duration, price, localized billing period and annual total; the monthly equivalent is subordinate to the visible annual total. A concept's illustrative prices or generated filler copy never become store facts. Auto-collect prepares due temptation cards; it does not collect personal data. Never invent urgency, savings counts or social proof.
- **State hierarchy:** Eligible and paid states have one trial/subscription purchase CTA. Loading/restoring communicate actual status and disable unavailable purchase controls; unavailable offers retain an accessible explanation. Error feedback and retry/alternate offer/restore/dismiss routes remain. Success remains owned by the parent purchase flow. Preserve the five-second limited-access dismissal gate, platform Back/backdrop behavior, scroll reporting and abandoned-offer handlers.

**The Honest Offer Rule.** Trial, billing and eligibility presentation derives from the actual native offer; no illustrative concept value becomes production subscription copy.

Evidence is deliberately bounded: `design/paywall-v3/` contains renders of the actual component through a temporary RN Web harness with native surface, image and SVG stand-ins and illustrative store fixtures. It covers ordinary/compact phones, tablet, light/dark/PRO accents, Arabic RTL, German large text and paid eligibility. This does not establish native iOS/Android appearance, real Dynamic Type, purchase/restore behavior or device touch behavior. No simulator, emulator or device launch is authorized. The concept seed stdout was not preserved, so its provenance cannot be independently corroborated. The pre-build hero reproduction checkpoint was missed; `.impeccable/review/hero-repro.png` is a retrospective render, not evidence of that earlier checkpoint. New copy covers the eleven existing app languages; completion check results belong to the task report, not an invented visual/runtime PASS.

## Do's and Don'ts

### Do:

- **Do** use one clear focal action per state and show the real-world handoff before asking for proof.
- **Do** reuse the semantic theme roles in light, dark, and PRO, including every configured PRO accent.
- **Do** keep money values tabular, prominent, localized, and paired with an explicit meaning.
- **Do** use existing Almost art when it explains progress or provides contextual help.
- **Do** distinguish painted control size from interactive target size and show an empty track for zero progress.
- **Do** preserve reduced motion, RTL, Dynamic Type, screen-reader labels, and native dismissal behavior.

### Don't:

- **Don't** propagate inherited eyebrow labels, glyph navigation icons or unassigned native display faces as new house-style rules; their presence is retained implementation debt, not authority for future surfaces.

- **Don't** introduce a Budget action to spend; Budget has savings and debt destinations only.
- **Don't** imply Almost holds or transfers money. The user's external bank or deposit service performs the transaction.
- **Don't** replace product assets and semantic surfaces with random glossy fintech art, generic charts, or unrelated gradients.
- **Don't** use illustration as filler when task state, amount, or the next action needs the space.
- **Don't** remove, hide, or visually demote an existing flow to simplify a redesign.

### Continuation record — 2026-10-01

This continuation records the current source implementation and supersedes earlier surface-specific descriptions where they differ. Today’s Hero gradient fills its parent, with Today’s series below the Hero and genuinely empty progress at zero. The decision screen groups the secondary Edit, Later and Spend actions above the bottom amount slider and primary Save action; slider gestures retain a stable owner. Care places speech above the compact mascot (104px), with flexible, equal-role utilities flanking it (128px minimum width each).

On iOS, back navigation uses `UIScreenEdgePanGestureRecognizer` and a shared, scoped back stack. Native SwiftUI surfaces serve cards and filter controls while preserving opaque forms, reduced-transparency behavior and semantic primary colors. Insights uses a dedicated detail shell without the legacy Progress header, and places its large forecast at the top. These are local surface patterns, not new global sizing or typography tokens; preserve each existing action, handler and destination when extending them.

The seven-law UX policy and state/action contract remain binding: retain one distinct primary action, adequate targets, discoverable secondary choices, honest progress and familiar back/cancel behavior. Supported coverage remains light, dark and PRO with all six PRO accents and all 11 app languages. This continuation has source-review evidence only: no simulator or device session was launched, and actual rendering, gesture behavior, localized layout, contrast and theme/accent appearance were not verified in this batch. Earlier capture evidence above remains limited to its stated batch and must not be treated as visual verification of these changes.
