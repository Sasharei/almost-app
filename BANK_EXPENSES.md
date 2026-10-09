# Automatic expense imports

Profile → Settings → Automatic expenses opens the local expense journal. This is a Premium capture feature; existing receipts remain editable without Premium. Imports never credit rewards, change Not spent or decision history, or send financial data to analytics. No bank credentials or server connection are involved.

## iOS: Apple Pay / Wallet (iOS 17+)

Apple Pay is the iOS import source. Enable import in Almost, then choose **Set up Apple Pay**. Installation hands a bundled, Apple-signed `.shortcut` document to Shortcuts using the system Open In menu; it no longer opens the app root without a file. The installer is cancellable, reports handoff failures and never claims that handoff proves installation or enablement.

The iOS 17–26 ready action contains preconnected Amount, ISO currency and Merchant tokens. Users still create a Wallet Transaction trigger, select cards and Run Immediately, then run **Almost Apple Pay** with Shortcut Input. No payment amounts or bank messages are manually entered.

For iOS 27, the bundled `AlmostApplePayAutomation.shortcut` is a complete Wallet trigger with **Any Card / Any Category / Any Merchant**, preconnected amount, ISO currency and merchant fields, Automation on and Notify off. The same file is suitable for all users; it contains no account, card, merchant filter, device currency or import questions. A repeat import on the physical device preserved the trigger and all fields, but Shortcuts explicitly turned the automation off. Users must confirm adding it and then enable Automation; installation is not literally one tap. The app cannot enable it silently.

The signed automation was exported from Shortcuts on the physical iPhone Air using File → Anyone. Its authenticated payload is verified against the canonical source before bundling. macOS 26 signing strips iOS 27 triggers, so the generator preserves the validated device export rather than replacing it with that invalid output. `--automation-export PATH` accepts a replacement only after signature and critical-payload verification.
The availability state explains the missing template and disables its installer instead of sending users to an empty Shortcuts screen. iOS below 17 remains unsupported. The retired notification-text intent and standalone gallery provider remain removed.

`ImportApplePayTransactionIntent` receives separate amount and ISO currency strings extracted from Wallet’s currency amount (`Amount → Currency Amount` and `Amount → Currency Code`). This avoids Shortcuts’ quantity field embedding the phone’s currency. It preserves the supplied transaction currency independently of Almost’s selected currency. It does not parse notification text, request a bank/source name, infer a currency or launch the React Native app. Missing Wallet input produces a localized setup error instead of prompting for a manually entered amount. It only imports payments delivered by Apple’s Wallet card-tap Transaction trigger; it does not read Wallet history, reconcile bank statements or promise coverage for online/physical-card/Watch payments not delivered by that trigger. Real Wallet delivery, supported card providers and locked-device behavior still require release-device verification.

## Android: selected bank/payment-app notifications

Select bank/payment-wallet applications, enable import, then grant Almost notification access in Android settings. The minimum version of the current app is Android 7 (API 24). No shortcut or manually entered message is required. The native notification listener processes only future individual notifications from selected packages. Existing notifications and group summaries are excluded. Android grants broad notification access; Almost’s own allowlist limits processing to selected apps. Hidden/redacted notification content, work-profile restrictions, some older low-RAM devices and system/vendor service restrictions can prevent capture.

The local parser automatically records unambiguous positive amounts with explicit supported currencies and saves ambiguous purchase messages for review. Pending/failed payments, refunds, incoming transfers, verification codes and promotions are excluded. Message formatting support does not guarantee every bank is recognized. Android’s native source filtering and Premium checks are preserved.

## Records, duplicate safety and Premium

Both paths write to the existing native local receipt database. Records remain in this journal and are not merged into budget calculations. Users can edit amount/currency, delete a receipt, pause import, review possible duplicates, and load every page. Existing saved records remain available after replacing the iOS notification path.

Wallet records retain the amount/currency and optional merchant label; no raw financial payload is logged. When a transaction date is provided, an event fingerprint derived from that timestamp, amount, currency and merchant suppresses identical repeated deliveries, including after receipt deletion. Without a transaction date, a reliable event identity is unavailable: equal purchases are preserved rather than silently dropped; nearby equal amounts are flagged for review. This is conservative duplicate protection, not bank transaction-ID reconciliation. Android retains its delivery-ID and notification-text safeguards.

