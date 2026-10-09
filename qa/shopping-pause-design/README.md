# Shopping Pause design verification — 2026-10-03

Actual `ShoppingBlockerPanel`, `ShoppingPauseIntroduction` and `ShoppingBlockerEntry` rendered through React Native Web using a temporary harness outside the repository. The controller is mocked. These are browser previews, not simulator or iPhone screenshots.

## Observed

- Illustrated offer: one primary Choose apps action, a fixed footer, lower-emphasis Later and Close actions, and three grouped explanations.
- Choose apps advances to the Screen Time permission step in the mocked controller. Later and Close dismiss the offer; the inactive card remains available.
- Active card renders actual 40/100 sample progress and retains its management entry.
- Light/English, dark/Russian, PRO/Arabic RTL and all six PRO accents reviewed for legibility, surfaces, icon visibility, clipping, action hierarchy and alignment.
- At 390px width, no horizontal overflow; buttons are at least 48px tall (see preview-checks.json). At shorter heights, explanatory rows scroll above the fixed actions.
- `offer-preview.png` is the 390×844 offer preview. `intro-*` images are centered 390px modals in a 1280×720 viewport. Other theme images capture the inactive card while the modal animation was starting.
- Today placement is checked in source and functional contracts: series card immediately precedes Shopping Pause. The full native Today screen was not visually verified.

## Checks

Localization (all 11 languages), themes, functional parity (210 contracts), component lint, typecheck and four shopping ledger tests passed. Full npm verify stops on 11 existing npm audit advisories.

## Gaps

Native simulator boot did not yield a working app session. iPhone safe areas, Dynamic Type, real permission/picker interactions, shields and unlock expiry remain unverified on device. Browser callback checks do not prove native Screen Time behavior. Existing activation, cancel, retry, stop and unlock handlers were preserved and statically checked.
