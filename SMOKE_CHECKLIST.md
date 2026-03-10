# Smoke Checklist

- Launch app -> splash completes -> home renders without errors.
- Feed loads and scrolls; open/close history modal.
- Add a custom temptation below 150 -> appears in feed.
- At 150+ custom temptations: adding shows a warning but still opens the creator.
- At 200 custom temptations: adding shows a limit alert and does not create a new item.
- A temptation with a frequency shows a countdown that updates over time.
- Text and text inputs render with Inter fonts.
- Orientation stays portrait on phone/tablet builds.
- Android: verify UI at font scale 0.85 / 1.0 / 1.15 / 1.3.
- Android: verify UI at default and large display size.
- Open frequency reminder modal and confirm time wheel digits stay clipped inside the picker.
- Open usage streak/save overlays and confirm animated digits do not leak outside their cards.
- Open long quick modals (custom temptation, new goal, pending) and confirm content is scrollable.
- Verify at least one problematic session with native device screen recording and compare to Session Replay.
