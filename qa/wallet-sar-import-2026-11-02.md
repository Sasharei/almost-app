# Wallet SAR import fix, 2026-11-02

Scope: ios/Almost/ExpenseParser.swift and the localized Wallet input regression in scripts/tests/bank-expenses.test.js. Preserve pre-existing work in this checkout.

Reproduced: the production parser rejects SAR amounts formatted by Foundation with the Saudi riyal symbol U+20C1, throwing the same generic walletInputRequired error used for absent input. The new regression failed before the fix and passed after it. The screenshot does not reveal the actual input, so this is a confirmed defect, not confirmation of the exact cause of that payment failure.

Fix: accept U+20C1 only when Wallet explicitly supplies SAR. Preserve legacy Arabic symbols, strict amount validation, currency mismatch rejection and missing-input rejection. Existing installed shortcuts can use this parser after the app is updated.

Verification:
- npm run test:bank-expenses: PASS, 15 tests. Includes host execution of production Swift parser, real Foundation SAR formatting in en_SA/ar_SA/ru_SA/en_US/ru_RU, Arabic digits, bidi marks, symbol placement, mismatch and invalid-input rejection, and iOS 15.5 parser typecheck.
- npm run check:functional-parity: PASS before and after the change.
- npm run check:localization: PASS, all 12 supported languages. No task-added display text.
- npm run check:themes: PASS. No layout, typography, colors, accessibility actions or theme changes.
- npm run verify: PASS, including analytics/native configuration, typecheck, lint, backend tests and release gates. Size gate inspected an existing Android artifact; no new release build was created. Existing artifact growth warning: +22.4 MB, still within the configured limit.
- git diff --check for task files: PASS.
- Selected compiler: /Applications/Xcode.app, Xcode 27.2 (27B52), no beta/RC marker.

UX review: setup, background import, missing/invalid input, duplicate handling and success paths keep their current actions and presentation. The parser fix adds acceptance of valid SAR input without changing navigation or controls. Apple Design and seven-law policies reviewed. No visual/runtime/device claim: no simulator, emulator or app session was launched. Actual Wallet delivery, absent provider data and the user's exact failed input remain unverified. No performance claim; the fix adds one symbol to an existing lookup.

Cleanup: removed task-owned probe sources, executable, module cache and raw verification logs in /tmp/almost-wallet-fix-20261102. Existing automated tests remove their own temporary fixtures in finally blocks. Retain this text summary and maintained regression tests only. Existing release artifacts and other tasks' files are preserved.
