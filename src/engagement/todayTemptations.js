const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeId = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const getLocalDayKey = (timestamp = Date.now()) => {
  const date = new Date(Number(timestamp) || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalDayBounds = (timestamp = Date.now()) => {
  const date = new Date(Number(timestamp) || Date.now());
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const nextStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1
  ).getTime();
  return {
    dayKey: getLocalDayKey(date.getTime()),
    start,
    end: nextStart - 1,
  };
};

const getNextLocalMidnightAt = (timestamp = Date.now()) => {
  const date = new Date(Number(timestamp) || Date.now());
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1
  ).getTime();
};

const normalizeFrequency = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["daily", "weekly", "biweekly", "monthly", "custom"].includes(normalized)
    ? normalized
    : null;
};

const normalizeNumberList = (value, minimum, maximum) => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string" && value.includes(",")
    ? value.split(",")
    : value == null
    ? []
    : [value];
  const result = [];
  const seen = new Set();
  source.forEach((entry) => {
    const number = Math.round(Number(entry));
    if (!Number.isFinite(number) || number < minimum || number > maximum || seen.has(number)) {
      return;
    }
    seen.add(number);
    result.push(number);
  });
  return result;
};

const getCustomIntervalMs = (customFrequency = null) => {
  if (!customFrequency || typeof customFrequency !== "object") return null;
  const count = Math.max(
    1,
    Math.round(
      Number(
        customFrequency.count ??
          customFrequency.value ??
          customFrequency.amount ??
          customFrequency.times
      ) || 1
    )
  );
  const unit =
    typeof customFrequency.unit === "string"
      ? customFrequency.unit.trim().toLowerCase()
      : "day";
  const factor = unit === "month" ? 30 : unit === "week" ? 7 : 1;
  return count * factor * DAY_MS;
};

const getItemAliases = (item = null) => {
  const result = [];
  [item?.templateId, item?.id].forEach((value) => {
    const id = normalizeId(value);
    if (id && !result.includes(id)) result.push(id);
  });
  return result;
};

const getCanonicalItemId = (item = null) => getItemAliases(item)[0] || null;

const partitionUnifiedTemptationFeed = ({
  items = [],
  getId = (item) => item?.id,
  todayTargetIds = [],
  resolvedTodayIds = [],
} = {}) => {
  const todayIds = new Set(
    (Array.isArray(todayTargetIds) ? todayTargetIds : [])
      .map(normalizeId)
      .filter(Boolean)
  );
  const resolvedIds = new Set(
    (Array.isArray(resolvedTodayIds) ? resolvedTodayIds : [])
      .map(normalizeId)
      .filter(Boolean)
  );

  const uncheckedToday = [];
  const checkedToday = [];
  const other = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const id = normalizeId(typeof getId === "function" ? getId(item) : item?.id);
    if (!id || !todayIds.has(id)) {
      other.push(item);
      return;
    }
    if (resolvedIds.has(id)) checkedToday.push(item);
    else uncheckedToday.push(item);
  });

  return {
    uncheckedToday,
    checkedToday,
    other,
    ordered: [...uncheckedToday, ...checkedToday, ...other],
  };
};

const getHistoryTemplateId = (entry = null) =>
  normalizeId(entry?.meta?.templateId) ||
  normalizeId(entry?.meta?.id) ||
  normalizeId(entry?.meta?.template);

const buildTodayHistoryResolutions = ({ historyEvents = [], aliasToCanonical, dayKey }) => {
  const buckets = new Map();
  (Array.isArray(historyEvents) ? historyEvents : []).forEach((entry) => {
    const action = entry?.kind === "refuse_spend" ? "save" : entry?.kind === "spend" ? "spend" : null;
    if (!action) return;
    const timestamp = Number(entry?.timestamp) || 0;
    if (!timestamp || getLocalDayKey(timestamp) !== dayKey) return;
    const historyId = getHistoryTemplateId(entry);
    const canonicalId = historyId ? aliasToCanonical.get(historyId) || historyId : null;
    if (!canonicalId) return;
    const bucket = buckets.get(canonicalId) || [];
    bucket.push({ action, timestamp });
    buckets.set(canonicalId, bucket);
  });

  const resolutions = {};
  buckets.forEach((actions, id) => {
    actions.sort((left, right) => left.timestamp - right.timestamp);
    const first = actions[0];
    const last = actions[actions.length - 1];
    resolutions[id] = {
      firstAction: first.action,
      lastAction: last.action,
      firstAt: first.timestamp,
      lastAt: last.timestamp,
      actionCount: actions.length,
    };
  });
  return resolutions;
};

