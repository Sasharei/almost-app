# Legal link migration — 2026-10-08

App Store Connect: Almost Savings, app 6756276744, version 8.0.0 (Prepare for Submission).
Google Play: Almost - Stop Impulse Buying, package com.sasarei.almostclean, app 4975905858674100351.

## Applied changes

- Application source: replaced Notion Privacy/Terms destinations; removed obsolete Notion URL fallback entries. iOS Terms opens https://www.apple.com/legal/internet-services/itunes/dev/stdeula/; Android Terms opens the landing terms page. Existing callbacks and visible copy remain intact.
- Privacy base: https://almost-apps.com/legal/almost-shop-less-save-more/privacy/. Explicit `lang` preferences preserve the selected language despite country redirects.
- Privacy languages: English, Arabic, Simplified Chinese, French, German, Italian, Japanese, Korean, Portuguese, Russian, Spanish. Traditional Chinese uses English because the site has no Traditional Chinese privacy translation.
- Landing Terms is available in English and Russian; other Android languages use English.
- App Store Connect: saved localized Privacy URL, description Privacy link, Apple EULA link and Support URL for all 14 locales (en-US, ar, zh-Hans, zh-Hant, fr, de, it, ja, ko, pt-BR, pt-PT, ru, es-MX, es-ES). Support is https://almost-apps.com/#support, Russian https://almost-apps.com/ru/#support. These edits take effect with the next app version; no app version was submitted or released.
- Google Play: replaced the previous Notion Privacy URL with https://almost-apps.com/legal/almost-shop-less-save-more/privacy/?lang=en. Submitted this single URL change for review. Readback shows Changes in review, with quick checks running. All 14 localized draft descriptions were inspected and contain no Notion URLs; no description edits were necessary.
- Updated extracted historical 7.2.1 metadata/review files containing old Notion links. Archived ZIP files were not rewritten.

## Evidence and checks

- Store changes were read back through authenticated consoles; Apple English Privacy URL was rechecked after reloading the page.
- All 13 distinct landing legal URLs return HTTP 200 with the expected HTML language.
- No Notion references remain in application/runtime source searched across App.js, src, scripts, backend, ios, android and app/package configuration (excluding generated build/dependency folders).
- PASS: localization, themes, functional parity, analytics contract, native analytics configuration, TypeScript. Targeted ESLint: zero errors (existing warnings remain).
- `npm run verify` stops at security audit: one critical backend dependency vulnerability. Dependencies were not changed by this migration.
- UX action hierarchy and callback wiring are preserved. No new visible strings. No simulator/device session or native visual theme review was performed; no launch authorization was provided.
- The landing's prepared October 8 legal text revision is not yet published. The new URLs currently serve the already published legal pages; this task did not deploy the separate landing project.

## Restore constraints

Before these edits, application and store Privacy/Support links pointed to Notion. Apple Terms already used the standard Apple EULA. Source edits are reversible; pending Apple metadata can be edited before submission. Google Play rollback is subject to its review state.
