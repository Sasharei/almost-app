---
name: Almost
description: A supportive native system that turns mindful spending decisions into verified financial progress.
colors:
  light-background: "#F5F6F8"
  light-surface: "#FFFFFF"
  light-text: "#202129"
  light-muted: "#626774"
  light-border: "#D8DCE3"
  dark-background: "#05070D"
  dark-surface: "#141923"
  dark-text: "#EEF1F6"
  dark-muted: "#9EA8BA"
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

- **Almost Ink:** The primary light-theme action and selected-state color; it also anchors the highest-emphasis text.
- **PRO Indigo:** The default PRO accent. Alternate PRO accents must replace the same semantic role without changing layout or contrast expectations.

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

**Character:** Broad, clean, and numerically confident. Hierarchy comes from weight and scale rather than all-caps labels or decorative display faces.

### Hierarchy

- **Display** (700, 34px): Primary screen headings and major statements.
- **Headline** (700, 24px): Section-level titles.
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

Equal-role controls share a height and visual baseline. Interactive controls respect a minimum 44px iOS and 48px Android touch target. Sheets dock to the bottom, remain scrollable under the keyboard, and preserve backdrop, cancel, and platform Back behavior. RTL and font scaling must reflow rather than clip.

## Elevation & Depth

The system is layered, not glossy. Background, card, muted surface, and elevated surface colors provide most depth; ambient shadows reinforce only important cards, action buttons, and modal sheets. Shadows stay soft and close to the surface, with low opacity and no hard offset.

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

- **Style:** Full pills on a muted theme surface.
- **State:** Selected state uses theme text as the fill and the theme background as foreground; unselected state remains transparent inside the group.

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

## Do's and Don'ts

### Do:

- **Do** use one clear focal action per state and show the real-world handoff before asking for proof.
- **Do** reuse the semantic theme roles in light, dark, and PRO, including every configured PRO accent.
- **Do** keep money values tabular, prominent, localized, and paired with an explicit meaning.
- **Do** use existing Almost art when it explains progress or provides contextual help.
- **Do** preserve reduced motion, RTL, Dynamic Type, screen-reader labels, and native dismissal behavior.

### Don't:

- **Don't** introduce a Budget action to spend; Budget has savings and debt destinations only.
- **Don't** imply Almost holds or transfers money. The user's external bank or deposit service performs the transaction.
- **Don't** replace product assets and semantic surfaces with random glossy fintech art, generic charts, or unrelated gradients.
- **Don't** use illustration as filler when task state, amount, or the next action needs the space.
- **Don't** remove, hide, or visually demote an existing flow to simplify a redesign.
