const clampGoalProgress = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(1, numericValue));
};

const resolveGoalProgressPercentLabel = (progress, isComplete = false) => {
  if (isComplete) return 100;
  return Math.min(99, Math.round(clampGoalProgress(progress) * 100));
};

module.exports = {
  resolveGoalProgressPercentLabel,
};
