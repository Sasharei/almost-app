const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TYCOON_SETTINGS_VERSION,
  expireStalePendingTycoonAutosaves,
  getManualTycoonInteractionDayKey,
  getTycoonAutosaveEventDayKey,
  isManualTycoonInteractionInDay,
  isTycoonAutosaveEnabled,
  isTycoonAutosaveTimestampInDay,
  normalizeTycoonSettings,
  partitionTycoonAutosaveReview,
  retireLegacyTycoonRewards,
  resetLegacyTycoonPendingEvents,
  setTycoonAutosaveUndecided,
  skipPendingTycoonAutosaveForCards,
  skipPendingTycoonAutosavesForManualInteractions,
  summarizeTycoonAutosaveSaveResults,
  shouldResetLegacyTycoonPendingEvents,
} = require("../../src/engagement/tycoonAccess");

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const appSource = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");

// Run the actual app confirmation callback with controlled transaction and modal
// boundaries to cover partial confirmation without launching React Native.
const createReviewSession = (entries, spentIds = {}, overrides = {}) => {
  const actions = [];
  const snoozes = [];
  const summaries = [];
  let limitChecks = 0;
  const context = vm.createContext({
    useCallback: (callback) => callback,
    partitionTycoonAutosaveReview,
    tycoonPendingEvents: entries,
    tycoonLedger: entries,
    tycoonSpentSelection: spentIds,
    tycoonAutosaveAmountOverrides: overrides,
    tycoonConfirmStats: { confirmAllStreak: 0 },
    tycoonReviewAcknowledged: false,
    TYCOON_CONFIRM_ALL_REVIEW_STREAK: 3,
    savedTotalUSD: 0,
    profile: { currency: "USD" },
    enforceMonetizationTrialActionLimit: () => { limitChecks += 1; return false; },
    resolveTemplateCard: (id) => ({ id }),
    clampTransactionAmountUSD: (amount) => Math.max(0, Number(amount) || 0),
    resolveNonEmptyString: (value) => value || "",
    getTycoonAutosaveEventDayKey,
    handleTemptationAction: async (type, card, options) => {
      actions.push({ type, id: card.id, amount: options.amountUSD });
      return { committed: true, type, savedAmountUSD: options.amountUSD, coinReward: 2 };
    },
    handleTycoonAutosaveSnooze: (remaining) => snoozes.push(Array.from(remaining, (entry) => entry.id)),
    summarizeTycoonAutosaveSaveResults: (results) => {
      summaries.push(summarizeTycoonAutosaveSaveResults(results));
      return { savedCount: 0 }; // Overlay presentation is outside this transaction test.
    },
    setTemptationInteractions: () => {},
    logEvent: () => {},
    clearQueuedModal: () => {},
    QUEUED_MODAL_TYPES: { TYCOON_AUTOSAVE: "autosave" },
    setTycoonAutosaveSnoozedUntil: () => {},
    setTycoonAutosaveDismissed: () => {},
    setTycoonReviewAcknowledged: () => {},
    triggerHaptic: () => {},
    Haptics: { ImpactFeedbackStyle: { Light: "light" } },
    setTycoonAutosaveUndecided,
  });
  for (const [setter, state] of [
    ["setTycoonLedger", "tycoonLedger"],
    ["setTycoonSpentSelection", "tycoonSpentSelection"],
    ["setTycoonAutosaveAmountOverrides", "tycoonAutosaveAmountOverrides"],
    ["setTycoonConfirmStats", "tycoonConfirmStats"],
  ]) {
    context[setter] = (update) => {
      context[state] = typeof update === "function" ? update(context[state]) : update;
      if (state === "tycoonLedger") {
        context.tycoonPendingEvents = context.tycoonLedger.filter((entry) => entry.status === "pending");
      }
    };
  }
  const start = appSource.indexOf("  const handleTycoonAutosaveConfirm = useCallback(");
  const end = appSource.indexOf("\n  }, [", start);
  assert.ok(start > 0 && end > start);
  const callback = appSource.slice(start, end).replace("const handleTycoonAutosaveConfirm", "confirmReview");
  vm.runInContext(`${callback}\n  });`, context);
  for (const [name, alias] of [
    ["handleTycoonToggleSpent", "toggleSpent"],
    ["handleTycoonAutosaveToggleUndecided", "toggleUndecided"],
    ["handleTycoonAutosaveClose", "closeReview"],
  ]) {
    const callbackStart = appSource.indexOf(`  const ${name} = useCallback(`);
    const callbackEnd = appSource.indexOf("\n  }, [", callbackStart);
    assert.ok(callbackStart > 0 && callbackEnd > callbackStart);
    const source = appSource.slice(callbackStart, callbackEnd).replace(`const ${name}`, alias);
    vm.runInContext(`${source}\n  });`, context);
  }
  return { context, actions, snoozes, summaries, limitChecks: () => limitChecks };
};

