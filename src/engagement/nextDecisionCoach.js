const NEXT_DECISION_COACH_STATUS = Object.freeze({
  LOADING: "loading",
  ELIGIBLE: "eligible",
  PENDING: "pending",
  VISIBLE: "visible",
  DONE: "done",
});

const NEXT_DECISION_COACH_ACTIONS = new Set([
  "save",
  "spend",
  "skip",
  "archive",
  "pause",
]);

const normalizeId = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const createEligibleNextDecisionCoach = () => ({
  status: NEXT_DECISION_COACH_STATUS.ELIGIBLE,
  sourceTemptationId: null,
  targetTemptationId: null,
  requestId: 0,
});

const normalizeNextDecisionCoachState = (rawValue) => {
  if (rawValue === "done") {
    return {
      ...createEligibleNextDecisionCoach(),
      status: NEXT_DECISION_COACH_STATUS.DONE,
    };
  }
  if (!rawValue) return createEligibleNextDecisionCoach();
  try {
    const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
    if (!parsed || typeof parsed !== "object") return createEligibleNextDecisionCoach();
    if (parsed.status === NEXT_DECISION_COACH_STATUS.DONE) {
      return {
        ...createEligibleNextDecisionCoach(),
        status: NEXT_DECISION_COACH_STATUS.DONE,
      };
    }
    if (
      parsed.status === NEXT_DECISION_COACH_STATUS.PENDING ||
      parsed.status === NEXT_DECISION_COACH_STATUS.VISIBLE
    ) {
      return {
        status: NEXT_DECISION_COACH_STATUS.PENDING,
        sourceTemptationId: normalizeId(parsed.sourceTemptationId),
        targetTemptationId: normalizeId(parsed.targetTemptationId),
        requestId: Math.max(1, Math.floor(Number(parsed.requestId) || Date.now())),
      };
    }
  } catch {}
  return createEligibleNextDecisionCoach();
};

const serializeNextDecisionCoachState = (value) => {
  const state = normalizeNextDecisionCoachState(value);
  if (state.status === NEXT_DECISION_COACH_STATUS.DONE) return "done";
  if (
    state.status !== NEXT_DECISION_COACH_STATUS.PENDING &&
    state.status !== NEXT_DECISION_COACH_STATUS.VISIBLE
  ) {
    return "";
  }
  return JSON.stringify({
    status: state.status,
    sourceTemptationId: state.sourceTemptationId,
    targetTemptationId: state.targetTemptationId,
    requestId: state.requestId,
  });
};

const shouldQueueNextDecisionCoach = ({
  coachStatus,
  lifetimeDecisionCount = 0,
  previousResolutionCount = 0,
  action,
  result,
  availableTemptationCount = 0,
} = {}) =>
  coachStatus === NEXT_DECISION_COACH_STATUS.ELIGIBLE &&
  Math.max(0, Number(lifetimeDecisionCount) || 0) === 0 &&
  Math.max(0, Number(previousResolutionCount) || 0) === 0 &&
  NEXT_DECISION_COACH_ACTIONS.has(action) &&
  result?.isFirstResolution === true &&
  Math.max(0, Number(result?.progress?.remaining) || 0) > 0 &&
  Math.max(0, Number(availableTemptationCount) || 0) > 1;

const resolveNextDecisionCoachTarget = ({
  products = [],
  resolvedTemptationIds = [],
  sourceTemptationId = null,
  preferredTemptationId = null,
} = {}) => {
  const resolvedIds = new Set(
    (Array.isArray(resolvedTemptationIds) ? resolvedTemptationIds : [])
      .map(normalizeId)
      .filter(Boolean)
  );
  const sourceId = normalizeId(sourceTemptationId);
  const preferredId = normalizeId(preferredTemptationId);
  const candidates = (Array.isArray(products) ? products : [])
    .map((item) => ({
      item,
      id: normalizeId(item?.templateId || item?.id),
    }))
    .filter(({ id }) => id && id !== sourceId && !resolvedIds.has(id));
  if (preferredId) {
    const preferred = candidates.find(({ id }) => id === preferredId);
    if (preferred) return preferred;
  }
  return candidates[0] || null;
};

module.exports = {
  NEXT_DECISION_COACH_STATUS,
  createEligibleNextDecisionCoach,
  normalizeNextDecisionCoachState,
  resolveNextDecisionCoachTarget,
  serializeNextDecisionCoachState,
  shouldQueueNextDecisionCoach,
};
