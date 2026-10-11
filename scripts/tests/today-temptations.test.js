const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildTodayTemptationPlan,
  getLocalDayBounds,
  getNextLocalMidnightAt,
  isTimestampInLocalCalendarDay,
  partitionUnifiedTemptationFeed,
} = require("../../src/engagement/todayTemptations");

const TODAY = new Date(2026, 7, 14, 12, 0, 0).getTime();
const TODAY_MORNING = new Date(2026, 7, 14, 9, 0, 0).getTime();
const TODAY_EVENING = new Date(2026, 7, 14, 20, 0, 0).getTime();
const TOMORROW = new Date(2026, 7, 15, 9, 0, 0).getTime();

test("editing a manual timer preserves the unchecked cards of an active daily series", () => {
  const ids = Array.from({ length: 8 }, (_, index) => `card-${index}`);
  const interactions = Object.fromEntries(ids.map(id => [id, {
    frequencyReminderManualConfigured: true, nextCheckAt: TODAY_EVENING,
  }]));
  interactions[ids[3]].nextCheckAt = TOMORROW;
  const plan = buildTodayTemptationPlan({
    products: ids.map(id => ({ id })), interactionStats: interactions,
    activeTargetIds: ids, timestamp: TODAY,
    historyEvents: ids.slice(0, 3).map(templateId => ({
      kind: "refuse_spend", timestamp: TODAY_MORNING, meta: { templateId },
    })),
  });
  assert.deepEqual(plan.targetIds, ids);
  assert.deepEqual(plan.checkedIds, ids.slice(0, 3));
  assert.deepEqual(plan.dueIds, ids.slice(3));
  assert.equal(interactions[ids[3]].nextCheckAt, TOMORROW);
});

const buildPlan = ({ products, interactions = {}, history = [] }) =>
  buildTodayTemptationPlan({
    products,
    interactionStats: interactions,
    historyEvents: history,
    timestamp: TODAY,
  });

test("Today contains only checks due by the end of the local day", () => {
  const products = [
    { id: "overdue" },
    { id: "later-today" },
    { id: "monthly-later" },
    { id: "unconfigured" },
  ];
  const plan = buildPlan({
    products,
    interactions: {
      overdue: { nextCheckAt: TODAY_MORNING, frequencyReminderManualConfigured: true },
      "later-today": { nextCheckAt: TODAY_EVENING, frequencyReminderManualConfigured: true },
      "monthly-later": { nextCheckAt: TOMORROW, frequencyReminderManualConfigured: true },
      unconfigured: { lastInteractionAt: TODAY_MORNING - 30 * 24 * 60 * 60 * 1000 },
    },
  });

  assert.deepEqual(plan.targetIds, ["overdue", "later-today"]);
  assert.deepEqual(plan.dueIds, ["overdue", "later-today"]);
});

test("manual weekly and monthly schedules are evaluated against today's calendar", () => {
  const products = [
    { id: "weekly-today" },
    { id: "weekly-later" },
    { id: "monthly-today" },
    { id: "monthly-later" },
  ];
  const plan = buildPlan({
    products,
    interactions: {
      "weekly-today": {
        frequency: "weekly",
        frequencyWeeklyDays: [new Date(TODAY).getDay()],
        frequencyReminderManualConfigured: true,
      },
      "weekly-later": {
        frequency: "weekly",
        frequencyWeeklyDays: [(new Date(TODAY).getDay() + 1) % 7],
        frequencyReminderManualConfigured: true,
      },
      "monthly-today": {
        frequency: "monthly",
        frequencyMonthlyDays: [new Date(TODAY).getDate()],
        frequencyReminderManualConfigured: true,
      },
      "monthly-later": {
        frequency: "monthly",
        frequencyMonthlyDays: [new Date(TODAY).getDate() + 1],
        frequencyReminderManualConfigured: true,
      },
    },
  });

  assert.deepEqual(plan.targetIds, ["weekly-today", "monthly-today"]);
});

