# Secure deployment checklist

1. Back up the existing server store and environment secrets. Use the current Node 24 LTS patch release.
2. Deploy one Render service with the persistent `/var/data` disk described by `render.yaml`. Keep `STORE_PATH=/var/data/almost-store.json` for one-time legacy import and `STORE_DATABASE_PATH=/var/data/almost-store.sqlite` for new storage.
3. Supply `APP_SESSION_SECRET` (at least 32 random characters), enable `REQUIRE_INSTALL_SECRET_PROOF=1` and `ENFORCE_INSTALL_ID_BINDING=1`, disable legacy grace, and keep health details private. Never publish server secrets in Expo public environment variables.
4. Configure read-only RevenueCat customer lookup with `REVENUECAT_API_KEY`, or both platform-specific V1 keys. Use the same RevenueCat project as the app. Check the premium product allowlist against configured products.
5. Supply Apple/Google credentials before enabling their validation. For Apple notifications configure V2 JWS verification, root CAs, bundle ID, environment and numeric app ID. For Google direct delivery use authenticated Pub/Sub push with expected audience and service-account email; custom secret headers are for a trusted relay only.
6. Configure trusted proxy CIDRs only from the hosting provider's verified ingress configuration. The default trusts no forwarding headers. Check rate limits using real ingress before expanding traffic.
7. Run `npm run verify`. Validate fresh install, migration from the previous version, purchase, pending/cancel/refund, restore/transfer, offline startup and webhook retry in **release builds** on iOS and Android. Confirm AppsFlyer install/SKAN and RevenueCat-owned lifecycle postbacks.
8. Deploy only after those checks. Monitor session rejection, store-validation failures and migration errors. Do not disable identity proof to address errors; retain the protected pre-migration backup for investigation/recovery.

`npm run backend:tunnel` starts a temporary backend and public SSH tunnel. It does not weaken session proof or print webhook secrets. It is a manual integration-testing tool, not a production deployment.

The mobile app needs only `EXPO_PUBLIC_MONETIZATION_BACKEND_URL=https://<backend-domain>` plus its RevenueCat public SDK keys. The legacy `EXPO_PUBLIC_MONETIZATION_SHARED_SECRET` is no longer used.

A backend rollout is separate from Android signing-key rotation. Removing a private key from Git does not replace the key registered in Google Play and does not erase old repository copies. See the security remediation report before signing a public release.
