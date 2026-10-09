# Redesign follow-up — October 1, 2026

Scope: Today decisions, shared header utilities, safe-area fade, Profile overview and identity editing, Budget details, quick-spend orb. Continue the existing native design; preserve handlers, persistence, financial validation, attribution and all navigation destinations. Pre-edit functional parity: 178 contracts passed.

## State/action inventory

| Surface/state | Primary | Secondary/recovery |
| --- | --- | --- |
| Today empty | Add temptation | All Temptations, help, bug report |
| Today populated/due | Decide on first due card | Remaining due/later/upcoming cards, All Temptations, add, help, bug report |
| Today no due decisions | All Temptations | Add, help, bug report |
| Focused decision | Save money | Spent, later, edit card, back; invalid amount disables transaction actions |
| Profile | Reports | Identity edit, companion care, history, settings, language/currency/theme shortcuts |
| Profile identity editing | Save | Cancel, photo selection, name/motto fields; keyboard-aware scrolling |
| Settings | Select/change current setting | Other grouped settings, detailed controls, back, support/legal/Premium |
| Budget savings/debt | Confirm transfer or set debt plan | Pane selection, debt settings, full details, back |
| Budget locked | Premium | Record navigation, help, bug report |
| Bug report | Submit prepared report | Cancel/close, editable description/steps; no report is sent during QA |
| Help | Read current-screen guidance | Close and return to previous state |
| Quick spend | Submit valid amount | Cancel, existing long-press actions and validation |

## Source review against seven rules

Fitts: header utilities are 48 points, plus 52; 6-point gaps separate actions. Hick/Von Restorff: plus has greater size than utilities; focused decisions and identity forms keep one dominant action. Zeigarnik/goal-gradient: existing real progression is retained; no artificial progress added. Jakob: settings remain grouped, identity editing uses Save/Cancel, back and existing platform image flow. Miller: common language/currency/theme settings are direct categories, detailed settings stay reachable. No financial capabilities or catalog coverage removed: recommendations remain in All Temptations.

Unscheduled untouched catalog entries are excluded from Today. User-created/previously used unscheduled entries remain eligible with zero to three deliberate schedules; at four schedules they move out of Today. Dedicated regression tests cover this boundary and item/stats schedule sources.

All new display labels reuse existing localized keys in all 11 supported languages. All surfaces consume current theme roles. Native iOS Liquid Glass uses expo-glass-effect; Android uses a circular themed frosted fallback. Reduce Transparency keeps a solid fallback.

## Verification evidence

Runtime and final visual results are recorded after execution below. Static checks alone are not a visual pass. This review does not certify unexecuted screen/state combinations or release attribution/purchases.

### Completed checks

- Functional parity: 181 contracts, 1720 required fragments, 41 reachability patterns passed. Existing contracts were not weakened.
- Localization: all 11 current languages and native Face ID permission checks passed. Added UI labels reuse existing keys; no translations were added as hardcoded text.
- Themes: light/dark/pro plus six configured PRO accents passed the static validator.
- TypeScript passed. ESLint: zero errors, 397 existing warnings; no new warnings remain.
- Four new Today boundary tests passed. Existing attribution, UI-session and engagement suites passed, including the new tests in the normal engagement script.
- Analytics contract and native analytics configuration passed.
- Full `npm run verify` was run and stopped at the existing dependency security gate (nine unmitigated advisory IDs). No audit exclusions or dependency changes were introduced.
- Gates after the security stop were also run separately: install-secret tests, backend tests, runtime parity and artifact size checks passed. Size refers to the existing debug artifact, not a new native release build.

### Executed native coverage

Existing local debug development clients, refreshed from this workspace:

- iOS 26.5, `Almost Native Surface Review`, 402 × 874 points: Today no-checks state, localized speech bubble, header help and bug-report open/cancel, Profile editor open/cancel with keyboard, and navigation through Today/Progress/Pause/Budget/Profile. Theme selection Light → Dark executed; the five tabs were captured in both appearances. Snapshot names describe intended destinations: one `profile-dark` capture remained in nested Settings and is not evidence of the Profile overview.
- Android 17, `Almost_Redesign_Review`, emulator-5554: Today populated state, three separate circular header actions, speech bubble, help open/close, bug report open/cancel, new-temptation form open/cancel, Profile avatar/editor entry. A test initially used `First name` instead of the actual `First name (optional)` label; this was corrected in the flow. The later light-theme matrix remained blocked by Metro reload/startup delays. Android screenshots cover the dark theme, not a complete theme matrix.

Native screenshots were opened for visual inspection. Header circles have separate bounds; iOS/Android share intended 48-point secondary targets and a 52-point Today plus. Screenshots captured during blue Refreshing banners or with LogBox warnings are partial evidence, not visual PASS. The reduced-gradient transition and compact Profile follow-up need a clean final confirmation wherever Metro delivered an older intermediate bundle.

### Remaining gaps and release verdict

This is **not a complete visual or release certification**. PRO appearance and all six accents, unlocked Premium Budget details, financial proof/transfer flows, purchases/restores, RTL/long-language rendering, accessibility text sizes, compact/older OS devices and tablets were not executed in this session. Premium is unavailable on the test profiles; Android billing reports `BILLING_UNAVAILABLE`. No purchase, support message, upload or publication was performed.

Source changes to Budget details preserve its full existing chart, transfer/proof, debt-plan and back behavior while updating spacing/title/control hierarchy. Its unlocked visual result remains unverified. Core financial validation, RevenueCat/AppsFlyer ownership and consent invariants were untouched.

Release verdict: **NO-GO for declaring the entire redesign finished** until the Premium/PRO visual matrix, final Android refresh and security gate are resolved. The requested changes are saved for review; unexecuted coverage is explicitly outstanding.

Raw Maestro logs, hierarchy and all intermediate/failure snapshots are retained under the ignored `artifacts/redesign-followup/` directory. Reusable flows are in `qa/redesign-followup/`. Selected native observations remain in `design/redesign-followup/review/`.

Final iOS confirmation: `review/ios-profile-final.png` was inspected at original resolution after the latest refresh. It confirms the compact care row, removal of “Almi is here”, circular clipped avatar and language/currency/theme categories before the report area. Its editor-open/cancel flow passed. `review/ios-settled-budget.png` confirms the settled dark locked Budget screen and softened top fade with no Refreshing/LogBox overlay. Final Android screenshot stayed blank during the Metro reload; this is an outstanding runtime gap, not a visual pass.
