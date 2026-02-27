# Monetization Setup (Freemium)

## Client env vars

Set these for mobile builds:

- `EXPO_PUBLIC_RC_IOS_API_KEY`
- `EXPO_PUBLIC_RC_ANDROID_API_KEY`
- `EXPO_PUBLIC_MONETIZATION_BACKEND_URL` (example: `https://api.almost.app`)
- `EXPO_PUBLIC_MONETIZATION_SHARED_SECRET` (optional, should match backend `APP_SHARED_SECRET`)

## RevenueCat setup

Entitlement:

- `premium`

Products:

- `almost_premium_monthly`
- `almost_premium_yearly`
- `almost_premium_lifetime`

Offerings must include Monthly / Annual / Lifetime packages so client can map plans.

## Pricing defaults baked into app

- CA: `CAD 6.99 / month`, `CAD 49.99 / year`, `CAD 99.99 lifetime`
- US: `USD 5.99 / month`, `USD 44.99 / year`, `USD 89.99 lifetime`
- UK: `GBP 4.99 / month`, `GBP 36.99 / year`, `GBP 74.99 lifetime`

Store-provided localized prices override these defaults when offerings are available.

## Paywalls

- Soft paywall: first save after tutorial completion.
- Hard paywall: first completed goal.
- Feature paywall: shown when locked premium feature is accessed.

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

Main endpoints:

- `POST /v1/entitlements/sync`
- `POST /v1/iap/validate`
- `POST /v1/webhooks/apple`
- `POST /v1/webhooks/google/rtdn`
- `GET /v1/entitlements/:appUserId`
