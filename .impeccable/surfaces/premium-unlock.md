---
version: 1
slug: "premium-unlock"
primary_target: "src/components/PremiumUnlockStories.js"
related_targets: ["src/components/PremiumStoryArtwork.js", "src/constants/translations.js", "src/constants/translations.generated.js"]
---

# Premium activation overview

Mode: Operate. Confirm active access and orient the person to current tools without creating another required onboarding task.

Product truth checked against the current App.js on 2026-10-18:

- `case "purchases"` gates Budget on Premium. BudgetScreen has savings/debt destinations. The person transfers in their own bank, adds proof, and Almost verifies the amount. Never promise bank connectivity or automatic transfers.
- Profile reports contain weekly/monthly analysis built from recorded decisions; no promise of pre-existing results or guaranteed savings.
- Progress contains ImpulseMapCard with daily activity and categories from recorded decisions. The illustration is a calendar pattern, not a geographic route map.
- Premium bypasses the free goal/category/history limits. No claims about unlimited bank accounts, automatic payment or financial returns.

States/actions: welcome, Budget, reports, impulse activity, goals/history, ready. Primary is Next on the first five, Back to Almost on ready (same dismissal callback). Secondary close is always available. Previous is disabled on the first state with accessibility state, then available; artwork taps and directional swipes remain. Manual reading is the default. Optional auto playback remains 6.8 seconds, with play/pause; holding pauses temporarily and scrolling pauses until resumed. Reduced motion/screen readers use manual continuation. No purchase/restore/entitlement/analytics changes.

Visual direction follows DESIGN.md: semantic light/dark/PRO surfaces, concise leading-aligned copy, one full-width labeled primary action in a nonshrinking safe-area footer, a bounded scrollable text body and compact diagrams. The separate artwork area owns horizontal swipes so native vertical scrolling cannot steal them. At very large Dynamic Type, body copy remains uncapped; ancillary brand/step labels, decorative diagram labels and footer text use bounded scaling to keep navigation and a usable reading viewport. The existing Almi asset preserves identity. Diagrams contain no invented account balances or counterfeit screenshots and use live theme roles. No new generated bitmap is needed. Keep actual navigation names translated; all twelve dictionaries must match.

When the underlying product changes, update the stories and diagrams together. Validate the source routes above before introducing any new promise. Review compact/large text/RTL, manual and automatic navigation, interruption/cancel, all themes and PRO accents in a simulator. Static checks cannot substitute for visual/runtime evidence.
