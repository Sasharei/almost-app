# Autocollect amounts verification, 2026-11-02

Catalog defaults are rounded in the selected currency before display and recording. EUR examples: 5.02 becomes 5; 13.11 becomes 13. Currency-specific larger steps and positive subunit amounts are supported. Explicit prices and remembered decisions retain their precision.

Confirmed decisions retain the local amount and currency alongside USD accounting values. A confirmed 5 to 6 adjustment is reused after serialization and rate refresh. Existing pending edits, confirmation, save/spend selection, exclusion, snooze and dismissal remain available.

Checks:
- Targeted memory and tycoon tests: 29 passed, including all selectable currencies, explicit cents, latest-history precedence, restart and rate refresh.
- Functional parity: passed, 268 contracts. The memory contract follows the shared helper and additionally checks local-currency recording.
- Analytics contract, native analytics configuration, typecheck, application regression suites and security audit: passed.
- Localization: passed for all 12 supported languages. This task changed no display strings.
- Themes: static check passed for light, dark and pro with six PRO accents.
- Targeted ESLint: passed with warnings and no errors.
- Full npm run verify stopped at lint: unrelated .status-gradient-qa.js has five undefined-symbol errors at lines 91, 93, 97, 104 and 110. That file was preserved.
- Remaining verify stages ran separately: install-secret security tests (7 passed), backend tests (38 passed), runtime parity and artifact size check passed. Size inspection used an existing debug APK, not a build of this change.

UX source review covered populated review, editing, confirmation/cancel, undecided, snooze and dismissal states. Actions and hierarchy were preserved. Actual rendering and gestures across themes, accents, RTL and large text remain unverified because no simulator or device launch was authorized. No runtime performance improvement is claimed.

Cleanup: task-owned backups, raw logs and temporary diffs in /tmp/almost-autocollect-20261102 were removed. Test harnesses clean their native fixtures. No app sessions or persistent servers were started. This concise summary is the only retained QA artifact from this task. Other worktree changes and QA files were preserved.