Native capture checks the enabled flag and cached Premium deadline at execution. Expired or revoked access blocks capture while JavaScript is stopped. A resolved active entitlement without an expiration gets a bounded 24-hour offline lease; known expiration and lifetime access retain their existing rules. Pausing does not delete records. Reset disables capture and clears the ledger; the user controls any external Wallet automation.

## UX and verification

Locked state prioritizes Premium; enabled access on iOS 17+ prioritizes enabling import, then Apple Pay setup. The focused setup state has one ready-file installation action, disabled with an explanation if the compatible signed template is absent, with Close/back returning to the journal. Unsupported, loading and error states explain availability and retain retry/cancel paths. Editing still prioritizes Save, with Delete and Close secondary. Android source, permission and journal actions remain intact. All copy covers 12 dictionaries/13 selectable locales; themes use the existing light/dark/PRO palette and accessible button geometry.

Host tests execute the actual iOS SQLite Wallet capture code for amount/currency preservation, missing/invalid amounts, consent-to-import and Premium gates, duplicate handling, concurrent delivery, deletion markers and pagination. Parser fixtures continue to exercise native Android/iOS amount parsing used by notifications and corrections. Static source contracts verify the Wallet App Intent and the removal of the retired standalone shortcut. These tests do not establish Wallet trigger delivery or visual correctness.

### Device verification — 2026-10-06

The user authorized simulator and physical iPhone work. The physical iPhone Air runs iOS 27.2. Device Hub input works, the app builds and installs using Xcode 26.6 with explicit modules and precompiled bridging headers disabled. The complete Wallet automation was authored on that device and exported as a signed file. The obsolete draft with a fixed SAR quantity field was disabled. The signed file was imported again successfully and its Wallet automation was enabled on the phone.

A temporary diagnostic producer supplied an `IntentCurrencyAmount` of **13.45 USD**. A diagnostic native receiver returned **13.45 USD** after the same Currency Amount / Currency Code extraction used by the production workflow; no payment or ledger write occurred. Diagnostic intents were removed from the app source after this check. This establishes currency extraction and native parameter transfer, not real Wallet payment delivery.

The final app was installed without the diagnostic intents. Almost’s installation button opened the system Open In menu with the bundled file, and selecting Shortcuts opened the native Add Shortcut screen. Cancel returned without changing the enabled automation. Restarting Shortcuts refreshed its cached action title; the human-readable title and parameter labels were confirmed in the editor. The final Any Card / Any Category / Any Merchant automation remained enabled with Notify off.

The enabled empty journal and focused setup screen were visually reviewed on the physical iPhone in light, dark and PRO (Indigo) themes. Each has one emphasized setup/install action, distinct secondary controls, readable text and intact Close/back paths. The original light theme was restored. Other PRO accents, large text, RTL, populated/error states and older iOS installation have static/source coverage only, not physical visual verification.

Final localization, theme and functional-parity validators passed, as did typecheck, lint (existing warnings), eight expense tests and the iOS build. The full verify command passed the expense, attribution and native analytics checks but stopped on an existing critical backend dependency vulnerability reported by the security audit. No backend dependency was changed for this work.

Real payment delivery, card-provider coverage and locked-device execution remain unverified. The simulator’s iCloud export route was blocked by sign-in; the physical-device export resolved the template blocker.

## 2026-10-08: Apple Pay spending integration

Apple Pay receipts now project into the app’s ordinary spend history and category budgets, using the native receipt ID as the stable event identity. Editing or deleting a receipt updates both views. The receipt database remains authoritative; imported events are not copied into the manual-history store or replayed as reward-bearing UI decisions.

The setup screen reports connection after a payment has actually been received and keeps reconfiguration available as a secondary action. Merchant classification is local; manual category corrections are saved atomically and remembered for future payments from that merchant.

Because the current signed Wallet templates provide no stable transaction ID/date, duplicate detection for undated deliveries uses merchant, amount, currency and a five-second window. Coalesced signals can be recovered as separate payments from the editor. Existing exact/near-time legacy duplicates are migrated, retaining delivery markers and recoverable signals. Explicit event dates keep separate genuine transactions distinct.

The existing Wallet App Intent now conforms to LiveActivityIntent. It shows Almi, the localized recorded-expense message and the supplied amount/currency through the Widget extension, briefly displays the island confirmation, and ends the activity. Authorized notifications provide a fallback. A working Wallet automation need not be reinstalled.

See `qa/apple-pay-completion-2026-10-08/README.md` for verification and unverified physical-device/theme coverage.
