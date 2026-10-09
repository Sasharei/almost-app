# Two-week trial and bug fixes — 2026-10-03

## Saved store conditions

- Apple yearly product `almost_premium_yearly`: free for the first two weeks, 175 countries, starting 2026-10-03, no end date. See `app-store-trial-confirmed.png`.
- Google yearly base plan `almost-premium-yearly`, offer `free-trial-3days-yearly`: active, free phase 14 days, 175 countries. Stable offer ID retained. See `google-play-trial-confirmed.png`.
- No app binary uploaded or released. Store prices unchanged.

## Paywall states and UX review

Eligible: the yearly free trial is selected on the first opening. Trial duration and renewal price are highlighted; the main action starts the selected plan. Manual selection and disabling trial remain available. Ineligible: no free-trial promise or switch, standard Premium purchase action. Pending purchase/restore retain disabled controls. Error/retry and cancel flows retain existing handlers. Restore, manage, terms and privacy remain secondary actions.

Reviewed the five project UX principles and seven-law policy. Browser previews reviewed in light, dark and all six PRO accents, plus RTL and a large-text fixture. Trial has explicit duration, honest renewal terms and one purchase CTA. Secondary controls remain accessible through scrolling. No new display strings; existing localized templates are used.

Screenshots render the actual PremiumPaywallModalV2 component through a temporary React Native Web harness. Prices are illustrative fixture values, not fetched storefront prices. PlatformSurface is a web stand-in; these images do not validate native Liquid Glass or StoreKit rendering. Native simulator/device sessions were not launched because approval was not provided.

## Functional checks

Cat care locks its ScrollView while the selected tool owns the touch, restoring scrolling on release, termination, close and tab change. Subscription Watch creates separate notification deliveries per subscription and sequences same-day questions after the previous decision completes. Auto-collect waits for history hydration and preserves pending amount edits across relaunch. iOS rating requests Expo StoreReview at the existing prompt timing; Apple controls whether the sheet is shown.

157 engagement tests pass, including native-review failure handling, two-week store metadata, trial eligibility/manual choices, same-day Subscription Watch sequencing, and persisted auto-collect amounts. Functional parity, localization (all 11 supported languages), themes, analytics/native contracts, typecheck, lint (warnings only), security regressions, backend tests and release static checks pass. Full verify is blocked by 11 npm audit advisories in the current dependencies; the audit was not weakened. Native gestures, actual OS push delivery, store purchases and StoreKit display still require device/release testing.