test("a decision already logged today stays in Today and is restored as checked", () => {
  const plan = buildPlan({
    products: [{ id: "coffee", templateId: "coffee-template" }],
    interactions: {
      "coffee-template": {
        nextCheckAt: new Date(2026, 8, 14, 9, 0, 0).getTime(),
        frequency: "monthly",
        frequencyReminderManualConfigured: true,
      },
    },
    history: [
      {
        kind: "refuse_spend",
        timestamp: TODAY_MORNING,
        meta: { templateId: "coffee" },
      },
      {
        kind: "spend",
        timestamp: TODAY_EVENING,
        meta: { templateId: "coffee-template" },
      },
    ],
  });

  assert.deepEqual(plan.targetIds, ["coffee-template"]);
  assert.deepEqual(plan.checkedIds, ["coffee-template"]);
  assert.deepEqual(plan.resolutions["coffee-template"], {
    firstAction: "save",
    lastAction: "spend",
    firstAt: TODAY_MORNING,
    lastAt: TODAY_EVENING,
    actionCount: 2,
  });
});

test("old history does not pull a future monthly temptation into Today", () => {
  const plan = buildPlan({
    products: [{ id: "subscription" }],
    interactions: {
      subscription: {
        nextCheckAt: new Date(2026, 8, 14, 9, 0, 0).getTime(),
        frequency: "monthly",
        frequencyReminderManualConfigured: true,
      },
    },
    history: [
      {
        kind: "spend",
        timestamp: TODAY - 24 * 60 * 60 * 1000,
        meta: { templateId: "subscription" },
      },
    ],
  });

  assert.deepEqual(plan.targetIds, []);
  assert.deepEqual(plan.resolutions, {});
});

test("yesterday's checked daily temptation returns as unchecked after midnight", () => {
  const plan = buildTodayTemptationPlan({
    products: [{ id: "coffee" }],
    interactionStats: {
      coffee: {
        frequency: "daily",
        frequencyReminderManualConfigured: true,
      },
    },
    historyEvents: [
      {
        kind: "refuse_spend",
        timestamp: TODAY_EVENING,
        meta: { templateId: "coffee" },
      },
    ],
    timestamp: TOMORROW,
  });

  assert.deepEqual(plan.targetIds, ["coffee"]);
  assert.deepEqual(plan.dueIds, ["coffee"]);
  assert.deepEqual(plan.checkedIds, []);
  assert.deepEqual(plan.resolutions, {});
});

test("the Today boundary ends at the next local midnight", () => {
  const lateToday = new Date(2026, 7, 14, 23, 59, 45).getTime();
  const nextMidnight = new Date(2026, 7, 15, 0, 0, 0).getTime();
  const bounds = getLocalDayBounds(lateToday);

  assert.equal(bounds.end, nextMidnight - 1);
  assert.equal(getNextLocalMidnightAt(lateToday), nextMidnight);
});

test("same-day cleanup never includes a save from the previous calendar day", () => {
  const previousDaySave = new Date(2026, 7, 14, 23, 59, 59, 999).getTime();
  const spend = new Date(2026, 7, 15, 0, 0, 0, 0).getTime();
  const sameDaySave = new Date(2026, 7, 15, 0, 0, 0, 1).getTime();

  assert.equal(isTimestampInLocalCalendarDay(previousDaySave, spend), false);
  assert.equal(isTimestampInLocalCalendarDay(spend, spend), true);
  assert.equal(isTimestampInLocalCalendarDay(sameDaySave, spend), true);
});

test("a timer cycle automatically missed today remains due in Today", () => {
  const plan = buildPlan({
    products: [{ id: "cigarettes" }],
    interactions: {
      cigarettes: {
        nextCheckAt: TOMORROW,
        lastMissedCheckAt: TODAY_MORNING,
        missedCycles: 1,
        frequency: "daily",
        frequencyReminderManualConfigured: true,
      },
    },
  });

  assert.deepEqual(plan.targetIds, ["cigarettes"]);
  assert.deepEqual(plan.dueIds, ["cigarettes"]);
});

