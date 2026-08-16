# AppsFlyer → RevenueCat → AppLovin release gate

## Current code contract

- AppsFlyer starts after the app-scoped CUID and does not wait for product analytics
  consent or ATT. ATT only controls advertising identifier access.
- RevenueCat attribution is stored in schema v2 with per-field delivery states:
  `pending`, `written_pending_upload`, and `synced`.
- Existing RevenueCat customers are never marked confirmed merely because an
  AppsFlyer ID was supplied. Confirmation requires a successful setter in this
  install or a persisted marker created after a previous successful setter.
- A failed explicit RevenueCat upload remains retryable. Callback, cold bootstrap,
  foreground, and purchase preflight are independent retry surfaces; retries use
  bounded exponential backoff with jitter and no background loop.
- RevenueCat is the only AppsFlyer revenue sender. Client subscription lifecycle
  events remain product analytics only, and GA4 purchase telemetry is persisted and
  deduplicated by transaction ID.

## Automated gates

Run for ordinary development verification:

```sh
npm run verify
```

Run before creating a publishable iOS or Android artifact:

```sh
export APPLOVIN_REPORTING_API_KEY='<release secret>'
export APPLOVIN_TRACKING_URLS="$(printf '%s\n%s' '<android URL>' '<ios URL>')"
npm run release:gate
```

The release gate is intentionally red when the key or either app-scoped URL is
missing. Never commit or print the secret or full production URLs.

## Dashboard diff to validate, not apply automatically

Record the actual `before` value before changing anything. The required `after`
state is:

| System | App/platform | Field | Required after | Rollback |
| --- | --- | --- | --- | --- |
| RevenueCat | Almost iOS | AppsFlyer production developer key | Almost Savings iOS key | Restore recorded before value |
| RevenueCat | Almost Android | AppsFlyer production developer key | Almost Savings Android key | Restore recorded before value |
| RevenueCat | Both | Sandbox developer keys | Platform-specific sandbox keys | Restore recorded before value |
| RevenueCat | Both | Purchase lifecycle owner | RevenueCat S2S only | Disable only the newly changed integration |
| AppsFlyer | Almost iOS | AppLovin `Activate partner` | ON | Restore recorded before value |
| AppsFlyer | Almost Android | AppLovin `Activate partner` | ON | Restore recorded before value |
| AppsFlyer | Both | In-app event postback | `af_purchase` mapped to the approved AppLovin sale/checkout event with revenue | Restore recorded mapping |
| AppsFlyer | Both | Send all events | OFF | Restore recorded before value |
| AppsFlyer | Both | Postback window | At least 30 days | Restore recorded before value |

No dashboard mutation is authorized by this document.

## Required release E2E evidence

Use synthetic/test customers and timestamp every artifact. Run on a physical iOS
device and physical Android device with production-equivalent release builds.

| ID | Scenario | Required evidence |
| --- | --- | --- |
| E2E-ATT-001 | iOS fresh install, ATT authorized | AppsFlyer install, AppLovin conversion, RevenueCat `$appsflyerId` and campaign fields before purchase |
| E2E-ATT-002 | iOS fresh install, ATT denied | Same install/postback evidence; no IDFA requirement |
| E2E-ATT-003 | iOS fresh install, ATT not determined | Same privacy-preserving install/postback evidence |
| E2E-AND-001 | Android fresh install | AppsFlyer install, AppLovin conversion, RevenueCat provider/campaign fields |
| E2E-IOS-002 | iOS charged sandbox transaction | One RevenueCat transaction → one AppsFlyer revenue event → one AppLovin sale |
| E2E-AND-002 | Android charged sandbox transaction | One RevenueCat transaction → one AppsFlyer revenue event → one AppLovin sale |
| E2E-CAN-001 | 5–10% production canary | One production transaction, no duplicate revenue, per-OS install delta ≤10% after reconciliation |

For each system capture build/version, timestamp, platform, event name, currency,
value, delivery status, and transaction/event ID when available. Do not use amount
and date alone as a user-level join.

## Release decision

Static checks and unsigned builds prove source/build integrity only. Release remains
`NO-GO` until every release E2E row above has timestamped evidence and the strict
AppLovin gate passes with release secrets.
