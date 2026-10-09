# Daily challenge reveal contrast

Observed on iOS 26.5: the revealed offer used a near-transparent dark tint inside a plain modal View. Native material resolved it as dark, while labels used the light theme foreground.

Fix in App.js: an opaque `colors.surfaceMuted` panel with `colors.text` for title, hint and reward. Actual contrast is 12.49:1–13.50:1 in the three base palettes (contrast.json). Draw/reveal animation, accept, later/defer, backdrop/back dismissal and completion callbacks remain unchanged. The offer has one primary action (accept); defer and dismissal remain secondary. No copy or business logic changed for this fix.

Visual evidence: all-themes-board.png and the eight named PNG files show actual simulator rendering in light, dark and all six PRO accents. Draw/reveal was executed in every palette. runtime-palette-evidence.json additionally confirms the expected surface color appears in each native capture (over 336,000 matching pixels per screen). The initial PRO attempt that fell back to light remains in the older pro/ directory and is superseded by verified-themes/.

The corrected panel has readable title, hint and reward text, visible borders/icons and aligned equal-height actions. Accept remains primary; defer and backdrop dismissal remain secondary. No clipped or overlapping text was observed in the Russian offer state. The static text/surface contrast across all actual palettes is 10.27:1–13.50:1. Backdrop dismissal was exercised; complete accept/defer completion paths were not re-executed, since this change preserves their existing handlers.

Localization and theme checks pass. Functional parity passes (217 contracts on latest check); an interim failure during concurrent onboarding edits subsequently resolved. Full verify stops on 11 existing npm audit advisories. Typecheck and lint pass (existing lint warnings remain).

ASO now uses its own simulator `46C39996-F57E-401F-87F6-15ADCD2DDC2A` to avoid shared runtime changes. Premium screenshots use local synthetic customer-info events, never a purchase/server mutation. Shopping Pause uses the installed native QA fixture; these captures do not verify real Screen Time authorization or blocking.
