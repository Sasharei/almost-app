# Mandatory application UX rules

Version: 2026-09-30. Applies to all current and future mobile, web and desktop applications, including product design, implementation, refactoring, review, QA and application-related recommendations. Applies to lead agents and delegated agents.

Source: the user's reviewed recording of https://www.instagram.com/reel/Ddz0B_LCnR-/ and the user's instruction to apply these rules across all projects. These are practical design and review requirements, not guarantees of conversion or rigid numerical laws.

## Purpose

Reduce the effort needed to understand the current state, choose the next useful step and complete it. Preserve product capabilities, accessibility, user control, result completeness and correctness.

## Seven rules

1. **Fitts's law: make important actions easy to reach and activate.** Give the current primary action a discoverable location and an adequate interactive target, following the platform's accessibility requirements. Check the actual hit area and spacing, not just the painted icon. Avoid tiny targets, accidental neighboring taps and important controls stranded in inconvenient corners. Consider keyboard, pointer and touch input as appropriate.
2. **Hick's law: reduce simultaneous decisions.** Identify one primary action per screen, dialog or focused state. Distinguish primary, secondary and tertiary actions. Group choices, explain meaningful differences and reveal advanced options progressively through discoverable controls. Preserve useful choices and routes; do not remove functionality merely to simplify a screen.
3. **Zeigarnik effect: make unfinished work understandable.** For finite multi-step tasks, show completed and remaining steps, the current step and a clear continuation action. Preserve progress where appropriate. Make skip, cancel, back and resume available when supported. Do not fabricate unfinished tasks or pressure users into unnecessary completion.
4. **Jakob's law: respect familiar interaction patterns.** Use recognizable search, settings, navigation, forms, dropdowns, dialogs, payment and back/cancel patterns appropriate to the platform. Icons, labels, gestures and results should match expectations. Put originality in product value; justify unfamiliar controls with a concrete user benefit and verify their usability.
5. **Goal-gradient effect: show an honest path to completion.** Where a real finish exists, show actual progress and what remains, such as “one step left”. Keep progress indicators consistent with completed work. For indeterminate processing, communicate status without invented percentages. Do not add meaningless steps or misleading completion indicators.
6. **Von Restorff effect: give emphasis a clear purpose.** Visually distinguish the primary action using an accessible combination of contrast, placement, size and typography. Keep secondary controls lower in emphasis. Avoid competing bright buttons and decoration that dominates the useful next step. Do not rely on color alone; preserve readable contrast, focus and disabled states in all supported themes.
7. **Miller's law: reduce memory burden through grouping.** Group navigation, settings and information into meaningful sections; use clear headings, progressive disclosure and visible context. Let users process one decision at a time without remembering previous screens. Treat “7 ± 2” as explanatory history, not a hard limit on controls or product features.

## State and action contract

Before implementing UI or interaction changes, identify the user goal, primary action, secondary actions and prerequisites for each affected state. Cover initial/empty, loading, populated, error/retry, success, disabled and permission states where applicable. Explain necessary unavailable controls accessibly; show editing, sharing and other contextual actions when their prerequisites exist.

Inventory existing actions, destinations, handlers, gestures, validation, persistence, purchase/restore/manage routes and accessibility actions. Keep them functional and reachable unless the user's explicit request changes them. Progressive disclosure must preserve discoverability. Never reduce data coverage, matching accuracy or result completeness to make a design simpler.

## Required completion review

For every task, determine whether application UX or interaction behavior is affected. For affected work, review all seven rules and the state/action contract before completion. Fix violations introduced by the task and existing violations within the requested scope. Report broader issues separately without silently redesigning unrelated flows.

Use the following checklist for each affected screen or flow. A concise review may group screens with identical behavior, but must cover distinct states:

- [ ] The user goal and one primary action are clear in each applicable state.
- [ ] Primary targets are discoverable, reachable and easy to activate with the supported input methods.
- [ ] Secondary actions have distinct emphasis and advanced choices remain discoverable.
- [ ] Finite tasks show honest completed/remaining progress and a clear next step.
- [ ] Controls, navigation, gestures and back/cancel behavior follow familiar platform patterns.
- [ ] Visual hierarchy, readable contrast, focus and disabled states work across supported themes.
- [ ] Information and choices are grouped; users do not need to memorize hidden context.
- [ ] Existing useful actions, callbacks, validation, persistence and result quality are preserved.
- [ ] Happy paths and relevant back/cancel/retry/error paths are checked using permitted methods.
- [ ] All changed text and accessibility labels are localized in every supported language; placeholders/plurals are checked.
- [ ] Supported screen sizes, long translations, large text and RTL where supported are reviewed for clipping, overlap and usable targets.

Run the project's functional parity, localization, theme and normal verification gates where applicable. If a validator does not exist, use available checks and source review; do not invent a passing result. Review actual rendering and behavior when permitted. Source review, static tests and builds alone do not establish visual or runtime PASS. Respect all project restrictions on simulators, devices, uploads and publication; this policy grants no additional execution permissions.

Report UX review results and material verification gaps briefly in the final response. Distinguish observed behavior, visual evidence, static findings and unverified assumptions. If no application UI, interaction or user-facing text changed, report UX/localization as unaffected when relevant; do not launch applications solely to check a documentation edit.

## Agent handoff

When work is delegated, include this policy or a readable path to it, the affected states, the intended primary action, preserved functionality and project verification restrictions. Require the receiving agent to apply the same checklist and return evidence plus verification gaps. The lead agent reviews the combined result before completion. This requirement does not independently authorize delegation or messages to other chats.