const reviewEntry = (id) => ({
  id, cardId: id, source: "autosave", status: "pending", amountUSD: 10,
  dayKey: "2026-09-15", rewardClaimed: false,
});

test("partial auto-collect confirmation records two spends and two saves while Not sure stays pending", async () => {
  const entries = setTycoonAutosaveUndecided(
    ["spend1", "save1", "spend2", "save2", "later"].map(reviewEntry), "later", true
  );
  const session = createReviewSession(entries, { spend1: true, spend2: true }, { later: 25 });
  await session.context.confirmReview();
  assert.deepEqual(session.actions, [
    { type: "spend", id: "spend1", amount: 10 },
    { type: "save", id: "save1", amount: 10 },
    { type: "spend", id: "spend2", amount: 10 },
    { type: "save", id: "save2", amount: 10 },
  ]);
  assert.deepEqual(Array.from(session.context.tycoonLedger, (entry) => entry.status),
    ["spent", "saved", "spent", "saved", "pending"]);
  assert.equal(session.context.tycoonLedger[4], entries[4]);
  assert.equal(session.context.tycoonLedger[4].rewardClaimed, false);
  assert.deepEqual(session.snoozes, [["later"]]);
  assert.equal(session.summaries[0].savedAmountUSD, 20);
  assert.equal(session.summaries[0].coinReward, 4);
  assert.equal(session.context.tycoonAutosaveAmountOverrides.later, 25);
});

test("all-undecided confirmation only snoozes, without transactions, rewards or trial limits", async () => {
  const entries = setTycoonAutosaveUndecided([reviewEntry("later")], "later", true);
  const session = createReviewSession(entries);
  await session.context.confirmReview();
  assert.deepEqual(session.actions, []);
  assert.deepEqual(session.summaries, []);
  assert.deepEqual(session.snoozes, [["later"]]);
  assert.equal(session.limitChecks(), 0);
  assert.equal(session.context.tycoonLedger, entries);
});

test("partial saving does not trigger the misleading saved-all review warning", async () => {
  const entries = setTycoonAutosaveUndecided(
    [reviewEntry("save"), reviewEntry("later")], "later", true
  );
  const session = createReviewSession(entries);
  session.context.tycoonConfirmStats.confirmAllStreak = 2;
  await session.context.confirmReview();
  assert.equal(session.actions.length, 1);
  assert.equal(session.actions[0].id, "save");
  assert.equal(session.context.tycoonConfirmStats.confirmAllStreak, 0);
  assert.deepEqual(session.snoozes, [["later"]]);
});

test("closing and reopening preserves Not sure, and the user can undo it and record a spend", async () => {
  const session = createReviewSession([reviewEntry("card")], { card: true });
  session.context.toggleUndecided("card");
  session.context.closeReview();
  assert.equal(session.context.tycoonLedger[0].reviewUndecided, true);
  assert.equal(session.context.tycoonLedger[0].status, "pending");
  assert.equal(session.context.tycoonSpentSelection.card, undefined);
  await session.context.confirmReview();
  assert.equal(session.actions.length, 0);
  session.context.toggleUndecided("card");
  session.context.toggleSpent("card");
  await session.context.confirmReview();
  assert.deepEqual(session.actions, [{ type: "spend", id: "card", amount: 10 }]);
  assert.equal(session.context.tycoonLedger[0].status, "spent");
});

