# Almost Monetization Backend

Production-grade baseline backend for subscription validation and anti-fraud.

## What it does

- Validates purchases for iOS (App Store Server API) and Android (Google Play Developer API).
- Maintains server-side entitlement state per user.
- Supports idempotent validation requests.
- Applies anti-fraud risk scoring (replay, missing identifiers, request bursts).
- Accepts client entitlement snapshots as low-trust telemetry sync events (does not grant premium access).

## Endpoints

- `GET /health`
- `POST /v1/auth/session`
- `GET /v1/entitlements/:appUserId`
- `POST /v1/entitlements/sync`
- `POST /v1/iap/validate`
- `POST /v1/webhooks/apple`
- `POST /v1/webhooks/google/rtdn`

`GET /health` now includes a `readiness` section showing whether Apple/Google validation is enabled and which required env vars are missing.

## Quick start

1. `cd backend`
2. `cp .env.example .env`
3. Fill Apple/Google credentials.
4. `npm install`
5. `npm run dev`

Server default URL: `http://localhost:8787`

## Security notes

- Set `APP_SESSION_SECRET` to enable short-lived bearer auth for app endpoints.
- `APP_SHARED_SECRET` is legacy fallback and should be removed after session auth rollout.
- `/v1/auth/session` enforces install-bound tokens (`appUserId === installId` when `ENFORCE_INSTALL_ID_BINDING=1`).
- `/v1/auth/session` can require a per-install secret proof (`REQUIRE_INSTALL_SECRET_PROOF=1`).
- Temporary rollout mode for old clients: set `REQUIRE_INSTALL_SECRET_PROOF=0` and `ALLOW_LEGACY_INSTALL_SECRET_GRACE=1`, then turn proof back on after client update adoption.
- Built-in rate limits protect auth and app endpoints (`RATE_LIMIT_AUTH_SESSION_PER_MINUTE`, `RATE_LIMIT_APP_PER_MINUTE`).
- Set webhook secret (`WEBHOOK_SHARED_SECRET`, or provider-specific secrets) for S2S endpoints.
- For Apple notifications in production, keep signature verification enabled and configure `APPLE_ROOT_CA_PATHS`.
- Pass webhook secret only via headers (`x-webhook-secret` / provider-specific header), not query params.
- Keep `STRICT_STARTUP_VALIDATION=1` in production so backend fails closed on insecure config.
- Keep `HEALTH_EXPOSE_DETAILS=0` in production to avoid leaking detailed readiness diagnostics.
- Put backend behind HTTPS + API gateway.
- Set `STORE_PATH` to persist entitlement/replay state to disk across restarts (single-instance durability).
- For HA/multi-instance, move store to Postgres/Redis.
- App Store/RTDN handlers are included; wire them to your production app ids and credentials.

## Validation readiness

- Apple validation returns `apple_config_incomplete` if required Apple credentials are missing while `APPLE_VALIDATION_ENABLED=1`.
- Google validation returns `google_config_incomplete` with `missing` env var names when misconfigured and `GOOGLE_VALIDATION_ENABLED=1`.
- Check `/health` after deploy to confirm readiness before sending users to paywall.
