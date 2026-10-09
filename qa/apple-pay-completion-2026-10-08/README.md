# Apple Pay completion — 2026-10-08

Implemented: one canonical receipt per repeated Wallet delivery; legacy duplicate migration; normal `spend` history and category budget calculations; received-payment connection status; merchant classification and persistent manual correction; localized Almi Live Activity confirmation with amount.

The SQLite receipt remains authoritative. Import does not replay the manual decision modal, grant savings rewards, or create a second persisted copy of the same expense. Receipt edits/deletions immediately change the projected history and budget. Original currency and decimal amount are retained. Currencies without an available conversion rate are not silently treated as USD.

Wallet templates do not currently supply a stable transaction ID/date. For missing dates, equal merchant/amount/currency signals within five seconds are combined. Signals remain recoverable through “Record as a separate payment” in the receipt editor, so genuine equal purchases are not lost. Exact supplied transaction dates retain separate purchases and deduplicate retries. The bundled signed templates and action identifier remain unchanged; a working automation does not need reinstalling.

## UX state and action review

| State | Primary action | Secondary actions |
| --- | --- | --- |
| Premium unavailable | Unlock Premium | Close, inspect/edit existing receipts |
| Import paused | Enable import | Edit existing receipts, Close |
| Enabled, no payment received | Set up Apple Pay | Pause import, Close |
| Payment received | Review expenses | Set up again, pause, edit other receipts, load more, Close |
| Setup | Add ready automation | Back/Close |
| Editing | Save expense | Category picker, delete, recover combined payment, Back |
| Loading | Wait with activity indicator; controls disabled | Close available when operation finishes |
| Error | Retry | Close and retained data |
| Unsupported iOS | Explained disabled enable/setup control | Close, retained receipts |
| Wallet action success | Confirmation with Almi and amount | Open receipt journal from Live Activity |

Source review covers Fitts/Hick/Zeigarnik/Jakob/goal-gradient/Von Restorff/Miller: 48-point controls, one primary action per state, contextual editing, progressive category selection, honest received-payment status, preserved source/enable/pause/edit/delete/back/pagination routes, localized text and shared theme colors. Functional contracts additionally cover category correction, connection status, canonical spend projection and recovery of combined payments.

Visual/runtime verification was not performed: no simulator, emulator or connected-device session was authorized or launched. Light/dark/PRO, all six PRO accents, RTL, large text, compact/expanded Dynamic Island, locked-device Wallet delivery and real card payments still need physical visual/runtime QA. System authorization and presentation control whether Live Activity appears; notifications are a fallback when permitted. No release was uploaded or published.

## Verification

- Nine expense tests passed, including actual Swift/Java parsers and the production Swift SQLite store compiled on the host. Coverage includes invalid inputs, expired Premium, duplicate delivery, simultaneous deliveries, deletion markers, immutable delivery identity after editing, atomic category corrections, merchant learning, legacy duplicate migration, recovery exactly once, 81-row pagination and projected spending totals.
- Localization passed in all 12 supported languages. Native confirmation has matching translations; in-app selected language is synchronized to the background confirmation copy.
- Theme validator passed for light/dark/PRO and six PRO accents. This is static evidence, not visual evidence.
- Functional parity passed (246 contracts). Initial baseline temporarily reported an unrelated decision-wheel fragment missing in the pre-existing working tree; the current tree passes without weakening that contract.
- Typecheck passed; lint had zero errors and existing warnings.
- Analytics contract and native analytics configuration passed. Attribution startup, ATT behavior, partner postbacks and RevenueCat ownership were not changed.
- Non-launching unsigned iOS Debug build succeeded, including app intent metadata and the Widget extension. This does not establish real Wallet/Live Activity behavior or release attribution.
- Full `npm run verify` passed the expense, functional, attribution, notification, UI/session, engagement and shopping-blocker stages, then stopped at an existing critical backend dependency vulnerability in `check:security-audit`.

Performance scope was assessed against the shared checklist. This task adds local indexed queries and paginated background loading, deferred from startup, with revision-based suppression of unchanged snapshots. No runtime performance gain is claimed; release profiling was not performed.
