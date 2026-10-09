# Seven-law application review

Scope: the current Almost 7.2.1 (127) working tree on iOS and Android. Preserve the existing redesign and all user data, handlers, navigation destinations, gestures, validation, purchases/restore/manage, attribution and notifications. Baseline functional parity: 166 contracts, 1635 required fragments, 40 reachability patterns, PASS before editing.

## State/action inventory before implementation

| Surface family | Primary action by state | Secondary actions retained |
| --- | --- | --- |
| Onboarding language/privacy/persona/goal | Select and continue; submit a valid goal; finish onboarding | Back, skip where supported, decline optional analytics, languages/currencies, custom goal, legal links |
| Today / decision cards | Empty: add a temptation. Populated: open the next decision. Focus: save/refuse the selected temptation; amount sheet: confirm the selected save/spend action | Add, all cards, upcoming schedule, edit/archive/delete, spend, pause, manual amount/frequency, goals/categories, utility routes, series/chests |
| Pause | Empty: add. Populated: open a paused item. Detail: decline. Extend sheet: confirm chosen duration | Spend, extend, edit, delete, list back, cancel |
| Progress / goals | Empty: create a goal. Populated: open active goal. Goal form: save valid goal. Completed: claim/acknowledge result | All goals, edit/delete/restart, budget, rewards, insights, plans, subscriptions, free days |
| Budget | Locked: open Premium. Savings: confirm external transfer. Debt without plan: set debt plan. Debt with plan: confirm payment. Proof without image: attach proof. With valid proof: verify/confirm | Destination tabs, debt editing, detail records, camera/library, amount entry, cancel/back, retry validation |
| Profile | Incomplete: complete relevant setup. Overview: open profile/settings/data destination. Editing: save changes. Settings: choose setting. Choice list: select value | Cancel, avatar, reports/history, theme accents, currency/language, sound, spending mode, tycoon, category management, help, bug report, reset |
| Reports / insights / history | Locked: open Premium. Populated: read/select relevant report/action. Empty: return to Today or create goal where supported. Error: retry where supported | Period tabs, details, related tools, history filters/deletion, back |
| Almi / rewards / chests | Ready: claim or perform selected care action. Locked: existing unlock route. Result: continue | Food/play/clean tabs, skins, daily summary, autosave settings, Premium, close |
| Premium and feature stories | Available: purchase selected plan. Loading: await result with purchase disabled. Error: recover/retry. Story: continue or open Premium | All plans/trial control, restore, manage, terms/privacy, close/back, offer-wheel routes |
| Creation/edit sheets and confirmations | Submit valid input or confirm the requested operation | Cancel/back/backdrop as supported, field and source choices, validation feedback |
| Tutorials, help, notification/permission and result overlays | Continue/acknowledge the current step, permit the requested capability or take the existing recovery action | Dismiss/back, decline where supported, help links and retry |
| Widgets and navigation | Widget: record a saving. Navigation: choose destination (navigation selection is not a competing content CTA) | Spending, app entry, all five destinations and badges |

Empty/loading/error/success, keyboard, disabled and permission states are part of each applicable family. Loading must not fabricate progress. Existing finite onboarding/goal/series indicators remain tied to real state. Existing functional contracts already cover these surface families; supplement them for newly shared touch geometry and changed modal structure without weakening existing assertions.

## Initial source findings

The previous redesign already establishes a primary action on main screens and grouped secondary routes. The remaining repeated issues include undersized explicit close/more/add controls, text-only links without a full touch target, clipped one-line content in translated rows, fixed-height secondary controls and a non-scrollable pause extension sheet without backdrop dismissal. Inspect native rendering before assigning visual outcomes.

## Evidence rules

Use dedicated Almost Native Surface Review iOS simulator and Almost_Redesign_Review Android emulator. Do not interact with Almost Crossed's active simulator. Use synthetic local state. No live purchase or production mutation. Record static, functional and visual coverage separately. Check light/dark/pro plus all six PRO accents, long locales, RTL and large text as permitted; missing variants remain explicitly unverified.

## Restored decision controls and Almost Pay (requested update)

Before editing: Focus state primary is record the selected saving; secondary actions are spend, pause, edit card and back. Amount adjustment is an input, with a draggable adjustable slider plus exact numeric entry. Invalid amounts disable monetary actions and show the existing localized amount error. Editing opens the existing full editor with name, category, amount, description, emoji, goal and schedule; save/cancel/delete callbacks remain intact. Confirmation has one primary action: first press prepares, second press confirms. Processing prevents duplicates; cancellation before completion changes no balance/history. Success describes confirmation of the choice, not a bank payment. Spend retains its existing budget impact preview. Almost Pay is explicitly a simulation; system side-button interception is unavailable to ordinary app UI. Native haptic APIs are used on both platforms; physical sensation needs real hardware.

## Local biometric confirmation update

For an enrolled device, the primary action starts local OS authentication once. Authenticating and processing disable repeated confirmation. Success continues the original save/spend action exactly once. Cancel/failure returns to the same confirmation without changing the ledger; failure offers retry. Explicit secondary “Confirm without biometrics” selects the existing two-activation screen fallback. Without enrollment, explain the prerequisite and keep that fallback available. Face ID/Touch ID use the iOS system prompt; Android uses its enrolled face/fingerprint modality selected by the OS. Biometrics remain local and this flow invokes no payment provider.
