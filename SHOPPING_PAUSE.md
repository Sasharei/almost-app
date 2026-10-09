# Shopping Pause — iPhone

## Behavior

Almost Savings offers a once-only Shopping Pause modal to existing users after updating, and to new users after the first confirmed purchase or saving. The initial existing/new cohort is persisted so restarting a new installation does not bypass the first-decision requirement. The modal waits for onboarding, tutorials, action feedback and other modal handoffs. Closing or declining it consumes the invitation; settings remain available. The compact Today status card sits directly below Today Series and remains available after dismissal and activation. Active sessions show actual savings, target, progress and remaining amount; Today exposes earned unlock and permission/selection recovery, while management and stopping are reached through Profile → Settings. The illustrated invitation explains app selection, a savings target, and a 30-minute visit; its primary setup action stays in a fixed footer while the explanation scrolls.

On iOS 16+, the user grants individual Screen Time permission, selects shopping apps or groups with Apple's private picker, and enters a savings target. The picker uses `includeEntireCategory: true` to include applications inside selected groups. Category tokens may coexist with app tokens and no longer disable Continue. Only resulting application tokens are persisted and shielded; category policies and websites are not blocked. A category selection that yields no apps cannot continue. This preserves individual-app visits rather than opening an entire group.

Only new, confirmed manual `refuse_spend` entries after activation count. Automatic savings, older entries, duplicate IDs and invalid amounts do not count. Editing or deleting an entry recalculates progress. These are user-recorded savings, not verified bank deposits. The target currency and conversion are fixed for the cycle.

Reaching the target enables selection of one blocked app for a 30-minute visit. Confirming the visit consumes the current entries and begins the next cycle. Other selected apps remain shielded. A DeviceActivity extension restores the selected app's shield at the deadline; foreground sync also reconciles expiry. JavaScript timers refresh the display only. Stopping removes this feature's restrictions without changing savings history. Resetting app data first stops the native session. After detected permission revocation, reauthorization requires fresh selection while preserving the goal.

## UX state/action review

| State | Primary action | Secondary actions |
| --- | --- | --- |
| Automatic invitation | Choose apps / enter setup | Later, close |
| Today inactive status card | Open setup | Later when invitation is pending |
| Today active status card | Earned unlock or relevant permission/selection recovery | Management through Profile → Settings |
| Permission missing | Grant Screen Time permission | Settings, close, stop if active |
| Select apps | Native picker, continue with individual apps | Cancel, close |
| Enter target | Start pause after valid amount | Change selection, close |
| Saving toward target | Continue saving / close panel | Stop with confirmation |
| Target reached | Choose one store, then confirm visit | Cancel, stop |
| Visit active | Continue / close panel | Stop |
| Authorization recovery | Select apps again | Stop, close |
| Loading | Wait with status indicator | Native picker cancellation where applicable |
| Error | Retry or correct current input | Close, stop when active |
| Unsupported OS/module | Read availability explanation | Close |

Source review covers Fitts (48-point RN actions), Hick and Von Restorff (one emphasized action), Zeigarnik (three setup stages), Jakob (native picker, modal and confirmation), goal-gradient (actual eligible totals and remaining amount), and Miller (separate permission, selection, target and progress states). Existing Today/profile actions remain wired. Browser rendering of the actual React Native components is documented in `qa/shopping-pause-design/README.md`; it does not establish native device behavior.

UI copy covers all 11 app languages, including Arabic dialect fallback. Theme tokens cover light, dark and PRO. Native shields use system dynamic colors; app language is passed to native picker/shield copy. Browser previews cover English, Russian, Arabic RTL, light, dark and all six PRO accents. Native Dynamic Type, iPhone safe areas and native Screen Time behavior still require device verification.

## Native setup and release prerequisites

- App: `com.sasarei.almostclean`.
- Extensions: `.ShoppingBlockerMonitor`, `.ShoppingBlockerShield`, `.ShoppingBlockerAction` appended to the app bundle ID.
- All four targets require Family Controls distribution entitlement approval/provisioning and App Group `group.com.sasarei.almostclean`. Source entitlement configuration does not establish Apple approval.
- Keep the three extensions embedded in the signed app. Do not recreate native directories without preserving the manual module/extension configuration.
- Tokens and state stay in the App Group on device. Only ID, timestamp and normalized amount enter the native ledger; shopping content is not sent to ad networks. Attribution and RevenueCat postback ownership are unchanged.

Before rollout, test a signed iPhone release build: permission grant/denial/revocation, picker cancel and invalid category-only selection, target validation in localized numerals, history edits/deletion, duplicate entries, one-app unlock, expiry while app is terminated/device is locked, reboot/timezone changes, subsequent cycles, stop/reset, and app upgrade. Also perform the project's required fresh-install and purchase attribution checks on both platforms if release changes their infrastructure. The user explicitly authorized simulator checks. Isolated simulator boot attempts stalled; no working native app session was available for visual verification.

## Verification

- Shopping ledger tests: 4 passed, including compilation/execution of the actual Foundation Swift ledger on macOS.
- Localization and theme validators: passed.
- Analytics and native analytics contracts: passed.
- RN typecheck and lint: passed (existing lint warnings remain).
- Native bridge syntax and Swift module typecheck: passed.
- Three extension targets: non-launching unsigned SDK builds passed.
- Functional parity: latest verification passed 210 contracts, 1,888 behavior fragments and 41 reachability patterns. An intermediate failure in the concurrently edited premium paywall was resolved in that ongoing work; this task did not modify its layout.
- Full verify is blocked by existing unmitigated npm security advisories. Subsequent security tests, backend tests and release static checks passed in targeted runs.
- A prior x86_64 simulator workspace build succeeded with a temporary local RevenueCat initializer workaround; the dependency was restored afterward. ARM simulator linking remains blocked by an existing MLImage device binary. Neither a build nor browser preview proves native Screen Time behavior.

## Naming / store

App Store Connect draft 8.0.0 has `Almost Savings` and localized `Shop less, save more` saved and read back in all 13 existing store localizations. Evidence and before/after manifest are in `store/almost-savings-8.0.0/`. Nothing was submitted or uploaded. Public store text changes after the release workflow. Installed home-screen naming changes with the next app build; iOS controls truncation according to layout and text size.
