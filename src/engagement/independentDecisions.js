// Local, bounded receipts only. Never backfill from lifetime/legacy analytics:
// older installs cannot distinguish guided decisions from independent ones.
const EMPTY = { version: 1, count: 0, receipts: [], pending: false };
const normalizeIndependentDecisions = (raw) => {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (value?.version !== 1 || !Array.isArray(value.receipts)) return { ...EMPTY, receipts: [] };
    const receipts = [...new Set(value.receipts.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 100))].slice(-32);
    const count = Math.min(2, receipts.length, Math.max(0, Math.floor(Number(value.count) || 0)));
    return { version: 1, count, receipts, pending: count === 2 && value.pending === true };
  } catch { return { ...EMPTY, receipts: [] }; }
};
const commitIndependentDecision = (state, { id, action, committed, independent } = {}) => {
  if (!committed || !independent || !id || !["save", "spend", "pause"].includes(action) || state.receipts.includes(id)) return state;
  const count = Math.min(2, state.count + 1);
  return { version: 1, count, receipts: [...state.receipts, id].slice(-32), pending: count === 2 };
};
const consumeIndependentDecisionOffer = (state) => ({ ...state, pending: false });
const isCoachActuallyPresented = ({ targetId, presentedId, appState, x, y, width, height, screenWidth, screenHeight, viewportBottom = screenHeight }) =>
  Boolean(targetId && targetId === presentedId && appState === "active" && width > 0 && height > 0 &&
    x >= 0 && y >= 0 && x + width <= screenWidth + 1 && y + height <= Math.min(screenHeight, viewportBottom ?? screenHeight));
module.exports = { normalizeIndependentDecisions, commitIndependentDecision, consumeIndependentDecisionOffer, isCoachActuallyPresented };
