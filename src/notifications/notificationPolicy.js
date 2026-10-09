// One gate for every JS-created local notification, including direct SDK callers.
// Store only scheduling metadata; never notification text or financial/product data.
const POLICY_VERSION = 1;
const STORAGE_KEY = "@almost_notification_budget_v1";
const HOUR_MS = 3600000;
const MAX_AUTOMATIC_PER_DAY = 4;
const AUTOMATIC_GAP_MS = 2 * HOUR_MS;
const AUTOMATIC_HORIZON_DAYS = 7;
const EXPLICIT_KINDS = new Set([
  "pending_decision", "subscription_reminder", "subscription_due", "challenge_reminder", "bank_expense",
]);

function family(content = {}) {
  const data = content.data || {};
  if (data.notificationSource === "cloud") return "cloud_announcement";
  if (data.type === "daily_nudge" || data.tag === "daily_nudge") return "daily_nudge";
  if (data.kind === "frequency_reminder" && data.userRequested !== false) return null;
  if (EXPLICIT_KINDS.has(data.kind)) return null;
  return typeof data.kind === "string" && data.kind ? data.kind : "automatic";
}
function dayKey(at) {
  const date = new Date(at);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
function isAllowed(at, entries, kind, now) {
  const date = new Date(at);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + AUTOMATIC_HORIZON_DAYS);
  if (!Number.isFinite(at) || at < now || at > horizon.getTime()) return false;
  if (date.getHours() < 9 || date.getHours() >= 21) return false;
  const automatic = entries.filter((entry) => !entry.explicit);
  const sameDay = automatic.filter((entry) => dayKey(entry.at) === dayKey(at));
  return sameDay.length < MAX_AUTOMATIC_PER_DAY &&
    !sameDay.some((entry) => entry.family === kind) &&
    !automatic.some((entry) => Math.abs(entry.at - at) < AUTOMATIC_GAP_MS);
}
function nextTime(trigger, now) {
  if (trigger == null) return now;
  if (trigger instanceof Date) return trigger.getTime();
  if (typeof trigger === "number") return trigger;
  if (typeof trigger === "string") return Date.parse(trigger);
  if (trigger.date != null) return new Date(trigger.date).getTime();
  if (Number.isFinite(trigger.timestamp)) return trigger.timestamp;
  if (trigger.value != null) return typeof trigger.value === "number" ? trigger.value : Date.parse(trigger.value);
  if (Number.isFinite(trigger.seconds)) return now + trigger.seconds * 1000;
  const parts = trigger.dateComponents || trigger;
  if (!Number.isFinite(parts.hour) || !Number.isFinite(parts.minute)) return NaN;
  const date = new Date(now);
  date.setHours(parts.hour, parts.minute, parts.second || 0, 0);
  if (Number.isFinite(parts.weekday)) {
    date.setDate(date.getDate() + ((parts.weekday - 1 - date.getDay() + 7) % 7));
    if (date.getTime() <= now) date.setDate(date.getDate() + 7);
  } else if (Number.isFinite(parts.day)) {
    date.setFullYear(parts.year || date.getFullYear(), (parts.month || date.getMonth() + 1) - 1, parts.day);
  } else if (date.getTime() <= now) date.setDate(date.getDate() + 1);
  return date.getTime();
}
function isRepeating(trigger) {
  return trigger?.repeats === true || trigger?.type === "daily" || trigger?.type === "weekly";
}

function hashKey(value) {
  let first = 2166136261;
  let second = 3339675911;
  for (let index = 0; index < value.length; index += 1) {
    first = Math.imul(first ^ value.charCodeAt(index), 16777619);
    second = Math.imul(second ^ value.charCodeAt(index), 2246822507);
  }
  return `${(first >>> 0).toString(16)}-${(second >>> 0).toString(16)}-${value.length}`;
}
function explicitKey(data = {}) {
  if (data.kind === "pending_decision" && data.pendingId) return `pending:${data.pendingId}:${data.dueAt || ""}`;
  if (data.kind === "subscription_reminder" || data.kind === "subscription_due") {
    const ids = Array.isArray(data.subscriptionIds) ? [...data.subscriptionIds].sort().join(",") : data.templateId;
    return ids && data.dayKey ? `${data.kind}:${data.dayKey}:${ids}` : null;
  }
  return typeof data.dedupeKey === "string" && data.dedupeKey ? data.dedupeKey : null;
}

