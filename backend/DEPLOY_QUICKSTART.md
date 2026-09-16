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

## Legacy JSON migration: prepare before cutover

Use a protected snapshot and a **new, non-existing** output directory:

```sh
node scripts/prepare-legacy-migration.js --source /protected/legacy-snapshot.json --output-dir /protected/migration-candidate
```

This offline command never switches the running service. It creates a mode-0700 directory with a byte-for-byte backup, a mode-0600 SQLite candidate and an aggregate report. It verifies every entitlement payload, existing credential hash and transaction owner, plus SQLite integrity. Existing credentials remain unchanged; the pre-bindings v1 format is supported. Duplicate ownership references or conflicting credentials abort instead of silently selecting the first owner.

Exit status: `0` means data checks passed with no unbound legacy identities; `2` means the copy passed but strict-auth cutover is blocked by unbound identities or a changing source; `1` means preparation failed. A zero exit is not authorization to deploy and does not replace release E2E or server configuration checks. Never activate a candidate without a successful report. Never overwrite an existing candidate or live database.

Before actual cutover, quiesce all legacy writers/webhooks using a maintenance and retry plan and prepare a fresh snapshot. Compare source checksums and verify RevenueCat/store state for any conflicting purchase ownership. Preserve the original backup. Do not roll back by blindly restoring an old snapshot after accepting new writes: reconcile post-cutover changes first.

### Unbound identities are not automatically recoverable

A RevenueCat customer lookup by a client-provided App User ID, an old unverified session token, or an App Store transaction ID alone is **not** evidence that the caller owns that identity. Do not register the first submitted new secret, generate secrets for users on the server, or enable legacy grace to bypass this.

Safe binding recovery requires an authenticated account or an independently verified store proof obtained on the device, bound to the recovery request, plus an atomic one-time registration that cannot replace an existing binding. The current release does not contain that recovery protocol. SDK-level Premium remains governed by RevenueCat; backend synchronization errors must not revoke it. This preparation tool does not implement binding recovery and must not be represented as a completed production migration.

### Production rehearsal, 2026-09-16

Read-only validation of the actual snapshot stopped before creating any candidate: 3 purchase references have conflicting owners across 8 user records. Snapshot: 55 entitlement records, 35 stored Premium flags (not a verified count of active subscribers), no credential bindings. SHA-256: `76a27e1e5cab406086f17487267c1a7ce5f3d1d24e1e14d1662d5adbe2035499`. The source remains unchanged. Resolve ownership against RevenueCat/store evidence before preparing again; do not delete duplicate records or choose the first owner automatically.


### Reconciliation and verified candidate, 2026-09-16

The existing read-only RevenueCat key was used with the official CLI to inspect all 8 affected customers and search all 3 store subscription identifiers. Each reference resolved to exactly one production subscription: 2 expired and 1 active. Canonical owners were recorded in a protected, snapshot-bound operator evidence file. No RevenueCat subscription, customer alias or entitlement was modified.

For an ambiguous snapshot, the offline command accepts `--ownership-resolution /protected/ownership-resolution.json`. This operator-only file must use schemaVersion 1, source `revenuecat-read-only-api`, projectId `5ae2cbbc`, a matching sourceSHA256, a verifiedAt timestamp less than 24 hours old, and unique `owners` entries with `reference` and `owner`. It is not accepted by an HTTP endpoint. Evidence for unnecessary/unknown references, another snapshot/project or stale verification is rejected. This records authoritative transaction ownership; it never authenticates a caller or registers a secret.

A candidate was prepared **on the server**, beside STORE_PATH, in `release-migration-20260916/`: `candidate.sqlite`, `legacy-backup.json`, `ownership-resolution.json`, `report.json`. The verified script SHA-256 was `5ce850de07109a230443f3c2dde19b245139704862da040eeab2439af161e33e`. All 55 entitlement payloads are unchanged; 27 ownership references are preserved/reconciled; 3 conflicts are resolved; integrity and source checksum checks passed. One canonical owner is outside the original 55 records, so 56 known identities remain unbound. No credential was invented or changed. `readyForStrictAuthCutover=false`.

**Production has not switched databases or server versions.** The data-migration rehearsal is complete; automatic device identity recovery is still not implemented. The candidate is a rehearsal artifact, not a future fresh snapshot. Re-check purchases and quiesce writers before any actual switch. Mobile source and already tested 7.2.1 artifacts were not changed by this backend-only work.
