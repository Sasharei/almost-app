const hasStableManualTemptationSchedule = (entry = null) =>
  Boolean(
    entry &&
      typeof entry === "object" &&
      entry.frequencyReminderManualConfigured === true &&
      Number.isFinite(Number(entry.nextCheckAt)) &&
      Number(entry.nextCheckAt) > 0
  );

const shouldPreserveTemptationScheduleOnAction = ({
  explicitlyPreserve = false,
  entries = [],
} = {}) =>
  explicitlyPreserve === true ||
  (Array.isArray(entries) ? entries : [entries]).some(hasStableManualTemptationSchedule);

const resolveTemptationActionSchedulePolicy = ({
  explicitlyPreserve = false,
  entries = [],
} = {}) => {
  const preserveConfiguredTimer = shouldPreserveTemptationScheduleOnAction({
    explicitlyPreserve,
    entries,
  });
  const isAutomaticConfirmation = explicitlyPreserve === true;
  return {
    preserveConfiguredTimer,
    shouldAdvanceAnchoredSchedule:
      preserveConfiguredTimer && !isAutomaticConfirmation,
    shouldInvalidatePendingAutosave: !isAutomaticConfirmation,
    shouldResetReminderRegistration: !isAutomaticConfirmation,
  };
};

const advanceAnchoredTemptationSchedule = ({
  scheduledNextCheckAt = 0,
  missedCycles = 0,
  alreadyConsumedCurrentCycle = false,
  now = Date.now(),
  resolveNextCheckAt = null,
} = {}) => {
  const scheduledAt = Math.max(0, Number(scheduledNextCheckAt) || 0);
  const referenceAt = Math.max(0, Number(now) || Date.now());
  const pendingMissedCycles = Math.max(0, Math.floor(Number(missedCycles) || 0));
  if (!scheduledAt || typeof resolveNextCheckAt !== "function") return null;

  // The cadence reconciler has already advanced this timer. Clearing its missed
  // cycles is enough; advancing again would skip the next real occurrence.
  if (
    scheduledAt > referenceAt &&
    (pendingMissedCycles > 0 || alreadyConsumedCurrentCycle === true)
  ) {
    return scheduledAt;
  }

  let cursor = scheduledAt;
  for (let step = 0; step < 90; step += 1) {
    const nextAt = Number(resolveNextCheckAt(cursor));
    if (!Number.isFinite(nextAt) || nextAt <= cursor) return null;
    cursor = nextAt;
    if (cursor > referenceAt) return cursor;
  }
  return null;
};

const buildAnchoredTemptationDueWindows = ({
  firstDueAt = 0,
  now = Date.now(),
  maxWindows = 3,
  maxIterations = 370,
  fallbackIntervalMs = 0,
  resolveNextCheckAt = null,
} = {}) => {
  const firstAt = Math.max(0, Number(firstDueAt) || 0);
  const referenceAt = Math.max(0, Number(now) || Date.now());
  const windowLimit = Math.max(1, Math.floor(Number(maxWindows) || 1));
  const baseIterationLimit = Math.max(
    windowLimit,
    Math.floor(Number(maxIterations) || windowLimit)
  );
  const fallbackInterval = Math.max(0, Number(fallbackIntervalMs) || 0);
  if (!firstAt || firstAt > referenceAt) return [];
  const estimatedFallbackSteps =
    fallbackInterval > 0
      ? Math.ceil((referenceAt - firstAt) / fallbackInterval) + 2
      : 0;
  const iterationLimit = Math.max(
    baseIterationLimit,
    Math.min(5000, estimatedFallbackSteps * 8)
  );

  const windows = [];
  let cursor = firstAt;
  for (let step = 0; step < iterationLimit && cursor <= referenceAt; step += 1) {
    windows.push(cursor);
    if (windows.length > windowLimit) windows.shift();

    const resolvedNextAt =
      typeof resolveNextCheckAt === "function"
        ? Number(resolveNextCheckAt(cursor))
        : Number.NaN;
    const nextAt =
      Number.isFinite(resolvedNextAt) && resolvedNextAt > cursor
        ? resolvedNextAt
        : fallbackInterval > 0
        ? cursor + fallbackInterval
        : null;
    if (!Number.isFinite(nextAt) || nextAt <= cursor) break;
    cursor = nextAt;
  }
  return windows;
};

const isManualTemptationCycleAlreadyConsumed = ({
  skipTargetAt = 0,
  skipCreatedAt = 0,
  timerResetAt = 0,
  now = Date.now(),
  intervalMs = 0,
} = {}) => {
  const targetAt = Math.max(0, Number(skipTargetAt) || 0);
  const createdAt = Math.max(0, Number(skipCreatedAt) || 0);
  const resetAt = Math.max(0, Number(timerResetAt) || 0);
  const referenceAt = Math.max(0, Number(now) || Date.now());
  const interval = Math.max(0, Number(intervalMs) || 0);
  return Boolean(
    targetAt > 0 &&
      (targetAt > referenceAt || createdAt >= targetAt) &&
      resetAt > 0 &&
      interval > 0 &&
      referenceAt - resetAt < interval
  );
};

module.exports = {
  advanceAnchoredTemptationSchedule,
  buildAnchoredTemptationDueWindows,
  hasStableManualTemptationSchedule,
  isManualTemptationCycleAlreadyConsumed,
  resolveTemptationActionSchedulePolicy,
  shouldPreserveTemptationScheduleOnAction,
};
