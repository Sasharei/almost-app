const clampGoalProgress = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(1, numericValue));
};

const normalizeGoalAmount = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, numericValue);
};

const isGoalCompletionLocked = ({
  savedUSD = 0,
  targetUSD = 0,
  status = "active",
  completedAt = null,
  completionLocked = false,
} = {}) => {
  const normalizedSavedUSD = normalizeGoalAmount(savedUSD);
  const normalizedTargetUSD = normalizeGoalAmount(targetUSD);
  return (
    completionLocked === true ||
    status === "done" ||
    completedAt != null ||
    (normalizedTargetUSD > 0 && normalizedSavedUSD >= normalizedTargetUSD)
  );
};

const resolveGoalProgressState = ({
  currentSavedUSD = 0,
  targetUSD = 0,
  currentStatus = "active",
  completedAt = null,
  completionLocked = false,
  requestedSavedUSD = currentSavedUSD,
  requestedStatus = null,
  allowCompletedReset = false,
  occurredAt = Date.now(),
} = {}) => {
  const normalizedCurrentSavedUSD = normalizeGoalAmount(currentSavedUSD);
  const normalizedTargetUSD = normalizeGoalAmount(targetUSD);
  const normalizedRequestedSavedUSD = normalizeGoalAmount(requestedSavedUSD);
  const normalizedOccurredAt = Number(occurredAt);
  const resolvedCompletionTimestamp =
    completedAt != null
      ? completedAt
      : Number.isFinite(normalizedOccurredAt) && normalizedOccurredAt > 0
      ? normalizedOccurredAt
      : null;
  const wasCompleted = isGoalCompletionLocked({
    savedUSD: normalizedCurrentSavedUSD,
    targetUSD: normalizedTargetUSD,
    status: currentStatus,
    completedAt,
    completionLocked,
  });

  if (wasCompleted && !allowCompletedReset) {
    return {
      savedUSD: Math.max(normalizedCurrentSavedUSD, normalizedTargetUSD),
      status: "done",
      completedAt: resolvedCompletionTimestamp,
      completionLocked: true,
    };
  }

  const isCompleted =
    requestedStatus === "done" ||
    (normalizedTargetUSD > 0 && normalizedRequestedSavedUSD >= normalizedTargetUSD);
  if (isCompleted) {
    return {
      savedUSD: Math.max(normalizedRequestedSavedUSD, normalizedTargetUSD),
      status: "done",
      completedAt: resolvedCompletionTimestamp,
      completionLocked: true,
    };
  }

  const fallbackStatus =
    typeof requestedStatus === "string" && requestedStatus && requestedStatus !== "done"
      ? requestedStatus
      : typeof currentStatus === "string" && currentStatus && currentStatus !== "done"
      ? currentStatus
      : "active";
  return {
    savedUSD: normalizedRequestedSavedUSD,
    status: fallbackStatus,
    completedAt: allowCompletedReset ? null : completedAt,
    completionLocked: false,
  };
};

const resolveGoalProgressPercentLabel = (progress, isComplete = false) => {
  if (isComplete) return 100;
  return Math.min(99, Math.round(clampGoalProgress(progress) * 100));
};

module.exports = {
  isGoalCompletionLocked,
  resolveGoalProgressState,
  resolveGoalProgressPercentLabel,
};
