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

### Android RevenueCat -> Meta Ads attribution

- RevenueCat is the source of truth for subscription Meta events. Client-side Meta trial/revenue logging should stay disabled so `Trial Started` maps to Meta `StartTrial`, and purchase/conversion/renewal events map to Meta `Subscribe`, without duplicate app events.
- Android calls `Purchases.collectDeviceIdentifiers()` immediately after `Purchases.configure(...)`, before any trial or purchase can start. When the Meta SDK exposes an anonymous app device ID, Android also passes it to RevenueCat with `Purchases.setFBAnonymousID(...)`.
- Android declares `com.google.android.gms.permission.AD_ID` because the app targets API 33+ and uses Advertising ID for advertising/marketing/analytics attribution.
- Google Play Console TODO: declare Advertising ID usage for advertising/marketing/analytics attribution.
- AppsFlyer can continue to receive `premium_trial_started`. AppsFlyer dashboard should have Meta Ads integration active, in-app event postbacks ON, and `premium_trial_started` mapped to Meta `StartTrial` only if AppsFlyer is intentionally used as a fallback source. Avoid sending the same `StartTrial` to Meta from both RevenueCat and AppsFlyer unless deduplication is confirmed.

Debug checklist:

1. Install a fresh Android debug or release build on a real device with Google Play Services.
2. Ensure the device has not deleted or disabled Advertising ID where possible.
3. Create a new RevenueCat anonymous user, or log out/reset the app user.
4. Open the app.
5. Start a sandbox/test trial.
6. In the RevenueCat Customer Profile, verify the Android user has `$gpsAdId` or another required Meta identifier.
7. Verify Customer History shows `Trial Started`.
8. Verify RevenueCat Meta integration delivery status is successful.
9. Wait up to 24h for Meta Events Manager / Ads Manager visibility.
10. Confirm no duplicate `StartTrial` or `Subscribe` events are created.

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

## Monetization rollout (Variant B only)

Remote Config key:

- `monetization_experiment_v1_config`

Default payload used by client:

```json
{
  "enabled": true,
  "newInstallOnly": false,
  "forceGroup": "B",
  "allocation": { "A": 0, "B": 100, "C": 0 },
  "trialSaveLimit": 10
}
```

Behavior:

- A/B/C split is finished: app always uses variant `B` on iOS and Android.
- Free users can log up to 10 `save` actions.
- Starting from the next `save` attempt after those 10, save logging is fully blocked until Premium is active (hard lock path).
- Stored users from old groups are migrated to `B` on startup.

User properties (Firebase Analytics):

- `monetization_exp_group` = `B`
- `monetization_exp_group_a` = `1` / `0`
- `monetization_exp_group_b` = `1` / `0`
- `monetization_exp_group_c` = `1` / `0`
- `monetization_exp_new` = `1` / `0`

Experiment analytics events:

- `monetization_experiment_remote_config_loaded`
- `monetization_experiment_assigned`
- `monetization_experiment_lock_activated`
- `monetization_experiment_startup_blocked`

## Paywall design experiment (A/B UI)

Remote Config key:

- `paywall_design_v1_config`

Default payload used by client:

```json
{
  "enabled": false,
  "forceVariant": "",
  "allocation": { "A": 100, "B": 0 }
}
```

50/50 rollout payload:

```json
{
  "enabled": true,
  "forceVariant": "",
  "allocation": { "A": 50, "B": 50 }
}
```

Behavior:

- `A` = current paywall UI.
- `B` = new paywall UI (Almi hero + refreshed plan cards).
- Assignment is sticky per install (`premiumInstallId`) and stored locally.
- If `forceVariant` is set to `A` or `B`, it overrides the split.

User properties (Firebase Analytics):

- `paywall_design_exp_id` = `paywall_design_v1`
- `paywall_design_variant` = `A` / `B`
- `paywall_design_variant_a` = `1` / `0`
- `paywall_design_variant_b` = `1` / `0`

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
