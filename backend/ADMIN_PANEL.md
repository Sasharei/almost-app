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

The owner requested a managed Almost sender instead of granting Gmail access. Sender: `Almost <suggestions@notify.almsotapp.com>`. Recipient and Reply-To: `almostappsup@gmail.com`. The support mailbox is only a recipient; no Gmail password or Gmail API credential is used by the server. The authenticated panel offers state, explicit enable/test, pause and Refresh after an uncertain result. No provider secret is entered or displayed in the browser UI.

An operator provisions the sending-only Resend key in `SUGGESTIONS_EMAIL_API_KEY` on the existing Render service and verifies the isolated sending subdomain in Resend/DNS. The public API destination is fixed to `https://api.resend.com/emails`; sender/recipient are fixed in code. The adjacent mode0600 settings file stores only enabled state and locale. It rejects retired secret-bearing configuration instead of silently falling back to Gmail. Do not copy an API key into source, chat, screenshots or logs. Retire any previous sending credential deliberately after confirming it was unused.

Every successful new suggestion insert adds one durable outbox row in the same transaction. Replayed client requests do not create another job; pre-existing suggestions are not backfilled. Creation, startup and configuration wake the serialized worker. Only a persisted retry or lease owns a timer; empty/disabled/unconfigured queues do not poll. Retries use persisted exponential backoff with jitter, approximately1 minute to about1 hour. A20-second request deadline includes the response body and is cancelled on shutdown. One process owns requests, and database leases guard overlapping connections during recovery. The current Render topology retains one writable application process.

Before the first delivery attempt, the exact provider payload, language and idempotency key are frozen in the outbox. This preserves retries across language changes, new templates and process restarts. Resend deduplicates that key for24 hours. Completed jobs remain completed; a provider acknowledgement lost for more than24 hours can still produce a duplicate on later retry. No indefinite exactly-once guarantee is claimed. Processed/withdrawn ideas are suppressed before sending, and pausing preserves queued work.

Templates and settings cover all12 supported languages. A notification identifies Almost, the new suggestion event, creation time and private panel link. Submitted title/body, installation/author identity and secrets are not included. It is an internal owner alert, not a customer support reply. Real support replies still use the actual support mailbox per the separate owner policy.

Production acceptance requires exact deployed artifact, verified sending-domain DNS, sending-only credential, anonymous endpoint isolation, unchanged existing board data, one actual test email in the support inbox and a marked synthetic suggestion plus replay producing one alert. API acceptance alone is not proof of inbox delivery. No native binary or app publication is needed. Rollback must preserve all additive outbox and settings data; never overwrite newer board content from an old backup.