test("the decision control restores Not sure to saved before confirming", async () => {
  const entries = setTycoonAutosaveUndecided([reviewEntry("card")], "card", true);
  const session = createReviewSession(entries);
  session.context.toggleSpent("card");
  assert.equal(session.context.tycoonLedger[0].reviewUndecided, false);
  assert.equal(session.context.tycoonSpentSelection.card, undefined);
  await session.context.confirmReview();
  assert.deepEqual(session.actions, [{ type: "save", id: "card", amount: 10 }]);
  assert.equal(session.context.tycoonLedger[0].status, "saved");
  assert.deepEqual(session.snoozes, []);
});

test("Not sure survives dismissal and storage, can be undone, and expires without a transaction at midnight", () => {
  const undecided = setTycoonAutosaveUndecided([reviewEntry("later")], "later", true);
  const restored = retireLegacyTycoonRewards(JSON.parse(JSON.stringify(undecided)));
  assert.equal(partitionTycoonAutosaveReview(restored).ready.length, 0);
  assert.equal(partitionTycoonAutosaveReview(restored).undecided.length, 1);
  const ready = setTycoonAutosaveUndecided(restored, "later", false);
  assert.equal(partitionTycoonAutosaveReview(ready).ready.length, 1);
  assert.equal(ready[0].status, "pending");
  const expired = expireStalePendingTycoonAutosaves(restored, "2026-09-16");
  assert.equal(expired[0].status, "skipped");
  assert.equal(expired[0].skipReason, "day_rollover");
  assert.equal(partitionTycoonAutosaveReview(expired).undecided.length, 0);
  assert.equal(setTycoonAutosaveUndecided(expired, "later", false)[0], expired[0]);
});

test("auto-collect defaults off and legacy default-on settings are reset", () => {
  assert.deepEqual(normalizeTycoonSettings(null), {
    version: TYCOON_SETTINGS_VERSION,
    enabled: false,
  });
  assert.deepEqual(normalizeTycoonSettings({ enabled: true }), {
    version: TYCOON_SETTINGS_VERSION,
    enabled: false,
  });
  assert.equal(shouldResetLegacyTycoonPendingEvents({ enabled: true }), true);
});

test("only a premium user with the current opt-in can run auto-collect", () => {
  const settings = { version: TYCOON_SETTINGS_VERSION, enabled: true };
  assert.equal(isTycoonAutosaveEnabled({ isPremium: true, settings }), true);
  assert.equal(isTycoonAutosaveEnabled({ isPremium: false, settings }), false);
  assert.equal(
    isTycoonAutosaveEnabled({
      isPremium: true,
      settings: { version: TYCOON_SETTINGS_VERSION, enabled: false },
    }),
    false
  );
});

test("premium-gate migration preserves history and archives only stale pending items", () => {
  const entries = [
    { id: "pending", status: "pending", rewardClaimed: false },
    { id: "saved", status: "saved", rewardClaimed: false },
  ];
  const migrated = resetLegacyTycoonPendingEvents(entries, 1234);

  assert.deepEqual(migrated[0], {
    id: "pending",
    status: "skipped",
    rewardClaimed: true,
    skippedAt: 1234,
    skipReason: "premium_gate_migration",
  });
  assert.deepEqual(migrated[1], entries[1]);
});

test("legacy auto-collect rewards are retired because the daily series owns payout", () => {
  const entries = [
    { id: "unclaimed", status: "saved", rewardAmount: 4, rewardClaimed: false },
    { id: "claimed", status: "saved", rewardAmount: 5, rewardClaimed: true },
    { id: "pending", status: "pending", rewardAmount: 0, rewardClaimed: false },
  ];
  const migrated = retireLegacyTycoonRewards(entries, 5678);

  assert.deepEqual(migrated[0], {
    id: "unclaimed",
    status: "saved",
    rewardAmount: 4,
    rewardClaimed: true,
    rewardRetiredAt: 5678,
    rewardRoute: "temptation_series",
  });
  assert.equal(migrated[1], entries[1]);
  assert.equal(migrated[2], entries[2]);
  assert.equal(retireLegacyTycoonRewards(migrated, 9999), migrated);
});

