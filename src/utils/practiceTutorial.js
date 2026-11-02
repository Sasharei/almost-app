// No decisions, amounts or entitlements are written by this state machine.
const PRACTICE_TUTORIAL_STORAGE_KEY = "almost.practiceTutorial.v1";
const INITIAL_PRACTICE_TUTORIAL = Object.freeze({ stage: "open", outcome: null, reset: 0, hasCards: true });
const PRACTICE_TUTORIAL_TARGETS = Object.freeze({
  open: "practice-open", card: "practice-card", amount: "practice-amount", action: "practice-action", result: "practice-result", pending: "practice-pending", empty: "practice-pending",
});
function practiceTutorialReducer(state, event) {
  switch (event.type) {
    case "RESET": return { ...INITIAL_PRACTICE_TUTORIAL, hasCards: state.hasCards, reset: state.reset + 1 };
    case "AVAILABILITY": return state.hasCards === event.hasCards ? state : { ...state, hasCards: event.hasCards };
    case "OPEN": return state.stage === "open" ? { ...state, stage: "card" } : state;
    case "EMPTY_ADD": return state.stage === "open" ? { ...state, stage: "empty" } : state;
    case "EMPTY_RETURN": return state.stage === "empty" ? { ...state, stage: "open" } : state;
    case "CARD": return state.stage === "card" ? { ...state, stage: "amount" } : state;
    case "AMOUNT": return state.stage === "amount" && event.valid ? { ...state, stage: "action" } : state;
    case "ACTION_STARTED": return state.stage === "action" ? { ...state, stage: "pending" } : state;
    case "ACTION_RESULT":
      if (state.stage !== "pending" || (event.reset != null && event.reset !== state.reset)) return state;
      return event.result?.committed
        ? { ...state, stage: "result", outcome: event.result.type }
        : { ...state, stage: "action" };
    default: return state;
  }
}
function resolvePracticeTutorialStep(stage) {
  return ({ open: 1, empty: 1, card: 2, amount: 3, action: 4, pending: 4, result: 4 })[stage] || 1;
}
// Rectangles tile the screen around the real target. The opening is not a proxy
// button: native touches and gestures go through to the mounted control.
function resolvePracticeSpotlight({ width, height, target, inset = 6 }) {
  if (!(width > 0 && height > 0)) return null;
  const full = { left: 0, top: 0, width, height };
  if (!target || ![target.x, target.y, target.width, target.height].every(Number.isFinite) || target.width <= 0 || target.height <= 0) {
    return { hole: null, blockers: [full] };
  }
  const left = Math.max(0, target.x - inset);
  const top = Math.max(0, target.y - inset);
  const right = Math.min(width, target.x + target.width + inset);
  const bottom = Math.min(height, target.y + target.height + inset);
  if (right <= left || bottom <= top) return { hole: null, blockers: [full] };
  return {
    hole: { left, top, width: right - left, height: bottom - top },
    blockers: [
      { left: 0, top: 0, width, height: top },
      { left: 0, top: bottom, width, height: height - bottom },
      { left: 0, top, width: left, height: bottom - top },
      { left: right, top, width: width - right, height: bottom - top },
    ].filter((rect) => rect.width > 0 && rect.height > 0),
  };
}
function resolvePracticeTargetLayout({ rect, top, bottom, bubbleHeight = 180, keyboardVisible = false }) {
  const room = Math.max(0, bottom - top);
  const oversized = rect.height > room - 140;
  const preferredTop = top + (oversized ? Math.min(130, room * 0.4) : Math.max(8, Math.min(72, room * 0.12)));
  const needsScroll = oversized ? Math.abs(rect.y - preferredTop) > 2 : rect.y < top || rect.y + rect.height > bottom || (!keyboardVisible && rect.y + rect.height + Math.min(bubbleHeight, 200) + 18 > bottom && rect.y - top < Math.min(bubbleHeight, 200) + 18);
  const visibleTop = oversized ? Math.max(rect.y, preferredTop) : rect.y;
  const visibleBottom = oversized ? Math.min(rect.y + rect.height, bottom) : rect.y + rect.height;
  const displayRect = { ...rect, y: visibleTop, height: Math.max(0, visibleBottom - visibleTop) };
  const ready = oversized ? displayRect.height >= 48 : rect.y >= top && rect.y + rect.height <= bottom;
  return { oversized, preferredTop, needsScroll, displayRect, ready };
}
// A different target registering elsewhere must not invalidate a live opening.
function isPracticeAnchorCurrent(anchor, id, session, node) {
  return Boolean(anchor?.ready && node?.current && anchor.id === id && anchor.session === session && anchor.node === node);
}
// Intrinsic copy height is independent of the constrained outer bubble height.
// Choose the larger side once from geometry, not from text size thresholds.
function resolvePracticeBubbleLayout({ top, bottom, hole, contentHeight, allowCover = false }) {
  const desired = Math.max(96, contentHeight);
  const above = hole ? Math.max(0, hole.top - top - 12) : 0;
  const below = hole ? Math.max(0, bottom - hole.top - hole.height - 12) : 0;
  const belowTarget = below >= above;
  const available = hole ? (belowTarget ? below : above) : bottom - top;
  const full = !hole || (allowCover && available < 160);
  const height = Math.min(desired, Math.max(56, full ? bottom - top : available));
  return { top: full ? top + Math.max(0, (bottom - top - height) / 2) : belowTarget ? hole.top + hole.height + 12 : hole.top - 12 - height, height };
}
function resolvePracticeSpotlightPath(width, height, hole) {
  "worklet";
  const base = `M0 0H${width}V${height}H0Z`;
  if (!hole) return base;
  const { left, top, width: w, height: h } = hole;
  const r = Math.min(12, w / 2, h / 2);
  const right = left + w, bottom = top + h;
  return `${base} M${left + r} ${top}H${right - r}Q${right} ${top} ${right} ${top + r}V${bottom - r}Q${right} ${bottom} ${right - r} ${bottom}H${left + r}Q${left} ${bottom} ${left} ${bottom - r}V${top + r}Q${left} ${top} ${left + r} ${top}Z`;
}
module.exports = { PRACTICE_TUTORIAL_STORAGE_KEY, INITIAL_PRACTICE_TUTORIAL, PRACTICE_TUTORIAL_TARGETS, practiceTutorialReducer, resolvePracticeTutorialStep, resolvePracticeSpotlight, resolvePracticeTargetLayout, isPracticeAnchorCurrent, resolvePracticeBubbleLayout, resolvePracticeSpotlightPath };
