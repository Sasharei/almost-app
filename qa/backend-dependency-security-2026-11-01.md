# Backend dependency repair — 1 November 2026

All five backend audit findings are resolved. Full `npm run verify` completed twice with exit code 0; the second run uses the final manifest/lockfile. No audit allowlist, severity gate, UI contract or attribution assertion was relaxed.

## Changes

- Backend: body-parser 1.20.6 → 1.20.9, qs 6.16.0 → 6.17.1, Zod 3.25.76 → 4.6.7. The five audit nodes were body-parser, qs, Zod and the dependent Express/googleapis-common paths. Backend audit is now zero at every severity.
- Added regression coverage for malformed compressed request bodies (server remains responsive), oversized constrained collections without per-element error amplification, and hostile `toString` values in comma query serialization. All 30 backend tests pass, including purchase ownership, restore, idempotency, authentication, webhooks and persistence.
- Once the backend blocker was removed, the app/tooling audit exposed additional existing blockers. Updated body-parser 2.4.0, qs 6.17.1, Joi 17.13.9, Undici 6.29.1, launch-editor 2.14.2 and modern glob 14.0.2. Existing legacy brace-expansion policy is retained, with the matching 5.0.12 API for the new matcher.
- `vendor/security/deepmerge` retains upstream 4.3.1 behavior but defines own data properties for all merge writes, preventing prototype poisoning. No fixed upstream release exists. Original license/types are retained.
- `vendor/security/minimatch` adapts the published fixed minimatch 11.0.1 engine (`minimatch-core` npm alias) to both modern consumers and the callable CommonJS interface used by glob 7. It does not rename an unfixed implementation. The security contract checks actual consumer resolution, source integrity, ordinary matching/defaults and an adversarial amplification case with a bounded child-process timeout.
- Existing application/UI/analytics changes in the workspace are preserved. No deployment or publication.

## Verification

- `npm run verify`: PASS, exit 0, including all repository suites, dependency security, analytics/native attribution gates, typecheck, lint, backend tests and release/size checks.
- Functional parity: PASS (267 contracts, 2314 fragments, 45 reachability patterns).
- Localization: PASS in all 12 supported languages; no UI copy changed in this task.
- Themes: PASS (light/dark/PRO and six accents). UX, appearance and interactions are unchanged; no simulator/visual review was needed or performed in this dependency-only task.
- Lint: zero errors; 446 existing repository warnings remain.
- App security gate: zero unmitigated findings. Raw audit still reports eight transitive paths to the previously mitigated image-size parsers; those parsers remain disabled and tested. The advisory allowlist is unchanged.
- Isolated clean `npm ci --ignore-scripts --no-audit --no-fund` installs the dependency tree successfully; security-vendor contracts pass from that isolated installation.
- Android ARM64 release build: PASS after tooling updates. Command: `SENTRY_DISABLE_AUTO_UPLOAD=true SENTRY_ALLOW_FAILURE=true ./gradlew app:assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain --no-daemon --offline --max-workers=2 -x app:uploadCrashlyticsMappingFileRelease`. No emulator or device session was launched. `npm run check:release` also passes after the final build.
- Final APK: 83,734,004 bytes, SHA256 `513bf3808fe9f3957a7cf67d2c1c067bea071353ee14f42710be578f1aba919c`, below the 100 MB budget. Existing growth warning remains. Artifact is disposable after verification; rerunning the size gate requires a release artifact.
- `git diff --check`: PASS.

## Advisory sources

[body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [qs](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw), [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249), [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4). Fork sources, licenses and hashes are maintained in `vendor/security`.

Cleanup complete: removed the dedicated temporary directory, raw audits/logs/backups, isolated installation, APK/profiles, task-new build intermediates and generated bundles. Existing crash mapping/native symbols/source maps are retained for symbolication; shared pre-existing build files, caches, installed dependencies and other tasks’ work are preserved. Test loopback servers/child processes exited. No production backend was changed; applying these fixes to a deployed service requires its normal deployment process.


Deployment follow-up: the production-compatible hotfix and Apple notification repair are Live. See [production billing checks](backend-deploy-2026-11-01.md) for actual deployment details and client E2E limits.
