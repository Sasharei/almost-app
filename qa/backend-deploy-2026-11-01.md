# Backend deployment and billing checks, 1 November 2026

Production is running commit `7349813ccd0e0591e3cfb9b34220348bf12aa8ec` on Node 22.22.0. Render deployment [dep-dbjkji49v7es73acmr5g](https://dashboard.render.com/web/srv-d6ga1c3h46gs73f5fch0/deploys/dep-dbjkji49v7es73acmr5g) is Live. Service: [Almost monetization backend](https://almost-monetization-backend.onrender.com/health).

## Scope and deployment

The running service was still on `cdbb0e9`, with JSON persistence and legacy installation binding. The local main backend has a separate SQLite/strict-auth migration whose recovery work is unfinished. Deploying main wholesale would have risked existing identities. The hotfix branch [codex/backend-dependencies-20261101](https://github.com/Sasharei/almost-app/tree/codex/backend-dependencies-20261101) therefore starts from the exact production baseline.

- `bc9427d`: patched production dependencies and added collection/query security regressions. Running versions confirmed on the server: body-parser 1.20.9, qs 6.17.1, Zod 4.6.7. Server `npm audit --omit=dev` reports zero vulnerabilities.
- `7349813`: fixed the Apple notification entry point after an official production TEST notification failed. Apple JWS verification replaces the unsupported custom HTTP-header requirement. Production signature verification cannot be disabled by the old escape flag. Only established transaction owners can be updated; request/appAccountToken hints cannot create ownership. Unknown transactions and TEST messages are acknowledged without creating grants. Refund/revoke/expired notifications override a future expiry. Async handler errors are contained.
- The Apple parser protections already exist in main and were backported without a database cutover. The focused regression suite was also added to main.
- Render's specific-commit deployment automatically disabled auto-deploy to prevent main from replacing this compatibility hotfix. It remains disabled. No main merge, mobile release, entitlement transfer or store-credential change was performed.

A protected backup is retained on the persistent disk at `/var/data/dependency-hotfix-20261101/`: store, prior manifest/lockfile, runtime configuration and previous commit. Directory mode 0700, files mode 0600. Configuration contents were never printed. This backup is required for rollback of the active production release.

## Verified live

- Final deployment is Live; `/health` returns HTTP 200. Node runtime and persistence format are unchanged.
- Store SHA256 after both deployments and notification replay remains `76a27e1e5cab406086f17487267c1a7ce5f3d1d24e1e14d1662d5adbe2035499`. All 55 entitlement records and transaction data match the pre-deployment snapshot exactly.
- Official Apple production TEST notification: before repair `UNSUCCESSFUL_HTTP_RESPONSE_CODE`; after repair `SUCCESS`, confirmed using Apple's test-notification status API.
- Replayed the genuine Apple-signed TEST twice directly to the deployed route: HTTP 202, trusted=true, mapped=false. A modified payload retaining the original signature returns HTTP 401. These probes did not change the store.
- Google RTDN already routes through RevenueCat's existing subscription for the correct Almost Android app. The route was preserved. A synthetic, test-only RTDN message with no customer or purchase token was published to the existing topic; Cloud Monitoring subsequently recorded one `response_class=ack`, `response_code=ack_200` delivery. This verifies Pub/Sub transport to RevenueCat, not a newly performed Google Play purchase.
- Read-only RevenueCat checks used project `proj5ae2cbbc` and matched bundle/package `com.sasarei.almostclean` on both stores. Four active-customer cases each have an active entitlement; two expired-customer cases have none. Active iOS subscriptions with auto-renewal disabled still give access through their paid expiry. Additional sandbox-history cases were inspected without changing customers or ownership. Customer identifiers, receipts and financial payloads are omitted from this summary.

## Automated checks

- Deployed branch: 13 tests pass locally and on the actual production Node 22 runtime, with test persistence disabled. Coverage includes JWS rejection, verified TEST, unknown ownership, renewal replay, cancellation, refund/revoke/expiry, constrained collection validation and hostile query serialization. Synthetic verifier responses in unit tests are not represented as real store signatures.
- Main workspace: full `npm run verify` passes, including 38 backend tests, dependency security, typecheck, lint, attribution/native analytics, functional parity, localization and theme checks. Android ARM64 release build passes. Existing lint and artifact-growth warnings remain non-blocking.
- Functional parity: 267 contracts, 2314 fragments, 45 reachability patterns pass. Localization covers all 12 supported languages; no UI strings changed. Theme check covers light/dark/PRO and six accents. UI/UX is unaffected by this server-only change; no simulator/visual theme review was performed.
- Main's existing restore/transfer ownership regressions pass. The production service deliberately retains its legacy compatibility baseline; those modern migration paths were not silently enabled.

## Coverage limits

On 1 November 2026 the user explicitly limited this task to server verification. A new client purchase and pressing Restore Purchases on a sandbox-equipped device were not performed and are outside the agreed scope. The existing Google sandbox record exposes an order identifier, not a usable purchase token; no order ID was relabeled as a token. Production subscriptions were inspected read-only and were not restored, transferred, refunded or charged for testing.

The production supplemental backend still has native Apple/Google validation flags disabled and legacy install-secret grace enabled. RevenueCat remains the app's entitlement source and the single owner of purchase lifecycle postbacks. This hotfix does not claim to complete the separately documented strict-auth/database cutover. Enabling direct native validation or deploying main requires that migration/recovery work and device E2E checks.

Server verification is complete within the user-confirmed scope. There is no pending client E2E step in this task.

Cleanup complete: raw logs, audits, customer/receipt/notification responses, OAuth login logs, temporary scripts, the isolated published worktree, release APK/profiles, task-new intermediates and generated bundles were removed. The dedicated task directory no longer exists. Test servers and child processes exited; release symbol files and shared pre-existing caches/build files are preserved. The protected production backup remains necessary for rollback. The temporary RevenueCat CLI profile `almost-backend-qa` was logged out and deleted after the user confirmed server-only scope; existing profiles are unchanged.
