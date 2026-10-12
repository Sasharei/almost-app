# Approved iOS paywall review — 2026-10-12

The user approved this design for implementation and App Store resubmission. `preview.html` is retained as the approved design reference. Prices and the 14-day offer in that preview are illustrative fixtures; live copy uses the StoreKit product price, duration and eligibility.

The iOS trial toggle is removed. Eligible annual trials apply automatically and recover after selecting another plan. Both UI and App purchase handler share the offer resolver; a missing advertised trial never silently purchases a regular paid package. Android retains its original trial-toggle behavior and copy.

The compact iOS cards place period beside price; the single-line trial badge and internal Best Value ribbon fit without clipping. Annual paid Best Value uses the accent even when a different plan is selected, while the actual selection remains distinct by its surface and checkmark. Subscription management shares the compact footer with restore, terms and privacy, retaining full accessible labels and callbacks. The iOS trial notice displays only the actual free period and post-trial annual price as requested.

UX state/action and seven-law review: purchase is the single primary CTA. Plan choices and existing benefits/details, restore, management, terms/privacy and dismissal routes remain available. Loading/restore, unavailable, error/retry and accessibility states preserve their existing behavior.

Visual evidence: actual component rendered in a disposable React Native Web harness with an iOS platform shim and substituted native surfaces, SVG and modal. Reviewed light, dark, all six PRO accents, eligible/ineligible offers, loading/restore/unavailable states, 320×667 and 390×844, Arabic RTL and accessibility stacking. At 320px, DOM Range checks show every trial badge and Best Value label fits for all 12 app locales; the widest Best Value label is 78.44px within an 80px label. Footer actions invoked the expected callbacks. Browser evidence does not establish native font scaling, StoreKit purchase or device-runtime behavior. No simulator/device app session was launched.

Verification: `npm run verify` now passes completely after declaring injected globals for the unrelated Maestro seed script in a scoped ESLint configuration. Functional parity, localization (12 languages), themes, analytics/native configuration and the seven offer-routing tests pass. Release details and final server state are recorded in `../../store/release-8.0.1-133/README.md` and its manifest.

Cleanup: disposable preview dependencies, harness, server, cache, raw logs and screenshots were removed. The approved HTML design source, this summary and permanent regression tests remain. User-provided screenshots and unrelated older QA artifacts were preserved.
