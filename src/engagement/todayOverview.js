// With no timers, Today starts with three persona recommendations from the daily plan.
const shouldIncludeUnscheduledInToday = ({ scheduledCount = 0, isStarter = false, isActiveSeries = false, isCustom = false, interaction = {} } = {}) => {
  const decisions = Math.max(0, Number(interaction?.saveCount) || 0) + Math.max(0, Number(interaction?.spendCount) || 0);
  return (isStarter && (scheduledCount === 0 || isActiveSeries)) ||
    (scheduledCount <= 3 && (isCustom || decisions > 0));
};

const countExplicitSchedules = (entries = []) => entries.filter(({ interaction, item }) =>
  interaction?.frequencyReminderManualConfigured === true || item?.frequencyReminderManualConfigured === true
).length;

// Persisted missed-cycle counters must never move an explicitly future check into Today.
const classifyScheduledDecision = ({ dueAt, now, dayEnd }) =>
  dueAt <= now ? "due" : dueAt <= dayEnd ? "later" : "upcoming";

module.exports = { shouldIncludeUnscheduledInToday, countExplicitSchedules, classifyScheduledDecision };

// A timer reset or edit is not a completed decision. Use actual save/spend timestamps.
const isDecisionRecordedToday = (interaction = {}, now = Date.now()) => {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  return [interaction?.lastSavedAt, interaction?.lastSpentAt].some((timestamp) =>
    Number(timestamp) >= start.getTime() && Number(timestamp) <= now
  );
};
const resolveScheduledDecisionAt = (interaction = {}, fallbackInterval = 0) => {
  // The cadence reconciler advances nextCheckAt without completing the missed
  // decision. Keep that actual elapsed check actionable until a decision/reset
  // consumes it; a stale counter alone cannot override a future schedule.
  const missedAt = Number(interaction?.lastMissedCheckAt) || 0;
  const completedAt = Math.max(Number(interaction?.lastInteractionAt) || 0,
    Number(interaction?.lastSavedAt) || 0, Number(interaction?.lastSpentAt) || 0);
  if (Number(interaction?.missedCycles) > 0 && missedAt > completedAt) return missedAt;
  const startedAt = Math.max(0, Number(interaction?.lastInteractionAt) || 0,
    Number(interaction?.firstTimerConfiguredAt) || 0, Number(interaction?.lastTimerResetAt) || 0);
  const interval = Number(interaction?.intervalMs) || Number(fallbackInterval) || 0;
  const next = Number(interaction?.nextCheckAt) || 0;
  const derived = interval > 0 && startedAt > 0 ? startedAt + interval : 0;
  return interaction?.frequencyReminderManualConfigured === true && next > 0
    ? next : derived > 0 && next > 0 ? Math.max(derived, next) : derived || next;
};
module.exports.isDecisionRecordedToday = isDecisionRecordedToday;
module.exports.resolveScheduledDecisionAt = resolveScheduledDecisionAt;

// A calendar ticker can predate a decision made during the current minute.
const resolveTodayQueueNow = (ticker, wallClock = Date.now()) =>
  Math.max(Number(ticker) || 0, Number(wallClock) || 0);

// Schedule ownership and decision completion are independent. A legacy alias with
// a distant nextCheckAt must not erase a newer completed save/spend.
const mergeDecisionTimestamps = (base, candidates = []) => ({
  ...(base || {}),
  lastSavedAt: Math.max(0, ...candidates.map((entry) => Number(entry?.lastSavedAt) || 0)),
  lastSpentAt: Math.max(0, ...candidates.map((entry) => Number(entry?.lastSpentAt) || 0)),
});
module.exports.resolveTodayQueueNow = resolveTodayQueueNow;
module.exports.mergeDecisionTimestamps = mergeDecisionTimestamps;

// Keep every card selectable; scheduled checks lead the default decision flow.
const buildDecisionQueue = (groups = {}, entries = []) => {
  const due = groups.due || [];
  const scheduled = (entry) => entry.interaction?.frequencyReminderManualConfigured === true || entry.item?.frequencyReminderManualConfigured === true;
  const ordered = [...due.filter(scheduled), ...(groups.later || []),
    ...due.filter((entry) => !scheduled(entry)), ...(groups.upcoming || []), ...entries];
  const seen = new Set();
  return ordered.filter((entry) => {
    if (!entry?.id || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
};
module.exports.buildDecisionQueue = buildDecisionQueue;
