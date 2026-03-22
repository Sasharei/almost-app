# Monetization Setup (Freemium)

## Client env vars

Set these for mobile builds:

- `EXPO_PUBLIC_RC_IOS_API_KEY`
- `EXPO_PUBLIC_RC_ANDROID_API_KEY`
- `EXPO_PUBLIC_MONETIZATION_BACKEND_URL` (example: `https://api.almost.app`)

## RevenueCat setup

Entitlement:

- `premium`

Products:

- `almost_premium_monthly`
- `almost_premium_yearly`
- `almost_premium_lifetime`

Offerings must include Monthly / Annual / Lifetime packages so client can map plans.

### 3-day free trial

- Configure the free trial directly in App Store Connect / Google Play Console for the subscription you want (usually monthly).
- Keep the same product IDs in RevenueCat (`almost_premium_monthly`, `almost_premium_yearly`, `almost_premium_lifetime`) and include them in the active Offering.
- The client now reads trial metadata from store products and shows `3 days free` with `then ...` pricing on the paywall.
- iOS eligibility is checked via RevenueCat SDK (`checkTrialOrIntroductoryPriceEligibility`) so trial is only shown when the user is eligible.
- Android trial visibility is derived from the product/package offer returned by Google Play Billing through RevenueCat.

## Pricing defaults baked into app

- CA: `CAD 6.99 / month`, `CAD 49.99 / year`, `CAD 99.99 lifetime`
- US: `USD 5.99 / month`, `USD 44.99 / year`, `USD 89.99 lifetime`
- UK: `GBP 4.99 / month`, `GBP 36.99 / year`, `GBP 74.99 lifetime`

Store-provided localized prices override these defaults when offerings are available.

## Paywalls

- Feature paywall: shown when locked premium feature is accessed.
- Control flow (group A): soft paywall on activity/day-2 logic + hard paywall on first completed goal.

### Transaction abandoned offer (all paywalls, 24h cooldown)

- When user taps purchase, opens store checkout, then cancels checkout (`PURCHASE_CANCELLED`), client switches current paywall to trigger `transaction_abandoned`.
- This is rate-limited to once per 24 hours per user install.
- Works for soft / hard / feature paywalls (including non-dismissible hard locks).
- For `transaction_abandoned` trigger, client tries to load a dedicated RevenueCat Offering first, then falls back to `current` Offering.
- Supported offering identifiers (case-insensitive):
  - `transaction_abandoned`
  - `transaction_abandoned_offer`
  - `abandoned_transaction`
  - `abandoned_offer`
  - `winback`

## Firebase Remote Config experiment (new installs only)

Remote Config key:

- `monetization_experiment_v1_config`

Default payload used by client:

```json
{
  "enabled": true,
  "newInstallOnly": true,
  "forceGroup": "",
  "allocation": { "A": 34, "B": 33, "C": 33 },
  "trialSaveLimit": 10
}
```

Group behavior:

- `A` (control): vanilla monetization behavior.
- `B`: hard trial lock after `trialSaveLimit` saves (default 10). App is blocked by non-dismissible hard paywall on startup until premium is active.
- `C`: no hard lock. Free flow stays available; after 5 saves, app shows a 2-step soft paywall (`group_c_support_after_5_saves` trigger):
  1) intro screen with personal developer message + support CTA,
  2) classic Premium plans/features screen.

Install eligibility:

- Experiment assignment runs only for new installs.
- Legacy installs are pinned to group `A`.
- Client uses stored app signals + install markers to detect legacy installs.

User properties (Firebase Analytics):

- `monetization_exp_group` = `A` / `B` / `C`
- `monetization_exp_group_a` = `1` / `0`
- `monetization_exp_group_b` = `1` / `0`
- `monetization_exp_group_c` = `1` / `0`
- `monetization_exp_new` = `1` / `0`

Experiment analytics events:

- `monetization_experiment_remote_config_loaded`
- `monetization_experiment_assigned`
- `monetization_experiment_lock_activated`
- `monetization_experiment_startup_blocked`

## Free plan limits implemented

- 1 active goal
- 2 active `Think` cards (`pending`) at a time
- 10 custom temptation cards
- history view limited to last 7 days
- 3 challenge claims
- budget auto-allocation is free for first 30 days, then premium-only
- manual budget limits stay available for free users
- premium-only: cat customization, impulse map, reports, custom categories, widget slider access

## Backend

See [backend/README.md](backend/README.md).
Fast local + public tunnel mode: `npm run backend:tunnel` (prints ready-to-paste webhook URLs).
Permanent deploy guide: [backend/DEPLOY_QUICKSTART.md](backend/DEPLOY_QUICKSTART.md).

Production flags:

- `APPLE_VALIDATION_ENABLED=1`
- `GOOGLE_VALIDATION_ENABLED=1`

Main endpoints:

- `POST /v1/entitlements/sync`
- `POST /v1/iap/validate`
- `POST /v1/auth/session`
- `POST /v1/webhooks/apple`
- `POST /v1/webhooks/google/rtdn`
- `GET /v1/entitlements/:appUserId`

Client purchase flow now requests a short-lived backend auth session (`/v1/auth/session`) and then attempts server validation (`/v1/iap/validate`) after purchase/restore when transaction identifiers are available, with entitlement sync as telemetry fallback.
