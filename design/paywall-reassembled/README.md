# Paywall hierarchy revision — 2026-10-03

Initial viewport: one headline with the mascot, compact Premium benefits in two columns, cancellation reassurance, trial toggle, three plan choices, compact renewal/cancellation terms, purchase CTA. Secondary restore/manage/legal controls remain in scroll flow. Accessible large-text layouts use a single-column benefit list and retain scrolling rather than shrinking text to force all content into one view.

Primary action remains purchase/start eligible trial. Plan selection, trial toggle, restore/manage, legal links, delayed dismiss, feature-insight callbacks, loading/unavailable states and error/retry paths are preserved. Feature labels are concise in all 11 languages; original full labels remain accessibility labels. Unrecognized benefit IDs retain the supplied copy. Store duration and prices remain dynamic. The preview now uses the real trial-notice template, replacing the earlier illustrative sentence with an em dash.

Five UX principles and all seven rules reviewed: value and cancellation context precede plan choice, one prominent CTA, recognizable radio/toggle controls, interactive feature targets remain at least 44 iOS/48 Android, grouped compact copy, readable green trial, retained actions and accurate terms.

Evidence: browser rendering of the real component with native surface substitutes and illustrative prices. Reviewed light/dark and all six PRO accents, German labels, RTL at fontScale 1.3 and ineligible state. All plans visible at standard 390×844. Native runtime and simulator review were not performed. Screenshots show the initial viewport, not a scrolled lower section.

Functional parity, localization and theme checks pass. Typecheck and lint pass (warnings only). Full verify passes its functional/attribution/native configuration/cloud/session/engagement and compact control tests, then stops on the existing 11 npm audit advisories. No store changes or publication in this revision.