test("a manual card action durably skips only its matching pending auto-collect entries", () => {
  const entries = [
    { id: "target", cardId: "coffee", source: "autosave", status: "pending" },
    { id: "other", cardId: "snacks", source: "autosave", status: "pending" },
    { id: "history", cardId: "coffee", source: "autosave", status: "saved" },
    { id: "manual", cardId: "coffee", source: "manual", status: "pending" },
  ];
  const reconciled = skipPendingTycoonAutosaveForCards(entries, [" coffee "], 6789);

  assert.deepEqual(reconciled[0], {
    id: "target",
    cardId: "coffee",
    source: "autosave",
    status: "skipped",
    skippedAt: 6789,
    skipReason: "manual_interaction",
    rewardClaimed: true,
  });
  assert.equal(reconciled[1], entries[1]);
  assert.equal(reconciled[2], entries[2]);
  assert.equal(reconciled[3], entries[3]);
  assert.equal(skipPendingTycoonAutosaveForCards(entries, ["missing"], 9999), entries);
});

test("a manual card action suppresses that card for the rest of its local day", () => {
  const manualAt = new Date(2026, 7, 20, 8, 15, 0).getTime();
  const interactions = {
    coffee: {
      lastInteractionAt: manualAt,
      lastTimerResetAt: manualAt,
      manualAutosaveSkipDayKey: "2026-08-20",
    },
    snacks: {
      lastInteractionAt: manualAt,
      lastTimerResetAt: manualAt - 1000,
    },
  };
  const entries = [
    {
      id: "coffee-today",
      cardId: "coffee",
      dayKey: "2026-08-20",
      source: "autosave",
      status: "pending",
    },
    {
      id: "coffee-tomorrow",
      cardId: "coffee",
      dayKey: "2026-08-21",
      source: "autosave",
      status: "pending",
    },
    {
      id: "snacks-today",
      cardId: "snacks",
      dayKey: "2026-08-20",
      source: "autosave",
      status: "pending",
    },
  ];

  assert.equal(isManualTycoonInteractionInDay(interactions.coffee, "2026-08-20"), true);
  assert.equal(isManualTycoonInteractionInDay(interactions.coffee, "2026-08-21"), false);
  assert.deepEqual(
    skipPendingTycoonAutosavesForManualInteractions(
      entries,
      interactions,
      "2026-08-20",
      manualAt
    ),
    [
      {
        ...entries[0],
        status: "skipped",
        skippedAt: manualAt,
        skipReason: "manual_interaction",
        rewardClaimed: true,
      },
      entries[1],
      entries[2],
    ]
  );
});

test("legacy manual-action timestamps restore today's auto-collect suppression", () => {
  const manualAt = new Date(2026, 7, 20, 12, 30, 0).getTime();
  const legacyInteraction = {
    lastInteractionAt: manualAt,
    lastTimerResetAt: manualAt,
    manualAutosaveSkipTargetAt: null,
    manualAutosaveSkipCreatedAt: null,
  };

  assert.equal(getManualTycoonInteractionDayKey(legacyInteraction), "2026-08-20");
  assert.equal(isManualTycoonInteractionInDay(legacyInteraction, "2026-08-20"), true);
  assert.equal(
    isManualTycoonInteractionInDay(
      { ...legacyInteraction, lastTimerResetAt: manualAt - 1000 },
      "2026-08-20"
    ),
    false
  );
});

test("auto-collect archives yesterday's pending cards at local day rollover", () => {
  const todayKey = "2026-08-20";
  const rolloverAt = new Date(2026, 7, 20, 0, 0, 1).getTime();
  const entries = [
    {
      id: "today",
      dayKey: todayKey,
      source: "autosave",
      status: "pending",
      rewardClaimed: false,
    },
    {
      id: "yesterday",
      dayKey: "2026-08-19",
      source: "autosave",
      status: "pending",
      rewardClaimed: false,
    },
    {
      id: "resolved",
      dayKey: "2026-08-19",
      source: "autosave",
      status: "saved",
      rewardClaimed: true,
    },
  ];

  const expired = expireStalePendingTycoonAutosaves(entries, todayKey, rolloverAt);

  assert.equal(expired[0], entries[0]);
  assert.deepEqual(expired[1], {
    ...entries[1],
    status: "skipped",
    skippedAt: rolloverAt,
    skipReason: "day_rollover",
    rewardClaimed: true,
  });
  assert.equal(expired[2], entries[2]);
  assert.equal(expireStalePendingTycoonAutosaves(expired, todayKey, rolloverAt), expired);
});

