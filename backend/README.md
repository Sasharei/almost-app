# Almost monetization backend

The backend verifies store purchases and ownership without sending purchase/attribution postbacks. RevenueCat remains the sole server-side owner of purchase lifecycle postbacks to AppsFlyer. Client snapshots never grant access.

## Runtime and setup

Use the current Node 24 LTS patch release (minimum 24.11). SQLite uses Node's `node:sqlite` API; no native npm database addon is needed. Install with `npm ci`; copy `.env.example` to `.env` and fill credentials. Start with `npm run start` and run tests with `npm test`.

Production requires a random `APP_SESSION_SECRET` of at least 32 characters, `REQUIRE_INSTALL_SECRET_PROOF=1`, `ENFORCE_INSTALL_ID_BINDING=1`, and persistent storage. No shared app secret or insecure legacy grace mode is accepted in production. `STRICT_STARTUP_VALIDATION=0` cannot bypass these production requirements.

## Persistent storage and migration

Set `STORE_DATABASE_PATH` to a path on a persistent **local** volume. The default is `./data/entitlements.sqlite`; the Render blueprint uses `/var/data/almost-store.sqlite`. Run one service instance on that disk; multiple Node workers sharing it are supported. Do not scale to isolated replica disks or place SQLite WAL on NFS. For multiple hosts, migrate to a shared database before scaling.

Identity hashes, transaction ownership and entitlements no longer expire or undergo LRU eviction. Mutations commit before a response is sent. Idempotency and per-IP limits are shared by workers and expire independently of identity records. Back up SQLite using its online backup API or stop the service before copying its database and WAL together.

If the existing backend used JSON persistence, retain its original `STORE_PATH` as the migration source and set a different `STORE_DATABASE_PATH`. The JSON store is imported once, transactionally; existing secret hashes and surviving purchase references are preserved. Corrupt/unsupported JSON stops migration. Keep a protected backup before deployment. Do not delete or truncate the old file before the first successful migration.

Legacy entitlement owners with no surviving credential binding cannot claim that identity by choosing a new secret. These require a separately verified recovery procedure. Do not disable proof checks to work around missing credentials. Mobile access continues to use RevenueCat customer info independently of this supplemental backend.

## Purchase ownership and restore

Configure `REVENUECAT_API_KEY` for read-only customer lookup in this RevenueCat project. Platform-specific V1 SDK keys can instead be supplied as `REVENUECAT_IOS_API_KEY` and `REVENUECAT_ANDROID_API_KEY`; they are used only for subscriber GET requests. No key comes from an incoming request. Do not put a secret RevenueCat API key in `EXPO_PUBLIC_*`.

The server compares a store-verified transaction with the requesting customer's RevenueCat purchase history and active premium entitlement. This accommodates the app's existing `m_...` user IDs, which are not StoreKit UUID appAccountTokens. A purchase transfer is accepted only when RevenueCat confirms active access for the new owner; a historical purchase alone cannot take an existing grant. Without RevenueCat configuration, native store account proof is required and transfers are rejected.

`PREMIUM_PRODUCT_IDS` is an exact allowlist of base product IDs. Android base-plan suffixes are normalized. Pending, canceled/refunded one-time purchases do not grant access; a canceled subscription retains already paid time. Stored expired grants are inactive even if a webhook arrives late.

Android SDK order identifiers are passed as `transactionId`, never relabeled as Google `purchaseToken`. If the real purchase token is unavailable, the server verifies that exact order through RevenueCat. Failed/unavailable verification cannot create a grant.

## Authentication, limits and idempotency

App endpoints require a short-lived Bearer session bound to installId, appUserId and platform. The install secret is sent only to `/v1/auth/session`. The mobile app stores it in Keychain/Keystore, preserves legacy values during migration, and retries protected-storage access when the app becomes active.

`TRUSTED_PROXY_CIDRS` defaults to empty. Set only the actual ingress CIDRs if the proxy overwrites forwarding headers. Never trust arbitrary `X-Forwarded-For` or all addresses. Separate session and app limits apply to the verified IP and are shared across workers; changing installId does not reset them. Tune limits for shared mobile network NATs.

`idempotency-key` is scoped to the authenticated user and endpoint, bound to the validated payload and original response status. Conflicting or concurrent requests return 409. Pending reservations expire after 60 seconds so interrupted requests can retry. Completed entries follow `REQUEST_TTL_MS`.

## Store notifications

Apple V2 notifications are authenticated by Apple JWS signatures and certificate verification, not a custom HTTP header that App Store Connect cannot configure. Set `APPLE_ROOT_CA_PATHS`, the correct environment/bundle ID and production numeric app ID. Unverified events cannot mutate entitlements. Only established transaction mappings are eligible for updates; client-provided user hints are ignored.

For direct Google Pub/Sub pushes, configure authenticated push with `GOOGLE_RTDN_AUDIENCE` and `GOOGLE_RTDN_SERVICE_ACCOUNT_EMAIL`. The endpoint verifies Google ID-token signature/audience, issuer, verified email and exact service account. If using an existing trusted relay, configure `GOOGLE_RTDN_SECRET` and make the relay set `x-google-rtdn-secret`. No secret/OIDC configuration means the endpoint returns 503, never unauthenticated success. Query-string secrets are not supported in production.

Voided notifications do not override the verified Google purchase state. Transient store validation failures do not overwrite entitlements and return a retryable response. Unknown purchases are not assigned from an incoming `appUserId` hint.

## Endpoints and verification

- `GET /health`
- `POST /v1/auth/session`
- `GET /v1/entitlements/:appUserId`
- `POST /v1/entitlements/sync`
- `POST /v1/iap/validate`
- `POST /v1/webhooks/apple`
- `POST /v1/webhooks/google/rtdn`

The root `npm run verify` includes backend dependency audit and security regression tests. Test responses and credentials are synthetic; tests bind only to loopback and do not call real store/RevenueCat APIs. A passing test suite is not evidence of real release purchase/attribution paths: test both platforms before rollout.
