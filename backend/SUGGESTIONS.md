# Almost suggestions board

Implemented 5 November 2026. This is an additive feature on the existing app backend. It does not change entitlement, purchase, attribution or RevenueCat ownership contracts.

## User flow and comparison

[ClickUp's feedback boards](https://help.clickup.com/hc/en-us/articles/6327848986775-Share-your-feedback-with-ClickUp) let users suggest improvements and vote. [Canny](https://help.canny.io/en/articles/3816826-canny-101) combines a searchable board, one vote per post and progress statuses. Almost adopts discovery before submission and honest statuses, with the owner's requested up/down voting. A net score is a preference signal, not a delivery commitment.

The secondary envelope in the home header opens a native board. Existing Back, report and help actions remain. Users can search all approved ideas, sort by Top/New, load more, refresh explicitly, submit, change or remove their vote, report content, hide an author, restore hidden authors and withdraw their own idea. New submissions are pending and visible only to their author until an operator approves them. Submission text remains in its original language. All app copy covers the 12 shipping locales.

## Storage and identity

- Use the same server, verified install-proof sessions and `EXPO_PUBLIC_MONETIZATION_BACKEND_URL` as the current app adapter. No alternate provider or foreign regional fallback is introduced.
- Set `SUGGESTIONS_DATABASE_PATH` to a file on the existing persistent disk, for example `/var/data/suggestions.sqlite`. Default is `${STORE_DATABASE_PATH}.suggestions.sqlite`; when the entitlement database is in memory for tests, the board also defaults to memory. Production must use an explicit persistent path.
- The board has its own SQLite WAL database, separate from payment tables and legacy JSON migration. Creation, voting and limits use immediate transactions. Unique `(author, request_id)` and `(suggestion_id, voter)` constraints make lost-response replay and vote replacement safe across connections/restarts. Additive schema migration populates Unicode-normalized search text for early installations.
- Runtime must support `node:sqlite` with the DatabaseSync API. Root main requires Node >=24.11.0; the isolated production-baseline backport retains and is checked on Node 22.22.0. Verify the actual deployed runtime and baseline before preparing a production backport; do not silently deploy unrelated main-branch auth/storage migrations.
- One vote is enforced per installation credential pair, not a verified human or a cross-device account. The auth route signs a domain-scoped actor derived from the install ID and its strong secret; an unproven legacy payment session cannot impersonate that actor. This does not grant payment trust and remains stable across signing-key rotation. Reinstallations can create a new identity. Installation identifiers and secrets are never returned with public content. Tokens predating the optional actor claim refresh once before accessing the board. This is bounded abuse resistance, not Sybil-proof identity.
- No background polling, subscription, or automatic mutation retry. Read on entry/resume, explicit refresh/search/sort and pagination. Abort reads/mutations when dismissed/backgrounded, ignore stale completions, keep a durable namespaced draft and its idempotency key before submission. Shared auth requests can finish for other consumers and remain time bounded.
- Never attach product financial data, saved items, goals, advertising identifiers or analytics payloads. Only explicitly entered text and language go into an idea. Do not log request bodies, authorization headers or install secrets.

## HTTP contract

All routes are authenticated POSTs with JSON. The existing generic IP limiter applies first, then install-session claims are checked. Shared-secret-only requests cannot act. Identity fields are `appUserId`, `installId`, `platform`; the install secret is sent only to `/v1/auth/session`.

| Route under `/v1/suggestions/` | Additional fields | Response |
| --- | --- | --- |
| `list` | `query` up to 120 characters, `sort` top/new, nullable keyset `cursor`, `limit` 1-50 | `items`, nullable `cursor` |
| `create` | UUID `requestId`, trimmed `title` 5-100, `description` 10-1500, `language` 2-16 | `item` (pending), HTTP 201; replay returns the same item |
| `vote` | UUID `id`, `value` -1/0/+1 | authoritative `item`; 0 removes, repeated same value is idempotent |
| `report` | UUID `id` | acknowledgement; one report per installation/post |
| `block` | UUID `id` of a visible post | hides that author's posts for the caller |
| `unblock` | none | restores all authors hidden by the caller |
| `withdraw` | UUID `id` of caller's own post | hides the post, no other user's post may be withdrawn |

Public item fields: `id`, `title`, `description`, `language`, `status`, `createdAt`, `score`, `isOwn`, `myVote`. Pending/hidden posts are excluded from other users' reads. Hidden posts are not actionable. Pending/done/closed posts cannot receive votes. Read responses use `Cache-Control: no-store`.

Limits: 5 new ideas per installation/UTC day, 60 vote requests/minute, 20 reports/day, 120 list requests/minute, plus existing IP limits. These are limits on accepted work, not a claim about production capacity. Search uses normalized Unicode case folding and literal substring matching, with no user SQL interpolation. Keyset pages deduplicate client-side; explicit refresh reconciles rank changes while paging. Ranking is live, not a snapshot across requests.

## Moderation operations

The owner browser panel at `/admin/suggestions/` is documented in [ADMIN_PANEL.md](ADMIN_PANEL.md). The CLI remains for deliberate operator recovery. Owner access activation is separate and requires the owner.

Run the supplied CLI in an authorized server shell, with the same configuration and persistent volume:

```sh
node scripts/suggestions-admin.js list
node scripts/suggestions-admin.js list 200
node scripts/suggestions-admin.js status <uuid> open
node scripts/suggestions-admin.js status <uuid> planned
node scripts/suggestions-admin.js status <uuid> in_progress
node scripts/suggestions-admin.js status <uuid> done
node scripts/suggestions-admin.js status <uuid> closed
node scripts/suggestions-admin.js status <uuid> hidden
```

There is no public moderation endpoint, new admin password or client admin privilege. `list [offset]` returns pages of 200 visible/pending records, prioritized by report count, and `nextOffset` for the next page. Operators should review daily and work through all pages, or replace the console with an admin UI if volume outgrows this initial workflow. Read reports first, then pending ideas. Hide abuse, personal data and spam; approve useful ideas. Set planned/in_progress/done only when this reflects actual work. Reports do not automatically hide a post, preventing trivial coordinated censorship. New-submission owner emails can be enabled in the private panel; no automatic customer reply or feature promise is sent. Never run moderation against production merely to exercise a test.

Withdraw and hide are reversible moderation states, not confirmed personal-data erasure. Apply existing privacy/deletion procedures to this additional store when responding to a valid deletion request. A retention/deletion schedule and an accountable moderation operator must be established before enabling the feature publicly.

## Deployment and rollback

No production deployment or mobile publication is included in this implementation. Before deployment, obtain the owner's authorization for the concrete patch and inspect the current live commit/runtime, both regional routes and existing legacy-session requirements. Backport only the board to the actual deployed baseline if main has unfinished auth/persistence migration work. Preserve old clients' contracts. Do not replace production with the whole dirty workspace.

1. Back up the current deployed artifact/configuration and persistent volume using the existing approved process. Create the separate suggestions path with service-owner access only (directory 0700, file 0600). Keep the SQLite database, WAL and SHM together on a local persistent volume; independent replicas must not use separate disks or NFS.
2. Test the board patch on the deployed runtime in a non-production environment, including legacy client compatibility. Apply no entitlement migrations. Approve a synthetic fixture only in that test environment, then remove its disposable store.
3. After authorized deployment, prove the deployed commit, identity isolation, submission/replay, voting replacement, moderation and persistence. Test Worldwide and Russia reachability separately using final app configuration. Do not label `/health` as end-to-end proof. Capacity and real Russian-origin reachability remain unmeasured until exercised.
4. Release the app only after the mandatory dated server-readiness receipt has all applicable rows confirmed PASS. The visible entry requires working new endpoints; do not publish the app against a server returning 404 or claiming readiness based on local tests.
5. Roll back to the exact prior backend artifact without deleting or restoring over subsequent data. Older clients remain unaffected; new clients show a localized retry state and retain their draft until compatible endpoints are restored. Retain the board database for recovery and review the blocked client release with the owner.
