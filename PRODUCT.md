# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

People who want to interrupt impulsive spending and turn avoided purchases into real financial progress. The primary job is to make a conscious choice, see the amount preserved, and follow through outside the app.

## Product Purpose

Almost is a mindful-spending companion. It helps a user pause before a purchase, record a decision, and convert money they did not spend into a concrete next step: moving it to personal savings or using it to reduce debt.

Success means the user understands what money is available to allocate, chooses savings or debt, completes the transfer outside Almost, and returns with proof that the intended action happened.

## Positioning

Almost connects the moment of resisting an impulse with a verified real-world money action. It does not hold, transfer, or control funds; it closes the behavioral loop between “I did not spend this” and “I moved this amount toward something that matters.”

## Operating Context

- The user records saved amounts through the app's decision/feed experience.
- The Budget menu shows the amount available to allocate and two destinations: savings and debt.
- The user makes the actual transfer in their own banking or deposit service outside Almost.
- The user confirms the action by attaching a screenshot whose visible transfer amount can be checked.
- Savings and debt progress are tracked separately. Debt can include balance, APR, and minimum-payment information for a payoff projection.

## Capabilities and Constraints

- The Budget experience has two destinations only: savings and debt. “Spend” is not a Budget action.
- Almost never moves money, connects to the user's account for transfers, or guarantees that an external deposit or debt payment settled.
- Confirmation requires a user-provided image with enough visible transfer detail to verify the amount; sensitive details may be hidden.
- Preserve current transfer validation, proof capture/library selection, debt-plan setup and editing, persistence, analytics, cancellation, backdrop dismissal, hardware Back behavior, accessibility actions, and Premium access behavior.
- The app ships from one React Native/Expo codebase on iOS and Android, including phone and iPad/tablet layouts.
- Existing themes are light, dark, and PRO; PRO supports multiple accent choices.
- Existing localization coverage includes `en`, `es`, `fr`, `ru`, `de`, `pt`, `it`, `ar`, `zh`, and `ko`.

## Brand Commitments

- Product name: Almost.
- The experience should feel supportive and credible, without pretending to be a bank, broker, or financial adviser.
- The existing mascot and app identity may remain part of the wider product, but the Budget redesign must prioritize task clarity over decorative character art.

## Evidence on Hand

- Existing app icon, logo, mascot states, coin assets, and premium story artwork are under `assets/`.
- The current Budget implementation and all functional states are in `App.js`.
- Theme roles are defined in `src/constants/themeConfig.js`.
- Functional behavior assertions are defined in `scripts/ui-functional-contracts.json`.
- No bank integration, transfer-settlement evidence, customer claims, or financial-performance claims should be fabricated.

## Product Principles

1. Make the real-world handoff explicit: Almost guides and verifies; the user's bank moves the money.
2. Show one obvious next action at a time, especially during amount entry and proof confirmation.
3. Treat savings and debt as distinct destinations inside one coherent allocation system.
4. Celebrate verified follow-through, not merely the intention to save.
5. Preserve privacy by asking only for the minimum proof needed to match the transfer amount.

## Accessibility & Inclusion

The native interface must preserve platform Back/dismiss behavior, minimum touch targets, screen-reader labels, reduced-motion behavior, Dynamic Type/font scaling, RTL layout, and readable contrast in every shipped theme.
