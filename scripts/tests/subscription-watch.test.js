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

test("subscription notification plans deliver both same-day subscriptions separately", () => {
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

  assert.equal(firstPlan.length, 8);
  assert.deepEqual(
    firstPlan.map((entry) => entry.dedupeKey),
    secondPlan.map((entry) => entry.dedupeKey)
  );
  assert.ok(firstPlan.every((entry) => entry.subscriptions.length === 1));
  assert.equal(
    firstPlan.filter((entry) => entry.kind === "subscription_due").length,
    2
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


test("same-day due checks drain oldest first, including a failed retry and stale snapshots", () => {
  const now = Date.UTC(2026, 9, 3, 12);
  const entries = [
    { id: "later", dueAt: now - 1000, dueForConfirmation: true },
    { id: "first", dueAt: now - 3000, dueForConfirmation: true },
    { id: "second", dueAt: now - 2000, dueForConfirmation: true },
  ];
  const dismissedKeys = new Set();
  const next = () => findPendingSubscriptionDueEntry(entries, { now, dismissedKeys });
  assert.equal(next().id, "first");
  // A failed decision leaves the same subscription available for retry.
  assert.equal(next().id, "first");
  for (const id of ["first", "second", "later"]) {
    const current = next();
    assert.equal(current.id, id);
    dismissedKeys.add(buildSubscriptionDuePromptKey(current));
  }
  assert.equal(next(), null);
});

test("different due times on the same day keep their own delivery time", () => {
  const now = Date.UTC(2026, 9, 1, 12);
  const plan = buildSubscriptionNotificationPlan({
    subscriptions: [
      { templateId: "morning", nextCheckAt: Date.UTC(2026, 9, 3, 8) },
      { templateId: "evening", nextCheckAt: Date.UTC(2026, 9, 3, 20) },
    ], now, reminderOffsetsDays: [], getDayKey: getUtcDayKey,
  });
  assert.equal(plan.length, 2);
  assert.notEqual(plan[0].dedupeKey, plan[1].dedupeKey);
  assert.equal(plan[0].triggerTime, Date.UTC(2026, 9, 3, 8));
  assert.equal(plan[1].triggerTime, Date.UTC(2026, 9, 3, 20));
});

test("the app keeps a due question stable during payment and queues the next after closing", () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const parser = require("@babel/parser");
  const source = fs.readFileSync(require("node:path").join(__dirname, "../../App.js"), "utf8");
  const ast = parser.parse(source, { sourceType: "module", plugins: ["jsx"] });
  const app = ast.program.body.find((node) => node.type === "FunctionDeclaration" && node.id.name === "AppContent");
  const effect = app.body.body.find((node) => node.type === "ExpressionStatement" && node.expression.callee?.name === "useEffect" && source.slice(node.start, node.end).includes("findPendingSubscriptionDueEntry(subscriptionDueEntries"));
  assert.ok(effect);
  const calls = [];
  const now = Date.UTC(2026, 9, 3, 12);
  const first = { id: "first", dueAt: now - 2, dueForConfirmation: true };
  const second = { id: "second", dueAt: now - 1, dueForConfirmation: true };
  const context = vm.createContext({
    useEffect: (callback) => callback(), temptationInteractionsHydrated: true,
    quickTemptationsHydrated: true, categoryOverridesHydrated: true, historyHydrated: true,
    subscriptionDueDecisionPendingRef: { current: true }, subscriptionDueDecisionPending: true,
    subscriptionDueReferenceTs: now, subscriptionDueSessionVersion: 0,
    subscriptionDueEntries: [second], subscriptionDueHandledPromptKeysRef: { current: new Set() },
    queuedModalType: "subscription_due", QUEUED_MODAL_TYPES: { SUBSCRIPTION_DUE: "subscription_due" },
    queuedModalQueueRef: { current: [] }, queuedModalActiveRef: { current: "subscription_due" },
    findPendingSubscriptionDueEntry,
    setSubscriptionDuePromptEntry: (entry) => calls.push(entry?.id || "empty"),
    enqueueQueuedModal: (type) => calls.push(type), clearQueuedModal: () => {}, requestQueuedModalProcess: () => {},
  });
  const code = source.slice(effect.start, effect.end);
  vm.runInContext(code, context);
  assert.deepEqual(calls, []); // Timer/history updates cannot replace the in-flight question.
  context.subscriptionDueEntries = [first, second]; // A stale snapshot may still include the resolved item.
  context.subscriptionDueHandledPromptKeysRef.current.add(buildSubscriptionDuePromptKey(first));
  context.subscriptionDueDecisionPendingRef.current = false;
  context.subscriptionDueDecisionPending = false;
  context.queuedModalType = null;
  context.queuedModalActiveRef.current = null;
  vm.runInContext(code, context);
  assert.deepEqual(calls, ["second", "subscription_due"]);
});
