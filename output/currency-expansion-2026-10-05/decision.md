# Currency coverage decision — 2026-10-05

Source: Amplitude, Almost - Smart Savings (project 790896), Any Active Event, Unique Users, grouped by [Amplitude] Country, all users/platforms. Export window: 2026-07-07T00:00:00 to 2026-10-05T00:00:00 (UI: Last 90 days). Export does not state the account timezone; the latest boundary/day may be incomplete. No internal/test-user exclusions were applied. These are observed product-analytics users, not installs or all app users; analytics consent may limit coverage. GeoIP country may be affected by VPNs. A user can appear in multiple countries or the unknown bucket, so sums are not globally deduplicated users.

The primary markets already have supported currencies: United States 160, Russia 141, United Kingdom 102, Netherlands 92, Canada 69, Germany 60, Belarus 57, Saudi Arabia 44, Kazakhstan 44. There are 281 user-country memberships with unknown country; do not infer currencies for them.

Add currencies for every observed country with at least three users whose currency is missing. This is a practical coverage threshold, not a statistical significance claim. Existing ordering, currency choices and language defaults remain unchanged. Smaller markets can be added later if demand grows; do not infer a language preference or auto-change a saved currency from country.

| Currency | Country | Observed unique users |
| --- | --- | ---: |
| HKD | Hong Kong | 16 |
| INR | India | 13 |
| CHF | Switzerland | 10 |
| PHP | Philippines | 8 |
| SEK | Sweden | 8 |
| CZK | Czech Republic | 5 |
| KGS | Kyrgyzstan | 5 |
| MDL | Moldova | 5 |
| NGN | Nigeria | 5 |
| RON | Romania | 5 |
| UAH | Ukraine | 5 |
| ILS | Israel | 4 |
| PKR | Pakistan | 4 |
| TRY | Turkey | 4 |
| SCR | Seychelles | 3 |
| UZS | Uzbekistan | 3 |

Rates: existing ExchangeRate-API endpoint https://open.er-api.com/v6/latest/USD, snapshot Mon, 05 Oct 2026 00:02:31 +0000. Only new fallback rates are added; the app's normal cached/live refresh updates all supported codes. Country/currency mappings verified against https://www.exchangerate-api.com/docs/supported-currencies. New currencies have two minor-unit digits for manual input and confirmation, whole-unit compact display consistent with existing currencies, and explicit fine/reward steps. ISO codes in selectors are stable identifiers across all supported languages; number formatting follows the selected language.

Bank notification parsing recognizes the new ISO codes on both platforms. Bare ambiguous symbols remain excluded. No attribution/revenue SDK behavior is changed.

UX source review: onboarding retains currency selection, selected state, scrolling, and Continue/Back. Settings retains select-and-return and Back. Loading/error exchange-rate handling retains cached or fallback values. New options use the existing button/row hierarchy and surfaces. No simulator/device launch was authorized; rendering across light/dark/pro and accents is unverified. Performance scope: bounded 16-option expansion, no new network calls or startup workflow; no full performance audit or measured speed claim.

## Verification

- Added currency coverage tests: 4 passed, including real confirmation formatting across 13 locale variants, fallback formatting, conversion round trips and partial cached/live rate updates. Included in test:ui-session.
- check:functional-parity, check:localization, check:themes: passed.
- verify completed analytics contracts/native configuration, attribution, cloud notifications, UI sessions, engagement and shopping blocker tests, then stopped at check:security-audit with existing dependency advisories. No dependencies or lockfile changed for this task.
- typecheck: passed. Repository lint: blocked by Buffer no-undef in scripts/tests/bank-expenses.test.js, outside this task's edits, plus existing warnings.
- Remaining test:security, backend:test and check:release ran separately and passed.
- No device/simulator sessions or visual theme checks were run. New selector is a proposal only, awaiting user approval in design/currency-selector/PROPOSAL.md.
