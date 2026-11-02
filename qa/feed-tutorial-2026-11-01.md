# Feed tutorial verification — 1 November 2026

The tutorial now uses the real temptation feed and its existing native amount dialog. `DecisionCardWheel` and the obsolete review-button entry into it were removed. The searchable full picker, card creation, schedules/status, editing, saving, spending and freezing remain available. Completion/skip storage was preserved; existing users are not forced through another tour.

| State | Main action | Other paths |
| --- | --- | --- |
| Feed | Open the highlighted card | Skip |
| Card | Choose the factual save/spend outcome | Freeze; skip |
| Amount | Adjust the real slider | Manual entry/cancel; skip |
| Confirmation | Confirm the selected decision | Switch outcome; cancel/retry; skip |
| Pending | Complete the actual category/confirmation dialog | Cancel returns to the unchanged draft |
| Result | Finish | Skip |
| Empty/recovery | Add a card / restart | Cancel / skip |

The Apple Design skill, five project UX principles and seven-law checklist were applied to the affected states above. Progress remains action-driven, Skip stays available, and real product handlers retain ownership of decisions.

Native verification used an iPhone 17 simulator, iOS 26.5, Debug x86_64, current working-tree JavaScript, and synthetic local records. The x86_64 build is required by the existing MLKit dependency; architecture overrides were command-line only. No store purchase was made.

- Light / English: real feed → choice → slider → category cancellation → category confirmation → Almost Pay cancellation → retry → committed saving → result → Finish. Compared native captures and the receipt: the selected $7.50 survives both cancellations. The initial reset-on-reopen defect was reproduced and fixed.
- Dark / Russian: feed/choice/amount, spending selection, manual amount entry (8), transition to confirmation, Skip. Ordinary card actions still open the amount dialog after skipping, without a tutorial overlay.
- Light / Arabic, system text size `extra-extra-large`: opening, decision choice and amount states; RTL alignment, long copy, targets and Skip were visually reviewed. The original `large` text setting was restored.
- Native captures were inspected for hierarchy, text clipping, matching control heights, contrast, modal order and reachable actions. Existing iOS debug notification/keychain warnings and cold Metro timeouts interrupted exploratory runs; successful continuations were performed after dismissing debug banners and warming Metro.

Checks:

- `npm run check:functional-parity`: PASS (267 contracts).
- `npm run check:localization`: PASS, all 12 dictionaries; button and summary names are interpolated from the actual localized UI labels.
- `npm run check:themes`: PASS, light/dark/PRO and six PRO accents.
- `node --test scripts/tests/practice-tutorial.test.js`: PASS, 9 tests, including stale-session protection and the native amount-reset effect.
- `npm run verify`: all preceding suites/configuration/attribution checks passed; blocked at `check:security-audit` by current backend dependencies (2 moderate, 3 high vulnerabilities). This task did not change dependencies or weaken that gate.
- Typecheck, full lint (0 errors), final targeted lint, security tests (7), backend tests (27), and runtime-configuration/size checks passed. The size check used the preexisting release artifact; no new release was built.

Coverage limits: Android runtime, native PRO/accent rendering (test account has no Premium entitlement), VoiceOver, software-keyboard layout, tablet/compact devices, extreme accessibility text sizes, empty/create/recovery runtime paths and release attribution/purchase flows were not exercised. Empty/recovery and outcome state transitions retain automated coverage. No runtime performance improvement is claimed.

Cleanup: task-local build intermediates, JS bundle, fixture scripts/data, captures, raw logs and temporary flows were removed; Metro was stopped, the task-installed app was uninstalled, and the simulator was returned to its initial shutdown state. Preexisting source changes, shared dependencies/caches, other apps and other running simulators were preserved. Among QA artifacts, only this summary and maintained regression tests are retained.


## Follow-up: tutorial motion

Reproduced the reported flicker in native video. A stale recovery deadline briefly showed the recovery button on a new step, target remeasurement discarded the previous presentation, constrained bubble measurements fed back into placement, and the feed/native amount hosts did not share their visual state.

The overlay now retains its complete presentation until the next real target is measured, keys recovery deadlines to their target/session, reveals a target once per viewport, measures intrinsic text separately, and animates the rounded mask, outline and bubble on the UI thread from their current values. Feed and native amount hosts share those values and hand off after native onShow; the tutorial suppresses the competing modal/layout fades. Live touch openings still use only the actual measured target. System reduced-motion preference is respected. No copy changes were needed for this follow-up.

Native Debug x86_64 iOS 26.5 video review: the original recovery flash and bright feed flash were reproduced, corrected, and compared with the final feed → choice → slider → confirmation recording. The final full light/English run passed category confirmation → Almost Pay cancellation → unchanged $7.50 retry → commit → result → Finish. Frame strips confirmed continuous guide presentation through the native handoff; intentional pending states and product confirmation animations remain. A stable task-local JavaScript snapshot was used for final QA because another process was editing App.js concurrently. No frame-rate or release-performance claim is made from this Debug simulator recording.

Apple Design and all five UX / seven-law requirements were reviewed against the state/action table above. Primary actions, Skip, cancel/retry, progress, safe bounds and live target blocking are retained. The dark follow-up run was blocked when CoreSimulator stopped responding to listing and screenshot commands. PRO/accent variants, Android, physical devices, release profiling and runtime reduced-motion were not rechecked in this follow-up; the earlier theme coverage above must not be taken as motion verification of these variants.

Final checks: 14 tutorial tests PASS; functional parity PASS (267 contracts); localization PASS (12 languages); themes PASS (three themes, six PRO accents); typecheck and targeted ESLint PASS. npm run verify passed the preceding suites including attribution/native analytics checks, then stopped at the existing backend dependency security gate (latest audit: 2 moderate, 2 high). Dependencies and assertions were not changed by this fix.

Follow-up cleanup: task Metro/proxy/recording processes stopped; task app uninstall and simulator shutdown commands completed successfully. Task-local build, snapshot, videos, frame strips, fixtures, Python environment and logs were removed, together with identified task driver outputs and the task simulator audio crash report. The dedicated temporary directory was confirmed absent. Other applications and simulators were preserved.
