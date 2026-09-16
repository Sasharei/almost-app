const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSubscriptionDuePromptKey,
  buildSubscriptionNotificationPlan,
  doesScheduledSubscriptionNotificationMatchPlan,
  findNextSubscriptionDeadline,
  findPendingSubscriptionDueEntry,
} = require("../../src/engagement/subscriptionWatch");

const DAY_MS = 24 * 60 * 60 * 1000;
const getUtcDayKey = (timestamp) => new Date(timestamp).toISOString().slice(0, 10);

test("an unresolved due cycle stays actionable after the timer advances", () => {
  const now = Date.UTC(2026, 7, 30, 12);
  const dueAt = now - 2 * DAY_MS;
  const entry = {
    id: "subscription_video",
    dueAt,
    nextCheckAt: dueAt,
    scheduledNextCheckAt: now + 28 * DAY_MS,
    dueForConfirmation: true,
  };

  assert.equal(
    findPendingSubscriptionDueEntry([entry], { now, dismissedKeys: new Set() }),
    entry
  );
});

test("a handled prompt key is not requeued from a stale render snapshot", () => {
  const now = Date.UTC(2026, 7, 30, 12);
  const entry = {
    id: "subscription_music",
    dueAt: now - 1000,
    nextCheckAt: now - 1000,
    dueForConfirmation: true,
  };
  const promptKey = buildSubscriptionDuePromptKey(entry, now);
  const handledPromptKeys = new Set([promptKey]);

  assert.equal(
    findPendingSubscriptionDueEntry([entry], {
      now,
      dismissedKeys: handledPromptKeys,
    }),
    null
  );
  assert.equal(
    findPendingSubscriptionDueEntry([entry], {
      now,
      dismissedKeys: new Set(),
    }),
    entry
  );
});

test("a resolved subscription cycle no longer opens the decision prompt", () => {
  const now = Date.UTC(2026, 7, 30, 12);
  const entry = {
    id: "subscription_storage",
    dueAt: now - 1000,
    nextCheckAt: now - 1000,
    dueForConfirmation: false,
  };

  assert.equal(
    findPendingSubscriptionDueEntry([entry], { now, dismissedKeys: new Set() }),
    null
  );
});

test("the next subscription deadline wakes the due flow at the exact nearest timer", () => {
  const now = Date.UTC(2026, 7, 30, 12);
  const nearestDueAt = now + 12_345;

  assert.equal(
    findNextSubscriptionDeadline(
      [
        { id: "past", nextCheckAt: now - 1 },
        { id: "later", nextCheckAt: now + DAY_MS },
        { id: "nearest", nextCheckAt: nearestDueAt },
        { id: "invalid", nextCheckAt: "not-a-date" },
      ],
      { now }
    ),
    nearestDueAt
  );
});

test("subscription notification plans are stable and grouped by delivery day", () => {
  const now = Date.UTC(2026, 7, 1, 8);
  const nextCheckAt = now + 10 * DAY_MS;
  const input = {
    subscriptions: [
      {
        templateId: "video",
        title: "Video",
        amountLabel: "$10",
        nextCheckAt,
      },
      {
        templateId: "music",
        title: "Music",
        amountLabel: "$5",
        nextCheckAt,
      },
    ],
    now,
    reminderOffsetsDays: [5, 3, 1],
    dayMs: DAY_MS,
    localeKey: "en",
    getDayKey: getUtcDayKey,
  };

  const firstPlan = buildSubscriptionNotificationPlan(input);
  const secondPlan = buildSubscriptionNotificationPlan(input);

  assert.equal(firstPlan.length, 4);
  assert.deepEqual(
    firstPlan.map((entry) => entry.dedupeKey),
    secondPlan.map((entry) => entry.dedupeKey)
  );
  assert.ok(firstPlan.every((entry) => entry.subscriptions.length === 2));
  assert.equal(
    firstPlan.filter((entry) => entry.kind === "subscription_due").length,
    1
  );
});

test("notification reconciliation keeps an exact plan and replaces a changed plan", () => {
  const now = Date.UTC(2026, 7, 1, 8);
  const [plan] = buildSubscriptionNotificationPlan({
    subscriptions: [
      {
        templateId: "video",
        title: "Video",
        amountLabel: "$10",
        nextCheckAt: now + 5 * DAY_MS,
      },
    ],
    now,
    reminderOffsetsDays: [],
    dayMs: DAY_MS,
    localeKey: "en",
    getDayKey: getUtcDayKey,
  });
  const scheduled = {
    identifier: "scheduled-1",
    content: {
      data: {
        kind: plan.kind,
        dayKey: plan.dayKey,
        subscriptionPlanKey: plan.planKey,
      },
    },
    trigger: new Date(plan.triggerTime),
  };
  const resolveTriggerTime = (trigger) => new Date(trigger).getTime();

  assert.equal(
    doesScheduledSubscriptionNotificationMatchPlan(
      scheduled,
      plan,
      resolveTriggerTime
    ),
    true
  );
  assert.equal(
    doesScheduledSubscriptionNotificationMatchPlan(
      scheduled,
      { ...plan, planKey: plan.planKey + ":changed" },
      resolveTriggerTime
    ),
    false
  );
});
