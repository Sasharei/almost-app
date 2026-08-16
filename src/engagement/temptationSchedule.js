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

module.exports = {
  hasStableManualTemptationSchedule,
  shouldPreserveTemptationScheduleOnAction,
};
