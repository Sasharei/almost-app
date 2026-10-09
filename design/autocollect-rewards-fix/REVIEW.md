# State/action contract

Scope: autocollect confirmation and persisted pending hydration; Progress, Rewards, challenge cards.

- Autocollect review: confirm reviewed entries is primary; amounts, spent/not sure, snooze and cancel remain. Confirmation busy prevents repeat execution; cancelling commits nothing. Pending entries must render after cold hydration without discarding data.
- Progress: open/create active goal remains primary. Rewards becomes a labeled secondary route near the heading; existing section row stays.
- Rewards overview: claim next available reward is primary; when none is claimable, open challenges. All achievements and Care remain secondary. Loading waits for deferred hydration.
- Rewards list: first claimable achievement is primary; other claims secondary; locked/claimed entries retain explanations. Local Back returns to overview; next Back returns to Progress.
- Challenges: active summary or first eligible start/claim is primary; other starts/claims secondary. Locked/in-progress states show prerequisites/progress, cancel remains secondary with confirmation and swipe. Daily challenge, focus route, progress, timers and badges remain.

Existing contracts cover start/claim/cancel, reminders, persistence, premium limits, analytics and reward payout. Baseline parity passed: 191 contracts. No simulator/device launch authorized. Seven-law policy: ../../UX_RULES.md and /Users/sasarei/.codex/rules/UX_RULES.md.

## Implementation and evidence

- Moved interaction state hooks above render-time autosave snapshot evaluation. The regression executes actual AppContent declarations in source order: the pre-task source fails with `ReferenceError: Cannot access 'temptationInteractions' before initialization`; patched source passes both initial and persisted pending states and preserves the remembered amount. No storage reset/migration.
- Rewards has a labeled top-of-Progress route, peer destination tabs, explicit cart routing and scroll reset. The local detail Back listener consumes Back before the app returns to Progress; leaving the Rewards overview returns to Progress overview consistently. Tests execute the real routing callback and local Back effect.
- Opaque challenge/reward content and swipe foreground prevent the destructive background from refracting through cards. Daily reward icon shares the header row. Reward list and challenge shell adopt current spacing/type styles; primary challenge emphasis is limited to the next eligible action, with other actions retained as secondary.
- All added display labels reuse existing localization keys. `git diff --name-only`, `git diff -U0`, and the task-specific diff against the pre-task App.js were reviewed; unrelated pre-existing modifications retained.

## Checks

PASS: functional parity (192 contracts), localization (11 languages), themes (light/dark/PRO, six accents), attribution (18 tests), UI session (43 tests), engagement (145 tests), analytics contract, native analytics configuration, typecheck, lint (no errors; existing warnings), install security (7 tests), backend (27 tests), runtime parity and size gate (existing Android artifact, not a new build).

Full `npm run verify` stops at dependency security audit: 10 unmitigated advisory URLs. Dependency versions were not changed in this task. Remaining verification commands were run separately.

Seven-law source review: meaningful grouped destinations; native target minimums and equal-role top links; honest existing progress; retained confirmations/cancel/swipe; one primary challenge action and secondary alternatives; existing locked/empty/loading states preserved. UX source review passes within this scope. Runtime/visual results are UNVERIFIED: no simulator or device launched. No claims of theme contrast, RTL/large-text layout, native gesture rendering, or crash resolution on the user's actual Xcode-installed build. The attached screenshot supplies before evidence only. Device confirmation still requires rebuilding/installing this code and repeating confirmation plus cold restart.

The iOS production JavaScript/Hermes export also completed successfully (`npx expo export --platform ios`, output in `/tmp/almost-autocollect-ios-bundle`). This is bundle/build evidence only, not a native launch or visual check.
