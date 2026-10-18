const { getHistoryEntryTemptationKeys } = require("./temptationLifetimeStats");
const {
  TEMPTATION_SERIES_STATUS,
  getLocalDayKey,
  getTemptationSeriesProgress,
  normalizeTemptationSeriesState,
} = require("../engagement/temptationSeries");

const isDecision = (entry) => entry?.kind === "refuse_spend" || entry?.kind === "spend";

const getRemainingCardDecisions = (entry, history, extraKeys) => {
  const keys = new Set(getHistoryEntryTemptationKeys(entry, extraKeys));
  return history.filter((candidate) =>
    candidate?.id !== entry.id && isDecision(candidate) &&
    getHistoryEntryTemptationKeys(candidate).some((key) => keys.has(key))
  ).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
};

// This is an explicit undo, rather than reconciliation against a bounded history
// window: absent old history must never erase unrelated decisions or skip/pause.
const rollbackHistoryDecisionSeries = (value, entry, history = [], extraKeys = []) => {
  const state = normalizeTemptationSeriesState(value);
  if (!isDecision(entry) || getLocalDayKey(entry.timestamp) !== state.dayKey) return state;
  const remaining = getRemainingCardDecisions(entry, history, extraKeys)
    .filter((candidate) => getLocalDayKey(candidate.timestamp) === state.dayKey);
  const resolutions = { ...state.resolutions };
  let changed = false;
  getHistoryEntryTemptationKeys(entry, extraKeys).forEach((key) => {
    const previous = resolutions[key];
    if (!previous) return;
    const nonDecisionActions = new Set(["skip", "pause", "archive"]);
    const retained = remaining.map((candidate) => ({
      action: candidate.kind === "refuse_spend" ? "save" : "spend",
      timestamp: Number(candidate.timestamp),
    }));
    // Non-history actions still resolve the card independently of a deleted save.
    if (nonDecisionActions.has(previous.firstAction)) {
      retained.push({ action: previous.firstAction, timestamp: previous.firstAt });
    }
    if (nonDecisionActions.has(previous.lastAction) &&
        (previous.lastAt !== previous.firstAt || previous.lastAction !== previous.firstAction)) {
      retained.push({ action: previous.lastAction, timestamp: previous.lastAt });
    }
    retained.sort((a, b) => a.timestamp - b.timestamp);
    if (!retained.length) delete resolutions[key];
    else resolutions[key] = {
      firstAction: retained[0].action,
      firstAt: retained[0].timestamp,
      lastAction: retained[retained.length - 1].action,
      lastAt: retained[retained.length - 1].timestamp,
      actionCount: retained.length,
    };
    changed = true;
  });
  if (!changed) return state;
  const next = { ...state, resolutions };
  if (getTemptationSeriesProgress(next).remaining > 0) {
    // Previously paid coins remain accounted for; reopening cannot pay them twice.
    if (state.status === TEMPTATION_SERIES_STATUS.CLAIMED) {
      next.pendingCoins += state.claimedCoins;
      next.creditedCoins += state.claimedCoins;
      next.claimedCoins = 0;
    }
    next.status = TEMPTATION_SERIES_STATUS.ACTIVE;
    next.completedAt = null;
    next.claimedAt = null;
  }
  return next;
};

const rollbackHistoryDecisionInteractions = (stats, entry, history = [], extraKeys = []) => {
  if (!isDecision(entry)) return stats;
  const remaining = getRemainingCardDecisions(entry, history, extraKeys);
  const next = { ...stats };
  getHistoryEntryTemptationKeys(entry, extraKeys).forEach((key) => {
    const current = stats?.[key];
    if (!current) return;
    const latest = remaining[remaining.length - 1];
    const latestSave = remaining.filter((candidate) => candidate.kind === "refuse_spend").pop();
    const latestSpend = remaining.filter((candidate) => candidate.kind === "spend").pop();
    next[key] = {
      ...current,
      lastInteractionAt: latest?.timestamp || null,
      previousInteractionAt: remaining[remaining.length - 2]?.timestamp || null,
      secondPreviousInteractionAt: remaining[remaining.length - 3]?.timestamp || null,
      lastSavedAt: latestSave?.timestamp || null,
      lastSavedAmountUSD: Number(latestSave?.meta?.amountUSD) || 0,
      lastSpentAt: latestSpend?.timestamp || null,
      lastSpentAmountUSD: Number(latestSpend?.meta?.amountUSD) || 0,
    };
  });
  return next;
};

module.exports = { rollbackHistoryDecisionSeries, rollbackHistoryDecisionInteractions };
