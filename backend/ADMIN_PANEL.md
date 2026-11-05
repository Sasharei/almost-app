# Almost suggestions owner panel

Open `https://almost-monetization-backend.onrender.com/admin/suggestions/` in a browser. This is the private owner interface for the same board/database used by the mobile app. No Render navigation is needed for normal moderation.

## Owner workflow

1. Sign in with the owner password. First access uses a private, single-use setup link, valid for30 minutes, where the owner personally chooses a password of at least8 characters. Passwords are never provided to the assistant or embedded in HTML. After setup use the regular panel URL.
2. The default queue is Awaiting review. Open a suggestion to read its complete original text and see vote/report counts.
3. Approve makes it public. Planned, In progress, Done and Closed are also public statuses. Pending is visible only to the author. Hidden is excluded from the public board.
4. Select another status and Save when needed. Hidden records remain available under Hidden and can be restored. The feedback bar offers Undo; history records committed transitions.
5. Search/filter/sort and Previous/Next cover the complete queue in pages of50. Refresh retrieves current data. No background polling is used.
6. On a timeout or conflict, refresh before deciding again. A timed-out write may already have committed. Revisions prevent stale decisions from silently overwriting newer changes.
7. Sign out on a shared device. Sessions last at most8 hours and logout revokes the current session server-side.

The owner is the moderation operator. This feature does not provide automatic AI moderation. Event-driven email notifications are configured in the owner panel as described below.

## One-time operator setup and recovery

Only after the owner authorizes access activation, run on the existing server:

```
node scripts/suggestions-admin-setup.js
```

It refuses an existing owner, stores only the setup-token hash in the persistent `.admin.json.setup` file, and prints a private fragment URL. Deliver that link directly to the owner. Do not put it in public documents, source control or analytics. The owner enters and confirms a new password in the browser. The fragment is removed from browser history by the page and never appears in server HTTP request logs. A used or expired token cannot configure access.

For authorized password recovery, feed the new password through standard input to `node scripts/suggestions-admin-password.js`. Never put passwords in command-line arguments or logs. This writes a fresh password hash/signing key and invalidates existing sessions. Recovery requires the owner's decision, not an automatic fallback.

## Isolation and security

The panel uses a separate owner credential file adjacent to the suggestions database, e.g. `/var/data/almost-store.json.suggestions.sqlite.admin.json`, mode0600. Passwords use salted scrypt. Session cookies are HttpOnly, Secure and SameSite=Strict, scoped to `/admin/suggestions`. Persisted session hashes support logout revocation. Reads return no-store; status mutations require a valid session, canonical Origin, CSRF proof and exact record revision. Login has the existing bounded IP limiter and at most four concurrent password checks. No installation identity can become a moderator.

Production Origin defaults to the existing Render HTTPS URL because its legacy server does not trust proxy protocol headers. `SUGGESTIONS_ADMIN_ORIGIN` is the explicit canonical override for a future authorized custom domain. Do not loosen global proxy trust or permit arbitrary origins to solve a deployment mismatch.

CSP permits only same-origin scripts/styles/network, blocks framing and inline code. User text is rendered through textContent, never HTML. The panel does not show installation credentials, author actor hashes, purchase data, or payment-administration actions. It loads no third-party assets, fonts, analytics or scripts. No new package dependency is required.

## Persistence and compatibility

The existing isolated suggestions SQLite file gains additive `revision`, moderation-history and admin-session structures. Old mobile endpoints/payloads remain supported. CLI moderation is retained for deliberate operator recovery and updates revisions/history; ordinary work moves to the browser. Its removal criterion is an equally reliable owner recovery path and an explicit decision to retire the CLI. Historical pre-panel transitions are not invented.

Public withdrawal also increments revision and records its transition, so concurrent moderator decisions fail409 rather than resurrecting a stale post silently. Hidden/withdrawn data is recoverable, not personal-data erasure. This panel intentionally has no permanent-delete button. Preserve existing privacy-request procedures.

Deployment must be based on the exact current production artifact. Never deploy unrelated dirty main changes or the unfinished payment-store migration. Rollback to the prior compatible backend preserves all additive board data and the credential file. That old artifact does not serve the panel; owners temporarily lose web moderation until the compatible artifact returns.

## Validation scope

Web UI copy covers the12 shipping languages. Light/dark/PRO(indigo) are supported. Phone-browser layouts are web evidence, not native-device QA. The native app, store binaries, attribution and revenue SDK configuration are unchanged. Future app uploads remain subject to the separate server-readiness barrier.

## Email notifications

Open Notifications while signed in. Both sender and recipient are fixed to the owner-authorized support account `almostappsup@gmail.com`. In that Google account generate a separate App Password, then personally paste it into the panel and choose Connect Gmail. This Google credential is separate from the8-character minimum panel login password. Google App Passwords require2-Step Verification. Do not provide either password in chat. The first connection sends a clearly labeled test email and only enables delivery after Gmail accepts it. Check Inbox and Spam to confirm actual receipt. Existing connection details are collapsed behind Gmail; an owner can replace the credential, explicitly send another test, or pause notifications. Refresh reconciles uncertain results rather than replaying a write automatically. No Render interaction is needed for normal configuration.

Every new successful suggestion insert adds exactly one outbox record in the same SQLite transaction. Replayed client requests do not create another job. Existing suggestions are not backfilled. The server wakes the worker after creation, on startup and after configuration. Only a persisted queued retry or lease has a timer; an empty/disabled queue has no polling. At most one delivery runs per process, with a database lease coordinating overlapping processes. A20-second whole SMTP deadline owns and destroys the TLS socket on timeout or shutdown. Failed sends use persisted exponential retry with jitter, roughly1 minute up to1 hour. Restarts recover unsent jobs; disabling pauses queued work. Already processed/withdrawn ideas are skipped before sending. The queue is independent from mobile response success.

Email has a recognizable Almost subject, creation time, idea ID and a direct private-panel link. Submitted title/body, author/install identity and credentials are not sent. Templates and settings copy cover all12 app languages; the language selected when connecting is saved for future mail. No customer reply is sent. Deterministic Message-ID plus outbox deduplication prevents ordinary replay duplication. SMTP has no transactional idempotency guarantee: a lost acknowledgement after Gmail accepted a message can cause a duplicate on retry. Do not claim exactly-once delivery.

The Gmail App Password is stored only in the separate persistent `<suggestions database>.email.json`, mode0600, through an atomic replacement. Plaintext is required for SMTP authentication. The authenticated read endpoint exposes only configuration flags and aggregate queue status, never the secret. Configuration writes require owner session, same canonical Origin, CSRF and the bounded login limiter; only one configuration exchange is active. TLS certificate verification stays enabled, SMTP destination is fixed to `smtp.gmail.com:465`, and file/URL attachments, SMTP debugging and raw error logging are disabled. Provider errors persist only as generic categories. Revoking the App Password in Google stops authentication; pause notifications first when retiring the connection.

Production uses the existing paid Render Starter service. No new provider account, paid service, app binary or store publication is needed. Verify live asset hashes, anonymous isolation, database integrity, queue recovery, the real test email in the support inbox and a marked synthetic new suggestion before reporting notifications enabled. Backups/rollback preserve the additive outbox and independent credential file.