function createNotificationPolicy({ api, storage, now = Date.now }) {
  let entries = [];
  let ready = false;
  const save = () => storage.setItem(STORAGE_KEY, JSON.stringify(entries));
  const prune = () => {
    const cutoff = now() - 24 * HOUR_MS;
    entries = entries.filter((entry) => entry.at >= cutoff);
  };
  // Caller serializes all schedule/cancel/reconcile operations in the native queue.
  const reconcile = async () => {
    if (ready) return;
    const scheduled = await api.getAllScheduledNotificationsAsync();
    // Remove legacy repeating banners even when the new budget cannot be read.
    for (const entry of scheduled) {
      if (family(entry.content) === null) continue;
      if (entry.content?.data?.notificationPolicyVersion !== POLICY_VERSION || isRepeating(entry.trigger)) {
        await api.cancelScheduledNotificationAsync(entry.identifier || entry.id);
      }
    }
    let parsed;
    try {
      const raw = await storage.getItem(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) throw new Error("Invalid notification budget");
    } catch (error) {
      // Without a durable budget, pending automatic banners cannot be trusted.
      for (const entry of scheduled) {
        if (family(entry.content) !== null) await api.cancelScheduledNotificationAsync(entry.identifier || entry.id);
      }
      throw error;
    }
    entries = parsed.filter((entry) => typeof entry?.id === "string" &&
      Number.isFinite(entry.at) && typeof entry.family === "string");
    prune();
    const scheduledIds = new Set(scheduled.map((entry) => entry.identifier || entry.id));
    entries = entries.filter((entry) => entry.at <= now() || scheduledIds.has(entry.id));
    for (const entry of scheduled) {
      if (family(entry.content) === null) continue;
      const data = entry.content?.data || {};
      const id = entry.identifier || entry.id;
      if (data.notificationPolicyVersion !== POLICY_VERSION || isRepeating(entry.trigger) ||
          !entries.some((reservation) => reservation.id === id)) {
        await api.cancelScheduledNotificationAsync(id);
        entries = entries.filter((reservation) => reservation.id !== id || reservation.at <= now());
      }
    }
    await save();
    ready = true;
  };
  const schedule = async (request) => {
    const kind = family(request?.content);
    if (kind === null) {
      const key = explicitKey(request.content?.data);
      if (!key) return api.scheduleNotificationAsync(request);
      const eventId = `almost-reminder:${hashKey(key)}`;
      let id = request.identifier || eventId;
      let originalEntries = entries;
      try {
        await reconcile();
        prune();
        originalEntries = entries;
        const previous = entries.find((entry) => entry.id === eventId || entry.eventId === eventId);
        if (previous && previous.at <= now()) return null;
        id = previous?.id || id;
        entries = entries.filter((entry) => entry.id !== id && entry.eventId !== eventId);
        entries.push({ id, eventId, family: "explicit", explicit: true, at: nextTime(request.trigger, now()) });
        await save();
      } catch {
        // A storage outage must not prevent a user-requested deadline. The stable
        // native identifier still replaces an outstanding request instead of duplicating it.
      }
      try {
        // Leave room for explicit deadlines in iOS's bounded native queue.
        try {
          const pending = await api.getAllScheduledNotificationsAsync();
          let count = pending.length;
          const automatic = pending.filter((entry) => family(entry.content) !== null)
            .sort((a, b) => nextTime(b.trigger, now()) - nextTime(a.trigger, now()));
          for (const entry of automatic) {
            if (count < 60) break;
            const target = entry.identifier || entry.id;
            await api.cancelScheduledNotificationAsync(target);
            entries = entries.filter((reservation) => reservation.id !== target || reservation.at <= now());
            count -= 1;
          }
          await save();
        } catch {
          // Queue/budget introspection is optional for a user-requested deadline.
        }
        const result = await api.scheduleNotificationAsync({ ...request, identifier: id });
        if (!result) throw new Error("Native reminder scheduling failed");
        return result;
      } catch (error) {
        entries = originalEntries;
        await save().catch(() => {});
        throw error;
      }
    }
    await reconcile();
    prune();
    const current = now();
    let at = request.trigger == null ? current + 1000 : nextTime(request.trigger, current);
    const calendarTrigger = request.trigger && request.trigger.date == null &&
      request.trigger.value == null && request.trigger.timestamp == null;
    if (calendarTrigger && typeof api.getNextTriggerDateAsync === "function") {
      const nativeAt = await api.getNextTriggerDateAsync(request.trigger);
      if (!Number.isFinite(nativeAt)) return null;
      at = nativeAt;
    }
    // An immediate request may spend milliseconds in the serial queue. Keep it
    // immediate, but never revive a genuinely overdue reminder.
    if (!isRepeating(request.trigger) && at >= current - 5000) at = Math.max(at, current + 1000);
    let root = null;
    let firstId = null;
    const repeats = isRepeating(request.trigger);
    const weekly = Number.isFinite((request.trigger?.dateComponents || request.trigger)?.weekday);
    for (let index = 0; index < (repeats ? AUTOMATIC_HORIZON_DAYS : 1); index += 1) {
      if (isAllowed(at, entries, kind, current)) {
        const pending = await api.getAllScheduledNotificationsAsync();
        if (pending.length >= 48) break;
        const id = `almost-auto:${kind}:${dayKey(at)}:${at}`;
        root ||= id;
        entries.push({ id, root, at, family: kind });
        // Reserve durably before native scheduling. A crash cannot replay an automatic banner.
        try {
          await save();
        } catch (error) {
          entries = entries.filter((entry) => entry.id !== id);
          throw error;
        }
        try {
          const result = await api.scheduleNotificationAsync({
            ...request,
            identifier: id,
            content: { ...request.content, data: { ...request.content.data,
              notificationPolicyVersion: POLICY_VERSION, notificationPolicyRoot: root,
              notificationPolicyAt: at } },
            trigger: { type: "date", date: new Date(at),
              ...(request.trigger?.channelId ? { channelId: request.trigger.channelId } : {}) },
          });
          if (!result) throw new Error("Native notification scheduling failed");
          firstId ||= result;
        } catch (error) {
          entries = entries.filter((entry) => entry.id !== id);
          await save();
          if (!firstId) throw error;
        }
      }
      const following = new Date(at);
      following.setDate(following.getDate() + (weekly ? 7 : 1));
      at = following.getTime();
    }
    return firstId;
  };
  const cancel = async (id) => {
    // Cancellation remains available even if budget storage is unavailable.
    try { await reconcile(); } catch {
      await api.cancelScheduledNotificationAsync(id);
      return;
    }
    const root = entries.find((entry) => entry.id === id)?.root;
    await api.cancelScheduledNotificationAsync(id);
    const ids = new Set([id, ...entries.filter((entry) => root && entry.root === root && entry.at > now()).map((entry) => entry.id)]);
    for (const target of ids) {
      if (target !== id) await api.cancelScheduledNotificationAsync(target);
    }
    entries = entries.filter((entry) => !ids.has(entry.id) || entry.at <= now());
    await save();
  };
  const cancelAll = async () => {
    await api.cancelAllScheduledNotificationsAsync();
    await reconcile();
    entries = entries.filter((entry) => entry.at <= now());
    await save();
  };
  return { schedule, cancel, cancelAll, reconcile };
}
module.exports = { createNotificationPolicy, family, isAllowed, nextTime, isRepeating,
  explicitKey, POLICY_VERSION, MAX_AUTOMATIC_PER_DAY, AUTOMATIC_GAP_MS, AUTOMATIC_HORIZON_DAYS };
