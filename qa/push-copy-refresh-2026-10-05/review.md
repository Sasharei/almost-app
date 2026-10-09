# Push copy and context review — 2026-10-05

## Scope and source of truth

Reviewed active local notification producers in App.js, adaptive mood overrides, native Android bank-expense notifications, and Firebase announcement boundaries. Updated 70 dictionary keys per language, 24 adaptive mood fields across six moods (one shared Pause body), and two bank-import notice keys. Coverage: en, es, fr, ru, de, pt, it, ar, zh, zh-Hant, ko, ja. Arabic is shared by ar-sa and ar-ae. Placeholder identifiers, array variant counts and gender shapes were preserved across languages. The full authored catalogue is in copy-catalog.md; Firebase update drafts are in cloud-update-copy.md.

Historical smartReminderTitle/Body and dailyReflectionReminder keys have no active producer in the current application and were not reactivated. App channel names and permission prompts remain clear system labels. No pushes were sent, permissions requested or devices/simulators launched.

## State/action inventory and UX review

| State / trigger | Primary next step | Preserved secondary actions / conditions |
| --- | --- | --- |
| Purchase check / recurring card | Open the card and record the real decision | Purchase, skip, edit and subsequent timing controls; configured cadence |
| Pause deadline / overdue alert | Open the paused purchase and decide | Buy, skip, extend pause; dismiss/back; no assertion that a goal is funded |
| Pattern-based purchase reminder | Review a purchase before deciding | Purchase/skip actions; past entries remain historical facts, not a judgement |
| Daily nudges / missing daily entry | Record an actual purchase or skip | No invented activity, no demand to spend or invent a skip; existing notification permission and cooldown |
| Challenge in progress | Check remaining work | Existing progress, completion, claim and navigation; no invented near-finish claim |
| Daily challenge completed | View credited bonus/results | Completion receipt remains consistent with automatic crediting |
| Weekly / daily reports | Open the report | Existing report destination and local-midnight daily expiry |
| Almi inactivity / hunger | Visit for play or feeding | Care controls, permission checks, hunger immunity and cooldown; no blame for being away |
| Hourly game reward ready | Open and collect game coins | Same claim handler, no suggestion of bank money |
| Auto-collect ready / hunger blocked | Review cards / feed Almi respectively | Actual buy/skip/unknown decisions, amount editing, snooze, exclude, cancel and premium prerequisites |
| Subscription upcoming / due | Check expected payment / actual charge | Log paid or not paid; cancel at the service; dates and sums stay visible |
| Unallocated recorded purchase skips | Open Budget and plan a bank transfer | Savings/debt routes and proof verification; at least the threshold, not an exact balance or automatic transfer |
| Imported bank notice | Open and check the local record | Review/edit/delete; no amount or merchant added to the notice |
| Notification permission denied / disabled | No new permission flow | Existing enable/later choices and OS permission checks remain |

Reviewed all five application UX principles and seven-law policy. One focused next step per notification; familiar tap and factual quick-action labels; truthful unfinished work and progress; secondary decisions remain reachable. No target sizes, hierarchy styling, navigation destinations, gates, persistence semantics or attribution/purchase paths were redesigned. Text also appears in the overdue Pause alert and Android bank channel label; those remain localized.

## Scheduled-copy refresh

Daily nudge signatures and card-check plan keys include the copy revision. Subscription reconciliation retains only the current revision, cancels the obsolete matching reminder before dedupe/scheduling, and keeps its desired time and target. Daily summaries and same-day no-spend reminders also compare title/body before reusing an existing schedule. Other finite already-scheduled notifications refresh through their existing lifecycle; this is not a blanket cancellation of outstanding challenges or historical reminders. Any such old one-off can keep its original text until the existing scheduler replaces it or it is delivered.

The scheduler regression tests execute the actual subscription reconciliation closure with an OS scheduler stub. They cover replacement before dedupe without a shifted trigger, reuse of current copy, and cancellation failure without duplicate creation. They are in test:cloud-notifications.

## Performance applicability and limitations

This is a copy task with bounded existing scheduler reconciliation. The performance checklist was reviewed: no new network work, images, queries or lists. Copy revision invalidates existing caches once; subsequent subscription plans reuse the current version (covered by test). Release runtime/startup performance was not profiled and no performance improvement is claimed.

## Verification

Functional parity passed before the edits. Final localization, theme, parity and other check results are recorded in sibling logs. Full verify was attempted: the first run stopped on disk ENOSPC; the retry passed application test suites then stopped on the repository security-audit gate reporting dependency advisories. Dependency upgrades are outside this copy task. Remaining verification stages were run separately.

No visual/runtime evidence is claimed. The project prohibits simulator/device app sessions without current user approval. Banner truncation, dynamic type, actual quick-action rendering and RTL on iOS/Android remain unverified. Static theme validation covers light/dark/pro and six PRO accents; no theme-specific styling was changed.

Final individual gates: localization PASS; themes PASS; functional parity PASS; typecheck PASS; lint completed with 0 errors and 460 repository warnings; cloud/copy regression PASS; subscription tests PASS; backend tests PASS; security tests PASS; release parity/size PASS. Analytics/native attribution checks also passed in the verify retry and release parity run.