const resolveInteractionEntry = (item, interactionStats = {}) => {
  const entries = getItemAliases(item)
    .map((id) => interactionStats?.[id])
    .filter((entry) => entry && typeof entry === "object");
  if (!entries.length) return null;
  return entries.reduce((best, candidate) => {
    const bestStamp = Math.max(
      Number(best?.lastInteractionAt) || 0,
      Number(best?.lastTimerResetAt) || 0,
      Number(best?.nextCheckAt) || 0
    );
    const candidateStamp = Math.max(
      Number(candidate?.lastInteractionAt) || 0,
      Number(candidate?.lastTimerResetAt) || 0,
      Number(candidate?.nextCheckAt) || 0
    );
    return candidateStamp > bestStamp ? candidate : best;
  }, entries[0]);
};

const getMonthlyScheduledDay = (date, requestedDay) => {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.min(daysInMonth, requestedDay);
};

const isScheduledForDay = ({ item, interaction, referenceDate, dayEnd }) => {
  const nextCheckAt = Math.max(0, Number(interaction?.nextCheckAt) || 0);
  if (nextCheckAt > 0) return nextCheckAt <= dayEnd;

  const manualConfigured =
    interaction?.frequencyReminderManualConfigured === true ||
    item?.frequencyReminderManualConfigured === true;
  if (!manualConfigured) return false;

  let frequency = normalizeFrequency(interaction?.frequency || item?.frequency);
  const customFrequency =
    interaction?.frequencyCustom || item?.frequencyCustom || item?.customFrequency || null;
  if (frequency === "biweekly") frequency = "custom";
  if (!frequency) return false;
  if (frequency === "daily") return true;
  if (frequency === "weekly") {
    const weeklyDays = normalizeNumberList(
      interaction?.frequencyWeeklyDays ??
        interaction?.frequencyWeeklyDay ??
        item?.frequencyWeeklyDays ??
        item?.frequencyWeeklyDay,
      0,
      6
    );
    return weeklyDays.includes(referenceDate.getDay());
  }
  if (frequency === "monthly") {
    const monthlyDays = normalizeNumberList(
      interaction?.frequencyMonthlyDays ??
        interaction?.frequencyMonthlyDay ??
        item?.frequencyMonthlyDays ??
        item?.frequencyMonthlyDay,
      1,
      31
    );
    return monthlyDays.some(
      (day) => getMonthlyScheduledDay(referenceDate, day) === referenceDate.getDate()
    );
  }

  const intervalMs =
    Math.max(
      0,
      Number(interaction?.intervalMs) ||
        Number(item?.frequencyIntervalMs) ||
        Number(item?.intervalMs) ||
        Number(getCustomIntervalMs(customFrequency)) ||
        0
    ) || 0;
  const anchor = Math.max(
    0,
    Number(interaction?.lastInteractionAt) ||
      Number(interaction?.firstTimerConfiguredAt) ||
      Number(item?.createdAt) ||
      0
  );
  return intervalMs > 0 && anchor > 0 && anchor + intervalMs <= dayEnd;
};

const buildTodayTemptationPlan = ({
  products = [],
  interactionStats = {},
  historyEvents = [],
  timestamp = Date.now(),
} = {}) => {
  const bounds = getLocalDayBounds(timestamp);
  const items = (Array.isArray(products) ? products : []).filter(Boolean);
  const aliasToCanonical = new Map();
  items.forEach((item) => {
    const canonicalId = getCanonicalItemId(item);
    if (!canonicalId) return;
    getItemAliases(item).forEach((alias) => aliasToCanonical.set(alias, canonicalId));
  });
  const resolutions = buildTodayHistoryResolutions({
    historyEvents,
    aliasToCanonical,
    dayKey: bounds.dayKey,
  });
  const referenceDate = new Date(Number(timestamp) || Date.now());
  const targetIds = [];
  const dueIds = [];
  const checkedIds = [];

  items.forEach((item) => {
    const id = getCanonicalItemId(item);
    if (!id) return;
    const interaction = resolveInteractionEntry(item, interactionStats);
    const checkedToday = Boolean(resolutions[id]);
    const missedToday =
      Number(interaction?.lastMissedCheckAt) > 0 &&
      getLocalDayKey(interaction.lastMissedCheckAt) === bounds.dayKey;
    const dueToday = isScheduledForDay({
      item,
      interaction,
      referenceDate,
      dayEnd: bounds.end,
    }) || missedToday;
    if (!checkedToday && !dueToday) return;
    targetIds.push(id);
    if (checkedToday) checkedIds.push(id);
    else dueIds.push(id);
  });

  return {
    dayKey: bounds.dayKey,
    targetIds,
    dueIds,
    checkedIds,
    resolutions,
  };
};

module.exports = {
  buildTodayTemptationPlan,
  getLocalDayBounds,
  getLocalDayKey,
  getNextLocalMidnightAt,
  isScheduledForDay,
  partitionUnifiedTemptationFeed,
};
