const normalizePositiveTimestamp = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeSubscriptionId = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value.trim() : "";
};

const hashSubscriptionPlanKey = (value = "") => {
  const source = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const buildSubscriptionDuePromptKey = (entry = null, fallbackTimestamp = Date.now()) => {
  const subscriptionId = normalizeSubscriptionId(entry?.id || entry?.templateId);
  if (!subscriptionId) return "";
  const dueAt =
    normalizePositiveTimestamp(entry?.dueAt) ||
    normalizePositiveTimestamp(entry?.nextCheckAt) ||
    normalizePositiveTimestamp(fallbackTimestamp);
  return dueAt ? subscriptionId + ":" + dueAt : subscriptionId;
};

const findPendingSubscriptionDueEntry = (
  entries = [],
  { now = Date.now(), dismissedKeys = null } = {}
) => {
  const referenceTimestamp = Number(now) || Date.now();
  const dismissed =
    dismissedKeys && typeof dismissedKeys.has === "function" ? dismissedKeys : new Set();
  return (
    [...(Array.isArray(entries) ? entries : [])]
      .sort((a, b) => (Number(a?.dueAt || a?.nextCheckAt) || 0) - (Number(b?.dueAt || b?.nextCheckAt) || 0) || normalizeSubscriptionId(a?.id || a?.templateId).localeCompare(normalizeSubscriptionId(b?.id || b?.templateId)))
      .find((entry) => {
      if (!entry || entry.dueForConfirmation !== true) return false;
      const dueAt =
        normalizePositiveTimestamp(entry.dueAt) ||
        normalizePositiveTimestamp(entry.nextCheckAt);
      if (!dueAt || dueAt > referenceTimestamp) return false;
      const promptKey = buildSubscriptionDuePromptKey(entry, referenceTimestamp);
      return Boolean(promptKey && !dismissed.has(promptKey));
    }) || null
  );
};

const findNextSubscriptionDeadline = (entries = [], { now = Date.now() } = {}) => {
  const referenceTimestamp = Number(now) || Date.now();
  return (Array.isArray(entries) ? entries : []).reduce((nearest, entry) => {
    const dueAt =
      normalizePositiveTimestamp(entry?.nextCheckAt) ||
      normalizePositiveTimestamp(entry?.dueAt);
    if (!dueAt || dueAt <= referenceTimestamp) return nearest;
    return nearest === null || dueAt < nearest ? dueAt : nearest;
  }, null);
};

const buildSubscriptionNotificationPlan = ({
  subscriptions = [],
  now = Date.now(),
  reminderOffsetsDays = [5, 3, 1],
  dayMs = 24 * 60 * 60 * 1000,
  reminderKind = "subscription_reminder",
  dueKind = "subscription_due",
  localeKey = "",
  getDayKey = null,
  reminderLeadTimeMs = 5 * 60 * 1000,
  dueLeadTimeMs = 60 * 1000,
  maxGroups = 24,
} = {}) => {
  if (typeof getDayKey !== "function") return [];
  const referenceTimestamp = Number(now) || Date.now();
  const groups = new Map();
  const addToGroup = ({ kind, dayKey, triggerTime, daysBefore, subscription }) => {
    if (!kind || !dayKey || !Number.isFinite(triggerTime) || !subscription) return;
    // Each subscription gets its own delivery; the scheduler queues collisions
    // through its cooldown instead of merging a day into the first subscription.
    const groupKey = kind + ":" + dayKey + ":" + subscription.templateId + ":" + daysBefore;
    const current = groups.get(groupKey) || {
      groupKey,
      kind,
      dayKey,
      triggerTime,
      daysBefore,
      subscriptions: [],
    };
    current.triggerTime = Math.min(current.triggerTime, triggerTime);
    if (Number.isFinite(Number(daysBefore))) {
      current.daysBefore = Math.min(Number(current.daysBefore) || 0, Number(daysBefore));
    }
    current.subscriptions.push(subscription);
    groups.set(groupKey, current);
  };

  (Array.isArray(subscriptions) ? subscriptions : []).forEach((source) => {
    const templateId = normalizeSubscriptionId(source?.templateId || source?.id);
    const nextCheckAt = normalizePositiveTimestamp(source?.nextCheckAt);
    if (!templateId || !nextCheckAt || nextCheckAt <= referenceTimestamp) return;
    const subscription = {
      ...source,
      templateId,
      nextCheckAt,
    };
    (Array.isArray(reminderOffsetsDays) ? reminderOffsetsDays : []).forEach((offset) => {
      const daysBefore = Math.max(0, Number(offset) || 0);
      const triggerTime = nextCheckAt - daysBefore * dayMs;
      if (!Number.isFinite(triggerTime) || triggerTime <= referenceTimestamp + reminderLeadTimeMs) {
        return;
      }
      const dayKey = getDayKey(triggerTime);
      if (!dayKey) return;
      addToGroup({
        kind: reminderKind,
        dayKey,
        triggerTime,
        daysBefore,
        subscription: { ...subscription, daysBefore },
      });
    });
    if (nextCheckAt <= referenceTimestamp + dueLeadTimeMs) return;
    const dueDayKey = getDayKey(nextCheckAt);
    if (!dueDayKey) return;
    addToGroup({
      kind: dueKind,
      dayKey: dueDayKey,
      triggerTime: nextCheckAt,
      daysBefore: 0,
      subscription: { ...subscription, daysBefore: 0 },
    });
  });

  return Array.from(groups.values())
    .map((group) => {
      const sortedSubscriptions = [...group.subscriptions].sort((a, b) => {
        if (a.nextCheckAt !== b.nextCheckAt) return a.nextCheckAt - b.nextCheckAt;
        return a.templateId.localeCompare(b.templateId);
      });
      const subscriptionSignature = sortedSubscriptions
        .map(
          (entry) =>
            entry.templateId +
            ":" +
            entry.nextCheckAt +
            ":" +
            entry.daysBefore +
            ":" +
            (entry.title || "") +
            ":" +
            (entry.amountLabel || "")
        )
        .join("|");
      const planKey =
        localeKey +
        ":" +
        group.kind +
        ":" +
        group.dayKey +
        ":" +
        group.triggerTime +
        ":" +
        subscriptionSignature;
      return {
        ...group,
        subscriptions: sortedSubscriptions,
        planKey,
        dedupeKey:
          group.kind + ":" + group.dayKey + ":" + hashSubscriptionPlanKey(planKey),
      };
    })
    .sort((a, b) => a.triggerTime - b.triggerTime)
    .slice(0, Math.max(0, Math.floor(Number(maxGroups) || 0)));
};

const doesScheduledSubscriptionNotificationMatchPlan = (
  scheduledEntry,
  planEntry,
  resolveTriggerTime,
  toleranceMs = 60 * 1000
) => {
  if (!scheduledEntry || !planEntry || typeof resolveTriggerTime !== "function") return false;
  const data = scheduledEntry?.content?.data || {};
  const storedPlanKey =
    typeof data.subscriptionPlanKey === "string" ? data.subscriptionPlanKey : "";
  if (storedPlanKey) return storedPlanKey === planEntry.planKey;
  if (data.kind !== planEntry.kind || data.dayKey !== planEntry.dayKey) return false;
  const plannedSubscriptions = planEntry.subscriptions || [];
  if (plannedSubscriptions.length !== 1 ||
      normalizeSubscriptionId(data.templateId) !== plannedSubscriptions[0].templateId) return false;
  const triggerTime = Number(resolveTriggerTime(scheduledEntry?.trigger));
  return (
    Number.isFinite(triggerTime) &&
    Math.abs(triggerTime - Number(planEntry.triggerTime)) <=
      Math.max(0, Number(toleranceMs) || 0)
  );
};

module.exports = {
  buildSubscriptionDuePromptKey,
  buildSubscriptionNotificationPlan,
  doesScheduledSubscriptionNotificationMatchPlan,
  findNextSubscriptionDeadline,
  findPendingSubscriptionDueEntry,
  hashSubscriptionPlanKey,
  normalizeSubscriptionId,
};
