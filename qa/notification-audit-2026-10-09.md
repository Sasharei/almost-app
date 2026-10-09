# Notification audit — 2026-10-09

Scope: all notification scheduling/presentation paths found in App.js, cloudNotifications.js, the iOS Wallet importer and Android bank notification listener. Source review, executable regression tests and non-launching native checks. No simulator, emulator, device session, push campaign, upload or publication was started.

## Findings and changes

| Finding | Resolution |
| --- | --- |
| Up to 9 generic/streak nudges could be planned each day; repeating reminders had no inactivity expiry. | Shared automatic budget: at most 4 automatic notifications per local calendar day, at least 2 hours apart, one per source per day, delivery scheduled only from 09:00 to before 21:00. Repeating automatic triggers become dated requests within a rolling 7-day horizon; reopening the app renews eligible plans. |
| Daily replacement could overlap between effects and retain orphaned other-language reminders. | Serial replacement, revision invalidation, language hydration gate and OS-queue sweep on replacement. |
| Coin rewards called the SDK directly, bypassing the higher-level scheduler. Repeats also bypassed its 30-minute spacing. | The budget sits inside the serialized native wrapper, covering both higher-level and direct calls. |
| Instant requests with a null trigger could bypass spacing in the scheduled-reminder path. | Instant requests now participate in spacing. |
| Text-based dedupe cannot recognize translations of one event, and can confuse identical text belonging to different purchases. | Owner/event identity takes priority. Explicit reminders receive persistent event identities and native IDs; legacy copy updates replace the same native ID. Different owners retain their individual actions. |
| Delivery history in memory could be lost on restart, or when a delivered banner was dismissed. | Persistent reservations/history store only IDs, timestamps and classification. Clearing a future request frees its reservation; cancelling a delivered request does not reset its daily budget. |
| Legacy repeating queues could remain active after upgrading. | Reconciliation retires unmanaged automatic requests; explicit deadlines survive. Corrupt/unavailable budget storage does not leave a trusted automatic queue active. |
| Automatic requests could crowd the bounded native queue. | Automatic scheduling stops at 48 queued requests; explicit deadlines receive priority over automatic requests as the queue fills. |
| Many bank/Wallet captures could repeatedly display banners even with a shared notification ID. | Native banners are limited to once per 30 minutes across restarts. iOS serializes concurrent callbacks and permits retry after native failure; Android uses a fixed ID and only-alert-once. Every capture/receipt is still processed. |

## Source coverage

| Sources | Policy |
| --- | --- |
| Generic and streak daily nudges | Shared automatic budget; one nudge per day; finite date requests. All existing copy variants remain available. |
| Almi hourly rewards, hunger and inactivity | Shared automatic budget, including direct SDK calls and immediate notifications. Existing state/party protection still applies. |
| Weekly reports, daily summary, free-day evening reminder | Shared automatic budget and finite replacement of recurring requests. Existing unlock/data/eligibility gates remain. |
| Budget allocation, spend-logging, smart insights, impulse reminders, tycoon autosave, untagged reward/impulse messages | Shared automatic budget, quiet hours, no automatic scheduling beyond the horizon. |
| Auto-selected frequency reminders | Shared automatic budget; explicit user-configured frequency remains exempt. Existing legacy frequency plans are preserved conservatively. |
| Pending decisions, subscription reminder/due events, accepted-challenge reminders, manually configured frequency | Explicit event identity prevents replay/duplicate native requests. Useful actions, sound, navigation and dates survive the automatic budget. Existing higher-level spacing rules remain where applicable. |
| Firebase Android foreground announcements | Injected shared wrapper. A cloud payload cannot claim a local deadline exemption. Existing message/content dedupe remains. |
| Firebase iOS foreground and both platforms' remote background notifications | Native FCM/APNs presentation; background handler creates no additional local copy. Server delivery requires sender-side limits; the local budget cannot intercept all OS-rendered remote banners. |
| Native bank/Wallet receipt banners | Separate explicit transaction channel, fixed notification ID, 30-minute banner throttle; no receipt/data loss. |

## Remote inspection

Read-only inspection of Firebase project `almostapp-54169`: Campaigns resolves to Messaging onboarding with “Create your first campaign”; no active/scheduled Console campaigns are visible. The FCM Notification report for Jul 11–Oct 9 shows “No data”. This is not proof of zero remote traffic or absence of external/API senders. No sender implementation was found in the repository backend. No campaign was created or changed.

The original screenshot contains exact daily-nudge dictionary copy in several languages. Its device queue and delivery payloads were not inspected, so the origin of those languages in that installed Xcode build remains unconfirmed.

## UX, localization and verification

Primary action remains opening the relevant purchase, Almi, summary/report or receipt screen. Pending save/spend actions and cancel/back routes remain wired. Denied permission schedules nothing through the existing permission flow. Automatic suppression is silent; eligible user-requested deadlines remain available during budget/storage errors. No new screen, competing action, copy or theme styling was introduced. All seven UX rules were reviewed within this scope; no new hierarchy/target/grouping violations were found in source review. This is not visual/runtime evidence.

- Notification tests: 55 passing, including parallel calls, restart/dismissal, legacy/corrupt queues, quiet hours, finite repeats, cancellation of grouped dates, explicit routing/actions, same-text distinct owners, copy replacement and native Swift receipt callback concurrency.
- Functional parity, localization (all supported dictionaries/native strings), and themes (light/dark/pro plus all 6 PRO accents): passed. User-facing copy is unchanged.
- Full `npm run verify`: passed; includes analytics/native attribution contracts, normal tests, typecheck, lint and release checks.
- Android `:app:compileReleaseKotlin`: passed without launch; Gradle/native deprecation and bundle warnings remain.
- Swift source parse and execution of the real receipt-notice method against mocked UserNotifications: passed. Full iOS release build and OS delivery were not verified.
- Physical-device delivery, DND/Notification Summary batching, timezone changes on a live device, phone-off backlog delivery, visual theme/RTL behavior and external API sender rate limits remain unverified. Scheduling limits are not a guarantee about the timing of OS-delayed delivery.
- No production speedup is claimed; the automatic queue and its loops are bounded. Production profiling was not performed.

Changes are in source only and require a rebuilt/reinstalled native app. Previously delivered banners already visible in Notification Center are not remotely removed.
