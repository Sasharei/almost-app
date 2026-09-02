const RATING_PROMPT_DECISION_ACTIONS = new Set(["save", "spend"]);

const isRatingPromptCompleted = (value) =>
  Boolean(
    value?.completed || value?.lastAction === "rate" || value?.lastAction === "feedback"
  );

const isRatingPromptTriggerEligible = (
  value,
  { actionThreshold = 2, seriesThreshold = 1 } = {}
) => {
  if (isRatingPromptCompleted(value)) return false;
  const normalizedActionThreshold = Math.max(1, Math.floor(Number(actionThreshold) || 1));
  const normalizedSeriesThreshold = Math.max(1, Math.floor(Number(seriesThreshold) || 1));
  const actionCount = Math.max(0, Math.floor(Number(value?.actionCount) || 0));
  const seriesCompletionCount = Math.max(
    0,
    Math.floor(Number(value?.seriesCompletionCount) || 0)
  );
  return (
    actionCount >= normalizedActionThreshold ||
    seriesCompletionCount >= normalizedSeriesThreshold
  );
};

const applyRatingPromptDecisionAction = (
  value,
  { action, actionThreshold = 2, seriesThreshold = 1 } = {}
) => {
  const state = value && typeof value === "object" ? value : {};
  if (!RATING_PROMPT_DECISION_ACTIONS.has(action) || isRatingPromptCompleted(state)) {
    return {
      state,
      recorded: false,
      eligible: isRatingPromptTriggerEligible(state, {
        actionThreshold,
        seriesThreshold,
      }),
    };
  }
  const nextState = {
    ...state,
    actionCount: Math.max(0, Math.floor(Number(state.actionCount) || 0)) + 1,
  };
  return {
    state: nextState,
    recorded: true,
    eligible: isRatingPromptTriggerEligible(nextState, {
      actionThreshold,
      seriesThreshold,
    }),
  };
};

const applyRatingPromptSeriesCompletion = (
  value,
  { actionThreshold = 2, seriesThreshold = 1 } = {}
) => {
  const state = value && typeof value === "object" ? value : {};
  if (isRatingPromptCompleted(state)) {
    return {
      state,
      recorded: false,
      eligible: false,
    };
  }
  const nextState = {
    ...state,
    seriesCompletionCount:
      Math.max(0, Math.floor(Number(state.seriesCompletionCount) || 0)) + 1,
  };
  return {
    state: nextState,
    recorded: true,
    eligible: isRatingPromptTriggerEligible(nextState, {
      actionThreshold,
      seriesThreshold,
    }),
  };
};

module.exports = {
  RATING_PROMPT_DECISION_ACTIONS,
  applyRatingPromptDecisionAction,
  applyRatingPromptSeriesCompletion,
  isRatingPromptCompleted,
  isRatingPromptTriggerEligible,
};
