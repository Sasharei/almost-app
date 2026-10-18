# FCM permission revocation — 17 October 2026

User authorized fixing token removal when OS notifications are disabled. No publication, deployment, upload, device or simulator operation.

Changed only src/notifications/cloudNotifications.js and scripts/tests/cloud-notifications.test.js for this task; other existing working-tree changes preserved.

On startup, permission-effect restart or app foreground reconciliation, denied OS permission now disables FCM auto-init, deletes the existing FCM token and unregisters APNs on iOS. APNs unregister is attempted even if token deletion fails; the existing30-second retry handles failures and is canceled by effect cleanup. Permission grant still enables cloud announcements; iOS provisional authorization remains valid. Local scheduled reminders/deadlines and install/revenue attribution remain unchanged. No Firebase Installation deletion, user-data erasure or analytics reset added.

Registration/deletion is serialized across effect generations. A foreground permission change received during an operation is coalesced and reconciled afterward; permission is re-read after token creation. A stopped effect cannot schedule additional retry/registration, while an already-started deletion completes before its replacement registers.

Verification:

- cloud-notifications.test.js:20 PASS, including7new regressions for iOS/Android revoke/re-enable, deletion network failure plus APNs unregister/retry, denial during token creation, grant during deletion, effect replacement during deletion, provisional authorization.
- npm run test:cloud-notifications:72 PASS; preserves foreground dedupe, native/background presentation, localization refresh and local scheduling policy.
- npm run check:functional-parity, check:localization, check:themes, check:analytics-contract, check:native-analytics-config:PASS.
- npm run verify:PASS(exit0), including typecheck, lint, security, backend and all configured suites. Existing repository lint warnings remain; no cleanup of unrelated warnings. Size gate used an existing debug APK84.4MB below100MB, not a new production build or runtime proof.
- git diff --check for the2changed files:PASS.

No new user-facing strings, screens, controls, gestures or theme changes. Console diagnostic wording only. Apple Design/UX rules assessed: existing permission grant/denial/retry flows preserved; primary actions and visual hierarchy unaffected. Localization covers12supported languages; no translations changed. Physical iOS/Android token invalidation, remote delivery, background behavior and release-build measurements remain unverified under project device/simulator restrictions. No runtime performance improvement claimed; additional reconciliation is asynchronous and outside the rendering/attribution path.

Fixture-owned temporary directories are removed by tests' finally/tearDown logic; scan of the known temporary directory prefixes after completion found0remaining. No task servers/watchers/raw logs/screenshots created. Shared caches, existing APKs and other agents' artifacts preserved. This concise record and maintained regression tests are retained.
