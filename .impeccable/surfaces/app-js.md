---
version: 1
slug: "app-js"
primary_target: "App.js"
related_targets: []
---

# Budget surface

- Scope: `BudgetScreen` and its transfer/debt-plan sheets in `App.js`.
- Visitor mode: Operate.
- Audience and job: a person who resisted a purchase and now needs to turn the logged amount into a verified real-world savings transfer or debt payment.
- Primary task: understand the available amount, focus either Savings or Debt, make the transfer outside Almost, attach proof, and see the confirmed result.
- Content and proof: available-to-allocate amount, confirmed destination totals, last transfer, debt payoff context, and a screenshot whose amount can be matched.
- Constraints: Almost never moves money or implies bank connectivity; preserve all validation, persistence, analytics, Premium behavior, cancellation/back paths, accessibility, localization, light/dark/PRO themes, and native platform expectations.
- Chosen direction: one destination in focus, structurally approved from `.impeccable/mocks/decision/budget-almost-focus.webp` and the user-provided source comp.
- Memorable moment: the existing Almost tokens collect inside a refined translucent jar for Savings; Debt uses the same soft material language as layers that visibly disappear after confirmed payments.
- Unresolved: simulator/device fidelity and large-font visual evidence require explicit permission to launch the native app.