test("auto-collect derives a legacy pending card's day from its timer window", () => {
  const yesterdayWindow = new Date(2026, 7, 19, 21, 30, 0).getTime();
  assert.equal(
    getTycoonAutosaveEventDayKey({ timerWindowEnd: yesterdayWindow }),
    "2026-08-19"
  );
  assert.equal(getTycoonAutosaveEventDayKey({ dayKey: "2026-02-30" }), "");
});

test("auto-collect notifications never carry a pending card across midnight", () => {
  const todayKey = "2026-08-20";
  assert.equal(
    isTycoonAutosaveTimestampInDay(new Date(2026, 7, 20, 23, 59, 59), todayKey),
    true
  );
  assert.equal(
    isTycoonAutosaveTimestampInDay(new Date(2026, 7, 21, 0, 0, 0), todayKey),
    false
  );
});

test("auto-collect save results collapse into one accurate goal summary", () => {
  const summary = summarizeTycoonAutosaveSaveResults([
    {
      committed: true,
      type: "save",
      savedAmountUSD: 12,
      appliedAmountUSD: 12,
      targetGoalId: "goal_trip",
      goalSnapshot: { id: "goal_trip", title: "Trip", savedUSD: 40, targetUSD: 100 },
      coinReward: 2,
      creditedCoinReward: 2,
      saveOverlayPayload: { overlayKey: "first" },
    },
    {
      committed: true,
      type: "save",
      savedAmountUSD: 8,
      appliedAmountUSD: 8,
      targetGoalId: "goal_trip",
      goalSnapshot: { id: "goal_trip", title: "Trip", savedUSD: 40, targetUSD: 100 },
      coinReward: 1,
      creditedCoinReward: 1,
      saveOverlayPayload: { overlayKey: "latest" },
    },
    { committed: false, type: "save", savedAmountUSD: 99 },
  ]);

  assert.equal(summary.savedCount, 2);
  assert.equal(summary.savedAmountUSD, 20);
  assert.equal(summary.coinReward, 3);
  assert.equal(summary.creditedCoinReward, 3);
  assert.deepEqual(summary.singleGoal, {
    goalId: "goal_trip",
    appliedAmountUSD: 20,
    goalSnapshot: { id: "goal_trip", title: "Trip", savedUSD: 40, targetUSD: 100 },
  });
  assert.deepEqual(summary.latestPayload, { overlayKey: "latest" });
});

test("auto-collect summary avoids a misleading goal when savings span goals", () => {
  const summary = summarizeTycoonAutosaveSaveResults([
    {
      committed: true,
      type: "save",
      savedAmountUSD: 5,
      appliedAmountUSD: 5,
      targetGoalId: "goal_one",
    },
    {
      committed: true,
      type: "save",
      savedAmountUSD: 7,
      appliedAmountUSD: 7,
      targetGoalId: "goal_two",
    },
  ]);

  assert.equal(summary.savedAmountUSD, 12);
  assert.equal(summary.singleGoal, null);
});

test("auto-collect summary avoids a goal recap when any saved amount was not applied there", () => {
  const summary = summarizeTycoonAutosaveSaveResults([
    {
      committed: true,
      type: "save",
      savedAmountUSD: 10,
      appliedAmountUSD: 10,
      targetGoalId: "goal_one",
    },
    {
      committed: true,
      type: "save",
      savedAmountUSD: 6,
      appliedAmountUSD: 0,
      targetGoalId: null,
    },
  ]);

  assert.equal(summary.savedAmountUSD, 16);
  assert.equal(summary.singleGoal, null);
});
