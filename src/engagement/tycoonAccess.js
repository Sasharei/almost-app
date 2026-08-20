const TYCOON_SETTINGS_VERSION = 2;

const getLocalDayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDayKey = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return getLocalDayKey(date) === trimmed ? trimmed : "";
};

const getTycoonAutosaveEventDayKey = (entry) => {
  if (!entry || Object(entry) !== entry) return "";
  const storedDayKey = normalizeDayKey(entry.dayKey);
  if (storedDayKey) return storedDayKey;
  const timestamp =
    Number(entry.timerWindowEnd) ||
    Number(entry.confirmedAt) ||
    Number(entry.skippedAt) ||
    Number(entry.createdAt) ||
    0;
  return timestamp > 0 ? getLocalDayKey(timestamp) : "";
};

const isTycoonAutosaveTimestampInDay = (timestamp, dayKey) =>
  getLocalDayKey(timestamp) === normalizeDayKey(dayKey);

const normalizeTycoonSettings = (value = null) => {
  const source = value && typeof value === "object" ? value : {};
  const storedVersion = Math.max(0, Math.floor(Number(source.version) || 0));
  return {
    version: TYCOON_SETTINGS_VERSION,
    enabled:
      storedVersion === TYCOON_SETTINGS_VERSION && source.enabled === true,
  };
};

const isTycoonAutosaveEnabled = ({ isPremium = false, settings = null } = {}) =>
  isPremium === true && normalizeTycoonSettings(settings).enabled === true;

const shouldResetLegacyTycoonPendingEvents = (value = null) => {
  const source = value && typeof value === "object" ? value : {};
  return Math.max(0, Math.floor(Number(source.version) || 0)) !== TYCOON_SETTINGS_VERSION;
};

const resetLegacyTycoonPendingEvents = (entries = [], timestamp = Date.now()) => {
  const skippedAt = Math.max(0, Number(timestamp) || Date.now());
  return (Array.isArray(entries) ? entries : []).map((entry) =>
    entry?.status === "pending"
      ? {
          ...entry,
          status: "skipped",
          skippedAt,
          skipReason: "premium_gate_migration",
          rewardClaimed: true,
        }
      : entry
  );
};

const retireLegacyTycoonRewards = (entries = [], timestamp = Date.now()) => {
  const retiredAt = Math.max(0, Number(timestamp) || Date.now());
  let changed = false;
  const nextEntries = (Array.isArray(entries) ? entries : []).map((entry) => {
    if (entry?.status !== "saved" || entry.rewardClaimed === true) return entry;
    changed = true;
    return {
      ...entry,
      rewardClaimed: true,
      rewardRetiredAt: retiredAt,
      rewardRoute: "temptation_series",
    };
  });
  return changed ? nextEntries : entries;
};

const skipPendingTycoonAutosaveForCards = (
  entries = [],
  cardIds = [],
  timestamp = Date.now()
) => {
  const normalizeCardId = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value !== "string") return "";
    return value.trim();
  };
  const targetCardIds = new Set(
    (Array.isArray(cardIds) ? cardIds : [cardIds])
      .map(normalizeCardId)
      .filter(Boolean)
  );
  if (!targetCardIds.size) return entries;

  const skippedAt = Math.max(0, Number(timestamp) || Date.now());
  let changed = false;
  const nextEntries = (Array.isArray(entries) ? entries : []).map((entry) => {
    const cardId = normalizeCardId(entry?.cardId);
    if (
      entry?.status !== "pending" ||
      entry?.source !== "autosave" ||
      !cardId ||
      !targetCardIds.has(cardId)
    ) {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      status: "skipped",
      skippedAt,
      skipReason: "manual_interaction",
      rewardClaimed: true,
    };
  });
  return changed ? nextEntries : entries;
};

const expireStalePendingTycoonAutosaves = (
  entries = [],
  currentDayKey = getLocalDayKey(Date.now()),
  timestamp = Date.now()
) => {
  const todayKey = normalizeDayKey(currentDayKey) || getLocalDayKey(timestamp);
  const skippedAt = Math.max(0, Number(timestamp) || Date.now());
  let changed = false;
  const nextEntries = (Array.isArray(entries) ? entries : []).map((entry) => {
    if (entry?.status !== "pending") return entry;
    if (getTycoonAutosaveEventDayKey(entry) === todayKey) return entry;
    changed = true;
    return {
      ...entry,
      status: "skipped",
      skippedAt,
      skipReason: "day_rollover",
      rewardClaimed: true,
    };
  });
  return changed ? nextEntries : entries;
};

const summarizeTycoonAutosaveSaveResults = (results = []) => {
  const validResults = (Array.isArray(results) ? results : []).filter(
    (result) => result?.committed === true && result?.type === "save"
  );
  const goalTotals = new Map();
  let savedAmountUSD = 0;
  let coinReward = 0;
  let creditedCoinReward = 0;
  let everySaveFullyAppliedToGoal = validResults.length > 0;

  validResults.forEach((result) => {
    savedAmountUSD += Math.max(0, Number(result.savedAmountUSD) || 0);
    coinReward += Math.max(0, Number(result.coinReward) || 0);
    creditedCoinReward += Math.max(0, Number(result.creditedCoinReward) || 0);
    const goalId = typeof result.targetGoalId === "string" ? result.targetGoalId.trim() : "";
    const appliedAmountUSD = Math.max(0, Number(result.appliedAmountUSD) || 0);
    const resultSavedAmountUSD = Math.max(0, Number(result.savedAmountUSD) || 0);
    if (
      !goalId ||
      appliedAmountUSD <= 0 ||
      Math.abs(appliedAmountUSD - resultSavedAmountUSD) > 0.005
    ) {
      everySaveFullyAppliedToGoal = false;
      return;
    }
    const existing = goalTotals.get(goalId);
    goalTotals.set(goalId, {
      goalId,
      appliedAmountUSD: (existing?.appliedAmountUSD || 0) + appliedAmountUSD,
      goalSnapshot: existing?.goalSnapshot || result.goalSnapshot || null,
    });
  });

  return {
    savedCount: validResults.length,
    savedAmountUSD,
    coinReward,
    creditedCoinReward,
    singleGoal:
      everySaveFullyAppliedToGoal && goalTotals.size === 1
        ? [...goalTotals.values()][0]
        : null,
    latestPayload: validResults[validResults.length - 1]?.saveOverlayPayload || null,
  };
};

module.exports = {
  TYCOON_SETTINGS_VERSION,
  expireStalePendingTycoonAutosaves,
  getTycoonAutosaveEventDayKey,
  isTycoonAutosaveEnabled,
  isTycoonAutosaveTimestampInDay,
  normalizeTycoonSettings,
  retireLegacyTycoonRewards,
  resetLegacyTycoonPendingEvents,
  skipPendingTycoonAutosaveForCards,
  summarizeTycoonAutosaveSaveResults,
  shouldResetLegacyTycoonPendingEvents,
};
