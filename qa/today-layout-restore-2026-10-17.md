# Today alignment restoration — 2026-10-17

Restored two original App.js layout declarations: removed the FAB-sized right margin from today-make-decision and the FAB-sized right padding from the recent-history heading/View All row. Both match their original HEAD declarations again. No other spacing, actions, handlers, colors, text or accessibility properties changed in this task.

State/action and UX review: populated Today retains the full-width primary decision action; View All and recent events remain secondary history routes. Empty Today retains Add as primary; focus/card-selection states, loading/error behavior and tutorial guards are unchanged. Checked the seven UX rules and Apple Design requirements in source: hierarchy, targets, familiar navigation, grouping, progress, callbacks and press behavior are preserved. Existing unified-decision-entry-and-tools and decision-wheel-history-and-native-drag contracts cover the affected actions; no contracts weakened.

Checks: functional parity PASS before/after (258 contracts); localization PASS for all 12 dictionaries/native resources; themes PASS for light/dark/pro and six PRO accents; git diff --check PASS. Inspected git diff --name-only and git diff -U0. No user-facing string changes from this task. No full verify rerun for this two-declaration styling restoration.

Visual/runtime gap: no updated build installed or rendered. Physical iPhone Air still has the earlier Release 8.0.1 (134), which predates this layout correction; no visual PASS is claimed for light/dark/pro. No simulator/device operation was performed for this task.

Cleanup: dedicated /tmp/almost-layout-restore.IRROIv contained no generated artifacts and was removed. No servers, screenshots or raw logs retained. Other tasks’ files preserved.
