const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const parser = require("@babel/parser");
const subscriptionWatch = require("../../src/engagement/subscriptionWatch");

const app = fs.readFileSync("App.js", "utf8");
const ast = parser.parse(app, { sourceType: "module", plugins: ["jsx"] });
function find(node, name) {
  if (!node || typeof node !== "object") return null;
  if (node.type === "VariableDeclarator" && node.id.name === name) return node.init;
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      const found = find(child, name);
      if (found) return found;
    }
  }
  return null;
}
const schedulerNode = find(ast, "rescheduleSubscriptionReminders");
const revision = find(ast, "NOTIFICATION_COPY_REVISION").value;
const generated = fs.readFileSync("src/constants/translations.generated.js", "utf8").replace(/export const /g, "const ");
const dictionaries = fs.readFileSync("src/constants/translations.js", "utf8").replace(/^import .*;\n/gm, "").replace(/export const /g, "const ");
const translations = vm.runInNewContext(generated + "\n" + dictionaries + "\nTRANSLATIONS");

function fixture({ current = false, cancelFails = false } = {}) {
  const now = Date.UTC(2026, 9, 5, 9);
  const dayMs = 86400000;
  const source = { id: "music", title: "User's 🎵 subscription", basePriceUSD: 7.99, nextCheckAt: now + 5 * dayMs };
  const getDayKey = (timestamp) => new Date(timestamp).toISOString().slice(0, 10);
  const group = subscriptionWatch.buildSubscriptionNotificationPlan({
    subscriptions: [{ templateId: source.id, title: source.title, amountLabel: "$7.99", nextCheckAt: source.nextCheckAt }],
    now, reminderOffsetsDays: [3], dayMs, reminderKind: "subscription_reminder", dueKind: "subscription_due",
    localeKey: "ru", getDayKey, maxGroups: 24,
  })[0];
  const scheduled = [{ identifier: "old", trigger: { date: group.triggerTime }, content: {
    title: current ? translations.ru.subscriptionNotificationTitleSingle : "Old copy",
    body: "Old body", data: { kind: group.kind, dayKey: group.dayKey, templateId: source.id,
      subscriptionPlanKey: group.planKey, dedupeKey: group.dedupeKey,
      ...(current ? { copyRevision: revision } : {}),
    },
  } }];
  const events = [];
  const t = (key, args = {}) => Object.entries(args).reduce(
    (value, [token, replacement]) => value.replace(`{{${token}}}`, String(replacement)), translations.ru[key]
  );
  const context = {
    Date: class extends Date { static now() { return now; } }, console: { warn() {} },
    cancelled: false, language: "ru", profile: { currency: "USD" }, DEFAULT_PROFILE: { currency: "USD" },
    Platform: { OS: "ios" }, NOTIFICATION_COPY_REVISION: revision,
    SUBSCRIPTION_REMINDER_KIND: "subscription_reminder", SUBSCRIPTION_DUE_KIND: "subscription_due",
    SUBSCRIPTION_REMINDER_OFFSETS_DAYS: [3], DAY_MS: dayMs, getDayKey, t,
    subscriptionCards: [source], temptationInteractions: {},
    resolveTemptationCategory: () => "subscriptions", isUserSubscriptionTemptation: () => true,
    isTemplateReminderEligible: () => true, resolveSubscriptionNextCheckAt: (item) => item.nextCheckAt,
    resolveTemptationTitle: (item) => item.title, getTemptationPrice: (item) => item.basePriceUSD,
    convertToCurrency: (value) => value, formatCurrency: () => "$7.99", normalizeLanguage: (lang) => lang,
    ...subscriptionWatch, resolveNotificationTriggerTime: (trigger) => trigger?.date,
    safeNotifications: {
      getAllScheduledNotificationsAsync: async () => scheduled.slice(),
      cancelScheduledNotificationAsync: async (id) => {
        events.push({ type: "cancel", id });
        if (cancelFails) throw Error("OS cancellation failed");
        const index = scheduled.findIndex((entry) => entry.identifier === id);
        if (index >= 0) scheduled.splice(index, 1);
      },
    },
    scheduleNotificationWithCooldown: async (payload) => {
      // Model the real scheduler's dedupe and occupied-slot rules. Cancelling
      // obsolete copy first must prevent both reuse and a shifted reminder.
      const existing = scheduled.find((entry) => entry.content.data.dedupeKey === payload.content.data.dedupeKey);
      if (existing) return { id: existing.identifier };
      const desired = payload.trigger.getTime();
      const occupied = scheduled.some((entry) => entry.trigger.date === desired);
      const triggerAt = occupied ? desired + 3600000 : desired;
      events.push({ type: "schedule", payload, triggerAt });
      const identifier = `new-${events.length}`;
      scheduled.push({ identifier, content: payload.content, trigger: { date: triggerAt } });
      return { id: identifier };
    },
  };
  const run = vm.runInNewContext(`(${app.slice(schedulerNode.start, schedulerNode.end)})`, context);
  return { run, events, scheduled, group, source };
}

test("old scheduled subscription copy is replaced before dedupe without shifting its time or losing its destination", async () => {
  const state = fixture();
  await state.run();
  assert.equal(state.events[0].type, "cancel");
  const replacement = state.events.find((entry) => entry.type === "schedule");
  assert.equal(replacement.triggerAt, state.group.triggerTime);
  assert.equal(replacement.payload.content.title, translations.ru.subscriptionNotificationTitleSingle);
  assert.ok(replacement.payload.content.body.includes(state.source.title));
  assert.ok(replacement.payload.content.body.includes("$7.99"));
  assert.equal(replacement.payload.content.data.targetScreen, "subscriptions");
  assert.equal(replacement.payload.content.data.copyRevision, revision);
  assert.equal(state.scheduled.some((entry) => entry.identifier === "old"), false);
  const count = state.events.length;
  await state.run();
  assert.equal(state.events.length, count, "current schedules should be reused on the next reconciliation");
});

test("current subscription copy keeps its existing reminder", async () => {
  const state = fixture({ current: true });
  await state.run();
  assert.equal(state.events.some((entry) => entry.type === "cancel" && entry.id === "old"), false);
  assert.equal(state.scheduled.find((entry) => entry.identifier === "old").trigger.date, state.group.triggerTime);
});

test("OS cancellation failure leaves the existing reminder available without creating a duplicate", async () => {
  const state = fixture({ cancelFails: true });
  await state.run();
  assert.equal(state.scheduled.filter((entry) => entry.content.data.dedupeKey === state.group.dedupeKey).length, 1);
  assert.equal(state.scheduled[0].identifier, "old");
});
