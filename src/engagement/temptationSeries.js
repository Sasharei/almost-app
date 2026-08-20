const TEMPTATION_SERIES_STATUS = Object.freeze({
  IDLE: "idle",
  ACTIVE: "active",
  READY: "ready",
  CLAIMED: "claimed",
});

const TEMPTATION_SERIES_ACTIONS = new Set([
  "save",
  "spend",
  "skip",
  "archive",
  "pause",
]);

const TEMPTATION_SERIES_MIN_DISTINCT_TEMPTATIONS = 3;
const TEMPTATION_SERIES_VERSION = 2;

const normalizeTimestamp = (value, fallback = Date.now()) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeTemptationId = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeTemptationIds = (values = []) => {
  const result = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const id = normalizeTemptationId(value);
    if (!id || seen.has(id)) return;
    seen.add(id);
    result.push(id);
  });
  return result;
};

const getLocalDayKey = (timestamp = Date.now()) => {
  const date = new Date(normalizeTimestamp(timestamp));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createInitialTemptationSeriesState = () => ({
  version: TEMPTATION_SERIES_VERSION,
  seriesId: null,
  status: TEMPTATION_SERIES_STATUS.IDLE,
  dayKey: null,
  targetIds: [],
  resolutions: {},
  pendingCoins: 0,
  creditedCoins: 0,
  claimedCoins: 0,
  startedAt: null,
  completedAt: null,
  claimedAt: null,
  postClaimActionCount: 0,
});

const normalizeResolution = (value) => {
  if (!value || typeof value !== "object") return null;
  const firstAction = TEMPTATION_SERIES_ACTIONS.has(value.firstAction)
    ? value.firstAction
    : null;
  const lastAction = TEMPTATION_SERIES_ACTIONS.has(value.lastAction)
    ? value.lastAction
    : firstAction;
  if (!firstAction || !lastAction) return null;
  const firstAt = normalizeTimestamp(value.firstAt);
  const lastAt = normalizeTimestamp(value.lastAt, firstAt);
  return {
    firstAction,
    lastAction,
    firstAt,
    lastAt,
    actionCount: Math.max(1, Math.floor(Number(value.actionCount) || 1)),
  };
};

const normalizeTemptationSeriesState = (value) => {
  if (!value || typeof value !== "object") {
    return createInitialTemptationSeriesState();
  }
  const status = Object.values(TEMPTATION_SERIES_STATUS).includes(value.status)
    ? value.status
    : TEMPTATION_SERIES_STATUS.IDLE;
  const targetIds = normalizeTemptationIds(value.targetIds);
  const resolutions = {};
  if (value.resolutions && typeof value.resolutions === "object") {
    Object.entries(value.resolutions).forEach(([rawId, rawResolution]) => {
      const id = normalizeTemptationId(rawId);
      const resolution = normalizeResolution(rawResolution);
      if (id && resolution) resolutions[id] = resolution;
    });
  }
  const startedAt = value.startedAt ? normalizeTimestamp(value.startedAt) : null;
  const completedAt = value.completedAt ? normalizeTimestamp(value.completedAt) : null;
  const claimedAt = value.claimedAt ? normalizeTimestamp(value.claimedAt) : null;
  const dayKey = typeof value.dayKey === "string" && value.dayKey.trim()
    ? value.dayKey.trim()
    : startedAt
    ? getLocalDayKey(startedAt)
    : null;
  const normalizedStatus =
    status !== TEMPTATION_SERIES_STATUS.IDLE && targetIds.length === 0
      ? TEMPTATION_SERIES_STATUS.IDLE
      : status === TEMPTATION_SERIES_STATUS.READY &&
        targetIds.length < TEMPTATION_SERIES_MIN_DISTINCT_TEMPTATIONS
      ? TEMPTATION_SERIES_STATUS.ACTIVE
      : status;
  const pendingCoins = Math.max(0, Number(value.pendingCoins) || 0);
  const storedVersion = Math.max(0, Math.floor(Number(value.version) || 0));
  const creditedCoins =
    storedVersion >= TEMPTATION_SERIES_VERSION
      ? Math.min(pendingCoins, Math.max(0, Number(value.creditedCoins) || 0))
      : 0;
  return {
    version: TEMPTATION_SERIES_VERSION,
    seriesId:
      typeof value.seriesId === "string" && value.seriesId.trim()
        ? value.seriesId.trim()
        : dayKey && startedAt
        ? `${dayKey}:${startedAt}`
        : null,
    status: normalizedStatus,
    dayKey,
    targetIds,
    resolutions,
    pendingCoins,
    creditedCoins,
    claimedCoins: Math.max(0, Number(value.claimedCoins) || 0),
    startedAt,
    completedAt:
      normalizedStatus === TEMPTATION_SERIES_STATUS.ACTIVE ? null : completedAt,
    claimedAt,
    postClaimActionCount: Math.max(0, Math.floor(Number(value.postClaimActionCount) || 0)),
  };
};

const createTemptationSeries = ({ dayKey, availableIds, temptationId, timestamp }) => {
  const startedAt = normalizeTimestamp(timestamp);
  const resolvedDayKey =
    typeof dayKey === "string" && dayKey.trim() ? dayKey.trim() : getLocalDayKey(startedAt);
  const targetIds = normalizeTemptationIds([...(availableIds || []), temptationId]);
  return {
    ...createInitialTemptationSeriesState(),
    seriesId: `${resolvedDayKey}:${startedAt}`,
    status: TEMPTATION_SERIES_STATUS.ACTIVE,
    dayKey: resolvedDayKey,
    targetIds,
    startedAt,
  };
};

const resetTemptationSeriesForDay = (
  value,
  { dayKey = null, timestamp = Date.now() } = {}
) => {
  const state = normalizeTemptationSeriesState(value);
  const occurredAt = normalizeTimestamp(timestamp);
  const currentDayKey =
    typeof dayKey === "string" && dayKey.trim()
      ? dayKey.trim()
      : getLocalDayKey(occurredAt);
  if (
    (state.status === TEMPTATION_SERIES_STATUS.IDLE && !state.dayKey) ||
    state.dayKey === currentDayKey
  ) {
    return state;
  }
  return createInitialTemptationSeriesState();
};

const getUncreditedTemptationSeriesCoins = (value) => {
  const state = normalizeTemptationSeriesState(value);
  return Math.max(0, state.pendingCoins - state.creditedCoins);
};

const getTemptationSeriesProgress = (value) => {
  const state = normalizeTemptationSeriesState(value);
  const completed = state.targetIds.reduce(
    (count, id) => count + Number(Boolean(state.resolutions[id])),
    0
  );
  const total =
    state.status === TEMPTATION_SERIES_STATUS.IDLE ||
    state.status === TEMPTATION_SERIES_STATUS.CLAIMED
      ? state.targetIds.length
      : Math.max(
          TEMPTATION_SERIES_MIN_DISTINCT_TEMPTATIONS,
          state.targetIds.length
        );
  return {
    completed,
    total,
    remaining: Math.max(0, total - completed),
  };
};

const getTemptationSeriesDisplayProgress = (
  value,
  { targetIds = [], resolutions = {} } = {}
) => {
  const state = normalizeTemptationSeriesState(value);
  if (state.status !== TEMPTATION_SERIES_STATUS.IDLE) {
    return getTemptationSeriesProgress(state);
  }
  const previewTargetIds = normalizeTemptationIds(targetIds);
  const completed = previewTargetIds.reduce(
    (count, id) => count + Number(Boolean(normalizeResolution(resolutions?.[id]))),
    0
  );
  const total = Math.max(
    TEMPTATION_SERIES_MIN_DISTINCT_TEMPTATIONS,
    previewTargetIds.length
  );
  return {
    completed,
    total,
    remaining: Math.max(0, total - completed),
  };
};

const reconcileTemptationSeriesTargets = (
  value,
  {
    dayKey = null,
    targetIds = [],
    historyResolutions = {},
    timestamp = Date.now(),
  } = {}
) => {
  const occurredAt = normalizeTimestamp(timestamp);
  const todayKey =
    typeof dayKey === "string" && dayKey.trim() ? dayKey.trim() : getLocalDayKey(occurredAt);
  const state = resetTemptationSeriesForDay(value, {
    dayKey: todayKey,
    timestamp: occurredAt,
  });
  if (
    state.status === TEMPTATION_SERIES_STATUS.IDLE ||
    state.status === TEMPTATION_SERIES_STATUS.CLAIMED
  ) {
    return state;
  }

  const resolutions = { ...state.resolutions };
  if (historyResolutions && typeof historyResolutions === "object") {
    Object.entries(historyResolutions).forEach(([rawId, rawResolution]) => {
      const id = normalizeTemptationId(rawId);
      const resolution = normalizeResolution(rawResolution);
      if (!id || !resolution || resolutions[id]) return;
      resolutions[id] = resolution;
    });
  }
  const resolvedTodayIds = Object.entries(resolutions).reduce((ids, [id, resolution]) => {
    if (getLocalDayKey(resolution.firstAt) === todayKey) ids.push(id);
    return ids;
  }, []);
  const nextTargetIds = normalizeTemptationIds([...targetIds, ...resolvedTodayIds]);
  if (!nextTargetIds.length) return state;

  const completed = nextTargetIds.reduce(
    (count, id) => count + Number(Boolean(resolutions[id])),
    0
  );
  const ready =
    nextTargetIds.length >= TEMPTATION_SERIES_MIN_DISTINCT_TEMPTATIONS &&
    completed >= nextTargetIds.length;
  const status = ready ? TEMPTATION_SERIES_STATUS.READY : TEMPTATION_SERIES_STATUS.ACTIVE;
  const completedAt = ready ? state.completedAt || occurredAt : null;
  const targetIdsUnchanged =
    nextTargetIds.length === state.targetIds.length &&
    nextTargetIds.every((id, index) => id === state.targetIds[index]);
  const resolutionsUnchanged =
    Object.keys(resolutions).length === Object.keys(state.resolutions).length;
  if (
    targetIdsUnchanged &&
    resolutionsUnchanged &&
    status === state.status &&
    completedAt === state.completedAt
  ) {
    return state;
  }
  return {
    ...state,
    targetIds: nextTargetIds,
    resolutions,
    status,
    completedAt,
  };
};

const applyTemptationSeriesAction = (
  value,
  {
    dayKey = null,
    availableIds = [],
    temptationId = null,
    action = "skip",
    rewardCoins = 0,
    timestamp = Date.now(),
  } = {}
) => {
  const occurredAt = normalizeTimestamp(timestamp);
  const todayKey =
    typeof dayKey === "string" && dayKey.trim() ? dayKey.trim() : getLocalDayKey(occurredAt);
  const id = normalizeTemptationId(temptationId);
  const normalizedAction = TEMPTATION_SERIES_ACTIONS.has(action) ? action : "skip";
  const normalizedReward = Math.max(0, Number(rewardCoins) || 0);
  let state = resetTemptationSeriesForDay(value, {
    dayKey: todayKey,
    timestamp: occurredAt,
  });

  if (state.status === TEMPTATION_SERIES_STATUS.CLAIMED) {
    const claimedDayKey = state.claimedAt ? getLocalDayKey(state.claimedAt) : state.dayKey;
    if (claimedDayKey === todayKey) {
      return {
        state: {
          ...state,
          postClaimActionCount: state.postClaimActionCount + 1,
          claimedCoins: state.claimedCoins + normalizedReward,
        },
        rewardMode: normalizedReward > 0 ? "direct" : "none",
        creditCoins: normalizedReward,
        becameReady: false,
        isFirstResolution: false,
        progress: getTemptationSeriesProgress(state),
      };
    }
  }

  if (
    state.status === TEMPTATION_SERIES_STATUS.IDLE ||
    state.status === TEMPTATION_SERIES_STATUS.CLAIMED
  ) {
    state = createTemptationSeries({
      dayKey: todayKey,
      availableIds,
      temptationId: id,
      timestamp: occurredAt,
    });
  }

  if (!id) {
    return {
      state,
      rewardMode: normalizedReward > 0 ? "direct" : "none",
      creditCoins: normalizedReward,
      becameReady: false,
      isFirstResolution: false,
      progress: getTemptationSeriesProgress(state),
    };
  }

  const targetIds = normalizeTemptationIds([...state.targetIds, id]);
  const previousResolution = state.resolutions[id] || null;
  const isSeriesTarget = targetIds.includes(id);
  const resolutions = {
    ...state.resolutions,
    [id]: previousResolution
      ? {
          ...previousResolution,
          lastAction: normalizedAction,
          lastAt: occurredAt,
          actionCount: previousResolution.actionCount + 1,
        }
      : {
          firstAction: normalizedAction,
          lastAction: normalizedAction,
          firstAt: occurredAt,
          lastAt: occurredAt,
          actionCount: 1,
        },
  };
  const nextProgress = targetIds.reduce(
    (count, targetId) => count + Number(Boolean(resolutions[targetId])),
    0
  );
  const becameReady =
    state.status === TEMPTATION_SERIES_STATUS.ACTIVE &&
    targetIds.length >= TEMPTATION_SERIES_MIN_DISTINCT_TEMPTATIONS &&
    nextProgress >= targetIds.length;
  const nextState = {
    ...state,
    targetIds,
    status: becameReady ? TEMPTATION_SERIES_STATUS.READY : state.status,
    resolutions,
    pendingCoins: state.pendingCoins + normalizedReward,
    creditedCoins: state.creditedCoins + normalizedReward,
    completedAt: becameReady ? occurredAt : state.completedAt,
  };

  return {
    state: nextState,
    rewardMode: normalizedReward > 0 ? "direct" : "none",
    creditCoins: normalizedReward,
    becameReady,
    isFirstResolution: isSeriesTarget && !previousResolution,
    progress: getTemptationSeriesProgress(nextState),
  };
};

const claimTemptationSeries = (value, timestamp = Date.now()) => {
  const claimedAt = normalizeTimestamp(timestamp);
  const state = resetTemptationSeriesForDay(value, { timestamp: claimedAt });
  const progress = getTemptationSeriesProgress(state);
  if (
    state.status !== TEMPTATION_SERIES_STATUS.READY ||
    state.targetIds.length < TEMPTATION_SERIES_MIN_DISTINCT_TEMPTATIONS ||
    progress.remaining > 0
  ) {
    return { state, payoutCoins: 0, claimed: false };
  }
  const totalCoins = Math.max(0, Number(state.pendingCoins) || 0);
  const payoutCoins = getUncreditedTemptationSeriesCoins(state);
  return {
    state: {
      ...state,
      status: TEMPTATION_SERIES_STATUS.CLAIMED,
      pendingCoins: 0,
      creditedCoins: 0,
      claimedCoins: totalCoins,
      claimedAt,
    },
    payoutCoins,
    claimed: true,
  };
};

const getTemptationSeriesSummary = (value) => {
  const state = normalizeTemptationSeriesState(value);
  const summary = {
    save: 0,
    spend: 0,
    skip: 0,
    archive: 0,
    pause: 0,
  };
  state.targetIds.forEach((id) => {
    const action = state.resolutions[id]?.firstAction;
    if (action && Object.prototype.hasOwnProperty.call(summary, action)) {
      summary[action] += 1;
    }
  });
  return summary;
};

module.exports = {
  TEMPTATION_SERIES_STATUS,
  TEMPTATION_SERIES_MIN_DISTINCT_TEMPTATIONS,
  applyTemptationSeriesAction,
  claimTemptationSeries,
  createInitialTemptationSeriesState,
  getTemptationSeriesDisplayProgress,
  getLocalDayKey,
  getTemptationSeriesProgress,
  getUncreditedTemptationSeriesCoins,
  getTemptationSeriesSummary,
  reconcileTemptationSeriesTargets,
  normalizeTemptationSeriesState,
  normalizeTemptationId,
  resetTemptationSeriesForDay,
};