test("the unified feed keeps due temptations first, checked temptations available, and everything else below", () => {
  const items = [
    { id: "monthly" },
    { id: "coffee" },
    { id: "cigarettes" },
    { id: "delivery" },
  ];
  const partition = partitionUnifiedTemptationFeed({
    items,
    todayTargetIds: ["coffee", "cigarettes", "delivery"],
    resolvedTodayIds: ["coffee"],
  });

  assert.deepEqual(partition.uncheckedToday.map((item) => item.id), [
    "cigarettes",
    "delivery",
  ]);
  assert.deepEqual(partition.checkedToday.map((item) => item.id), ["coffee"]);
  assert.deepEqual(partition.other.map((item) => item.id), ["monthly"]);
  assert.deepEqual(partition.ordered.map((item) => item.id), [
    "cigarettes",
    "delivery",
    "coffee",
    "monthly",
  ]);
});

test("a category slice remains one feed even when it has no temptations due today", () => {
  const items = [{ id: "monthly" }, { id: "annual" }];
  const partition = partitionUnifiedTemptationFeed({
    items,
    todayTargetIds: ["coffee"],
    resolvedTodayIds: ["coffee", "monthly"],
  });

  assert.deepEqual(partition.uncheckedToday, []);
  assert.deepEqual(partition.checkedToday, []);
  assert.deepEqual(partition.other, items);
});


test("duplicate catalog aliases count once and unrelated history does not resolve a card", () => {
  const plan = buildPlan({
    products: [{ id: "coffee" }, { id: "coffee-copy", templateId: "coffee" }],
    interactions: { coffee: { nextCheckAt: TODAY_EVENING } },
    history: [{ kind: "spend", timestamp: TODAY_MORNING, meta: { templateId: "external-purchase" } }],
  });
  assert.deepEqual(plan.targetIds, ["coffee"]);
  assert.deepEqual(plan.checkedIds, []);
  assert.deepEqual(Object.keys(plan.resolutions), []);
});


test("a new profile gets its first three unique personalized cards without timers", () => {
  const products = [{ id: "gamer" }, { id: "dlc" }, { id: "game-pass" }, { id: "coffee" }];
  const plan = buildPlan({ products });
  assert.deepEqual(plan.targetIds, ["gamer", "dlc", "game-pass"]);
  assert.deepEqual(plan.dueIds, plan.targetIds);
  const afterSave = buildPlan({ products, history: [{ kind: "refuse_spend", timestamp: TODAY_MORNING, meta: { templateId: "gamer" } }] });
  assert.deepEqual(afterSave.targetIds, plan.targetIds);
  assert.deepEqual(afterSave.dueIds, ["dlc", "game-pass"]);
  assert.deepEqual(afterSave.checkedIds, ["gamer"]);
  const complete = buildPlan({ products, history: plan.targetIds.map(templateId => ({ kind: "spend", timestamp: TODAY_MORNING, meta: { templateId } })) });
  assert.deepEqual(complete.targetIds, plan.targetIds);
  assert.deepEqual(complete.dueIds, []);
});

test("starter plan deduplicates aliases and respects a future manual timer", () => {
  const products = [{ id: "coffee", templateId: "coffee" }, { id: "alias", templateId: "coffee" }, { id: "snack" }, { id: "dessert" }, { id: "taxi" }];
  assert.deepEqual(buildPlan({ products }).targetIds, ["coffee", "snack", "dessert"]);
  const scheduled = buildPlan({ products, interactions: { coffee: { frequencyReminderManualConfigured: true, nextCheckAt: TOMORROW } } });
  assert.deepEqual(scheduled.targetIds, []);
});


test("configuring a timer after the first starter decision keeps the remaining two in the plan", () => {
  const products = [{ id: "coffee" }, { id: "snack" }, { id: "dessert" }, { id: "taxi" }];
  const plan = buildTodayTemptationPlan({ products, timestamp: TODAY,
    activeTargetIds: ["coffee", "snack", "dessert"],
    interactionStats: { coffee: { frequencyReminderManualConfigured: true, nextCheckAt: TOMORROW } },
    historyEvents: [{ kind: "refuse_spend", timestamp: TODAY_MORNING, meta: { templateId: "coffee" } }],
  });
  assert.deepEqual(plan.targetIds, ["coffee", "snack", "dessert"]);
  assert.deepEqual(plan.dueIds, ["snack", "dessert"]);
  assert.deepEqual(plan.checkedIds, ["coffee"]);
});
